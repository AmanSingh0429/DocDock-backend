
import { assignUserRoleService, createOrgService, getRootOrgResourcesService, leaveOrgService, removeUserService, renameOrgService } from "../../services/org/org.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";


export const createOrg = async (req, res) => {
  const { orgName, createdByID } = req.body;

  const result = await createOrgService(orgName, createdByID);

  return res.json(new ApiResponse(200, "Org created successfully", result));
};
export const getRootOrgResources = async (req, res) => {
  const { orgId } = req.params

  const result = await getRootOrgResourcesService(Number(orgId))

  return res.json(new ApiResponse(200, "Fetched resources successfully", result))
};

export const renameOrg = async (req, res) => {
  const { orgId } = req.params
  const userId = req.user.id
  const { newOrgName } = req.body

  const result = await renameOrgService(Number(orgId), userId, newOrgName)

  return res.json(new ApiResponse(200, "Org renamed successfully", result))
};

export const leaveOrg = async (req, res) => {
  const { orgId } = req.params
  const userId = req.user.id

  const result = await leaveOrgService(Number(orgId), userId)

  return res.json(new ApiResponse(200, "Org left", result))
};

export const assignUserRole = async (req, res) => {
  const { orgId } = req.params
  const userId = req.user.id
  const { targetUserId, role } = req.body

  const result = await assignUserRoleService(Number(orgId), userId, Number(targetUserId), role)

  return res.json(new ApiResponse(200, "Role assigned successfully", result))
};

export const removeUser = async (req, res) => {
  const { orgId } = req.params
  const userId = req.user.id
  const { targetUserId } = req.body
  const result = await removeUserService(Number(orgId), userId, Number(targetUserId))

  return res.json(new ApiResponse(200, "User removed successfully", result))
};

