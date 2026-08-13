import { Router } from "express";
import { AnnouncementController } from "./controller";

const router = Router();

/**
 * ==========================================
 * ANNOUNCEMENT ROUTES
 * Base Route: /api/announcement
 * ==========================================
 */

// Get all announcements
router.get("/", AnnouncementController.getAll);

// Get single announcement
router.get("/:id", AnnouncementController.getOne);

// Create announcement
router.post("/", AnnouncementController.create);

// Update announcement
router.put("/:id", AnnouncementController.update);

// Soft delete announcement
router.delete("/:id", AnnouncementController.delete);

export default router;
