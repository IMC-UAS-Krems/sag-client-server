/*
  Warnings:

  - Made the column `organizationId` on table `documents` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "organizationId" SET NOT NULL;
