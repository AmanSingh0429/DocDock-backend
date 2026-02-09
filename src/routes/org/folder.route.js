import { Router } from "express";
import { createDocInFolder } from "../../controllers/org/folder.controller.js";

const router = Router();

router.post(":folderId/docs", createDocInFolder)

export default router