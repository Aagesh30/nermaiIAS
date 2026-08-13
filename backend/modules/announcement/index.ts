import { Router } from "express";
import announcementRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * ANNOUNCEMENT MODULE
 *
 * Base Route:
 * /api/announcement
 * ==========================================
 */

router.use("/", announcementRoutes);

export default router;
