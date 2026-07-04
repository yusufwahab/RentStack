import { Router } from "express";
import { receiveNombaWebhook } from "../controllers/webhookController.js";

const router = Router();

// No requireAuth — Nomba calls this directly, authenticated only by the
// HMAC signature verified inside the controller.
router.post("/nomba", receiveNombaWebhook);

export default router;
