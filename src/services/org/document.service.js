import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../utils/cloudinary.js";
import { createHash } from "crypto"

export const getDocumentsService = async (orgId, folderId) => {
  try {
    const allDocuments = await prisma.doc.findMany({
      where: {
        orgId,
        folderId: folderId ?? null,
        deletedAt: null
      }
    })
    return allDocuments;
  } catch (error) {
    console.log(error)
    throw new ApiError(500, "Failed to fetch documents", error, false)
  }
}
export const getSingleDocumentService = async (orgId, docId) => {
  console.log("getSingleDocumentservice reached")
  try {
    const doc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
        deletedAt: null
      },
      include: {
        currentVersion: true
      }
    })
    if (!doc) {
      throw new ApiError(404, "The requested document not found");
    }
    return doc
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to fetch document", error, false)
  }
}
export const createDocumentService = async (orgId, userId, docName, file, folderId) => {
  console.log("createDocumentService reached")

  if (!docName || !file) {
    throw new ApiError(400, "Document name & file is required");
  }
  const resourceType = file.mimetype.startsWith("image/")
    ? "image"
    : file.mimetype.startsWith("video/")
      ? "video"
      : "raw";
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(file.buffer, resourceType)
    const transactionResult = await prisma.$transaction(async (tx) => {
      const createDoc = await tx.doc.create({
        data: {
          orgId,
          folderId: folderId ?? null,
          createdBy: userId,
          name: docName,
        }
      })
      console.log({ createDoc })
      const fileHash = createHash("sha256").update(file.buffer).digest("hex")
      const createDocVersion = await tx.docVersion.create({
        data: {
          docId: createDoc.id,
          fileUrl: cloudinaryResult.secureUrl,
          fileHash,
          publicId: cloudinaryResult.publicId,
          bytes: cloudinaryResult.bytes,
          versionNumber: 1,
          uploadedBy: userId
        }
      })
      console.log({ createDocVersion })
      const updateDocCurrentId = await tx.doc.update({
        where: {
          id: createDoc.id
        },
        data: {
          currentVersionId: createDocVersion.id
        }
      })
      console.log({ updateDocCurrentId })
      const auditLog = await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "CREATE_DOCUMENT",
          resourceType: "DOC",
          resourceId: createDoc.id,
          metadata: {
            docName,
            docType: file.mimetype,
            fileSize: file.size,
            originalName: file.originalname
          }
        }
      })
      console.log({ auditLog })
      const finalResult = await tx.doc.findUnique({
        where: {
          id: createDoc.id
        },
        include: {
          currentVersion: true
        }
      })
      console.log({ finalResult })
      return { finalResult }
    })

    return transactionResult;

  } catch (error) {
    console.log("catch reached")
    if (error instanceof ApiError) {
      throw error;
    }
    if (cloudinaryResult?.publicId) {
      await deleteFromCloudinary(cloudinaryResult.publicId, resourceType);
    }
    // Error from Prisma if document with same name already exists
    if (error.code === "P2002") {
      throw new ApiError(409, "Document with same name already exists");
    }
    if (error.http_code === 400 || error.http_code === 413) {
      throw new ApiError(400, "Invalid file upload");
    }
    throw new ApiError(500, "Failed to create document, server error", error, false);
  }

}
export const updateDocumentService = async (orgId, userId, docId, file) => {
  console.log("updateDocumentService reached")
  if (!docId || !file) {
    throw new ApiError(400, "Document ID & file is required");
  }
  const existingDoc = await prisma.doc.findFirst({
    where: {
      id: docId,
      orgId
    }
  })
  if (!existingDoc || existingDoc.deletedAt) {
    throw new ApiError(404, "Document not found");
  }
  const resourceType = file.mimetype.startsWith("image/")
    ? "image"
    : file.mimetype.startsWith("video/")
      ? "video"
      : "raw";
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(file.buffer, resourceType)
    const transactionResult = await prisma.$transaction(async (tx) => {
      const fileHash = createHash("sha256").update(file.buffer).digest("hex")
      const lastVersion = await tx.docVersion.findFirst({
        where: { docId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      const newDocVersion = await tx.docVersion.create({
        data: {
          docId,
          fileUrl: cloudinaryResult.secureUrl,
          fileHash,
          publicId: cloudinaryResult.publicId,
          bytes: cloudinaryResult.bytes,
          versionNumber: nextVersionNumber,
          uploadedBy: userId
        }
      })
      const auditLog = await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "UPDATE_DOCUMENT_VERSION",
          resourceType: "DOC",
          resourceId: docId,
          metadata: {
            docName: existingDoc.name,
            newVersion: nextVersionNumber,
            docType: file.mimetype,
            fileSize: file.size,
            originalName: file.originalname
          }
        }
      })
      const updateDocCurrentId = await tx.doc.update({
        where: {
          id: docId
        },
        data: {
          currentVersionId: newDocVersion.id
        }
      })
      const finalResult = await tx.doc.findUnique({
        where: {
          id: docId
        },
        include: {
          currentVersion: true
        }
      })
      return finalResult
    })

    return transactionResult;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (cloudinaryResult?.publicId) {
      await deleteFromCloudinary(cloudinaryResult.publicId, resourceType);
    }
    // Error if document with same docId and versionNumber exists
    if (error.code === "P2002") {
      throw new ApiError(409, "Document with same name already exists");
    }
    if (error.http_code === 400 || error.http_code === 413) {
      throw new ApiError(400, "Invalid file upload");
    }
    throw new ApiError(500, "Failed to update document, server error", error, false)
  }
}

export const getDocumentVersionsService = async (orgId, docId) => {
  try {
    const doc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
        deletedAt: null
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      }
    })
    if (!doc) {
      throw new ApiError(404, "Document not found")
    }
    return doc
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Failed to fetch document versions", error, false)
  }
}

export const renameDocumentService = async (orgId, userId, docId, name) => {
  if (!name) {
    throw new ApiError(400, "Document name is required");
  }
  try {
    const existingDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId
      }
    })
    if (!existingDoc || existingDoc.deletedAt) {
      throw new ApiError(404, "Document not found");
    }
    if (existingDoc.name === name) {
      throw new ApiError(400, "New name must be different from current name");
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const updateDocName = await tx.doc.update({
        where: {
          id: docId
        },
        data: {
          name
        }
      })
      const auditLog = await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "RENAME_DOCUMENT",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            oldName: existingDoc.name,
            newName: name
          }
        }
      })
      const finalResult = await tx.doc.findUnique({
        where: {
          id: docId
        },
        include: {
          currentVersion: true
        }
      })
      return { finalResult }
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Error if document with same name already exists in same scope
    if (error.code === "P2002") {
      throw new ApiError(409, "Document with same name already exists");
    }
    throw new ApiError(500, "Failed to rename document, server error", error, false)
  }
}

export const moveDocumentService = async (orgId, userId, docId, folderId) => {
  try {
    const existingDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId
      }
    })
    if (!existingDoc || existingDoc.deletedAt) {
      throw new ApiError(404, "Document not found");
    }
    if (existingDoc.folderId === folderId) {
      throw new ApiError(400, "Document is already in this location");
    }
    if (folderId !== null) {
      const folderexists = await prisma.folder.findFirst({
        where: {
          id: folderId,
          orgId,
          deletedAt: null
        }
      })
      if (!folderexists) {
        throw new ApiError(404, "Destination folder not found");
      }
    }
    const transactionResult = await prisma.$transaction(async (tx) => {

      const updateDocFolder = await tx.doc.update({
        where: {
          id: docId
        },
        data: {
          folderId: folderId ?? null
        }
      })
      const auditLog = await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "MOVE_DOCUMENT",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            docName: existingDoc.name,
            fromFolderId: existingDoc.folderId,
            toFolderId: folderId ?? null
          }
        }
      })
      const finalResult = await tx.doc.findUnique({
        where: {
          id: docId
        },
        include: {
          currentVersion: true
        }
      })
      return { finalResult }
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Error if document with same name already exists in same scope
    if (error.code === "P2002") {
      throw new ApiError(409, "Document with same name already exists in the destination folder");
    }
    throw new ApiError(500, "Failed to move document, server error", error, false)
  }
}

export const deleteDocumentService = async (orgId, docId, userId) => {
  try {
    const existingDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
        deletedAt: null
      }
    })
    if (!existingDoc) {
      throw new ApiError(404, "Document not found or already deleted");
    }
    const result = await prisma.$transaction(async (tx) => {
      const deletedDoc = await tx.doc.update({
        where: { id: docId },
        data: { deletedAt: new Date() }
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "DELETE_DOCUMENT",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            docName: existingDoc.name,
            deletedFromFolder: existingDoc.folderId,
          }
        }
      });

      return deletedDoc;
    });

    return result
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, "Failed to delete document", error, false)
  }

}

export const restoreDocumentService = async (orgId, docId, userId, folderId) => {
  try {
    const existingDoc = await prisma.doc.findFirst({
      where: {
        id: docId,
        orgId,
      }
    })
    if (!existingDoc) {
      throw new ApiError(404, "Document not found")
    }
    if (existingDoc.deletedAt == null) {
      throw new ApiError(400, "Document is not deleted");
    }
    let restoreFolderId = existingDoc.folderId;

    if (restoreFolderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: restoreFolderId,
          orgId,
          deletedAt: null
        }
      });

      if (!folder) {
        restoreFolderId = null;
      }
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      const restore = await tx.doc.update({
        where: {
          id: docId,
        },
        data: {
          deletedAt: null,
          folderId: restoreFolderId
        }
      })
      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "RESTORE_DOCUMENT",
          resourceType: "DOCUMENT",
          resourceId: docId,
          metadata: {
            docName: existingDoc.name,
            previousLocation: existingDoc.folderId,
            newLocation: restoreFolderId
          }
        }
      })
      return restore
    })
    return transactionResult
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error.code === "P2002") {
      throw new ApiError(409, "Document with same name exists at the restore location")
    }
    throw new ApiError(500, "Failed to restore document", error, false)
  }
}