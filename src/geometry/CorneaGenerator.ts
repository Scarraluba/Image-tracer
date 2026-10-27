/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from './Triangle';
import { MeshData } from './MeshData';

export interface CorneaParameters {
  name?: string;
  baseRadius?: number; // Radius of curvature at base (iris margin)
  bulgeHeight?: number; // How far the cornea prolate cap protrudes
  latRings?: number;
  segments?: number;
  eyeballRadius?: number;
}

/**
 * Procedural Cornea Dome Generator.
 * Creates an anatomical prolate ellipsoidal dome extending forward in +Z from the iris margin.
 */
export class CorneaGenerator {
  static generateCornea(params: CorneaParameters = {}): MeshData {
    const {
      name = 'Cornea',
      baseRadius = 5.2,
      bulgeHeight = 2.4,
      latRings = 12,
      segments = 32,
      eyeballRadius = 12.0,
    } = params;

    const vertices: Vec3[] = [];
    const normals: Vec3[] = [];
    const uvs: [number, number][] = [];
    const triangles: Triangle[] = [];

    // The base of the cornea sits on the eyeball sphere at radius baseRadius.
    // eyeballZ at base: sqrt(R^2 - baseRadius^2)
    const baseZ = Math.sqrt(Math.max(0, eyeballRadius * eyeballRadius - baseRadius * baseRadius));
    // Peak of cornea at the apex
    const apexZ = eyeballRadius + bulgeHeight;

    // Apex vertex (ring 0)
    const apexIdx = 0;
    vertices.push(new Vec3(0, 0, apexZ));
    normals.push(new Vec3(0, 0, 1));
    uvs.push([0.5, 0.5]);

    // Concentric rings from apex down to the limbus (corneal base)
    for (let r = 1; r <= latRings; r++) {
      const frac = r / latRings; // 0 to 1
      const currentRadius = baseRadius * Math.sin(frac * (Math.PI * 0.5));
      // Prolate profile: z interpolates from apexZ down to baseZ
      const cosFrac = Math.cos(frac * (Math.PI * 0.5));
      const currentZ = baseZ + (apexZ - baseZ) * cosFrac;

      for (let s = 0; s < segments; s++) {
        const theta = (2 * Math.PI * s) / segments;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = currentRadius * cosTheta;
        const y = currentRadius * sinTheta;
        const pos = new Vec3(x, y, currentZ);
        vertices.push(pos);

        // Corneal surface normal
        const nx = x;
        const ny = y;
        const nz = (apexZ - currentZ) * 1.5;
        normals.push(new Vec3(nx, ny, nz).normalize());

        const u = 0.5 + 0.5 * (currentRadius / baseRadius) * cosTheta;
        const v = 0.5 + 0.5 * (currentRadius / baseRadius) * sinTheta;
        uvs.push([u, v]);
      }
    }

    const getIdx = (ring: number, seg: number): number => {
      if (ring === 0) return apexIdx;
      const normSeg = ((seg % segments) + segments) % segments;
      return 1 + (ring - 1) * segments + normSeg;
    };

    // First ring around apex
    for (let s = 0; s < segments; s++) {
      const vCurr = getIdx(1, s);
      const vNext = getIdx(1, s + 1);
      triangles.push(new Triangle(apexIdx, vCurr, vNext));
    }

    // Intermediate rings
    for (let r = 1; r < latRings; r++) {
      for (let s = 0; s < segments; s++) {
        const iCurr = getIdx(r, s);
        const iNext = getIdx(r, s + 1);
        const oCurr = getIdx(r + 1, s);
        const oNext = getIdx(r + 1, s + 1);

        triangles.push(new Triangle(iCurr, oCurr, oNext));
        triangles.push(new Triangle(iCurr, oNext, iNext));
      }
    }

    return new MeshData(name, vertices, triangles, normals, uvs);
  }
}
