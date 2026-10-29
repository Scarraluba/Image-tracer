/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { Vec3 } from '../math/Vec3';

/**
 * Procedural 3D Soccer Ball Generator adhering to truncated icosahedron geometry.
 * Uses exact icosahedral vertex symmetry to render 12 black pentagons and 20 white hexagons
 * on a high-fidelity spherical canvas texture with seam lines.
 */
export class SoccerBallGenerator {
  private static cachedTexture: THREE.CanvasTexture | null = null;

  /**
   * Generates a 1024x512 equirectangular texture of a classic 32-panel soccer ball
   * with 12 black pentagons surrounded by white hexagons and stitched seam lines.
   */
  static getSoccerBallTexture(): THREE.CanvasTexture {
    if (this.cachedTexture) {
      return this.cachedTexture;
    }

    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      this.cachedTexture = new THREE.CanvasTexture(canvas);
      return this.cachedTexture;
    }

    // 1. Calculate 12 Icosahedron Vertices (Golden Ratio: phi = (1 + sqrt(5))/2)
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices: [number, number, number][] = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ];

    // Normalize each icosahedron vertex onto unit sphere (pentagon centers)
    const pentagonCenters: THREE.Vector3[] = rawVertices.map(([x, y, z]) => {
      const v = new THREE.Vector3(x, y, z);
      return v.normalize();
    });

    // 2. Render pixel data for equirectangular map
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Radius of black pentagons in radians (~19 degrees = 0.33 rad)
    const pentagonRadius = 0.33;
    const seamWidth = 0.038;

    for (let y = 0; y < height; y++) {
      // Latitude: theta from +PI/2 (top) to -PI/2 (bottom)
      const lat = (0.5 - y / height) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);

      for (let x = 0; x < width; x++) {
        // Longitude: phi from -PI to +PI
        const lon = (x / width - 0.5) * 2 * Math.PI;
        const vx = cosLat * Math.sin(lon);
        const vy = sinLat;
        const vz = cosLat * Math.cos(lon);

        // Find distance to closest icosahedron vertex (pentagon center)
        let minDist = 10.0;
        let secondMinDist = 10.0;

        for (let i = 0; i < pentagonCenters.length; i++) {
          const pc = pentagonCenters[i];
          // Dot product = cos(angular distance)
          const dot = Math.max(-1, Math.min(1, vx * pc.x + vy * pc.y + vz * pc.z));
          const angDist = Math.acos(dot);

          if (angDist < minDist) {
            secondMinDist = minDist;
            minDist = angDist;
          } else if (angDist < secondMinDist) {
            secondMinDist = angDist;
          }
        }

        // Distance to the boundary between neighboring pentagon zones (hexagon seam)
        const hexSeamDist = Math.abs(secondMinDist - minDist);

        const pixelIndex = (y * width + x) * 4;

        if (minDist < pentagonRadius - seamWidth * 0.5) {
          // Inside Black Pentagon
          const leatherShade = 18 + Math.floor(Math.sin(vx * 40) * Math.cos(vy * 40) * 4);
          data[pixelIndex] = leatherShade;
          data[pixelIndex + 1] = leatherShade;
          data[pixelIndex + 2] = leatherShade + 2;
          data[pixelIndex + 3] = 255;
        } else if (minDist < pentagonRadius + seamWidth * 0.5) {
          // Pentagon Seam Groove / Stitch line
          data[pixelIndex] = 45;
          data[pixelIndex + 1] = 45;
          data[pixelIndex + 2] = 48;
          data[pixelIndex + 3] = 255;
        } else if (hexSeamDist < seamWidth * 0.6) {
          // Hexagon-to-Hexagon Seam Line
          data[pixelIndex] = 130;
          data[pixelIndex + 1] = 130;
          data[pixelIndex + 2] = 135;
          data[pixelIndex + 3] = 255;
        } else {
          // White Hexagonal Leather Panel
          // Subtle radial falloff for panel curvature and leather grain
          const panelCenterDist = minDist - pentagonRadius;
          const curveHighlight = Math.floor(Math.sin(panelCenterDist * 2.5) * 8);
          const baseWhite = 242 + curveHighlight;
          data[pixelIndex] = Math.min(255, baseWhite);
          data[pixelIndex + 1] = Math.min(255, baseWhite);
          data[pixelIndex + 2] = Math.min(255, baseWhite + 3);
          data[pixelIndex + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.cachedTexture = texture;
    return texture;
  }

  /**
   * Constructs a complete 3D Soccer Ball mesh group with realistic texturing,
   * specular highlights, and an optional orientation pivot.
   */
  static createSoccerBallMesh(radius: number = 4.8): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SoccerBallGazeTarget';

    const texture = this.getSoccerBallTexture();
    const geom = new THREE.SphereGeometry(radius, 32, 24);

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.32,
      metalness: 0.08,
      bumpScale: 0.05,
    });

    const ballMesh = new THREE.Mesh(geom, mat);
    ballMesh.name = 'SoccerBallSphere';
    ballMesh.castShadow = true;
    group.add(ballMesh);

    // Subtle outer glow / halo ring to make it easy to spot in 3D scene
    const haloGeom = new THREE.RingGeometry(radius * 1.08, radius * 1.25, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    haloMesh.name = 'SoccerBallHalo';
    group.add(haloMesh);

    return group;
  }
}
