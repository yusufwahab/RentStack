import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = Router();
router.get("/", requireAuth, getDashboardStats);

export default router;
