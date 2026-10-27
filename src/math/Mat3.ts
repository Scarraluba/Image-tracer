/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from './Vec3';

/**
 * 3x3 Matrix for 3D rotations and linear transformations.
 * Stored in row-major order:
 * [ m00, m01, m02 ]
 * [ m10, m11, m12 ]
 * [ m20, m21, m22 ]
 */
export class Mat3 {
  readonly elements: readonly number[];

  constructor(elements: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
    this.elements = Object.freeze([...elements]);
  }

  static readonly IDENTITY = new Mat3([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  /** Rotation around X-axis (Pitch) by angle in radians */
  static fromRotationX(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    // Right-handed rotation around X axis
    // Pitching up raises forward vector (+Z) toward +Y
    return new Mat3([
      1, 0, 0,
      0, c, -s,
      0, s, c
    ]);
  }

  /** Rotation around Y-axis (Yaw) by angle in radians */
  static fromRotationY(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    // Right-handed rotation around Y axis
    // Yawing right turns +Z toward +X
    return new Mat3([
      c, 0, s,
      0, 1, 0,
      -s, 0, c
    ]);
  }

  /** Rotation around Z-axis (Roll) by angle in radians */
  static fromRotationZ(radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Mat3([
      c, -s, 0,
      s, c, 0,
      0, 0, 1
    ]);
  }

  /**
   * Constructs eye orientation matrix from Yaw (Y) and Pitch (X).
   * Rotation convention: d = Rx(pitch) * Ry(yaw) * d0
   */
  static fromYawPitch(yawRad: number, pitchRad: number): Mat3 {
    const ry = Mat3.fromRotationY(yawRad);
    const rx = Mat3.fromRotationX(pitchRad);
    return rx.multiply(ry);
  }

  /** Matrix multiplication: this * other */
  multiply(m: Mat3): Mat3 {
    const a = this.elements;
    const b = m.elements;

    return new Mat3([
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ]);
  }

  /** Transform a Vec3 by this 3x3 matrix: M * v */
  multiplyVec3(v: Vec3): Vec3 {
    const m = this.elements;
    return new Vec3(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[3] * v.x + m[4] * v.y + m[5] * v.z,
      m[6] * v.x + m[7] * v.y + m[8] * v.z
    );
  }

  /** Transpose of matrix (for rotation matrices, transpose is the inverse) */
  transpose(): Mat3 {
    const m = this.elements;
    return new Mat3([
      m[0], m[3], m[6],
      m[1], m[4], m[7],
      m[2], m[5], m[8]
    ]);
  }
}
