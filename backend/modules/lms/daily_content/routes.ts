import { Router } from "express";
import { DailyContentController } from "./controller";
import { requireAuth, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

router.post("/", [requireAuth, requirePermission("lms_daily_content", "C")], DailyContentController.createDailyContent);
router.get("/", requireAuth, (req, res, next) => {
  if (req.user && (req.user.role === 'student' || req.user.role === 'guest')) {
    return next();
  }
  return requirePermission("lms_daily_content", "R")(req, res, next);
}, DailyContentController.getDailyContent);
router.delete("/:id", [requireAuth, requirePermission("lms_daily_content", "D")], DailyContentController.deleteDailyContent);

export default router;
