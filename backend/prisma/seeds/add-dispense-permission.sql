-- Add DISPENSE_MEDICATION permission to DOCTOR, NURSE, and HOSPITAL_ADMIN roles
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name IN ('DOCTOR', 'NURSE', 'HOSPITAL_ADMIN')
AND p.name = 'DISPENSE_MEDICATION'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Also add all pharmacy permissions to HOSPITAL_ADMIN if not already added
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'HOSPITAL_ADMIN'
AND p.module = 'PHARMACY'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Add all lab permissions to HOSPITAL_ADMIN
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'HOSPITAL_ADMIN'
AND p.module = 'LABORATORY'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Add all billing permissions to HOSPITAL_ADMIN
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'HOSPITAL_ADMIN'
AND p.module = 'BILLING'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
