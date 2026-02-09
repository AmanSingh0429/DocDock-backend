/*
  Warnings:

  - A unique constraint covering the columns `[orgId,folderId,name]` on the table `Doc` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_folderId_fkey";

-- AlterTable
ALTER TABLE "Doc" ALTER COLUMN "folderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Doc_orgId_folderId_name_key" ON "Doc"("orgId", "folderId", "name");

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
