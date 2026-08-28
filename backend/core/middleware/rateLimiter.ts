import rateLimit, { Store } from 'express-rate-limit';
// Fallback to memory store since Redis is not used
let store: Store | undefined = undefined;

/**
 * SECURITY: Rate-limit key MUST use server-verified identity (req.user.userId),
 * NEVER client-supplied headers (user-id, x-student-id, etc.) which can be forged
 * to bypass limits by rotating the spoofed identity.
 *
 * req.user is set exclusively by the auth middleware after JWT/Firebase verification.
 * IP is used as fallback only for unauthenticated endpoints (login, register).
 */
const authenticatedKey = (req: any): string => req.user?.userId || req.ip || 'anon';
const authenticatedKeyWithParam = (req: any, param: string): string =>
  `${req.user?.userId || req.ip || 'anon'}:${req.params?.[param] || ''}`;

// Global limiter — broad protection against floods
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Per-IP, reasonable for large NAT environments
  standardHeaders: true,
  legacyHeaders: false,
  store,
  skip: (req) => req.method === 'OPTIONS', // Skip CORS preflight
});

// Login/auth endpoints — strict, IP-based (user not yet authenticated)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per IP per 15 minutes
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  store,
});

// Token refresh / validation — per IP
export const tokenRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many token validation attempts.',
  standardHeaders: true,
  legacyHeaders: false,
  store,
});

// General exam interactions (answer checks, progress, timer) — per authenticated user
export const examRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  keyGenerator: authenticatedKey,
  message: { success: false, message: 'Too many exam requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

// Test start — per authenticated user + testId (prevents double-click spam)
export const startTestRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // 5 start attempts per user/test per minute
  keyGenerator: (req) => authenticatedKeyWithParam(req, 'testId'),
  message: { success: false, message: 'Test start rate limit exceeded. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

// Answer save / autosave — per authenticated user
export const answerRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // Allows frequent autosave without blocking
  keyGenerator: authenticatedKey,
  message: { success: false, message: 'Answer save rate limit exceeded. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

// AI assistant — per authenticated user (prevents billing abuse)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 AI requests per user per minute
  keyGenerator: authenticatedKey,
  message: { success: false, message: 'AI request rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

// Live comments — per authenticated user (prevents chat spam)
export const commentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 comments per user per minute
  keyGenerator: authenticatedKey,
  message: { success: false, message: 'You are sending messages too quickly.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

// File uploads — per authenticated user
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 uploads per user per hour
  keyGenerator: authenticatedKey,
  message: { success: false, message: 'Upload rate limit exceeded. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  validate: { keyGeneratorIpFallback: false },
});

