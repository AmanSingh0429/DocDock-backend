import { ApiError } from "../src/utils/ApiError.js";
import { verifyToken } from "../src/utils/jwt.js";

export const authMiddleware = (req, res, next) => {
  console.log("middleware reached")
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const user = verifyToken(token);
    req.user = { id: user.id };
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid token");
  }
};