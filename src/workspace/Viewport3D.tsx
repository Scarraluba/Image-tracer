/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { EyeScene, ViewportSettings, SceneGazeAverage } from '../rendering/EyeScene';
import { CharacterModel, CharacterGazeData } from '../body/CharacterModel';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { Camera, User, Crosshair } from 'lucide-react';
import { FloatingCanvasControls } from '../ui/FloatingCanvasControls';

interface Viewport3DProps {
  characters: CharacterModel[];
  activeCharacterId: string;
  settings: ViewportSettings;
  referenceConfig?: ReferenceImageConfig;
  onCameraChange: (camInfo: { distance: number; azimuthDeg: number; elevationDeg: number }) => void;
  onGazeEvaluated?: (data: CharacterGazeData, averageGaze?: SceneGazeAverage) => void;
  onSceneReady?: (scene: EyeScene) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  characters,
  activeCharacterId,
  settings,
  referenceConfig,
  onCameraChange,
  onGazeEvaluated,
  onSceneReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EyeScene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new EyeScene(mountRef.current, characters, settings, {
      onCameraChange,
      onGazeEvaluated,
    });
    sceneRef.current = scene;
    if (referenceConfig) {
      scene.setReferenceImage(referenceConfig);
    }
    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []); // Mount once

  // Push updates to scene instance without re-mounting canvas
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCharacters(characters, activeCharacterId);
    }
  }, [characters, activeCharacterId]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setViewportSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (sceneRef.current && referenceConfig) {
      sceneRef.current.setReferenceImage(referenceConfig);
    }
  }, [referenceConfig]);

  const handleCameraPreset = (preset: 'front' | 'top' | 'side' | 'perspective' | 'fullbody') => {
    sceneRef.current?.setCameraPreset(preset);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD - Camera Presets */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs text-slate-300 shadow-xl z-10">
        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
          <Camera className="w-3 h-3 text-sky-400" /> View
        </span>
        <button
          onClick={() => handleCameraPreset('perspective')}
          className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
          title="3/4 Perspective View"
        >
          3D Angle
        </button>
        <button
          onClick={() => handleCameraPreset('fullbody')}
          className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
          title="Full Standing Body"
        >
          Full Body
        </button>
        <button
          onClick={() => handleCameraPreset('front')}
          className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
          title="Front View (+Z)"
        >
          Front (+Z)
        </button>
        <button
          onClick={() => handleCameraPreset('side')}
          className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
          title="Profile View (+X)"
        >
          Profile (+X)
        </button>
        <button
          onClick={() => handleCameraPreset('top')}
          className="px-2.5 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
          title="Top View (+Y)"
        >
          Top (+Y)
        </button>
      </div>

      {/* Axis Orientation Legend Overlay (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-900/85 border border-slate-800/80 rounded-md px-3 py-2 text-[11px] text-slate-300 font-mono flex flex-col gap-1 z-10 hidden sm:flex">
        <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <User className="w-3 h-3 text-sky-400" /> Humanoid Bind Pose (H = 180)
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> +X (Left)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> +Y (Up)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> +Z (Front)
          </span>
        </div>
      </div>

      {/* Floating Canvas Zoom & Frame Controls (Matching IMG_0682) */}
      <FloatingCanvasControls
        onZoomIn={() => sceneRef.current?.zoomCamera(0.8)}
        onZoomOut={() => sceneRef.current?.zoomCamera(1.25)}
        onResetCamera={() => sceneRef.current?.setCameraPreset('fullbody')}
        onPresetView={handleCameraPreset}
      />
    </div>
  );
};
