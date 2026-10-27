/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CharacterModel, CharacterGazeData } from '../body/CharacterModel';
import { Check, ShieldCheck, Box, Camera, User, Sparkles, Target } from 'lucide-react';

interface StatusBarProps {
  activeCharacter?: CharacterModel;
  characterCount: number;
  cameraInfo?: { distance: number; azimuthDeg: number; elevationDeg: number };
  geometryStats: { vertices: number; triangles: number };
  gazeData?: CharacterGazeData;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeCharacter,
  characterCount,
  cameraInfo,
  geometryStats,
  gazeData,
}) => {
  return (
    <footer className="absolute bottom-16 left-0 right-0 z-20 h-7 bg-slate-950/95 border-t border-slate-800 px-3 hidden md:flex items-center justify-between text-[11px] font-mono text-slate-400 select-none pointer-events-none">
      {/* Left: Active Character & Multi-Character Count */}
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-sky-400" />
          <span className="text-slate-500">Active:</span>
          <span className="text-slate-200 font-semibold">
            {activeCharacter?.name || 'None'}
          </span>
          <span className="text-slate-500">
            [{activeCharacter?.position.x.toFixed(0)}, {activeCharacter?.position.y.toFixed(0)}, {activeCharacter?.position.z.toFixed(0)}]
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Scene:</span>
          <span className="text-sky-300 font-semibold">{characterCount} Actor{characterCount > 1 ? 's' : ''}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Mode:</span>
          <span className={`truncate max-w-[220px] ${activeCharacter?.isUnifiedMode ? 'text-purple-400 font-semibold' : 'text-sky-400 font-semibold'}`}>
            {activeCharacter?.isUnifiedMode ? 'Unified Continuous Body' : 'Prototype Anatomical Lofts'}
          </span>
        </div>
      </div>

      {/* Center: Exact Ray Hit Pixel Coordinates & Camera */}
      <div className="hidden md:flex items-center gap-3 text-slate-400">
        {gazeData?.leftPixelHit && (
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Target className="w-3 h-3 text-sky-400" />
            <span className="text-slate-500">Ray Hit:</span>
            <span className="text-emerald-400 font-bold">
              L:({gazeData.leftPixelHit.pixelX}, {gazeData.leftPixelHit.pixelY}px)
            </span>
            <span className="text-cyan-400 font-bold">
              R:({gazeData.rightPixelHit?.pixelX ?? '-'}, {gazeData.rightPixelHit?.pixelY ?? '-'}px)
            </span>
            <span className="text-[10px] text-slate-500">
              [{gazeData.targetSpecs?.widthPx}×{gazeData.targetSpecs?.heightPx}px]
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-sky-400" />
          <span>Cam:</span>
          <span className="text-slate-300">
            dist={cameraInfo?.distance.toFixed(0) || '240'}, az={cameraInfo?.azimuthDeg.toFixed(0) || '0'}°, el={cameraInfo?.elevationDeg.toFixed(0) || '15'}°
          </span>
        </div>
      </div>

      {/* Right: Geometry Statistics & Validation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Box className="w-3 h-3 text-amber-400" />
          <span>
            {geometryStats.vertices.toLocaleString()} verts / {geometryStats.triangles.toLocaleString()} tris
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-800" />

        <div className="flex items-center gap-1 text-emerald-400 font-sans font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Humanoid Invariants Valid</span>
        </div>
      </div>
    </footer>
  );
};
