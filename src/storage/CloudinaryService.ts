/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Project: SisisSite
 * Author: Scarra Luba
 * Cloudinary Storage + Offline Local Caching Service
 */

const CLOUD_NAME = 'dxhuih6mb';
const UPLOAD_PRESET = 'firstUplod';

export interface UploadResult {
  url: string;
  publicId?: string;
  assetId?: string;
  hash: string;
  isOfflineCached?: boolean;
}

/**
 * Computes SHA-256 hash of a file or blob
 */
export const createFileHash = async (file: Blob | File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const DB_NAME = 'eyew_offline_media_db';
const STORE_NAME = 'reference_images';

const openOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves image data locally into IndexedDB so it's fully accessible offline
 */
export const saveOfflineImage = async (
  hash: string,
  blob: Blob | File,
  dataUrl: string,
  name: string
): Promise<void> => {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      hash,
      blob,
      dataUrl,
      name,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to cache image in IndexedDB:', err);
  }
};

/**
 * Retrieves image data from local IndexedDB
 */
export const getOfflineImage = async (
  hash: string
): Promise<{ dataUrl: string; name: string } | null> => {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(hash);
      req.onsuccess = () => {
        resolve(req.result ? { dataUrl: req.result.dataUrl, name: req.result.name } : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

/**
 * Uploads to Cloudinary with automatic fallback to offline local storage
 */
export const UploadToCloudinary = async (file: File): Promise<UploadResult> => {
  const hash = await createFileHash(file);

  // Read data URL for instant offline local rendering
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  // Always cache locally first to guarantee offline availability
  await saveOfflineImage(hash, file, dataUrl, file.name);

  // If user is offline, return the local cached image
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      url: dataUrl,
      hash,
      isOfflineCached: true,
    };
  }

  const publicId = `sisis/images/${hash}`;
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', UPLOAD_PRESET);
  data.append('public_id', publicId);
  data.append('overwrite', 'false');

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: data,
    });

    const json = await response.json();

    if (!response.ok) {
      console.warn('Cloudinary upload responded with error, falling back to local storage:', json.error?.message);
      return {
        url: dataUrl,
        hash,
        isOfflineCached: true,
      };
    }

    return {
      url: json.secure_url || dataUrl,
      publicId: json.public_id,
      assetId: json.asset_id,
      hash,
      isOfflineCached: false,
    };
  } catch (networkErr) {
    console.warn('Network error while uploading to Cloudinary, using offline cached image:', networkErr);
    return {
      url: dataUrl,
      hash,
      isOfflineCached: true,
    };
  }
};
