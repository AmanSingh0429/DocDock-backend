import { parse } from "dotenv";
import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

export const requirePermission = (requestedPermission) => {
  return async (req, res, next) => {
    console.log("permission check reached")
    const userId = req.user.id;
    const orgId = Number(req.params.orgId);

    if (!userId) {
      throw new ApiError(401, "userId required");
    }
    if (!orgId) {
      throw new ApiError(401, "orgId required");
    }

    try {
      console.log("inside try")
      const validOrgUser = await prisma.orgUser.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId
          }
        }
      })
      console.log("validOrgUser", validOrgUser)
      if (!validOrgUser) {
        console.log("invalid user")
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
        console.log("no roles")
        throw new ApiError(403, "You have no roles assigned in this organization");
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
      console.log("reached permission resolutin")

      if (!hasPermission) {
        throw new ApiError(403, "You do not have permission to perform this action");
      }
      next()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      console.log(error)
      throw new ApiError(500, "Failed to resolve permissions", error, false)
    }
  }
} 