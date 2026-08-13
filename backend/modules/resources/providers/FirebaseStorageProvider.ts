import { Readable } from 'stream';
import { IResourceProvider } from './IResourceProvider';
import { IResource } from '../types';
import { storage } from '../../../infrastructure/firebase';
import { decrypt } from '../../../core/utils/encryption';
import { AppError } from '../../../core/errors/AppError';

import { StreamOptions, StreamResult } from './IResourceProvider';

export class FirebaseStorageProvider implements IResourceProvider {
  async getStream(resource: IResource, options?: StreamOptions): Promise<StreamResult> {
    const storagePath = decrypt(resource.storagePath);
    if (!storagePath) {
      throw new AppError('Invalid Firebase Storage Path', 400);
    }
    
    try {
      const file = storage.bucket().file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
         throw new AppError('File not found in Firebase Storage', 404);
      }

      const streamOptions: any = {};
      if (options?.start !== undefined && options?.end !== undefined) {
        streamOptions.start = options.start;
        streamOptions.end = options.end;
      }

      return {
        stream: file.createReadStream(streamOptions),
        size: resource.fileSize,
        mimeType: resource.mimeType,
        etag: `"${resource.checksum}"`
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to fetch Firebase Storage file: ${error.message}`, 502);
    }
  }
}
