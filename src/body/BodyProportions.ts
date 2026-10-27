/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BodyProportionsConfig {
  totalHeight: number;
  headHeight: number;
  headWidth: number;
  headDepth: number;
  neckLength: number;
  neckWidth: number;
  shoulderWidth: number;
  chestWidth: number;
  chestDepth: number;
  waistWidth: number;
  waistDepth: number;
  pelvisWidth: number;
  pelvisDepth: number;
  armLength: number;       // Upper arm
  forearmLength: number;   // Forearm
  handLength: number;
  thighLength: number;
  lowerLegLength: number;
  footLength: number;
  footWidth: number;
  footHeight: number;
}

export const DEFAULT_PROPORTIONS: BodyProportionsConfig = {
  totalHeight: 180,
  headHeight: 23,
  headWidth: 16,
  headDepth: 19,
  neckLength: 10,
  neckWidth: 7.5,
  shoulderWidth: 42,
  chestWidth: 32,
  chestDepth: 20,
  waistWidth: 24,
  waistDepth: 17,
  pelvisWidth: 30,
  pelvisDepth: 20,
  armLength: 31,
  forearmLength: 26,
  handLength: 18,
  thighLength: 43,
  lowerLegLength: 43,
  footLength: 26,
  footWidth: 10,
  footHeight: 6,
};

export const PROPORTION_PRESETS: Record<string, BodyProportionsConfig> = {
  'Standard Adult (180u)': { ...DEFAULT_PROPORTIONS },
  'Heroic / Athletic (195u)': {
    ...DEFAULT_PROPORTIONS,
    totalHeight: 195,
    shoulderWidth: 48,
    chestWidth: 36,
    waistWidth: 23,
    armLength: 33,
    forearmLength: 28,
  },
  'Slender / Tall (210u)': {
    ...DEFAULT_PROPORTIONS,
    totalHeight: 210,
    shoulderWidth: 38,
    chestWidth: 28,
    waistWidth: 21,
    pelvisWidth: 27,
    thighLength: 49,
    lowerLegLength: 49,
  },
  'Stocky / Heavy (165u)': {
    ...DEFAULT_PROPORTIONS,
    totalHeight: 165,
    headWidth: 18,
    shoulderWidth: 46,
    chestWidth: 38,
    chestDepth: 25,
    waistWidth: 32,
    waistDepth: 24,
    pelvisWidth: 36,
  },
  'Miniature / Wide Shot (45u)': {
    totalHeight: 45,
    headHeight: 5.75,
    headWidth: 4.0,
    headDepth: 4.75,
    neckLength: 2.5,
    neckWidth: 1.88,
    shoulderWidth: 10.5,
    chestWidth: 8.0,
    chestDepth: 5.0,
    waistWidth: 6.0,
    waistDepth: 4.25,
    pelvisWidth: 7.5,
    pelvisDepth: 5.0,
    armLength: 7.75,
    forearmLength: 6.5,
    handLength: 4.5,
    thighLength: 10.75,
    lowerLegLength: 10.75,
    footLength: 6.5,
    footWidth: 2.5,
    footHeight: 1.5,
  },
  'Monumental / Close-up (540u)': {
    totalHeight: 540,
    headHeight: 69,
    headWidth: 48,
    headDepth: 57,
    neckLength: 30,
    neckWidth: 22.5,
    shoulderWidth: 126,
    chestWidth: 96,
    chestDepth: 60,
    waistWidth: 72,
    waistDepth: 51,
    pelvisWidth: 90,
    pelvisDepth: 60,
    armLength: 93,
    forearmLength: 78,
    handLength: 54,
    thighLength: 129,
    lowerLegLength: 129,
    footLength: 78,
    footWidth: 30,
    footHeight: 18,
  },
};

export class BodyProportions {
  static validate(props: BodyProportionsConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Ensure all dimensions are strictly positive and finite
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
        errors.push(`Proportion '${key}' must be positive and finite (got ${value}).`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Rescales proportions uniformly by a scaling factor without arbitrary bounds
   */
  static scale(props: BodyProportionsConfig, newTotalHeight: number): BodyProportionsConfig {
    const clampedHeight = Math.max(5, Number.isFinite(newTotalHeight) ? newTotalHeight : 180);
    const factor = clampedHeight / (props.totalHeight || 180);
    const scaled: BodyProportionsConfig = { ...props, totalHeight: Math.round(clampedHeight * 10) / 10 };

    for (const key of Object.keys(props) as (keyof BodyProportionsConfig)[]) {
      if (key !== 'totalHeight') {
        scaled[key] = Math.round(props[key] * factor * 100) / 100;
      }
    }

    return scaled;
  }
}
