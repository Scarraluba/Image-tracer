/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { WifiOff, Cloud } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-xl border border-amber-400">
      <WifiOff className="w-3.5 h-3.5 animate-pulse text-slate-950" />
      <span>Offline Mode — All projects and cached images work offline.</span>
    </div>
  );
};
