import { Router } from "express";
import notificationRoutes from "./routes";

const router = Router();

router.use("/", notificationRoutes);

export default router;
