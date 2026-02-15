import prisma from "../../../prisma/client.js";
import { createDocumentService } from "../../services/org/document.service.js";
import { createFolderService, deleteFolderService, getFolderContentsService, moveFolderService, renameFolderService, restoreFolderService } from "../../services/org/folder.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getFolderContents = async (req, res) => {
  const { orgId, folderId } = await req.params;

  const result = await getFolderContentsService(Number(orgId), Number(folderId))

  return res.json(new ApiResponse(200, "Folders fetched successfully", result))
};

export const createFolder = async (req, res) => {
  const userId = await req.user.id
  const { folderName, parentFolderId } = await req.body
  const { orgId } = await req.params;

  const result = await createFolderService(Number(orgId), userId, parentFolderId, folderName)

  return res.json(new ApiResponse(200, "Folder Created", result))
};

export const renameFolder = async (req, res) => {
  const userId = await req.user.id
  const { orgId, folderId } = await req.params;
  const { newFolderName } = await req.body

  const result = await renameFolderService(Number(orgId), userId, Number(folderId), newFolderName)

  return res.json(new ApiResponse(200, "Folder name changed", result))
}

export const moveFolder = async (req, res) => {
  const userId = await req.user.id
  const { orgId, folderId } = await req.params;
  const { parentFolderId } = await req.body

  const result = await moveFolderService(Number(orgId), userId, Number(folderId), parentFolderId)

  return res.json(new ApiResponse(200, "Folder moved", result))
};
export const deleteFolder = async (req, res) => {
  const userId = await req.user.id
  const { orgId, folderId } = await req.params;

  const result = await deleteFolderService(Number(orgId), userId, Number(folderId))

  return res.json(new ApiResponse(200, "Folder deleted", result))
};

export const restoreFolder = async (req, res) => {
  const userId = await req.user.id
  const { orgId, folderId } = await req.params;

  const result = await restoreFolderService(Number(orgId), userId, Number(folderId))

  return res.json(new ApiResponse(200, "Folder restored", result))
};

export const createDocInFolder = async (req, res) => {
  console.log("controller reached")
  const { orgId, folderId } = await req.params;
  const { docName } = await req.body;
  const userId = req.user.id;
  const file = await req.file;

  const result = await createDocumentService(Number(orgId), userId, docName, file, Number(folderId));

  return res.json(new ApiResponse(200, "Document created", result));
}