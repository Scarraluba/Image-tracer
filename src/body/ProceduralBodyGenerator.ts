/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Triangle } from '../geometry/Triangle';
import { MeshData } from '../geometry/MeshData';
import { SphereGenerator } from '../geometry/SphereGenerator';
import { LoftMeshGenerator, CrossSection } from './LoftMeshGenerator';
import { BodyProportionsConfig } from './BodyProportions';
import { LandmarkSet, AnatomicalLandmarks } from './AnatomicalLandmarks';
import { Skeleton } from './Skeleton';
import { SkinDeformer, VertexSkinWeight } from './SkinDeformer';

export interface BodyPartMesh {
  id: string;
  name: string;
  baseMeshData: MeshData;
  skinWeights: VertexSkinWeight[];
  materialColor: string;
}

export interface CharacterBodyData {
  proportions: BodyProportionsConfig;
  landmarks: LandmarkSet;
  skeleton: Skeleton;
  parts: BodyPartMesh[];
  unifiedMesh?: {
    baseMeshData: MeshData;
    skinWeights: VertexSkinWeight[];
  };
}

export class ProceduralBodyGenerator {
  /**
   * Generates a complete mathematical procedural body from proportions.
   */
  static generateBody(
    props: BodyProportionsConfig,
    rootOffset: Vec3 = Vec3.ZERO
  ): CharacterBodyData {
    // 1. Generate Anatomical Landmarks
    const lm = AnatomicalLandmarks.generate(props, rootOffset);

    // 2. Build Skeleton
    const skeleton = new Skeleton(lm);

    const parts: BodyPartMesh[] = [];

    // Helper to generate limb segment with multiple loft rings
    const makeLimbLoft = (
      id: string,
      name: string,
      start: Vec3,
      end: Vec3,
      radiiStart: [number, number],
      radiiMid: [number, number],
      radiiEnd: [number, number],
      color: string
    ): BodyPartMesh => {
      const mid = start.lerp(end, 0.5);
      const delta = end.sub(start);
      const normal = delta.normalize();

      const sections: CrossSection[] = [
        { center: start, radiusX: radiiStart[0], radiusZ: radiiStart[1], normal },
        { center: mid, radiusX: radiiMid[0], radiusZ: radiiMid[1], normal },
        { center: end, radiusX: radiiEnd[0], radiusZ: radiiEnd[1], normal },
      ];

      const meshData = LoftMeshGenerator.generateLoft(sections, {
        name,
        segmentsPerRing: 14,
        capStart: true,
        capEnd: true,
      });

      const skinWeights = SkinDeformer.computeBoneWeights(meshData.vertices, skeleton);
      return { id, name, baseMeshData: meshData, skinWeights, materialColor: color };
    };

    // 3. Head & Skull (Procedural Ellipsoid with jaw prominence)
    const skullRx = props.headWidth * 0.5;
    const skullRy = props.headHeight * 0.5;
    const skullRz = props.headDepth * 0.5;

    const baseSkull = SphereGenerator.generateEllipsoid({
      name: 'Skull',
      rx: skullRx,
      ry: skullRy,
      rz: skullRz,
      latDivisions: 18,
      lonDivisions: 24,
    });

    // Translate skull vertices to headCenter landmark
    const skullVertices = baseSkull.vertices.map((v) => {
      // Subtle anatomical shaping: taper chin at bottom, expand forehead
      const yNorm = (v.y + skullRy) / (skullRy * 2);
      let shapeX = v.x;
      let shapeZ = v.z;
      if (yNorm < 0.4) {
        // Jaw taper
        const taper = 0.75 + 0.25 * (yNorm / 0.4);
        shapeX *= taper;
      }
      return new Vec3(shapeX + lm.headCenter.x, v.y + lm.headCenter.y, shapeZ + lm.headCenter.z);
    });

    const skullMesh = new MeshData(
      'Skull',
      skullVertices,
      [...baseSkull.triangles],
      [...baseSkull.normals],
      [...baseSkull.uvs]
    );
    const skullWeights = SkinDeformer.computeBoneWeights(skullMesh.vertices, skeleton);
    parts.push({
      id: 'head',
      name: 'Head & Skull',
      baseMeshData: skullMesh,
      skinWeights: skullWeights,
      materialColor: '#f1f5f9',
    });

    // 4. Neck (Lofted from upper shoulders to skull base)
    const neckSections: CrossSection[] = [
      {
        center: lm.neckBase,
        radiusX: props.neckWidth * 0.65,
        radiusZ: props.neckWidth * 0.65,
      },
      {
        center: lm.neckBase.lerp(lm.headCenter, 0.4),
        radiusX: props.neckWidth * 0.52,
        radiusZ: props.neckWidth * 0.55,
      },
      {
        center: lm.neckBase.lerp(lm.headCenter, 0.8),
        radiusX: props.neckWidth * 0.56,
        radiusZ: props.neckWidth * 0.58,
      },
    ];
    const neckMesh = LoftMeshGenerator.generateLoft(neckSections, {
      name: 'Neck',
      segmentsPerRing: 14,
    });
    const neckWeights = SkinDeformer.computeBoneWeights(neckMesh.vertices, skeleton);
    parts.push({
      id: 'neck',
      name: 'Neck',
      baseMeshData: neckMesh,
      skinWeights: neckWeights,
      materialColor: '#f8fafc',
    });

    // 5. Torso (9 Cross-Sections as specified in Section 6)
    const yTorsoBottom = lm.pelvisCenter.y;
    const yTorsoTop = lm.neckBase.y;
    const torsoH = yTorsoTop - yTorsoBottom;

    const torsoSections: CrossSection[] = [
      // 1. Pelvis Base
      {
        center: new Vec3(rootOffset.x, yTorsoBottom, rootOffset.z),
        radiusX: props.pelvisWidth * 0.46,
        radiusZ: props.pelvisDepth * 0.44,
      },
      // 2. Lower Pelvis transition
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.12, rootOffset.z),
        radiusX: props.pelvisWidth * 0.5,
        radiusZ: props.pelvisDepth * 0.48,
      },
      // 3. Lower Abdomen
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.25, rootOffset.z),
        radiusX: props.waistWidth * 0.48,
        radiusZ: props.waistDepth * 0.46,
      },
      // 4. Waist (Narrowest Midline)
      {
        center: new Vec3(rootOffset.x, lm.waistCenter.y, rootOffset.z),
        radiusX: props.waistWidth * 0.45,
        radiusZ: props.waistDepth * 0.42,
      },
      // 5. Lower Rib Cage
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.55, rootOffset.z),
        radiusX: props.chestWidth * 0.45,
        radiusZ: props.chestDepth * 0.44,
      },
      // 6. Mid-Chest
      {
        center: new Vec3(rootOffset.x, lm.chestCenter.y, rootOffset.z),
        radiusX: props.chestWidth * 0.48,
        radiusZ: props.chestDepth * 0.48,
      },
      // 7. Upper Chest
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.82, rootOffset.z),
        radiusX: props.chestWidth * 0.5,
        radiusZ: props.chestDepth * 0.46,
      },
      // 8. Upper Shoulders
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.94, rootOffset.z),
        radiusX: props.shoulderWidth * 0.46,
        radiusZ: props.chestDepth * 0.42,
      },
      // 9. Base of Neck
      {
        center: lm.neckBase,
        radiusX: props.neckWidth * 0.75,
        radiusZ: props.neckWidth * 0.75,
      },
    ];

    const torsoMesh = LoftMeshGenerator.generateLoft(torsoSections, {
      name: 'Torso',
      segmentsPerRing: 18,
      capStart: true,
      capEnd: false,
    });
    const torsoWeights = SkinDeformer.computeBoneWeights(torsoMesh.vertices, skeleton);
    parts.push({
      id: 'torso',
      name: 'Torso (Chest & Pelvis)',
      baseMeshData: torsoMesh,
      skinWeights: torsoWeights,
      materialColor: '#f1f5f9',
    });

    // 6. Arms (Left and Right)
    // Left Upper Arm
    parts.push(
      makeLimbLoft(
        'leftUpperArm',
        'Left Upper Arm',
        lm.leftShoulder,
        lm.leftElbow,
        [5.2, 5.0],
        [4.8, 4.6],
        [3.8, 3.8],
        '#e2e8f0'
      )
    );
    // Left Forearm
    parts.push(
      makeLimbLoft(
        'leftForearm',
        'Left Forearm',
        lm.leftElbow,
        lm.leftWrist,
        [3.8, 3.8],
        [3.5, 3.3],
        [2.6, 2.4],
        '#cbd5e1'
      )
    );
    // Left Hand
    parts.push(
      makeLimbLoft(
        'leftHand',
        'Left Hand & Digits',
        lm.leftWrist,
        lm.leftFingertips,
        [2.8, 1.8],
        [3.2, 1.6],
        [1.8, 0.8],
        '#e2e8f0'
      )
    );

    // Right Upper Arm
    parts.push(
      makeLimbLoft(
        'rightUpperArm',
        'Right Upper Arm',
        lm.rightShoulder,
        lm.rightElbow,
        [5.2, 5.0],
        [4.8, 4.6],
        [3.8, 3.8],
        '#e2e8f0'
      )
    );
    // Right Forearm
    parts.push(
      makeLimbLoft(
        'rightForearm',
        'Right Forearm',
        lm.rightElbow,
        lm.rightWrist,
        [3.8, 3.8],
        [3.5, 3.3],
        [2.6, 2.4],
        '#cbd5e1'
      )
    );
    // Right Hand
    parts.push(
      makeLimbLoft(
        'rightHand',
        'Right Hand & Digits',
        lm.rightWrist,
        lm.rightFingertips,
        [2.8, 1.8],
        [3.2, 1.6],
        [1.8, 0.8],
        '#e2e8f0'
      )
    );

    // 7. Legs (Left and Right)
    // Left Thigh
    parts.push(
      makeLimbLoft(
        'leftThigh',
        'Left Thigh',
        lm.leftHip,
        lm.leftKnee,
        [7.5, 7.2],
        [6.4, 6.2],
        [4.8, 4.8],
        '#e2e8f0'
      )
    );
    // Left Lower Leg
    parts.push(
      makeLimbLoft(
        'leftLowerLeg',
        'Left Lower Leg (Calf)',
        lm.leftKnee,
        lm.leftAnkle,
        [4.8, 4.8],
        [5.2, 4.8],
        [3.2, 3.0],
        '#cbd5e1'
      )
    );
    // Left Foot
    const leftFootSec: CrossSection[] = [
      {
        center: lm.leftHeel,
        radiusX: props.footWidth * 0.45,
        radiusZ: props.footHeight * 0.6,
      },
      {
        center: lm.leftAnkle.lerp(lm.leftToe, 0.4),
        radiusX: props.footWidth * 0.5,
        radiusZ: props.footHeight * 0.55,
      },
      {
        center: lm.leftToe,
        radiusX: props.footWidth * 0.35,
        radiusZ: props.footHeight * 0.35,
      },
    ];
    const leftFootMesh = LoftMeshGenerator.generateLoft(leftFootSec, {
      name: 'Left Foot',
      segmentsPerRing: 12,
      capStart: true,
      capEnd: true,
    });
    parts.push({
      id: 'leftFoot',
      name: 'Left Foot',
      baseMeshData: leftFootMesh,
      skinWeights: SkinDeformer.computeBoneWeights(leftFootMesh.vertices, skeleton),
      materialColor: '#94a3b8',
    });

    // Right Thigh
    parts.push(
      makeLimbLoft(
        'rightThigh',
        'Right Thigh',
        lm.rightHip,
        lm.rightKnee,
        [7.5, 7.2],
        [6.4, 6.2],
        [4.8, 4.8],
        '#e2e8f0'
      )
    );
    // Right Lower Leg
    parts.push(
      makeLimbLoft(
        'rightLowerLeg',
        'Right Lower Leg (Calf)',
        lm.rightKnee,
        lm.rightAnkle,
        [4.8, 4.8],
        [5.2, 4.8],
        [3.2, 3.0],
        '#cbd5e1'
      )
    );
    // Right Foot
    const rightFootSec: CrossSection[] = [
      {
        center: lm.rightHeel,
        radiusX: props.footWidth * 0.45,
        radiusZ: props.footHeight * 0.6,
      },
      {
        center: lm.rightAnkle.lerp(lm.rightToe, 0.4),
        radiusX: props.footWidth * 0.5,
        radiusZ: props.footHeight * 0.55,
      },
      {
        center: lm.rightToe,
        radiusX: props.footWidth * 0.35,
        radiusZ: props.footHeight * 0.35,
      },
    ];
    const rightFootMesh = LoftMeshGenerator.generateLoft(rightFootSec, {
      name: 'Right Foot',
      segmentsPerRing: 12,
      capStart: true,
      capEnd: true,
    });
    parts.push({
      id: 'rightFoot',
      name: 'Right Foot',
      baseMeshData: rightFootMesh,
      skinWeights: SkinDeformer.computeBoneWeights(rightFootMesh.vertices, skeleton),
      materialColor: '#94a3b8',
    });

    // 8. Generate Unified Mesh (for Unified-Body Mode)
    let totalVerts: Vec3[] = [];
    let totalTris: Triangle[] = [];
    let totalNormals: Vec3[] = [];
    let totalUvs: [number, number][] = [];
    let unifiedWeights: VertexSkinWeight[] = [];

    let vertexOffset = 0;
    for (const p of parts) {
      for (const v of p.baseMeshData.vertices) {
        totalVerts.push(v);
      }
      for (const n of p.baseMeshData.normals) {
        totalNormals.push(n);
      }
      for (const uv of p.baseMeshData.uvs) {
        totalUvs.push(uv);
      }
      for (const sw of p.skinWeights) {
        unifiedWeights.push(sw);
      }
      for (const tri of p.baseMeshData.triangles) {
        totalTris.push(
          new Triangle(
            tri.i0 + vertexOffset,
            tri.i1 + vertexOffset,
            tri.i2 + vertexOffset
          )
        );
      }
      vertexOffset += p.baseMeshData.vertices.length;
    }

    const unifiedBaseMesh = new MeshData('UnifiedHumanoid', totalVerts, totalTris, totalNormals, totalUvs);

    return {
      proportions: props,
      landmarks: lm,
      skeleton,
      parts,
      unifiedMesh: {
        baseMeshData: unifiedBaseMesh,
        skinWeights: unifiedWeights,
      },
    };
  }
}
