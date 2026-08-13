import { Readable } from 'stream';
import { IResource } from '../types';

export interface StreamOptions {
  start?: number;
  end?: number;
}

export interface StreamResult {
  stream: Readable;
  size: number;
  mimeType: string;
  etag?: string;
  contentRange?: string;
}

export interface IResourceProvider {
  /**
   * Retrieves a stream and related metadata for the given resource file.
   */
  getStream(resource: IResource, options?: StreamOptions): Promise<StreamResult>;
}
