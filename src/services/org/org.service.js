import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";

export const createOrgService = async (orgName, createdByID) => {

  if (!orgName || !createdByID) {
    throw new ApiError(400, "Org name & creator is required");
  };
  const name = orgName.trim()
  try {
    const results = await prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: {
          name,
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
      const orgUser = await tx.orgUser.create({
        data: {
          userId: createdByID,
          orgId: org.id
        }
      })
      const ownerRole = await tx.roles.findUnique({
        where: { name: "OWNER" },
        select: { id: true }
      });

      if (!ownerRole) {
        throw new ApiError(500, "OWNER role not seeded");
      }
      await tx.orgRole.create({
        data: {
          roleId: ownerRole.id,
          orgId: org.id,
          userId: createdByID
        }
      })
      await tx.auditLog.create({
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

export const getRootOrgResourcesService = async (orgId) => {
  if (!orgId) {
    throw new ApiError(400, "Org ID is required")
  }
  try {
    const rootFolder = await prisma.folder.findFirst({
      where: {
        orgId,
        isRoot: true,
        deletedAt: null
      }
    })
    if (!rootFolder) {
      throw new ApiError(400, "Invalid org ID")
    }
    const folders = await prisma.folder.findMany({
      where: {
        orgId,
        parentFolderId: rootFolder.id,
        deletedAt: null
      }
    })
    const docs = await prisma.doc.findMany({
      where: {
        orgId,
        folderId: rootFolder.id,
        deletedAt: null
      }
    })
    return { folders, docs }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to fetch resources", error, false)
  }
};

export const renameOrgService = async (orgId, userId, newOrgName) => {
  if (!newOrgName) {
    throw new ApiError(400, "Org name is required")
  }
  const name = newOrgName.trim()
  if (!name) {
    throw new ApiError(400, "Org name cannot be empty");
  }
  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingOrg = await tx.org.findUnique({
        where: {
          id: orgId
        }, select: { name: true }
      })
      if (!existingOrg) {
        throw new ApiError(404, "Org not found")
      }
      if (existingOrg.name === name) {
        throw new ApiError(400, "New name can not be the same as previous name")
      }
      const renameOrg = await tx.org.update({
        where: {
          id: orgId
        },
        data: {
          name
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "RENAME_ORG",
          resourceType: "ORG",
          resourceId: orgId,
          metadata: {
            newName: name,
            previousName: existingOrg.name
          }
        }
      })
      return renameOrg
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to rename org")
  }
};

export const leaveOrgService = async (orgId, userId) => {
  try {
    const membership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: { userId, orgId }
      }
    })
    if (!membership) {
      throw new ApiError(404, "User is not the member of this org")
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const ownerCount = await tx.orgRole.count({
        where: {
          orgId,
          role: { name: "OWNER" }
        }
      })
      const isOwner = await tx.orgRole.findFirst({
        where: {
          orgId,
          userId,
          role: { name: "OWNER" }
        }
      })
      if (ownerCount === 1 && isOwner) {
        throw new ApiError(400, "Add a new owner before you leave the org")
      }
      await tx.orgRole.deleteMany({
        where: {
          orgId,
          userId
        }
      })
      const leaveOrg = await tx.orgUser.delete({
        where: {
          userId_orgId: {
            userId,
            orgId
          }
        }
      })

      const user = await tx.user.findUnique({
        where: {
          id: userId
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "LEAVE_ORG",
          resourceType: "ORG",
          resourceId: orgId,
          metadata: {
            name: user.name,
            email: user.email
          }
        }
      })
      return leaveOrg
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to leave org")
  }
};

export const assignUserRoleService = async (orgId, modifierUserId, targetUserId, assignRoleName) => {
  const roleName = assignRoleName.trim().toUpperCase()
  if (!roleName) {
    throw new ApiError(400, "Role name is required")
  }
  try {
    const modiferMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: { userId: modifierUserId, orgId }
      }
    })
    if (!modiferMembership) {
      throw new ApiError(404, "Modifier user not found")
    }
    const userMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: { userId: targetUserId, orgId }
      }
    })
    if (!userMembership) {
      throw new ApiError(404, "User not found")
    }

    const transactionResult = await prisma.$transaction(async (tx) => {

      const role = await tx.roles.findUnique({
        where: { name: roleName },
        select: { id: true }
      });

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      if (roleName === "OWNER") {
        const modifierIsOwner = await tx.orgRole.findFirst({
          where: {
            orgId,
            userId: modifierUserId,
            role: { name: "OWNER" }
          }
        });

        if (!modifierIsOwner) {
          throw new ApiError(403, "Only owners can assign OWNER role");
        }
      }

      const existing = await tx.orgRole.findUnique({
        where: {
          orgId_userId_roleId: {
            orgId,
            userId: targetUserId,
            roleId: role.id
          }
        }
      });

      if (existing) {
        return existing;
      }

      const assignRole = await tx.orgRole.create({
        data: {
          orgId,
          userId: targetUserId,
          roleId: role.id
        }
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: "ASSIGN_ROLE",
          resourceType: "ORG",
          resourceId: orgId,
          metadata: {
            assignedBy: modifierUserId,
            assignedTo: targetUserId,
            roleName
          }
        }
      });

      return assignRole;
    });

    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(400, "User already has this role")
    }
    throw new ApiError(500, "Internal server error. Failed to assign role")
  }
};

export const removeUserService = async (orgId, modifierUserId, targetUserId) => {
  console.log("reach")
  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required")
  }
  try {
    const modiferMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: { userId: modifierUserId, orgId }
      }
    })
    if (!modiferMembership) {
      throw new ApiError(404, "Modifier user not found")
    }
    const userMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: { userId: targetUserId, orgId }
      }
    })
    if (!userMembership) {
      throw new ApiError(404, "User not found")
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const ownerRole = await prisma.roles.findUnique({
        where: { name: "OWNER" },
        select: { id: true }
      })
      const ownerCount = await tx.orgRole.count({
        where: {
          orgId,
          role: { name: "OWNER" }
        }
      })
      const targetIsOwner = await tx.orgRole.findUnique({
        where: {
          orgId_userId_roleId: {
            orgId,
            userId: targetUserId,
            roleId: ownerRole.id
          }
        }
      });
      if (targetIsOwner) {
        if (ownerCount === 1) {
          throw new ApiError(403, "Cannot remove last owner")
        }
        const modifierIsOwner = await tx.orgRole.findUnique({
          where: {
            orgId_userId_roleId: {
              orgId,
              userId: modifierUserId,
              roleId: ownerRole.id
            }
          }
        })
        if (!modifierIsOwner) {
          throw new ApiError(401, "Only owner can remove owner")
        }
      }
      await tx.orgRole.deleteMany({
        where: {
          orgId,
          userId: targetUserId,
        }
      })
      await tx.orgUser.delete({
        where: {
          userId_orgId: {
            userId: targetUserId,
            orgId
          }
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: "REMOVE_USER",
          resourceType: "ORG",
          resourceId: orgId,
          metadata: {
            removedBy: modifierUserId,
            removedUser: targetUserId
          }
        }
      })
      return removeUser
    })
    return transactionResult
  } catch (error) {
    console.log(error)
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to remove user")
  }
};
