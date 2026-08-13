import { Readable } from 'stream';
import { IResourceProvider } from './IResourceProvider';
import { IResource } from '../types';
import axios from 'axios';
import { decrypt } from '../../../core/utils/encryption';
import { AppError } from '../../../core/errors/AppError';

import { StreamOptions, StreamResult } from './IResourceProvider';

export class GoogleDriveProvider implements IResourceProvider {
  async getStream(resource: IResource, options?: StreamOptions): Promise<StreamResult> {
    const fileId = decrypt(resource.storagePath);
    if (!fileId) {
      throw new AppError('Invalid Google Drive File ID', 400);
    }
    
    // We proxy the "Anyone with the link" download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    try {
      const headers: any = {};
      
      if (options?.start !== undefined && options?.end !== undefined) {
        headers['Range'] = `bytes=${options.start}-${options.end}`;
      }

      const response = await axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'stream',
        headers,
      });

      // Attempt to read Accept-Ranges / Content-Range from upstream
      const upstreamAcceptRanges = response.headers['accept-ranges'];
      const upstreamContentRange = response.headers['content-range'];

      return {
        stream: response.data,
        size: resource.fileSize,
        mimeType: resource.mimeType,
        etag: `"${resource.checksum}"`,
        // We'll pass the contentRange back if Google returned it, but our service controls HTTP
        contentRange: upstreamContentRange,
      };
    } catch (error: any) {
      throw new AppError(`Failed to fetch Google Drive file: ${error.message}`, 502);
    }
  }
}
