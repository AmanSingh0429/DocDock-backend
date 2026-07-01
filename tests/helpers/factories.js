import prisma from "../../prisma/client";

export const createUser = async (overrides = {}) => {
  return prisma.user.create({
    data: {
      name: "Test User",
      email: `user-${Date.now()}@test.com`,
      passwordHash: "hashed-password",
      ...overrides,
    },
  });
};

export const createOrg = async (createdBy) => {
  return prisma.org.create({
    data: {
      name: `Org-${Date.now()}`,
      createdBy,
    },
  });
};

export const createFolder = async ({
  name = "Test Folder",
  orgId,
  createdBy,
  parentFolderId = null,
}) => {
  return prisma.folder.create({
    data: {
      name,
      orgId,
      createdBy,
      parentFolderId,
    },
  });
};

export const createBaseSetup = async () => {
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: `user-${Date.now()}@test.com`,
      passwordHash: "hashed-password",
    },
  });

  const org = await prisma.org.create({
    data: {
      name: `Org-${Date.now()}`,
      createdBy: user.id,
    },
  });

  const folder = await prisma.folder.create({
    data: {
      name: "Root Folder",
      orgId: org.id,
      createdBy: user.id,
    },
  });

  return {
    user,
    org,
    folder,
  };
};