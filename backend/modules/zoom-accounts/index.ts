import { Router } from "express";
import { ZoomAccountsController } from "./controller";

// Note: Ensure requireAuth and requireRole middlewares are applied where this router is mounted,
// or import and apply them here if necessary. 
// Assuming Developer Portal routes are already protected at the top level or via DeveloperController.
// Actually, let's explicitly require admin authentication here to be safe since it handles secrets.
import { requireAuth, requireRole } from "../../core/middleware/auth.middleware";

const router = Router();

// All Zoom Account management requires super_admin or admin
router.use(requireAuth, requireRole(['super_admin', 'admin']));

router.get("/", ZoomAccountsController.getAccounts);
router.post("/", ZoomAccountsController.createAccount);
router.put("/:id", ZoomAccountsController.updateAccount);
router.delete("/:id", ZoomAccountsController.deleteAccount);
router.post("/:id/test", ZoomAccountsController.testAccount);
router.post("/:id/test-cleanup", ZoomAccountsController.testCleanup);

export default router;
