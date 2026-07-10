import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listMaintenanceRequests, updateMaintenanceRequestStatus } from "../controllers/maintenanceController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listMaintenanceRequests);
router.put("/:id", updateMaintenanceRequestStatus);

export default router;
