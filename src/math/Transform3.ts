/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from './Vec3';
import { Quaternion } from './Quaternion';

/**
 * Represents a 3D spatial affine transformation with Translation, Rotation, and Scale.
 */
export class Transform3 {
  readonly translation: Vec3;
  readonly rotation: Quaternion;
  readonly scale: Vec3;

  constructor(
    translation: Vec3 = Vec3.ZERO,
    rotation: Quaternion = Quaternion.IDENTITY,
    scale: Vec3 = new Vec3(1, 1, 1)
  ) {
    this.translation = translation;
    this.rotation = rotation;
    this.scale = scale;
  }

  static readonly IDENTITY = new Transform3();

  /** Transform a 3D point (applies scale, rotation, translation) */
  transformPoint(p: Vec3): Vec3 {
    // 1. Scale
    const scaled = new Vec3(p.x * this.scale.x, p.y * this.scale.y, p.z * this.scale.z);
    // 2. Rotate
    const rotated = this.rotation.rotateVec3(scaled);
    // 3. Translate
    return rotated.add(this.translation);
  }

  /** Transform a 3D direction vector (applies scale and rotation, ignores translation) */
  transformDirection(d: Vec3): Vec3 {
    const scaled = new Vec3(d.x * this.scale.x, d.y * this.scale.y, d.z * this.scale.z);
    return this.rotation.rotateVec3(scaled).normalize();
  }

  /** Transform a surface normal vector (rotates by inverse transpose of scale, normalized) */
  transformNormal(n: Vec3): Vec3 {
    // For uniform scale, rotation alone preserves normal orthogonality
    const invScale = new Vec3(
      Math.abs(this.scale.x) > 1e-12 ? 1 / this.scale.x : 0,
      Math.abs(this.scale.y) > 1e-12 ? 1 / this.scale.y : 0,
      Math.abs(this.scale.z) > 1e-12 ? 1 / this.scale.z : 0
    );
    const scaled = new Vec3(n.x * invScale.x, n.y * invScale.y, n.z * invScale.z);
    return this.rotation.rotateVec3(scaled).normalize();
  }

  /** Combine transformations: this * other */
  compose(child: Transform3): Transform3 {
    const newTranslation = this.transformPoint(child.translation);
    const newRotation = this.rotation.multiply(child.rotation);
    const newScale = new Vec3(
      this.scale.x * child.scale.x,
      this.scale.y * child.scale.y,
      this.scale.z * child.scale.z
    );
    return new Transform3(newTranslation, newRotation, newScale);
  }
}
