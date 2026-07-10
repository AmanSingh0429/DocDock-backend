import { acceptInvitationService, createOrgInvitationService, getInvitationByTokenService, listOrgInvitationsService, revokeInvitationService } from "../../services/org/invitations.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const createOrgInvitation = async (req, res) => {
  const { email, role } = req.body
  const { orgId } = req.params
  const userId = req.user.id;

  const result = await createOrgInvitationService(Number(orgId), email, role, userId)

  return res.json(new ApiResponse(200, "Invite Sent", result, true))
};

export const acceptOrgInvitation = async (req, res) => {
  const { token } = req.query
  const userId = req.user.id;

  const result = await acceptInvitationService(token, userId)

  return res.json(new ApiResponse(200, "Invite Accepted", result, true))
}
export const revokeOrgInvitation = async (req, res) => {
  const { token } = req.query
  const userId = req.user.id;

  const result = await revokeInvitationService(token, userId)

  return res.json(new ApiResponse(200, "Invite Revoked", result, true))
}

export const listOrgInvitations = async (req, res) => {
  const { orgId } = req.params;

  const invitations = await listOrgInvitationsService(Number(orgId));

  res.json(new ApiResponse(200, "Invitations fetched successfully", invitations));
};

export const getInvitationByToken = async (req, res) => {
  const { token } = req.params;

  const data = await getInvitationByTokenService(token);

  res.json(new ApiResponse(200, "Invitation fetched successfully", data));
};