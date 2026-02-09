import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { createDocument, updateDocument } from "../../controllers/org/document.controller.js";
import { uploadSingle } from "../../middleware/multer.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = Router({ mergeParams: true });

// Create Dcoument
router.post("/", authMiddleware, requirePermission("document.create"), uploadSingle('file'), createDocument)
router.post("/:docId/versions", authMiddleware, requirePermission("document.update"), uploadSingle('file'), updateDocument)

export default router;