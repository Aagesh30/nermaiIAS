import { Router } from "express";
import { LeadsController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * LEADS ROUTES
 * Base Route: /api/crm/leads
 * SECURITY:
 *   - Create lead (POST /): unauthenticated OK (website form for prospective students)
 *   - Guest login (POST /guest-login): public — issues a server-signed JWT after Firebase Google auth
 *   - Notify (POST /notify): admin/staff only
 *   - Get all leads, update status, manage interests: admin/staff only
 *   - Get lead notifications: authenticated or admin
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Public: submit a lead enquiry from the website
router.post("/", LeadsController.create);

// Public: guest login — called after Firebase Google sign-in to register/find the lead and get a JWT
router.post("/guest-login", LeadsController.guestLogin);

// Admin: manage leads
router.get("/", requireAuth, requireRole(adminRoles), LeadsController.getAll);
router.patch("/:id", requireAuth, requireRole(adminRoles), LeadsController.updateStatus);
router.post("/:leadId/interest", requireAuth, requireRole(adminRoles), LeadsController.addCourseInterest);
router.get("/:leadId/notifications", requireAuth, requireRole(adminRoles), LeadsController.getLeadNotifications);

// Admin: send notification to leads
router.post("/notify", requireAuth, requireRole(adminRoles), LeadsController.sendNotification);

export default router;

