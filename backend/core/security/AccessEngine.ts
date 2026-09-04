import { storage } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';
import { AppError } from '../errors/AppError';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { getAccessContext } from './AccessCache';

interface EvaluateAccessParams {
  userId: string;
  tenantId: string;
  resourceType: 'video' | 'resource';
  resourceId: string;
  storagePath?: string;
  tokenPayload?: any;
  // userContext is intentionally removed — derived from AccessCache only
  visibilityRule?: {
    visibility: string;
    targetBatchIds?: string[];
    targetPrograms?: string[];
    targetStudentIds?: string[];
  };
}

export class AccessEngine {
  /**
   * Evaluate whether the calling student can access a resource or video.
   *
   * Authorization flow:
   *   JWT (uid + tenantId)
   *     → access:{userId} Redis cache (sub-millisecond)
   *       → on miss: one Firestore read, rebuild cache
   *   → Evaluate visibility rule against cached AccessContext
   *   → Issue short-lived player/resource token
   *
   * Zero Firestore reads on cache hits. Cache is invalidated by the
   * StudentService whenever an admin changes enrollments or roles.
   */
  static async evaluateAccess(params: EvaluateAccessParams) {
    const { userId, tenantId, resourceType, resourceId, tokenPayload, visibilityRule } = params;

    // ─── Step 1: Load Access Context (Redis cache or Firestore fallback) ───────
    const accessCtx = await getAccessContext(userId, tenantId);

    // ─── Step 2: Evaluate Visibility Rule ────────────────────────────────────
    if (visibilityRule) {
      const { visibility, targetBatchIds, targetPrograms, targetStudentIds } = visibilityRule;

      switch (visibility) {
        case 'batch': {
          const hasBatchAccess = 
            targetBatchIds?.includes('all') ||
            (targetBatchIds?.includes('all_paid') && accessCtx.accessProfiles.includes('batch')) ||
            (targetBatchIds?.includes('all_free') && !accessCtx.accessProfiles.includes('batch')) ||
            accessCtx.batchIds.some(id => targetBatchIds?.includes(id));

          if (!hasBatchAccess) {
            throw new AppError('Access denied: You are not in the assigned batch for this resource', 403);
          }
          break;
        }

        case 'premium': {
          // Any student who has paid and joined any batch gets premium access
          if (!accessCtx.accessProfiles.includes('batch')) {
            throw new AppError('Access denied: You must be enrolled in a batch to access premium resources', 403);
          }
          break;
        }

        case 'selected': {
          if (!targetStudentIds?.includes(userId)) {
            throw new AppError('Access denied: You are not selected for this resource', 403);
          }
          break;
        }

        case 'restricted': {
          throw new AppError('Access denied: This resource is restricted', 403);
        }

        // 'public' — no check needed
      }
    }

    // ─── Step 3: Issue Short-Lived Token ────────────────────────────────────
    const token = jwt.sign(
      { 
        userId: params.userId, 
        tenantId: params.tenantId, 
        resourceId: params.resourceId,
        ...params.tokenPayload,
        jti: randomUUID() // Explicit sessionId for attendance tracking
      },
      process.env.JWT_SECRET as string,
      { expiresIn: resourceType === 'video' ? '14400s' : '900s' }
    );
    const ttl = resourceType === 'video' ? 14400 : 900; // 4 hours for video, 15 min for resource

    const finalPayload = JSON.stringify({
      ...tokenPayload,
      userId,
      resourceId,
      resourceType,
      studentName: accessCtx.studentName,
      studentEmail: accessCtx.studentEmail,
      issuedAt: new Date().toISOString(),
    });

    // Use standardized Redis key naming: player:token or resource:token
    const prefix = resourceType === 'video' ? 'player' : 'resource';
    await redisClient.set(`${prefix}:${token}`, finalPayload, 'EX', ttl);

    // ─── Step 4: Generate Signed URL (Firebase Storage only) ────────────────
    let signedUrl: string | null = null;
    if (resourceType === 'resource' && params.storagePath) {
      try {
        const bucketName = process.env.STORAGE_BUCKET || 'nermaiiasacademy-519c8-resources';
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(params.storagePath);
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + ttl * 1000,
        });
        signedUrl = url;
      } catch (err) {
        throw new AppError('Failed to generate secure resource URL', 500);
      }
    }

    return {
      token,
      studentName: accessCtx.studentName,
      studentEmail: accessCtx.studentEmail,
      signedUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }
}
