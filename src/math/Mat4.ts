/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from './Vec3';
import { Quaternion } from './Quaternion';

/**
 * 4x4 Transformation Matrix for 3D Affine Transformations and Skinning.
 * Stored in column-major order (standard for 3D graphics).
 */
export class Mat4 {
  readonly elements: Float32Array;

  constructor(elements?: ArrayLike<number>) {
    this.elements = new Float32Array(16);
    if (elements && elements.length === 16) {
      this.elements.set(elements);
    } else {
      // Identity
      this.elements[0] = 1;
      this.elements[5] = 1;
      this.elements[10] = 1;
      this.elements[15] = 1;
    }
  }

  static identity(): Mat4 {
    return new Mat4();
  }

  static fromTranslation(t: Vec3): Mat4 {
    const m = new Mat4();
    m.elements[12] = t.x;
    m.elements[13] = t.y;
    m.elements[14] = t.z;
    return m;
  }

  static fromRotationTranslationScale(q: Quaternion, t: Vec3, s: Vec3 = new Vec3(1, 1, 1)): Mat4 {
    const m = new Mat4();
    const el = m.elements;

    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const sx = s.x, sy = s.y, sz = s.z;

    el[0] = (1 - (yy + zz)) * sx;
    el[1] = (xy + wz) * sx;
    el[2] = (xz - wy) * sx;
    el[3] = 0;

    el[4] = (xy - wz) * sy;
    el[5] = (1 - (xx + zz)) * sy;
    el[6] = (yz + wx) * sy;
    el[7] = 0;

    el[8] = (xz + wy) * sz;
    el[9] = (yz - wx) * sz;
    el[10] = (1 - (xx + yy)) * sz;
    el[11] = 0;

    el[12] = t.x;
    el[13] = t.y;
    el[14] = t.z;
    el[15] = 1;

    return m;
  }

  /** Multiply this * other */
  multiply(b: Mat4): Mat4 {
    const out = new Mat4();
    const ae = this.elements;
    const be = b.elements;
    const te = out.elements;

    for (let i = 0; i < 4; i++) {
      const a0 = ae[i];
      const a1 = ae[i + 4];
      const a2 = ae[i + 8];
      const a3 = ae[i + 12];

      te[i] = a0 * be[0] + a1 * be[1] + a2 * be[2] + a3 * be[3];
      te[i + 4] = a0 * be[4] + a1 * be[5] + a2 * be[6] + a3 * be[7];
      te[i + 8] = a0 * be[8] + a1 * be[9] + a2 * be[10] + a3 * be[11];
      te[i + 12] = a0 * be[12] + a1 * be[13] + a2 * be[14] + a3 * be[15];
    }

    return out;
  }

  /** Transform a 3D point (w = 1) */
  transformPoint(p: Vec3): Vec3 {
    const e = this.elements;
    const x = p.x, y = p.y, z = p.z;
    const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    const invW = Math.abs(w) > 1e-9 ? 1.0 / w : 1.0;

    return new Vec3(
      (e[0] * x + e[4] * y + e[8] * z + e[12]) * invW,
      (e[1] * x + e[5] * y + e[9] * z + e[13]) * invW,
      (e[2] * x + e[6] * y + e[10] * z + e[14]) * invW
    );
  }

  /** Transform a 3D direction vector (w = 0, ignores translation) */
  transformDirection(d: Vec3): Vec3 {
    const e = this.elements;
    const x = d.x, y = d.y, z = d.z;

    return new Vec3(
      e[0] * x + e[4] * y + e[8] * z,
      e[1] * x + e[5] * y + e[9] * z,
      e[2] * x + e[6] * y + e[10] * z
    ).normalize();
  }

  /** Compute matrix inverse */
  invert(): Mat4 {
    const te = this.elements;
    const out = new Mat4();
    const oe = out.elements;

    const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
    const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
    const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
    const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    if (Math.abs(det) < 1e-12) {
      return Mat4.identity();
    }

    const detInv = 1.0 / det;

    oe[0] = t11 * detInv;
    oe[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    oe[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    oe[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

    oe[4] = t12 * detInv;
    oe[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    oe[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    oe[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

    oe[8] = t13 * detInv;
    oe[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    oe[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    oe[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

    oe[12] = t14 * detInv;
    oe[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    oe[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    oe[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;

    return out;
  }
}
