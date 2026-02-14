-- DropIndex
DROP INDEX IF EXISTS "unique_root_doc_name";

-- Enforce unique root-level folder names per organization
-- Prevents duplicate folder names where parentFolderId IS NULL
CREATE UNIQUE INDEX unique_root_folder_name
ON "Folder" ("orgId", "name")
WHERE "parentFolderId" IS NULL;

-- Enforce unique root-level document names per organization
-- Prevents duplicate document names where folderId IS NULL
CREATE UNIQUE INDEX unique_root_doc_name
ON "Doc" ("orgId", "name")
WHERE "folderId" IS NULL;
