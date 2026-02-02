import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/jwt.js";

export const loginService = async (email, password) => {
  console.log("service reached")
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(401, "Invalid credentials")
    }
    console.log("user found", user)
    const token = signToken({ id: user.id });

    return {
      user,
      token
    }
  } catch (error) {
    console.log(error)
    throw new ApiError(500, "Failed to login", error, false)
  }
};