/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Immutable three-dimensional mathematical vector.
 * Adheres strictly to a right-handed coordinate system:
 * X: Horizontal (Right)
 * Y: Vertical (Up)
 * Z: Depth (Forward towards viewer)
 */
export class Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
    this.z = Number.isFinite(z) ? z : 0;
  }

  static readonly ZERO = new Vec3(0, 0, 0);
  static readonly UNIT_X = new Vec3(1, 0, 0);
  static readonly UNIT_Y = new Vec3(0, 1, 0);
  static readonly UNIT_Z = new Vec3(0, 0, 1);
  static readonly FORWARD = new Vec3(0, 0, 1); // Default eye forward gaze

  /** Vector addition: this + v */
  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /** Vector subtraction: this - v */
  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /** Scalar multiplication: this * s */
  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  /** Scalar division with zero check: this / s */
  div(s: number): Vec3 {
    if (Math.abs(s) < 1e-12) {
      return Vec3.ZERO;
    }
    const inv = 1.0 / s;
    return new Vec3(this.x * inv, this.y * inv, this.z * inv);
  }

  /** Dot product */
  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** Cross product: this x v (right-handed) */
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /** Squared magnitude: x^2 + y^2 + z^2 */
  magnitudeSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** Euclidean magnitude (length) */
  magnitude(): number {
    return Math.sqrt(this.magnitudeSq());
  }

  /** Normalization: returns unit vector in the same direction, or Vec3.ZERO if degenerate */
  normalize(): Vec3 {
    const mag = this.magnitude();
    if (mag < 1e-12) {
      return Vec3.ZERO;
    }
    const inv = 1.0 / mag;
    return new Vec3(this.x * inv, this.y * inv, this.z * inv);
  }

  /** Euclidean distance between this point and another */
  distanceTo(v: Vec3): number {
    return this.sub(v).magnitude();
  }

  /** Squared Euclidean distance between this point and another */
  distanceToSq(v: Vec3): number {
    return this.sub(v).magnitudeSq();
  }

  /** Linear interpolation: (1 - t)*this + t*v */
  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  /** Approximate equality check with configurable tolerance */
  approxEquals(v: Vec3, tolerance: number = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) <= tolerance &&
      Math.abs(this.y - v.y) <= tolerance &&
      Math.abs(this.z - v.z) <= tolerance
    );
  }

  /** Convert to [x, y, z] array */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** Formatted string representation for numeric display */
  toString(digits: number = 4): string {
    return `(${this.x.toFixed(digits)}, ${this.y.toFixed(digits)}, ${this.z.toFixed(digits)})`;
  }
}
