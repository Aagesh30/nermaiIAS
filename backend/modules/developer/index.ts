import { Router } from "express";
import { DeveloperController } from "./controller";
import { requireAuth, requireRole } from "../../core/middleware/auth.middleware";

const router = Router();

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
router.get("/role-permissions", requireRole(['super_admin', 'admin', 'staff']), DeveloperController.getRolePermissions);

// Allow admin/staff roles to submit approval request notifications
router.post("/collection/notifications", requireRole(['super_admin', 'admin', 'staff']), (req, res, next) => {
  req.params.name = "notifications";
  next();
}, DeveloperController.createDocument);

// All other developer routes require super_admin role
router.use(requireRole(['super_admin']));

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

// Custom Role Permissions Management (Writes)
router.put("/role-permissions/:role", DeveloperController.updateRolePermissions);

// Global Page Lock Management
router.put("/page-locks", DeveloperController.updatePageLocks);

// ── Google Drive Config (Super Admin only) ────────────────────────────────────
// NOTE: test route must come before :name wildcard routes, so it's registered here explicitly
router.get("/drive-config", DeveloperController.getDriveConfig);
router.put("/drive-config", DeveloperController.saveDriveConfig);
router.post("/drive-config/test", DeveloperController.testDriveConnection);

export default router;
