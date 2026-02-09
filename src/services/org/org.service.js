import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";

export const createOrgService = async (orgName, createdByID) => {

  if (!orgName || !createdByID) {
    throw new ApiError(400, "Org name & creator is required");
  };
  try {
    const results = await prisma.$transaction(async (tx) => {
      // Create Org
      const org = await tx.org.create({
        data: {
          name: orgName,
          createdBy: createdByID
        }
      })
      console.log("org created:", org)
      // Add creator to org
      const orgUser = await tx.orgUser.create({
        data: {
          userId: createdByID,
          orgId: org.id
        }
      })
      console.log("org user created:", orgUser)
      // Assign Admin role
      const roles = await tx.roles.findMany();
      const roleMap = Object.fromEntries(
        roles.map((role) => [role.name, role.id])
      );
      const assignRole = await tx.orgRole.create({
        data: {
          roleId: roleMap.ADMIN,
          orgId: org.id,
          userId: createdByID
        }
      })
      console.log("role assigned:", assignRole)
      // Audit log
      const audit = await tx.auditLogs.create({
        data: {
          orgId: org.id,
          actorUserId: createdByID,
          action: "CREATE",
          resourceType: "ORG",
          resourceId: org.id,
          metadata: {
            name: org.name
          }
        }
      })
      console.log("audit log created:", audit)

      return { org, orgUser, assignRole, audit }
    })
    return results
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to create org", error);
  }

};