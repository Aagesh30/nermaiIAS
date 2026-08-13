import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware';
import {
  registerStudent,
  loginStudent,
  getFirebaseToken,
  refreshToken,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
} from './controller';

import { authRateLimiter, tokenRateLimiter } from '../../core/middleware/rateLimiter';

export const authRoutes = Router();

// ── Public endpoints (rate-limited by IP) ─────────────────────────────────────
authRoutes.post('/register', authRateLimiter, registerStudent);
authRoutes.post('/login', authRateLimiter, loginStudent);

// ── Refresh token (IP-based rate limit, no auth required — token IS the credential) ──
authRoutes.post('/refresh', tokenRateLimiter, refreshToken);

// ── Authenticated endpoints ───────────────────────────────────────────────────
authRoutes.get('/firebase-token', requireAuth, getFirebaseToken);
authRoutes.post('/logout', requireAuth, logout);
authRoutes.post('/logout-all', requireAuth, logoutAll);
authRoutes.get('/sessions', requireAuth, listSessions);
authRoutes.delete('/sessions/:sessionId', requireAuth, revokeSession);

// ── Debug (authenticated — safe) ─────────────────────────────────────────────
authRoutes.get('/debug', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    uid: req.user?.userId,
    role: req.user?.role,
    tenantId: req.user?.tenantId,
  });
});
