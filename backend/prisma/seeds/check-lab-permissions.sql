-- Check which roles have laboratory permissions
SELECT r.name as role_name, p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON rp."permissionId" = p.id
WHERE p.module = 'LABORATORY'
ORDER BY r.name, p.name;

-- Check users and their roles
SELECT u.email, u."firstName", u."lastName", u.role, r.name as assigned_role
FROM users u
LEFT JOIN roles r ON u."roleId" = r.id
WHERE u."isActive" = true
LIMIT 10;
