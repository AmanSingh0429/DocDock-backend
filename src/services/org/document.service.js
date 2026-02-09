import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../utils/cloudinary.js";
import { createHash } from "crypto"
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
          folderId,
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
            newVersion: nextVersionNumber,
            docName: existingDoc.name,
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
      return { finalResult }
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