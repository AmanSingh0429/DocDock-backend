import prisma from "../../../prisma/client.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from 'crypto'

export const createOrgInvitationService = async (orgId, email, role, userId) => {
  email = email.trim().toLowerCase();
  if (!email || !role) {
    throw new ApiError(400, "Email and role are required");
  }
  try {
    const verifyInviter = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          orgId,
          userId
        }
      }
    });
    if (!verifyInviter) {
      throw new ApiError(403, "You are not the member of this orginazation")
    }
    const invitedUser = await prisma.user.findUnique({
      where: {
        email
      }
    })
    if (invitedUser) {
      const alreadyMember = await prisma.orgUser.findUnique({
        where: {
          userId_orgId: {
            userId: invitedUser.id,
            orgId
          }
        }
      })

      if (alreadyMember) {
        throw new ApiError(400, "User already member of this org")
      }
    }
    if (role.toUpperCase() === "OWNER") {
      const ownerRole = await prisma.roles.findUnique({
        where: { name: "OWNER" },
        select: { id: true }
      });
      const inviterIsOwner = await prisma.orgRole.findUnique({
        where: {
          orgId_userId_roleId: {
            orgId,
            userId,
            roleId: ownerRole.id
          }
        }
      });

      if (!inviterIsOwner) {
        throw new ApiError(403, "Only owners can invite as OWNER");
      }
    }
    const roleRecord = await prisma.roles.findUnique({
      where: { name: role.toUpperCase() },
      select: { id: true }
    });

    if (!roleRecord) {
      throw new ApiError(404, "Role not found");
    }

    const roleId = roleRecord.id;
    const token = await crypto.randomBytes(32).toString("hex")
    const transaction = await prisma.$transaction(async (tx) => {

      await tx.orgInvitation.deleteMany({
        where: {
          orgId,
          email
        }
      });
      const inviteUser = await tx.orgInvitation.create({
        data: {
          orgId,
          email,
          roleId,
          token,
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days,
          invitedBy: userId,
        }
      })

      await tx.auditLog.create({
        data: {
          orgId,
          actorUserId: userId,
          action: "INVITE_USER",
          resourceType: "ORG",
          resourceId: orgId,
          metadata: {
            email,
            role
          }
        }
      });
      return inviteUser
    })
    return transaction
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(500, "Failed to create org invitation", error, false)
  }
};

export const acceptInvitationService = async (token, userId) => {
  try {
    const invitation = await prisma.orgInvitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      throw new ApiError(400, "Invalid invitation token");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ApiError(400, "Invitation has expired");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, "User not found. Please register first.");
    }

    if (user.email !== invitation.email) {
      throw new ApiError(403, "This invitation is not for your account");
    }

    const existingMembership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: invitation.orgId
        }
      }
    });

    if (existingMembership) {
      throw new ApiError(400, "User already part of this organization");
    }

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.orgUser.create({
        data: {
          userId,
          orgId: invitation.orgId
        }
      });

      await tx.orgRole.create({
        data: {
          userId,
          orgId: invitation.orgId,
          roleId: invitation.roleId
        }
      });

      await tx.orgInvitation.delete({
        where: { id: invitation.id }
      });

      await tx.auditLog.create({
        data: {
          orgId: invitation.orgId,
          actorUserId: userId,
          action: "ACCEPT_INVITATION",
          resourceType: "ORG",
          resourceId: invitation.orgId,
          metadata: {
            invitedBy: invitation.invitedBy,
            roleId: invitation.roleId
          }
        }
      });

      return {
        orgId: invitation.orgId,
        roleId: invitation.roleId
      };
    });

    return transaction
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(500, "Failed to accept invitation", error, false)
  }
};

export const revokeInvitationService = async (token, userId) => {
  return await prisma.$transaction(async (tx) => {
    const invite = await tx.orgInvitation.findUnique({
      where: { token }
    });

    if (!invite) {
      throw new ApiError(404, "Invitation already accepted or revoked");
    }

    await tx.orgInvitation.delete({
      where: { id: invite.id }
    });

    await tx.auditLog.create({
      data: {
        orgId: invite.orgId,
        actorUserId: userId,
        action: "REVOKE_INVITATION",
        resourceType: "ORG_INVITATION",
        resourceId: invite.id,
        metadata: {
          email: invite.email,
          roleId: invite.roleId
        }
      }
    });

    return { message: "Invitation revoked successfully" };
  });
};

export const listOrgInvitationsService = async (orgId) => {
  try {
    const invitations = await prisma.orgInvitation.findMany({
      where: {
        orgId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        role: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return invitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: {
        id: invite.role.id,
        name: invite.role.name
      },
      invitedBy: {
        id: invite.inviter.id,
        name: invite.inviter.name,
        email: invite.inviter.email
      },
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt
    }));
  } catch (error) {
    throw new ApiError(500, "Failed to list org invitations", error, false)
  }
};