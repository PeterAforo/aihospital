-- Add partial unique index to enforce single PRIMARY diagnosis per encounter
-- This prevents race conditions or direct DB edits from creating duplicate primary diagnoses
CREATE UNIQUE INDEX "diagnoses_encounter_primary_unique" 
ON "diagnoses" ("encounterId") 
WHERE "diagnosisType" = 'PRIMARY';
