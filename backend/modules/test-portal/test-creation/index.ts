import { Router } from "express";
import testCreationRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * TEST CREATION MODULE
 *
 * Base Route:
 * /api/test-portal/test-creation
 * ==========================================
 */

router.use("/", testCreationRoutes);

export default router;