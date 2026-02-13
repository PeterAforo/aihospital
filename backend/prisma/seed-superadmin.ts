import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up SaaS Super Admin and User Structure...\n');

  // 1. Create Super Admin Tenant (Platform level)
  let platformTenant = await prisma.tenant.findFirst({
    where: { subdomain: 'platform' },
  });

  if (!platformTenant) {
    platformTenant = await prisma.tenant.create({
      data: {
        name: 'AIHospital Platform',
        subdomain: 'platform',
        slug: 'platform',
        type: 'HOSPITAL',
        phone: '+233000000000',
        email: 'admin@aihospital.com',
        address: 'Platform HQ',
        subscriptionPlan: 'ENTERPRISE',
        maxUsers: 1000,
        maxBranches: 100,
        sharedEmr: true,
        sharedBilling: true,
        sharedInventory: true,
        sharedLab: true,
      },
    });
    console.log('✅ Created Platform Tenant');
  } else {
    console.log('ℹ️  Platform Tenant already exists');
  }

  // 2. Create Platform Main Branch
  let platformBranch = await prisma.branch.findFirst({
    where: { tenantId: platformTenant.id, isMainBranch: true },
  });

  if (!platformBranch) {
    platformBranch = await prisma.branch.create({
      data: {
        tenantId: platformTenant.id,
        name: 'Platform HQ',
        code: 'HQ',
        branchType: 'MAIN',
        phone: '+233000000000',
        email: 'hq@aihospital.com',
        address: 'Platform Headquarters',
        isMainBranch: true,
        hasEmergency: false,
        hasInpatient: false,
        hasLab: false,
        hasPharmacy: false,
      },
    });
    console.log('✅ Created Platform Main Branch');
  }

  // 3. Create Platform Admin Department
  let adminDept = await prisma.department.findFirst({
    where: { tenantId: platformTenant.id, name: 'Administration' },
  });

  if (!adminDept) {
    adminDept = await prisma.department.create({
      data: {
        tenantId: platformTenant.id,
        name: 'Administration',
        code: 'ADMIN',
        description: 'Platform Administration',
      },
    });
    console.log('✅ Created Administration Department');
  }

  // 4. Get SUPER_ADMIN role
  const superAdminRole = await prisma.role.findFirst({
    where: { name: 'SUPER_ADMIN', isSystemRole: true },
  });

  if (!superAdminRole) {
    console.error('❌ SUPER_ADMIN role not found. Run seed-rbac.ts first.');
    return;
  }

  // 5. Create Super Admin User
  const superAdminEmail = 'superadmin@aihospital.com';
  let superAdmin = await prisma.user.findFirst({
    where: { email: superAdminEmail },
  });

  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash('SuperAdmin@2024!', 12);
    
    superAdmin = await prisma.user.create({
      data: {
        tenantId: platformTenant.id,
        branchId: platformBranch.id,
        departmentId: adminDept.id,
        roleId: superAdminRole.id,
        email: superAdminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        branchAccessScope: 'ALL_BRANCHES',
        accessibleBranches: [],
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log('✅ Created Super Admin User');
    console.log('   Email: superadmin@aihospital.com');
    console.log('   Password: SuperAdmin@2024!');
  } else {
    console.log('ℹ️  Super Admin already exists');
  }

  // 6. Update all existing users to have proper structure
  console.log('\n📋 Updating existing users with Tenant -> Branch -> Department structure...\n');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    where: { id: { not: platformTenant.id } },
    include: { branches: true },
  });

  for (const tenant of tenants) {
    console.log(`\n🏥 Processing Tenant: ${tenant.name}`);

    // Ensure tenant has a main branch
    let mainBranch = tenant.branches.find(b => b.isMainBranch);
    if (!mainBranch) {
      mainBranch = tenant.branches[0];
      if (!mainBranch) {
        mainBranch = await prisma.branch.create({
          data: {
            tenantId: tenant.id,
            name: `${tenant.name} - Main`,
            code: 'MAIN',
            branchType: 'MAIN',
            phone: tenant.phone,
            email: tenant.email,
            address: tenant.address || 'Main Branch',
            isMainBranch: true,
            hasLab: true,
            hasPharmacy: true,
          },
        });
        console.log(`  ✅ Created Main Branch for ${tenant.name}`);
      } else {
        await prisma.branch.update({
          where: { id: mainBranch.id },
          data: { isMainBranch: true },
        });
        console.log(`  ✅ Set ${mainBranch.name} as Main Branch`);
      }
    }

    // Ensure tenant has default departments
    const defaultDepts = [
      { name: 'Administration', code: 'ADMIN', description: 'Hospital Administration' },
      { name: 'General Medicine', code: 'MED', description: 'General Medical Department' },
      { name: 'Emergency', code: 'ER', description: 'Emergency Department' },
      { name: 'Pharmacy', code: 'PHARM', description: 'Pharmacy Department' },
      { name: 'Laboratory', code: 'LAB', description: 'Laboratory Department' },
      { name: 'Nursing', code: 'NURS', description: 'Nursing Department' },
      { name: 'Reception', code: 'REC', description: 'Reception and Front Desk' },
    ];

    for (const dept of defaultDepts) {
      const existing = await prisma.department.findFirst({
        where: { tenantId: tenant.id, name: dept.name },
      });
      if (!existing) {
        await prisma.department.create({
          data: { tenantId: tenant.id, ...dept },
        });
      }
    }
    console.log(`  ✅ Ensured default departments exist`);

    // Get departments for role mapping
    const departments = await prisma.department.findMany({
      where: { tenantId: tenant.id },
    });
    const deptMap = new Map(departments.map(d => [d.code, d.id]));

    // Update users without branch or department
    const usersToUpdate = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { branchId: null },
          { departmentId: null },
        ],
      },
    });

    for (const user of usersToUpdate) {
      // Determine department based on role
      let departmentId = deptMap.get('ADMIN');
      switch (user.role) {
        case 'DOCTOR':
          departmentId = deptMap.get('MED');
          break;
        case 'NURSE':
          departmentId = deptMap.get('NURS');
          break;
        case 'PHARMACIST':
          departmentId = deptMap.get('PHARM');
          break;
        case 'LAB_TECHNICIAN':
          departmentId = deptMap.get('LAB');
          break;
        case 'RECEPTIONIST':
          departmentId = deptMap.get('REC');
          break;
        case 'HOSPITAL_ADMIN':
        case 'BILLING_OFFICER':
        case 'HR_MANAGER':
        case 'ACCOUNTANT':
          departmentId = deptMap.get('ADMIN');
          break;
      }

      // Get matching system role
      const systemRole = await prisma.role.findFirst({
        where: { name: user.role, isSystemRole: true },
      });

      // Determine branch access scope
      let branchAccessScope = 'PRIMARY_ONLY';
      if (user.role === 'HOSPITAL_ADMIN' || user.role === 'SUPER_ADMIN') {
        branchAccessScope = 'ALL_BRANCHES';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          branchId: user.branchId || mainBranch.id,
          departmentId: departmentId || null,
          roleId: systemRole?.id || null,
          branchAccessScope: branchAccessScope as any,
        },
      });
      console.log(`  ✅ Updated user: ${user.firstName} ${user.lastName} (${user.role})`);
    }
  }

  console.log('\n✅ User structure update complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
