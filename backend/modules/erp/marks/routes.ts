import { Router } from "express";
import { MarksController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * MARKS ROUTES
 * Base Route: /api/erp/marks
 * SECURITY: Requires auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.post("/", MarksController.createOrUpdate);
router.get("/", MarksController.getAllMarks);
router.get("/student/:studentId", MarksController.getStudentMarks);
router.delete("/:id", MarksController.delete);

export default router;
