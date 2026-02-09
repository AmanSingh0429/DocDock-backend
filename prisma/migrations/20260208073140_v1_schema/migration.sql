/*
  Warnings:

  - Added the required column `bytes` to the `DocVersion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocVersion" ADD COLUMN     "bytes" INTEGER NOT NULL;
