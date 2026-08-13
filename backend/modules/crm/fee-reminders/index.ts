import { Router } from "express";
import reminderRoutes from "./routes";

const router = Router();
router.use("/", reminderRoutes);
export default router;
