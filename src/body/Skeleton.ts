/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Quaternion } from '../math/Quaternion';
import { Mat4 } from '../math/Mat4';
import { LandmarkSet } from './AnatomicalLandmarks';

export interface JointAngles {
  pitchDeg: number; // Local X rotation
  yawDeg: number;   // Local Y rotation
  rollDeg: number;  // Local Z rotation
}

export class BoneJoint {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  readonly childrenIds: string[] = [];

  // Bind Pose
  bindPosition: Vec3;
  bindTransform: Mat4 = Mat4.identity();
  inverseBindTransform: Mat4 = Mat4.identity();

  // Articulation (Forward Kinematics)
  localTranslation: Vec3 = Vec3.ZERO; // Relative to parent in bind pose
  rotationAngles: JointAngles = { pitchDeg: 0, yawDeg: 0, rollDeg: 0 };
  currentLocalRotation: Quaternion = Quaternion.IDENTITY;

  // Current World Space Transform (M_i)
  currentGlobalTransform: Mat4 = Mat4.identity();
  currentWorldPosition: Vec3 = Vec3.ZERO;

  // Skinning Matrix: M_i * B_i
  skinningMatrix: Mat4 = Mat4.identity();

  constructor(id: string, name: string, bindPosition: Vec3, parentId?: string) {
    this.id = id;
    this.name = name;
    this.bindPosition = bindPosition;
    this.parentId = parentId;
    this.currentWorldPosition = bindPosition;
  }

  setRotation(pitchDeg: number, yawDeg: number, rollDeg: number): void {
    this.rotationAngles = { pitchDeg, yawDeg, rollDeg };
    const rx = Quaternion.fromAxisAngle(Vec3.UNIT_X, (pitchDeg * Math.PI) / 180);
    const ry = Quaternion.fromAxisAngle(Vec3.UNIT_Y, (yawDeg * Math.PI) / 180);
    const rz = Quaternion.fromAxisAngle(Vec3.UNIT_Z, (rollDeg * Math.PI) / 180);
    // Local rotation convention: Rz * Ry * Rx
    this.currentLocalRotation = rz.multiply(ry.multiply(rx)).normalize();
  }

  resetRotation(): void {
    this.setRotation(0, 0, 0);
  }
}

export class Skeleton {
  readonly joints: Map<string, BoneJoint> = new Map();
  readonly rootJointId: string = 'pelvis';
  readonly jointOrder: string[] = []; // Topological parent-to-child order

  constructor(landmarks: LandmarkSet) {
    this.buildHierarchy(landmarks);
    this.computeBindTransforms();
    this.updateGlobalTransforms();
  }

  private addJoint(id: string, name: string, pos: Vec3, parentId?: string): BoneJoint {
    const joint = new BoneJoint(id, name, pos, parentId);
    this.joints.set(id, joint);
    if (parentId && this.joints.has(parentId)) {
      this.joints.get(parentId)!.childrenIds.push(id);
    }
    this.jointOrder.push(id);
    return joint;
  }

  private buildHierarchy(lm: LandmarkSet): void {
    // 1. Root / Pelvis
    this.addJoint('pelvis', 'Pelvis', lm.pelvisCenter);

    // Spine & Head
    this.addJoint('waist', 'Waist / Lower Spine', lm.waistCenter, 'pelvis');
    this.addJoint('chest', 'Chest / Mid Spine', lm.chestCenter, 'waist');
    this.addJoint('neck', 'Neck Base', lm.neckBase, 'chest');
    this.addJoint('head', 'Head / Skull', lm.headCenter, 'neck');

    // Eyes attached to head
    this.addJoint('leftEye', 'Left Eye', lm.leftEye, 'head');
    this.addJoint('rightEye', 'Right Eye', lm.rightEye, 'head');

    // Left Arm (Character Left = +X)
    this.addJoint('leftShoulder', 'Left Shoulder', lm.leftShoulder, 'chest');
    this.addJoint('leftElbow', 'Left Elbow', lm.leftElbow, 'leftShoulder');
    this.addJoint('leftWrist', 'Left Wrist', lm.leftWrist, 'leftElbow');
    this.addJoint('leftHand', 'Left Hand', lm.leftHand, 'leftWrist');

    // Right Arm (Character Right = -X)
    this.addJoint('rightShoulder', 'Right Shoulder', lm.rightShoulder, 'chest');
    this.addJoint('rightElbow', 'Right Elbow', lm.rightElbow, 'rightShoulder');
    this.addJoint('rightWrist', 'Right Wrist', lm.rightWrist, 'rightElbow');
    this.addJoint('rightHand', 'Right Hand', lm.rightHand, 'rightWrist');

    // Left Leg
    this.addJoint('leftHip', 'Left Hip', lm.leftHip, 'pelvis');
    this.addJoint('leftKnee', 'Left Knee', lm.leftKnee, 'leftHip');
    this.addJoint('leftAnkle', 'Left Ankle', lm.leftAnkle, 'leftKnee');
    this.addJoint('leftFoot', 'Left Foot', lm.leftToe, 'leftAnkle');

    // Right Leg
    this.addJoint('rightHip', 'Right Hip', lm.rightHip, 'pelvis');
    this.addJoint('rightKnee', 'Right Knee', lm.rightKnee, 'rightHip');
    this.addJoint('rightAnkle', 'Right Ankle', lm.rightAnkle, 'rightKnee');
    this.addJoint('rightFoot', 'Right Foot', lm.rightToe, 'rightAnkle');
  }

  /** Calculate bind transforms and their inverses */
  private computeBindTransforms(): void {
    for (const id of this.jointOrder) {
      const joint = this.joints.get(id)!;
      if (joint.parentId) {
        const parent = this.joints.get(joint.parentId)!;
        joint.localTranslation = joint.bindPosition.sub(parent.bindPosition);
      } else {
        joint.localTranslation = joint.bindPosition;
      }
      joint.bindTransform = Mat4.fromTranslation(joint.bindPosition);
      joint.inverseBindTransform = joint.bindTransform.invert();
    }
  }

  /**
   * Traverse skeleton in topological order and update world transforms (Forward Kinematics)
   */
  updateGlobalTransforms(characterRootTransform: Mat4 = Mat4.identity()): void {
    for (const id of this.jointOrder) {
      const joint = this.joints.get(id)!;

      // Local transform: Translation * Rotation
      const localMat = Mat4.fromRotationTranslationScale(
        joint.currentLocalRotation,
        joint.localTranslation
      );

      if (joint.parentId) {
        const parent = this.joints.get(joint.parentId)!;
        joint.currentGlobalTransform = parent.currentGlobalTransform.multiply(localMat);
      } else {
        joint.currentGlobalTransform = characterRootTransform.multiply(localMat);
      }

      // World position is transformed origin
      joint.currentWorldPosition = joint.currentGlobalTransform.transformPoint(Vec3.ZERO);

      // Compute skinning matrix S_i = M_i * B_i
      joint.skinningMatrix = joint.currentGlobalTransform.multiply(joint.inverseBindTransform);
    }
  }

  getJoint(id: string): BoneJoint | undefined {
    return this.joints.get(id);
  }

  resetAllPoses(): void {
    for (const joint of this.joints.values()) {
      joint.resetRotation();
    }
    this.updateGlobalTransforms();
  }

  /**
   * Apply pose preset by name
   */
  applyPosePreset(presetName: string): void {
    this.resetAllPoses();

    switch (presetName) {
      case 'T-Pose':
        // Arms horizontal (lift shoulders / upper arms 75 degrees)
        this.getJoint('leftShoulder')?.setRotation(0, 0, 75);
        this.getJoint('rightShoulder')?.setRotation(0, 0, -75);
        break;

      case 'Natural Stride':
        // Left leg forward, right leg back, opposite arms swinging
        this.getJoint('leftHip')?.setRotation(25, 0, 0);
        this.getJoint('leftKnee')?.setRotation(-15, 0, 0);
        this.getJoint('rightHip')?.setRotation(-20, 0, 0);
        this.getJoint('rightKnee')?.setRotation(20, 0, 0);
        this.getJoint('leftShoulder')?.setRotation(-25, 0, 5);
        this.getJoint('rightShoulder')?.setRotation(25, 0, -5);
        this.getJoint('leftElbow')?.setRotation(30, 0, 0);
        this.getJoint('rightElbow')?.setRotation(20, 0, 0);
        this.getJoint('chest')?.setRotation(0, 5, 0);
        break;

      case 'Look Right / Head Turn':
        this.getJoint('head')?.setRotation(5, -45, 0);
        this.getJoint('chest')?.setRotation(0, -15, 0);
        this.getJoint('leftElbow')?.setRotation(20, 0, 0);
        this.getJoint('rightElbow')?.setRotation(20, 0, 0);
        break;

      case 'Thinking / Pensive':
        this.getJoint('rightShoulder')?.setRotation(50, -20, -10);
        this.getJoint('rightElbow')?.setRotation(95, 20, 0);
        this.getJoint('rightWrist')?.setRotation(20, 0, 0);
        this.getJoint('head')?.setRotation(15, 10, -5);
        this.getJoint('leftShoulder')?.setRotation(10, 0, 0);
        this.getJoint('leftElbow')?.setRotation(25, 0, 0);
        break;

      case 'Relaxed / A-Pose':
      default:
        // Default zero rotations
        break;
    }

    this.updateGlobalTransforms();
  }
}
