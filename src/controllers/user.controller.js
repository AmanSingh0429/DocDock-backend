import prisma from "../../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


export const getUserOrgs = async (req, res) => {
  const userId = req.user.id;

  try {
    console.log("controller reached")
    const userOrgs = await prisma.user.findUnique({
      where: { id: userId },
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
    res.json(new ApiResponse(200, "Found user orgs", userOrgs));
  } catch (error) {
    throw new ApiError(500, "Failed to get user orgs", error);
  }
};
