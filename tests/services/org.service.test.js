import prisma from "../../prisma/client";
import { assignUserRoleService, createOrgService, leaveOrgService, removeUserService } from "../../src/services/org/org.service";
import { ApiError } from "../../src/utils/ApiError";
import { clearDatabase } from "../helpers/cleanup";
import { createBaseSetup, createOrgMember, createUser } from "../helpers/factories";

describe("Org", () => {
  beforeEach(async () => {
    await clearDatabase()
  });

  test("should create organization successfully", async () => {
    const user = await createUser({
      name: "Tester",
      email: "test@test.com",
    });

    // Creating OWNER role since the service verifies if role exists
    await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const result = await createOrgService(
      "DocDock",
      user.id
    );

    expect(result.org).toBeDefined();
    expect(result.org.name).toBe("DocDock");
    expect(result.org.createdBy).toBe(user.id);
  });

  test("should create root folder membership and owner role", async () => {
    const user = await createUser({
      name: "Aman",
      email: "aman@test.com",
    });

    const ownerRole = await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const result = await createOrgService(
      "DocDock",
      user.id
    );

    const rootFolder = await prisma.folder.findFirst({
      where: {
        orgId: result.org.id,
        isRoot: true,
      },
    });

    expect(rootFolder).toBeDefined();

    const membership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: result.org.id,
        },
      },
    });

    expect(membership).toBeDefined();

    const assignedOwnerRole =
      await prisma.orgRole.findUnique({
        where: {
          orgId_userId_roleId: {
            orgId: result.org.id,
            userId: user.id,
            roleId: ownerRole.id,
          },
        },
      });

    expect(assignedOwnerRole).toBeDefined();
  });

  test("should allow member to leave org", async () => {
    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    const member = await createUser({
      name: "Member",
      email: "member@test.com",
    });

    await createOrgMember(org.id, member.id);

    await leaveOrgService(org.id, member.id);

    const membership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: member.id,
          orgId: org.id,
        },
      },
    });

    expect(membership).toBeNull();
  });

  test("should not allow last owner to leave org", async () => {
    expect.assertions(3);

    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    try {
      await leaveOrgService(org.id, owner.id);
      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Add a new owner before you leave the org");
    }
  });

  test("should assign role successfully", async () => {
    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: { name: "OWNER" },
    });

    const editorRole = await prisma.roles.create({
      data: { name: "EDITOR" },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    const targetUser = await createUser({
      name: "Target",
      email: "target@test.com",
    });

    await createOrgMember(org.id, targetUser.id);

    await assignUserRoleService(
      org.id,
      owner.id,
      targetUser.id,
      "EDITOR"
    );

    const assignedRole = await prisma.orgRole.findUnique({
      where: {
        orgId_userId_roleId: {
          orgId: org.id,
          userId: targetUser.id,
          roleId: editorRole.id,
        },
      },
    });

    expect(assignedRole).toBeDefined();
  });

  test("should throw when role does not exist", async () => {
    expect.assertions(3);

    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: { name: "OWNER" },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    const targetUser = await createUser({
      name: "Target",
      email: "target@test.com",
    });

    await createOrgMember(org.id, targetUser.id);

    try {
      await assignUserRoleService(
        org.id,
        owner.id,
        targetUser.id,
        "SUPER_ADMIN"
      );

      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Role not found");
    }
  });

  test("should not allow non-owner to assign OWNER role", async () => {
    expect.assertions(3);

    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: { name: "OWNER" },
    });

    const editorRole = await prisma.roles.create({
      data: { name: "EDITOR" },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    const editorUser = await createUser({
      name: "Editor",
      email: "editor@test.com",
    });

    const targetUser = await createUser({
      name: "Target",
      email: "target@test.com",
    });

    await createOrgMember(org.id, editorUser.id);
    await createOrgMember(org.id, targetUser.id);

    await prisma.orgRole.create({
      data: {
        orgId: org.id,
        userId: editorUser.id,
        roleId: editorRole.id,
      },
    });

    try {
      await assignUserRoleService(
        org.id,
        editorUser.id,
        targetUser.id,
        "OWNER"
      );

      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Only owners can assign OWNER role");
    }
  });

  test("should remove user successfully", async () => {
    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    const member = await createUser({
      name: "Member",
      email: "member@test.com",
    });

    await createOrgMember(org.id, member.id);

    const result = await removeUserService(
      org.id,
      owner.id,
      member.id
    );

    expect(result.userId).toBe(member.id);

    const membership = await prisma.orgUser.findUnique({
      where: {
        userId_orgId: {
          userId: member.id,
          orgId: org.id,
        },
      },
    });

    expect(membership).toBeNull();
  });

  test("should not allow removing last owner", async () => {
    expect.assertions(3);

    const owner = await createUser({
      name: "Owner",
      email: "owner@test.com",
    });

    await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner.id
    );

    try {
      await removeUserService(
        org.id,
        owner.id,
        owner.id
      );

      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message)
        .toBe("Cannot remove last owner");
    }
  });

  test("should not allow non-owner to remove owner", async () => {
    expect.assertions(3);

    const owner1 = await createUser({
      name: "Owner1",
      email: "owner@test.com",
    });

    const owner2 = await createUser({
      name: "Owner2",
      email: "owner2@test.com",
    });

    const ownerRole = await prisma.roles.create({
      data: {
        name: "OWNER",
      },
    });

    const editorRole = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    const { org } = await createOrgService(
      "Test Org",
      owner1.id
    );

    const editor = await createUser({
      name: "Editor",
      email: "editor@test.com",
    });

    // Add owner2 before removing owner1
    await createOrgMember(org.id, owner2.id);

    // Assign owner role to second owner
    await prisma.orgRole.create({
      data: {
        orgId: org.id,
        userId: owner2.id,
        roleId: ownerRole.id
      }
    })

    await createOrgMember(org.id, editor.id);

    await prisma.orgRole.create({
      data: {
        orgId: org.id,
        userId: editor.id,
        roleId: editorRole.id,
      },
    });

    try {
      await removeUserService(org.id, editor.id, owner1.id);
      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Only owner can remove owner");
    }
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
})