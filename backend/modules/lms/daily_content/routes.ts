import { Router } from "express";
import { DailyContentController } from "./controller";

const router = Router();

router.post("/", DailyContentController.createDailyContent);
router.get("/", DailyContentController.getDailyContent);
router.delete("/:id", DailyContentController.deleteDailyContent);

export default router;
