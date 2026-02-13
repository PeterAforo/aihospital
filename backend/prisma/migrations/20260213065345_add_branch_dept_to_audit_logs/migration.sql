/*
  Warnings:

  - You are about to drop the column `entity` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `audit_logs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "audit_logs_entity_entityId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "entity",
DROP COLUMN "entityId",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "resourceType" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_branchId_createdAt_idx" ON "audit_logs"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_departmentId_idx" ON "audit_logs"("departmentId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
