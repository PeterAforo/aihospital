const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check roles with lab permissions
  const rolesWithLabPerms = await prisma.$queryRawUnsafe(`
    SELECT r.name as role_name, array_agg(p.name) as permissions
    FROM roles r
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON rp."permissionId" = p.id
    WHERE p.module = 'LABORATORY'
    GROUP BY r.name
  `);
  
  console.log('\n=== ROLES WITH LABORATORY PERMISSIONS ===');
  rolesWithLabPerms.forEach(r => {
    console.log(`\n${r.role_name}:`);
    console.log(`  ${r.permissions.join(', ')}`);
  });

  // Check active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { email: true, firstName: true, lastName: true, role: true },
    take: 10
  });
  
  console.log('\n=== ACTIVE USERS ===');
  users.forEach(u => {
    console.log(`${u.email} - ${u.firstName} ${u.lastName} (${u.role})`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
