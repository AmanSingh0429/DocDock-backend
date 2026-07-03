import prisma from "../../prisma/client";
import { deleteFolderService, moveFolderService, restoreFolderService } from "../../src/services/org/folder.service";
import { ApiError } from "../../src/utils/ApiError";
import { clearDatabase } from "../helpers/cleanup";
import { createBaseSetup, createFolder } from "../helpers/factories";

describe("Folder", () => {
  beforeEach(async () => {
    await clearDatabase()
  });

  test("should prevent moving folder into its descendant", async () => {
    expect.assertions(3)
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childfolder = await createFolder({ name: "Folder 2", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    const grandChildFolder = await createFolder({ name: "Folder 3", orgId: org.id, createdBy: user.id, parentFolderId: childfolder.id })

    try {
      // Trying to move parentFolder into folder3
      // which is descendant of parentFolder itself 
      // and hence it fails (parentFolder -> childfolder -> grandChildFolder)
      await moveFolderService(org.id, user.id, parentFolder.id, grandChildFolder.id)
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe("Cannot move folder into its descendant")
    }
  })

  test("should move folder successfully", async () => {
    const { user, org, folder: parentFolder1 } = await createBaseSetup()

    const parentFolder2 = await createFolder({ name: "Folder 2", orgId: org.id, createdBy: user.id })

    const childFolder = await createFolder({ name: "Child Folder", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder1.id })

    // Originally childFolder was decendant of parentFolder1
    // Now moving it into parentFolder2
    await moveFolderService(org.id, user.id, childFolder.id, parentFolder2.id)

    const updatedChildFolder = await prisma.folder.findUnique({
      where: { id: childFolder.id }
    })
    expect(updatedChildFolder.parentFolderId).toBe(parentFolder2.id)
  })

  test("should recursively soft delete descendants", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childFolder1 = await createFolder({ name: "Child Folder 1", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    const childFolder2 = await createFolder({ name: "Child Folder 2", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    await deleteFolderService(org.id, user.id, parentFolder.id)

    // All folders should be soft deleted 
    // which is confirmed by the field deletedAt
    const updatedParent = await prisma.folder.findUnique({
      where: { id: parentFolder.id }
    });

    const updatedChild1 = await prisma.folder.findUnique({
      where: { id: childFolder1.id }
    });

    const updatedChild2 = await prisma.folder.findUnique({
      where: { id: childFolder2.id }
    });

    expect(updatedParent.deletedAt).not.toBeNull();
    expect(updatedChild1.deletedAt).not.toBeNull();
    expect(updatedChild2.deletedAt).not.toBeNull();
  })

  test("should recursively soft delete documents in deleted folder", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childFolder = await createFolder({ name: "Child Folder 1", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    const document1 = await prisma.doc.create({
      data: {
        name: "Document 1",
        orgId: org.id,
        createdBy: user.id,
        folderId: parentFolder.id,
      },
    });

    const document2 = await prisma.doc.create({
      data: {
        name: "Document 2",
        orgId: org.id,
        createdBy: user.id,
        folderId: childFolder.id,
      },
    });

    await deleteFolderService(org.id, user.id, parentFolder.id)

    // All docs should be soft deleted 
    // which is confirmed by the field deletedAt
    const updatedDoc1 = await prisma.doc.findUnique({
      where: { id: document1.id }
    });

    const updatedDoc2 = await prisma.doc.findUnique({
      where: { id: document2.id }
    });

    expect(updatedDoc1.deletedAt).not.toBeNull();
    expect(updatedDoc2.deletedAt).not.toBeNull();
  })

  test("should recursively restore descendant folders", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childFolder = await createFolder({ name: "Child Folder 1", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    const grandChildFolder = await createFolder({ name: "Child Folder 2", orgId: org.id, createdBy: user.id, parentFolderId: childFolder.id })

    // Delete folder before restoring
    await deleteFolderService(org.id, user.id, parentFolder.id)

    await restoreFolderService(org.id, user.id, parentFolder.id)

    const updatedParentFolder = await prisma.folder.findUnique({
      where: { id: parentFolder.id }
    });

    const updatedChildFolder = await prisma.folder.findUnique({
      where: { id: childFolder.id }
    });

    const updatedGrandChildFolder = await prisma.folder.findUnique({
      where: { id: grandChildFolder.id }
    });

    // Verify folders have been restored by 
    // checking the deletedAt field to be null
    expect(updatedParentFolder.deletedAt).toBeNull();
    expect(updatedChildFolder.deletedAt).toBeNull();
    expect(updatedGrandChildFolder.deletedAt).toBeNull();
  })

  test("should recursively restore descendant documents", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childFolder = await createFolder({ name: "Child Folder 1", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    const doc1 = await prisma.doc.create({
      data: {
        name: "Document 1",
        orgId: org.id,
        createdBy: user.id,
        folderId: parentFolder.id,
      },
    });

    const doc2 = await prisma.doc.create({
      data: {
        name: "Document 2",
        orgId: org.id,
        createdBy: user.id,
        folderId: childFolder.id,
      },
    });

    // Delete folder before restoring
    await deleteFolderService(org.id, user.id, parentFolder.id)

    await restoreFolderService(org.id, user.id, parentFolder.id)

    const updatedDoc1 = await prisma.doc.findUnique({
      where: { id: doc1.id }
    });

    const updatedDoc2 = await prisma.doc.findUnique({
      where: { id: doc2.id }
    });

    // Verify docs have been restored by 
    // checking the deletedAt field to be null
    expect(updatedDoc1.deletedAt).toBeNull();
    expect(updatedDoc2.deletedAt).toBeNull();

  })

  test("should restore folder under org root when parent remains deleted", async () => {
    const { user, org, folder: parentFolder } = await createBaseSetup()

    const childFolder = await createFolder({ name: "Child Folder 1", orgId: org.id, createdBy: user.id, parentFolderId: parentFolder.id })

    await deleteFolderService(org.id, user.id, parentFolder.id)

    await restoreFolderService(org.id, user.id, childFolder.id)

    const updatedChildFolder = await prisma.folder.findUnique({
      where: { id: childFolder.id }
    })

    // Even though the parent folder is deleted, 
    // the child folder should be restored at org root
    // which is verified by parentFolderId being null
    expect(updatedChildFolder.deletedAt).toBeNull();
    expect(updatedChildFolder.parentFolderId).toBeNull();

    const updatedParentFolder = await prisma.folder.findUnique({
      where: { id: parentFolder.id }
    })

    // Verify that parent folder is still deleted
    expect(updatedParentFolder.deletedAt).not.toBeNull();
  })

  test("should not restore folder that was never deleted", async () => {
    expect.assertions(3)
    const { user, org, folder } = await createBaseSetup()

    try {
      await restoreFolderService(org.id, user.id, folder.id)
      fail("Expected ApiError to be thrown")
    } catch (error) {
      // Since folder was never deleted, restore should fail
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe("Folder already exists")
    }
  })

  afterAll(async () => {
    await prisma.$disconnect();
  });
});