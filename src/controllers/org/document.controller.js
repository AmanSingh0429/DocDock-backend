import { createDocumentService, renameDocumentService, updateDocumentService } from "../../services/org/document.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

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

export const renameDocument = async (req, res) => {
  console.log("controller reached")
  const { orgId, docId } = await req.params;
  const userId = req.user.id;
  const { newDocName } = await req.body;
  console.log({ newDocName })

  const result = await renameDocumentService(Number(orgId), userId, Number(docId), newDocName);

  return res.json(new ApiResponse(200, "Document created", result));
}