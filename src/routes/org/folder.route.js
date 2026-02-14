import { Router } from "express";
import { createDocInFolder, createFolder, deleteFolder, moveFolder, renameFolder, restoreFolder } from "../../controllers/org/folder.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = Router({ mergeParams: true });
// Create Folder
router.post("/", authMiddleware, requirePermission("folder.create"), createFolder)
// Rename Folder
router.patch("/:folderId", authMiddleware, requirePermission("folder.rename"), renameFolder)
// Move Folder
router.post("/:folderId/move", authMiddleware, requirePermission("folder.move"), moveFolder)
// Delete Folder
router.delete("/:folderId", authMiddleware, requirePermission("folder.delete"), deleteFolder)
// Restore Folder
router.post("/:folderId/restore", authMiddleware, requirePermission("folder.delete"), restoreFolder)

router.post(":folderId/docs", createDocInFolder)

export default router