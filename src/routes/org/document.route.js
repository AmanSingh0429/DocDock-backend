import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { createDocument, deleteDocument, getDocuments, getDocumentVersions, getSingleDocument, moveDocument, renameDocument, restoreDocument, updateDocument } from "../../controllers/org/document.controller.js";
import { uploadSingle } from "../../middleware/multer.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = Router({ mergeParams: true });
// Get All Org Documents
router.get("/", authMiddleware, requirePermission("document.read"), getDocuments)
// Get Single Document
router.get("/:docId", authMiddleware, requirePermission("document.read"), getSingleDocument)
// Create Dcoument
router.post("/", authMiddleware, requirePermission("document.create"), uploadSingle('file'), createDocument)
// Update Document Version
router.post("/:docId/versions", authMiddleware, requirePermission("document.update"), uploadSingle('file'), updateDocument)
// Get Document Version
router.get("/:docId/versions", authMiddleware, requirePermission("document.update"), uploadSingle('file'), getDocumentVersions)
// Rename Document
router.patch("/:docId", authMiddleware, requirePermission("document.rename"), renameDocument)
// Move Document
router.patch("/:docId/move", authMiddleware, requirePermission("document.move"), moveDocument)
// Delete Document
router.delete("/:docId", authMiddleware, requirePermission("document.delete"), deleteDocument)
// Restore Document
router.post("/:docId/restore", authMiddleware, requirePermission("document.restore"), restoreDocument)

export default router;