import { Router } from "express";
import { StudentController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * STUDENT ROUTES
 * Base Route: /api/erp/student
 * SECURITY: All routes require auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

// Get all students (with search, filter, pagination, sorting)
router.get("/", StudentController.getAll);

// Get single student
router.get("/:id", StudentController.getOne);

// Create student
router.post("/", StudentController.create);

// Update student
router.put("/:id", StudentController.update);

// Bulk update credentials for batch (super_admin only — highly privileged)
router.post("/bulk/credentials", requireRole(['super_admin']), StudentController.bulkUpdateCredentials);

// Soft delete student
router.delete("/:id", StudentController.delete);

export default router;
