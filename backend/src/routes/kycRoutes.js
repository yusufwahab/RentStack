import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getKycAlerts, acknowledgeKycAlert } from "../controllers/kycController.js";

const router = Router();
router.use(requireAuth);

router.get("/alerts", getKycAlerts);
router.post("/alerts/:id/acknowledge", acknowledgeKycAlert);

export default router;
