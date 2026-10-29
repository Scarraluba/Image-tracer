/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ProjectStorage, ProjectData } from '../storage/ProjectStorage';
import { FirebaseSync } from '../storage/FirebaseSync';
import {
  FolderOpen,
  Save,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Cloud,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react';
import { useOnlineStatus } from '../pwa/useOnlineStatus';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onSaveCurrentProject: (name: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
  onSaveCurrentProject,
}) => {
  const [projectName, setProjectName] = useState(currentProject.name || 'My Eye-Geometry Study');
  const [savedProjects, setSavedProjects] = useState<Array<{ id: string; name: string; updatedAt: number }>>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();

  const refreshList = () => {
    setSavedProjects(ProjectStorage.getProjectsList());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setProjectName(currentProject.name || 'My Eye-Geometry Study');
      setNotification(null);
    }
  }, [isOpen, currentProject.name]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!projectName.trim()) return;
    onSaveCurrentProject(projectName.trim());
    refreshList();
    setNotification({ type: 'success', text: `Project "${projectName}" saved locally & offline!` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLoad = (id: string) => {
    const proj = ProjectStorage.loadProject(id);
    if (proj) {
      onLoadProject(proj);
      onClose();
    } else {
      setNotification({ type: 'error', text: 'Failed to load project.' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete project "${name}"?`)) {
      await FirebaseSync.deleteProject(id);
      refreshList();
      setNotification({ type: 'success', text: `Project "${name}" deleted.` });
    }
  };

  const handleCloudSync = async () => {
    try {
      setNotification({ type: 'success', text: 'Syncing with Firebase Firestore...' });
      const cloudProjs = await FirebaseSync.fetchCloudProjects();
      for (const cp of cloudProjs) {
        ProjectStorage.saveProject(cp);
      }
      refreshList();
      setNotification({
        type: 'success',
        text: `Synced ${cloudProjs.length} project(s) from Firebase cloud!`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification({ type: 'error', text: 'Cloud sync failed. Local storage preserved.' });
    }
  };

  const handleExportJSON = (id?: string) => {
    const proj = id ? ProjectStorage.loadProject(id) : currentProject;
    if (proj) {
      ProjectStorage.exportToJSON(proj);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = ProjectStorage.importFromJSON(text);
        imported.id = `proj_${Date.now()}`;
        imported.name = `${imported.name} (Imported)`;
        ProjectStorage.saveProject(imported);
        refreshList();
        onLoadProject(imported);
        setNotification({ type: 'success', text: `Project "${imported.name}" imported successfully!` });
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          text: err instanceof Error ? err.message : 'Invalid JSON project file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreAutoSave = () => {
    const autosave = ProjectStorage.loadAutoSave();
    if (autosave) {
      onLoadProject(autosave);
      onClose();
    } else {
      setNotification({ type: 'error', text: 'No autosave session found.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                Project Persistence &amp; Sync
              </h2>
              <p className="text-[11px] text-slate-400">
                Offline PWA Storage • Cloudinary Media • Cloud &amp; Local Persistence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Pills */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
              <CheckCircle className="w-3.5 h-3.5" /> PWA Offline Storage Active
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-sky-400 font-mono">
              <Cloud className="w-3.5 h-3.5" /> Cloudinary (dxhuih6mb)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <>
                <button
                  onClick={handleCloudSync}
                  className="px-2 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 font-mono text-[10px] flex items-center gap-1 transition-colors"
                  title="Fetch and merge latest projects from Firebase Firestore"
                >
                  <Cloud className="w-3 h-3 text-sky-400" />
                  <span>Sync Firebase</span>
                </button>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              </>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline (Local Storage Mode)
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
          {notification && (
            <div
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                notification.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-800 text-rose-300'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
          )}

          {/* Save Current Session */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block">
              Save Current Workspace Project
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:border-sky-500 outline-none"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Quick Actions: Export / Import JSON & Autosave */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExportJSON()}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800 flex items-center gap-2 text-slate-300 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <div className="text-left">
                <div className="font-semibold text-white">Export .JSON File</div>
                <div className="text-[10px] text-slate-400">Download project to your PC</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800 flex items-center gap-2 text-slate-300 transition-colors"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-semibold text-white">Import .JSON File</div>
                <div className="text-[10px] text-slate-400">Load project from disk</div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>

          {/* Saved Projects List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Saved Projects ({savedProjects.length})
              </span>
              <button
                onClick={handleRestoreAutoSave}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline"
              >
                Restore Last Autosave
              </button>
            </div>

            {savedProjects.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400">
                No saved projects yet. Type a name above and click Save to store your study.
              </div>
            ) : (
              <div className="space-y-1.5">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 truncate text-xs">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(p.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleLoad(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-200 text-xs font-semibold transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleExportJSON(p.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Export JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
