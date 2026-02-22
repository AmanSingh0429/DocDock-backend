import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

export const setDocPermissionService = async (orgId, targetUserId, docId, modifierUserId, permissionName, effect) => {
  try {
    if (!docId || !permissionName || !targetUserId || !modifierUserId) {
      throw new ApiError(400, "Document and Permission ID required");
    }
    if (!permissionName.startsWith("document.")) {
      throw new ApiError(400, "Invalid permission for document");
    }
    if (!["ALLOW", "DENY"].includes(effect)) {
      throw new ApiError(400, "Invalid permission effect");
    }

    const targetMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId
        }
      }
    });

    if (!targetMembership) {
      throw new ApiError(404, "Target user not part of this org");
    }

    const targetDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
        deletedAt: null
      }, select: { id: true }
    })
    if (!targetDoc) {
      throw new ApiError(404, "Target document not found");
    }

    const permission = await prisma.permissions.findFirst({
      where: {
        name: permissionName
      }, select: { id: true }
    })
    if (!permission) {
      throw new ApiError(404, "Permission not found");
    }
    const permissionId = permission.id

    const modifierMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: modifierUserId,
          orgId
        }
      }
    });

    if (!modifierMembership) {
      throw new ApiError(403, "Modifier not part of this org");
    }


    const roles = await prisma.orgRole.findMany({
      where: { userId: targetUserId, orgId },
      include: {
        role: { select: { name: true } }
      }
    });

    if (roles.some(r => r.role.name === "OWNER")) {
      throw new ApiError(403, "Owner permissions cannot be modified");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const setPermission = await tx.docPermission.upsert({
        where: {
          docId_userId_permissionId: {
            docId,
            userId: targetUserId,
            permissionId
          }
        },
        create: {
          docId,
          userId: targetUserId,
          permissionId,
          effect
        },
        update: { effect }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: effect === "ALLOW" ? "ACL_ALLOW_SET" : "ACL_DENY_SET",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            user: targetUserId,
            permission: permissionName,
            effect
          }
        }
      })
      return setPermission
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Internal server error. Failed to modify doc permission", error, false);
  }
};

export const deleteDocPermissionService = async (orgId, targetUserId, docId, modifierUserId, permissionName) => {
  if (!targetUserId || !modifierUserId || !permissionName || !docId) {
    throw new ApiError(400, "Missing required resources to perform the action")
  }
  if (!permissionName.startsWith("document.")) {
    throw new ApiError(400, "Invalid permission for document");
  }

  try {
    const targetMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId
        }
      }
    })

    if (!targetMembership) {
      throw new ApiError(404, "Target not a part of this org")
    }

    const modifierMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: modifierUserId,
          orgId
        }
      }
    })

    if (!modifierMembership) {
      throw new ApiError(404, "Modifier not a part of this org")
    }
    const targetDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
        deletedAt: null
      }, select: { id: true }
    })
    if (!targetDoc) {
      throw new ApiError(404, "Target document not found");
    }
    const permission = await prisma.permissions.findFirst({
      where: {
        name: permissionName
      }, select: { id: true }
    })
    if (!permission) {
      throw new ApiError(404, "Permission not found");
    }
    const permissionId = permission.id

    const roles = await prisma.orgRole.findMany({
      where: { userId: targetUserId, orgId },
      include: {
        role: { select: { name: true } }
      }
    });

    if (roles.some(r => r.role.name === "OWNER")) {
      throw new ApiError(403, "Owner permissions cannot be modified");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingPermission = await tx.docPermission.findUnique({
        where: {
          docId_userId_permissionId: {
            docId,
            userId: targetUserId,
            permissionId
          }
        },
        include: {
          permission: { select: { name: true } }
        }
      });

      if (!existingPermission) {
        return { deleted: true }
      }

      const deletePermission = await tx.docPermission.delete({
        where: {
          docId_userId_permissionId: {
            docId,
            userId: targetUserId,
            permissionId
          }
        }
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: "ACL_DELETE",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            user: targetUserId,
            permission: existingPermission.permission.name,
            effect: existingPermission.effect
          }
        }
      });

      return deletePermission;
    });

    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Internal server error. Failed to delete doc permission", error, false);
  }
};


export const setFolderPermissionService = async (orgId, targetUserId, folderId, modifierUserId, permissionName, effect) => {
  try {
    if (!targetUserId || !folderId || !modifierUserId || !permissionName) {
      throw new ApiError(400, "Missing required resources to perform the action")
    }
    if (!["ALLOW", "DENY"].includes(effect)) {
      throw new ApiError(400, "Invalid permission effect");
    }
    if (
      !permissionName.startsWith("folder.") &&
      !permissionName.startsWith("document.")
    ) {
      throw new ApiError(400, "Invalid permission for folder");
    }


    const targetMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId
        }
      }
    })
    if (!targetMembership) {
      throw new ApiError(404, "Target not a part of this org")
    }

    const modifierMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: modifierUserId,
          orgId
        }
      }
    })
    if (!modifierMembership) {
      throw new ApiError(404, "Modifier not a part of this org")
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
        deletedAt: null
      }
    })
    if (!folder) {
      throw new ApiError(404, "Target folder not found")
    }
    const resourceType = folder.isRoot ? "ORG" : "FOLDER"

    const permission = await prisma.permissions.findFirst({
      where: {
        name: permissionName
      }, select: { id: true }
    })
    if (!permission) {
      throw new ApiError(404, "Permission not found")
    }
    const permissionId = permission.id

    const roles = await prisma.orgRole.findMany({
      where: { userId: targetUserId, orgId },
      include: {
        role: { select: { name: true } }
      }
    });

    if (roles.some(r => r.role.name === "OWNER")) {
      throw new ApiError(403, "Owner permissions cannot be modified");
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const setPermission = await tx.folderPermission.upsert({
        where: {
          folderId_userId_permissionId: {
            folderId,
            userId: targetUserId,
            permissionId
          }
        },
        create: {
          folderId,
          userId: targetUserId,
          permissionId,
          effect
        },
        update: { effect }
      })

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: effect === "ALLOW" ? "ACL_ALLOW_SET" : "ACL_DENY_SET",
          resourceType,
          resourceId: folderId,
          metadata: {
            user: targetUserId,
            permission: permissionName,
            effect
          }
        }
      })
      return setPermission
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to modify permission", error, false)
  }
};

export const deleteFolderPermissionService = async (orgId, targetUserId, folderId, modifierUserId, permissionName) => {
  if (!targetUserId || !folderId || !modifierUserId || !permissionName) {
    throw new ApiError(400, "Missing required resources to perform the action")
  }
  if (
    !permissionName.startsWith("folder.") &&
    !permissionName.startsWith("document.")
  ) {
    throw new ApiError(400, "Invalid permission for folder");
  }
  try {
    const targetMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId
        }
      }
    })
    if (!targetMembership) {
      throw new ApiError(404, "Target not a part of this org")
    }

    const modifierMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: modifierUserId,
          orgId
        }
      }
    })
    if (!modifierMembership) {
      throw new ApiError(404, "Modifier not a part of this org")
    }
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
        deletedAt: null
      }
    })
    if (!folder) {
      throw new ApiError(404, "Target folder not found")
    }
    const resourceType = folder.isRoot ? "ORG" : "FOLDER"

    const permission = await prisma.permissions.findFirst({
      where: {
        name: permissionName
      }, select: { id: true }
    })
    if (!permission) {
      throw new ApiError(404, "Permission not found")
    }
    const permissionId = permission.id

    const roles = await prisma.orgRole.findMany({
      where: { userId: targetUserId, orgId },
      include: {
        role: { select: { name: true } }
      }
    });

    if (roles.some(r => r.role.name === "OWNER")) {
      throw new ApiError(403, "Owner permissions cannot be modified");
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingPermission = await tx.folderPermission.findUnique({
        where: {
          folderId_userId_permissionId: {
            folderId,
            userId: targetUserId,
            permissionId
          }
        }
      });

      if (!existingPermission) {
        return { deleted: true }
      }
      const deletePermission = await tx.folderPermission.delete({
        where: {
          folderId_userId_permissionId: {
            folderId,
            userId: targetUserId,
            permissionId
          }
        }
      })

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: modifierUserId,
          action: "ACL_DELETE",
          resourceType,
          resourceId: folderId,
          metadata: {
            user: targetUserId,
            permission: permissionName
          }
        }
      })
      return deletePermission
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Internal server error. Failed to delete permission", error, false)
  }
};
