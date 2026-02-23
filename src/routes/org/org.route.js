import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { assignUserRole, createOrg, getRootOrgResources, leaveOrg, removeUser, renameOrg } from "../../controllers/org/org.controller.js";
import documentRouter from "./document.route.js"
import folderRouter from './folder.route.js'

const router = Router();
// Create Org
router.post(
  "/",
  authMiddleware,
  createOrg
);
// Get root org resorces
router.get(
  "/:orgId",
  authMiddleware,
  requirePermission("folder.read", {
    resourceType: "FOLDER",
    resourceResolver: "ROOT"
  }),
  getRootOrgResources
);
// Rename org
router.patch(
  "/:orgId",
  authMiddleware,
  requirePermission("org.update"),
  renameOrg
)
// Leave Org
router.delete(
  "/:orgId/leave",
  authMiddleware,
  leaveOrg
)
// Assign user role in org
router.post(
  "/:orgId/role",
  authMiddleware,
  requirePermission("org.user.update_role"),
  assignUserRole
)
// Remove user
router.delete(
  "/:orgId/remove",
  authMiddleware,
  requirePermission("org.user.update_role"),
  removeUser
)

// Document Routes
router.use("/:orgId/docs", documentRouter)
// Folder Routes
router.use("/:orgId/folder", folderRouter)

export default router;