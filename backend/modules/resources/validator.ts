import { z } from 'zod';
import { ResourceProvider } from './types';

export const createResourceSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.enum(['video', 'pdf', 'note', 'document', 'link', 'recording']),
  visibility: z.enum(['PUBLIC', 'BATCH']),
  batchIds: z.array(z.string()).optional(),
  provider: z.enum(['firebase_storage', 'google_drive', 'firebase_asset', 'external_link']),
  providerId: z.string().min(1, 'providerId is required'),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  thumbnail: z.string().optional(),
  offlineAvailable: z.boolean().default(false),
  cacheVersion: z.number().default(1),
}).refine(data => {
  if (data.visibility === 'BATCH') {
    return data.batchIds && data.batchIds.length > 0;
  }
  return true;
}, {
  message: "batchIds must be provided if visibility is BATCH",
  path: ["batchIds"]
});

export const updateResourceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['video', 'pdf', 'note', 'document', 'link', 'recording']).optional(),
  visibility: z.enum(['PUBLIC', 'BATCH']).optional(),
  batchIds: z.array(z.string()).optional(),
  provider: z.enum(['firebase_storage', 'google_drive', 'firebase_asset', 'external_link']).optional(),
  providerId: z.string().min(1).optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  thumbnail: z.string().optional(),
  offlineAvailable: z.boolean().optional(),
  cacheVersion: z.number().optional(),
}).refine(data => {
  if (data.visibility === 'BATCH' && data.batchIds && data.batchIds.length === 0) {
    return false;
  }
  return true;
}, {
  message: "batchIds cannot be empty if visibility is BATCH",
  path: ["batchIds"]
});
