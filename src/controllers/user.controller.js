import { getUserOrgsService } from "../services/user.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";


export const getUserOrgs = async (req, res) => {
  const userId = req.user.id;

  const result = await getUserOrgsService(userId);

  res.json(new ApiResponse(200, "User orgs", result));
};
