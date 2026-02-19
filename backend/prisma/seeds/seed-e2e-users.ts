import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Test123!';

const E2E_USERS = [
  { email: 'receptionist@hospital.com', role: 'RECEPTIONIST' as const, firstName: 'Esi', lastName: 'Appiah', roleName: 'RECEPTIONIST' },
  { email: 'nurse.triage@hospital.com', role: 'NURSE' as const, firstName: 'Akosua', lastName: 'Owusu', roleName: 'NURSE' },
  { email: 'doctor@hospital.com', role: 'DOCTOR' as const, firstName: 'Kofi', lastName: 'Adu', roleName: 'DOCTOR' },
  { email: 'lab.tech@hospital.com', role: 'LAB_TECHNICIAN' as const, firstName: 'Yaa', lastName: 'Boakye', roleName: 'LAB_TECHNICIAN' },
  { email: 'pharmacist@hospital.com', role: 'PHARMACIST' as const, firstName: 'Kwesi', lastName: 'Antwi', roleName: 'PHARMACIST' },
  { email: 'nurse.ipd@hospital.com', role: 'NURSE' as const, firstName: 'Adjoa', lastName: 'Mensah', roleName: 'NURSE' },
  { email: 'billing@hospital.com', role: 'BILLING_OFFICER' as const, firstName: 'Ama', lastName: 'Darko', roleName: 'BILLING_OFFICER' },
];

export async function seedE2EUsers() {
  const tenant = await prisma.tenant.findFirst();
  const branch = await prisma.branch.findFirst();
  if (!tenant || !branch) { console.log('No tenant/branch found'); return; }

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const roleMap = new Map(roles.map(r => [r.name, r.id]));

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  let created = 0;
  for (const u of E2E_USERS) {
    const existing = await prisma.user.findFirst({ where: { email: u.email } });
    if (existing) continue;

    const roleId = roleMap.get(u.roleName);
    if (!roleId) { console.log(`Role ${u.roleName} not found`); continue; }

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        roleId,
        isActive: true,
        status: 'ACTIVE',
        branchAccessScope: 'PRIMARY_ONLY',
      },
    });
    created++;
  }

  console.log(`E2E test users seeded: ${created} created`);
  await prisma.$disconnect();
}

// Run directly
seedE2EUsers().catch(console.error);
