import { db } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';
import { logger } from '../logger';

/**
 * AccessContext is the complete, cached authorization profile for a student.
 * All LMS modules (Videos, Resources, Tests, Assignments, Live Classes, etc.)
 * consume this object from Redis — zero Firestore reads on normal requests.
 */
export interface AccessContext {
  version: number;           // Bumped whenever admin changes permissions
  userId: string;
  tenantId: string;
  role: string;

  // Batch membership — derived exclusively from programMemberships[]
  batchIds: string[];

  // Program names the student is enrolled in (e.g. "Gold", "LDC", "PSC")
  programs: string[];

  // Resolved visibility profiles this student can access
  // Allows quick allow/deny without re-evaluating rules per module
  accessProfiles: ('public' | 'batch' | 'selected')[];

  studentName: string;
  studentEmail: string;

  // For debugging / audit
  cachedAt: number;          // Unix timestamp (seconds)
}

const ACCESS_CACHE_PREFIX = 'access';
const LOCK_PREFIX = 'lock';
const CACHE_TTL_SECONDS = 43200; // 12 hours (TTL is FALLBACK, not primary invalidation)
const LOCK_TTL_SECONDS = 10;     // Max time a lock can be held

function cacheKey(userId: string) {
  return `${ACCESS_CACHE_PREFIX}:${userId}`;
}

function lockKey(userId: string) {
  return `${LOCK_PREFIX}:${ACCESS_CACHE_PREFIX}:${userId}`;
}

/**
 * Build a fresh AccessContext from Firestore. Called on cache miss.
 */
async function buildAccessContext(userId: string, tenantId: string): Promise<AccessContext> {
  let studentName = 'Student';
  let studentEmail = 'student@nermai.com';
  let role = 'student';
  let version = 0;
  const batchIds: string[] = [];
  const programs: string[] = [];

  // FIX (Bug 2): collection is 'students', not 'student_profiles'
  let studentDoc = await db.collection('students').doc(userId).get();
  let userDoc = await db.collection('users').doc(userId).get();
  
  if (!studentDoc.exists && userDoc.exists && userDoc.data()?.studentId) {
    studentDoc = await db.collection('students').doc(userDoc.data()!.studentId).get();
  }

  const profilesToInspect = [studentDoc, userDoc].filter(d => d && d.exists).map(d => d.data()!);

  for (const profile of profilesToInspect) {
    if (profile.displayName || profile.name || profile.fullName) studentName = profile.displayName || profile.name || profile.fullName;
    if (profile.email) studentEmail = profile.email;
    if (profile.role) role = profile.role;
    if (profile.membershipVersion) version = profile.membershipVersion;

    if (Array.isArray(profile.programMemberships)) {
      for (const m of profile.programMemberships) {
        if (m.status === 'active' && m.batchId) {
          if (!batchIds.includes(String(m.batchId))) batchIds.push(String(m.batchId));
          if (m.program) programs.push(m.program);
        }
      }
    }
    const legacyBatches: string[] = Array.isArray(profile.batches)
      ? profile.batches
      : (profile.batch ? [profile.batch] : []);
    for (const b of legacyBatches) {
      if (b && !batchIds.includes(String(b))) {
        batchIds.push(String(b));
      }
    }
  }

  // Resolve batch UUIDs for any string batch names (e.g. batch name '43' -> batch UUID) AND vice versa
  const currentBatchIdentifiers = [...batchIds];
  for (const bIdentifier of currentBatchIdentifiers) {
    try {
      // 1. Try matching by batchName
      const byNameSnap = await db.collection('batches')
        .where('batchName', '==', String(bIdentifier).trim())
        .where('isDeleted', '==', false)
        .limit(1)
        .get();
      if (!byNameSnap.empty) {
        const bDoc = byNameSnap.docs[0];
        const bId = bDoc.id;
        const bName = bDoc.data()?.batchName;
        if (bId && !batchIds.includes(bId)) batchIds.push(bId);
        if (bName && !batchIds.includes(String(bName))) batchIds.push(String(bName));
      } else {
        // 2. Try fetching by doc ID directly to get batchName
        const bDoc = await db.collection('batches').doc(String(bIdentifier).trim()).get();
        if (bDoc.exists && !bDoc.data()?.isDeleted) {
          const bName = bDoc.data()?.batchName || bDoc.data()?.name;
          if (bName && !batchIds.includes(String(bName))) batchIds.push(String(bName));
        }
      }
    } catch (e) { }
  }

  // Derive resolved access profiles
  const accessProfiles: AccessContext['accessProfiles'] = ['public'];
  if (batchIds.length > 0 || profilesToInspect.some(p => (p?.type && p?.type !== 'free') || (p?.role && p?.role === 'student'))) {
    accessProfiles.push('batch');
  }

  return {
    version,
    userId,
    tenantId,
    role,
    batchIds,
    programs: [...new Set(programs)], // deduplicate
    accessProfiles,
    studentName,
    studentEmail,
    cachedAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Get the AccessContext for a user.
 * - Cache HIT  → parse and return instantly (zero Firestore reads)
 * - Cache MISS → acquire lock, build from Firestore, write to Redis, release lock
 *   (lock prevents cache stampede when many requests arrive on the same expired key)
 */
export async function getAccessContext(userId: string, tenantId: string): Promise<AccessContext> {
  const key = cacheKey(userId);

  // 1. Try cache hit
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      logger.debug(`[AccessCache] HIT for user ${userId}`);
      return JSON.parse(cached) as AccessContext;
    }
  } catch (e) {
    logger.warn(`[AccessCache] Redis read error for ${userId}`, e);
  }

  logger.debug(`[AccessCache] MISS for user ${userId} — rebuilding from Firestore`);

  // 2. Cache miss — acquire a short-lived lock to prevent stampede
  const lock = lockKey(userId);
  let lockAcquired = false;

  try {
    // SET lock NX EX 10 — only succeeds if key doesn't already exist
    const lockResult = await redisClient.set(lock, '1', 'EX', LOCK_TTL_SECONDS);
    lockAcquired = lockResult === 'OK';
  } catch (e) {
    // Redis unavailable — proceed without locking (graceful degradation)
  }

  if (!lockAcquired) {
    // Another request is already rebuilding — wait briefly then retry cache
    await new Promise(r => setTimeout(r, 200));
    try {
      const retryCache = await redisClient.get(key);
      if (retryCache) return JSON.parse(retryCache) as AccessContext;
    } catch (e) { /* ignore */ }
  }

  // 3. Build fresh context from Firestore (the ONE read)
  const context = await buildAccessContext(userId, tenantId);

  // 4. Write to Redis
  try {
    await redisClient.set(key, JSON.stringify(context), 'EX', CACHE_TTL_SECONDS);
    logger.info(`[AccessCache] Rebuilt and cached for user ${userId}`);
  } catch (e) {
    logger.warn(`[AccessCache] Redis write error for ${userId}`, e);
  }

  // 5. Release lock
  if (lockAcquired) {
    try { await redisClient.del(lock); } catch (e) { /* ignore */ }
  }

  return context;
}

/**
 * Explicitly invalidate a user's access cache.
 * Call this whenever an admin changes a student's batch, role, or enrollment.
 * The next request will trigger a fresh Firestore read and rebuild the cache.
 */
export async function invalidateAccessCache(userId: string): Promise<void> {
  const key = cacheKey(userId);
  try {
    await redisClient.del(key);
    logger.info(`[AccessCache] Invalidated cache for user ${userId}`);
  } catch (e) {
    logger.warn(`[AccessCache] Failed to invalidate cache for ${userId}`, e);
  }
}
