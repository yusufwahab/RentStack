import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getReports, exportReportsCsv } from "../controllers/reportController.js";

const router = Router();
router.use(requireAuth);

router.get("/", getReports);
router.get("/export/csv", exportReportsCsv);

export default router;
