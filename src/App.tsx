/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Vec3 } from './math/Vec3';
import { CharacterModel, CharacterGazeData } from './body/CharacterModel';
import { DEFAULT_PROPORTIONS, PROPORTION_PRESETS } from './body/BodyProportions';
import { ViewportSettings, EyeScene } from './rendering/EyeScene';
import { Viewport3D } from './workspace/Viewport3D';
import { TopToolbar, ViewLayoutMode } from './ui/TopToolbar';
import { MobileBottomNav, MobileTab } from './ui/MobileBottomNav';
import { MobileDrawer } from './ui/MobileDrawer';
import { SelectedPanelContent } from './ui/SelectedPanelContent';
import { StatusBar } from './ui/StatusBar';
import { DiagnosticsModal } from './ui/DiagnosticsModal';
import { ReferenceImageConfig, DEFAULT_REFERENCE_IMAGE } from './reference/ReferenceImageModel';
import { ReferenceImageOverlay } from './ui/ReferenceImageOverlay';
import { ProjectStorage, ProjectData } from './storage/ProjectStorage';
import { ProjectManagerModal } from './ui/ProjectManagerModal';
import { OfflineIndicator } from './pwa/OfflineIndicator';

export default function App() {
  // Initial multi-character setup: 2 characters standing in the scene
  const [characters, setCharacters] = useState<CharacterModel[]>(() => [
    new CharacterModel(
      'char_alpha',
      'Actor Alpha',
      new Vec3(-28, 0, 0),
      12,
      PROPORTION_PRESETS['Heroic / Athletic (195u)'] || DEFAULT_PROPORTIONS,
      '#38bdf8'
    ),
    new CharacterModel(
      'char_beta',
      'Actor Beta',
      new Vec3(28, 0, 0),
      -12,
      DEFAULT_PROPORTIONS,
      '#34d399'
    ),
  ]);

  const [activeCharacterId, setActiveCharacterId] = useState<string>('char_alpha');

  // Layout mode: 'preview' (full 3D) | 'split' (preview | selected panel) | 'panel' (panel focus)
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>('split');

  // Active navigation tab for bottom nav & drawer
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('joints');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [settings, setSettings] = useState<ViewportSettings>({
    showAxes: true,
    showGrid: true,
    showTargetPlane: true,
    showCharacters: true,
    wireframe: false,
    targetPlaneZ: 120.0,
  });

  const [referenceConfig, setReferenceConfig] = useState<ReferenceImageConfig>(DEFAULT_REFERENCE_IMAGE);

  const handleUpdateReferenceConfig = useCallback((newConfig: Partial<ReferenceImageConfig>) => {
    setReferenceConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (sceneRef.current) {
        sceneRef.current.updateReferenceConfig(updated);
      }
      return updated;
    });
  }, []);

  const [gazeData, setGazeData] = useState<CharacterGazeData | undefined>(undefined);
  const [cameraInfo, setCameraInfo] = useState<{ distance: number; azimuthDeg: number; elevationDeg: number }>({
    distance: 240.0,
    azimuthDeg: 15.0,
    elevationDeg: 12.0,
  });
  const [geometryStats, setGeometryStats] = useState({ vertices: 3400, triangles: 6200 });
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [, setRenderTrigger] = useState(0);

  const sceneRef = useRef<EyeScene | null>(null);

  const activeChar = characters.find((c) => c.id === activeCharacterId) || characters[0];

  const forceSceneUpdate = useCallback(() => {
    setRenderTrigger((prev) => prev + 1);
    if (sceneRef.current) {
      sceneRef.current.updateAllCharacters();
      setGeometryStats(sceneRef.current.getGeometryStats());
    }
  }, []);

  const handleSelectCharacter = useCallback((id: string) => {
    setActiveCharacterId(id);
    if (sceneRef.current) {
      sceneRef.current.setCharacters(characters, id);
    }
  }, [characters]);

  // Add new procedural character
  const handleAddCharacter = useCallback(() => {
    const nextIdx = characters.length + 1;
    const newId = `char_${Date.now()}`;
    const xPos = (characters.length - 1) * 35;
    const colorPalette = ['#fbbf24', '#c084fc', '#fb7185', '#38bdf8', '#34d399'];
    const assignedColor = colorPalette[(nextIdx - 1) % colorPalette.length];

    const newChar = new CharacterModel(
      newId,
      `Actor ${String.fromCharCode(64 + nextIdx)}`,
      new Vec3(xPos, 0, -10),
      0,
      DEFAULT_PROPORTIONS,
      assignedColor
    );

    const updated = [...characters, newChar];
    setCharacters(updated);
    setActiveCharacterId(newId);
    if (sceneRef.current) {
      sceneRef.current.setCharacters(updated, newId);
    }
  }, [characters]);

  const handleUpdateSettings = useCallback((newSettings: Partial<ViewportSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (sceneRef.current) {
        sceneRef.current.updateSettings(updated);
      }
      return updated;
    });
  }, []);

  // 1-Click Toggle for Target 🎯 Board
  const handleToggleTargetPlane = useCallback(() => {
    setSettings((prev) => {
      const updated = { ...prev, showTargetPlane: !prev.showTargetPlane };
      if (sceneRef.current) {
        sceneRef.current.updateSettings(updated);
      }
      return updated;
    });
  }, []);

  const handleResetPose = useCallback(() => {
    if (activeChar) {
      activeChar.applyPose('Relaxed / A-Pose');
      forceSceneUpdate();
    }
  }, [activeChar, forceSceneUpdate]);

  const handleResetCamera = useCallback(() => {
    sceneRef.current?.setCameraPreset('fullbody');
  }, []);

  const handleToggleUnifiedMode = useCallback(() => {
    if (activeChar) {
      activeChar.isUnifiedMode = !activeChar.isUnifiedMode;
      forceSceneUpdate();
    }
  }, [activeChar, forceSceneUpdate]);

  const handleToggleSkeleton = useCallback(() => {
    if (activeChar) {
      activeChar.showSkeleton = !activeChar.showSkeleton;
      forceSceneUpdate();
    }
  }, [activeChar, forceSceneUpdate]);

  const handleSceneReady = useCallback((scene: EyeScene) => {
    sceneRef.current = scene;
    setGeometryStats(scene.getGeometryStats());
  }, []);

  const handleGazeEvaluated = useCallback((data: CharacterGazeData) => {
    setGazeData(data);
  }, []);

  const handleCameraChange = useCallback((camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => {
    setCameraInfo(camInfo);
  }, []);

  // --- PROJECT PERSISTENCE: Serialization, Saving & Loading ---
  const getCurrentProjectData = useCallback((name?: string): ProjectData => {
    return {
      id: `proj_${Date.now()}`,
      name: name || 'Eye Geometry Study',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0.0',
      activeCharacterId,
      characters: characters.map((c) => {
        const jointRotations: Record<string, { pitchDeg: number; yawDeg: number; rollDeg: number }> = {};
        for (const [jId, joint] of c.bodyData.skeleton.joints.entries()) {
          jointRotations[jId] = { ...joint.rotationAngles };
        }
        return {
          id: c.id,
          name: c.name,
          rootPosition: { x: c.position.x, y: c.position.y, z: c.position.z },
          facingRotationDeg: c.rotationDeg,
          proportions: { ...c.proportions },
          bodyColor: c.bodyColor,
          isUnifiedMode: c.isUnifiedMode,
          showSkeleton: c.showSkeleton,
          leftEyeGaze: { pitchDeg: c.leftEyeGaze.pitchDeg, yawDeg: c.leftEyeGaze.yawDeg },
          rightEyeGaze: { pitchDeg: c.rightEyeGaze.pitchDeg, yawDeg: c.rightEyeGaze.yawDeg },
          jointRotations,
        };
      }),
      referenceConfig: { ...referenceConfig },
      viewportSettings: { ...settings },
    };
  }, [characters, activeCharacterId, referenceConfig, settings]);

  const handleSaveCurrentProject = useCallback((name: string) => {
    const proj = getCurrentProjectData(name);
    ProjectStorage.saveProject(proj);
  }, [getCurrentProjectData]);

  const handleLoadProject = useCallback((project: ProjectData) => {
    if (!project.characters || project.characters.length === 0) return;

    const restored = project.characters.map((sc) => {
      const char = new CharacterModel(
        sc.id,
        sc.name,
        new Vec3(sc.rootPosition.x, sc.rootPosition.y, sc.rootPosition.z),
        sc.facingRotationDeg,
        sc.proportions,
        sc.bodyColor
      );
      char.isUnifiedMode = sc.isUnifiedMode;
      char.showSkeleton = sc.showSkeleton;
      char.leftEyeGaze.pitchDeg = sc.leftEyeGaze.pitchDeg;
      char.leftEyeGaze.yawDeg = sc.leftEyeGaze.yawDeg;
      char.rightEyeGaze.pitchDeg = sc.rightEyeGaze.pitchDeg;
      char.rightEyeGaze.yawDeg = sc.rightEyeGaze.yawDeg;

      if (sc.jointRotations) {
        for (const [jId, rot] of Object.entries(sc.jointRotations)) {
          char.setJointRotation(jId, rot.pitchDeg, rot.yawDeg, rot.rollDeg);
        }
      }
      return char;
    });

    setCharacters(restored);
    setActiveCharacterId(project.activeCharacterId || restored[0].id);
    if (project.referenceConfig) {
      setReferenceConfig(project.referenceConfig);
    }
    if (project.viewportSettings) {
      setSettings(project.viewportSettings);
    }
    if (sceneRef.current) {
      sceneRef.current.setCharacters(restored, project.activeCharacterId || restored[0].id);
      if (project.viewportSettings) sceneRef.current.updateSettings(project.viewportSettings);
      if (project.referenceConfig) sceneRef.current.updateReferenceConfig(project.referenceConfig);
    }
    forceSceneUpdate();
  }, [forceSceneUpdate]);

  // Periodic autosave for resilience
  useEffect(() => {
    const timer = setTimeout(() => {
      const proj = getCurrentProjectData('Autosaved Study');
      ProjectStorage.autoSave(proj);
    }, 2000);
    return () => clearTimeout(timer);
  }, [characters, referenceConfig, settings, getCurrentProjectData]);

  // Export current character deformed mesh as standard Wavefront OBJ
  const handleExportOBJ = useCallback(() => {
    if (!activeChar) return;

    const lines: string[] = [
      `# EYEW Procedural Humanoid Body Generator`,
      `# Character: ${activeChar.name}`,
      `# Height: ${activeChar.proportions.totalHeight} units`,
      `# Pose: ${activeChar.activePosePreset}`,
      `# Mode: ${activeChar.isUnifiedMode ? 'Unified' : 'Prototype'}`,
      '',
    ];

    let vertexOffset = 0;
    for (const part of activeChar.bodyData.parts) {
      lines.push(`o ${part.name.replace(/\s+/g, '_')}`);
      const deformedVerts = activeChar.getDeformedPartVertices(part.id);

      for (const v of deformedVerts) {
        lines.push(`v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
      }
      for (const n of part.baseMeshData.normals) {
        lines.push(`vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}`);
      }
      for (const uv of part.baseMeshData.uvs) {
        lines.push(`vt ${uv[0].toFixed(4)} ${uv[1].toFixed(4)}`);
      }

      for (const tri of part.baseMeshData.triangles) {
        const i0 = tri.i0 + 1 + vertexOffset;
        const i1 = tri.i1 + 1 + vertexOffset;
        const i2 = tri.i2 + 1 + vertexOffset;
        lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
      }
      vertexOffset += part.baseMeshData.vertices.length;
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EYEW_${activeChar.name.replace(/\s+/g, '_')}_Mesh.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeChar]);

  return (
    <div className="flex flex-col h-[100dvh] min-h-0 w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Offline Mode Indicator */}
      <OfflineIndicator />

      {/* Top Application Header */}
      <TopToolbar
        characters={characters}
        activeCharacterId={activeCharacterId}
        onSelectCharacter={handleSelectCharacter}
        onAddCharacter={handleAddCharacter}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetPose={handleResetPose}
        onResetCamera={handleResetCamera}
        onToggleUnifiedMode={handleToggleUnifiedMode}
        onToggleSkeleton={handleToggleSkeleton}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onExportOBJ={handleExportOBJ}
        layoutMode={layoutMode}
        onSetLayoutMode={(m) => {
          setLayoutMode(m);
          if (m === 'preview') {
            setIsDrawerOpen(false);
          }
        }}
        onToggleReferenceImage={() => setReferenceConfig((prev) => ({ ...prev, visible: !prev.visible }))}
        referenceVisible={referenceConfig.visible}
        onOpenProjects={() => setIsProjectModalOpen(true)}
        onToggleTargetPlane={handleToggleTargetPlane}
        targetPlaneVisible={settings.showTargetPlane}
      />

      {/* Main Workspace with Dynamic Responsive Layout */}
      <div className="relative flex-1 min-h-0 min-w-0 flex overflow-hidden pb-16">
        {/* LAYOUT 1: SPLIT VIEW (Left 3D Preview | Right Selected Panel) */}
        {layoutMode === 'split' && (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Left Column: 3D Preview (65% on mobile, full height on desktop) */}
            <div className="flex-1 min-h-0 min-w-0 h-[65%] md:h-full relative border-b md:border-b-0 md:border-r border-slate-800">
              <Viewport3D
                characters={characters}
                activeCharacterId={activeCharacterId}
                settings={settings}
                referenceConfig={referenceConfig}
                onCameraChange={handleCameraChange}
                onGazeEvaluated={handleGazeEvaluated}
                onSceneReady={handleSceneReady}
              />
              {/* Reference Image Overlay on Viewport */}
              <ReferenceImageOverlay
                config={referenceConfig}
                onUpdateConfig={handleUpdateReferenceConfig}
              />
            </div>

            {/* Right Column: Selected Panel (35% on mobile, full height on desktop) */}
            <div className="w-full md:w-96 lg:w-[420px] h-[35%] md:h-full bg-slate-900/95 flex flex-col overflow-hidden border-slate-800">
              <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Editing Character
                  </div>
                  <div className="text-sm font-bold text-sky-400">
                    {activeChar.name}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleTargetPlane}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                      settings.showTargetPlane
                        ? 'bg-amber-950 text-amber-300 border-amber-800/80'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title="Toggle Target Board"
                  >
                    🎯 {settings.showTargetPlane ? 'Target ON' : 'Target OFF'}
                  </button>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold">
                    {activeMobileTab.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <SelectedPanelContent
                  activeTab={activeMobileTab}
                  character={activeChar}
                  gazeData={gazeData}
                  onUpdateCharacter={forceSceneUpdate}
                  onResetPose={handleResetPose}
                  referenceConfig={referenceConfig}
                  onUpdateReferenceConfig={handleUpdateReferenceConfig}
                  showTargetPlane={settings.showTargetPlane}
                  onToggleTargetPlane={handleToggleTargetPlane}
                />
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT 2: PREVIEW ONLY (Full Viewport, with Bottom Drawer when tabs tapped) */}
        {layoutMode === 'preview' && (
          <div className="flex-1 min-h-0 min-w-0 h-full w-full relative">
            <Viewport3D
              characters={characters}
              activeCharacterId={activeCharacterId}
              settings={settings}
              referenceConfig={referenceConfig}
              onCameraChange={handleCameraChange}
              onGazeEvaluated={handleGazeEvaluated}
              onSceneReady={handleSceneReady}
            />

            {/* Reference Image Overlay on Viewport */}
            <ReferenceImageOverlay
              config={referenceConfig}
              onUpdateConfig={handleUpdateReferenceConfig}
            />

            {/* Bottom Drawer Sheet for Selected Panel */}
            <MobileDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              activeTab={activeMobileTab}
              character={activeChar}
            >
              <SelectedPanelContent
                activeTab={activeMobileTab}
                character={activeChar}
                gazeData={gazeData}
                onUpdateCharacter={forceSceneUpdate}
                onResetPose={handleResetPose}
                referenceConfig={referenceConfig}
                onUpdateReferenceConfig={handleUpdateReferenceConfig}
                showTargetPlane={settings.showTargetPlane}
                onToggleTargetPlane={handleToggleTargetPlane}
              />
            </MobileDrawer>
          </div>
        )}

        {/* LAYOUT 3: PANEL ONLY */}
        {layoutMode === 'panel' && (
          <div className="flex-1 min-h-0 min-w-0 h-full w-full max-w-2xl mx-auto bg-slate-900/95 flex flex-col overflow-hidden border-x border-slate-800">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Panel Inspector
                </span>
                <h2 className="text-base font-bold text-sky-400">{activeChar.name}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleTargetPlane}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                    settings.showTargetPlane
                      ? 'bg-amber-950 text-amber-300 border-amber-800/80'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  🎯 {settings.showTargetPlane ? 'Target ON' : 'Target OFF'}
                </button>
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold">
                  {activeMobileTab.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SelectedPanelContent
                activeTab={activeMobileTab}
                character={activeChar}
                gazeData={gazeData}
                onUpdateCharacter={forceSceneUpdate}
                onResetPose={handleResetPose}
                referenceConfig={referenceConfig}
                onUpdateReferenceConfig={handleUpdateReferenceConfig}
                showTargetPlane={settings.showTargetPlane}
                onToggleTargetPlane={handleToggleTargetPlane}
              />
            </div>
          </div>
        )}

        {/* Compact status overlay; do not let diagnostics consume viewport layout width */}
        <StatusBar
          activeCharacter={activeChar}
          characterCount={characters.length}
          cameraInfo={cameraInfo}
          geometryStats={geometryStats}
          gazeData={gazeData}
        />
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom with nav icons) */}
      <MobileBottomNav
        activeTab={activeMobileTab}
        onSelectTab={(tab) => {
          setActiveMobileTab(tab);
          if (tab === 'preview') {
            setLayoutMode('preview');
            setIsDrawerOpen(false);
          } else {
            if (layoutMode === 'preview') {
              setIsDrawerOpen(true);
            }
          }
        }}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={(open) => setIsDrawerOpen(open)}
        characterName={activeChar.name}
        hasReferenceImage={referenceConfig.visible}
      />

      {/* Project Persistence Modal */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentProject={getCurrentProjectData()}
        onLoadProject={handleLoadProject}
        onSaveCurrentProject={handleSaveCurrentProject}
      />

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
      />
    </div>
  );
}
