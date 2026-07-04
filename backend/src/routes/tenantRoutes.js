import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  offboardTenant,
  getTenantTransactions,
  getTenantKyc,
  getTenantReliabilityScore,
  shareTenantReliabilityScore,
  shareTenantStatement,
  getTenantSmsLog,
} from "../controllers/tenantController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listTenants);
router.post("/", createTenant);
router.get("/:id", getTenant);
router.put("/:id", updateTenant);
router.post("/:id/offboard", offboardTenant);
router.get("/:id/transactions", getTenantTransactions);
router.get("/:id/kyc", getTenantKyc);
router.get("/:id/reliability-score", getTenantReliabilityScore);
router.get("/:id/reliability-score/share", shareTenantReliabilityScore);
router.get("/:id/statement/share", shareTenantStatement);
router.get("/:id/sms-log", getTenantSmsLog);

export default router;
