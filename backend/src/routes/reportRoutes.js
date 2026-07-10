import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getReports, exportReportsCsv, exportAnnualStatementCsv } from "../controllers/reportController.js";

const router = Router();
router.use(requireAuth);

router.get("/", getReports);
router.get("/export/csv", exportReportsCsv);
router.get("/annual-statement/csv", exportAnnualStatementCsv);

export default router;
