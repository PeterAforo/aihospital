-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('MAIN', 'SATELLITE_CLINIC', 'DIAGNOSTIC_CENTER', 'MATERNITY_WARD', 'PHARMACY', 'LAB');

-- CreateEnum
CREATE TYPE "BranchAccessScope" AS ENUM ('PRIMARY_ONLY', 'SPECIFIC_BRANCHES', 'ALL_BRANCHES', 'DEPARTMENT_ONLY');

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "branchType" "BranchType" NOT NULL DEFAULT 'MAIN',
ADD COLUMN     "code" TEXT,
ADD COLUMN     "gpsCoordinates" JSONB,
ADD COLUMN     "hasEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasInpatient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasLab" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasPharmacy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "operatingHours" JSONB,
ADD COLUMN     "parentBranchId" TEXT,
ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "registeredAtBranchId" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "maxBranches" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "sharedBilling" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sharedEmr" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sharedInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharedLab" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accessibleBranches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "branchAccessScope" "BranchAccessScope" NOT NULL DEFAULT 'PRIMARY_ONLY',
ADD COLUMN     "currentBranchId" TEXT;

-- CreateTable
CREATE TABLE "branch_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL DEFAULT 'grant',
    "grantedBy" TEXT,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_permissions_userId_idx" ON "branch_permissions"("userId");

-- CreateIndex
CREATE INDEX "branch_permissions_branchId_idx" ON "branch_permissions"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_permissions_userId_branchId_permissionId_key" ON "branch_permissions"("userId", "branchId", "permissionId");

-- CreateIndex
CREATE INDEX "branches_parentBranchId_idx" ON "branches"("parentBranchId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_parentBranchId_fkey" FOREIGN KEY ("parentBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_permissions" ADD CONSTRAINT "branch_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_permissions" ADD CONSTRAINT "branch_permissions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_permissions" ADD CONSTRAINT "branch_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_registeredAtBranchId_fkey" FOREIGN KEY ("registeredAtBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
