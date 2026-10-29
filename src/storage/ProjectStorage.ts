/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BodyProportionsConfig } from '../body/BodyProportions';
import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { ViewportSettings } from '../rendering/EyeScene';

export interface SerializedCharacter {
  id: string;
  name: string;
  rootPosition: { x: number; y: number; z: number };
  facingRotationDeg: number;
  proportions: BodyProportionsConfig;
  bodyColor: string;
  isUnifiedMode: boolean;
  showSkeleton: boolean;
  leftEyeGaze: { pitchDeg: number; yawDeg: number };
  rightEyeGaze: { pitchDeg: number; yawDeg: number };
  jointRotations: Record<string, { pitchDeg: number; yawDeg: number; rollDeg: number }>;
  partDisplayStates?: Record<string, { visible: boolean; wireframe: boolean }>;
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: string;
  activeCharacterId: string;
  characters: SerializedCharacter[];
  referenceConfig: ReferenceImageConfig;
  viewportSettings: ViewportSettings;
  coordinateOptions?: {
    invertRayX?: boolean;
    invertRayY?: boolean;
    oppositeTargetScaling?: boolean;
    oppositeTargetDepth?: boolean;
  };
}

const LOCAL_STORAGE_KEY_PREFIX = 'eyew_project_';
const LOCAL_STORAGE_INDEX_KEY = 'eyew_projects_index';
const LOCAL_STORAGE_AUTOSAVE_KEY = 'eyew_project_autosave';

export class ProjectStorage {
  /**
   * Retrieves list of all locally saved projects
   */
  static getProjectsList(): Array<{ id: string; name: string; updatedAt: number }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Saves project into localStorage (offline first)
   */
  static saveProject(project: ProjectData): void {
    try {
      project.updatedAt = Date.now();
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${project.id}`, JSON.stringify(project));

      const list = this.getProjectsList();
      const existingIdx = list.findIndex((p) => p.id === project.id);
      const summary = { id: project.id, name: project.name, updatedAt: project.updatedAt };

      if (existingIdx >= 0) {
        list[existingIdx] = summary;
      } else {
        list.unshift(summary);
      }

      localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to save project locally:', err);
    }
  }

  /**
   * Loads project by ID
   */
  static loadProject(id: string): ProjectData | null {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${id}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Deletes a saved project
   */
  static deleteProject(id: string): void {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${id}`);
      const list = this.getProjectsList().filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to delete project:', err);
    }
  }

  /**
   * Auto-saves the current working session
   */
  static autoSave(project: ProjectData): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTOSAVE_KEY, JSON.stringify({
        ...project,
        updatedAt: Date.now(),
      }));
    } catch {
      // Ignore quota errors gracefully
    }
  }

  /**
   * Restores the latest auto-saved project if available
   */
  static loadAutoSave(): ProjectData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AUTOSAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Exports project as downloadable JSON file
   */
  static exportToJSON(project: ProjectData): void {
    const filename = `EYEW_${project.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parses imported JSON string
   */
  static importFromJSON(jsonText: string): ProjectData {
    const parsed = JSON.parse(jsonText);
    if (!parsed.characters || !Array.isArray(parsed.characters)) {
      throw new Error('Invalid project file: missing characters list');
    }
    return parsed as ProjectData;
  }
}
