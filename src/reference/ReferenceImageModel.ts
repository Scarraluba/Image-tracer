/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TargetCouplingMode = 'direct' | 'opposite-scale' | 'opposite-depth';

export interface ReferenceImageConfig {
  id: string;
  name: string;
  url: string;
  visible: boolean;
  widthPx: number;
  heightPx: number;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatioLocked: boolean;
  opacity: number; // 0.0 to 1.0
  offsetX: number; // in px for 2D screen overlay
  offsetY: number; // in px for 2D screen overlay
  is2D: boolean;   // false = 3D World Space (Fixed position in world), true = 2D Screen Overlay
  worldPosition: { x: number; y: number; z: number }; // 3D World space coordinates
  worldHeight: number; // 3D World height units (can scale anywhere from 5 to 5000)
  displayMode: 'viewport-overlay' | 'side-panel' | 'split-view';

  // Coordination & Opposite Target Board Coupling options
  targetCouplingMode?: TargetCouplingMode;
  oppositeScaleFactor?: number; // e.g. 1.0 to 5.0
  invertCoordX?: boolean;       // match camera vs character POV
  invertCoordY?: boolean;
  cloudinaryUrl?: string;       // uploaded to Cloudinary
  imageHash?: string;           // sha-256 for offline cache matching
}

export const MAX_REFERENCE_WIDTH_PX = 4416;
export const MAX_REFERENCE_HEIGHT_PX = 3336;

export const SAMPLE_REFERENCE_IMAGES: { name: string; url: string; description: string }[] = [
  {
    name: 'Anatomical Proportion Chart',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="%230f172a"/><line x1="400" y1="0" x2="400" y2="1000" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="6,6"/><line x1="50" y1="100" x2="750" y2="100" stroke="%2338bdf8" stroke-width="1"/><text x="60" y="90" fill="%2394a3b8" font-family="monospace" font-size="16">Crown: 180u</text><line x1="50" y1="215" x2="750" y2="215" stroke="%2338bdf8" stroke-width="1"/><text x="60" y="205" fill="%2394a3b8" font-family="monospace" font-size="16">Eyes / Chin: 162u</text><line x1="50" y1="310" x2="750" y2="310" stroke="%2338bdf8" stroke-width="1"/><text x="60" y="300" fill="%2394a3b8" font-family="monospace" font-size="16">Shoulders: 142u</text><line x1="50" y1="570" x2="750" y2="570" stroke="%2338bdf8" stroke-width="1"/><text x="60" y="560" fill="%2394a3b8" font-family="monospace" font-size="16">Hips / Pelvis: 94u</text><line x1="50" y1="790" x2="750" y2="790" stroke="%2338bdf8" stroke-width="1"/><text x="60" y="780" fill="%2394a3b8" font-family="monospace" font-size="16">Knees: 49u</text><line x1="50" y1="970" x2="750" y2="970" stroke="%2322c55e" stroke-width="2"/><text x="60" y="960" fill="%2322c55e" font-family="monospace" font-size="16">Ground: 0u</text><ellipse cx="400" cy="160" rx="60" ry="75" fill="none" stroke="%2338bdf8" stroke-width="3"/><ellipse cx="375" cy="155" rx="14" ry="14" fill="none" stroke="%2322c55e" stroke-width="2"/><ellipse cx="425" cy="155" rx="14" ry="14" fill="none" stroke="%2306b6d4" stroke-width="2"/><path d="M 400 230 L 400 570 M 310 310 L 490 310 M 345 570 L 455 570 M 345 570 L 345 790 L 345 970 M 455 570 L 455 790 L 455 970 M 310 310 L 270 480 L 245 610 M 490 310 L 530 480 L 555 610" stroke="%2394a3b8" stroke-width="3" fill="none"/></svg>',
    description: 'Mathematical 8-head anatomical proportion chart with height divisions',
  },
  {
    name: 'Eye & Facial Orbit Guide',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="%230b1120"/><circle cx="300" cy="300" r="240" fill="none" stroke="%2338bdf8" stroke-width="2"/><line x1="300" y1="20" x2="300" y2="580" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="4,4"/><line x1="20" y1="300" x2="580" y2="300" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="4,4"/><ellipse cx="210" cy="285" rx="55" ry="32" fill="none" stroke="%2322c55e" stroke-width="2"/><circle cx="210" cy="285" r="18" fill="%231e40af" stroke="%2360a5fa" stroke-width="2"/><circle cx="210" cy="285" r="7" fill="%23050505"/><ellipse cx="390" cy="285" rx="55" ry="32" fill="none" stroke="%2306b6d4" stroke-width="2"/><circle cx="390" cy="285" r="18" fill="%231e40af" stroke="%2360a5fa" stroke-width="2"/><circle cx="390" cy="285" r="7" fill="%23050505"/><path d="M 285 300 Q 300 370 280 400 L 320 400 Q 300 370 315 300" fill="none" stroke="%23f59e0b" stroke-width="2"/><path d="M 250 460 Q 300 480 350 460" fill="none" stroke="%23f43f5e" stroke-width="2"/><text x="40" y="560" fill="%2394a3b8" font-family="monospace" font-size="15">FACIAL ORBIT &amp; INTERPUPILLARY GRID</text></svg>',
    description: 'Close-up facial orbit and interpupillary distance alignment guide',
  },
];

export const DEFAULT_REFERENCE_IMAGE: ReferenceImageConfig = {
  id: 'ref_default',
  name: 'Anatomical Proportion Chart',
  url: SAMPLE_REFERENCE_IMAGES[0].url,
  visible: false,
  widthPx: 1200,
  heightPx: 1500,
  nativeWidth: 800,
  nativeHeight: 1000,
  aspectRatioLocked: true,
  opacity: 0.65,
  offsetX: 0,
  offsetY: 0,
  is2D: false, // Default to 3D World plane
  worldPosition: { x: 0, y: 90, z: -15 },
  worldHeight: 180,
  displayMode: 'viewport-overlay',
  targetCouplingMode: 'direct',
  oppositeScaleFactor: 1.0,
  invertCoordX: false,
  invertCoordY: false,
};
