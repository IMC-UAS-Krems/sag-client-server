/*
  Warnings:

  - The values [USER,ADMIN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('Developer', 'Manager', 'Administrator');
ALTER TABLE "users" ALTER COLUMN "userRole" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "userRole" TYPE "UserRole_new" USING ("userRole"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "userRole" SET DEFAULT 'Developer';
COMMIT;

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "description" TEXT NOT NULL DEFAULT 'Organisation Description';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTimeActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "needsToBeLoggedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userRole" SET DEFAULT 'Developer';


-- Add Partial Unique Indexes
CREATE UNIQUE INDEX "users_username_deleted_unique" ON "users" ("username") WHERE "deleted" = false;
CREATE UNIQUE INDEX "users_email_deleted_unique" ON "users" ("email") WHERE "deleted" = false;
