import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listPayments,
  getMisdirectedPayments,
  assignMisdirectedPayment,
  returnMisdirectedPayment,
} from "../controllers/paymentController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listPayments);
router.get("/misdirected", getMisdirectedPayments);
router.post("/:id/assign", assignMisdirectedPayment);
router.post("/:id/return", returnMisdirectedPayment);

export default router;
