/*
  Warnings:

  - You are about to drop the column `orgId` on the `projects` table. All the data in the column will be lost.
  - The `minWritePrivilege` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `minReadPrivilege` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `orgId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `users` table. All the data in the column will be lost.
  - The `writePrivilege` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `readPrivilege` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[projectId,path]` on the table `documents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,organizationId]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `path` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `municipalityId` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "ltree";

-- CreateEnum
CREATE TYPE "PrivilegeLevel" AS ENUM ('NO_ACCESS', 'LOW_ACCESS', 'MID_ACCESS', 'HIGH_ACCESS');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FILE', 'FOLDER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('DEFAULT', 'SUPERUSER_MUNICIPALITY', 'SUPERUSER_GLOBAL');

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_orgId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_municipalityId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_orgId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_projectId_fkey";

-- DropIndex
DROP INDEX "projects_name_key";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'FILE',
ADD COLUMN     "path" ltree NOT NULL;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "orgId",
ADD COLUMN     "organizationId" TEXT NOT NULL,
DROP COLUMN "minWritePrivilege",
ADD COLUMN     "minWritePrivilege" "PrivilegeLevel" NOT NULL DEFAULT 'LOW_ACCESS',
DROP COLUMN "minReadPrivilege",
ADD COLUMN     "minReadPrivilege" "PrivilegeLevel" NOT NULL DEFAULT 'LOW_ACCESS';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "orgId",
DROP COLUMN "projectId",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "userRole" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'DEFAULT',
DROP COLUMN "writePrivilege",
ADD COLUMN     "writePrivilege" "PrivilegeLevel" NOT NULL DEFAULT 'LOW_ACCESS',
DROP COLUMN "readPrivilege",
ADD COLUMN     "readPrivilege" "PrivilegeLevel" NOT NULL DEFAULT 'LOW_ACCESS',
ALTER COLUMN "municipalityId" SET NOT NULL;

-- DropEnum
DROP TYPE "ConsumerLevel";

-- DropEnum
DROP TYPE "ProducerLevel";

-- CreateTable
CREATE TABLE "_ProjectToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectToUser_AB_unique" ON "_ProjectToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectToUser_B_index" ON "_ProjectToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "documents_projectId_path_key" ON "documents"("projectId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_organizationId_key" ON "projects"("name", "organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUser" ADD CONSTRAINT "_ProjectToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUser" ADD CONSTRAINT "_ProjectToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
