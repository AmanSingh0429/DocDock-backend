/*
  Warnings:

  - A unique constraint covering the columns `[orgId,name]` on the table `Doc` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "unique_root_doc_name" ON "Doc"("orgId", "name");
