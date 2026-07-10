import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getCollectionTrends, getTenantRiskTable, getVacancyStats } from "../controllers/analyticsController.js";

const router = Router();
router.use(requireAuth);

router.get("/collection-trends", getCollectionTrends);
router.get("/tenant-risk", getTenantRiskTable);
router.get("/vacancy", getVacancyStats);

export default router;
