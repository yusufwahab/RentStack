import { Router } from "express";
import { publicScore, publicStatement } from "../controllers/publicController.js";

const router = Router();

// Unauthenticated by design — see the comment in publicController.js.
router.get("/score/:token", publicScore);
router.get("/statement/:token", publicStatement);

export default router;
