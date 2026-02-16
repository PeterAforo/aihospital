-- Seed Full Blood Count (FBC) as a panel test with parameters
-- First, update an existing test or create FBC test
INSERT INTO lab_tests (id, "tenantId", name, code, category, "sampleType", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM tenants LIMIT 1),
  'Full Blood Count',
  'FBC',
  'HEMATOLOGY',
  'BLOOD',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC');

-- Add parameters for FBC
INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'White Blood Cell Count',
  'WBC',
  '10^9/L',
  '4.0-11.0',
  1,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'WBC');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Red Blood Cell Count',
  'RBC',
  '10^12/L',
  '4.5-5.5',
  2,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'RBC');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Hemoglobin',
  'HGB',
  'g/dL',
  '12.0-17.0',
  3,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'HGB');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Hematocrit',
  'HCT',
  '%',
  '36-48',
  4,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'HCT');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Platelet Count',
  'PLT',
  '10^9/L',
  '150-400',
  5,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'PLT');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Mean Corpuscular Volume',
  'MCV',
  'fL',
  '80-100',
  6,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'MCV');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'FBC' LIMIT 1),
  'Mean Corpuscular Hemoglobin',
  'MCH',
  'pg',
  '27-33',
  7,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'FBC')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'MCH');

-- Add Liver Function Test (LFT) as another panel
INSERT INTO lab_tests (id, "tenantId", name, code, category, "sampleType", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM tenants LIMIT 1),
  'Liver Function Test',
  'LFT',
  'CHEMISTRY',
  'BLOOD',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'LFT' LIMIT 1),
  'Alanine Aminotransferase',
  'ALT',
  'U/L',
  '7-56',
  1,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'ALT');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'LFT' LIMIT 1),
  'Aspartate Aminotransferase',
  'AST',
  'U/L',
  '10-40',
  2,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'AST');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'LFT' LIMIT 1),
  'Alkaline Phosphatase',
  'ALP',
  'U/L',
  '44-147',
  3,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'ALP');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'LFT' LIMIT 1),
  'Total Bilirubin',
  'TBIL',
  'mg/dL',
  '0.1-1.2',
  4,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'TBIL');

INSERT INTO lab_test_parameters (id, "testId", name, code, unit, "normalRange", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM lab_tests WHERE code = 'LFT' LIMIT 1),
  'Albumin',
  'ALB',
  'g/dL',
  '3.5-5.0',
  5,
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM lab_tests WHERE code = 'LFT')
AND NOT EXISTS (SELECT 1 FROM lab_test_parameters WHERE code = 'ALB');
