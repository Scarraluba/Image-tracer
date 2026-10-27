/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from './Vec3';

export interface RaySphereIntersection {
  hit: boolean;
  tNear?: number;
  tFar?: number;
  pointNear?: Vec3;
  pointFar?: Vec3;
}

export interface RayPlaneIntersection {
  hit: boolean;
  t?: number;
  point?: Vec3;
  angleDeg?: number;
}

/**
 * Mathematical Ray: R(t) = origin + t * direction, for t >= 0.
 * Direction is guaranteed to be normalized.
 */
export class Ray3 {
  readonly origin: Vec3;
  readonly direction: Vec3;

  constructor(origin: Vec3 = Vec3.ZERO, direction: Vec3 = Vec3.FORWARD) {
    this.origin = origin;
    this.direction = direction.normalize();
  }

  /** Evaluate point on ray at non-negative parameter t */
  pointAt(t: number): Vec3 {
    return this.origin.add(this.direction.scale(Math.max(0, t)));
  }

  /**
   * Analytic Ray-Sphere Intersection
   * Solves |(O + tD) - C|^2 = R^2
   */
  intersectSphere(center: Vec3, radius: number): RaySphereIntersection {
    const oc = this.origin.sub(center);
    const b = oc.dot(this.direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - c;

    if (discriminant < 0) {
      return { hit: false };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t0 = -b - sqrtDisc;
    const t1 = -b + sqrtDisc;

    if (t1 < 0) {
      // Both intersection points are behind the ray origin
      return { hit: false };
    }

    const tNear = t0 >= 0 ? t0 : t1;
    const tFar = t1;

    return {
      hit: true,
      tNear,
      tFar,
      pointNear: this.pointAt(tNear),
      pointFar: this.pointAt(tFar),
    };
  }

  /**
   * Analytic Ray-Plane Intersection
   * Plane defined by a point on plane P and surface normal N:
   * (R(t) - P) . N = 0 => (O + tD - P) . N = 0 => t = ((P - O) . N) / (D . N)
   */
  intersectPlane(planePoint: Vec3, planeNormal: Vec3): RayPlaneIntersection {
    const normal = planeNormal.normalize();
    const denom = this.direction.dot(normal);

    // Parallel or nearly parallel
    if (Math.abs(denom) < 1e-7) {
      return { hit: false };
    }

    const t = planePoint.sub(this.origin).dot(normal) / denom;

    if (t < 0) {
      // Plane is behind the ray origin
      return { hit: false };
    }

    const point = this.pointAt(t);
    // Angle between ray and plane: 90 - angle between direction and normal
    const cosAngle = Math.abs(denom);
    const angleDeg = Math.asin(Math.min(1, Math.max(-1, cosAngle))) * (180 / Math.PI);

    return {
      hit: true,
      t,
      point,
      angleDeg,
    };
  }
}
