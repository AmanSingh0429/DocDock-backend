import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/jwt.js";
import bcrypt from "bcrypt";

export const loginService = async (email, password) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(401, "Invalid credentials email")
    }
    // const valid = await bcrypt.compare(password, user.passwordHash);
    // if (!valid) {
    //   throw new ApiError(401, "Invalid credentials password");
    // }

    const token = signToken({ id: user.id });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.log(error)
    throw new ApiError(500, "Failed to login", error, false)
  }
};

export const registerUserService = async (name, email, password, image) => {
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        image
      }
    });
    return { user }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to register user", error, false);
  }
}