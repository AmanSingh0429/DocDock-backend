import { Router } from "express";
import { createOrg } from "../controllers/org.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.post("/create", authMiddleware, createOrg);
router.get("/:orgId/documents", authMiddleware, requirePermission("document.read"), (req, res) => { });

export default router;