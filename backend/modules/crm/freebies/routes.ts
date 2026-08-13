import { Router } from "express";
import { FreebiesController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * FREEBIES ROUTES
 * Base Route: /api/crm/freebies
 * SECURITY:
 *   - Public GET: unauthenticated OK (freebies listing for website/marketing)
 *   - Admin GET/POST/DELETE: require auth + admin role
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Public: active freebies for website visitors
router.get("/", FreebiesController.getFreebies);

// Admin: manage freebies
router.post("/", requireAuth, requireRole(adminRoles), FreebiesController.createOrUpdateFreebie);
router.get("/admin", requireAuth, requireRole(adminRoles), FreebiesController.getAdminFreebies);
router.delete("/:id", requireAuth, requireRole(adminRoles), FreebiesController.deleteFreebie);

export default router;
