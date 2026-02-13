-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "encounters" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "appointments_departmentId_idx" ON "appointments"("departmentId");

-- CreateIndex
CREATE INDEX "encounters_departmentId_idx" ON "encounters"("departmentId");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
