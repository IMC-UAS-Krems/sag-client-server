-- AlterTable
ALTER TABLE "users" ADD COLUMN     "initialDocuments" JSONB[] DEFAULT ARRAY[]::JSONB[];
