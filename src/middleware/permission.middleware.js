import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError";

export const requirePermission = (requestedPermission) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const orgId = req.params.orgId;

    try {
      const validOrgUser = await prisma.orgUser.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId
          }
        }
      })
      if (!validOrgUser) {
        throw new ApiError(403, "You are not a member of this org");
      }
      const getUserRoles = await prisma.orgRole.findMany({
        where: {
          orgId,
          userId
        },
        select: { roleId: true }
      })
      const roleIds = getUserRoles.map(r => r.roleId)
      if (roleIds.length === 0) {
        throw new ApiError(403, "No roles assigned in this organization");
      }
      const getRolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: { in: roleIds }
        },
        select: {
          permission: true
        }
      })
      const rolePermissions = getRolePermissions.map(rp => rp.permission)
      const uniquePermissions = [...new Map(rolePermissions.map(p => [p.id, p])).values()]

      const hasPermission = uniquePermissions.some(
        p => p.name === requestedPermission
      )

      if (!hasPermission) {
        throw new ApiError(403, "Permission Denied")
      }
      next()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(500, "Failed to resolve permissions", error, false)
    }
  }
} 