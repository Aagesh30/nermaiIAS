import { google } from 'googleapis';
import { Readable } from 'stream';
import axios from 'axios';
import admin from 'firebase-admin';
import { env } from '../config/env';
import { logger } from '../core/logger';

export const DEFAULT_ACADEMY_DRIVE_FOLDER_ID = '17PwvvyImIb2wwui8EXhhWlPZ4-gQNiJi';

// ──────────────────────────────────────────────────────────────────────────────
// Drive Config helpers — read/write from Firestore settings/drive_config
// ──────────────────────────────────────────────────────────────────────────────

export interface DriveConfig {
  appsScriptUrl: string;
  rootFolderId: string;
  folderName: string;
  updatedAt?: string;
}

let _cachedDriveConfig: DriveConfig | null = null;

/**
 * Reads the Drive config from Firestore settings/drive_config.
 * Falls back to environment variables if Firestore is unavailable.
 * Result is cached in-memory for 5 minutes.
 */
export async function getDriveConfig(): Promise<DriveConfig> {
  if (_cachedDriveConfig) return _cachedDriveConfig;

  const fallback: DriveConfig = {
    appsScriptUrl: process.env.DRIVE_APPS_SCRIPT_URL || '',
    rootFolderId: process.env.DRIVE_ROOT_FOLDER_ID || process.env.DRIVE_FOLDER_ID || DEFAULT_ACADEMY_DRIVE_FOLDER_ID,
    folderName: process.env.DRIVE_FOLDER_NAME || 'NERMAi IAS Academy'
  };

  try {
    const db = admin.firestore();
    const doc = await db.collection('settings').doc('drive_config').get();
    if (doc.exists) {
      const data = doc.data() as Partial<DriveConfig>;
      _cachedDriveConfig = {
        appsScriptUrl: data.appsScriptUrl || fallback.appsScriptUrl,
        rootFolderId: data.rootFolderId || fallback.rootFolderId,
        folderName: data.folderName || fallback.folderName,
        updatedAt: data.updatedAt
      };
      // Expire cache after 5 minutes
      setTimeout(() => { _cachedDriveConfig = null; }, 5 * 60 * 1000);
      return _cachedDriveConfig;
    }
  } catch (err: any) {
    logger.warn('getDriveConfig: Firestore read failed, using env fallback:', err?.message);
  }

  _cachedDriveConfig = fallback;
  setTimeout(() => { _cachedDriveConfig = null; }, 5 * 60 * 1000);
  return _cachedDriveConfig;
}

/**
 * Saves the Drive config to Firestore and invalidates the in-memory cache.
 */
export async function saveDriveConfig(config: Partial<DriveConfig>): Promise<DriveConfig> {
  const db = admin.firestore();
  const current = await getDriveConfig();
  const updated: DriveConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString()
  };
  await db.collection('settings').doc('drive_config').set(updated, { merge: true });
  _cachedDriveConfig = null; // Invalidate cache
  return updated;
}

// ──────────────────────────────────────────────────────────────────────────────

export interface GoogleDriveUploadResult {
  fileId: string;
  name: string;
  previewUrl: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Uploads a file (PDF, Image, etc.) to Google Drive.
 *
 * Uses the Apps Script Web App if configured (supports sub-folder creation).
 * Falls back to the service-account Drive API otherwise.
 *
 * @param options.subPath  Optional slash-separated folder path inside the root folder.
 *                         e.g. "LMS/Daily Content" or "ERP/Students/STU001"
 *                         The Apps Script will create these sub-folders automatically.
 */
export async function uploadFileToGoogleDrive(options: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
  subPath?: string;
}): Promise<GoogleDriveUploadResult | null> {
  try {
    // ── Path 1: Google Apps Script Web App (preferred — no OAuth, supports sub-folders) ──
    const driveConfig = await getDriveConfig();
    const appsScriptUrl = driveConfig.appsScriptUrl || process.env.DRIVE_APPS_SCRIPT_URL;

    if (appsScriptUrl) {
      console.log(`[Drive] Uploading via Apps Script: ${options.fileName} → ${options.subPath || '(root)'}`);
      const base64Data = options.buffer.toString('base64');

      const payload: any = {
        fileName: options.fileName,
        mimeType: options.mimeType,
        base64: base64Data,
        rootFolderId: options.folderId || driveConfig.rootFolderId || DEFAULT_ACADEMY_DRIVE_FOLDER_ID
      };

      // If a subPath is provided (e.g. "LMS/Daily Content"), pass it to Apps Script
      if (options.subPath) {
        payload.subPath = options.subPath.trim().replace(/^\/+|\/+$/g, ''); // strip leading/trailing slashes
      }

      const response = await axios.post(appsScriptUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const resData = response.data;

      if (resData && (resData.success || resData.status === 'success') && resData.fileId) {
        const fileId = resData.fileId;
        console.log(`✅ [Drive] Apps Script upload SUCCESS: ${options.fileName} → fileId=${fileId}`);
        return {
          fileId,
          name: resData.name || options.fileName,
          previewUrl: resData.previewUrl || `https://drive.google.com/file/d/${fileId}/preview`,
          webViewLink: resData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
        };
      } else {
        console.error('❌ [Drive] Apps Script upload failed:', resData?.error || resData);
        // Fall through to service-account path
      }
    }

    // ── Path 2: Service account Drive API (fallback, no sub-folder support) ──
    const clientEmail = env.DRIVE_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
    const rawKey = env.DRIVE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;
    if (!clientEmail || !rawKey) {
      logger.warn('[Drive] Service account credentials not found in env.');
      return null;
    }

    const privateKey = rawKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    const drive = google.drive({ version: 'v3', auth });
    const driveConfig2 = await getDriveConfig();
    const targetFolderId = options.folderId || driveConfig2.rootFolderId || DEFAULT_ACADEMY_DRIVE_FOLDER_ID;

    const stream = new Readable();
    stream.push(options.buffer);
    stream.push(null);

    const fileMetadata: any = {
      name: options.fileName,
      parents: targetFolderId ? [targetFolderId] : undefined
    };

    const media = {
      mimeType: options.mimeType,
      body: stream
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true
    });

    const fileId = res.data.id;
    if (!fileId) {
      console.error('[Drive] No file ID returned from Drive API');
      return null;
    }

    // Set permission to anyone with link can view (reader)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true
      });
    } catch (permErr: any) {
      console.warn('[Drive] Could not set public permission:', permErr?.message);
    }

    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    console.log(`✅ [Drive] Service account upload SUCCESS: "${options.fileName}" → ${previewUrl}`);

    return {
      fileId,
      name: res.data.name || options.fileName,
      previewUrl,
      webViewLink: res.data.webViewLink || previewUrl,
      webContentLink: res.data.webContentLink || undefined
    };
  } catch (error: any) {
    console.error('❌ [Drive] Upload Error:', error?.message || error);
    if (error?.response?.data) {
      console.error('❌ [Drive] API Error Details:', JSON.stringify(error.response.data));
    }
    return null;
  }
}

/**
 * Deletes a file from Google Drive via the Apps Script Web App.
 * Silently succeeds if the file is already gone or Drive is not configured.
 */
export async function deleteFileFromGoogleDrive(fileId: string): Promise<boolean> {
  try {
    const driveConfig = await getDriveConfig();
    const appsScriptUrl = driveConfig.appsScriptUrl || process.env.DRIVE_APPS_SCRIPT_URL;
    if (!appsScriptUrl || !fileId) return false;

    const response = await axios.post(appsScriptUrl, {
      action: 'delete',
      fileId
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data && (response.data.success || response.data.status === 'success')) {
      console.log(`✅ [Drive] File deleted: ${fileId}`);
      return true;
    } else {
      console.warn(`⚠️ [Drive] Delete failed for ${fileId}:`, response.data?.error);
      return false;
    }
  } catch (error: any) {
    console.warn(`⚠️ [Drive] Delete error for ${fileId}:`, error?.message);
    return false;
  }
}
