import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getCollectionTrends, getTenantRiskTable } from "../controllers/analyticsController.js";

const router = Router();
router.use(requireAuth);

router.get("/collection-trends", getCollectionTrends);
router.get("/tenant-risk", getTenantRiskTable);

export default router;
