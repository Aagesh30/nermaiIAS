import { Router } from "express";
import { StudentController } from "./controller";
import { requireAuth, requireRole, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * STUDENT ROUTES
 * Base Route: /api/erp/student
 * SECURITY: All routes require auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff', 'editor', 'contributor', 'teacher', 'developer'];

router.use(requireAuth);

// Self-service routes: any authenticated student can access their own profile
router.get("/profile/me", StudentController.getMe);
router.put("/profile/me", StudentController.updateMe);

// All other endpoints require full admin/staff roles
router.use(requireRole(adminRoles));

// Get all students (with search, filter, pagination, sorting)
router.get("/", requirePermission("student_management", "R"), StudentController.getAll);

// Get single student
router.get("/:id", requirePermission("student_management", "R"), StudentController.getOne);

// Create student
router.post("/", requirePermission("student_management", "C"), StudentController.create);

// Update student
router.put("/:id", (req, res, next) => {
  let featureKey = "student_management";
  const bodyKeys = Object.keys(req.body || {});
  
  const idCardKeys = ["idCardGenerated", "idCardTheme", "idCardRole", "idCardExpiry"];
  const hallTicketKeys = ["hallTicketGenerated", "hallTicketExamName", "hallTicketExamDate", "hallTicketVenue", "hallTicketTime", "hallTicketInstructions"];
  const feesKeys = ["feesPaid", "totalFees", "modeOfPayment", "transactionId"];
  
  const hasIdCardKeys = bodyKeys.some(k => idCardKeys.includes(k));
  const hasHallTicketKeys = bodyKeys.some(k => hallTicketKeys.includes(k));
  const hasFeesKeys = bodyKeys.some(k => feesKeys.includes(k));
  const hasOtherKeys = bodyKeys.some(k => !idCardKeys.includes(k) && !hallTicketKeys.includes(k) && !feesKeys.includes(k) && k !== "updatedBy");

  if (!hasOtherKeys) {
    if (hasIdCardKeys && !hasHallTicketKeys && !hasFeesKeys) {
      featureKey = "id_card";
    } else if (hasHallTicketKeys && !hasIdCardKeys && !hasFeesKeys) {
      featureKey = "hall_ticket";
    } else if (hasFeesKeys && !hasIdCardKeys && !hasHallTicketKeys) {
      featureKey = "fees_management";
    }
  }
  
  return requirePermission(featureKey, "U")(req, res, next);
}, StudentController.update);

// Bulk update credentials for batch (super_admin only — highly privileged)
router.post("/bulk/credentials", requireRole(['super_admin']), StudentController.bulkUpdateCredentials);

// Soft delete student
router.delete("/:id", requirePermission("student_management", "D"), StudentController.delete);

export default router;
