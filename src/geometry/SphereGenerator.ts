/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from './Triangle';
import { MeshData } from './MeshData';

export interface EllipsoidParameters {
  name?: string;
  rx?: number;
  ry?: number;
  rz?: number;
  latDivisions?: number; // n
  lonDivisions?: number; // m
}

/**
 * Procedural mathematical sphere and ellipsoid generator adhering to Section 5:
 * φ_i = π * i / n
 * θ_j = 2π * j / m
 * x(i,j) = Rx * sin(φ_i) * cos(θ_j)
 * y(i,j) = Ry * cos(φ_i)
 * z(i,j) = Rz * sin(φ_i) * sin(θ_j)
 *
 * Handles polar caps cleanly without degenerate zero-area faces.
 */
export class SphereGenerator {
  /**
   * Generate an eyeball sphere (default radius R = 12.0, n = 20, m = 32)
   */
  static generateSphere(
    radius: number = 12.0,
    latDivisions: number = 20,
    lonDivisions: number = 32,
    name: string = 'Eyeball_Sclera'
  ): MeshData {
    return this.generateEllipsoid({
      name,
      rx: radius,
      ry: radius,
      rz: radius,
      latDivisions,
      lonDivisions,
    });
  }

  /**
   * Procedural Ellipsoid Generator supporting arbitrary Rx, Ry, Rz radii.
   */
  static generateEllipsoid(params: EllipsoidParameters = {}): MeshData {
    const {
      name = 'Ellipsoid',
      rx = 12.0,
      ry = 12.0,
      rz = 12.0,
      latDivisions = 20,
      lonDivisions = 32,
    } = params;

    const n = Math.max(4, Math.floor(latDivisions));
    const m = Math.max(6, Math.floor(lonDivisions));

    const vertices: Vec3[] = [];
    const normals: Vec3[] = [];
    const uvs: [number, number][] = [];
    const triangles: Triangle[] = [];

    // North pole vertex: i = 0, φ = 0
    // x = 0, y = Ry, z = 0
    const northPoleIndex = 0;
    vertices.push(new Vec3(0, ry, 0));
    normals.push(new Vec3(0, 1, 0));
    uvs.push([0.5, 1.0]);

    // Intermediate latitude rings: i = 1 to n - 1
    // Each ring contains m unique vertices (j = 0 to m - 1)
    for (let i = 1; i < n; i++) {
      const phi = (Math.PI * i) / n;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const vCoord = 1.0 - i / n;

      for (let j = 0; j < m; j++) {
        const theta = (2 * Math.PI * j) / m;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const uCoord = j / m;

        // Position
        const x = rx * sinPhi * cosTheta;
        const y = ry * cosPhi;
        const z = rz * sinPhi * sinTheta;
        const pos = new Vec3(x, y, z);
        vertices.push(pos);

        // Analytical Ellipsoid Normal: (x / rx^2, y / ry^2, z / rz^2) normalized
        const nx = x / (rx * rx);
        const ny = y / (ry * ry);
        const nz = z / (rz * rz);
        normals.push(new Vec3(nx, ny, nz).normalize());

        uvs.push([uCoord, vCoord]);
      }
    }

    // South pole vertex: i = n, φ = π
    // x = 0, y = -Ry, z = 0
    const southPoleIndex = vertices.length;
    vertices.push(new Vec3(0, -ry, 0));
    normals.push(new Vec3(0, -1, 0));
    uvs.push([0.5, 0.0]);

    // Helper to get vertex index for (lat ring i, lon index j)
    // Ring i starts at index 1 + (i - 1) * m
    const getIndex = (i: number, j: number): number => {
      if (i === 0) return northPoleIndex;
      if (i === n) return southPoleIndex;
      const normalizedJ = ((j % m) + m) % m;
      return 1 + (i - 1) * m + normalizedJ;
    };

    // 1. Top polar cap triangles (connecting north pole to ring i = 1)
    for (let j = 0; j < m; j++) {
      const vNext = getIndex(1, j + 1);
      const vCurr = getIndex(1, j);
      // CCW winding seen from outside
      triangles.push(new Triangle(northPoleIndex, vNext, vCurr));
    }

    // 2. Intermediate quad bands (split into 2 triangles each)
    for (let i = 1; i < n - 1; i++) {
      for (let j = 0; j < m; j++) {
        const topCurr = getIndex(i, j);
        const topNext = getIndex(i, j + 1);
        const botCurr = getIndex(i + 1, j);
        const botNext = getIndex(i + 1, j + 1);

        // Quad: (topCurr, topNext, botNext, botCurr)
        // Triangle 1: topCurr -> topNext -> botNext
        triangles.push(new Triangle(topCurr, topNext, botNext));
        // Triangle 2: topCurr -> botNext -> botCurr
        triangles.push(new Triangle(topCurr, botNext, botCurr));
      }
    }

    // 3. Bottom polar cap triangles (connecting ring i = n - 1 to south pole)
    for (let j = 0; j < m; j++) {
      const vCurr = getIndex(n - 1, j);
      const vNext = getIndex(n - 1, j + 1);
      // CCW winding seen from outside
      triangles.push(new Triangle(southPoleIndex, vCurr, vNext));
    }

    return new MeshData(name, vertices, triangles, normals, uvs);
  }
}
