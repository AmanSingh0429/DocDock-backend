/*
  Warnings:

  - Changed the type of `name` on the `Roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Remove Enum to make roles dynamic and default
ALTER TABLE "Roles"
ALTER COLUMN "name" DROP DEFAULT;

-- Convert enum to text
ALTER TABLE "Roles"
ALTER COLUMN "name" TYPE TEXT USING "name"::TEXT;

-- Now drop enum
DROP TYPE "Role";

-- Ensure unique index
CREATE UNIQUE INDEX IF NOT EXISTS "Roles_name_key"
ON "Roles"("name");
