import { Router } from "express";
import { ProfileRequestController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * PROFILE REQUEST ROUTES
 * Base Route: /api/erp/profile-request
 * SECURITY:
 *   - Submit: authenticated users (students submit their own profile)
 *   - Get all / approve / reject: admin/staff only
 */

router.use(requireAuth);

// Admin: get all profile requests
router.get("/", requireRole(['super_admin', 'admin', 'staff']), ProfileRequestController.getAll);

// Student: get their own profile request status
router.get("/student/:studentId", ProfileRequestController.getByStudent);

// Student: submit a profile request
router.post("/", ProfileRequestController.submit);

// Admin: approve or reject
router.put("/:id/approve", requireRole(['super_admin', 'admin', 'staff']), ProfileRequestController.approve);
router.put("/:id/reject", requireRole(['super_admin', 'admin', 'staff']), ProfileRequestController.reject);

export default router;
