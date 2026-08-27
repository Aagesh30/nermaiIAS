import { Router } from "express";
import { DeveloperController } from "./controller";
import { requireAuth, requireRole } from "../../core/middleware/auth.middleware";
import { AppError } from "../../core/errors/AppError";

const router = Router();

const requireDeveloperOrSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return next(new AppError('Forbidden: User not authenticated', 403));
  }
  if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
    return next(new AppError('Forbidden: Developer or Super Admin access only', 403));
  }
  next();
};

/**
 * ==========================================
 * DEVELOPER PORTAL ROUTES
 * Base Route: /api/developer
 *
 * SECURITY: All routes require super_admin authentication.
 * Developer portal login is removed — use the standard admin
 * login at /api/auth/login, then use the returned JWT token.
 * ==========================================
 */

// GET /page-locks is public (needed for client routing even before login)
router.get("/page-locks", DeveloperController.getPageLocks);

// Protect ALL other developer routes: must be authenticated
router.use(requireAuth);

// Role permissions reading is allowed for all admin/staff roles so their frontend can configure views
router.get("/role-permissions", requireRole(['super_admin', 'admin', 'staff', 'developer', 'editor', 'contributor']), DeveloperController.getRolePermissions);

// Custom Role Permissions Management (Writes) - super_admin and developer only
router.put("/role-permissions/:role", requireRole(['super_admin', 'developer']), DeveloperController.updateRolePermissions);

// Allow admin/staff roles to submit approval request notifications
router.post("/collection/notifications", requireRole(['super_admin', 'admin', 'staff', 'developer', 'editor', 'contributor']), (req, res, next) => {
  req.params.name = "notifications";
  next();
}, DeveloperController.createDocument);

// Allow all staff roles to fetch approvals list so standard editors/admins can see their pending requests
router.get("/collection/notifications", requireRole(['super_admin', 'admin', 'staff', 'developer', 'editor', 'contributor']), (req, res, next) => {
  req.params.name = "notifications";
  next();
}, DeveloperController.getDocuments);

// Allow super_admin and developer to update/process notifications (Approve / Reject)
router.put("/collection/notifications/:docId", requireRole(['super_admin', 'developer']), (req, res, next) => {
  req.params.name = "notifications";
  next();
}, DeveloperController.updateDocument);

// Allow all staff/admin roles to fetch one-time permissions
router.get("/collection/one_time_permissions", requireRole(['super_admin', 'admin', 'staff', 'developer', 'editor', 'contributor']), (req, res, next) => {
  req.params.name = "one_time_permissions";
  next();
}, DeveloperController.getDocuments);

// Consume one-time permission (staff/admin)
router.post("/consume-one-time-permission", requireRole(['super_admin', 'admin', 'staff', 'developer', 'editor', 'contributor']), DeveloperController.consumeOneTimePermission);

// Approve one-time permission (super_admin/developer only)
router.post("/approve-one-time-permission", requireRole(['super_admin', 'developer']), DeveloperController.approveOneTimePermission);

// All other developer routes require developer or super_admin role only (admin is forbidden)
router.use(requireDeveloperOrSuperAdmin);

// Collection overview
router.get("/collections", DeveloperController.listCollections);

// CRUD on any collection
router.get("/collection/:name", DeveloperController.getDocuments);
router.get("/collection/:name/:docId", DeveloperController.getDocument);
router.post("/collection/:name", DeveloperController.createDocument);
router.put("/collection/:name/:docId", DeveloperController.updateDocument);
router.delete("/collection/:name", DeveloperController.bulkDelete);
router.delete("/collection/:name/:docId", DeveloperController.deleteDocument);

// Raw Firestore query
router.post("/query/:name", DeveloperController.rawQuery);

// Global Page Lock Management
router.put("/page-locks", DeveloperController.updatePageLocks);

// ── Google Drive Config (Super Admin only) ────────────────────────────────────
// NOTE: test route must come before :name wildcard routes, so it's registered here explicitly
router.get("/drive-config", DeveloperController.getDriveConfig);
router.put("/drive-config", DeveloperController.saveDriveConfig);
router.post("/drive-config/test", DeveloperController.testDriveConnection);

export default router;
