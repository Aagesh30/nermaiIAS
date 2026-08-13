import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole, requireAuthOrQueryToken } from '../../core/middleware/auth.middleware';
import * as Controller from './controller';

const upload = multer({ storage: multer.memoryStorage() });

export const resourceRoutes = Router();

const adminRoles = ['super_admin', 'admin', 'staff', 'teacher', 'editor', 'developer'];

// ─── List & Create ───────────────────────────────────────────────────────────
resourceRoutes.get('/', requireAuth, Controller.list);
resourceRoutes.post('/', requireAuth, requireRole(adminRoles), upload.single('file'), Controller.create);

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

resourceRoutes.post('/:id/version', requireAuth, requireRole(adminRoles), upload.single('file'), Controller.uploadVersion);

// ─── Generic /:id — LAST so it doesn't shadow the sub-paths above ─────────────
resourceRoutes.get('/:id', requireAuth, Controller.getById);
resourceRoutes.put('/:id', requireAuth, requireRole(adminRoles), Controller.update);
resourceRoutes.delete('/:id', requireAuth, requireRole(adminRoles), Controller.remove);
