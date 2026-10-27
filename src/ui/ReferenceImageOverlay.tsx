/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { Move, Eye, EyeOff, Maximize2, Lock, Unlock, X } from 'lucide-react';

interface ReferenceImageOverlayProps {
  config: ReferenceImageConfig;
  onUpdateConfig: (newConfig: Partial<ReferenceImageConfig>) => void;
}

export const ReferenceImageOverlay: React.FC<ReferenceImageOverlayProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number }>({
    x: 0,
    y: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  // Only render 2D overlay when 2D mode is enabled.
  // In 3D mode (is2D === false), it renders as a fixed plane in the 3D world inside EyeScene!
  if (!config.visible || !config.url || !config.is2D) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from handle or background when allowed
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: config.offsetX,
      initialOffsetY: config.offsetY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    onUpdateConfig({
      offsetX: Math.round(dragStartRef.current.initialOffsetX + dx),
      offsetY: Math.round(dragStartRef.current.initialOffsetY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-15"
      style={{ userSelect: 'none' }}
    >
      {/* Draggable and Resizable Reference Container */}
      <div
        className="pointer-events-auto relative group border-2 border-sky-400/60 rounded-lg shadow-2xl transition-shadow bg-slate-950/20"
        style={{
          width: `${config.widthPx}px`,
          height: `${config.heightPx}px`,
          transform: `translate(${config.offsetX}px, ${config.offsetY}px)`,
          opacity: config.opacity,
        }}
      >
        {/* The Reference Image */}
        <img
          src={config.url}
          alt={config.name}
          className="w-full h-full object-contain pointer-events-none select-none rounded"
          draggable={false}
        />

        {/* Floating Toolbar & Pixel Badge on Hover/Active */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 shadow-lg backdrop-blur-xs select-none">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-move p-0.5 rounded hover:bg-slate-800 text-sky-400"
            title="Drag to reposition reference image"
          >
            <Move className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-100">
            {config.widthPx} × {config.heightPx} px
          </span>
          <span className="text-[10px] text-slate-400">
            ({Math.round(config.opacity * 100)}%)
          </span>
          <button
            onClick={() => onUpdateConfig({ is2D: false })}
            className="px-1.5 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-[10px] font-sans font-medium transition-colors"
            title="Switch to 3D World Space (Fixed position in 3D scene, doesn't move with camera)"
          >
            3D World
          </button>
          <button
            onClick={() => onUpdateConfig({ visible: false })}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-0.5"
            title="Hide reference image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
