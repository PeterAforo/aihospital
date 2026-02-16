-- Seed service prices for billing
-- This ensures that services have default prices for invoicing

-- Consultation Services
INSERT INTO "service_prices" (
  "id", "tenantId", "name", "category", "cashPrice", "nhisPrice", "isActive", "createdAt", "updatedAt"
) VALUES 
  (gen_random_uuid(), NULL, 'General Consultation', 'CONSULTATION', 50.00, 35.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Specialist Consultation', 'CONSULTATION', 80.00, 60.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Emergency Consultation', 'CONSULTATION', 100.00, 75.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Follow-up Consultation', 'CONSULTATION', 40.00, 30.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Telemedicine Consultation', 'CONSULTATION', 45.00, 32.00, TRUE, NOW(), NOW());

-- Triage Services
INSERT INTO "service_prices" (
  "id", "tenantId", "name", "category", "cashPrice", "nhisPrice", "isActive", "createdAt", "updatedAt"
) VALUES 
  (gen_random_uuid(), NULL, 'Triage Assessment', 'TRIAGE', 20.00, 15.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Vital Signs Measurement', 'TRIAGE', 15.00, 10.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Emergency Triage', 'TRIAGE', 30.00, 20.00, TRUE, NOW(), NOW());

-- Procedure Services
INSERT INTO "service_prices" (
  "id", "tenantId", "name", "category", "cashPrice", "nhisPrice", "isActive", "createdAt", "updatedAt"
) VALUES 
  (gen_random_uuid(), NULL, 'Minor Procedure', 'PROCEDURE', 100.00, 75.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Vaccination', 'PROCEDURE', 25.00, 20.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Wound Dressing', 'PROCEDURE', 30.00, 20.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Injection', 'PROCEDURE', 15.00, 10.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'IV Drip Setup', 'PROCEDURE', 40.00, 30.00, TRUE, NOW(), NOW());

-- Imaging Services
INSERT INTO "service_prices" (
  "id", "tenantId", "name", "category", "cashPrice", "nhisPrice", "isActive", "createdAt", "updatedAt"
) VALUES 
  (gen_random_uuid(), NULL, 'X-Ray', 'IMAGING', 50.00, 40.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Ultrasound', 'IMAGING', 100.00, 80.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'CT Scan', 'IMAGING', 300.00, 250.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'MRI', 'IMAGING', 500.00, 400.00, TRUE, NOW(), NOW());

-- Other Services
INSERT INTO "service_prices" (
  "id", "tenantId", "name", "category", "cashPrice", "nhisPrice", "isActive", "createdAt", "updatedAt"
) VALUES 
  (gen_random_uuid(), NULL, 'Registration Fee', 'OTHER', 10.00, 5.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Medical Report', 'OTHER', 20.00, 15.00, TRUE, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Certificate', 'OTHER', 30.00, 20.00, TRUE, NOW(), NOW());
