-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE');

-- CreateEnum
CREATE TYPE "TemperatureSite" AS ENUM ('ORAL', 'AXILLARY', 'TYMPANIC', 'RECTAL');

-- CreateEnum
CREATE TYPE "PulseRhythm" AS ENUM ('REGULAR', 'IRREGULAR');

-- CreateEnum
CREATE TYPE "RespiratoryPattern" AS ENUM ('REGULAR', 'IRREGULAR', 'LABORED');

-- CreateEnum
CREATE TYPE "PainCharacter" AS ENUM ('SHARP', 'DULL', 'BURNING', 'THROBBING', 'CRAMPING', 'ACHING', 'STABBING');

-- CreateEnum
CREATE TYPE "TriageAlertType" AS ENUM ('RED_TRIAGE', 'CRITICAL_VITALS', 'DETERIORATING');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'TRIAGED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "triagedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "triageLevel" INTEGER;

-- CreateTable
CREATE TABLE "triage_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "triagedBy" TEXT NOT NULL,
    "triageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triageTime" TEXT NOT NULL,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "temperature" DOUBLE PRECISION,
    "temperatureSite" "TemperatureSite",
    "pulseRate" INTEGER,
    "pulseRhythm" "PulseRhythm",
    "respiratoryRate" INTEGER,
    "respiratoryPattern" "RespiratoryPattern",
    "spo2" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" INTEGER,
    "bmi" DOUBLE PRECISION,
    "painScale" INTEGER,
    "painLocation" TEXT,
    "painCharacter" "PainCharacter",
    "chiefComplaint" TEXT NOT NULL,
    "symptomDuration" TEXT,
    "symptomSeverity" TEXT,
    "associatedSymptoms" TEXT[],
    "clinicalNotes" TEXT,
    "triageLevel" INTEGER NOT NULL,
    "triageLevelName" TEXT NOT NULL,
    "triageLevelColor" TEXT NOT NULL,
    "suggestedTriageLevel" INTEGER,
    "overrideReason" TEXT,
    "pulsePressure" INTEGER,
    "meanArterialPressure" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'triage',
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "temperature" DOUBLE PRECISION,
    "temperatureSite" "TemperatureSite",
    "pulseRate" INTEGER,
    "pulseRhythm" "PulseRhythm",
    "respiratoryRate" INTEGER,
    "spo2" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" INTEGER,
    "bmi" DOUBLE PRECISION,
    "painScale" INTEGER,
    "triageRecordId" TEXT,
    "encounterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triageRecordId" TEXT NOT NULL,
    "alertType" "TriageAlertType" NOT NULL,
    "alertMessage" TEXT NOT NULL,
    "sentTo" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "triage_records_appointmentId_key" ON "triage_records"("appointmentId");

-- CreateIndex
CREATE INDEX "triage_records_tenantId_triageDate_idx" ON "triage_records"("tenantId", "triageDate");

-- CreateIndex
CREATE INDEX "triage_records_patientId_triageDate_idx" ON "triage_records"("patientId", "triageDate");

-- CreateIndex
CREATE INDEX "triage_records_appointmentId_idx" ON "triage_records"("appointmentId");

-- CreateIndex
CREATE INDEX "triage_records_triageLevel_idx" ON "triage_records"("triageLevel");

-- CreateIndex
CREATE INDEX "vital_signs_history_patientId_recordedAt_idx" ON "vital_signs_history"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "vital_signs_history_tenantId_recordedAt_idx" ON "vital_signs_history"("tenantId", "recordedAt");

-- CreateIndex
CREATE INDEX "triage_alerts_tenantId_sentAt_idx" ON "triage_alerts"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "triage_alerts_triageRecordId_idx" ON "triage_alerts"("triageRecordId");

-- CreateIndex
CREATE INDEX "triage_alerts_acknowledgedBy_idx" ON "triage_alerts"("acknowledgedBy");

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_triagedBy_fkey" FOREIGN KEY ("triagedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs_history" ADD CONSTRAINT "vital_signs_history_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_alerts" ADD CONSTRAINT "triage_alerts_triageRecordId_fkey" FOREIGN KEY ("triageRecordId") REFERENCES "triage_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
