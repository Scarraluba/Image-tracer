/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { Skeleton, BoneJoint } from './Skeleton';

export interface VertexSkinWeight {
  boneIds: string[];
  weights: number[];
}

export class SkinDeformer {
  /**
   * Automatic proximity-based bone weighting adhering to Section 11:
   * For bone endpoints A and B:
   * AB = B - A
   * t = clamp(((p - A) · AB) / (AB · AB), 0, 1)
   * Q = A + t·AB
   * d = |p - Q|
   */
  static computeBoneWeights(
    vertices: readonly Vec3[],
    skeleton: Skeleton,
    maxInfluences: number = 4
  ): VertexSkinWeight[] {
    const skinWeights: VertexSkinWeight[] = [];

    // Extract bone segments from parent-child joint pairs
    const boneSegments: { id: string; a: Vec3; b: Vec3; radiusInfluence: number }[] = [];

    for (const joint of skeleton.joints.values()) {
      if (joint.parentId) {
        const parent = skeleton.getJoint(joint.parentId)!;
        boneSegments.push({
          id: joint.id,
          a: parent.bindPosition,
          b: joint.bindPosition,
          radiusInfluence: 25.0,
        });
      } else {
        // Root joint point influence
        boneSegments.push({
          id: joint.id,
          a: joint.bindPosition,
          b: joint.bindPosition.add(new Vec3(0, 5, 0)),
          radiusInfluence: 25.0,
        });
      }
    }

    for (const p of vertices) {
      const candidates: { boneId: string; weight: number }[] = [];

      for (const seg of boneSegments) {
        const ab = seg.b.sub(seg.a);
        const abLenSq = ab.magnitudeSq();

        let t = 0;
        if (abLenSq > 1e-6) {
          t = Math.max(0, Math.min(1, p.sub(seg.a).dot(ab) / abLenSq));
        }

        const q = seg.a.add(ab.scale(t));
        const dist = p.sub(q).magnitude();

        // Smooth gaussian / inverse distance falloff
        const w = 1.0 / Math.pow(dist + 2.0, 2.5);
        candidates.push({ boneId: seg.id, weight: w });
      }

      // Sort by highest weight and take top `maxInfluences`
      candidates.sort((a, b) => b.weight - a.weight);
      const top = candidates.slice(0, maxInfluences);

      // Normalize weights so sum w_i = 1.0
      let sum = 0;
      for (const c of top) sum += c.weight;

      const boneIds: string[] = [];
      const weights: number[] = [];

      if (sum > 1e-9) {
        for (const c of top) {
          boneIds.push(c.boneId);
          weights.push(c.weight / sum);
        }
      } else {
        // Fallback: assign to pelvis
        boneIds.push('pelvis');
        weights.push(1.0);
      }

      skinWeights.push({ boneIds, weights });
    }

    return skinWeights;
  }

  /**
   * Linear Blend Skinning deformation:
   * p' = Σ w_i · M_i · B_i · p
   */
  static deformVertices(
    baseVertices: readonly Vec3[],
    skinWeights: readonly VertexSkinWeight[],
    skeleton: Skeleton
  ): Vec3[] {
    const deformed: Vec3[] = new Array(baseVertices.length);

    for (let i = 0; i < baseVertices.length; i++) {
      const p = baseVertices[i];
      const sw = skinWeights[i];

      let accX = 0;
      let accY = 0;
      let accZ = 0;

      for (let k = 0; k < sw.boneIds.length; k++) {
        const boneId = sw.boneIds[k];
        const w = sw.weights[k];
        if (w <= 0.0001) continue;

        const joint = skeleton.getJoint(boneId);
        if (!joint) continue;

        // Transform original bind position by bone's skinning matrix: S_i * p
        const pTransformed = joint.skinningMatrix.transformPoint(p);
        accX += pTransformed.x * w;
        accY += pTransformed.y * w;
        accZ += pTransformed.z * w;
      }

      deformed[i] = new Vec3(accX, accY, accZ);
    }

    return deformed;
  }
}
