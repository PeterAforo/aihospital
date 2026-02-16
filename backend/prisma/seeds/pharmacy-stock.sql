-- Seed pharmacy stock data
-- First, get the tenant and branch IDs from existing data

-- Insert stock for each drug with sample batch data
INSERT INTO pharmacy_stock (id, "tenantId", "branchId", "drugId", "batchNumber", quantity, "reorderLevel", "costPrice", "sellingPrice", "expiryDate", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  t.id as "tenantId",
  b.id as "branchId",
  d.id as "drugId",
  'BATCH-' || SUBSTRING(d.id::text, 1, 8) || '-2025' as "batchNumber",
  FLOOR(RANDOM() * 500 + 100)::int as quantity,
  50 as "reorderLevel",
  COALESCE(d."cashPrice", 10.0) as "costPrice",
  COALESCE(d."cashPrice" * 1.3, 13.0) as "sellingPrice",
  NOW() + INTERVAL '1 year' + (RANDOM() * INTERVAL '1 year') as "expiryDate",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM drugs d
CROSS JOIN (SELECT id FROM tenants LIMIT 1) t
CROSS JOIN (SELECT id FROM branches LIMIT 1) b
WHERE d."isActive" = true
ON CONFLICT DO NOTHING;

-- Add a second batch for some drugs (to simulate multiple batches)
INSERT INTO pharmacy_stock (id, "tenantId", "branchId", "drugId", "batchNumber", quantity, "reorderLevel", "costPrice", "sellingPrice", "expiryDate", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  t.id as "tenantId",
  b.id as "branchId",
  d.id as "drugId",
  'BATCH-' || SUBSTRING(d.id::text, 1, 8) || '-2024' as "batchNumber",
  FLOOR(RANDOM() * 200 + 50)::int as quantity,
  50 as "reorderLevel",
  COALESCE(d."cashPrice", 10.0) as "costPrice",
  COALESCE(d."cashPrice" * 1.3, 13.0) as "sellingPrice",
  NOW() + INTERVAL '6 months' + (RANDOM() * INTERVAL '6 months') as "expiryDate",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM drugs d
CROSS JOIN (SELECT id FROM tenants LIMIT 1) t
CROSS JOIN (SELECT id FROM branches LIMIT 1) b
WHERE d."isActive" = true
AND RANDOM() > 0.5
ON CONFLICT DO NOTHING;

-- Add some low stock items for testing alerts
UPDATE pharmacy_stock 
SET quantity = FLOOR(RANDOM() * 30 + 10)::int
WHERE id IN (
  SELECT id FROM pharmacy_stock ORDER BY RANDOM() LIMIT 5
);

-- Add some expiring soon items for testing
UPDATE pharmacy_stock 
SET "expiryDate" = NOW() + INTERVAL '20 days'
WHERE id IN (
  SELECT id FROM pharmacy_stock ORDER BY RANDOM() LIMIT 3
);
