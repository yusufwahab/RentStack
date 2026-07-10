import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listTenants,
  getTenant,
  createTenant,
  bulkCreateTenants,
  updateTenant,
  offboardTenant,
  getTenantTransactions,
  getTenantKyc,
  getTenantReliabilityScore,
  shareTenantReliabilityScore,
  shareTenantStatement,
  getTenantNotifications,
  processPayment,
} from "../controllers/tenantController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listTenants);
router.post("/", createTenant);
router.post("/bulk", bulkCreateTenants);
router.get("/:id", getTenant);
router.put("/:id", updateTenant);
router.post("/:id/offboard", offboardTenant);
router.get("/:id/transactions", getTenantTransactions);
router.get("/:id/kyc", getTenantKyc);
router.get("/:id/reliability-score", getTenantReliabilityScore);
router.get("/:id/reliability-score/share", shareTenantReliabilityScore);
router.get("/:id/statement/share", shareTenantStatement);
router.get("/:id/notifications", getTenantNotifications);
router.post("/:id/process-payment", processPayment);

export default router;
