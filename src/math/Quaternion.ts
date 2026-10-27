/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from './Vec3';
import { Mat3 } from './Mat3';

/**
 * Unit quaternion representing 3D spatial rotation: q = [w, x, y, z]
 */
export class Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
    this.z = Number.isFinite(z) ? z : 0;
    this.w = Number.isFinite(w) ? w : 1;
  }

  static readonly IDENTITY = new Quaternion(0, 0, 0, 1);

  /** Create quaternion from axis and angle (in radians) */
  static fromAxisAngle(axis: Vec3, angleRad: number): Quaternion {
    const halfAngle = angleRad * 0.5;
    const s = Math.sin(halfAngle);
    const u = axis.normalize();
    return new Quaternion(u.x * s, u.y * s, u.z * s, Math.cos(halfAngle));
  }

  /**
   * Create quaternion from Yaw (Y-axis) and Pitch (X-axis).
   * Rotation order: Rx(pitch) * Ry(yaw)
   */
  static fromYawPitch(yawRad: number, pitchRad: number): Quaternion {
    const qy = Quaternion.fromAxisAngle(Vec3.UNIT_Y, yawRad);
    const qx = Quaternion.fromAxisAngle(Vec3.UNIT_X, pitchRad);
    return qx.multiply(qy);
  }

  /** Quaternion multiplication: this * q (applies q then this) */
  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    ).normalize();
  }

  /** Normalize quaternion */
  normalize(): Quaternion {
    const mag = Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
    );
    if (mag < 1e-12) return Quaternion.IDENTITY;
    const inv = 1.0 / mag;
    return new Quaternion(this.x * inv, this.y * inv, this.z * inv, this.w * inv);
  }

  /** Conjugate (inverse for unit quaternions) */
  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  /** Rotate a Vec3 by this quaternion: q * v * q^-1 */
  rotateVec3(v: Vec3): Vec3 {
    // Optimized formula: v + 2*r x (r x v + w*v) where r = (x, y, z)
    const r = new Vec3(this.x, this.y, this.z);
    const t = r.cross(v).scale(2.0);
    return v.add(t.scale(this.w)).add(r.cross(t));
  }

  /** Convert quaternion to 3x3 rotation matrix */
  toMat3(): Mat3 {
    const x2 = this.x + this.x;
    const y2 = this.y + this.y;
    const z2 = this.z + this.z;
    const xx = this.x * x2;
    const xy = this.x * y2;
    const xz = this.x * z2;
    const yy = this.y * y2;
    const yz = this.y * z2;
    const zz = this.z * z2;
    const wx = this.w * x2;
    const wy = this.w * y2;
    const wz = this.w * z2;

    return new Mat3([
      1 - (yy + zz), xy - wz, xz + wy,
      xy + wz, 1 - (xx + zz), yz - wx,
      xz - wy, yz + wx, 1 - (xx + yy)
    ]);
  }
}
