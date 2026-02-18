import { checkPermission } from "../services/permission.service.js";
import { ApiError } from "../utils/ApiError.js";

export const requirePermission = (requestedPermission) => {
  return async (req, res, next) => {
    console.log("permission check reached")
    const userId = req.user.id;
    const orgId = Number(req.params.orgId);

    if (!userId) {
      throw new ApiError(401, "userId required");
    }
    if (!orgId) {
      throw new ApiError(401, "orgId required");
    }

    const permission = await checkPermission(orgId, userId, requestedPermission);
    if (!permission.allowed) {
      throw new ApiError(403, permission.message);
    }

    next();
  }
} 