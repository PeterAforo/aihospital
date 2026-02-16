-- Add ALL module permissions to HOSPITAL_ADMIN, DOCTOR, and NURSE roles

-- HOSPITAL_ADMIN gets all permissions
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'HOSPITAL_ADMIN'
AND p.module IN ('PHARMACY', 'LABORATORY', 'BILLING')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- DOCTOR gets view permissions for all modules
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'DOCTOR'
AND p.name IN (
  'VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION', 'VIEW_STOCK',
  'VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS', 'VERIFY_LAB_RESULTS', 'VIEW_CRITICAL_VALUES', 'ACKNOWLEDGE_CRITICAL_VALUE', 'VIEW_LAB_REPORTS', 'COLLECT_SAMPLE', 'RECEIVE_SAMPLE',
  'VIEW_INVOICES', 'CREATE_INVOICE', 'VIEW_PAYMENTS', 'VIEW_BILLING_REPORTS'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- NURSE gets relevant permissions
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'NURSE'
AND p.name IN (
  'VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION', 'VIEW_STOCK',
  'VIEW_LAB_RESULTS', 'COLLECT_SAMPLE', 'VIEW_CRITICAL_VALUES', 'VIEW_LAB_REPORTS',
  'VIEW_INVOICES', 'VIEW_PAYMENTS'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- RECEPTIONIST gets billing permissions
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'RECEPTIONIST'
AND p.name IN (
  'VIEW_INVOICES', 'CREATE_INVOICE', 'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'VIEW_BILLING_REPORTS'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
