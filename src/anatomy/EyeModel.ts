/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';

export interface ComponentVisibility {
  sclera: boolean;
  iris: boolean;
  pupil: boolean;
  cornea: boolean;
  gazeRay: boolean;
}

export interface EyeAnatomyConfig {
  id: string;
  name: string;
  // Position
  center: Vec3;
  // Orientation angles in degrees (converted to radians for math)
  yawDeg: number;   // Horizontal rotation (ψ) about Y
  pitchDeg: number; // Vertical rotation (α) about X
  rollDeg: number;  // Torsion (φ) about Z
  // Sclera parameters
  eyeballRadiusX: number;
  eyeballRadiusY: number;
  eyeballRadiusZ: number;
  latDivisions: number;
  lonDivisions: number;
  // Iris parameters
  irisRadius: number;
  irisColor: string;
  // Pupil parameters
  pupilRadius: number;
  // Cornea parameters
  corneaEnabled: boolean;
  corneaBaseRadius: number;
  corneaBulgeHeight: number;
  corneaOpacity: number;
  // Gaze ray parameters
  rayLength: number;
  rayVisible: boolean;
  rayColor: string;
  // Visibility
  visibility: ComponentVisibility;
}

export const DEFAULT_EYE_CONFIG: EyeAnatomyConfig = {
  id: 'eye_primary',
  name: 'Primary Eyeball',
  center: new Vec3(0, 0, 0),
  yawDeg: 0,
  pitchDeg: 0,
  rollDeg: 0,
  eyeballRadiusX: 12.0,
  eyeballRadiusY: 12.0,
  eyeballRadiusZ: 12.0,
  latDivisions: 20,
  lonDivisions: 32,
  irisRadius: 4.0,
  irisColor: '#1e40af', // Deep cerulean / anatomical iris blue
  pupilRadius: 1.5,
  corneaEnabled: true,
  corneaBaseRadius: 5.2,
  corneaBulgeHeight: 2.2,
  corneaOpacity: 0.35,
  rayLength: 40.0,
  rayVisible: true,
  rayColor: '#22c55e', // Emerald green laser gaze ray
  visibility: {
    sclera: true,
    iris: true,
    pupil: true,
    cornea: true,
    gazeRay: true,
  },
};
