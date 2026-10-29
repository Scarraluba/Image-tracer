/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { ProjectData, ProjectStorage } from './ProjectStorage';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  // Read config safely
  const config = {
    projectId: 'scarra-dev',
    appId: '1:992784292767:web:cae19cb80ef482a648fbaa',
    apiKey: 'AIzaSyBs02jHiMkytyLEAS2d4wnbhZXvRod9QLo',
    authDomain: 'scarra-dev.firebaseapp.com',
    storageBucket: 'scarra-dev.firebasestorage.app',
    messagingSenderId: '992784292767',
  };

  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app, 'ai-studio-eyew3danatomical-0ce25a25-d726-4a15-8895-10531b8b9072');
} catch (err) {
  console.warn('Firebase init warning (offline fallback active):', err);
}

export class FirebaseSync {
  static isAvailable(): boolean {
    return navigator.onLine && db !== null;
  }

  /**
   * Syncs project to Firebase Firestore and local storage simultaneously.
   */
  static async saveProject(project: ProjectData): Promise<void> {
    // 1. Always save locally first (instant offline availability)
    ProjectStorage.saveProject(project);

    // 2. Sync to Firestore if online
    if (this.isAvailable() && db) {
      try {
        const docRef = doc(db, 'projects', project.id);
        await setDoc(docRef, {
          ...project,
          syncedAt: Date.now(),
        });
      } catch (err) {
        console.warn('Firestore cloud sync deferred (saved locally):', err);
      }
    }
  }

  /**
   * Fetches cloud projects and merges with local projects.
   */
  static async fetchCloudProjects(): Promise<ProjectData[]> {
    if (!this.isAvailable() || !db) {
      return [];
    }

    try {
      const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const cloudProjects: ProjectData[] = [];
      snapshot.forEach((d) => {
        cloudProjects.push(d.data() as ProjectData);
      });
      return cloudProjects;
    } catch (err) {
      console.warn('Failed to fetch from Firestore:', err);
      return [];
    }
  }

  /**
   * Deletes project from both local storage and Firestore.
   */
  static async deleteProject(id: string): Promise<void> {
    ProjectStorage.deleteProject(id);
    if (this.isAvailable() && db) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (err) {
        console.warn('Failed to delete from Firestore:', err);
      }
    }
  }
}
