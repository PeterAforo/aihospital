/*
  Warnings:

  - You are about to drop the column `description` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `diagnoses` table. All the data in the column will be lost.
  - The `physicalExamination` column on the `encounters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `encounters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `icd10Description` to the `diagnoses` table without a default value. This is not possible if the table is not empty.
  - Made the column `icd10Code` on table `diagnoses` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELEMEDICINE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'AMA', 'DECEASED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CHRONIC');

-- CreateEnum
CREATE TYPE "OrderUrgency" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "RadiologyOrderStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "diagnoses" DROP COLUMN "description",
DROP COLUMN "type",
ADD COLUMN     "diagnosisType" "DiagnosisType" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "icd10Description" TEXT NOT NULL,
ADD COLUMN     "onsetDate" TIMESTAMP(3),
ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resolvedDate" TIMESTAMP(3),
ADD COLUMN     "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "icd10Code" SET NOT NULL;

-- AlterTable
ALTER TABLE "encounters" ADD COLUMN     "allergiesReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billingStatus" TEXT,
ADD COLUMN     "clinicalImpression" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "differentialDiagnoses" TEXT[],
ADD COLUMN     "disposition" "Disposition",
ADD COLUMN     "encounterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "encounterDurationMinutes" INTEGER,
ADD COLUMN     "encounterTime" TEXT,
ADD COLUMN     "encounterType" "EncounterType" NOT NULL DEFAULT 'OUTPATIENT',
ADD COLUMN     "familyHistory" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpPlan" TEXT,
ADD COLUMN     "generalAppearance" TEXT,
ADD COLUMN     "isBillable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "medicationsReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pastMedicalHistory" TEXT,
ADD COLUMN     "patientEducation" TEXT,
ADD COLUMN     "reviewOfSystems" JSONB,
ADD COLUMN     "socialHistory" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "templateUsed" TEXT,
ADD COLUMN     "treatmentPlan" TEXT,
ADD COLUMN     "triageRecordId" TEXT,
DROP COLUMN "physicalExamination",
ADD COLUMN     "physicalExamination" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "EncounterStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "icd10_codes" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" INTEGER,
    "category" TEXT,
    "isCommonGhana" BOOLEAN NOT NULL DEFAULT false,
    "synonyms" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icd10_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "problem_list" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "icd10Code" TEXT,
    "icd10Description" TEXT,
    "problemName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "onsetDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "addedBy" TEXT,
    "addedFromEncounterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "orderedBy" TEXT NOT NULL,
    "studyType" TEXT NOT NULL,
    "bodyPart" TEXT,
    "laterality" TEXT,
    "urgency" "OrderUrgency" NOT NULL DEFAULT 'ROUTINE',
    "clinicalIndication" TEXT,
    "status" "RadiologyOrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "findings" TEXT,
    "impression" TEXT,
    "reportedBy" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounter_notes_history" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editedBy" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,

    CONSTRAINT "encounter_notes_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounter_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "encounterType" TEXT,
    "specialty" TEXT,
    "chiefComplaintPrompt" TEXT,
    "hpiPrompts" JSONB,
    "rosDefaults" JSONB,
    "physicalExamDefaults" JSONB,
    "commonDiagnoses" JSONB,
    "commonOrders" JSONB,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "icd10_codes_isCommonGhana_idx" ON "icd10_codes"("isCommonGhana");

-- CreateIndex
CREATE INDEX "problem_list_patientId_status_idx" ON "problem_list"("patientId", "status");

-- CreateIndex
CREATE INDEX "problem_list_tenantId_idx" ON "problem_list"("tenantId");

-- CreateIndex
CREATE INDEX "radiology_orders_encounterId_idx" ON "radiology_orders"("encounterId");

-- CreateIndex
CREATE INDEX "radiology_orders_patientId_idx" ON "radiology_orders"("patientId");

-- CreateIndex
CREATE INDEX "radiology_orders_status_idx" ON "radiology_orders"("status");

-- CreateIndex
CREATE INDEX "radiology_orders_tenantId_orderedAt_idx" ON "radiology_orders"("tenantId", "orderedAt");

-- CreateIndex
CREATE INDEX "encounter_notes_history_encounterId_idx" ON "encounter_notes_history"("encounterId");

-- CreateIndex
CREATE INDEX "encounter_templates_tenantId_isActive_idx" ON "encounter_templates"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "encounter_templates_specialty_idx" ON "encounter_templates"("specialty");

-- CreateIndex
CREATE UNIQUE INDEX "encounter_templates_tenantId_name_key" ON "encounter_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "diagnoses_icd10Code_idx" ON "diagnoses"("icd10Code");

-- CreateIndex
CREATE INDEX "encounters_tenantId_encounterDate_idx" ON "encounters"("tenantId", "encounterDate");

-- CreateIndex
CREATE INDEX "encounters_status_idx" ON "encounters"("status");

-- AddForeignKey
ALTER TABLE "problem_list" ADD CONSTRAINT "problem_list_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_notes_history" ADD CONSTRAINT "encounter_notes_history_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
