/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Maximize2,
  Minimize2,
  X,
  User,
  Camera,
  ImageIcon,
  Target,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { CharacterModel } from '../body/CharacterModel';
import { Vec3 } from '../math/Vec3';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { ViewportSettings } from '../rendering/EyeScene';

export type TranslateTargetMode = 'actor' | 'camera' | 'reference' | 'target';

interface TranslateArrowsWidgetProps {
  visible: boolean;
  onClose: () => void;
  activeCharacter?: CharacterModel;
  onUpdateCharacter?: () => void;
  referenceConfig?: ReferenceImageConfig;
  onUpdateReferenceConfig?: (config: Partial<ReferenceImageConfig>) => void;
  targetPlaneZ?: number;
  onUpdateSettings?: (settings: Partial<ViewportSettings>) => void;
  onPanCamera?: (deltaX: number, deltaY: number) => void;
  onZoomCamera?: (factor: number) => void;
  onResetCamera?: () => void;
}

export const TranslateArrowsWidget: React.FC<TranslateArrowsWidgetProps> = ({
  visible,
  onClose,
  activeCharacter,
  onUpdateCharacter,
  referenceConfig,
  onUpdateReferenceConfig,
  targetPlaneZ = 120,
  onUpdateSettings,
  onPanCamera,
  onZoomCamera,
  onResetCamera,
}) => {
  const [targetMode, setTargetMode] = useState<TranslateTargetMode>('actor');
  const [stepSize, setStepSize] = useState<number>(5);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!visible) return null;

  // Translation Actions
  const handleTranslate = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (targetMode === 'actor' && activeCharacter) {
      if (axis === 'x') {
        activeCharacter.setPosition(
          new Vec3(activeCharacter.position.x + delta, activeCharacter.position.y, activeCharacter.position.z)
        );
      } else if (axis === 'y') {
        // Enforce Y >= 0 (never negative)
        activeCharacter.setPositionY(activeCharacter.position.y + delta);
      } else if (axis === 'z') {
        activeCharacter.setPosition(
          new Vec3(activeCharacter.position.x, activeCharacter.position.y, activeCharacter.position.z + delta)
        );
      }
      onUpdateCharacter?.();
    } else if (targetMode === 'camera') {
      if (axis === 'x') {
        onPanCamera?.(delta, 0);
      } else if (axis === 'y') {
        onPanCamera?.(0, delta);
      } else if (axis === 'z') {
        onZoomCamera?.(delta > 0 ? 0.85 : 1.18);
      }
    } else if (targetMode === 'reference' && referenceConfig && onUpdateReferenceConfig) {
      const currentPos = referenceConfig.worldPosition || { x: 0, y: 90, z: -15 };
      const newPos = {
        x: axis === 'x' ? currentPos.x + delta : currentPos.x,
        y: axis === 'y' ? currentPos.y + delta : currentPos.y,
        z: axis === 'z' ? currentPos.z + delta : currentPos.z,
      };
      onUpdateReferenceConfig({ worldPosition: newPos });
    } else if (targetMode === 'target' && onUpdateSettings) {
      if (axis === 'z') {
        onUpdateSettings({ targetPlaneZ: targetPlaneZ + delta });
      } else if (referenceConfig && onUpdateReferenceConfig) {
        const currentPos = referenceConfig.worldPosition || { x: 0, y: 90, z: targetPlaneZ };
        const newPos = {
          x: axis === 'x' ? currentPos.x + delta : currentPos.x,
          y: axis === 'y' ? currentPos.y + delta : currentPos.y,
          z: currentPos.z,
        };
        onUpdateReferenceConfig({ worldPosition: newPos });
      }
    }
  };

  const handleResetPosition = () => {
    if (targetMode === 'actor' && activeCharacter) {
      activeCharacter.setPosition(new Vec3(0, 0, 0));
      onUpdateCharacter?.();
    } else if (targetMode === 'camera') {
      onResetCamera?.();
    } else if (targetMode === 'reference' && onUpdateReferenceConfig) {
      onUpdateReferenceConfig({ worldPosition: { x: 0, y: 90, z: -15 } });
    } else if (targetMode === 'target' && onUpdateSettings) {
      onUpdateSettings({ targetPlaneZ: 120 });
    }
  };

  // Minimized Compact Pill
  if (isMinimized) {
    return (
      <div className="absolute top-16 left-4 z-20 select-none">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-mono text-sky-400 shadow-xl transition-all cursor-pointer backdrop-blur-md"
          title="Expand Translation UDLR Arrows D-Pad"
        >
          <Move className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold">UDLR Arrows</span>
          <Maximize2 className="w-3 h-3 text-slate-400 ml-1" />
        </button>
      </div>
    );
  }

  // Current coordinate display text
  let coordText = '';
  if (targetMode === 'actor' && activeCharacter) {
    coordText = `X: ${activeCharacter.position.x.toFixed(0)} | Y: ${activeCharacter.position.y.toFixed(0)} | Z: ${activeCharacter.position.z.toFixed(0)}`;
  } else if (targetMode === 'reference') {
    const p = referenceConfig?.worldPosition || { x: 0, y: 90, z: -15 };
    coordText = `X: ${p.x.toFixed(0)} | Y: ${p.y.toFixed(0)} | Z: ${p.z.toFixed(0)}`;
  } else if (targetMode === 'target') {
    coordText = `Plane Z: ${targetPlaneZ.toFixed(0)}u`;
  } else if (targetMode === 'camera') {
    coordText = `Pan & Zoom Navigation`;
  }

  return (
    <div className="absolute top-16 left-4 z-20 select-none max-w-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="flex flex-col bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 shadow-2xl text-slate-300 w-64">
        {/* Header: Title, Minimize & Close */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Move className="w-3.5 h-3.5 text-sky-400" />
            <span>Translate (UDLR)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
              title="Minimize to Pill"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 transition-colors"
              title="Hide Translate Arrows"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Selector Tabs: Actor | Camera | Ref Photo | Target */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-900 rounded-lg mb-2 text-[10px] font-medium">
          <button
            onClick={() => setTargetMode('actor')}
            className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
              targetMode === 'actor'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Translate Selected Actor"
          >
            <User className="w-3 h-3" />
            <span>Actor</span>
          </button>
          <button
            onClick={() => setTargetMode('camera')}
            className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
              targetMode === 'camera'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pan Camera in Viewport"
          >
            <Camera className="w-3 h-3" />
            <span>Cam</span>
          </button>
          <button
            onClick={() => setTargetMode('reference')}
            className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
              targetMode === 'reference'
                ? 'bg-pink-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Translate 3D Reference Photo Plane"
          >
            <ImageIcon className="w-3 h-3" />
            <span>Ref</span>
          </button>
          <button
            onClick={() => setTargetMode('target')}
            className={`py-1 rounded flex items-center justify-center gap-1 transition-colors ${
              targetMode === 'target'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Translate Target Board (Z Depth)"
          >
            <Target className="w-3 h-3" />
            <span>Board</span>
          </button>
        </div>

        {/* Live Coordinate Info */}
        <div className="text-[10px] font-mono text-center text-slate-400 bg-slate-900/60 py-0.5 px-2 rounded mb-2 truncate">
          {coordText}
        </div>

        {/* 5-Button Cross D-Pad (Up, Down, Left, Right + Center Reset) */}
        <div className="flex flex-col items-center gap-1.5 my-1">
          {/* UP Button (↑) */}
          <button
            onClick={() => handleTranslate('y', stepSize)}
            className="w-12 h-10 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:scale-95 border border-slate-700/80 hover:border-sky-500 text-slate-200 hover:text-white flex flex-col items-center justify-center shadow-md transition-all cursor-pointer group"
            title={`Translate UP (+Y ${stepSize}u)`}
          >
            <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[8px] font-mono opacity-60">+Y</span>
          </button>

          {/* MIDDLE ROW: LEFT (←), CENTER RESET, RIGHT (→) */}
          <div className="flex items-center gap-1.5">
            {/* LEFT Button (←) */}
            <button
              onClick={() => handleTranslate('x', -stepSize)}
              className="w-12 h-10 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:scale-95 border border-slate-700/80 hover:border-sky-500 text-slate-200 hover:text-white flex flex-col items-center justify-center shadow-md transition-all cursor-pointer group"
              title={`Translate LEFT (-X ${stepSize}u)`}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[8px] font-mono opacity-60">-X</span>
            </button>

            {/* CENTER Button: Reset / Center */}
            <button
              onClick={handleResetPosition}
              className="w-12 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 text-amber-400 hover:text-amber-300 flex flex-col items-center justify-center shadow-md transition-all cursor-pointer"
              title="Reset to Center / Origin (0,0,0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[8px] font-mono">Zero</span>
            </button>

            {/* RIGHT Button (→) */}
            <button
              onClick={() => handleTranslate('x', stepSize)}
              className="w-12 h-10 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:scale-95 border border-slate-700/80 hover:border-sky-500 text-slate-200 hover:text-white flex flex-col items-center justify-center shadow-md transition-all cursor-pointer group"
              title={`Translate RIGHT (+X ${stepSize}u)`}
            >
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span className="text-[8px] font-mono opacity-60">+X</span>
            </button>
          </div>

          {/* DOWN Button (↓) */}
          <button
            onClick={() => handleTranslate('y', -stepSize)}
            className="w-12 h-10 rounded-xl bg-slate-800/90 hover:bg-sky-600 active:scale-95 border border-slate-700/80 hover:border-sky-500 text-slate-200 hover:text-white flex flex-col items-center justify-center shadow-md transition-all cursor-pointer group"
            title={`Translate DOWN (-Y ${stepSize}u, ≥ 0)`}
          >
            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            <span className="text-[8px] font-mono opacity-60">-Y</span>
          </button>
        </div>

        {/* Depth (Z-Axis / Depth / Zoom) Row */}
        <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => handleTranslate('z', stepSize)}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer text-slate-300"
            title={`Translate Forward / Closer (+Z ${stepSize}u)`}
          >
            <span>Front (+Z)</span>
          </button>
          <button
            onClick={() => handleTranslate('z', -stepSize)}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer text-slate-300"
            title={`Translate Backward / Deeper (-Z ${stepSize}u)`}
          >
            <span>Back (-Z)</span>
          </button>
        </div>

        {/* Step Size Selector (1u, 5u, 10u, 25u) */}
        <div className="flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-slate-800/50 text-[10px]">
          <span className="text-slate-500 text-[9px]">Step:</span>
          {[1, 5, 10, 25].map((s) => (
            <button
              key={s}
              onClick={() => setStepSize(s)}
              className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors ${
                stepSize === s
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {s}u
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
