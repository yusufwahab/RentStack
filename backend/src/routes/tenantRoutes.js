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
import { getDeposit, recordDeposit, refundDeposit } from "../controllers/depositController.js";
import { listTenantMaintenanceRequests, createMaintenanceRequest } from "../controllers/maintenanceController.js";

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

router.get("/:id/deposit", getDeposit);
router.post("/:id/deposit", recordDeposit);
router.post("/:id/deposit/refund", refundDeposit);

router.get("/:id/maintenance-requests", listTenantMaintenanceRequests);
router.post("/:id/maintenance-requests", createMaintenanceRequest);

export default router;
