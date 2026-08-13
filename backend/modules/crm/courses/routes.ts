import { Router } from "express";
import { CoursesController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * CRM COURSES ROUTES
 * Base Route: /api/crm/courses
 * SECURITY:
 *   - Get all (GET): unauthenticated OK (public course catalog for marketing)
 *   - Create/update/delete: admin/staff only
 *   - Mark interest (POST /:courseId/interest): authenticated users (lead/student)
 *   - Get interests (GET /:courseId/interests): admin/staff only
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Public: course listing for marketing/website
router.get("/", CoursesController.getAll);

// Admin: create/update and delete courses
router.post("/", requireAuth, requireRole(adminRoles), CoursesController.createOrUpdate);
router.delete("/:id", requireAuth, requireRole(adminRoles), CoursesController.delete);

// Authenticated: mark course interest (used by leads/students)
router.post("/:courseId/interest", requireAuth, CoursesController.markInterest);

// Admin: view who marked interest
router.get("/:courseId/interests", requireAuth, requireRole(adminRoles), CoursesController.getCourseInterests);

export default router;
