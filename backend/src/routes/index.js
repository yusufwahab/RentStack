import { Router } from "express";
import authRoutes from "./authRoutes.js";
import tenantRoutes from "./tenantRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import reportRoutes from "./reportRoutes.js";
import kycRoutes from "./kycRoutes.js";
import webhookRoutes from "./webhookRoutes.js";
import publicRoutes from "./publicRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/kyc", kycRoutes);
router.use("/webhooks", webhookRoutes);

export const apiRouter = router;
export { publicRoutes };
