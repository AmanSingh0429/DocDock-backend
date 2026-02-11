import prisma from "./client.js";

const main = async () => {
  await prisma.roles.createMany({
    data: [
      { name: "ADMIN" },
      { name: "VIEWER" },
      { name: "EDITOR" },
    ],
    skipDuplicates: true
  })

  await prisma.permissions.createMany({
    data: [
      // Document
      { name: "document.create" },
      { name: "document.read" },
      { name: "document.update" },
      { name: "document.rename" },
      { name: "document.move" },
      { name: "document.delete" },
      { name: "document.restore" },

      // Folder
      { name: "folder.create" },
      { name: "folder.read" },
      { name: "folder.rename" },
      { name: "folder.move" },
      { name: "folder.delete" },

      // Org 
      { name: "org.read" },
      { name: "org.rename" },
      { name: "org.delete" },

      // Org users
      { name: "org.user.add" },
      { name: "org.user.remove" },
      { name: "org.user.update_role" },

      // Roles & permissions
      { name: "org.role.assign" },
      { name: "org.role.remove" },

      // Audit
      { name: "audit.read" },
    ],
    skipDuplicates: true,
  });


  // ADD ROLES AND PERMISSIONS
  const roles = await prisma.roles.findMany();
  const permissions = await prisma.permissions.findMany();

  const roleMap = Object.fromEntries(
    roles.map((role) => [role.name, role.id])
  );
  // admin
  const permissionIds = permissions.map((perm) => perm.id);
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: roleMap.ADMIN,
      permissionId,
    })),
    skipDuplicates: true,
  });

  // viewer
  const viewerPermissions = permissions.filter((p) =>
    [
      "document.read",
      "folder.read",
      "org.read",
      "audit.read"
    ].includes(p.name)).map((perm) => perm.id);
  await prisma.rolePermission.createMany({
    data: viewerPermissions.map((permissionId) => ({
      roleId: roleMap.VIEWER,
      permissionId,
    })),
    skipDuplicates: true,
  })

  const editorPermissions = permissions.filter((p) =>
    [
      "document.create",
      "document.read",
      "document.update",
      "document.rename",
      "document.move",
      "document.restore",
      "folder.create",
      "folder.read",
      "folder.rename",
      "folder.move",
      "org.read",
    ].includes(p.name)).map((perm) => perm.id);
  await prisma.rolePermission.createMany({
    data: editorPermissions.map((permissionId) => ({
      roleId: roleMap.EDITOR,
      permissionId,
    })),
    skipDuplicates: true,
  })

};

main().then(() => console.log("seeded 🌱")).catch((e) => console.error(e));
