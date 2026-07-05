import prisma from "../../prisma/client";
import { acceptInvitationService, createOrgInvitationService } from "../../src/services/org/invitations.service";
import { ApiError } from "../../src/utils/ApiError";
import { clearDatabase } from "../helpers/cleanup";
import { createBaseSetup, createOrgMember, createUser } from "../helpers/factories";

describe("Invitation", () => {
  beforeEach(async () => {
    await clearDatabase();
  });
  test("should create invitation successfully", async () => {
    const { user: inviterUser, org } = await createBaseSetup();

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    }); // Creating role since the service verifies if role exists

    await createOrgMember(org.id, inviterUser.id);

    const invite = await createOrgInvitationService(org.id, "test@test.com", "EDITOR", inviterUser.id);

    expect(invite.email).toBe("test@test.com")
    expect(invite.orgId).toBe(org.id)
    expect(invite.token).toBeDefined()
  })

  test("should replace existing invitation for same email", async () => {

    const { user, org } = await createBaseSetup();

    await createOrgMember(org.id, user.id);

    await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    const invite1 = await createOrgInvitationService(
      org.id,
      "test@test.com",
      "EDITOR",
      user.id
    );

    const invite2 = await createOrgInvitationService(
      org.id,
      "test@test.com",
      "EDITOR",
      user.id
    );

    const invites = await prisma.orgInvitation.findMany({
      where: {
        orgId: org.id,
        email: "test@test.com",
      },
    });

    expect(invites).toHaveLength(1);
    expect(invites[0].token).toBe(invite2.token);
    expect(invites[0].token).not.toBe(invite1.token);
  })

  test("should not allow non member to create invitation", async () => {
    expect.assertions(3)
    const { user, org } = await createBaseSetup();

    await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });
    try {
      await createOrgInvitationService(org.id, "test@test.com", "EDITOR", user.id);
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe("You are not a member of this organization")
    }
  })

  test("should not allow non owner to invite OWNER", async () => {
    expect.assertions(3)
    const { user, org } = await createBaseSetup();

    await createOrgMember(org.id, user.id);

    await prisma.roles.create({
      data: { name: "OWNER" },
    });
    const editorRole = await prisma.roles.create({
      data: { name: "EDITOR" },
    });

    // Attach EDITOR role to user in org 
    await prisma.orgRole.create({
      data: {
        orgId: org.id,
        userId: user.id,
        roleId: editorRole.id
      }
    })
    try {
      await createOrgInvitationService(org.id, "test@test.com", "OWNER", user.id);
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe("Only owners can invite as OWNER")
    }
  })

  test("should accept invitation successfully", async () => {
    const { user: inviter, org } = await createBaseSetup();

    await createOrgMember(org.id, inviter.id);

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    const invite = await createOrgInvitationService(
      org.id,
      "newuser@test.com",
      "EDITOR",
      inviter.id
    );
    // Invited user needs to be registered before they can accept invitation
    const invitedUser = await createUser({ name: "Invited User", email: "newuser@test.com" });

    await acceptInvitationService(invite.token, invitedUser.id);

    const membership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: invitedUser.id,
          orgId: org.id,
        },
      }
    })
    // Confirm that user was added to org
    expect(membership).toBeDefined()

    const memberRole = await prisma.orgRole.findFirst({
      where: {
        userId: invitedUser.id,
        orgId: org.id
      }
    })
    // Confirm that user was given role on addind to org
    expect(memberRole).toBeDefined()

    const deletedInvite = await prisma.orgInvitation.findUnique({
      where: {
        token: invite.token
      }
    })
    // Confirm that invitation was deleted after acception
    expect(deletedInvite).toBeNull()
  })

  test("should reject invalid token", async () => {
    expect.assertions(3)
    const { user: inviter, org } = await createBaseSetup();

    await createOrgMember(org.id, inviter.id);

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    const invite = await createOrgInvitationService(
      org.id,
      "newuser@test.com",
      "EDITOR",
      inviter.id
    );

    const invitedUser = await createUser({ name: "Invited User" });

    try {
      await acceptInvitationService("Sending invalid token", invitedUser.id);
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe("Invalid invitation token")
    }
  })

  test("should reject expired invitation", async () => {
    expect.assertions(3)
    const { user: inviter, org } = await createBaseSetup();

    await createOrgMember(org.id, inviter.id);

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      }
    })

    const invitedUser = await createUser({ name: "Invited User" });

    const invitation =
      await prisma.orgInvitation.create({
        data: {
          orgId: org.id,
          email: invitedUser.email,
          roleId: role.id,
          token: "expired-token",
          invitedBy: inviter.id,
          expiresAt: new Date(Date.now() - 1000),
        }
      })

    try {
      await acceptInvitationService(invitation.token, invitedUser.id);
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe("Invitation has expired")
    }
  })

  test("should reject invitation for different email", async () => {
    expect.assertions(3)
    const { user: inviter, org } = await createBaseSetup();
    await createOrgMember(org.id, inviter.id);
    // Create user that actully being invited
    const invitee = await createUser({ name: "Invitee" })

    // Create user is not invited and will be rejected
    const outsider = await createUser({ name: "Outsider" })

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      }
    })

    // Create invite for "invitee" user
    const invite = await createOrgInvitationService(org.id, invitee.email, "EDITOR", inviter.id)

    try {
      // Try to accepting invite with "outsider" user
      await acceptInvitationService(invite.token, outsider.id);
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe("This invitation is not for your account")
    }
  })

  test("should reject duplicate membership", async () => {
    expect.assertions(3)
    const { user: inviter, org } = await createBaseSetup();
    await createOrgMember(org.id, inviter.id);

    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      }
    })

    const invitedUser = await createUser({ name: "Invited User" });
    // Make invited user member of org before acceptance
    const invitedUserMembership = await createOrgMember(org.id, invitedUser.id)

    try {
      await createOrgInvitationService(org.id, invitedUser.email, "EDITOR", inviter.id)
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe("User already member of this org")
    }
  })
  afterAll(async () => {
    await prisma.$disconnect();
  });
})