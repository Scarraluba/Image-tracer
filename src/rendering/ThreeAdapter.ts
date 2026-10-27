/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { MeshData } from '../geometry/MeshData';

/**
 * Adapter converting platform-independent MeshData into Three.js BufferGeometry.
 */
export class ThreeAdapter {
  static createBufferGeometry(meshData: MeshData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    const vertexCount = meshData.vertices.length;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    for (let i = 0; i < vertexCount; i++) {
      const v = meshData.vertices[i];
      const n = meshData.normals[i] || v.normalize();
      const uv = meshData.uvs[i] || [0, 0];

      positions[i * 3 + 0] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;

      normals[i * 3 + 0] = n.x;
      normals[i * 3 + 1] = n.y;
      normals[i * 3 + 2] = n.z;

      uvs[i * 2 + 0] = uv[0];
      uvs[i * 2 + 1] = uv[1];
    }

    const triangleCount = meshData.triangles.length;
    const indices: number[] = new Array(triangleCount * 3);
    for (let t = 0; t < triangleCount; t++) {
      const tri = meshData.triangles[t];
      indices[t * 3 + 0] = tri.i0;
      indices[t * 3 + 1] = tri.i1;
      indices[t * 3 + 2] = tri.i2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    if (vertexCount > 65535) {
      geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
    } else {
      geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }
}
