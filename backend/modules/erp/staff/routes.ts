import { Router } from "express";
import { StaffController } from "./controller";
import { requireAuth, requireRole, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * STAFF ROUTES
 * Base Route: /api/erp/staff
 * SECURITY: Requires auth + admin role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin'];

router.use(requireAuth);

const requireSelfStaffOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  const { role, userId } = req.user;
  if (adminRoles.includes(role)) {
    return next();
  }
  if (req.params.id === userId) {
    return next();
  }
  return res.status(403).json({ status: "error", message: "Forbidden: Access denied" });
};

router.get("/profile/me", StaffController.getMe);
router.get("/:id", requireSelfStaffOrAdmin, StaffController.getOne);

// All other endpoints require full admin roles
router.use(requireRole(adminRoles));

router.get("/", requirePermission("staff_management", "R"), StaffController.getAll);
router.post("/", requirePermission("staff_management", "C"), StaffController.create);
router.put("/:id", requirePermission("staff_management", "U"), StaffController.update);
router.delete("/:id", requirePermission("staff_management", "D"), StaffController.delete);

export default router;
