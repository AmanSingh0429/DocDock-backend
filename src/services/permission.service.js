import prisma from "../../prisma/client.js";

export const checkPermission = async (orgId, userId, permissionName, resourceType,
  resourceId) => {
  console.log("checkPermission")
  const validOrgUser = await prisma.orgUser.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId
      }
    }
  })
  if (!validOrgUser) { return false }
  const permission = await prisma.permissions.findUnique({
    where: {
      name: permissionName
    },
    select: { id: true }
  })
  if (!permission) { return false }
  const permissionId = permission.id
  if (resourceType === "DOCUMENT") {

    const doc = await prisma.doc.findFirst({
      where: { id: resourceId, orgId },
      select: { folderId: true }
    })

    if (!doc) return false

    const hasDocPermission = await checkDocExplicitPermission(userId, permissionId, resourceId)
    if (hasDocPermission === "DENY") return false
    if (hasDocPermission === "ALLOW") return true

    const docFolder = await prisma.doc.findFirst({
      where: {
        id: resourceId,
        orgId
      },
      select: {
        folderId: true
      }
    })
    if (!docFolder) return false

    const hasFolderPermission = await checkFolderExplicitPermission(userId, permissionId, docFolder.folderId)
    if (hasFolderPermission === "DENY") return false
    if (hasFolderPermission === "ALLOW") return true
  }
  if (resourceType === "FOLDER") {
    const validFolder = await prisma.folder.findFirst({
      where: {
        id: resourceId,
        orgId,
      },
      select: {
        id: true
      }
    })
    if (!validFolder) return false

    const hasFolderPermission = await checkFolderExplicitPermission(userId, permissionId, resourceId)
    if (hasFolderPermission === "DENY") return false
    if (hasFolderPermission === "ALLOW") return true
  }
  const hasRolePermission = await checkRolePermission(userId, orgId, permissionId)
  if (hasRolePermission) return true
  return false
};

const checkRolePermission = async (userId, orgId, permissionId) => {
  const getUserRoles = await prisma.orgRole.findMany({
    where: {
      orgId,
      userId
    },
    select: { roleId: true }
  })
  const roleIds = getUserRoles.map((role) => role.roleId)
  if (roleIds.length === 0) {
    return false
  }
  const getRolePermissions = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      permissionId
    },
  })
  if (getRolePermissions) { return true }
  return false
};

const checkDocExplicitPermission = async (userId, permissionId, docId) => {
  const docPermission = await prisma.docPermission.findUnique({
    where: {
      docId_userId_permissionId: {
        docId,
        userId,
        permissionId
      }
    }
  })
  if (!docPermission) {
    return null
  }
  return docPermission.effect
};

const checkFolderExplicitPermission = async (userId, permissionId, folderId) => {
  if (!folderId) return null;

  const ancestors = await prisma.$queryRaw`
    WITH RECURSIVE folder_tree AS (
      SELECT id, "parentFolderId"
      FROM "Folder"
      WHERE id = ${folderId}

      UNION ALL

      SELECT f.id, f."parentFolderId"
      FROM "Folder" f
      INNER JOIN folder_tree ft
      ON f.id = ft."parentFolderId"
    )
    SELECT id FROM folder_tree;
  `;
  console.log({ ancestors });
  const folderIds = ancestors.map(f => f.id);

  if (folderIds.length === 0) return null;

  const permissions = await prisma.folderPermission.findMany({
    where: {
      folderId: { in: folderIds },
      userId,
      permissionId
    }
  });
  console.log({ permissions });
  if (permissions.length === 0) return null;
  if (permissions.some(p => p.effect === "DENY")) {
    return "DENY";
  }
  if (permissions.some(p => p.effect === "ALLOW")) {
    return "ALLOW";
  }

  return null;
};

