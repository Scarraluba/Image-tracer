/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from './Triangle';
import { MeshData } from './MeshData';

export interface DiscParameters {
  name?: string;
  radius?: number;
  radialSegments?: number;
  rings?: number;
  centerZ?: number;
  sphereRadius?: number; // If specified > 0, curves to conform to eyeball surface
  zOffset?: number; // Offset along +Z to prevent z-fighting
}

/**
 * Procedural Radial Disc and Curved Cap Generator for Iris and Pupil geometry.
 * Conforms to the eye coordinate system facing along +Z (default gaze).
 */
export class DiscGenerator {
  /**
   * Generates a radial disc or shallow curved cap perpendicular to +Z axis.
   */
  static generateDisc(params: DiscParameters = {}): MeshData {
    const {
      name = 'RadialDisc',
      radius = 4.0,
      radialSegments = 32,
      rings = 4,
      centerZ = 12.0,
      sphereRadius = 12.0,
      zOffset = 0.05,
    } = params;

    const segments = Math.max(8, Math.floor(radialSegments));
    const ringCount = Math.max(1, Math.floor(rings));

    const vertices: Vec3[] = [];
    const normals: Vec3[] = [];
    const uvs: [number, number][] = [];
    const triangles: Triangle[] = [];

    // Center vertex at r = 0
    let centerVertexZ = centerZ + zOffset;
    if (sphereRadius > 0) {
      centerVertexZ = sphereRadius + zOffset;
    }

    const centerIdx = 0;
    vertices.push(new Vec3(0, 0, centerVertexZ));
    normals.push(new Vec3(0, 0, 1));
    uvs.push([0.5, 0.5]);

    // Concentric rings of vertices
    for (let r = 1; r <= ringCount; r++) {
      const ringFraction = r / ringCount;
      const currentRadius = radius * ringFraction;

      for (let s = 0; s < segments; s++) {
        const theta = (2 * Math.PI * s) / segments;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = currentRadius * cosTheta;
        const y = currentRadius * sinTheta;

        // If sphereRadius specified, calculate curved z
        let z = centerZ + zOffset;
        let normal = new Vec3(0, 0, 1);

        if (sphereRadius > 0 && currentRadius < sphereRadius) {
          const sphereZ = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - currentRadius * currentRadius));
          z = sphereZ + zOffset;
          normal = new Vec3(x, y, sphereZ).normalize();
        }

        vertices.push(new Vec3(x, y, z));
        normals.push(normal);

        // UV mapping normalized 0..1
        const u = 0.5 + 0.5 * ringFraction * cosTheta;
        const v = 0.5 + 0.5 * ringFraction * sinTheta;
        uvs.push([u, v]);
      }
    }

    // Helper to get index for (ring r, segment s)
    const getRingIndex = (ring: number, seg: number): number => {
      if (ring === 0) return centerIdx;
      const normSeg = ((seg % segments) + segments) % segments;
      return 1 + (ring - 1) * segments + normSeg;
    };

    // First ring connected to center vertex
    for (let s = 0; s < segments; s++) {
      const vCurr = getRingIndex(1, s);
      const vNext = getRingIndex(1, s + 1);
      // CCW winding facing +Z
      triangles.push(new Triangle(centerIdx, vCurr, vNext));
    }

    // Intermediate rings
    for (let r = 1; r < ringCount; r++) {
      for (let s = 0; s < segments; s++) {
        const innerCurr = getRingIndex(r, s);
        const innerNext = getRingIndex(r, s + 1);
        const outerCurr = getRingIndex(r + 1, s);
        const outerNext = getRingIndex(r + 1, s + 1);

        triangles.push(new Triangle(innerCurr, outerCurr, outerNext));
        triangles.push(new Triangle(innerCurr, outerNext, innerNext));
      }
    }

    return new MeshData(name, vertices, triangles, normals, uvs);
  }

  /**
   * Procedural Iris with striated radial mesh
   */
  static generateIris(
    radius: number = 4.0,
    sphereRadius: number = 12.0,
    zOffset: number = 0.04
  ): MeshData {
    return this.generateDisc({
      name: 'Iris',
      radius,
      radialSegments: 36,
      rings: 5,
      sphereRadius,
      zOffset,
    });
  }

  /**
   * Procedural Pupil centered on iris
   */
  static generatePupil(
    radius: number = 1.5,
    sphereRadius: number = 12.0,
    zOffset: number = 0.08
  ): MeshData {
    return this.generateDisc({
      name: 'Pupil',
      radius,
      radialSegments: 32,
      rings: 3,
      sphereRadius,
      zOffset,
    });
  }
}
