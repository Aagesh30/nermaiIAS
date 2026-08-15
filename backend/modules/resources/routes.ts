import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { requireAuth, requireRole, requireAuthOrQueryToken } from '../../core/middleware/auth.middleware';
import * as Controller from './controller';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Cloud Functions v2 pre-reads the HTTP body into req.rawBody (Buffer) before Express sees it.
 * By the time multer/busboy runs, req has already emitted all data events and is at EOF.
 *
 * Fix: If rawBody exists, we patch req so that multer can re-read it:
 *   - req.pipe() → pipe from a fresh Readable wrapping rawBody
 *   - req.on('data'/'end') → emit from rawBody immediately
 * This keeps the real req object (with correct headers/content-type/boundary) intact.
 */
const multerCloudWrapper = (multerMiddleware: any) => {
  return (req: any, res: any, next: any) => {
    if (!req.rawBody) {
      // Not a Cloud Functions environment — normal Express, pass through
      return multerMiddleware(req, res, next);
    }

    const rawBuf: Buffer = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(req.rawBody);

    // Patch req.pipe so multer's busboy can consume the body
    req.pipe = (dest: any) => {
      const readable = Readable.from(rawBuf);
      return readable.pipe(dest);
    };

    // Patch req.on so busboy's data/end listeners fire correctly
    const origOn = req.on.bind(req);
    req.on = (event: string, handler: (...args: any[]) => void) => {
      if (event === 'data') {
        // Emit synchronously on next tick so all listeners are registered first
        setImmediate(() => handler(rawBuf));
        return req;
      }
      if (event === 'end') {
        setImmediate(() => handler());
        return req;
      }
      if (event === 'error') {
        return req; // suppress stream error forwarding
      }
      return origOn(event, handler);
    };

    return multerMiddleware(req, res, next);
  };
};

export const resourceRoutes = Router();

const adminRoles = ['super_admin', 'admin', 'staff', 'teacher', 'editor', 'developer'];

// ─── List & Create ───────────────────────────────────────────────────────────
resourceRoutes.get('/', requireAuth, Controller.list);
resourceRoutes.post('/', requireAuth, requireRole(adminRoles), multerCloudWrapper(upload.single('file')), Controller.create);

// ─── Sub-resource routes MUST come before /:id to avoid Express 5 greedy match ──
// Express 5 changed path matching — /:id will shadow /:id/access etc unless ordered correctly.
resourceRoutes.get('/course/:courseId/hierarchy', requireAuth, Controller.getCourseHierarchy);

// IMPORTANT: /:id/access and /:id/content BEFORE /:id (generic)
resourceRoutes.get('/:id/access', requireAuth, Controller.getAccess);

// Web browsers cannot send Authorization headers on window.open / Linking.openURL.
// This route accepts ?token= as a fallback so the web UI can open PDFs directly in browser.
// Note: This expects a standard FIREBASE token or ADMIN token, NOT the viewer token!
resourceRoutes.get('/:id/content', requireAuthOrQueryToken, Controller.streamContent);

// Secure stream for the mobile viewer - expects the short-lived viewerToken
import { requireViewerJwt } from '../../core/middleware/auth.middleware';
resourceRoutes.get('/:id/secure-stream', requireViewerJwt, Controller.streamContent);

resourceRoutes.post('/:id/version', requireAuth, requireRole(adminRoles), multerCloudWrapper(upload.single('file')), Controller.uploadVersion);

// ─── Generic /:id — LAST so it doesn't shadow the sub-paths above ─────────────
resourceRoutes.get('/:id', requireAuth, Controller.getById);
resourceRoutes.put('/:id', requireAuth, requireRole(adminRoles), Controller.update);
resourceRoutes.delete('/:id', requireAuth, requireRole(adminRoles), Controller.remove);
