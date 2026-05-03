import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { acceptOrgInvitation, createOrgInvitation, getInvitationByToken, listOrgInvitations, revokeOrgInvitation } from "../../controllers/org/invitations.controller.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authMiddleware,
  requirePermission("org.read", {
    resourceType: "FOLDER",
    resourceResolver: "ROOT"
  }),
  listOrgInvitations
)
router.get(
  "/:token",
  authMiddleware,
  getInvitationByToken
)
router.post(
  "/",
  authMiddleware,
  requirePermission("org.user.add"),
  createOrgInvitation
)
router.post(
  "/accept",
  authMiddleware,
  acceptOrgInvitation
)
router.delete(
  "/revoke",
  authMiddleware,
  requirePermission("org.user.remove"),
  revokeOrgInvitation
)


export default router;
