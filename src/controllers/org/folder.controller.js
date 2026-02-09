import { createDocumentService } from "../../services/org/document.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const createDocInFolder = async (req, res) => {
  console.log("controller reached")
  const { orgId, folderId } = await req.params;
  const { docName } = await req.body;
  const userId = req.user.id;
  const file = await req.file;

  const result = await createDocumentService(Number(orgId), userId, docName, file, Number(folderId));

  return res.json(new ApiResponse(200, "Document created", result));
}