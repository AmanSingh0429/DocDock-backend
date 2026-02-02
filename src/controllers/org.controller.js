import prisma from "../../prisma/client";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";


export const createOrg = async (req, res) => {
  const { orgName, createdByID } = await req.body;

  if (!orgName || !createdByID) return res.json({ message: "Org name & creator is required" }, 400);
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
          action: "org.create",
          actorUserId: createdByID,
          resourceType: "org",
          resourceId: org.id,
          metadata: {
            name: org.name
          }
        }
      })
      console.log("audit log created:", audit)

      return { org, orgUser, assignRole, audit }
    })
    res.json(new ApiResponse(200, "Org created successfully", results));
  } catch (error) {
    throw new ApiError(500, "Failed to create org", error);
  }
};
