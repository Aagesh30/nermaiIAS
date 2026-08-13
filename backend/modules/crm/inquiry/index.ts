import { Router } from "express";
import inquiryRoutes from "./routes";

const router = Router();
router.use("/", inquiryRoutes);
export default router;
