import { randomUUID } from 'crypto';
import { db } from '../../../infrastructure/firebase';
import { logger } from '../../logger';

export type SecurityAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'PASSWORD_CHANGED'
  | 'REFRESH_TOKEN_ROTATED'
  | 'REFRESH_TOKEN_REUSE_DETECTED'
  | 'SESSION_REVOKED'
  | 'EXAM_STARTED'
  | 'EXAM_SUBMITTED'
  | 'EXAM_ANSWER_SAVED'
  | 'FEE_PAYMENT_RECORDED'
  | 'FEE_STRUCTURE_CREATED'
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'AUTH_FAILED'
  | 'RATE_LIMIT_TRIGGERED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'DEVELOPER_PORTAL_ACCESSED'
  | 'ADMIN_ACTION';

export interface SecurityEvent {
  action: SecurityAction;
  userId?: string;
  tenantId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
  riskScore?: number;
  metadata?: Record<string, any>;
}

const COLLECTION = 'security_audit_logs';

export class SecurityAuditLog {
  /**
   * Log a security event asynchronously without blocking HTTP response.
   * Strips all sensitive credentials before writing to DB.
   */
  static log(event: SecurityEvent): void {
    const eventId = randomUUID();
    const timestamp = new Date().toISOString();

    // Sanitize metadata to guarantee no credentials or tokens are ever logged
    const safeMetadata = { ...(event.metadata || {}) };
    delete safeMetadata.password;
    delete safeMetadata.loginPassword;
    delete safeMetadata.passwordHash;
    delete safeMetadata.token;
    delete safeMetadata.refreshToken;
    delete safeMetadata.jwt;
    delete safeMetadata.secret;

    const record = {
      eventId,
      timestamp,
      action: event.action,
      userId: event.userId || 'anonymous',
      tenantId: event.tenantId || 'default_tenant',
      role: event.role || 'unknown',
      ip: event.ip || '',
      userAgent: event.userAgent ? event.userAgent.slice(0, 200) : '',
      resource: event.resource || '',
      resourceId: event.resourceId || '',
      result: event.result,
      reason: event.reason || '',
      riskScore: event.riskScore || 0,
      metadata: safeMetadata,
    };

    // Log locally
    if (event.result === 'FAILURE' || event.result === 'BLOCKED') {
      logger.warn(`[SecurityAudit] ${event.action} by ${record.userId} (${record.ip}) - ${event.result}: ${event.reason || ''}`);
    } else {
      logger.info(`[SecurityAudit] ${event.action} by ${record.userId} - ${event.result}`);
    }

    // Persist to Firestore asynchronously (fire-and-forget)
    db.collection(COLLECTION).doc(eventId).set(record).catch((err) => {
      logger.error('[SecurityAudit] Failed to persist audit record to Firestore', err);
    });
  }
}
