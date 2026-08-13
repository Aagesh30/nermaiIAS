import { Router } from "express";
import admissionRoutes from "./routes";

const router = Router();
router.use("/", admissionRoutes);
export default router;
