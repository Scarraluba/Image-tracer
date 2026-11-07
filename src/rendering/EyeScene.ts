/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterModel, CharacterGazeData, TargetAreaSpecs } from '../body/CharacterModel';
import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { ThreeAdapter } from './ThreeAdapter';
import { SphereGenerator } from '../geometry/SphereGenerator';
import { DiscGenerator } from '../geometry/DiscGenerator';
import { CorneaGenerator } from '../geometry/CorneaGenerator';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { SoccerBallGenerator } from '../geometry/SoccerBallGenerator';

export interface ViewportSettings {
  showAxes: boolean;
  showGrid: boolean;
  showTargetPlane: boolean;
  wireframe: boolean;
  targetPlaneZ: number;
  showSoccerBall: boolean;
  soccerBallRadius?: number;
  showEyeWireframe?: boolean;
  showEyeOutlines?: boolean;
  showEyeOutlineOnly?: boolean; // When true, eyes are rendered as outlines only (solid is hidden / see-through)
  eyeSolidOpacity?: number; // 0.0 (fully transparent/hollow) to 1.0 (fully solid)
  performanceMode?: boolean; // 1-Click High-FPS / Low-Spec GPU optimization mode (1GB VRAM & 3.2GHz CPU friendly)
  targetFps?: number; // 30, 60
  showTranslateArrows?: boolean; // Togglable visibility for on-screen Up/Down/Left/Right translate arrows widget
}

export interface EyeRenderNodes {
  group: THREE.Group;
  scleraMesh: THREE.Mesh;
  irisMesh: THREE.Mesh;
  pupilMesh: THREE.Mesh;
  pupilGroup: THREE.Group;
  wireframeLines: (THREE.LineSegments | THREE.LineLoop | THREE.Line)[];
  outlineLines: (THREE.LineSegments | THREE.LineLoop | THREE.Line)[];
}

export interface SceneGazeAverage {
  centerPoint: Vec3;
  targetPlaneHitAverage?: {
    worldX: number;
    worldY: number;
    worldZ: number;
    pixelX: number;
    pixelY: number;
  };
  rayCount: number;
  characterCount: number;
}

export class EyeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animFrameId: number = 0;
  private isDisposed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Viewport elements
  private axesGroup: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private targetPlaneGroup: THREE.Group;
  private targetPlaneHitDots: { left: THREE.Mesh; right: THREE.Mesh };
  private targetPlaneMesh?: THREE.Mesh;
  private targetPlaneCanvas?: HTMLCanvasElement;
  private targetPlaneTexture?: THREE.CanvasTexture;
  private lastTargetPlaneState?: string;

  // 3D Reference Image Plane (Fixed in world space)
  private currentRefConfig?: ReferenceImageConfig;
  private refImageGroup?: THREE.Group;
  private refImageMesh?: THREE.Mesh;
  private refImageWireframe?: THREE.LineSegments;
  private currentRefUrl?: string;

  // Character Three.js nodes mapping: characterId -> CharacterRenderNodes
  private characterNodes: Map<
    string,
    {
      group: THREE.Group;
      skeletonGroup: THREE.Group;
      gazeGroup: THREE.Group;
      partMeshes: Map<string, THREE.Mesh>;
      unifiedMesh?: THREE.Mesh;
      jointSpheres: Map<string, THREE.Mesh>;
      boneLines?: THREE.LineSegments;
      bonePositionsArray?: Float32Array;
      leftEyeGroup: THREE.Group;
      rightEyeGroup: THREE.Group;
      leftEye: EyeRenderNodes;
      rightEye: EyeRenderNodes;
      leftGazeCylinder?: THREE.Mesh;
      leftGazeCone?: THREE.Mesh;
      rightGazeCylinder?: THREE.Mesh;
      rightGazeCone?: THREE.Mesh;
      lastKinematicsVersion?: number;
    }
  > = new Map();

  // 3D Soccer Ball at Multi-Character Gaze Averaged Center Point
  private soccerBallGroup?: THREE.Group;
  private latestGazeAverage?: SceneGazeAverage;

  private characters: CharacterModel[] = [];
  private activeCharacterId: string = '';
  private currentSettings: ViewportSettings;
  private onCameraChange?: (camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => void;
  private onGazeEvaluated?: (data: CharacterGazeData, averageGaze?: SceneGazeAverage) => void;
  private onFpsUpdate?: (fps: number) => void;

  // Frame timing and real-time FPS calculation
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;
  private lastRenderTime: number = 0;

  constructor(
    container: HTMLElement,
    initialCharacters: CharacterModel[],
    initialSettings: ViewportSettings,
    callbacks?: {
      onCameraChange?: (camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => void;
      onGazeEvaluated?: (data: CharacterGazeData, averageGaze?: SceneGazeAverage) => void;
      onFpsUpdate?: (fps: number) => void;
    }
  ) {
    this.container = container;
    this.characters = initialCharacters;
    this.activeCharacterId = initialCharacters[0]?.id || '';
    this.currentSettings = initialSettings;
    this.onCameraChange = callbacks?.onCameraChange;
    this.onGazeEvaluated = callbacks?.onGazeEvaluated;
    this.onFpsUpdate = callbacks?.onFpsUpdate;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize Three.js WebGLRenderer with low-spec optimization
    const isPerf = !!this.currentSettings.performanceMode;
    const initialPixelRatio = (this.isSoftwareGl || isPerf) ? 1.0 : Math.min(window.devicePixelRatio, 1.25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !isPerf,
      powerPreference: 'high-performance',
      alpha: false,
      precision: (this.isSoftwareGl || isPerf) ? 'mediump' : 'highp',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = isPerf ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(initialPixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x0a0f1d, 1.0);
    container.appendChild(this.renderer.domElement);

    // 3. Initialize Scene & Camera
    this.scene = new THREE.Scene();

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 2000);
    // Positioned to view 180-unit standing character
    this.camera.position.set(0, 110, 240);

    // 4. Orbit Controls (Targeting chest/waist level ~90)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 90, 0);
    this.controls.maxDistance = 600;
    this.controls.minDistance = 20;
    this.controls.addEventListener('change', () => {
      this.notifyCameraChange();
    });

    // 5. Studio Lighting Rig
    this.setupLighting();

    // 6. Viewport Helpers (Axes, Ground Grid, Target Plane)
    this.axesGroup = new THREE.Group();
    this.setupAxes();
    this.scene.add(this.axesGroup);

    this.gridHelper = new THREE.GridHelper(300, 60, 0x3b82f6, 0x1e293b);
    this.gridHelper.position.y = 0; // Ground plane at Y = 0
    this.scene.add(this.gridHelper);

    this.targetPlaneGroup = new THREE.Group();
    this.targetPlaneHitDots = this.setupTargetPlane();
    this.scene.add(this.targetPlaneGroup);

    // 7. 3D Soccer Ball at Multi-Character Gaze Averaged Center Point
    this.soccerBallGroup = SoccerBallGenerator.createSoccerBallMesh(
      initialSettings.soccerBallRadius || 4.8
    );
    this.soccerBallGroup.visible = initialSettings.showSoccerBall !== false;
    this.scene.add(this.soccerBallGroup);

    // 8. Build Character Render Trees
    for (const char of this.characters) {
      this.buildCharacterNode(char);
    }

    this.applyViewportSettings();
    this.updateAllCharacters();

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  private setupLighting(): void {
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.3);
    keyLight.position.set(100, 220, 150);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-100, 150, 100);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    backLight.position.set(0, 80, -150);
    this.scene.add(backLight);

    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x090d16, 0.7);
    this.scene.add(hemiLight);
  }

  private setupAxes(): void {
    const len = 30;
    this.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), len, 0xef4444, 4, 1.2));
    this.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), len, 0x22c55e, 4, 1.2));
    this.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), len, 0x3b82f6, 4, 1.2));
  }

  private setupTargetPlane(): { left: THREE.Mesh; right: THREE.Mesh } {
    this.targetPlaneCanvas = document.createElement('canvas');
    this.targetPlaneCanvas.width = 1024;
    this.targetPlaneCanvas.height = 1024;
    this.targetPlaneTexture = new THREE.CanvasTexture(this.targetPlaneCanvas);
    this.targetPlaneTexture.colorSpace = THREE.SRGBColorSpace;

    // Unit plane geometry (1 x 1), dynamically scaled to match reference picture dimensions
    const planeGeom = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: this.targetPlaneTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.targetPlaneMesh = new THREE.Mesh(planeGeom, planeMat);
    this.targetPlaneMesh.rotation.y = 0;
    this.targetPlaneGroup.add(this.targetPlaneMesh);

    // Left and Right gaze impact markers on screen
    const dotGeom = new THREE.SphereGeometry(2.0, 16, 16);
    const leftDotMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const rightDotMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    const leftDot = new THREE.Mesh(dotGeom, leftDotMat);
    const rightDot = new THREE.Mesh(dotGeom, rightDotMat);

    this.targetPlaneGroup.add(leftDot);
    this.targetPlaneGroup.add(rightDot);

    this.updateTargetPlaneGeometryAndTexture();

    return { left: leftDot, right: rightDot };
  }

  public updateTargetPlaneGeometryAndTexture(): void {
    if (!this.targetPlaneMesh || !this.targetPlaneCanvas || !this.targetPlaneTexture) return;

    // Visibility respect
    this.targetPlaneGroup.visible = this.currentSettings.showTargetPlane;

    // Dynamically match target area to reference picture size and aspect ratio
    const widthPx = this.currentRefConfig?.widthPx || 1200;
    const heightPx = this.currentRefConfig?.heightPx || 1500;
    let worldHeight = this.currentRefConfig?.worldHeight || 180;
    const aspect = widthPx / (heightPx || 1);

    // Opposite / Reciprocal scaling coupling if enabled
    if (this.currentRefConfig?.targetCouplingMode === 'opposite-scale' && this.currentRefConfig.oppositeScaleFactor && this.currentRefConfig.oppositeScaleFactor > 0) {
      worldHeight = worldHeight * (1 / this.currentRefConfig.oppositeScaleFactor);
    }

    const worldWidth = worldHeight * aspect;

    // Scale unit plane geometry to exact world width and height matching reference picture
    this.targetPlaneMesh.scale.set(worldWidth, worldHeight, 1);

    const posX = this.currentRefConfig?.worldPosition?.x ?? 0;
    const posY = this.currentRefConfig?.worldPosition?.y ?? (worldHeight / 2);
    let posZ = this.currentSettings.targetPlaneZ;
    if (this.currentRefConfig?.targetCouplingMode === 'opposite-depth') {
      posZ = 240 - this.currentSettings.targetPlaneZ;
    }
    this.targetPlaneGroup.position.set(posX, posY, posZ);

    const isPerf = !!this.currentSettings.performanceMode;
    const stateKey = `${widthPx}_${heightPx}_${worldWidth.toFixed(1)}_${worldHeight.toFixed(1)}_${posZ.toFixed(1)}_${isPerf}`;
    if (this.lastTargetPlaneState === stateKey) {
      return;
    }
    this.lastTargetPlaneState = stateKey;

    // In performance mode, use 512x512 canvas for 4x lower memory bandwidth & faster draw
    const targetDim = isPerf ? 512 : 1024;
    if (this.targetPlaneCanvas.width !== targetDim) {
      this.targetPlaneCanvas.width = targetDim;
      this.targetPlaneCanvas.height = targetDim;
    }

    // Draw calibrated pixel grid
    const ctx = this.targetPlaneCanvas.getContext('2d');
    if (!ctx) return;
    const w = this.targetPlaneCanvas.width;
    const h = this.targetPlaneCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(10, 15, 29, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Outer border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = isPerf ? 3 : 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Grid subdivision lines (8x8 divisions)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    for (let i = 1; i < 8; i++) {
      const gx = (w * i) / 8;
      const gy = (h * i) / 8;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Main Center Crosshairs
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Concentric calibration rings
    const ringStep = isPerf ? 80 : 80;
    const maxR = isPerf ? 210 : 420;
    for (let r = ringStep; r <= maxR; r += ringStep) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.stroke();
    }

    // Header info: Exact Pixel dimensions matched to reference picture
    const fontScale = isPerf ? 0.6 : 1.0;
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.round(24 * fontScale)}px monospace`;
    ctx.fillText('TARGET AREA [MATCHED TO REF PHOTO]', 20 * fontScale, 36 * fontScale);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(20 * fontScale)}px monospace`;
    ctx.fillText(`PIXELS: ${widthPx} × ${heightPx} px`, 20 * fontScale, 64 * fontScale);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.round(16 * fontScale)}px monospace`;
    ctx.fillText(`WORLD: ${worldWidth.toFixed(1)}u × ${worldHeight.toFixed(1)}u | Z = ${posZ.toFixed(1)}u`, 20 * fontScale, 88 * fontScale);

    // Corner Pixel coordinate labels (standard top-left 0,0)
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.round(18 * fontScale)}px monospace`;
    ctx.fillText('(0, 0) px', 18 * fontScale, 116 * fontScale);
    ctx.textAlign = 'right';
    ctx.fillText(`(${widthPx}, 0) px`, w - 18 * fontScale, 116 * fontScale);
    ctx.fillText(`(${widthPx}, ${heightPx}) px`, w - 18 * fontScale, h - 20 * fontScale);
    ctx.textAlign = 'left';
    ctx.fillText(`(0, ${heightPx}) px`, 18 * fontScale, h - 20 * fontScale);

    // Center coordinate label
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.round(16 * fontScale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`CENTER (${Math.round(widthPx / 2)}, ${Math.round(heightPx / 2)}) px`, w / 2, h / 2 - 10 * fontScale);
    ctx.textAlign = 'left';

    this.targetPlaneTexture.needsUpdate = true;
  }

  /**
   * Builds the complete Three.js node tree for a character:
   * - Deformable part meshes
   * - Unified mesh
   * - Skeleton bones & joint spheres
   * - Left and right procedural eye assemblies with gaze rays
   */
  private buildCharacterNode(char: CharacterModel): void {
    const charGroup = new THREE.Group();
    charGroup.name = `character_${char.id}`;
    this.scene.add(charGroup);

    const skeletonGroup = new THREE.Group();
    charGroup.add(skeletonGroup);

    const gazeGroup = new THREE.Group();
    charGroup.add(gazeGroup);

    const partMeshes = new Map<string, THREE.Mesh>();
    const jointSpheres = new Map<string, THREE.Mesh>();

    // 1. Build Anatomical Part Meshes
    for (const part of char.bodyData.parts) {
      const geom = ThreeAdapter.createBufferGeometry(part.baseMeshData);
      const partState = char.getPartDisplayState(part.id);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(char.bodyColor),
        roughness: 0.35,
        metalness: 0.08,
        wireframe: this.currentSettings.wireframe || partState.wireframe,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = !char.isUnifiedMode && partState.visible;
      partMeshes.set(part.id, mesh);
      charGroup.add(mesh);
    }

    // 2. Build Unified Mesh
    let unifiedMesh: THREE.Mesh | undefined;
    if (char.bodyData.unifiedMesh) {
      const uGeom = ThreeAdapter.createBufferGeometry(char.bodyData.unifiedMesh.baseMeshData);
      const uMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(char.bodyColor),
        roughness: 0.32,
        metalness: 0.08,
        wireframe: this.currentSettings.wireframe,
      });
      unifiedMesh = new THREE.Mesh(uGeom, uMat);
      unifiedMesh.visible = char.isUnifiedMode;
      charGroup.add(unifiedMesh);
    }

    // 3. Build Skeleton Joint Spheres
    for (const joint of char.bodyData.skeleton.joints.values()) {
      const isSelected = joint.id === char.selectedJointId;
      const sphereGeom = new THREE.SphereGeometry(isSelected ? 2.2 : 1.4, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xf59e0b : 0x38bdf8,
      });
      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
      jointSpheres.set(joint.id, sphereMesh);
      skeletonGroup.add(sphereMesh);
    }

    // Helper to generate clean circular 3D line loops without dense triangular clutter
    const createCircleLoop = (
      radius: number,
      color: number,
      plane: 'xy' | 'yz' | 'xz' = 'xy',
      zOffset: number = 0,
      sphereCurvatureRadius: number = 0,
      opacity: number = 0.95
    ): THREE.LineLoop => {
      const segments = 64;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const c = radius * Math.cos(theta);
        const s = radius * Math.sin(theta);
        let z = zOffset;
        if (sphereCurvatureRadius > 0) {
          const distSq = c * c + s * s;
          z = (distSq < sphereCurvatureRadius * sphereCurvatureRadius
            ? Math.sqrt(sphereCurvatureRadius * sphereCurvatureRadius - distSq)
            : 0) + zOffset;
        }

        if (plane === 'xy') {
          points.push(new THREE.Vector3(c, s, z));
        } else if (plane === 'yz') {
          points.push(new THREE.Vector3(z, c, s));
        } else {
          points.push(new THREE.Vector3(c, z, s));
        }
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth: 2,
      });
      return new THREE.LineLoop(geom, mat);
    };

    // 4. Build Procedural Eyes attached to head (with wireframe and clean outlines support)
    const createEyeSubGroup = (eyeRadius: number = 2.2): EyeRenderNodes => {
      const g = new THREE.Group();
      const wireframeLines: (THREE.LineSegments | THREE.LineLoop | THREE.Line)[] = [];
      const outlineLines: (THREE.LineSegments | THREE.LineLoop | THREE.Line)[] = [];

      // Sclera Mesh
      const sData = SphereGenerator.generateSphere(eyeRadius, 14, 20);
      const sGeom = ThreeAdapter.createBufferGeometry(sData);
      const sMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.25,
        transparent: true,
        opacity: 1.0,
      });
      const sMesh = new THREE.Mesh(sGeom, sMat);
      g.add(sMesh);

      // Sclera Dense Wireframe (Triangles)
      const sWireGeom = new THREE.WireframeGeometry(sGeom);
      const sWireMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
      });
      const sWire = new THREE.LineSegments(sWireGeom, sWireMat);
      sWire.visible = false;
      g.add(sWire);
      wireframeLines.push(sWire);

      // Sclera Clean Anatomical Outlines (Silhouette & Major Orthogonal Circles)
      // Coronal silhouette ring (facing gaze axis)
      const sSilhouette = createCircleLoop(eyeRadius, 0x38bdf8, 'xy', 0, 0, 0.95);
      sSilhouette.visible = false;
      g.add(sSilhouette);
      outlineLines.push(sSilhouette);

      // Transverse & Sagittal meridian rings for depth without dense triangular spiderwebs
      const sMeridianY = createCircleLoop(eyeRadius, 0x0284c7, 'xz', 0, 0, 0.45);
      sMeridianY.visible = false;
      g.add(sMeridianY);
      outlineLines.push(sMeridianY);

      const sMeridianX = createCircleLoop(eyeRadius, 0x0284c7, 'yz', 0, 0, 0.45);
      sMeridianX.visible = false;
      g.add(sMeridianX);
      outlineLines.push(sMeridianX);

      // Iris Mesh
      const irisRadius = eyeRadius * 0.55;
      const iData = DiscGenerator.generateIris(irisRadius, eyeRadius, 0.03);
      const iGeom = ThreeAdapter.createBufferGeometry(iData);
      const iMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.4,
        transparent: true,
        opacity: 1.0,
      });
      const iMesh = new THREE.Mesh(iGeom, iMat);
      g.add(iMesh);

      // Iris Dense Wireframe (Triangles)
      const iWireGeom = new THREE.WireframeGeometry(iGeom);
      const iWireMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.75,
      });
      const iWire = new THREE.LineSegments(iWireGeom, iWireMat);
      iWire.visible = false;
      g.add(iWire);
      wireframeLines.push(iWire);

      // Iris Limbal Outline Ring (Clean circle bounding the iris)
      const iLimbalRing = createCircleLoop(irisRadius, 0x22d3ee, 'xy', 0.03, eyeRadius, 0.95);
      iLimbalRing.visible = false;
      g.add(iLimbalRing);
      outlineLines.push(iLimbalRing);

      // Pupil Group (Transforms together for independent micro-offset & aperture scaling)
      const pupilGroup = new THREE.Group();
      g.add(pupilGroup);

      // Pupil Mesh
      const pupilRadius = eyeRadius * 0.25;
      const pData = DiscGenerator.generatePupil(pupilRadius, eyeRadius, 0.05);
      const pGeom = ThreeAdapter.createBufferGeometry(pData);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0x050505,
        transparent: true,
        opacity: 1.0,
      });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pupilGroup.add(pMesh);

      // Pupil Dense Wireframe
      const pWireGeom = new THREE.WireframeGeometry(pGeom);
      const pWireMat = new THREE.LineBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.85,
      });
      const pWire = new THREE.LineSegments(pWireGeom, pWireMat);
      pWire.visible = false;
      pupilGroup.add(pWire);
      wireframeLines.push(pWire);

      // Pupil Aperture Margin Outline Ring (Clean circle bounding the pupil)
      const pApertureRing = createCircleLoop(pupilRadius, 0xfacc15, 'xy', 0.05, eyeRadius, 0.95);
      pApertureRing.visible = false;
      pupilGroup.add(pApertureRing);
      outlineLines.push(pApertureRing);

      return {
        group: g,
        scleraMesh: sMesh,
        irisMesh: iMesh,
        pupilMesh: pMesh,
        pupilGroup,
        wireframeLines,
        outlineLines,
      };
    };

    const leftEye = createEyeSubGroup();
    const rightEye = createEyeSubGroup();
    charGroup.add(leftEye.group);
    charGroup.add(rightEye.group);

    // Persistent bone lines buffer (up to 60 bones = 120 points = 360 floats)
    const bonePositionsArray = new Float32Array(360);
    const boneGeom = new THREE.BufferGeometry();
    boneGeom.setAttribute('position', new THREE.BufferAttribute(bonePositionsArray, 3));
    const boneMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const boneLines = new THREE.LineSegments(boneGeom, boneMat);
    skeletonGroup.add(boneLines);

    // Persistent gaze ray cylinders & cones (zero allocation per frame)
    const rayLen = 50.0;
    const makeGazeCylinder = (colorHex: number) => {
      const geom = new THREE.CylinderGeometry(0.18, 0.18, rayLen, 6);
      geom.translate(0, rayLen / 2, 0);
      geom.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      return mesh;
    };
    const makeGazeCone = (colorHex: number) => {
      const geom = new THREE.ConeGeometry(0.7, 2.2, 8);
      geom.translate(0, 1.1, 0);
      geom.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      return mesh;
    };

    const leftGazeCylinder = makeGazeCylinder(0x22c55e);
    const leftGazeCone = makeGazeCone(0x22c55e);
    const rightGazeCylinder = makeGazeCylinder(0x06b6d4);
    const rightGazeCone = makeGazeCone(0x06b6d4);
    gazeGroup.add(leftGazeCylinder, leftGazeCone, rightGazeCylinder, rightGazeCone);

    this.characterNodes.set(char.id, {
      group: charGroup,
      skeletonGroup,
      gazeGroup,
      partMeshes,
      unifiedMesh,
      jointSpheres,
      boneLines,
      bonePositionsArray,
      leftEyeGroup: leftEye.group,
      rightEyeGroup: rightEye.group,
      leftEye,
      rightEye,
      leftGazeCylinder,
      leftGazeCone,
      rightGazeCylinder,
      rightGazeCone,
      lastKinematicsVersion: -1,
    });
  }

  /**
   * Updates all active characters, applying Linear Blend Skinning to mesh vertices
   * and updating skeleton/joint lines and gaze rays.
   */
  public updateAllCharacters(): void {
    const allGazeHits: THREE.Vector3[] = [];
    let activeGazeAnalysis: CharacterGazeData | undefined;

    // Common target specs calculation
    const widthPx = this.currentRefConfig?.widthPx || 1200;
    const heightPx = this.currentRefConfig?.heightPx || 1500;
    let worldHeight = this.currentRefConfig?.worldHeight || 180;
    const aspect = widthPx / (heightPx || 1);

    if (this.currentRefConfig?.targetCouplingMode === 'opposite-scale' && this.currentRefConfig.oppositeScaleFactor && this.currentRefConfig.oppositeScaleFactor > 0) {
      worldHeight = worldHeight * (1 / this.currentRefConfig.oppositeScaleFactor);
    }
    const worldWidth = worldHeight * aspect;

    const posX = this.currentRefConfig?.worldPosition?.x ?? 0;
    const posY = this.currentRefConfig?.worldPosition?.y ?? (worldHeight / 2);
    let posZ = this.currentSettings.targetPlaneZ;
    if (this.currentRefConfig?.targetCouplingMode === 'opposite-depth') {
      posZ = 240 - this.currentSettings.targetPlaneZ;
    }

    const targetSpecs: TargetAreaSpecs = {
      center: new Vec3(posX, posY, posZ),
      widthWorld: worldWidth,
      heightWorld: worldHeight,
      widthPx,
      heightPx,
      planeZ: posZ,
      invertX: this.currentRefConfig?.invertCoordX,
      invertY: this.currentRefConfig?.invertCoordY,
      oppositeScaling: this.currentRefConfig?.targetCouplingMode === 'opposite-scale',
      oppositeScaleFactor: this.currentRefConfig?.oppositeScaleFactor || 1.0,
    };

    const isPerf = !!this.currentSettings.performanceMode;

    for (const char of this.characters) {
      const node = this.characterNodes.get(char.id);
      if (!node) continue;

      // 1. Update visibility & wireframe of modes and individual parts
      if (node.unifiedMesh) {
        node.unifiedMesh.visible = char.isUnifiedMode;
        (node.unifiedMesh.material as THREE.MeshStandardMaterial).wireframe = this.currentSettings.wireframe;
      }
      for (const part of char.bodyData.parts) {
        const mesh = node.partMeshes.get(part.id);
        if (mesh) {
          const partState = char.getPartDisplayState(part.id);
          mesh.visible = !char.isUnifiedMode && partState.visible;
          (mesh.material as THREE.MeshStandardMaterial).wireframe =
            this.currentSettings.wireframe || partState.wireframe;
        }
      }

      // 2. Deform Vertices using zero-allocation Linear Blend Skinning (with dirty flag)
      const isKinematicsDirty = node.lastKinematicsVersion !== char.kinematicsVersion;
      if (isKinematicsDirty) {
        if (char.isUnifiedMode && node.unifiedMesh) {
          const posAttr = node.unifiedMesh.geometry.attributes.position as THREE.BufferAttribute;
          char.deformUnifiedIntoBuffer(posAttr.array as Float32Array);
          posAttr.needsUpdate = true;
          if (!isPerf) {
            node.unifiedMesh.geometry.computeVertexNormals();
          }
        } else {
          for (const part of char.bodyData.parts) {
            const mesh = node.partMeshes.get(part.id);
            if (!mesh) continue;
            const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
            char.deformPartIntoBuffer(part.id, posAttr.array as Float32Array);
            posAttr.needsUpdate = true;
            if (!isPerf) {
              mesh.geometry.computeVertexNormals();
            }
          }
        }
        node.lastKinematicsVersion = char.kinematicsVersion;
      }

      // 3. Update Skeleton Bone Lines & Joint Markers
      node.skeletonGroup.visible = char.showSkeleton;
      if (char.showSkeleton) {
        const bonePositions = node.bonePositionsArray || new Float32Array(360);
        let floatIdx = 0;

        for (const joint of char.bodyData.skeleton.joints.values()) {
          const sphere = node.jointSpheres.get(joint.id);
          if (sphere) {
            sphere.position.set(
              joint.currentWorldPosition.x,
              joint.currentWorldPosition.y,
              joint.currentWorldPosition.z
            );
            sphere.visible = char.showJoints;

            // Highlight selected joint
            const isSelected = joint.id === char.selectedJointId;
            (sphere.material as THREE.MeshBasicMaterial).color.set(isSelected ? 0xf59e0b : 0x38bdf8);
            sphere.scale.setScalar(isSelected ? 1.6 : 1.0);
          }

          if (joint.parentId && floatIdx + 6 <= bonePositions.length) {
            const parent = char.bodyData.skeleton.getJoint(joint.parentId);
            if (parent) {
              bonePositions[floatIdx++] = parent.currentWorldPosition.x;
              bonePositions[floatIdx++] = parent.currentWorldPosition.y;
              bonePositions[floatIdx++] = parent.currentWorldPosition.z;
              bonePositions[floatIdx++] = joint.currentWorldPosition.x;
              bonePositions[floatIdx++] = joint.currentWorldPosition.y;
              bonePositions[floatIdx++] = joint.currentWorldPosition.z;
            }
          }
        }

        // Update pre-allocated bone lines buffer
        if (node.boneLines) {
          const posAttr = node.boneLines.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.needsUpdate = true;
          node.boneLines.geometry.setDrawRange(0, floatIdx / 3);
        }
      }

      // 4. Update Procedural Eyes position & rotation (with independent pupil offset/decoupling)
      const leftEyeJoint = char.bodyData.skeleton.getJoint('leftEye');
      const rightEyeJoint = char.bodyData.skeleton.getJoint('rightEye');

      if (leftEyeJoint && node.leftEyeGroup) {
        node.leftEyeGroup.position.set(
          leftEyeJoint.currentWorldPosition.x,
          leftEyeJoint.currentWorldPosition.y,
          leftEyeJoint.currentWorldPosition.z
        );
        const euler = new THREE.Euler(
          (char.leftEyeGaze.pitchDeg * Math.PI) / 180,
          (char.leftEyeGaze.yawDeg * Math.PI) / 180,
          0,
          'YXZ'
        );
        node.leftEyeGroup.quaternion.setFromEuler(euler);

        // Independent pupil offset & scale
        const pOff = char.pupilOffset || { x: 0, y: 0 };
        const pScale = char.pupilScale || 1.0;
        if (node.leftEye.pupilGroup) {
          node.leftEye.pupilGroup.position.set(pOff.x, pOff.y, 0.01);
          node.leftEye.pupilGroup.scale.set(pScale, pScale, 1.0);
        } else {
          node.leftEye.pupilMesh.position.set(pOff.x, pOff.y, 0.01);
          node.leftEye.pupilMesh.scale.set(pScale, pScale, 1.0);
        }
      }

      if (rightEyeJoint && node.rightEyeGroup) {
        node.rightEyeGroup.position.set(
          rightEyeJoint.currentWorldPosition.x,
          rightEyeJoint.currentWorldPosition.y,
          rightEyeJoint.currentWorldPosition.z
        );
        const euler = new THREE.Euler(
          (char.rightEyeGaze.pitchDeg * Math.PI) / 180,
          (char.rightEyeGaze.yawDeg * Math.PI) / 180,
          0,
          'YXZ'
        );
        node.rightEyeGroup.quaternion.setFromEuler(euler);

        const pOff = char.pupilOffset || { x: 0, y: 0 };
        const pScale = char.pupilScale || 1.0;
        if (node.rightEye.pupilGroup) {
          node.rightEye.pupilGroup.position.set(pOff.x, pOff.y, 0.01);
          node.rightEye.pupilGroup.scale.set(pScale, pScale, 1.0);
        } else {
          node.rightEye.pupilMesh.position.set(pOff.x, pOff.y, 0.01);
          node.rightEye.pupilMesh.scale.set(pScale, pScale, 1.0);
        }
      }

      // 4b. Update Eye Wireframe, Outlines & Outline-Only Transparency
      const isOutlineOnly = !!(this.currentSettings.showEyeOutlineOnly || char.eyeOutlineOnly);
      const isEyeWire = !isOutlineOnly && !!(this.currentSettings.showEyeWireframe || this.currentSettings.wireframe || char.eyeWireframe);
      const isEyeOutline = isOutlineOnly || !!(this.currentSettings.showEyeOutlines || char.eyeOutlines);

      let solidOpacity = 1.0;
      if (isOutlineOnly) {
        solidOpacity = 0.0;
      } else if (this.currentSettings.eyeSolidOpacity !== undefined) {
        solidOpacity = this.currentSettings.eyeSolidOpacity;
      } else if (char.eyeOpacity !== undefined) {
        solidOpacity = char.eyeOpacity;
      }

      const applyEyeDisplay = (eyeNodes: EyeRenderNodes) => {
        const isSolidVisible = solidOpacity > 0.001;

        eyeNodes.scleraMesh.visible = isSolidVisible;
        eyeNodes.irisMesh.visible = isSolidVisible;
        eyeNodes.pupilMesh.visible = isSolidVisible;

        if (isSolidVisible) {
          const sMat = eyeNodes.scleraMesh.material as THREE.MeshStandardMaterial;
          sMat.wireframe = isEyeWire;
          sMat.transparent = solidOpacity < 0.99;
          sMat.opacity = solidOpacity;

          const iMat = eyeNodes.irisMesh.material as THREE.MeshStandardMaterial;
          iMat.wireframe = isEyeWire;
          iMat.transparent = solidOpacity < 0.99;
          iMat.opacity = solidOpacity;

          const pMat = eyeNodes.pupilMesh.material as THREE.MeshBasicMaterial;
          pMat.wireframe = isEyeWire;
          pMat.transparent = solidOpacity < 0.99;
          pMat.opacity = solidOpacity;
        }

        for (const wire of eyeNodes.wireframeLines) {
          wire.visible = isEyeWire;
        }
        for (const outline of eyeNodes.outlineLines) {
          outline.visible = isEyeOutline;
        }
      };

      if (node.leftEye) applyEyeDisplay(node.leftEye);
      if (node.rightEye) applyEyeDisplay(node.rightEye);

      // 5. Evaluate Gaze for character
      const gazeAnalysis = char.evaluateGaze(targetSpecs);

      if (char.id === this.activeCharacterId) {
        activeGazeAnalysis = gazeAnalysis;
      }

      // Collect left eye gaze intersection or projection point
      if (gazeAnalysis.leftTargetHit.hit && gazeAnalysis.leftTargetHit.point) {
        allGazeHits.push(new THREE.Vector3(
          gazeAnalysis.leftTargetHit.point.x,
          gazeAnalysis.leftTargetHit.point.y,
          gazeAnalysis.leftTargetHit.point.z
        ));
      } else {
        const lO = gazeAnalysis.leftEyeCenterWorld;
        const lD = gazeAnalysis.leftGazeDirectionWorld;
        const tZ = Math.abs(lD.z) > 1e-4 ? (posZ - lO.z) / lD.z : 100;
        allGazeHits.push(new THREE.Vector3(lO.x + lD.x * tZ, lO.y + lD.y * tZ, posZ));
      }

      // Collect right eye gaze intersection or projection point
      if (gazeAnalysis.rightTargetHit.hit && gazeAnalysis.rightTargetHit.point) {
        allGazeHits.push(new THREE.Vector3(
          gazeAnalysis.rightTargetHit.point.x,
          gazeAnalysis.rightTargetHit.point.y,
          gazeAnalysis.rightTargetHit.point.z
        ));
      } else {
        const rO = gazeAnalysis.rightEyeCenterWorld;
        const rD = gazeAnalysis.rightGazeDirectionWorld;
        const tZ = Math.abs(rD.z) > 1e-4 ? (posZ - rO.z) / rD.z : 100;
        allGazeHits.push(new THREE.Vector3(rO.x + rD.x * tZ, rO.y + rD.y * tZ, posZ));
      }

      // 6. Update pre-allocated gaze ray meshes (zero geometry churn)
      if (char.showGazeRays) {
        const rayLen = 50.0;
        const leftO = new THREE.Vector3(gazeAnalysis.leftEyeCenterWorld.x, gazeAnalysis.leftEyeCenterWorld.y, gazeAnalysis.leftEyeCenterWorld.z);
        const leftD = new THREE.Vector3(gazeAnalysis.leftGazeDirectionWorld.x, gazeAnalysis.leftGazeDirectionWorld.y, gazeAnalysis.leftGazeDirectionWorld.z);

        if (node.leftGazeCylinder && node.leftGazeCone) {
          node.leftGazeCylinder.visible = true;
          node.leftGazeCone.visible = true;
          node.leftGazeCylinder.position.copy(leftO);
          node.leftGazeCylinder.lookAt(leftO.clone().add(leftD));
          const leftTip = leftO.clone().add(leftD.clone().multiplyScalar(rayLen));
          node.leftGazeCone.position.copy(leftTip);
          node.leftGazeCone.lookAt(leftTip.clone().add(leftD));
        }

        const rightO = new THREE.Vector3(gazeAnalysis.rightEyeCenterWorld.x, gazeAnalysis.rightEyeCenterWorld.y, gazeAnalysis.rightEyeCenterWorld.z);
        const rightD = new THREE.Vector3(gazeAnalysis.rightGazeDirectionWorld.x, gazeAnalysis.rightGazeDirectionWorld.y, gazeAnalysis.rightGazeDirectionWorld.z);

        if (node.rightGazeCylinder && node.rightGazeCone) {
          node.rightGazeCylinder.visible = true;
          node.rightGazeCone.visible = true;
          node.rightGazeCylinder.position.copy(rightO);
          node.rightGazeCylinder.lookAt(rightO.clone().add(rightD));
          const rightTip = rightO.clone().add(rightD.clone().multiplyScalar(rayLen));
          node.rightGazeCone.position.copy(rightTip);
          node.rightGazeCone.lookAt(rightTip.clone().add(rightD));
        }
      } else {
        if (node.leftGazeCylinder) node.leftGazeCylinder.visible = false;
        if (node.leftGazeCone) node.leftGazeCone.visible = false;
        if (node.rightGazeCylinder) node.rightGazeCylinder.visible = false;
        if (node.rightGazeCone) node.rightGazeCone.visible = false;
      }

        // Update target plane dots for the active character
        if (char.id === this.activeCharacterId) {
          if (gazeAnalysis.leftTargetHit.hit && gazeAnalysis.leftTargetHit.point) {
            const hit = gazeAnalysis.leftTargetHit.point;
            this.targetPlaneHitDots.left.position.set(hit.x - posX, hit.y - posY, 0.5);
            this.targetPlaneHitDots.left.visible = this.currentSettings.showTargetPlane;
          }
          if (gazeAnalysis.rightTargetHit.hit && gazeAnalysis.rightTargetHit.point) {
            const hit = gazeAnalysis.rightTargetHit.point;
            this.targetPlaneHitDots.right.position.set(hit.x - posX, hit.y - posY, 0.5);
            this.targetPlaneHitDots.right.visible = this.currentSettings.showTargetPlane;
          }
        }
      }

    // 6. Compute Multi-Character Averaged Gaze Center Point
    let avgCenter = new Vec3(posX, posY, posZ);
    if (allGazeHits.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      for (const pt of allGazeHits) {
        sumX += pt.x;
        sumY += pt.y;
        sumZ += pt.z;
      }
      avgCenter = new Vec3(
        sumX / allGazeHits.length,
        sumY / allGazeHits.length,
        sumZ / allGazeHits.length
      );
    }

    // Target plane hit average in pixel and world space
    const targetAvgPx = {
      worldX: avgCenter.x,
      worldY: avgCenter.y,
      worldZ: avgCenter.z,
      pixelX: Math.round(((avgCenter.x - (posX - worldWidth / 2)) / (worldWidth || 1)) * widthPx),
      pixelY: Math.round(((worldHeight / 2 - (avgCenter.y - posY)) / (worldHeight || 1)) * heightPx),
    };

    const sceneGazeAvg: SceneGazeAverage = {
      centerPoint: avgCenter,
      targetPlaneHitAverage: targetAvgPx,
      rayCount: allGazeHits.length,
      characterCount: this.characters.length,
    };
    this.latestGazeAverage = sceneGazeAvg;

    // 7. Position 3D Soccer Ball at averaged gaze center point
    if (this.soccerBallGroup) {
      this.soccerBallGroup.position.set(avgCenter.x, avgCenter.y, avgCenter.z);
      this.soccerBallGroup.visible = this.currentSettings.showSoccerBall !== false;
    }

    // 8. Invoke callback
    if (activeGazeAnalysis && this.onGazeEvaluated) {
      this.onGazeEvaluated(activeGazeAnalysis, sceneGazeAvg);
    }
  }

  public setCharacters(characters: CharacterModel[], activeId: string): void {
    // Check for removed characters
    const currentIds = new Set(characters.map((c) => c.id));
    for (const [id, node] of this.characterNodes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(node.group);
        this.characterNodes.delete(id);
      }
    }

    // Check for added characters
    for (const char of characters) {
      if (!this.characterNodes.has(char.id)) {
        this.buildCharacterNode(char);
      }
    }

    this.characters = characters;
    this.activeCharacterId = activeId;
    this.updateAllCharacters();
  }

  public setViewportSettings(settings: ViewportSettings): void {
    this.currentSettings = settings;
    this.applyViewportSettings();
    this.updateAllCharacters();
  }

  public updateSettings(newSettings: Partial<ViewportSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    this.applyViewportSettings();
    this.updateTargetPlaneGeometryAndTexture();
    this.updateAllCharacters();
  }

  public updateReferenceConfig(config: ReferenceImageConfig): void {
    this.currentRefConfig = config;
    this.updateTargetPlaneGeometryAndTexture();
    this.updateAllCharacters();
  }

  public applyViewportSettings(): void {
    const isPerf = !!this.currentSettings.performanceMode;
    const targetPixelRatio = (this.isSoftwareGl || isPerf) ? 1.0 : Math.min(window.devicePixelRatio, 1.25);
    if (this.renderer.getPixelRatio() !== targetPixelRatio) {
      this.renderer.setPixelRatio(targetPixelRatio);
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    this.renderer.toneMapping = isPerf ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;

    this.axesGroup.visible = this.currentSettings.showAxes;
    this.gridHelper.visible = this.currentSettings.showGrid;
    this.targetPlaneGroup.visible = this.currentSettings.showTargetPlane;
    this.targetPlaneGroup.position.z = this.currentSettings.targetPlaneZ;

    if (this.soccerBallGroup) {
      this.soccerBallGroup.visible = this.currentSettings.showSoccerBall !== false;
    }

    const wf = this.currentSettings.wireframe;
    const isEyeWire = !!(this.currentSettings.showEyeWireframe || this.currentSettings.wireframe);
    const isEyeOutline = !!this.currentSettings.showEyeOutlines;

    for (const [charId, node] of this.characterNodes.entries()) {
      const char = this.characters.find((c) => c.id === charId);
      for (const [partId, m] of node.partMeshes.entries()) {
        const partWireframe = char ? char.getPartDisplayState(partId).wireframe : false;
        (m.material as THREE.MeshStandardMaterial).wireframe = wf || partWireframe;
      }
      if (node.unifiedMesh) {
        (node.unifiedMesh.material as THREE.MeshStandardMaterial).wireframe = wf;
      }

      // Update Eyes wireframe, outlines & outline-only
      const isOutlineOnly = !!(this.currentSettings.showEyeOutlineOnly || char?.eyeOutlineOnly);
      const charEyeWire = !isOutlineOnly && !!(this.currentSettings.showEyeWireframe || this.currentSettings.wireframe || char?.eyeWireframe);
      const charEyeOutline = isOutlineOnly || !!(this.currentSettings.showEyeOutlines || char?.eyeOutlines);

      let solidOpacity = 1.0;
      if (isOutlineOnly) {
        solidOpacity = 0.0;
      } else if (this.currentSettings.eyeSolidOpacity !== undefined) {
        solidOpacity = this.currentSettings.eyeSolidOpacity;
      } else if (char?.eyeOpacity !== undefined) {
        solidOpacity = char.eyeOpacity;
      }

      const applyEye = (eyeNodes: EyeRenderNodes) => {
        const isSolidVisible = solidOpacity > 0.001;

        eyeNodes.scleraMesh.visible = isSolidVisible;
        eyeNodes.irisMesh.visible = isSolidVisible;
        eyeNodes.pupilMesh.visible = isSolidVisible;

        if (isSolidVisible) {
          const sMat = eyeNodes.scleraMesh.material as THREE.MeshStandardMaterial;
          sMat.wireframe = charEyeWire;
          sMat.transparent = solidOpacity < 0.99;
          sMat.opacity = solidOpacity;

          const iMat = eyeNodes.irisMesh.material as THREE.MeshStandardMaterial;
          iMat.wireframe = charEyeWire;
          iMat.transparent = solidOpacity < 0.99;
          iMat.opacity = solidOpacity;

          const pMat = eyeNodes.pupilMesh.material as THREE.MeshBasicMaterial;
          pMat.wireframe = charEyeWire;
          pMat.transparent = solidOpacity < 0.99;
          pMat.opacity = solidOpacity;
        }

        for (const wire of eyeNodes.wireframeLines) wire.visible = charEyeWire;
        for (const outline of eyeNodes.outlineLines) outline.visible = charEyeOutline;
      };

      if (node.leftEye) applyEye(node.leftEye);
      if (node.rightEye) applyEye(node.rightEye);
    }
  }

  /**
   * Retrieves the current scene-wide multi-character averaged gaze convergence data.
   */
  public getSceneGazeAverage(): SceneGazeAverage | undefined {
    return this.latestGazeAverage;
  }

  /**
   * Automatically articulates all active characters' dual-eye gaze to lock
   * directly onto the 3D soccer ball / collective gaze average center point.
   */
  public focusAllCharactersOnSoccerBall(): void {
    if (!this.latestGazeAverage) return;
    const target = this.latestGazeAverage.centerPoint;
    for (const char of this.characters) {
      char.setGazeTarget(target);
    }
    this.updateAllCharacters();
  }

  /**
   * Focus character eyes directly on the active 3D camera
   */
  public focusEyesOnCamera(charId?: string): void {
    const camPos = new Vec3(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    const targetChars = charId ? this.characters.filter((c) => c.id === charId) : this.characters;
    for (const char of targetChars) {
      char.setGazeTarget(camPos);
    }
    this.updateAllCharacters();
  }

  /**
   * Resets character eyes to neutral straight ahead (0°, 0°)
   */
  public focusEyesStraight(charId?: string): void {
    const targetChars = charId ? this.characters.filter((c) => c.id === charId) : this.characters;
    for (const char of targetChars) {
      char.lookStraight();
    }
    this.updateAllCharacters();
  }

  /**
   * Directs character eyes to look directly at the target plane center
   */
  public focusEyesOnTarget(charId?: string): void {
    const targetZ = this.currentSettings.targetPlaneZ;
    const targetPos = new Vec3(
      this.currentRefConfig?.worldPosition?.x ?? 0,
      this.currentRefConfig?.worldPosition?.y ?? 90,
      targetZ
    );
    const targetChars = charId ? this.characters.filter((c) => c.id === charId) : this.characters;
    for (const char of targetChars) {
      char.setGazeTarget(targetPos);
    }
    this.updateAllCharacters();
  }

  public setCameraPreset(preset: 'front' | 'top' | 'side' | 'perspective' | 'fullbody'): void {
    const activeChar = this.characters.find((c) => c.id === this.activeCharacterId);
    const targetY = 90;
    const targetX = activeChar ? activeChar.position.x : 0;
    const targetZ = activeChar ? activeChar.position.z : 0;

    switch (preset) {
      case 'front':
        this.camera.position.set(targetX, targetY, targetZ + 240);
        break;
      case 'top':
        this.camera.position.set(targetX, targetY + 300, targetZ + 0.1);
        break;
      case 'side':
        this.camera.position.set(targetX + 240, targetY, targetZ);
        break;
      case 'fullbody':
        this.camera.position.set(targetX, 90, targetZ + 270);
        break;
      case 'perspective':
      default:
        this.camera.position.set(targetX + 70, targetY + 30, targetZ + 200);
        break;
    }
    this.controls.target.set(targetX, targetY, targetZ);
    this.controls.update();
    this.notifyCameraChange();
  }

  public zoomCamera(factor: number): void {
    const dir = this.camera.position.clone().sub(this.controls.target);
    const newDist = Math.max(25, Math.min(550, dir.length() * factor));
    dir.normalize().multiplyScalar(newDist);
    this.camera.position.copy(this.controls.target.clone().add(dir));
    this.controls.update();
    this.notifyCameraChange();
  }

  public panCamera(deltaX: number, deltaY: number): void {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().copy(this.camera.up).normalize();

    const move = right.multiplyScalar(deltaX).add(up.multiplyScalar(deltaY));
    this.camera.position.add(move);
    this.controls.target.add(move);
    this.controls.update();
    this.notifyCameraChange();
  }

  private notifyCameraChange(): void {
    if (!this.onCameraChange) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const dist = offset.length();
    const elevation = Math.asin(offset.y / dist) * (180 / Math.PI);
    const azimuth = Math.atan2(offset.x, offset.z) * (180 / Math.PI);
    this.onCameraChange({
      distance: dist,
      azimuthDeg: azimuth,
      elevationDeg: elevation,
    });
  }

  public getGeometryStats(): { vertices: number; triangles: number } {
    let vertices = 0;
    let triangles = 0;

    for (const node of this.characterNodes.values()) {
      for (const mesh of node.partMeshes.values()) {
        if (mesh.geometry && mesh.visible) {
          vertices += mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count : 0;
          triangles += mesh.geometry.index ? mesh.geometry.index.count / 3 : 0;
        }
      }
      if (node.unifiedMesh && node.unifiedMesh.visible) {
        vertices += node.unifiedMesh.geometry.attributes.position ? node.unifiedMesh.geometry.attributes.position.count : 0;
        triangles += node.unifiedMesh.geometry.index ? node.unifiedMesh.geometry.index.count / 3 : 0;
      }
    }

    return { vertices, triangles };
  }

  private handleResize = (): void => {
    if (this.isDisposed || !this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / (h || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private startLoop(): void {
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();

      // Real-time FPS computation
      this.frameCount++;
      if (now - this.lastFpsTime >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = now;
        if (this.onFpsUpdate) {
          this.onFpsUpdate(this.currentFps);
        }
      }

      // Frame rate pacing if targetFps specified (e.g. 30 / 60)
      const targetFps = this.currentSettings.targetFps;
      if (targetFps && targetFps > 0) {
        const interval = 1000 / targetFps;
        const elapsed = now - this.lastRenderTime;
        if (elapsed < interval - 1.5) {
          this.animFrameId = requestAnimationFrame(tick);
          return;
        }
        this.lastRenderTime = now - (elapsed % interval);
      }

      this.controls.update();
      if (this.soccerBallGroup && this.soccerBallGroup.visible) {
        // Subtle slow spin for 3D realism
        this.soccerBallGroup.rotation.y += 0.007;
        this.soccerBallGroup.rotation.x += 0.003;
      }
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public setReferenceImage(config: ReferenceImageConfig): void {
    if (this.isDisposed) return;

    this.currentRefConfig = config;
    this.updateTargetPlaneGeometryAndTexture();

    // In 2D overlay mode or when hidden/empty url, hide the 3D world plane
    if (config.is2D || !config.visible || !config.url) {
      if (this.refImageGroup) {
        this.refImageGroup.visible = false;
      }
      this.updateAllCharacters();
      return;
    }

    if (!this.refImageGroup) {
      this.refImageGroup = new THREE.Group();
      this.refImageGroup.name = 'ReferenceImageWorldGroup';

      const geom = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: config.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.refImageMesh = new THREE.Mesh(geom, mat);
      this.refImageGroup.add(this.refImageMesh);

      // Add a clean border line around the 3D plane so it is visible in the world
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
      });
      this.refImageWireframe = new THREE.LineSegments(edges, lineMat);
      this.refImageGroup.add(this.refImageWireframe);

      this.scene.add(this.refImageGroup);
    }

    this.refImageGroup.visible = true;

    // Calculate dimensions: default height is 180 units (matches 180-unit standing character)
    const worldHeight = config.worldHeight || 180;
    const aspect =
      config.widthPx && config.heightPx
        ? config.widthPx / config.heightPx
        : config.nativeWidth / (config.nativeHeight || 1) || 1;
    const worldWidth = worldHeight * aspect;

    this.refImageGroup.scale.set(worldWidth, worldHeight, 1);

    // Anchor in world space: does not move with camera
    const posX = config.worldPosition?.x ?? 0;
    const posY = config.worldPosition?.y ?? worldHeight / 2;
    const posZ = config.worldPosition?.z ?? -15;
    this.refImageGroup.position.set(posX, posY, posZ);

    if (this.refImageMesh) {
      const mat = this.refImageMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = config.opacity;

      if (this.currentRefUrl !== config.url) {
        this.currentRefUrl = config.url;
        const loader = new THREE.TextureLoader();
        loader.load(config.url, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          mat.map = tex;
          mat.needsUpdate = true;
        });
      }
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);

    if (this.refImageGroup) {
      this.scene.remove(this.refImageGroup);
    }

    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
