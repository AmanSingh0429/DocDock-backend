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
      const createRootFolder = await tx.folder.create({
        data: {
          orgId: org.id,
          createdBy: createdByID,
          name: "__ROOT__",
          isRoot: true
        }
      })
      // Add creator to org
      const orgUser = await tx.orgUser.create({
        data: {
          userId: createdByID,
          orgId: org.id
        }
      })
      // Assign Admin role
      const ownerRole = await tx.roles.findUnique({
        where: { name: "OWNER" },
        select: { id: true }
      });

      if (!ownerRole) {
        throw new ApiError(500, "OWNER role not seeded");
      }
      const assignRole = await tx.orgRole.create({
        data: {
          roleId: ownerRole.id,
          orgId: org.id,
          userId: createdByID
        }
      })
      // Audit log
      const audit = await tx.auditLog.create({
        data: {
          orgId: org.id,
          actorUserId: createdByID,
          action: "CREATE_ORG",
          resourceType: "ORG",
          resourceId: org.id,
          metadata: {
            name: org.name
          }
        }
      })

      return { org }
    })
    return results
  } catch (error) {
    console.log(error)
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to create org", error, false);
  }

};