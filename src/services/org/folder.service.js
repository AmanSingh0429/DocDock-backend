import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";

export const createFolderService = async (orgId, userId, parentFolderId, folderName) => {
  const cleanFolderName = folderName.trim();
  if (!folderName || !cleanFolderName) {
    throw new ApiError(400, "Folder name is required");
  }
  try {
    if (parentFolderId !== null && parentFolderId !== undefined) {
      const validFolder = await prisma.folder.findFirst({
        where: {
          id: parentFolderId,
          orgId,
          deletedAt: null
        }
      })
      if (!validFolder) {
        throw new ApiError(404, "Parent folder not found");
      }
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      console.log("inside trans")
      const createFolder = await tx.folder.create({
        data: {
          orgId,
          createdBy: userId,
          name: cleanFolderName,
          parentFolderId: parentFolderId ?? null
        }
      })
      console.log({ createFolder })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "CREATE_FOLDER",
          resourceType: "FOLDER",
          resourceId: createFolder.id,
          metadata: {
            name: cleanFolderName,
            parentFolderId: parentFolderId ?? null
          }
        }
      })
      return createFolder
    })
    return transactionResult
  } catch (error) {
    console.log(error)
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(409, "Folder with same name already exists", error)
    }
    throw new ApiError(500, "Failed to create folder", error, false)
  }
};
export const renameFolderService = async (orgId, userId, folderId, newFolderName) => {
  const cleanNewFolderName = newFolderName.trim()
  if (!newFolderName || !cleanNewFolderName) {
    throw new ApiError(400, "New folder name is required");
  }
  try {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
        deletedAt: null
      }
    })
    if (!existingFolder) {
      throw new ApiError(404, "Folder does not exist")
    }
    if (existingFolder.name === cleanNewFolderName) {
      throw new ApiError(400, "New name must be different");
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const renameFolder = await tx.folder.update({
        where: {
          id: folderId
        },
        data: {
          name: cleanNewFolderName
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "RENAME_FOLDER",
          resourceType: "FOLDER",
          resourceId: renameFolder.id,
          metadata: {
            name: cleanNewFolderName,
            previousName: existingFolder.name
          }
        }
      })
      return renameFolder
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(409, "Folder with same name already exists", error)
    }
    throw new ApiError(500, "Failed to rename folder")
  }
}

export const moveFolderService = async (orgId, userId, folderId, parentFolderId) => {
  //   Move A under B

  // 1) If A === B → reject
  // 2) Get all descendants of A
  // 3) If B exists in that list → reject
  // 4) Else → allow
  console.log("moveFolderService")
  const parentId = parentFolderId ?? null
  if (folderId == null) {
    throw new ApiError(400, "Folder id is required");
  }
  try {
    console.log("inside try")
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
        deletedAt: null
      },
      include: {
        parentFolder: true
      }
    })
    console.log({ existingFolder });
    if (!existingFolder) {
      throw new ApiError(404, "Folder not found")
    }
    if (existingFolder.id === parentId) {
      throw new ApiError(400, "Folder cannot be moved to itself")
    }
    if (existingFolder.parentFolderId === parentId) {
      throw new ApiError(400, "Folder already in this location");
    }
    if (parentId !== null) {
      const validParent = await prisma.folder.findFirst({
        where: {
          id: parentId,
          orgId,
          deletedAt: null
        }
      });

      if (!validParent) {
        throw new ApiError(404, "Destination folder not found");
      }
    }
    const childFolderIds = await prisma.$queryRaw`
    WITH RECURSIVE folder_tree AS (
    SELECT id,"parentFolderId"
    FROM "Folder"
    WHERE id = ${folderId}

    UNION ALL

    SELECT f.id, f."parentFolderId"
    FROM "Folder" f
    INNER JOIN folder_tree ft
    ON f."parentFolderId" = ft.id
    )
    SELECT id FROM folder_tree
    `
    console.log(childFolderIds);
    const childFolderIdArray = childFolderIds.map(item => item.id).slice(1)
    console.log({ childFolderIdArray });
    const inValidMove = childFolderIdArray.includes(parentId)
    if (inValidMove) {
      console.log(false)
      throw new ApiError(400, "Cannot move folder into its descendant")
    }
    console.log(true)
    const transactionResult = await prisma.$transaction(async (tx) => {
      const moveFolder = await tx.folder.update({
        where: {
          id: folderId
        },
        data: {
          parentFolderId: parentId
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "MOVE_FOLDER",
          resourceType: "FOLDER",
          resourceId: folderId,
          metadata: {
            name: existingFolder.name,
            previousParent: existingFolder.parentFolderId,
            newParentFolder: parentId
          }
        }
      })
      return moveFolder
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(409, "Folder with same name already exists at destination")
    }
    throw new ApiError(500, "Failed to move folder", error, false)
  }
}
export const deleteFolderService = async (orgId, userId, folderId) => {
  try {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
        deletedAt: null
      }
    })
    if (!existingFolder) {
      throw new ApiError(404, "Folder not found")
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const updatedFolders = await tx.$queryRaw`
      WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM "Folder" 
        WHERE id = ${folderId}

        UNION ALL

        SELECT f.id 
        FROM "Folder" f
        INNER JOIN folder_tree ft 
        ON f."parentFolderId" = ft.id
      )
      UPDATE "Folder"
      SET "deletedAt" = NOW()
      WHERE id IN (SELECT id FROM folder_tree)
      AND "deletedAt" IS NULL
      RETURNING id ;
      `;
      const updatedDocs = await tx.$queryRaw`
      WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM "Folder" 
        WHERE id = ${folderId}

        UNION ALL

        SELECT f.id 
        FROM "Folder" f
        INNER JOIN folder_tree ft 
        ON f."parentFolderId" = ft.id
      )
      UPDATE "Doc"
      SET "deletedAt" = NOW()
      WHERE "folderId" IN (SELECT id FROM folder_tree)
      AND "deletedAt" IS NULL
      RETURNING id ;
      `;

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "DELETE_FOLDER",
          resourceType: "FOLDER",
          resourceId: folderId,
          metadata: {
            name: existingFolder.name,
            rootFolderId: folderId,
            affectedDocsCount: updatedDocs.length,
            affectedFoldersCount: updatedFolders.length
          }
        }
      })

      return { updatedFolders, updatedDocs }
    })
    return { existingFolder, transactionResult }
  } catch (error) {
    console.log(error)
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Failed to delete folder", error, false)
  }
};
export const restoreFolderService = async (orgId, userId, folderId) => {
  try {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        orgId,
      }
    })
    if (!existingFolder) {
      throw new ApiError(404, "Folder not found")
    }
    if (existingFolder.deletedAt === null) {
      throw new ApiError(400, "Folder already exists")
    }
    let restoreParentId = existingFolder.parentFolderId;
    if (restoreParentId !== null) {
      const parentExists = await prisma.folder.findFirst({
        where: {
          id: restoreParentId,
          orgId,
          deletedAt: null
        }
      })
      if (!parentExists) {
        restoreParentId = null
      }
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const restoreChildFolders = await tx.$queryRaw`
      WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM "Folder" 
        WHERE id = ${folderId}

        UNION ALL

        SELECT f.id 
        FROM "Folder" f
        INNER JOIN folder_tree ft 
        ON f."parentFolderId" = ft.id
      )
      UPDATE "Folder"
      SET "deletedAt" = NULL
      WHERE id IN (SELECT id FROM folder_tree)
      AND "deletedAt" IS NOT NULL
      RETURNING id ;
      `;
      const restoreChildDocs = await tx.$queryRaw`
      WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM "Folder" 
        WHERE id = ${folderId}

        UNION ALL

        SELECT f.id 
        FROM "Folder" f
        INNER JOIN folder_tree ft 
        ON f."parentFolderId" = ft.id
      )
      UPDATE "Doc"
      SET "deletedAt" = NULL
      WHERE "folderId" IN (SELECT id FROM folder_tree)
      AND "deletedAt" IS NOT NULL
      RETURNING id ;
      `;
      // Doing this last since the CTE includes the current folderId as well
      const parentFolder = await tx.folder.update({
        where: { id: folderId },
        data: { parentFolderId: restoreParentId }
      });
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "RESTORE_FOLDER",
          resourceType: "FOLDER",
          resourceId: folderId,
          metadata: {
            name: existingFolder.name,
            rootFolderId: folderId,
            affectedDocsCount: restoreChildDocs.length,
            affectedFoldersCount: restoreChildFolders.length
          }
        }
      })
      return {
        // restoreChildFolders, 
        // restoreChildDocs, 
        parentFolder
      }

    })
    return { existingFolder, transactionResult }
  } catch (error) {
    console.log(error)
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(
        409,
        "Folder with same name already exists at restore location"
      );
    }
    throw new ApiError(500, "Failed to restore folder", error, false)
  }
};
