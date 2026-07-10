import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listProperties, createProperty, updateProperty, deleteProperty } from "../controllers/propertyController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listProperties);
router.post("/", createProperty);
router.put("/:id", updateProperty);
router.delete("/:id", deleteProperty);

export default router;
