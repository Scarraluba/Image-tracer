/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterModel, CharacterGazeData, TargetAreaSpecs } from '../body/CharacterModel';
import { Vec3 } from '../math/Vec3';
import { ThreeAdapter } from './ThreeAdapter';
import { SphereGenerator } from '../geometry/SphereGenerator';
import { DiscGenerator } from '../geometry/DiscGenerator';
import { CorneaGenerator } from '../geometry/CorneaGenerator';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';

export interface ViewportSettings {
  showAxes: boolean;
  showGrid: boolean;
  showTargetPlane: boolean;
  wireframe: boolean;
  targetPlaneZ: number;
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
      leftEyeGroup: THREE.Group;
      rightEyeGroup: THREE.Group;
    }
  > = new Map();

  private characters: CharacterModel[] = [];
  private activeCharacterId: string = '';
  private currentSettings: ViewportSettings;
  private onCameraChange?: (camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => void;
  private onGazeEvaluated?: (data: CharacterGazeData) => void;

  constructor(
    container: HTMLElement,
    initialCharacters: CharacterModel[],
    initialSettings: ViewportSettings,
    callbacks?: {
      onCameraChange?: (camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => void;
      onGazeEvaluated?: (data: CharacterGazeData) => void;
    }
  ) {
    this.container = container;
    this.characters = initialCharacters;
    this.activeCharacterId = initialCharacters[0]?.id || '';
    this.currentSettings = initialSettings;
    this.onCameraChange = callbacks?.onCameraChange;
    this.onGazeEvaluated = callbacks?.onGazeEvaluated;

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

    // 2. Initialize Three.js WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
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

    // 7. Build Character Render Trees
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

    // Draw high-resolution calibrated pixel grid
    const ctx = this.targetPlaneCanvas.getContext('2d')!;
    const w = this.targetPlaneCanvas.width;
    const h = this.targetPlaneCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(10, 15, 29, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Outer border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);

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
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Concentric calibration rings
    for (let r = 80; r <= 420; r += 80) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = r % 160 === 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(56, 189, 248, 0.25)';
      ctx.stroke();
    }

    // Header info: Exact Pixel dimensions matched to reference picture
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('TARGET AREA [MATCHED TO REF PHOTO]', 28, 44);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`PIXEL DIMENSIONS: ${widthPx} × ${heightPx} px`, 28, 76);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px monospace';
    ctx.fillText(`WORLD: ${worldWidth.toFixed(1)}u × ${worldHeight.toFixed(1)}u | Z = ${posZ.toFixed(1)}u`, 28, 104);

    // Corner Pixel coordinate labels (standard top-left 0,0)
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('(0, 0) px', 24, 136);
    ctx.textAlign = 'right';
    ctx.fillText(`(${widthPx}, 0) px`, w - 24, 136);
    ctx.fillText(`(${widthPx}, ${heightPx}) px`, w - 24, h - 28);
    ctx.textAlign = 'left';
    ctx.fillText(`(0, ${heightPx}) px`, 24, h - 28);

    // Center coordinate label
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CENTER (${Math.round(widthPx / 2)}, ${Math.round(heightPx / 2)}) px`, w / 2, h / 2 - 12);
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
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(char.bodyColor),
        roughness: 0.35,
        metalness: 0.08,
        wireframe: this.currentSettings.wireframe,
      });
      const mesh = new THREE.Mesh(geom, mat);
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

    // 4. Build Procedural Eyes attached to head
    const createEyeSubGroup = (eyeRadius: number = 2.2): THREE.Group => {
      const g = new THREE.Group();
      // Sclera
      const sData = SphereGenerator.generateSphere(eyeRadius, 14, 20);
      const sMesh = new THREE.Mesh(
        ThreeAdapter.createBufferGeometry(sData),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
      );
      g.add(sMesh);

      // Iris
      const iData = DiscGenerator.generateIris(eyeRadius * 0.55, eyeRadius, 0.03);
      const iMesh = new THREE.Mesh(
        ThreeAdapter.createBufferGeometry(iData),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })
      );
      g.add(iMesh);

      // Pupil
      const pData = DiscGenerator.generatePupil(eyeRadius * 0.25, eyeRadius, 0.05);
      const pMesh = new THREE.Mesh(
        ThreeAdapter.createBufferGeometry(pData),
        new THREE.MeshBasicMaterial({ color: 0x050505 })
      );
      g.add(pMesh);

      return g;
    };

    const leftEyeGroup = createEyeSubGroup();
    const rightEyeGroup = createEyeSubGroup();
    charGroup.add(leftEyeGroup);
    charGroup.add(rightEyeGroup);

    this.characterNodes.set(char.id, {
      group: charGroup,
      skeletonGroup,
      gazeGroup,
      partMeshes,
      unifiedMesh,
      jointSpheres,
      leftEyeGroup,
      rightEyeGroup,
    });
  }

  /**
   * Updates all active characters, applying Linear Blend Skinning to mesh vertices
   * and updating skeleton/joint lines and gaze rays.
   */
  public updateAllCharacters(): void {
    for (const char of this.characters) {
      const node = this.characterNodes.get(char.id);
      if (!node) continue;

      // 1. Update visibility of modes
      if (node.unifiedMesh) {
        node.unifiedMesh.visible = char.isUnifiedMode;
      }
      for (const mesh of node.partMeshes.values()) {
        mesh.visible = !char.isUnifiedMode;
      }

      // 2. Deform Vertices using Linear Blend Skinning
      if (char.isUnifiedMode && node.unifiedMesh) {
        const deformedVerts = char.getDeformedUnifiedVertices();
        const posAttr = node.unifiedMesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < deformedVerts.length; i++) {
          posAttr.setXYZ(i, deformedVerts[i].x, deformedVerts[i].y, deformedVerts[i].z);
        }
        posAttr.needsUpdate = true;
        node.unifiedMesh.geometry.computeVertexNormals();
      } else {
        for (const part of char.bodyData.parts) {
          const mesh = node.partMeshes.get(part.id);
          if (!mesh) continue;
          const deformedVerts = char.getDeformedPartVertices(part.id);
          const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < deformedVerts.length; i++) {
            posAttr.setXYZ(i, deformedVerts[i].x, deformedVerts[i].y, deformedVerts[i].z);
          }
          posAttr.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        }
      }

      // 3. Update Skeleton Bone Lines & Joint Markers
      node.skeletonGroup.visible = char.showSkeleton;
      if (char.showSkeleton) {
        const bonePositions: number[] = [];

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

          if (joint.parentId) {
            const parent = char.bodyData.skeleton.getJoint(joint.parentId);
            if (parent) {
              bonePositions.push(
                parent.currentWorldPosition.x,
                parent.currentWorldPosition.y,
                parent.currentWorldPosition.z,
                joint.currentWorldPosition.x,
                joint.currentWorldPosition.y,
                joint.currentWorldPosition.z
              );
            }
          }
        }

        // Recreate bone lines
        if (node.boneLines) {
          node.skeletonGroup.remove(node.boneLines);
          node.boneLines.geometry.dispose();
        }
        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(bonePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
        node.boneLines = new THREE.LineSegments(lineGeom, lineMat);
        node.skeletonGroup.add(node.boneLines);
      }

      // 4. Update Procedural Eyes position & rotation
      const leftEyeJoint = char.bodyData.skeleton.getJoint('leftEye');
      const rightEyeJoint = char.bodyData.skeleton.getJoint('rightEye');
      const headJoint = char.bodyData.skeleton.getJoint('head');

      if (leftEyeJoint && node.leftEyeGroup) {
        node.leftEyeGroup.position.set(
          leftEyeJoint.currentWorldPosition.x,
          leftEyeJoint.currentWorldPosition.y,
          leftEyeJoint.currentWorldPosition.z
        );
        // Combine head rotation with eye yaw/pitch
        const euler = new THREE.Euler(
          (char.leftEyeGaze.pitchDeg * Math.PI) / 180,
          (char.leftEyeGaze.yawDeg * Math.PI) / 180,
          0,
          'YXZ'
        );
        node.leftEyeGroup.quaternion.setFromEuler(euler);
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
      }

      // 5. Update Gaze Rays with Target Specs Matched to Reference Picture
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

      const gazeAnalysis = char.evaluateGaze(targetSpecs);

      // Clear old ray visual elements
      while (node.gazeGroup.children.length > 0) {
        const child = node.gazeGroup.children[0] as THREE.Mesh;
        node.gazeGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
      }

      if (char.showGazeRays) {
        const rayLen = 50.0;

        const addGazeRay = (origin: THREE.Vector3, dir: THREE.Vector3, colorHex: number) => {
          // Ray line / cylinder
          const rayGeom = new THREE.CylinderGeometry(0.18, 0.18, rayLen, 8);
          rayGeom.translate(0, rayLen / 2, 0);
          rayGeom.rotateX(Math.PI / 2);
          const rayMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
          const rayMesh = new THREE.Mesh(rayGeom, rayMat);
          rayMesh.position.copy(origin);
          rayMesh.lookAt(origin.clone().add(dir));
          node.gazeGroup.add(rayMesh);

          // Arrow cone
          const coneGeom = new THREE.ConeGeometry(0.7, 2.2, 12);
          coneGeom.translate(0, 1.1, 0);
          coneGeom.rotateX(Math.PI / 2);
          const tip = origin.clone().add(dir.clone().multiplyScalar(rayLen));
          const coneMesh = new THREE.Mesh(coneGeom, rayMat);
          coneMesh.position.copy(tip);
          coneMesh.lookAt(tip.clone().add(dir));
          node.gazeGroup.add(coneMesh);
        };

        const leftO = new THREE.Vector3(gazeAnalysis.leftEyeCenterWorld.x, gazeAnalysis.leftEyeCenterWorld.y, gazeAnalysis.leftEyeCenterWorld.z);
        const leftD = new THREE.Vector3(gazeAnalysis.leftGazeDirectionWorld.x, gazeAnalysis.leftGazeDirectionWorld.y, gazeAnalysis.leftGazeDirectionWorld.z);
        addGazeRay(leftO, leftD, 0x22c55e);

        const rightO = new THREE.Vector3(gazeAnalysis.rightEyeCenterWorld.x, gazeAnalysis.rightEyeCenterWorld.y, gazeAnalysis.rightEyeCenterWorld.z);
        const rightD = new THREE.Vector3(gazeAnalysis.rightGazeDirectionWorld.x, gazeAnalysis.rightGazeDirectionWorld.y, gazeAnalysis.rightGazeDirectionWorld.z);
        addGazeRay(rightO, rightD, 0x06b6d4);

        // Update target plane dots for the active character (calibrated to target area)
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
          if (this.onGazeEvaluated) {
            this.onGazeEvaluated(gazeAnalysis);
          }
        }
      }
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
    this.axesGroup.visible = this.currentSettings.showAxes;
    this.gridHelper.visible = this.currentSettings.showGrid;
    this.targetPlaneGroup.visible = this.currentSettings.showTargetPlane;
    this.targetPlaneGroup.position.z = this.currentSettings.targetPlaneZ;

    const wf = this.currentSettings.wireframe;
    for (const node of this.characterNodes.values()) {
      for (const m of node.partMeshes.values()) {
        (m.material as THREE.MeshStandardMaterial).wireframe = wf;
      }
      if (node.unifiedMesh) {
        (node.unifiedMesh.material as THREE.MeshStandardMaterial).wireframe = wf;
      }
    }
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
      this.controls.update();
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
