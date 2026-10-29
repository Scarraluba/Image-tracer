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
   * Generates a detailed mathematical procedural humanoid body with rich anatomical shaping.
   */
  static generateBody(
    props: BodyProportionsConfig,
    rootOffset: Vec3 = Vec3.ZERO
  ): CharacterBodyData {
    // 1. Generate Anatomical Landmarks with respect to neckLength and height
    const lm = AnatomicalLandmarks.generate(props, rootOffset);

    // 2. Build Skeleton
    const skeleton = new Skeleton(lm);

    const parts: BodyPartMesh[] = [];

    // Height and limb thickness scale factor relative to 180u standard
    const hScale = Math.max(0.05, props.totalHeight / 180.0);
    const armScale = Math.max(0.1, (props.armLength / 31.0) * hScale);
    const legScale = Math.max(0.1, (props.thighLength / 43.0) * hScale);

    // Multi-section anatomical loft builder
    const makeAnatomicalLoft = (
      id: string,
      name: string,
      sections: CrossSection[],
      segments: number = 14,
      color: string = '#e2e8f0'
    ): BodyPartMesh => {
      const meshData = LoftMeshGenerator.generateLoft(sections, {
        name,
        segmentsPerRing: segments,
        capStart: true,
        capEnd: true,
      });
      const skinWeights = SkinDeformer.computeBoneWeights(meshData.vertices, skeleton);
      return { id, name, baseMeshData: meshData, skinWeights, materialColor: color };
    };

    // 3. Head & Skull (Anatomical Ellipsoid with jaw taper, cheekbones, nose bridge, and brow prominence)
    const skullRx = props.headWidth * 0.5;
    const skullRy = props.headHeight * 0.5;
    const skullRz = props.headDepth * 0.5;

    const baseSkull = SphereGenerator.generateEllipsoid({
      name: 'Skull',
      rx: skullRx,
      ry: skullRy,
      rz: skullRz,
      latDivisions: 20,
      lonDivisions: 28,
    });

    const skullVertices = baseSkull.vertices.map((v) => {
      const yNorm = (v.y + skullRy) / (skullRy * 2); // 0 at chin, 1 at crown
      let shapeX = v.x;
      let shapeY = v.y;
      let shapeZ = v.z;

      // Jaw taper & chin projection
      if (yNorm < 0.38) {
        const t = yNorm / 0.38;
        const taper = 0.68 + 0.32 * t;
        shapeX *= taper;
        // Chin prominence
        if (v.z > 0 && yNorm < 0.26) {
          shapeZ += (1 - yNorm / 0.26) * (skullRz * 0.14);
        }
      }

      // Cheekbone prominence around mid-face
      if (yNorm >= 0.38 && yNorm <= 0.62) {
        const cheekFactor = Math.sin(((yNorm - 0.38) / 0.24) * Math.PI);
        if (v.z > 0) {
          shapeX *= (1 + cheekFactor * 0.08);
          shapeZ += cheekFactor * (skullRz * 0.06);
        }
      }

      // Nose bridge and brow ridge projection
      if (v.z > 0 && Math.abs(v.x) < skullRx * 0.35) {
        // Nose bridge
        if (yNorm >= 0.33 && yNorm <= 0.54) {
          const noseT = Math.sin(((yNorm - 0.33) / 0.21) * Math.PI);
          const lateralFalloff = 1 - Math.abs(v.x) / (skullRx * 0.35);
          shapeZ += noseT * lateralFalloff * (skullRz * 0.16);
        }
        // Brow ridge
        if (yNorm >= 0.54 && yNorm <= 0.68) {
          const browT = Math.sin(((yNorm - 0.54) / 0.14) * Math.PI);
          shapeZ += browT * (skullRz * 0.08);
        }
      }

      return new Vec3(shapeX + lm.headCenter.x, shapeY + lm.headCenter.y, shapeZ + lm.headCenter.z);
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

    // 4. Neck (Loft driven by neckLength & neckWidth with trapezius flare and throat curvature)
    const neckBaseToHead = lm.headCenter.sub(lm.neckBase);
    const neckDir = neckBaseToHead.normalize();
    const neckLen = Math.max(3.5, props.neckLength);

    const neckSections: CrossSection[] = [
      // Base at torso (trapezius flare)
      {
        center: lm.neckBase,
        radiusX: props.neckWidth * 0.72,
        radiusZ: props.neckWidth * 0.70,
        normal: neckDir,
      },
      // Lower neck (sternocleidomastoid taper)
      {
        center: lm.neckBase.add(neckDir.scale(neckLen * 0.32)),
        radiusX: props.neckWidth * 0.52,
        radiusZ: props.neckWidth * 0.56,
        normal: neckDir,
      },
      // Mid neck (throat / larynx contour)
      {
        center: lm.neckBase.add(neckDir.scale(neckLen * 0.68)),
        radiusX: props.neckWidth * 0.48,
        radiusZ: props.neckWidth * 0.54,
        normal: neckDir,
      },
      // Upper neck (submandibular / skull base insertion)
      {
        center: lm.neckBase.add(neckDir.scale(neckLen * 0.96)),
        radiusX: props.neckWidth * 0.56,
        radiusZ: props.neckWidth * 0.58,
        normal: neckDir,
      },
    ];

    const neckMesh = LoftMeshGenerator.generateLoft(neckSections, {
      name: 'Neck',
      segmentsPerRing: 16,
      capStart: true,
      capEnd: true,
    });
    const neckWeights = SkinDeformer.computeBoneWeights(neckMesh.vertices, skeleton);
    parts.push({
      id: 'neck',
      name: 'Neck',
      baseMeshData: neckMesh,
      skinWeights: neckWeights,
      materialColor: '#f8fafc',
    });

    // 5. Torso (9 Cross-Sections with anatomical waist tuck, rib flare, and pelvic crest)
    const yTorsoBottom = lm.pelvisCenter.y;
    const yTorsoTop = lm.neckBase.y;
    const torsoH = Math.max(10, yTorsoTop - yTorsoBottom);

    const torsoSections: CrossSection[] = [
      // 1. Pelvis Base / Perineum
      {
        center: new Vec3(rootOffset.x, yTorsoBottom, rootOffset.z),
        radiusX: props.pelvisWidth * 0.46,
        radiusZ: props.pelvisDepth * 0.44,
      },
      // 2. Lower Pelvis & Gluteal flare
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.12, rootOffset.z),
        radiusX: props.pelvisWidth * 0.51,
        radiusZ: props.pelvisDepth * 0.50,
      },
      // 3. Iliac Crest / Lower Abdomen
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.25, rootOffset.z),
        radiusX: props.waistWidth * 0.49,
        radiusZ: props.waistDepth * 0.46,
      },
      // 4. Waist (Narrowest Midline Tuck)
      {
        center: new Vec3(rootOffset.x, lm.waistCenter.y, rootOffset.z),
        radiusX: props.waistWidth * 0.44,
        radiusZ: props.waistDepth * 0.41,
      },
      // 5. Lower Rib Cage (Infrasternal angle expansion)
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.55, rootOffset.z),
        radiusX: props.chestWidth * 0.46,
        radiusZ: props.chestDepth * 0.45,
      },
      // 6. Mid-Chest / Pectoral Girth
      {
        center: new Vec3(rootOffset.x, lm.chestCenter.y, rootOffset.z),
        radiusX: props.chestWidth * 0.50,
        radiusZ: props.chestDepth * 0.50,
      },
      // 7. Upper Chest / Pectoralis shelf
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.82, rootOffset.z),
        radiusX: props.chestWidth * 0.51,
        radiusZ: props.chestDepth * 0.47,
      },
      // 8. Clavicle / Shoulder Girdle
      {
        center: new Vec3(rootOffset.x, yTorsoBottom + torsoH * 0.94, rootOffset.z),
        radiusX: props.shoulderWidth * 0.46,
        radiusZ: props.chestDepth * 0.43,
      },
      // 9. Base of Neck / Cervical junction
      {
        center: lm.neckBase,
        radiusX: props.neckWidth * 0.74,
        radiusZ: props.neckWidth * 0.72,
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

    // 6. Arms (Deltoid, Biceps, Forearm Brachioradialis, Wrist, Hand)
    const buildArmPart = (
      id: string,
      name: string,
      start: Vec3,
      end: Vec3,
      radiiRings: [number, [number, number]][], // [fraction, [rx, rz]]
      color: string
    ) => {
      const delta = end.sub(start);
      const normal = delta.normalize();
      const sections: CrossSection[] = radiiRings.map(([frac, r]) => ({
        center: start.add(delta.scale(frac)),
        radiusX: r[0] * armScale,
        radiusZ: r[1] * armScale,
        normal,
      }));
      return makeAnatomicalLoft(id, name, sections, 14, color);
    };

    // Upper Arm (Deltoid cap -> Biceps peak -> Triceps -> Elbow joint)
    const upperArmRings: [number, [number, number]][] = [
      [0.0, [5.3, 5.1]], // Deltoid head
      [0.35, [5.0, 4.8]], // Biceps / Triceps muscle belly
      [0.72, [4.3, 4.1]], // Lower arm taper
      [1.0, [3.8, 3.7]], // Elbow condyles
    ];

    // Forearm (Radial head -> Brachioradialis belly -> Wrist)
    const forearmRings: [number, [number, number]][] = [
      [0.0, [3.8, 3.7]], // Elbow joint
      [0.30, [3.7, 3.4]], // Upper forearm muscle bulk
      [0.68, [2.9, 2.7]], // Taper
      [1.0, [2.5, 2.3]], // Wrist joint
    ];

    // Hand (Carpal base -> Metacarpal palm -> Digit taper)
    const handRings: [number, [number, number]][] = [
      [0.0, [2.6, 1.8]],
      [0.45, [3.2, 1.6]],
      [1.0, [1.6, 0.8]],
    ];

    parts.push(buildArmPart('leftUpperArm', 'Left Upper Arm', lm.leftShoulder, lm.leftElbow, upperArmRings, '#e2e8f0'));
    parts.push(buildArmPart('leftForearm', 'Left Forearm', lm.leftElbow, lm.leftWrist, forearmRings, '#cbd5e1'));
    parts.push(buildArmPart('leftHand', 'Left Hand & Digits', lm.leftWrist, lm.leftFingertips, handRings, '#e2e8f0'));

    parts.push(buildArmPart('rightUpperArm', 'Right Upper Arm', lm.rightShoulder, lm.rightElbow, upperArmRings, '#e2e8f0'));
    parts.push(buildArmPart('rightForearm', 'Right Forearm', lm.rightElbow, lm.rightWrist, forearmRings, '#cbd5e1'));
    parts.push(buildArmPart('rightHand', 'Right Hand & Digits', lm.rightWrist, lm.rightFingertips, handRings, '#e2e8f0'));

    // 7. Legs (Thigh Quadriceps, Knee, Calf Gastrocnemius, Ankle, Foot)
    const buildLegPart = (
      id: string,
      name: string,
      start: Vec3,
      end: Vec3,
      radiiRings: [number, [number, number]][],
      color: string
    ) => {
      const delta = end.sub(start);
      const normal = delta.normalize();
      const sections: CrossSection[] = radiiRings.map(([frac, r]) => ({
        center: start.add(delta.scale(frac)),
        radiusX: r[0] * legScale,
        radiusZ: r[1] * legScale,
        normal,
      }));
      return makeAnatomicalLoft(id, name, sections, 16, color);
    };

    // Thigh (Femoral neck -> Quadriceps belly -> Suprapatellar taper -> Knee)
    const thighRings: [number, [number, number]][] = [
      [0.0, [7.8, 7.5]], // Hip insertion
      [0.32, [7.1, 6.9]], // Upper quad / hamstring bulk
      [0.65, [6.0, 5.8]], // Mid-thigh
      [0.90, [5.1, 5.0]], // Suprapatellar notch
      [1.0, [4.8, 4.8]], // Knee joint
    ];

    // Lower Leg (Tibial condyle -> Gastrocnemius calf bulge -> Achilles tendon -> Ankle)
    const lowerLegRings: [number, [number, number]][] = [
      [0.0, [4.8, 4.8]], // Knee cap / tibial plateau
      [0.28, [5.4, 5.0]], // Gastrocnemius calf bulge
      [0.60, [4.4, 4.1]], // Mid calf taper
      [0.85, [3.4, 3.2]], // Achilles tendon
      [1.0, [3.2, 3.0]], // Ankle malleolus
    ];

    parts.push(buildLegPart('leftThigh', 'Left Thigh', lm.leftHip, lm.leftKnee, thighRings, '#e2e8f0'));
    parts.push(buildLegPart('leftLowerLeg', 'Left Lower Leg (Calf)', lm.leftKnee, lm.leftAnkle, lowerLegRings, '#cbd5e1'));

    parts.push(buildLegPart('rightThigh', 'Right Thigh', lm.rightHip, lm.rightKnee, thighRings, '#e2e8f0'));
    parts.push(buildLegPart('rightLowerLeg', 'Right Lower Leg (Calf)', lm.rightKnee, lm.rightAnkle, lowerLegRings, '#cbd5e1'));

    // Feet (Calcaneus Heel -> Arch -> Metatarsal Ball -> Toe Box)
    const buildFootPart = (id: string, name: string, heel: Vec3, ankle: Vec3, toe: Vec3) => {
      const footSec: CrossSection[] = [
        {
          center: heel,
          radiusX: props.footWidth * 0.46 * hScale,
          radiusZ: props.footHeight * 0.62 * hScale,
        },
        {
          center: heel.lerp(toe, 0.35),
          radiusX: props.footWidth * 0.49 * hScale,
          radiusZ: props.footHeight * 0.58 * hScale,
        },
        {
          center: heel.lerp(toe, 0.70),
          radiusX: props.footWidth * 0.52 * hScale,
          radiusZ: props.footHeight * 0.45 * hScale,
        },
        {
          center: toe,
          radiusX: props.footWidth * 0.36 * hScale,
          radiusZ: props.footHeight * 0.32 * hScale,
        },
      ];
      const footMesh = LoftMeshGenerator.generateLoft(footSec, {
        name,
        segmentsPerRing: 14,
        capStart: true,
        capEnd: true,
      });
      return {
        id,
        name,
        baseMeshData: footMesh,
        skinWeights: SkinDeformer.computeBoneWeights(footMesh.vertices, skeleton),
        materialColor: '#94a3b8',
      };
    };

    parts.push(buildFootPart('leftFoot', 'Left Foot', lm.leftHeel, lm.leftAnkle, lm.leftToe));
    parts.push(buildFootPart('rightFoot', 'Right Foot', lm.rightHeel, lm.rightAnkle, lm.rightToe));

    // 8. Generate Unified Continuous Mesh
    const totalVerts: Vec3[] = [];
    const totalTris: Triangle[] = [];
    const totalNormals: Vec3[] = [];
    const totalUvs: [number, number][] = [];
    const unifiedWeights: VertexSkinWeight[] = [];

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
