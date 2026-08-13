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

// Protect ALL developer routes: must be authenticated AND super_admin
router.use(requireAuth);
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

// Custom Role Permissions Management
router.get("/role-permissions", DeveloperController.getRolePermissions);
router.put("/role-permissions/:role", DeveloperController.updateRolePermissions);

// Global Page Lock Management
router.get("/page-locks", DeveloperController.getPageLocks);
router.put("/page-locks", DeveloperController.updatePageLocks);

export default router;
