/*
  Warnings:

  - The values [USER,ADMIN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[username,deleted]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deleted]` on the table `users` will be added. If there are existing duplicate values, this will fail.

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

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "needsToBeLoggedOut" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userRole" SET DEFAULT 'Developer';

-- CreateIndex
CREATE UNIQUE INDEX "users_username_deleted_key" ON "users"("username", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deleted_key" ON "users"("email", "deleted");
