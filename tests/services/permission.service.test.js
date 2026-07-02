import prisma from "../../prisma/client";
import { checkPermission } from "../../src/services/permission.service";
import { clearDatabase } from "../helpers/cleanup";
import { createBaseSetup, createFolder, createOrg, createUser } from "../helpers/factories";

describe("checkPermission", () => {
  beforeEach(async () => {
    await clearDatabase()
  });

  test("should deny access when folder DENY overrides role ALLOW", async () => {
    const { user, org, folder } = await createBaseSetup()

    // Create Role
    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    // Create Permission
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    });

    // Role has folder.read permission
    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    // Assign role to user
    await prisma.orgRole.create({
      data: {
        userId: user.id,
        orgId: org.id,
        roleId: role.id,
      },
    });

    // Explicit DENY on folder
    await prisma.folderPermission.create({
      data: {
        folderId: folder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "DENY",
      },
    });

    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      folder.id
    );

    // Through role folder allows permission "folder.read" 
    // but due to explicit folder permission "folder.read" 
    // is denied
    expect(result).toBe(false);
  });

  test("should allow access when folder has explicit ALLOW even without role permission", async () => {
    // Note: If a user is created through endpoints 
    // there wont be a user without role and therefore 
    // will also have at least basic permissions

    const { user, org, folder } = await createBaseSetup()

    // Create Permission
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    });

    // Role has folder.read permission
    const role = await prisma.roles.create({
      data: {
        name: "VIEWER",
      }
    });

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    // Assign role to user
    await prisma.orgRole.create({
      data: {
        userId: user.id,
        orgId: org.id,
        roleId: role.id,
      },
    });

    // Explicit ALLOW on folder
    await prisma.folderPermission.create({
      data: {
        folderId: folder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "ALLOW",
      },
    });

    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      folder.id
    );

    // Here role was never assigned the permission "folder.read"
    // but due to explicit folder permission "folder.read" is allowed
    expect(result).toBe(true);
  });

  test("should deny access when user is not a member of the organization", async () => {
    // Create Org Owner User
    const owner = await createUser({ name: "Owner" })

    // Create Org Outsider User
    const outsider = await createUser({ name: "Outsider" })

    // Create Org - created by owner user
    const org = await createOrg(owner.id)

    // Create Folder
    const folder = await createFolder({ orgId: org.id, createdBy: owner.id })

    const result = await checkPermission(
      org.id,
      outsider.id,
      "folder.read",
      "FOLDER",
      folder.id
    );
    // "Owner" creates a org and creates a folder. 
    // "Outsider" is not a member of the org and 
    // therefore cannot access the folder
    expect(result).toBe(false);
  })

  test("should deny access when child folder DENY overrides parent ALLOW", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    // Create Child Folder
    const childFolder = await createFolder({ orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    // Create permission 
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    })

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    // Explicit ALLOW on parent folder
    await prisma.folderPermission.create({
      data: {
        folderId: parentFolder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "ALLOW",
      },
    });

    // Explicit DENY on child folder
    await prisma.folderPermission.create({
      data: {
        folderId: childFolder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "DENY",
      },
    });
    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      childFolder.id
    );

    // Parent has explicit ALLOW on "folder.read",
    // but since child has explicit DENY on "folder.read", 
    // access is denied
    expect(result).toBe(false);
  })

  test("should deny access when parent folder DENY is inherited by child folder", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    // Create Child Folder
    const childFolder = await createFolder({ orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    // Create Role
    const role = await prisma.roles.create({
      data: {
        name: "EDITOR",
      },
    });

    // Create permission 
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    })

    // Role has folder.read permission
    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    // Assign role to user
    await prisma.orgRole.create({
      data: {
        userId: user.id,
        orgId: org.id,
        roleId: role.id,
      },
    });

    // Explicit DENY on parent folder
    await prisma.folderPermission.create({
      data: {
        folderId: parentFolder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "DENY",
      },
    });

    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      childFolder.id
    );

    // Even though the child has no explit permission overrides
    // and is allowed access by ROLE "EDITOR", since parent 
    // has explicit DENY on "folder.read", access is denied
    expect(result).toBe(false);
  })

  test("should allow access when parent folder ALLOW is inherited by child folder", async () => {

    const { user, org, folder: parentFolder } = await createBaseSetup()

    // Create Child Folder
    const childFolder = await createFolder({ orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    // Create permission 
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    })

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    // Explicit ALLOW on parent folder
    await prisma.folderPermission.create({
      data: {
        folderId: parentFolder.id,
        userId: user.id,
        permissionId: permission.id,
        effect: "ALLOW",
      },
    });

    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      childFolder.id
    );

    // Child folder has no explicit permissions.
    // Parent folder has explicit ALLOW on folder.read, 
    // so access should be inherited from the parent.
    expect(result).toBe(true);
  })

  test("should deny access when no permissions are assigned", async () => {

    const { user, org, folder } = await createBaseSetup()

    // Create Permission
    const permission = await prisma.permissions.create({
      data: {
        name: "folder.read",
      },
    }); // Permission must exist.
    // Otherwise the service returns false before reaching the
    // permission resolution logic we're trying to test.

    // User is member of org
    await prisma.orgUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
      },
    });

    const result = await checkPermission(
      org.id,
      user.id,
      "folder.read",
      "FOLDER",
      folder.id
    );
    // User belongs to the org but has no role permissions,
    // folder permissions, or document permissions.
    // Access should be denied by default.
    expect(result).toBe(false);
  })

  afterAll(async () => {
    await prisma.$disconnect().then(() => {
      console.log("Prisma client disconnected");
    })
  });
});