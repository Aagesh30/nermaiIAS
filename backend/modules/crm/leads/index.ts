import { Router } from "express";
import leadsRoutes from "./routes";

const router = Router();
router.use("/", leadsRoutes);
export default router;
