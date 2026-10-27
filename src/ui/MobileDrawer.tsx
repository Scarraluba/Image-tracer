/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ChevronDown, Sparkles, User, Bone, Sliders, Compass } from 'lucide-react';
import { MobileTab } from './MobileBottomNav';
import { CharacterModel } from '../body/CharacterModel';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MobileTab;
  character: CharacterModel;
  children: React.ReactNode;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  character,
  children,
}) => {
  if (!isOpen) return null;

  const tabTitles: Record<MobileTab, { title: string; subtitle: string }> = {
    joints: {
      title: 'Joint Articulation & IK',
      subtitle: `Selected: ${character.selectedJointId}`,
    },
    proportions: {
      title: 'Anatomical Proportions',
      subtitle: `Height: ${character.proportions.totalHeight} units`,
    },
    gaze: {
      title: 'Dual-Eye Gaze Kinematics',
      subtitle: `Head & Eye Orientation`,
    },
    poses: {
      title: 'Pose Presets & Actor Placement',
      subtitle: `Pose: ${character.activePosePreset}`,
    },
    reference: {
      title: 'Reference Photography',
      subtitle: 'Image-Based Fitting & Sizing (px)',
    },
    preview: {
      title: '3D Preview',
      subtitle: 'Full Viewport Mode',
    },
  };

  const { title, subtitle } = tabTitles[activeTab] || { title: 'Panel', subtitle: '' };

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col max-h-[35vh] h-[35vh] bg-slate-900 border-t border-slate-800 rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Drawer Drag Bar & Header */}
      <div className="px-3.5 pt-2 pb-1.5 border-b border-slate-800/80 bg-slate-950 flex flex-col gap-1.5 shrink-0">
        {/* Top Centered Grab Pill */}
        <div className="w-8 h-1 bg-slate-700 rounded-full mx-auto" />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
              Editing Character
            </div>
            <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <span>{character.name}</span>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                {subtitle}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Minimize Drawer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Body Scroll Container */}
      <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
        {children}
      </div>
    </div>
  );
};
