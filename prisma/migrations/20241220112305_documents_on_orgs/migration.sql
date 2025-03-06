-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_projectId_fkey";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add constraint to ensure that a document is associated with either a project or an organization
ALTER TABLE "documents"
ADD CONSTRAINT "document_project_or_organization_check"
CHECK (
    ("projectId" IS NOT NULL) OR ("organizationId" IS NOT NULL)
);