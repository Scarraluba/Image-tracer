/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Layers,
  Eye,
  Sliders,
  Compass,
  User,
  Bone,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type MobileTab = 'joints' | 'proportions' | 'anatomy' | 'reference' | 'gaze' | 'poses' | 'preview';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: (open: boolean) => void;
  characterName: string;
  hasReferenceImage: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  isDrawerOpen,
  onToggleDrawer,
  hasReferenceImage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollNav = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -140 : 140;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md pb-safe select-none">
      {/* Scrollable Navigation Wrapper with Left/Right Scroll Indicators */}
      <div className="relative flex items-center max-w-xl mx-auto h-16 px-1">
        {/* Left Scroll Arrow for Quick Swipe */}
        <button
          onClick={() => scrollNav('left')}
          className="sm:hidden flex items-center justify-center w-5 h-10 text-slate-500 hover:text-slate-200 shrink-0 z-10 active:scale-90 transition-transform"
          aria-label="Scroll navigation left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Nav Items Container (Scrolls left and right smoothly) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center overflow-x-auto scroll-smooth touch-pan-x gap-1 px-1 py-1 sm:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* 1. SKELETON / JOINTS */}
          <button
            onClick={() => {
              onSelectTab('joints');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'joints' && isDrawerOpen
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'joints' && isDrawerOpen ? 'bg-amber-500/20 shadow-sm' : ''
              }`}
            >
              <Bone className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Joints</span>
          </button>

          {/* 2. PROPORTIONS */}
          <button
            onClick={() => {
              onSelectTab('proportions');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'proportions' && isDrawerOpen
                ? 'text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'proportions' && isDrawerOpen ? 'bg-sky-500/20 shadow-sm' : ''
              }`}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Body</span>
          </button>

          {/* 3. ANATOMY & WIREFRAME MATRIX */}
          <button
            onClick={() => {
              onSelectTab('anatomy');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'anatomy' && isDrawerOpen
                ? 'text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'anatomy' && isDrawerOpen ? 'bg-purple-500/20 shadow-sm' : ''
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Parts</span>
          </button>

          {/* 4. REFERENCE IMAGE */}
          <button
            onClick={() => {
              onSelectTab('reference');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all relative ${
              activeTab === 'reference' && isDrawerOpen
                ? 'text-pink-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'reference' && isDrawerOpen ? 'bg-pink-500/20 shadow-sm' : ''
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Image</span>
            {hasReferenceImage && (
              <span className="w-2 h-2 rounded-full bg-pink-400 absolute top-1 right-2 ring-2 ring-slate-950 animate-pulse" />
            )}
          </button>

          {/* 4. PREVIEW 3D (Center Viewport Hero Tab) */}
          <button
            onClick={() => {
              onSelectTab('preview');
              onToggleDrawer(false); // Collapse drawer to view full 3D canvas
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'preview' && !isDrawerOpen
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'preview' && !isDrawerOpen
                  ? 'bg-emerald-500/20 shadow-md ring-1 ring-emerald-500/40'
                  : 'hover:bg-slate-900'
              }`}
            >
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">3D View</span>
          </button>

          {/* 5. GAZE / EYES */}
          <button
            onClick={() => {
              onSelectTab('gaze');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'gaze' && isDrawerOpen
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'gaze' && isDrawerOpen ? 'bg-cyan-500/20 shadow-sm' : ''
              }`}
            >
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Gaze</span>
          </button>

          {/* 6. ACTOR / POSES */}
          <button
            onClick={() => {
              onSelectTab('poses');
              onToggleDrawer(true);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 shrink-0 min-w-[62px] rounded-xl transition-all ${
              activeTab === 'poses' && isDrawerOpen
                ? 'text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'poses' && isDrawerOpen ? 'bg-purple-500/20 shadow-sm' : ''
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight">Poses</span>
          </button>
        </div>

        {/* Right Scroll Arrow for Quick Swipe */}
        <button
          onClick={() => scrollNav('right')}
          className="sm:hidden flex items-center justify-center w-5 h-10 text-slate-500 hover:text-slate-200 shrink-0 z-10 active:scale-90 transition-transform"
          aria-label="Scroll navigation right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
