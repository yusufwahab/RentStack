import { Router } from "express";
import authRoutes from "./authRoutes.js";
import tenantRoutes from "./tenantRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import reportRoutes from "./reportRoutes.js";
import kycRoutes from "./kycRoutes.js";
import webhookRoutes from "./webhookRoutes.js";
import publicRoutes from "./publicRoutes.js";
import propertyRoutes from "./propertyRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/kyc", kycRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/properties", propertyRoutes);
router.use("/analytics", analyticsRoutes);

export const apiRouter = router;
export { publicRoutes };
