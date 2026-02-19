import { Router } from "express";
import { createDocInFolder, createFolder, deleteFolder, getFolderContents, moveFolder, renameFolder, restoreFolder } from "../../controllers/org/folder.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = Router({ mergeParams: true });
// Get Folders Contents
router.get(
  "/:folderId",
  authMiddleware,
  requirePermission("folder.read", {
    resourceType: "FOLDER",
    resourceIdParam: "folderId"
  }),
  getFolderContents
);
// Create Folder
router.post(
  "/",
  authMiddleware,
  requirePermission("folder.create", {
    resourceType: "FOLDER",
    resourceIdBody: "parentFolderId"
  }),
  createFolder
)
// Rename Folder
router.patch(
  "/:folderId",
  authMiddleware,
  requirePermission("folder.rename", {
    resourceType: "FOLDER",
    resourceIdParam: "folderId"
  }),
  renameFolder
)
// Move Folder
router.post(
  "/:folderId/move",
  authMiddleware,
  requirePermission("folder.move", {
    resourceType: "FOLDER",
    resourceIdParam: "folderId"
  }),
  moveFolder
)
// Delete Folder
router.delete(
  "/:folderId",
  authMiddleware,
  requirePermission("folder.delete", {
    resourceType: "FOLDER",
    resourceIdParam: "folderId"
  }),
  deleteFolder
)
// Restore Folder
router.post(
  "/:folderId/restore",
  authMiddleware,
  requirePermission("folder.delete", {
    resourceType: "FOLDER",
    resourceIdParam: "folderId"
  }),
  restoreFolder
)

router.post(":folderId/docs", createDocInFolder)

export default router