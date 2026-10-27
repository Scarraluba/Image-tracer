/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  RotateCcw,
  Camera,
  Grid,
  Crosshair,
  Layers,
  Activity,
  Download,
  Eye,
  CheckCircle,
  UserPlus,
  Users,
  Bone,
  Sparkles,
  Columns2,
  Maximize2,
  LayoutTemplate,
  ImageIcon,
  FolderOpen,
  Target,
  EyeOff,
  Grid3X3,
} from 'lucide-react';
import { ViewportSettings } from '../rendering/EyeScene';
import { CharacterModel } from '../body/CharacterModel';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export type ViewLayoutMode = 'preview' | 'split' | 'panel';

interface TopToolbarProps {
  characters: CharacterModel[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onAddCharacter: () => void;
  settings: ViewportSettings;
  onUpdateSettings: (newSettings: Partial<ViewportSettings>) => void;
  onResetPose: () => void;
  onResetCamera: () => void;
  onToggleUnifiedMode: () => void;
  onToggleSkeleton: () => void;
  onOpenDiagnostics: () => void;
  onExportOBJ: () => void;
  layoutMode: ViewLayoutMode;
  onSetLayoutMode: (mode: ViewLayoutMode) => void;
  onToggleReferenceImage?: () => void;
  referenceVisible?: boolean;
  onOpenProjects?: () => void;
  onToggleTargetPlane?: () => void;
  targetPlaneVisible?: boolean;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onAddCharacter,
  settings,
  onUpdateSettings,
  onResetPose,
  onResetCamera,
  onToggleUnifiedMode,
  onToggleSkeleton,
  onOpenDiagnostics,
  onExportOBJ,
  layoutMode,
  onSetLayoutMode,
  onToggleReferenceImage,
  referenceVisible,
  onOpenProjects,
  onToggleTargetPlane,
  targetPlaneVisible = true,
}) => {
  const activeChar = characters.find((c) => c.id === activeCharacterId);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 md:px-4 flex items-center justify-between text-slate-200 select-none z-30 shrink-0">
      {/* Brand, Projects & Actor Dropdown */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold tracking-tight shrink-0">
          <Eye className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <h1 className="font-bold text-xs md:text-sm tracking-wide text-slate-100 uppercase">
              EYEW
            </h1>
            <span className="hidden sm:inline-block text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
              3D Engine
            </span>
          </div>
        </div>

        {/* Projects Save/Load Button */}
        {onOpenProjects && (
          <button
            onClick={onOpenProjects}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition-colors shadow-xs"
            title="Projects: Save, Load, Cloud Sync & JSON Export"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Projects</span>
          </button>
        )}

        {/* Actor Selector (compact on mobile) */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 ml-0.5">
          <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <select
            value={activeCharacterId}
            onChange={(e) => onSelectCharacter(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[85px] sm:max-w-[120px] truncate"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAddCharacter}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 px-1 transition-colors"
            title="Add character"
          >
            +
          </button>
        </div>
      </div>

      {/* Center Layout Split Controls */}
      <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 shadow-sm">
        <button
          onClick={() => onSetLayoutMode('preview')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            layoutMode === 'preview'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Full 3D Preview Viewport"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        <button
          onClick={() => onSetLayoutMode('split')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            layoutMode === 'split'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Split View: 3D Preview | Selected Panel (Side-by-Side)"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>

        <button
          onClick={() => onSetLayoutMode('panel')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            layoutMode === 'panel'
              ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Panel Only Focus Mode"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Panel</span>
        </button>
      </div>

      {/* Right Actions: Target Board Toggle, Ref Image, PWA Install, Diagnostics & Export */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onUpdateSettings({ showCharacters: !(settings.showCharacters ?? true) })} className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs transition-colors ${settings.showCharacters !== false ? 'bg-sky-950/70 text-sky-300 border-sky-700/70' : 'bg-slate-800 text-slate-400 border-slate-700'}`} title={settings.showCharacters !== false ? 'Hide characters' : 'Show characters'} aria-label={settings.showCharacters !== false ? 'Hide characters' : 'Show characters'}>
          {settings.showCharacters !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline">{settings.showCharacters !== false ? 'Hide actors' : 'Show actors'}</span>
        </button>
        <button onClick={() => onUpdateSettings({ wireframe: !settings.wireframe })} className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs transition-colors ${settings.wireframe ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/70' : 'bg-slate-800 text-slate-400 border-slate-700'}`} title={settings.wireframe ? 'Disable wireframe' : 'Enable wireframe'} aria-label={settings.wireframe ? 'Disable wireframe' : 'Enable wireframe'}>
          <Grid3X3 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Wire</span>
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Toggle Target Board Visibility */}
        {onToggleTargetPlane && (
          <button
            onClick={onToggleTargetPlane}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
              targetPlaneVisible
                ? 'bg-amber-950/70 text-amber-300 border-amber-700/70 shadow-xs'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Target 🎯 Board Visibility"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Target 🎯</span>
          </button>
        )}

        {/* Toggle Reference Image */}
        {onToggleReferenceImage && (
          <button
            onClick={onToggleReferenceImage}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
              referenceVisible
                ? 'bg-pink-950/70 text-pink-300 border-pink-700/70 shadow-xs'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Reference Photography Overlay & Sizing (px)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ref Image</span>
          </button>
        )}

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Diagnostics Modal Button */}
        <button
          onClick={onOpenDiagnostics}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-medium transition-colors flex items-center gap-1"
          title="Run Geometry & Mathematical Invariant Tests"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Tests</span>
        </button>

        {/* Export OBJ */}
        <button
          onClick={onExportOBJ}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1"
          title="Export 3D Model to Wavefront .OBJ"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">OBJ</span>
        </button>
      </div>
    </header>
  );
};
