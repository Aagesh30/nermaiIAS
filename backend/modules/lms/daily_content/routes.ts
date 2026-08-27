import { Router } from "express";
import { DailyContentController } from "./controller";
import { requireAuth, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

router.post("/", [requireAuth, requirePermission("lms_daily_content", "C")], DailyContentController.createDailyContent);
router.get("/", [requireAuth, requirePermission("lms_daily_content", "R")], DailyContentController.getDailyContent);
router.delete("/:id", [requireAuth, requirePermission("lms_daily_content", "D")], DailyContentController.deleteDailyContent);

export default router;
