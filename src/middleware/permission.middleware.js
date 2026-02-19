import { checkPermission } from "../services/permission.service.js";
import { ApiError } from "../utils/ApiError.js";

export const requirePermission = (
  requestedPermission,
  {
    resourceType = null,
    resourceIdParam = null,
    resourceIdBody = null
  } = {}
) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const orgId = Number(req.params.orgId);

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!orgId) {
      throw new ApiError(400, "orgId required");
    }

    let resourceId = null;

    // Resource from params
    if (resourceIdParam) {
      resourceId = Number(req.params[resourceIdParam]);
      if (!resourceId) {
        throw new ApiError(400, `${resourceIdParam} required`);
      }
    }

    // Resource from body
    if (resourceIdBody) {
      resourceId = Number(req.body[resourceIdBody]);
      if (!resourceId) {
        throw new ApiError(400, `${resourceIdBody} required`);
      }
    }

    const allowed = await checkPermission(
      orgId,
      userId,
      requestedPermission,
      resourceType,
      resourceId
    );

    if (!allowed) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action"
      );
    }

    next();
  };
};

