import prisma from "../../prisma/client";

export const clearDatabase = async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "User",
      "Roles",
      "Permissions",
      "RolePermission",
      "Org",
      "OrgRole",
      "OrgUser",
      "AuditLog",
      "Folder",
      "Doc",
      "DocVersion",
      "FolderPermission",
      "DocPermission",
      "OrgInvitation"
    RESTART IDENTITY CASCADE;
  `);
};