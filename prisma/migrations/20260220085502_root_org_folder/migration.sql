-- AlterTable
-- Virtual Root folder flag for orgs
ALTER TABLE "Folder" ADD COLUMN     "isRoot" BOOLEAN NOT NULL DEFAULT false;
