import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { createDocument, deleteDocument, getDocuments, getDocumentVersions, getSingleDocument, moveDocument, renameDocument, restoreDocument, updateDocument } from "../../controllers/org/document.controller.js";
import { uploadSingle } from "../../middleware/multer.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = Router({ mergeParams: true });
// Get Single Document
router.get(
  "/:docId",
  authMiddleware,
  requirePermission("document.read", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  getSingleDocument
)
// Create Dcoument
router.post(
  "/",
  authMiddleware,
  requirePermission("document.create", {
    resourceType: "FOLDER",
    resourceIdBody: "folderId"
  }),
  uploadSingle('file'),
  createDocument
)
// Update Document Version
router.post(
  "/:docId/versions",
  authMiddleware,
  requirePermission("document.update", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  uploadSingle('file'),
  updateDocument
)
// Get Document Version
router.get(
  "/:docId/versions",
  authMiddleware,
  requirePermission("document.update", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  uploadSingle('file'),
  getDocumentVersions
)
// Rename Document
router.patch(
  "/:docId",
  authMiddleware,
  requirePermission("document.rename", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  renameDocument
)
// Move Document
router.post(
  "/:docId/move",
  authMiddleware,
  requirePermission("document.move", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  requirePermission("document.create", {
    resourceType: "FOLDER",
    resourceIdBody: "destinationFolderId"
  }),
  moveDocument
)
// Delete Document
router.delete(
  "/:docId",
  authMiddleware,
  requirePermission("document.delete", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  deleteDocument
)
// Restore Document
router.post(
  "/:docId/restore",
  authMiddleware,
  requirePermission("document.restore", {
    resourceType: "DOCUMENT",
    resourceIdParam: "docId"
  }),
  restoreDocument
)

export default router;