-- Add VIEW_LAB_RESULTS permission to all relevant roles
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name IN ('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_SCIENTIST')
AND p.name = 'VIEW_LAB_RESULTS'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
