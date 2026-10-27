/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from './Triangle';

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
}

export interface ValidationReport {
  isValid: boolean;
  vertexCount: number;
  triangleCount: number;
  errors: string[];
  warnings: string[];
  radiusStats?: {
    minRadius: number;
    maxRadius: number;
    avgRadius: number;
  };
}

/**
 * Platform-independent 3D Procedural Mesh representation.
 * Stores vertices, triangles, normals, and UVs with analytical validation.
 */
export class MeshData {
  readonly name: string;
  readonly vertices: readonly Vec3[];
  readonly triangles: readonly Triangle[];
  readonly normals: readonly Vec3[];
  readonly uvs: readonly [number, number][];

  constructor(
    name: string,
    vertices: Vec3[],
    triangles: Triangle[],
    normals?: Vec3[],
    uvs?: [number, number][]
  ) {
    this.name = name;
    this.vertices = Object.freeze([...vertices]);
    this.triangles = Object.freeze([...triangles]);

    // If normals not provided, compute per-vertex averaged normals
    if (normals && normals.length === vertices.length) {
      this.normals = Object.freeze([...normals]);
    } else {
      this.normals = Object.freeze(this.computeVertexNormals());
    }

    // Default UVs if omitted
    if (uvs && uvs.length === vertices.length) {
      this.uvs = Object.freeze([...uvs]);
    } else {
      this.uvs = Object.freeze(vertices.map(() => [0, 0] as [number, number]));
    }
  }

  /** Compute per-vertex smoothed surface normals from triangle face normals */
  private computeVertexNormals(): Vec3[] {
    const accNormals: Vec3[] = this.vertices.map(() => Vec3.ZERO);

    for (const tri of this.triangles) {
      if (tri.hasDuplicateIndices()) continue;
      const fn = tri.calculateNormal(this.vertices);
      accNormals[tri.i0] = accNormals[tri.i0].add(fn);
      accNormals[tri.i1] = accNormals[tri.i1].add(fn);
      accNormals[tri.i2] = accNormals[tri.i2].add(fn);
    }

    return accNormals.map((n, idx) => {
      const normalized = n.normalize();
      // Fallback: point outward from origin if normal is zero (like at pole)
      if (normalized.magnitudeSq() < 1e-6) {
        return this.vertices[idx].normalize();
      }
      return normalized;
    });
  }

  /** Calculate axis-aligned bounding box */
  getBoundingBox(): BoundingBox {
    if (this.vertices.length === 0) {
      return {
        min: Vec3.ZERO,
        max: Vec3.ZERO,
        center: Vec3.ZERO,
        size: Vec3.ZERO,
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const v of this.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }

    const min = new Vec3(minX, minY, minZ);
    const max = new Vec3(maxX, maxY, maxZ);
    const center = min.lerp(max, 0.5);
    const size = max.sub(min);

    return { min, max, center, size };
  }

  /** Comprehensive geometric validation following Section 5 specifications */
  validate(expectedRadius?: number, radiusTolerance: number = 0.05): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Vertex count check
    if (this.vertices.length < 3) {
      errors.push('Mesh contains fewer than 3 vertices.');
    }

    // 2. Check for non-finite coordinates
    let nanCount = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) {
        nanCount++;
      }
    }
    if (nanCount > 0) {
      errors.push(`Mesh contains ${nanCount} non-finite vertex coordinates.`);
    }

    // 3. Triangle indices validation
    let outOfBoundsCount = 0;
    let duplicateIndexCount = 0;
    let zeroAreaCount = 0;

    for (const tri of this.triangles) {
      if (
        tri.i0 < 0 || tri.i0 >= this.vertices.length ||
        tri.i1 < 0 || tri.i1 >= this.vertices.length ||
        tri.i2 < 0 || tri.i2 >= this.vertices.length
      ) {
        outOfBoundsCount++;
      }
      if (tri.hasDuplicateIndices()) {
        duplicateIndexCount++;
      }
      const area = tri.calculateArea(this.vertices);
      if (area < 1e-9) {
        zeroAreaCount++;
      }
    }

    if (outOfBoundsCount > 0) {
      errors.push(`Mesh contains ${outOfBoundsCount} triangle indices pointing out of bounds.`);
    }
    if (duplicateIndexCount > 0) {
      warnings.push(`Mesh contains ${duplicateIndexCount} degenerate triangles with repeated vertex indices.`);
    }
    if (zeroAreaCount > 0) {
      warnings.push(`Mesh contains ${zeroAreaCount} near-zero area triangles.`);
    }

    // 4. Radius statistics for spherical meshes
    let minRadius = Infinity;
    let maxRadius = -Infinity;
    let sumRadius = 0;

    for (const v of this.vertices) {
      const r = v.magnitude();
      if (r < minRadius) minRadius = r;
      if (r > maxRadius) maxRadius = r;
      sumRadius += r;
    }
    const avgRadius = this.vertices.length > 0 ? sumRadius / this.vertices.length : 0;

    if (expectedRadius !== undefined && this.vertices.length > 0) {
      if (Math.abs(avgRadius - expectedRadius) > radiusTolerance * expectedRadius) {
        errors.push(
          `Average vertex radius (${avgRadius.toFixed(2)}) deviates significantly from expected radius (${expectedRadius.toFixed(2)}).`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      vertexCount: this.vertices.length,
      triangleCount: this.triangles.length,
      errors,
      warnings,
      radiusStats: this.vertices.length > 0 ? { minRadius, maxRadius, avgRadius } : undefined,
    };
  }

  /** Export to standard Wavefront .OBJ format for independent 3D inspection */
  toOBJ(): string {
    const lines: string[] = [];
    lines.push(`# EYEW Geometry Engine - Procedural Mesh: ${this.name}`);
    lines.push(`# Vertices: ${this.vertices.length}`);
    lines.push(`# Triangles: ${this.triangles.length}`);
    lines.push('');

    for (const v of this.vertices) {
      lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`);
    }

    for (const uv of this.uvs) {
      lines.push(`vt ${uv[0].toFixed(6)} ${uv[1].toFixed(6)}`);
    }

    for (const n of this.normals) {
      lines.push(`vn ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}`);
    }

    lines.push(`g ${this.name}`);
    for (const tri of this.triangles) {
      // OBJ indices are 1-based
      const i0 = tri.i0 + 1;
      const i1 = tri.i1 + 1;
      const i2 = tri.i2 + 1;
      lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
    }

    return lines.join('\n');
  }
}
