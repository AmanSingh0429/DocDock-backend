import { createDocumentService, deleteDocumentService, getDocumentsService, getDocumentVersionsService, getSingleDocumentService, moveDocumentService, renameDocumentService, restoreDocumentService, updateDocumentService } from "../../services/org/document.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getDocuments = async (req, res) => {
  console.log("controller reached")
  const { orgId } = await req.params;

  const result = await getDocumentsService(Number(orgId), null)

  return res.json(new ApiResponse(200, "Documents fetched successfully", result))
}
export const getSingleDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;

  const result = await getSingleDocumentService(Number(orgId), Number(docId));

  return res.json(new ApiResponse(200, "Document fetched successfully", result));
}
export const createDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId } = await req.params;
  const { docName } = await req.body;
  const userId = req.user.id;
  const file = await req.file;

  const result = await createDocumentService(Number(orgId), userId, docName, file, null);

  return res.json(new ApiResponse(200, "Document created", result));
}
export const updateDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = req.user.id;
  const file = await req.file;

  const result = await updateDocumentService(Number(orgId), userId, Number(docId), file, null);

  return res.json(new ApiResponse(200, "Document created", result));
}
export const getDocumentVersions = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params

  const result = await getDocumentVersionsService(orgId, docId);

  return res.json(new ApiResponse(200, "Fetched documnet versions", result))
}
export const renameDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = req.user.id;
  const { newDocName } = await req.body;

  const result = await renameDocumentService(Number(orgId), userId, Number(docId), newDocName);

  return res.json(new ApiResponse(200, "Document created", result));
}

export const moveDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = req.user.id;
  const { destinationFolderId } = await req.body;

  const result = await moveDocumentService(Number(orgId), userId, Number(docId), destinationFolderId);

  res.json(new ApiResponse(200, "Document created", result));
}

export const deleteDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = await req.user.id

  const result = await deleteDocumentService(Number(orgId), Number(docId), userId)

  res.json(new ApiResponse(200, "Document deleted", result))
}

export const restoreDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = await req.user.id

  const result = await restoreDocumentService(Number(orgId), Number(docId), userId)

  res.json(new ApiResponse(200, "Document restored", result))
}