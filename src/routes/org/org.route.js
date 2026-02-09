import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { createOrg } from "../../controllers/org/org.controller.js";
import documentRouter from "./document.route.js"
import folderRouter from './folder.route.js'

const router = Router();

router.post("/create", authMiddleware, createOrg);
router.get("/:orgId/documents", authMiddleware, requirePermission("document.read"), (req, res) => { });

// Document Routes
router.use("/:orgId/docs", documentRouter)
router.use("/:orgId/folder", folderRouter)

export default router;