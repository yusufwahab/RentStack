import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getDashboardStats, sendReminders } from "../controllers/dashboardController.js";

const router = Router();
router.get("/", requireAuth, getDashboardStats);
router.post("/send-reminders", requireAuth, sendReminders);

export default router;
