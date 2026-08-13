import { Router } from "express";
import { InquiryController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * INQUIRY ROUTES
 * Base Route: /api/crm/inquiry
 * SECURITY:
 *   - Submit inquiry (POST): unauthenticated OK (website contact form for prospective students)
 *   - View/manage inquiries (GET, PATCH, DELETE): admin/staff only
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Public: website contact form (unauthenticated visitors may submit inquiries)
router.post("/", InquiryController.create);

// Admin: view and manage inquiries
router.get("/", requireAuth, requireRole(adminRoles), InquiryController.getAll);
router.patch("/:id", requireAuth, requireRole(adminRoles), InquiryController.updateStatus);
router.delete("/:id", requireAuth, requireRole(adminRoles), InquiryController.delete);

export default router;
