import { Router } from "express";
import { NotificationController } from "./controller";

const router = Router();

// Create/Send bulk notifications
router.post("/bulk", NotificationController.createBulk);

// Create/Send notification
router.post("/", NotificationController.create);

// Get notifications
router.get("/", NotificationController.getNotifications);

// Delete notification
router.delete("/:id", NotificationController.delete);

export default router;
