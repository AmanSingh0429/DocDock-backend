import prisma from "../../prisma/client";
import { createDocumentService, deleteDocumentService, moveDocumentService, renameDocumentService, restoreDocumentService, updateDocumentService } from "../../src/services/org/document.service";
import { ApiError } from "../../src/utils/ApiError.js";
import * as cloudinaryUtils from "../../src/utils/cloudinary.js";
import { clearDatabase } from "../helpers/cleanup";
import { createBaseSetup, createFolder, createOrgMember, createUser } from "../helpers/factories";
import { jest, test } from '@jest/globals'

describe("Document", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  test("should create document with initial version", async () => {
    const { user, org, folder } = await createBaseSetup();

    const mockStorage = {
      upload: jest.fn().mockResolvedValue({
        secureUrl: "https://test.com/file.pdf",
        publicId: "test-public-id",
        bytes: 1024,
      }),
      delete: jest.fn(),
    };

    const mockFile = {
      buffer: Buffer.from("test document"),
      mimetype: "application/pdf",
      originalname: "test.pdf",
      size: 1024,
    };

    const document = await createDocumentService(
      org.id,
      user.id,
      "Test Document",
      mockFile,
      folder.id,
      mockStorage
    );

    expect(document.name).toBe("Test Document");

    expect(document.currentVersionId).toBeDefined();

    expect(document.currentVersion).not.toBeNull();

    expect(document.currentVersion.versionNumber).toBe(1);

    expect(document.currentVersion.fileUrl)
      .toBe("https://test.com/file.pdf");

    expect(mockStorage.upload)
      .toHaveBeenCalledTimes(1);
  });

  test("should create document in org root when folderId is omitted", async () => {
    const { user, org } = await createBaseSetup();
    // Create root folder since org is treated as folder as well
    // and root folder is created automatically 
    // every time an org is created through api
    const rootFolder = await prisma.folder.create({
      data: {
        name: "__ROOT__",
        orgId: org.id,
        createdBy: user.id,
        isRoot: true
      }
    });

    const mockStorage = {
      upload: jest.fn().mockResolvedValue({
        secureUrl: "https://test.com/file.pdf",
        publicId: "test-public-id",
        bytes: 1024,
      }),
      delete: jest.fn(),
    };

    const mockFile = {
      buffer: Buffer.from("test document"),
      mimetype: "application/pdf",
      originalname: "test.pdf",
      size: 1024,
    };

    const document = await createDocumentService(
      org.id,
      user.id,
      "Root Document",
      mockFile,
      undefined,
      mockStorage
    );

    expect(document.folderId).toBe(rootFolder.id);

    expect(mockStorage.upload)
      .toHaveBeenCalledTimes(1);
  });

  test("should throw 404 when parent folder does not exist", async () => {
    const { user, org } = await createBaseSetup();

    const mockStorage = {
      upload: jest.fn().mockResolvedValue({
        secureUrl: "https://test.com/file.pdf",
        publicId: "test-public-id",
        bytes: 1024,
      }),
      delete: jest.fn(),
    };

    const mockFile = {
      buffer: Buffer.from("test document"),
      mimetype: "application/pdf",
      originalname: "test.pdf",
      size: 1024,
    };

    await expect(
      createDocumentService(
        org.id,
        user.id,
        "Test Document",
        mockFile,
        999999,
        mockStorage
      )
    ).rejects.toThrow("Parent folder not found");
  });

  test("should create new version when updating document", async () => {
    const { user, org, folder } = await createBaseSetup();
    // Keeping empty since mock reslove value would change for new version
    const mockStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
    };
    // Mock reslove value for version 1
    mockStorage.upload.mockResolvedValue({
      secureUrl: "https://test.com/v1.pdf",
      publicId: "v1-public-id",
      bytes: 1024,
    });

    const v1File = {
      buffer: Buffer.from("version 1"),
      mimetype: "application/pdf",
      originalname: "v1.pdf",
      size: 1024,
    };

    const document = await createDocumentService(
      org.id,
      user.id,
      "Test Document",
      v1File,
      folder.id,
      mockStorage
    );

    // Mock reslove value for version 2
    mockStorage.upload.mockResolvedValue({
      secureUrl: "https://test.com/v2.pdf",
      publicId: "v2-public-id",
      bytes: 2048,
    });

    const v2File = {
      buffer: Buffer.from("version 2"),
      mimetype: "application/pdf",
      originalname: "v2.pdf",
      size: 2048,
    };

    // Update document 
    const updatedDocument = await updateDocumentService(
      org.id,
      user.id,
      document.id,
      v2File,
      mockStorage
    );

    const versions = await prisma.docVersion.findMany({
      where: {
        docId: document.id,
      },
      orderBy: {
        versionNumber: "asc",
      },
    });

    expect(versions).toHaveLength(2);

    expect(versions[0].versionNumber).toBe(1);
    expect(versions[1].versionNumber).toBe(2);

    expect(updatedDocument.currentVersionId).toBe(versions[1].id);

    expect(versions[0].fileUrl).toBe("https://test.com/v1.pdf");

    expect(versions[1].fileUrl).toBe("https://test.com/v2.pdf");
  });

  test("should preserve old versions when creating new versions", async () => {
    const { user, org, folder } = await createBaseSetup();

    const mockStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
    };

    mockStorage.upload.mockResolvedValueOnce({
      secureUrl: "https://test.com/v1.pdf",
      publicId: "v1-public-id",
      bytes: 1024,
    });

    const document = await createDocumentService(
      org.id,
      user.id,
      "Test Document",
      {
        buffer: Buffer.from("version 1"),
        mimetype: "application/pdf",
        originalname: "v1.pdf",
        size: 1024,
      },
      folder.id,
      mockStorage
    );

    const originalVersion = await prisma.docVersion.findFirst({
      where: {
        docId: document.id,
        versionNumber: 1,
      },
    });

    mockStorage.upload.mockResolvedValueOnce({
      secureUrl: "https://test.com/v2.pdf",
      publicId: "v2-public-id",
      bytes: 2048,
    });

    await updateDocumentService(
      org.id,
      user.id,
      document.id,
      {
        buffer: Buffer.from("version 2"),
        mimetype: "application/pdf",
        originalname: "v2.pdf",
        size: 2048,
      },
      mockStorage
    );

    const versionOneAfterUpdate = await prisma.docVersion.findUnique({
      where: {
        id: originalVersion.id,
      },
    });

    expect(versionOneAfterUpdate).not.toBeNull();

    expect(versionOneAfterUpdate.fileUrl).toBe("https://test.com/v1.pdf");

    expect(versionOneAfterUpdate.versionNumber).toBe(1);
  });

  test("should soft delete document", async () => {
    const { user, org, folder } = await createBaseSetup();

    const mockStorage = {
      upload: jest.fn().mockResolvedValue({
        secureUrl: "https://test.com/file.pdf",
        publicId: "test-public-id",
        bytes: 1024,
      }),
      delete: jest.fn(),
    };

    const document = await createDocumentService(
      org.id,
      user.id,
      "Test Document",
      {
        buffer: Buffer.from("test"),
        mimetype: "application/pdf",
        originalname: "test.pdf",
        size: 1024,
      },
      folder.id,
      mockStorage
    );

    const deletedDocument = await deleteDocumentService(
      org.id,
      document.id,
      user.id
    );

    expect(deletedDocument.deletedAt).not.toBeNull();

    const documentInDb = await prisma.doc.findUnique({
      where: {
        id: document.id,
      },
    });

    expect(documentInDb.deletedAt).not.toBeNull();
  });

  test("should throw when document is already deleted", async () => {
    expect.assertions(3)
    const { user, org, folder } = await createBaseSetup();

    const deletedDoc = await prisma.doc.create({
      data: {
        name: "Deleted Doc",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
        deletedAt: new Date()
      }
    })

    try {
      await deleteDocumentService(org.id, deletedDoc.id, user.id)
      fail("Expected ApiError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe("Document not found or already deleted")
    }
  });

  test("should restore soft deleted document", async () => {
    const { user, org, folder } = await createBaseSetup()

    const document = await prisma.doc.create({
      data: {
        name: "Deleted Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
        deletedAt: new Date(),
      }
    })

    const restored = await restoreDocumentService(
      org.id,
      document.id,
      user.id
    )

    expect(restored.deletedAt).toBeNull()

    const dbDoc = await prisma.doc.findUnique({
      where: {
        id: document.id,
      }
    });

    expect(dbDoc.deletedAt).toBeNull()

    expect(dbDoc.folderId).toBe(folder.id)
  });

  test("should throw when document is not deleted", async () => {
    expect.assertions(3);

    const { user, org, folder } = await createBaseSetup();

    const document = await prisma.doc.create({
      data: {
        name: "Active Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    try {
      await restoreDocumentService(
        org.id,
        document.id,
        user.id
      );

      fail("Expected ApiError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(
        "Document is not deleted"
      );
    }
  });

  test("should restore document to root folder when original folder is deleted", async () => {
    const { user, org, folder } = await createBaseSetup();

    const rootFolder = await prisma.folder.create({
      data: {
        orgId: org.id,
        isRoot: true,
        name: "__ROOT__",
        createdBy: user.id
      },
    });

    const document = await prisma.doc.create({
      data: {
        name: "Deleted Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
        deletedAt: new Date(),
      },
    });

    await prisma.folder.update({
      where: {
        id: folder.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    const restored = await restoreDocumentService(
      org.id,
      document.id,
      user.id
    );

    expect(restored.folderId).toBe(rootFolder.id);

    expect(restored.deletedAt).toBeNull();
  });

  test("should restore document to target folder when targetFolderId is supplied", async () => {
    const { user, org, folder: originalFolder } = await createBaseSetup();

    const targetFolder = await createFolder({
      name: "Target Folder",
      orgId: org.id,
      createdBy: user.id,
    })

    const document = await prisma.doc.create({
      data: {
        name: "Deleted Document",
        orgId: org.id,
        folderId: originalFolder.id,
        createdBy: user.id,
        deletedAt: new Date(),
      },
    })

    const restored = await restoreDocumentService(
      org.id,
      document.id,
      user.id,
      targetFolder.id
    )

    expect(restored.folderId).toBe(targetFolder.id)
  });

  test("should rename document successfully", async () => {
    const { user, org, folder } = await createBaseSetup();

    const document = await prisma.doc.create({
      data: {
        name: "Old Name",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    const result = await renameDocumentService(
      org.id,
      user.id,
      document.id,
      "New Name"
    );

    expect(result.finalResult.name)
      .toBe("New Name");

    const dbDoc = await prisma.doc.findUnique({
      where: {
        id: document.id,
      },
    });

    expect(dbDoc.name).toBe("New Name");
  });

  test("should throw when new name is same as current name", async () => {
    expect.assertions(3);

    const { user, org, folder } = await createBaseSetup();

    const document = await prisma.doc.create({
      data: {
        name: "Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    try {
      await renameDocumentService(
        org.id,
        user.id,
        document.id,
        "Document"
      );

      fail("Expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message)
        .toBe("New name must be different from current name");
    }
  });

  test("should move document to another folder", async () => {
    const { user, org, folder } = await createBaseSetup();

    const destinationFolder = await createFolder({
      name: "Destination",
      orgId: org.id,
      parentFolderId: folder.id,
      createdBy: user.id,
    });

    const document = await prisma.doc.create({
      data: {
        name: "Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    const result = await moveDocumentService(
      org.id,
      user.id,
      document.id,
      destinationFolder.id
    );

    expect(result.finalResult.folderId).toBe(destinationFolder.id);

    const dbDoc = await prisma.doc.findUnique({
      where: {
        id: document.id,
      },
    });

    expect(dbDoc.folderId).toBe(destinationFolder.id);
  });

  test("should throw when destination folder does not exist", async () => {
    expect.assertions(3);

    const { user, org, folder } = await createBaseSetup();

    const document = await prisma.doc.create({
      data: {
        name: "Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    try {
      await moveDocumentService(
        org.id,
        user.id,
        document.id,
        999999
      );

      fail("Expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message)
        .toBe("Destination folder not found");
    }
  });

  test("should throw when document is already in destination folder", async () => {
    expect.assertions(3);

    const { user, org, folder } = await createBaseSetup();

    const document = await prisma.doc.create({
      data: {
        name: "Document",
        orgId: org.id,
        folderId: folder.id,
        createdBy: user.id,
      },
    });

    try {
      await moveDocumentService(
        org.id,
        user.id,
        document.id,
        folder.id
      );

      fail("Expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message)
        .toBe("Document is already in this location");
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});