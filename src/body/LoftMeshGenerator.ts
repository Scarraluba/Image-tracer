/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from '../geometry/Triangle';
import { MeshData } from '../geometry/MeshData';

export interface CrossSection {
  center: Vec3;
  radiusX: number; // a_i (horizontal radius)
  radiusZ: number; // b_i (depth radius)
  normal?: Vec3;   // Longitudinal direction T (defaults to +Y or path delta)
  uDir?: Vec3;     // Perpendicular unit vector U_i (defaults to +X)
  vDir?: Vec3;     // Perpendicular unit vector V_i (defaults to +Z)
}

export interface LoftOptions {
  name?: string;
  segmentsPerRing?: number; // N vertices per ring (e.g. 16)
  capStart?: boolean;       // Cap initial cross-section
  capEnd?: boolean;         // Cap final cross-section
}

/**
 * Procedural Lofted Mesh Generator adhering to Section 4:
 * Generates smooth 3D surfaces from sequences of elliptical cross-sections along a spine.
 * Vertex on elliptical section: V(i, θ) = C_i + a_i·cos(θ)·U_i + b_i·sin(θ)·V_i
 */
export class LoftMeshGenerator {
  static generateLoft(sections: CrossSection[], options: LoftOptions = {}): MeshData {
    const {
      name = 'LoftedSurface',
      segmentsPerRing = 16,
      capStart = true,
      capEnd = true,
    } = options;

    if (sections.length < 2) {
      throw new Error(`LoftMeshGenerator requires at least 2 cross-sections (received ${sections.length}).`);
    }

    const N = Math.max(8, segmentsPerRing);
    const vertices: Vec3[] = [];
    const normals: Vec3[] = [];
    const uvs: [number, number][] = [];
    const triangles: Triangle[] = [];

    // Helper to calculate stable orthonormal coordinate frames (U, V) along the path
    const frames: { u: Vec3; v: Vec3 }[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];

      let t: Vec3;
      if (sec.normal) {
        t = sec.normal.normalize();
      } else if (i < sections.length - 1) {
        t = sections[i + 1].center.sub(sec.center).normalize();
      } else {
        t = sec.center.sub(sections[i - 1].center).normalize();
      }

      // If t is degenerate, default to +Y
      if (t.magnitudeSq() < 1e-6) {
        t = Vec3.UNIT_Y;
      }

      // Compute orthonormal U and V spanning the cross-section
      let u: Vec3;
      let v: Vec3;

      if (sec.uDir && sec.vDir) {
        u = sec.uDir.normalize();
        v = sec.vDir.normalize();
      } else {
        // Choose reference vector not parallel to t
        const ref = Math.abs(t.dot(Vec3.UNIT_Y)) > 0.9 ? Vec3.UNIT_Z : Vec3.UNIT_Y;
        u = t.cross(ref).normalize();
        v = u.cross(t).normalize();
      }

      frames.push({ u, v });
    }

    // 1. Generate ring vertices
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const { u, v } = frames[i];
      const a = sec.radiusX;
      const b = sec.radiusZ;
      const vFrac = i / (sections.length - 1);

      for (let j = 0; j < N; j++) {
        const theta = (2 * Math.PI * j) / N;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // V(i, θ) = C_i + a_i·cos(θ)·U_i + b_i·sin(θ)·V_i
        const offset = u.scale(a * cosTheta).add(v.scale(b * sinTheta));
        const pos = sec.center.add(offset);
        vertices.push(pos);

        // Outward normal: (cosθ / a) U + (sinθ / b) V
        const nDir = u.scale((1 / Math.max(0.1, a)) * cosTheta).add(
          v.scale((1 / Math.max(0.1, b)) * sinTheta)
        ).normalize();
        normals.push(nDir);

        uvs.push([j / N, vFrac]);
      }
    }

    // Helper to get index for (section i, ring segment j)
    const getRingVertexIndex = (i: number, j: number): number => {
      const wrappedJ = ((j % N) + N) % N;
      return i * N + wrappedJ;
    };

    // 2. Connect successive rings with quad strips
    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = 0; j < N; j++) {
        const A = getRingVertexIndex(i, j);
        const B = getRingVertexIndex(i, j + 1);
        const C = getRingVertexIndex(i + 1, j);
        const D = getRingVertexIndex(i + 1, j + 1);

        // Consistent outward CCW winding: (A, C, B) and (B, C, D)
        triangles.push(new Triangle(A, C, B));
        triangles.push(new Triangle(B, C, D));
      }
    }

    // 3. Optional bottom cap (at section 0)
    if (capStart) {
      const bottomCenterIdx = vertices.length;
      vertices.push(sections[0].center);
      normals.push(frames[0].u.cross(frames[0].v).scale(-1).normalize());
      uvs.push([0.5, 0.0]);

      for (let j = 0; j < N; j++) {
        const vCurr = getRingVertexIndex(0, j);
        const vNext = getRingVertexIndex(0, j + 1);
        triangles.push(new Triangle(bottomCenterIdx, vCurr, vNext));
      }
    }

    // 4. Optional top cap (at last section)
    if (capEnd) {
      const lastSecIdx = sections.length - 1;
      const topCenterIdx = vertices.length;
      vertices.push(sections[lastSecIdx].center);
      normals.push(frames[lastSecIdx].u.cross(frames[lastSecIdx].v).normalize());
      uvs.push([0.5, 1.0]);

      for (let j = 0; j < N; j++) {
        const vCurr = getRingVertexIndex(lastSecIdx, j);
        const vNext = getRingVertexIndex(lastSecIdx, j + 1);
        triangles.push(new Triangle(topCenterIdx, vNext, vCurr));
      }
    }

    return new MeshData(name, vertices, triangles, normals, uvs);
  }
}
