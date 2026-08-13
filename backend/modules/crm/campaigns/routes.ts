import { Router } from "express";
import { CampaignsController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * CAMPAIGNS ROUTES
 * Base Route: /api/crm/campaigns
 * SECURITY:
 *   - Admin operations: require auth + admin role
 *   - Public posters/campaigns listing: unauthenticated OK (marketing content for website)
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Admin-only: create/update and delete campaigns
router.post("/", requireAuth, requireRole(adminRoles), CampaignsController.createOrUpdateCampaign);
router.delete("/:id", requireAuth, requireRole(adminRoles), CampaignsController.deleteCampaign);
router.get("/admin", requireAuth, requireRole(adminRoles), CampaignsController.getAdminCampaigns);

// Public: posters and active campaigns for marketing website
router.get("/posters", CampaignsController.getPosters);
router.get("/", CampaignsController.getCampaigns);

export default router;
