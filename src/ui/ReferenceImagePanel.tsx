/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  ReferenceImageConfig,
  SAMPLE_REFERENCE_IMAGES,
  MAX_REFERENCE_WIDTH_PX,
  MAX_REFERENCE_HEIGHT_PX,
  TargetCouplingMode,
} from '../reference/ReferenceImageModel';
import { UploadToCloudinary } from '../storage/CloudinaryService';
import {
  ImageIcon,
  Upload,
  Lock,
  Unlock,
  RotateCcw,
  Eye,
  EyeOff,
  Maximize2,
  Globe,
  Layers,
  Box,
  Compass,
  Sparkles,
  Cloud,
  Check,
  Target,
  ArrowLeftRight,
  ArrowUpDown,
  Repeat,
  Sliders,
} from 'lucide-react';

interface ReferenceImagePanelProps {
  config: ReferenceImageConfig;
  onUpdateConfig: (newConfig: Partial<ReferenceImageConfig>) => void;
  showTargetPlane?: boolean;
  onToggleTargetPlane?: () => void;
}

export const ReferenceImagePanel: React.FC<ReferenceImagePanelProps> = ({
  config,
  onUpdateConfig,
  showTargetPlane = true,
  onToggleTargetPlane,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Handle local file upload + Cloudinary + Offline IndexedDB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Processing & hashing image...');

    try {
      const uploadRes = await UploadToCloudinary(file);
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || 800;
        const nh = img.naturalHeight || 600;
        const initialW = Math.min(MAX_REFERENCE_WIDTH_PX, nw);
        const initialH = Math.min(MAX_REFERENCE_HEIGHT_PX, nh);

        onUpdateConfig({
          url: uploadRes.url,
          cloudinaryUrl: uploadRes.publicId ? uploadRes.url : undefined,
          imageHash: uploadRes.hash,
          name: file.name,
          visible: true,
          nativeWidth: nw,
          nativeHeight: nh,
          widthPx: initialW,
          heightPx: initialH,
          offsetX: 0,
          offsetY: 0,
        });

        setUploading(false);
        setUploadStatus(
          uploadRes.isOfflineCached
            ? 'Cached locally (Offline Ready)'
            : 'Uploaded to Cloudinary (sisis/images)'
        );
      };
      img.src = uploadRes.url;
    } catch (err: unknown) {
      console.error(err);
      setUploading(false);
      setUploadStatus('Upload error, image fallback active');
    }
  };

  const handleWidthChange = (newWidthPx: number) => {
    const clampedW = Math.max(20, Math.min(MAX_REFERENCE_WIDTH_PX, newWidthPx));
    if (config.aspectRatioLocked && config.widthPx > 0) {
      const ratio = config.heightPx / config.widthPx;
      const newHeightPx = Math.round(
        Math.max(20, Math.min(MAX_REFERENCE_HEIGHT_PX, clampedW * ratio))
      );
      onUpdateConfig({ widthPx: clampedW, heightPx: newHeightPx });
    } else {
      onUpdateConfig({ widthPx: clampedW });
    }
  };

  const handleHeightChange = (newHeightPx: number) => {
    const clampedH = Math.max(20, Math.min(MAX_REFERENCE_HEIGHT_PX, newHeightPx));
    if (config.aspectRatioLocked && config.heightPx > 0) {
      const ratio = config.widthPx / config.heightPx;
      const newWidthPx = Math.round(
        Math.max(20, Math.min(MAX_REFERENCE_WIDTH_PX, clampedH * ratio))
      );
      onUpdateConfig({ widthPx: newWidthPx, heightPx: clampedH });
    } else {
      onUpdateConfig({ heightPx: clampedH });
    }
  };

  const handleResetToNative = () => {
    if (config.nativeWidth > 0 && config.nativeHeight > 0) {
      const clampedW = Math.min(MAX_REFERENCE_WIDTH_PX, config.nativeWidth);
      const clampedH = Math.min(MAX_REFERENCE_HEIGHT_PX, config.nativeHeight);
      onUpdateConfig({
        widthPx: clampedW,
        heightPx: clampedH,
      });
    }
  };

  const set3DPositionPreset = (x: number, y: number, z: number) => {
    onUpdateConfig({
      worldPosition: { x, y, z },
    });
  };

  return (
    <div className="space-y-4 text-xs font-sans text-slate-200">
      {/* 1. Upload & Visibility Header */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wide">
              Reference Photography
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateConfig({ visible: !config.visible })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                config.visible
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {config.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{config.visible ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>
        </div>

        {/* Upload Button & Cloudinary Status */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Processing Image...' : 'Upload Reference Photo'}</span>
          </button>

          {uploadStatus && (
            <div className="text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-sky-300 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{uploadStatus}</span>
            </div>
          )}

          {config.name && (
            <div className="text-[10px] text-slate-400 font-mono truncate px-1">
              Active: {config.name} ({config.nativeWidth} × {config.nativeHeight} native)
            </div>
          )}
        </div>
      </div>

      {/* 2. TARGET 🎯 BOARD VISIBILITY & COORDINATION MATCHING */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-sky-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-sky-400" /> Target 🎯 Board &amp; Coordinates
          </span>

          {onToggleTargetPlane && (
            <button
              onClick={onToggleTargetPlane}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showTargetPlane
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>{showTargetPlane ? 'Target Board ON' : 'Target Board OFF'}</span>
            </button>
          )}
        </div>

        {/* Coordination Alignment Controls */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-300 block">
            Coordination Matching &amp; Ray Inversion:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateConfig({ invertCoordX: !config.invertCoordX })}
              className={`p-2 rounded-lg border text-left text-[11px] transition-colors flex items-center justify-between ${
                config.invertCoordX
                  ? 'bg-purple-950/70 border-purple-700 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
                <span>Horiz. (X)</span>
              </div>
              <span className="text-[10px] font-mono px-1 rounded bg-slate-800">
                {config.invertCoordX ? 'Inverted' : 'Matched'}
              </span>
            </button>

            <button
              onClick={() => onUpdateConfig({ invertCoordY: !config.invertCoordY })}
              className={`p-2 rounded-lg border text-left text-[11px] transition-colors flex items-center justify-between ${
                config.invertCoordY
                  ? 'bg-purple-950/70 border-purple-700 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                <span>Vert. (Y)</span>
              </div>
              <span className="text-[10px] font-mono px-1 rounded bg-slate-800">
                {config.invertCoordY ? 'Inverted' : 'Matched'}
              </span>
            </button>
          </div>
        </div>

        {/* Opposite Target Board & Ray Scaling Coupling */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <Repeat className="w-3 h-3 text-amber-400" /> Opposite Board &amp; Ray Scaling
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {config.targetCouplingMode || 'direct'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { mode: 'direct', label: '1:1 Match' },
              { mode: 'opposite-scale', label: 'Opposite Scale' },
              { mode: 'opposite-depth', label: 'Opposite Z' },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() =>
                  onUpdateConfig({ targetCouplingMode: mode as TargetCouplingMode })
                }
                className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-colors text-center ${
                  (config.targetCouplingMode || 'direct') === mode
                    ? 'bg-amber-950 text-amber-200 border-amber-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.targetCouplingMode === 'opposite-scale' && (
            <div className="pt-1.5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-300">Opposite Reciprocal Scale Factor</span>
                <span className="font-mono text-amber-300 font-bold">
                  {(config.oppositeScaleFactor || 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.05"
                value={config.oppositeScaleFactor || 1.0}
                onChange={(e) =>
                  onUpdateConfig({ oppositeScaleFactor: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. SIZING IN PIXELS (PX) - Up to 4416 x 3336 */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" /> Dimensions in Pixels (Max 4416 × 3336)
          </span>

          <button
            onClick={() => onUpdateConfig({ aspectRatioLocked: !config.aspectRatioLocked })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
              config.aspectRatioLocked
                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                : 'bg-slate-800 text-slate-400'
            }`}
            title="Lock / Unlock Aspect Ratio"
          >
            {config.aspectRatioLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{config.aspectRatioLocked ? 'Locked' : 'Freeform'}</span>
          </button>
        </div>

        {/* Width in PX */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <label className="text-slate-300 font-medium">Width (px)</label>
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min="20"
                max={MAX_REFERENCE_WIDTH_PX}
                step="10"
                value={config.widthPx}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
                className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-sky-300 font-bold text-xs focus:border-sky-500 outline-none"
              />
              <span className="text-slate-400 font-bold">/ {MAX_REFERENCE_WIDTH_PX}</span>
            </div>
          </div>
          <input
            type="range"
            min="50"
            max={MAX_REFERENCE_WIDTH_PX}
            step="16"
            value={config.widthPx}
            onChange={(e) => handleWidthChange(parseInt(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>

        {/* Height in PX */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <label className="text-slate-300 font-medium">Height (px)</label>
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min="20"
                max={MAX_REFERENCE_HEIGHT_PX}
                step="10"
                value={config.heightPx}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 100)}
                className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-sky-300 font-bold text-xs focus:border-sky-500 outline-none"
              />
              <span className="text-slate-400 font-bold">/ {MAX_REFERENCE_HEIGHT_PX}</span>
            </div>
          </div>
          <input
            type="range"
            min="50"
            max={MAX_REFERENCE_HEIGHT_PX}
            step="16"
            value={config.heightPx}
            onChange={(e) => handleHeightChange(parseInt(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>

        {/* Resolution Presets */}
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
            Quick Resolution Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onUpdateConfig({ widthPx: 4416, heightPx: 3336 })}
              className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-200 text-[11px] font-mono font-bold transition-colors"
            >
              4416 × 3336 (Max)
            </button>
            <button
              onClick={() => onUpdateConfig({ widthPx: 1920, heightPx: 1080 })}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
            >
              1920 × 1080
            </button>
            <button
              onClick={() => onUpdateConfig({ widthPx: 1200, heightPx: 1500 })}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
            >
              1200 × 1500
            </button>
            <button
              onClick={handleResetToNative}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-sky-300 transition-colors"
            >
              Native ({config.nativeWidth}×{config.nativeHeight})
            </button>
          </div>
        </div>
      </div>

      {/* 4. 3D WORLD COORDINATES & EXPANDED WORLD HEIGHT */}
      {!config.is2D && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> 3D World Positioning &amp; Scale
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({config.worldPosition.x}, {config.worldPosition.y}, {config.worldPosition.z})
            </span>
          </div>

          {/* World Height Scale (Expanded from 10 to 2000 units) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-slate-300 font-medium">World Height Scale</span>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="5"
                  max="5000"
                  step="5"
                  value={config.worldHeight}
                  onChange={(e) =>
                    onUpdateConfig({ worldHeight: parseFloat(e.target.value) || 180 })
                  }
                  className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-sky-400 font-bold text-xs outline-none"
                />
                <span className="text-slate-400">units</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="5"
              value={Math.min(1000, config.worldHeight)}
              onChange={(e) => onUpdateConfig({ worldHeight: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* World X, Y, Z sliders */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400">X: {config.worldPosition.x}u</span>
              <input
                type="range"
                min="-200"
                max="200"
                value={config.worldPosition.x}
                onChange={(e) =>
                  onUpdateConfig({
                    worldPosition: { ...config.worldPosition, x: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Y: {config.worldPosition.y}u</span>
              <input
                type="range"
                min="0"
                max="400"
                value={config.worldPosition.y}
                onChange={(e) =>
                  onUpdateConfig({
                    worldPosition: { ...config.worldPosition, y: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Z: {config.worldPosition.z}u</span>
              <input
                type="range"
                min="-300"
                max="300"
                value={config.worldPosition.z}
                onChange={(e) =>
                  onUpdateConfig({
                    worldPosition: { ...config.worldPosition, z: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. OPACITY / TRANSPARENCY */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300 font-medium">Image Opacity</span>
          <span className="font-mono text-sky-400 font-bold">
            {Math.round(config.opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={config.opacity}
          onChange={(e) => onUpdateConfig({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-sky-500 cursor-pointer"
        />
      </div>
    </div>
  );
};
