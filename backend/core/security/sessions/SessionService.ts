/**
 * SessionService — secure session lifecycle management.
 *
 * Sessions are stored in Firestore `sessions` collection.
 * Refresh tokens are stored as SHA-256 hashes — the plaintext token is
 * NEVER persisted to the database (same principle as password hashing).
 *
 * Security properties:
 * - Refresh token plaintext exists only in memory at generation time + in the HTTP response
 * - Server stores only the hash; compromise of the sessions collection does NOT expose tokens
 * - Token rotation: each refresh invalidates the old token and issues a new one
 * - Reuse detection: a consumed refresh token triggers session revocation (theft indicator)
 * - Revocation: immediate, propagated to all checks via Firestore
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '../../../infrastructure/firebase';
import { logger } from '../../logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  deviceId?: string;
  platform?: 'web' | 'ios' | 'android' | 'unknown';
  os?: string;
  browser?: string;
  appVersion?: string;
  ip?: string;
  userAgent?: string;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: string;
  deviceId: string;
  platform: string;
  os: string;
  browser: string;
  appVersion: string;
  ip: string;
  userAgent: string;
  createdAt: string;       // ISO timestamp
  lastSeenAt: string;      // ISO timestamp
  expiresAt: string;       // ISO timestamp — when the refresh token expires
  revokedAt: string | null;
  revokedReason: string | null;
  refreshTokenHash: string; // SHA-256 of the refresh token (not plaintext)
  riskScore: number;
}

export interface CreateSessionResult {
  sessionId: string;
  refreshToken: string;    // Plaintext — return to client, do NOT store
  expiresAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSIONS_COLLECTION = 'sessions';
const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_BYTES = 48; // 384 bits of entropy

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a cryptographically secure random refresh token. */
function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/** SHA-256 hash of the refresh token. Only this is stored in Firestore. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionId(): string {
  return randomBytes(16).toString('hex');
}

function expiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d.toISOString();
}

// ── SessionService ─────────────────────────────────────────────────────────────

export class SessionService {
  /**
   * Create a new session record and return a refresh token (plaintext).
   * The plaintext is returned ONCE — it is NOT stored.
   */
  static async create(
    userId: string,
    tenantId: string,
    role: string,
    device: DeviceInfo = {}
  ): Promise<CreateSessionResult> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const now = new Date().toISOString();
    const sid = sessionId();
    const expiry = expiresAt();

    const record: SessionRecord = {
      sessionId: sid,
      userId,
      tenantId,
      role,
      deviceId: device.deviceId || sid, // fallback: use sessionId as device fingerprint
      platform: device.platform || 'unknown',
      os: device.os || '',
      browser: device.browser || '',
      appVersion: device.appVersion || '',
      ip: device.ip || '',
      userAgent: device.userAgent || '',
      createdAt: now,
      lastSeenAt: now,
      expiresAt: expiry,
      revokedAt: null,
      revokedReason: null,
      refreshTokenHash: tokenHash,
      riskScore: 0,
    };

    try {
      await db.collection(SESSIONS_COLLECTION).doc(sid).set(record);
      logger.info(`[SessionService] Created session ${sid} for user ${userId}`);
    } catch (err) {
      logger.error(`[SessionService] Failed to create session`, err);
      throw new Error('Failed to create session');
    }

    return { sessionId: sid, refreshToken, expiresAt: expiry };
  }

  /**
   * Validate a refresh token and rotate it (issue a new one).
   *
   * Reuse detection: if the token hash is NOT found (already consumed or never existed),
   * the session is revoked immediately as a theft indicator.
   *
   * Returns null if the token is invalid/expired/revoked.
   */
  static async rotate(
    sessionId: string,
    incomingRefreshToken: string
  ): Promise<{ refreshToken: string; expiresAt: string; session: SessionRecord } | null> {
    let sessionDoc: any;
    try {
      sessionDoc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    } catch (err) {
      logger.error(`[SessionService] Failed to read session ${sessionId}`, err);
      return null;
    }

    if (!sessionDoc.exists) {
      logger.warn(`[SessionService] Refresh: session ${sessionId} not found`);
      return null;
    }

    const session = sessionDoc.data() as SessionRecord;

    // ── Revoked ───────────────────────────────────────────────────────────────
    if (session.revokedAt) {
      logger.warn(`[SessionService] Refresh attempt on revoked session ${sessionId}`);
      return null;
    }

    // ── Expired ───────────────────────────────────────────────────────────────
    if (new Date(session.expiresAt) < new Date()) {
      logger.warn(`[SessionService] Refresh token expired for session ${sessionId}`);
      return null;
    }

    // ── Reuse Detection ───────────────────────────────────────────────────────
    const incomingHash = hashToken(incomingRefreshToken);
    if (incomingHash !== session.refreshTokenHash) {
      // Token hash mismatch — possible token theft / replay attack.
      // Revoke the session immediately.
      logger.warn(`[SessionService] Refresh token reuse detected for session ${sessionId} — revoking`);
      await SessionService.revoke(sessionId, 'REFRESH_TOKEN_REUSE');
      return null;
    }

    // ── Rotate ────────────────────────────────────────────────────────────────
    const newToken = generateRefreshToken();
    const newHash = hashToken(newToken);
    const newExpiry = expiresAt();
    const now = new Date().toISOString();

    try {
      await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
        refreshTokenHash: newHash,
        expiresAt: newExpiry,
        lastSeenAt: now,
      });
    } catch (err) {
      logger.error(`[SessionService] Failed to rotate session ${sessionId}`, err);
      return null;
    }

    logger.info(`[SessionService] Rotated refresh token for session ${sessionId}`);
    return { refreshToken: newToken, expiresAt: newExpiry, session };
  }

  /**
   * Revoke a specific session (logout).
   */
  static async revoke(sessionId: string, reason: string = 'LOGOUT'): Promise<void> {
    try {
      await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
        revokedAt: new Date().toISOString(),
        revokedReason: reason,
        refreshTokenHash: '', // Invalidate the stored hash
      });
      logger.info(`[SessionService] Revoked session ${sessionId} (${reason})`);
    } catch (err) {
      logger.error(`[SessionService] Failed to revoke session ${sessionId}`, err);
    }
  }

  /**
   * Revoke ALL sessions for a user (logout-all / password-change).
   */
  static async revokeAll(userId: string, reason: string = 'LOGOUT_ALL'): Promise<number> {
    try {
      const snapshot = await db.collection(SESSIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('revokedAt', '==', null)
        .get();

      if (snapshot.empty) return 0;

      const now = new Date().toISOString();
      const batch = db.batch();
      for (const doc of snapshot.docs) {
        batch.update(doc.ref, {
          revokedAt: now,
          revokedReason: reason,
          refreshTokenHash: '',
        });
      }
      await batch.commit();

      logger.info(`[SessionService] Revoked ${snapshot.docs.length} sessions for user ${userId} (${reason})`);
      return snapshot.docs.length;
    } catch (err) {
      logger.error(`[SessionService] Failed to revoke all sessions for user ${userId}`, err);
      return 0;
    }
  }

  /**
   * List active (non-revoked, non-expired) sessions for a user.
   * Returns session metadata — NEVER the refresh token hash.
   */
  static async listActiveSessions(userId: string): Promise<Omit<SessionRecord, 'refreshTokenHash'>[]> {
    try {
      const snapshot = await db.collection(SESSIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('revokedAt', '==', null)
        .get();

      const now = new Date();
      return snapshot.docs
        .map(doc => {
          const { refreshTokenHash, ...safe } = doc.data() as SessionRecord;
          return safe;
        })
        .filter(s => new Date(s.expiresAt) > now);
    } catch (err) {
      logger.error(`[SessionService] Failed to list sessions for user ${userId}`, err);
      return [];
    }
  }

  /**
   * Update lastSeenAt for an active session (called during access token refresh).
   */
  static async touch(sessionId: string): Promise<void> {
    try {
      await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
        lastSeenAt: new Date().toISOString(),
      });
    } catch (err) {
      // Non-fatal — log and continue
      logger.warn(`[SessionService] Failed to touch session ${sessionId}`, err);
    }
  }

  /**
   * Verify that a session is still valid (not revoked, not expired).
   * Used as an optional additional check in high-security operations.
   */
  static async isValid(sessionId: string): Promise<boolean> {
    try {
      const doc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
      if (!doc.exists) return false;
      const session = doc.data() as SessionRecord;
      if (session.revokedAt) return false;
      if (new Date(session.expiresAt) < new Date()) return false;
      return true;
    } catch (err) {
      return false;
    }
  }
}
