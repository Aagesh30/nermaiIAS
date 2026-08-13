import { Router } from "express";
import feedbackRoutes from "./routes";

const router = Router();
router.use("/", feedbackRoutes);
export default router;
