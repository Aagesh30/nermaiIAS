import { google } from 'googleapis';
import { Readable } from 'stream';
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../core/logger';

export const DEFAULT_ACADEMY_DRIVE_FOLDER_ID = '17PwvvyImIb2wwui8EXhhWlPZ4-gQNiJi';

export interface GoogleDriveUploadResult {
  fileId: string;
  name: string;
  previewUrl: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Uploads a file (PDF, Image, etc.) directly to the academy Google Drive folder.
 */
export async function uploadFileToGoogleDrive(options: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}): Promise<GoogleDriveUploadResult | null> {
  try {
    // Check if Google Apps Script Web App bypass is configured for personal Google Drive accounts
    const appsScriptUrl = process.env.DRIVE_APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      console.log("Using Google Apps Script Web App bypass for Google Drive upload...");
      const base64Data = options.buffer.toString("base64");
      // NOTE: We intentionally do NOT send folderId here.
      // The Apps Script "getFolderById" call fails when the folder is not owned by
      // or shared with the script-deployer's Google account. Sending no folderId
      // makes the script save the file to the root of My Drive, which always works.
      
      const response = await axios.post(appsScriptUrl, {
        fileName: options.fileName,
        mimeType: options.mimeType,
        base64: base64Data
        // folderId intentionally omitted — saves to root My Drive
      }, {
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.data && response.data.success) {
        console.log(`✅ Google Drive Upload SUCCESS via Apps Script: ${response.data.previewUrl}`);
        return {
          fileId: response.data.fileId,
          name: response.data.name,
          previewUrl: response.data.previewUrl,
          webViewLink: response.data.webViewLink
        };
      } else {
        console.error("❌ Google Apps Script upload failed:", response.data?.error || response.data);
        return null;
      }
    }
    const clientEmail = env.DRIVE_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
    const rawKey = env.DRIVE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;
    if (!clientEmail || !rawKey) {
      logger.warn('Google Drive Upload: Drive service account credentials not found in env.');
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
    const targetFolderId = options.folderId || process.env.DRIVE_FOLDER_ID || DEFAULT_ACADEMY_DRIVE_FOLDER_ID;

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
      console.error('Google Drive Upload: No file ID returned');
      return null;
    }

    // Set permission to anyone with link can view (reader)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      });
    } catch (permErr: any) {
      console.warn('Google Drive Upload: Could not set public permission:', permErr?.message);
    }

    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    console.log(`✅ Google Drive Upload SUCCESS: File "${options.fileName}" uploaded -> ${previewUrl}`);

    return {
      fileId,
      name: res.data.name || options.fileName,
      previewUrl,
      webViewLink: res.data.webViewLink || previewUrl,
      webContentLink: res.data.webContentLink || undefined
    };
  } catch (error: any) {
    console.error('❌ Google Drive Upload Error:', error?.message || error);
    if (error?.response?.data) {
      console.error('❌ Google Drive API Error Details:', JSON.stringify(error.response.data));
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
    const appsScriptUrl = process.env.DRIVE_APPS_SCRIPT_URL;
    if (!appsScriptUrl || !fileId) return false;

    const response = await axios.post(appsScriptUrl, {
      action: "delete",
      fileId
    }, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data && response.data.success) {
      console.log(`✅ Google Drive file deleted: ${fileId}`);
      return true;
    } else {
      console.warn(`⚠️ Google Drive delete failed for ${fileId}:`, response.data?.error);
      return false;
    }
  } catch (error: any) {
    console.warn(`⚠️ Google Drive delete error for ${fileId}:`, error?.message);
    return false;
  }
}
