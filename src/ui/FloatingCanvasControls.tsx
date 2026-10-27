/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Camera } from 'lucide-react';

interface FloatingCanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onPresetView: (preset: 'front' | 'side' | 'fullbody' | 'perspective') => void;
}

export const FloatingCanvasControls: React.FC<FloatingCanvasControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onPresetView,
}) => {
  return (
    <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-10 select-none">
      {/* Zoom Widget (matching IMG_0682 zoom pill) */}
      <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-2xl backdrop-blur-xs text-slate-300">
        <button
          onClick={onZoomIn}
          className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 mx-1" />
        <button
          onClick={onResetCamera}
          className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Reset Frame / Focus"
        >
          <Maximize className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 mx-1" />
        <button
          onClick={onZoomOut}
          className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Camera Angle Presets (Mobile friendly pill) */}
      <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-xl text-[10px] font-mono text-slate-300">
        <button
          onClick={() => onPresetView('perspective')}
          className="px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-center"
          title="3D Perspective"
        >
          3D
        </button>
        <button
          onClick={() => onPresetView('front')}
          className="px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-center"
          title="Front (+Z)"
        >
          +Z
        </button>
        <button
          onClick={() => onPresetView('fullbody')}
          className="px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-center"
          title="Body"
        >
          FIT
        </button>
      </div>
    </div>
  );
};
