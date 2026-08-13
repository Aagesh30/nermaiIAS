import { Router } from "express";
import questionBankRoutes from "./routes";

const router = Router();

/**
 * Question Bank Module
 *
 * Base Route:
 * /api/test-portal/question-bank
 */
router.use("/", questionBankRoutes);

export default router;