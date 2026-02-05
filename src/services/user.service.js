import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

export const getUserOrgsService = async (id) => {
  try {
    console.log("service reached")
    const userOrgs = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        orgs: {
          select: {
            org: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    return {
      userOrgs
    }
  } catch (error) {
    throw new ApiError(500, "Failed to get user orgs", error, false);
  }
}