/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Mat3 } from '../math/Mat3';
import { Quaternion } from '../math/Quaternion';
import { Ray3, RayPlaneIntersection, RaySphereIntersection } from '../math/Ray3';
import { EyeAnatomyConfig } from './EyeModel';

export interface GazeAnalysisData {
  origin: Vec3;
  direction: Vec3;
  directionLength: number; // Verification that |d| = 1
  tipPoint: Vec3;
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  yawRad: number;
  pitchRad: number;
  rollRad: number;
  rotationMatrix: Mat3;
  quaternion: Quaternion;
  rayLength: number;
  targetPlaneHit: RayPlaneIntersection;
  targetSphereHit: RaySphereIntersection;
}

/**
 * Dedicated Gaze Engine and Single Source of Truth for Gaze Kinematics.
 * Evaluates the authoritative mathematical gaze ray and spatial intersections.
 */
export class GazeModel {
  /**
   * Computes forward gaze direction from Yaw (ψ) and Pitch (α) angles.
   * Adheres to mathematical convention:
   * d0 = (0, 0, 1)
   * d = Rx(α) * Ry(ψ) * d0
   */
  static calculateGazeDirection(yawRad: number, pitchRad: number, rollRad: number = 0): Vec3 {
    const ry = Mat3.fromRotationY(yawRad);
    const rx = Mat3.fromRotationX(pitchRad);
    let rot = rx.multiply(ry);
    if (Math.abs(rollRad) > 1e-6) {
      const rz = Mat3.fromRotationZ(rollRad);
      rot = rz.multiply(rot);
    }
    const d0 = Vec3.FORWARD; // (0, 0, 1)
    return rot.multiplyVec3(d0).normalize();
  }

  /**
   * Complete gaze evaluation for an EyeAnatomyConfig.
   */
  static evaluateGaze(
    config: EyeAnatomyConfig,
    targetPlaneZ: number = 50.0,
    targetSphereCenter: Vec3 = new Vec3(0, 0, 45.0),
    targetSphereRadius: number = 4.0
  ): GazeAnalysisData {
    const yawRad = (config.yawDeg * Math.PI) / 180;
    const pitchRad = (config.pitchDeg * Math.PI) / 180;
    const rollRad = (config.rollDeg * Math.PI) / 180;

    const rotationMatrix = Mat3.fromYawPitch(yawRad, pitchRad);
    const quaternion = Quaternion.fromYawPitch(yawRad, pitchRad);
    const direction = this.calculateGazeDirection(yawRad, pitchRad, rollRad);

    const origin = config.center;
    const ray = new Ray3(origin, direction);
    const tipPoint = ray.pointAt(config.rayLength);

    // Target plane at Z = targetPlaneZ facing toward -Z
    const planePoint = new Vec3(0, 0, targetPlaneZ);
    const planeNormal = new Vec3(0, 0, -1);
    const targetPlaneHit = ray.intersectPlane(planePoint, planeNormal);

    // Virtual target sphere for intersection diagnostics
    const targetSphereHit = ray.intersectSphere(targetSphereCenter, targetSphereRadius);

    return {
      origin,
      direction,
      directionLength: direction.magnitude(),
      tipPoint,
      yawDeg: config.yawDeg,
      pitchDeg: config.pitchDeg,
      rollDeg: config.rollDeg,
      yawRad,
      pitchRad,
      rollRad,
      rotationMatrix,
      quaternion,
      rayLength: config.rayLength,
      targetPlaneHit,
      targetSphereHit,
    };
  }

  /**
   * Inverse Kinematics: Aim the eye at a specific 3D target point P in world space.
   * Calculates required Yaw (ψ) and Pitch (α) so that ray from C passes through P.
   */
  static calculateAnglesToTarget(eyeCenter: Vec3, targetPoint: Vec3): { yawDeg: number; pitchDeg: number } {
    const delta = targetPoint.sub(eyeCenter).normalize();
    // d = (dx, dy, dz) = (sinψ, -sinα cosψ, cosα cosψ)
    // yaw ψ = atan2(dx, dz)
    const yawRad = Math.atan2(delta.x, delta.z);
    // pitch α = atan2(-dy, sqrt(dx^2 + dz^2))
    const horizontalDist = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
    const pitchRad = Math.atan2(-delta.y, horizontalDist);

    return {
      yawDeg: (yawRad * 180) / Math.PI,
      pitchDeg: (pitchRad * 180) / Math.PI,
    };
  }
}
