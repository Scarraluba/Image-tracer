/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';

/**
 * Represents a triangular face using three vertex indices and provides
 * geometric queries for face normal, surface area, and degeneracy.
 */
export class Triangle {
  readonly i0: number;
  readonly i1: number;
  readonly i2: number;

  constructor(i0: number, i1: number, i2: number) {
    this.i0 = i0;
    this.i1 = i1;
    this.i2 = i2;
  }

  /** Calculate normal vector from vertex positions (Counter-Clockwise winding) */
  calculateNormal(vertices: readonly Vec3[]): Vec3 {
    const v0 = vertices[this.i0];
    const v1 = vertices[this.i1];
    const v2 = vertices[this.i2];

    const edge1 = v1.sub(v0);
    const edge2 = v2.sub(v0);
    return edge1.cross(edge2).normalize();
  }

  /** Calculate surface area of triangle */
  calculateArea(vertices: readonly Vec3[]): number {
    const v0 = vertices[this.i0];
    const v1 = vertices[this.i1];
    const v2 = vertices[this.i2];

    const edge1 = v1.sub(v0);
    const edge2 = v2.sub(v0);
    return 0.5 * edge1.cross(edge2).magnitude();
  }

  /** Check if face contains duplicate or degenerate indices */
  hasDuplicateIndices(): boolean {
    return this.i0 === this.i1 || this.i1 === this.i2 || this.i2 === this.i0;
  }
}
