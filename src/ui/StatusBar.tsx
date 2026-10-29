/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterModel, CharacterGazeData } from '../body/CharacterModel';
import {
  ShieldCheck,
  Box,
  Camera,
  User,
  Target,
  ChevronDown,
  ChevronUp,
  Grid,
  Activity,
  Layers,
} from 'lucide-react';

import { SceneGazeAverage } from '../rendering/EyeScene';

interface StatusBarProps {
  activeCharacter?: CharacterModel;
  characterCount: number;
  cameraInfo?: { distance: number; azimuthDeg: number; elevationDeg: number };
  geometryStats: { vertices: number; triangles: number };
  gazeData?: CharacterGazeData;
  isWireframe?: boolean;
  onToggleWireframe?: () => void;
  sceneGazeAverage?: SceneGazeAverage;
  showSoccerBall?: boolean;
  onToggleSoccerBall?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeCharacter,
  characterCount,
  cameraInfo,
  geometryStats,
  gazeData,
  isWireframe = false,
  onToggleWireframe,
  sceneGazeAverage,
  showSoccerBall = true,
  onToggleSoccerBall,
}) => {
  // Collapsed by default on mobile screens so it never pushes or covers elements
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-18 left-3 right-3 pointer-events-none z-25 flex flex-col items-end select-none transition-all">
      {/* Collapsed Compact Floating HUD Pill (Zero displacement, completely non-intrusive) */}
      {!isExpanded ? (
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 px-3 py-1.5 rounded-full shadow-lg hover:border-slate-700 transition-colors">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
            title="Expand Full Mathematical & Gaze HUD"
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>HUD</span>
            <ChevronUp className="w-3 h-3 text-slate-400" />
          </button>

          <span className="text-slate-600">|</span>

          {/* Quick Wireframe Toggle Pill */}
          {onToggleWireframe && (
            <button
              onClick={onToggleWireframe}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                isWireframe
                  ? 'bg-purple-950 text-purple-300 border-purple-700/80'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Wireframe Mode"
            >
              <Grid className="w-3 h-3 text-purple-400" />
              <span>{isWireframe ? 'Wire ON' : 'Wire'}</span>
            </button>
          )}

          {/* Quick Soccer Ball Toggle Pill */}
          {onToggleSoccerBall && (
            <button
              onClick={onToggleSoccerBall}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                showSoccerBall
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle 3D Soccer Ball at Gaze Center Point"
            >
              <span className="text-[10px]">⚽</span>
              <span>{showSoccerBall ? 'Ball ON' : 'Ball OFF'}</span>
            </button>
          )}

          <span className="text-slate-600">|</span>

          {sceneGazeAverage && (
            <span className="text-emerald-400 font-medium">
              ⚽ Center: [{sceneGazeAverage.centerPoint.x.toFixed(0)}, {sceneGazeAverage.centerPoint.y.toFixed(0)}, {sceneGazeAverage.centerPoint.z.toFixed(0)}]
            </span>
          )}

          <span className="text-slate-400 truncate max-w-[80px] sm:max-w-none">
            {activeCharacter?.name || 'Actor'}
          </span>

          <span className="hidden sm:inline text-amber-400 font-medium">
            {geometryStats.triangles.toLocaleString()} tris
          </span>
        </div>
      ) : (
        /* Expanded Floating HUD Card (Does not displace viewport layout) */
        <div className="pointer-events-auto w-full max-w-4xl bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-slate-200">System HUD &amp; Multi-Actor Convergence</span>
              <div className="flex items-center gap-1 text-emerald-400 font-sans font-medium text-[10px] ml-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Invariants Valid</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Soccer Ball Toggle */}
              {onToggleSoccerBall && (
                <button
                  onClick={onToggleSoccerBall}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                    showSoccerBall
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle 3D Soccer Ball at Gaze Center Point"
                >
                  <span>⚽ Ball {showSoccerBall ? 'ON' : 'OFF'}</span>
                </button>
              )}

              {/* Quick Wireframe Toggle */}
              {onToggleWireframe && (
                <button
                  onClick={onToggleWireframe}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                    isWireframe
                      ? 'bg-purple-950 text-purple-300 border-purple-700/80'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle Global Wireframe"
                >
                  <Grid className="w-3 h-3 text-purple-400" />
                  <span>Wireframe {isWireframe ? 'ON' : 'OFF'}</span>
                </button>
              )}

              {/* Collapse Button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] transition-colors"
                title="Collapse HUD"
              >
                <span>Minimize</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Metrics Rows: 4 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {/* 1. Multi-Actor Gaze Convergence & 3D Soccer Ball */}
            <div className="flex flex-col gap-0.5 bg-slate-900/60 p-1.5 rounded border border-emerald-900/40">
              <div className="text-[10px] text-emerald-400 font-semibold uppercase flex items-center justify-between">
                <span>⚽ Gaze Center Point</span>
                <span className={`text-[9px] px-1 rounded ${showSoccerBall ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                  {showSoccerBall ? '3D Ball ON' : 'Hidden'}
                </span>
              </div>
              {sceneGazeAverage ? (
                <>
                  <div className="text-emerald-300 font-bold text-[11px]">
                    [{sceneGazeAverage.centerPoint.x.toFixed(1)}, {sceneGazeAverage.centerPoint.y.toFixed(1)}, {sceneGazeAverage.centerPoint.z.toFixed(1)}]
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Target: ({sceneGazeAverage.targetPlaneHitAverage?.pixelX ?? '-'}, {sceneGazeAverage.targetPlaneHitAverage?.pixelY ?? '-'}px)
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {sceneGazeAverage.rayCount} rays / {sceneGazeAverage.characterCount} actors
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic text-[10px]">Evaluating scene...</div>
              )}
            </div>

            {/* 2. Active Actor & Position */}
            <div className="flex flex-col gap-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-850">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Actor</div>
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <User className="w-3 h-3 text-sky-400" />
                <span>{activeCharacter?.name || 'None'}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({characterCount} in scene)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Pos: [{activeCharacter?.position.x.toFixed(0)}, {activeCharacter?.position.y.toFixed(0)}, {activeCharacter?.position.z.toFixed(0)}] · Y≥0
              </div>
            </div>

            {/* 3. Target Ray Hit */}
            <div className="flex flex-col gap-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-850">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Ray Hit</div>
              {gazeData?.leftPixelHit ? (
                <>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-emerald-400 text-[10px]">
                      L: ({gazeData.leftPixelHit.pixelX}, {gazeData.leftPixelHit.pixelY}px)
                    </span>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-bold">
                    R: ({gazeData.rightPixelHit?.pixelX ?? '-'}, {gazeData.rightPixelHit?.pixelY ?? '-'}px)
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic">No ray hit on target</div>
              )}
            </div>

            {/* 4. Geometry & Camera */}
            <div className="flex flex-col gap-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-850">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Geometry &amp; Camera</div>
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Box className="w-3 h-3" />
                <span>
                  {geometryStats.triangles.toLocaleString()} tris
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Camera className="w-3 h-3 text-sky-400" />
                <span>
                  Dist={cameraInfo?.distance.toFixed(0)} · Az={cameraInfo?.azimuthDeg.toFixed(0)}°
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
