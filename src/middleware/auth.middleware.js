import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (req, res, next) => {
  console.log("middleware reached")
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Unauthorized Acess");
  }

  try {
    const user = verifyToken(token);
    req.user = { id: user.id };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;

    }
    throw new ApiError(401, "Invalid token");
  }
};