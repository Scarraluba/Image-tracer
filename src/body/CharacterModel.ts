/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Quaternion } from '../math/Quaternion';
import { Ray3, RayPlaneIntersection } from '../math/Ray3';
import { BodyProportionsConfig, DEFAULT_PROPORTIONS } from './BodyProportions';
import { ProceduralBodyGenerator, CharacterBodyData } from './ProceduralBodyGenerator';
import { SkinDeformer } from './SkinDeformer';

export interface EyeGazeState {
  yawDeg: number;   // Relative to head
  pitchDeg: number; // Relative to head
  color: string;
}

export interface TargetPixelHit {
  hit: boolean;
  pixelX: number;
  pixelY: number;
  normalizedU: number;
  normalizedV: number;
  isInsideTarget: boolean;
  targetWidthPx: number;
  targetHeightPx: number;
}

export interface TargetAreaSpecs {
  center: Vec3;
  widthWorld: number;
  heightWorld: number;
  widthPx: number;
  heightPx: number;
  planeZ: number;
  invertX?: boolean;
  invertY?: boolean;
  oppositeScaling?: boolean;
  oppositeScaleFactor?: number;
}

export interface CharacterGazeData {
  leftEyeCenterWorld: Vec3;
  leftGazeDirectionWorld: Vec3;
  leftTargetHit: RayPlaneIntersection;
  leftPixelHit?: TargetPixelHit;

  rightEyeCenterWorld: Vec3;
  rightGazeDirectionWorld: Vec3;
  rightTargetHit: RayPlaneIntersection;
  rightPixelHit?: TargetPixelHit;

  targetSpecs?: TargetAreaSpecs;
}

export class CharacterModel {
  readonly id: string;
  name: string;
  position: Vec3;
  rotationDeg: number; // Global character yaw rotation around Y

  proportions: BodyProportionsConfig;
  bodyData: CharacterBodyData;

  // Joint articulation state
  selectedJointId: string = 'head';
  activePosePreset: string = 'Relaxed / A-Pose';

  // Eye Gaze states (relative to head)
  leftEyeGaze: EyeGazeState = { yawDeg: 0, pitchDeg: 0, color: '#22c55e' };
  rightEyeGaze: EyeGazeState = { yawDeg: 0, pitchDeg: 0, color: '#06b6d4' };

  // Display toggles
  isUnifiedMode: boolean = false;
  showSkeleton: boolean = true;
  showJoints: boolean = true;
  showGazeRays: boolean = true;
  bodyColor: string = '#38bdf8';

  constructor(
    id: string,
    name: string,
    position: Vec3 = Vec3.ZERO,
    rotationDeg: number = 0,
    proportions: BodyProportionsConfig = DEFAULT_PROPORTIONS,
    bodyColor: string = '#38bdf8'
  ) {
    this.id = id;
    this.name = name;
    this.position = position;
    this.rotationDeg = rotationDeg;
    this.proportions = { ...proportions };
    this.bodyColor = bodyColor;
    this.bodyData = ProceduralBodyGenerator.generateBody(this.proportions, Vec3.ZERO);
    this.updateKinematics();
  }

  /**
   * Rebuilds procedural geometry when proportions change
   */
  updateProportions(newProps: Partial<BodyProportionsConfig>): void {
    this.proportions = { ...this.proportions, ...newProps };
    this.bodyData = ProceduralBodyGenerator.generateBody(this.proportions, Vec3.ZERO);
    this.updateKinematics();
  }

  /**
   * Updates character root transform and all skeletal forward kinematics
   */
  updateKinematics(): void {
    // Character root transform from position and global yaw rotation
    const rotQuat = Quaternion.fromAxisAngle(Vec3.UNIT_Y, (this.rotationDeg * Math.PI) / 180);
    const rootMat = Mat4.fromRotationTranslationScale(rotQuat, this.position);
    this.bodyData.skeleton.updateGlobalTransforms(rootMat);
  }

  /**
   * Set joint rotation and update deformed mesh
   */
  setJointRotation(jointId: string, pitchDeg: number, yawDeg: number, rollDeg: number): void {
    const joint = this.bodyData.skeleton.getJoint(jointId);
    if (joint) {
      joint.setRotation(pitchDeg, yawDeg, rollDeg);
      this.updateKinematics();
    }
  }

  /**
   * Apply pose preset
   */
  applyPose(presetName: string): void {
    this.activePosePreset = presetName;
    this.bodyData.skeleton.applyPosePreset(presetName);
    this.updateKinematics();
  }

  /**
   * Evaluates deformed mesh vertices using Linear Blend Skinning
   */
  getDeformedPartVertices(partId: string): Vec3[] {
    const part = this.bodyData.parts.find((p) => p.id === partId);
    if (!part) return [];
    return SkinDeformer.deformVertices(
      part.baseMeshData.vertices,
      part.skinWeights,
      this.bodyData.skeleton
    );
  }

  /**
   * Evaluates unified body mesh vertices using Linear Blend Skinning
   */
  getDeformedUnifiedVertices(): Vec3[] {
    if (!this.bodyData.unifiedMesh) return [];
    return SkinDeformer.deformVertices(
      this.bodyData.unifiedMesh.baseMeshData.vertices,
      this.bodyData.unifiedMesh.skinWeights,
      this.bodyData.skeleton
    );
  }

  /**
   * Evaluates world-space gaze for both eyes adhering to Section 16:
   * dWorld = normalize(R_Head · R_Eye · d_Local)
   * R(t) = C_World + t · d_World
   */
  evaluateGaze(targetInput: number | TargetAreaSpecs = 50.0): CharacterGazeData {
    const headJoint = this.bodyData.skeleton.getJoint('head');
    const leftEyeJoint = this.bodyData.skeleton.getJoint('leftEye');
    const rightEyeJoint = this.bodyData.skeleton.getJoint('rightEye');

    const defaultHeadTransform = headJoint ? headJoint.currentGlobalTransform : Mat4.identity();

    // Eye origins in world coordinates
    const leftEyeCenterWorld = leftEyeJoint ? leftEyeJoint.currentWorldPosition : this.position.add(new Vec3(3.2, 162.5, 9.2));
    const rightEyeCenterWorld = rightEyeJoint ? rightEyeJoint.currentWorldPosition : this.position.add(new Vec3(-3.2, 162.5, 9.2));

    // Combine Head rotation with Eye rotation: R_Head * R_Eye * (0, 0, 1)
    const computeEyeGazeDir = (gaze: EyeGazeState): Vec3 => {
      // Local eye rotation
      const rx = Quaternion.fromAxisAngle(Vec3.UNIT_X, (gaze.pitchDeg * Math.PI) / 180);
      const ry = Quaternion.fromAxisAngle(Vec3.UNIT_Y, (gaze.yawDeg * Math.PI) / 180);
      const eyeLocalRot = ry.multiply(rx);
      const localForward = eyeLocalRot.rotateVec3(Vec3.FORWARD);

      // Transform through head's global matrix
      return defaultHeadTransform.transformDirection(localForward).normalize();
    };

    const leftGazeDirectionWorld = computeEyeGazeDir(this.leftEyeGaze);
    const rightGazeDirectionWorld = computeEyeGazeDir(this.rightEyeGaze);

    const targetSpecs: TargetAreaSpecs =
      typeof targetInput === 'number'
        ? {
            center: new Vec3(0, 160, targetInput),
            widthWorld: 120,
            heightWorld: 120,
            widthPx: 1200,
            heightPx: 1200,
            planeZ: targetInput,
          }
        : targetInput;

    // Analytical intersections with target plane at Z = targetSpecs.planeZ
    const planePoint = new Vec3(targetSpecs.center.x, targetSpecs.center.y, targetSpecs.planeZ);
    const planeNormal = new Vec3(0, 0, -1);

    const leftRay = new Ray3(leftEyeCenterWorld, leftGazeDirectionWorld);
    const rightRay = new Ray3(rightEyeCenterWorld, rightGazeDirectionWorld);

    const leftTargetHit = leftRay.intersectPlane(planePoint, planeNormal);
    const rightTargetHit = rightRay.intersectPlane(planePoint, planeNormal);

    // Compute Exact Ray Pixel Hit Coordinates on the target area matching the reference picture
    const computePixelHit = (hit: RayPlaneIntersection): TargetPixelHit | undefined => {
      if (!hit.hit || !hit.point) return undefined;
      const halfW = targetSpecs.widthWorld / 2;
      const halfH = targetSpecs.heightWorld / 2;

      // Coordinate matching:
      // In viewer/camera perspective looking toward target plane (+Z):
      // - Left edge of screen is (center.x - halfW)
      // - Right edge of screen is (center.x + halfW)
      // Moving right increases X => u goes from 0 to 1
      let u = (hit.point.x - (targetSpecs.center.x - halfW)) / (targetSpecs.widthWorld || 1);

      // In standard digital image coordinates, Y = 0 is at the TOP:
      // - Top edge of screen is (center.y + halfH)
      // - Bottom edge of screen is (center.y - halfH)
      // Moving downwards decreases Y => v goes from 0 at top to 1 at bottom
      let v = ((targetSpecs.center.y + halfH) - hit.point.y) / (targetSpecs.heightWorld || 1);

      // User toggleable inversion if character-POV rather than viewer-POV is desired
      if (targetSpecs.invertX) {
        u = 1.0 - u;
      }
      if (targetSpecs.invertY) {
        v = 1.0 - v;
      }

      // Opposite / Reciprocal target board scaling mode
      if (targetSpecs.oppositeScaling && targetSpecs.oppositeScaleFactor && targetSpecs.oppositeScaleFactor > 0) {
        const factor = targetSpecs.oppositeScaleFactor;
        // Invert expansion around center
        u = 0.5 + (u - 0.5) * factor;
        v = 0.5 + (v - 0.5) * factor;
      }

      const pixelX = Math.round(u * targetSpecs.widthPx);
      const pixelY = Math.round(v * targetSpecs.heightPx);
      const isInsideTarget = u >= 0 && u <= 1 && v >= 0 && v <= 1;

      return {
        hit: true,
        pixelX,
        pixelY,
        normalizedU: u,
        normalizedV: v,
        isInsideTarget,
        targetWidthPx: targetSpecs.widthPx,
        targetHeightPx: targetSpecs.heightPx,
      };
    };

    const leftPixelHit = computePixelHit(leftTargetHit);
    const rightPixelHit = computePixelHit(rightTargetHit);

    return {
      leftEyeCenterWorld,
      leftGazeDirectionWorld,
      leftTargetHit,
      leftPixelHit,
      rightEyeCenterWorld,
      rightGazeDirectionWorld,
      rightTargetHit,
      rightPixelHit,
      targetSpecs,
    };
  }
}
