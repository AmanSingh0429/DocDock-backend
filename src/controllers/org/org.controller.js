
import { createOrgService } from "../../services/org/org.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";


export const createOrg = async (req, res) => {
  const { orgName, createdByID } = await req.body;

  const result = await createOrgService(orgName, createdByID);

  return res.json(new ApiResponse(200, "Org created", result));
};
