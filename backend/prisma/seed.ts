import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Hospital',
      subdomain: 'demo',
      email: 'admin@demohospital.com',
      phone: '+233200000000',
      address: '123 Hospital Street',
      city: 'Accra',
      region: 'Greater Accra',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Create main branch (find or create)
  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, name: 'Main Branch' },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Branch',
        address: '123 Hospital Street',
        city: 'Accra',
        region: 'Greater Accra',
        phone: '+233200000000',
        email: 'main@demohospital.com',
        isMainBranch: true,
      },
    });
  }

  console.log(`✅ Created branch: ${branch.name}`);

  // Create departments
  const departments: Record<string, any> = {};
  const deptData = [
    { name: 'Administration', code: 'ADMIN', description: 'Hospital administration' },
    { name: 'General Medicine', code: 'MED', description: 'General medical department' },
    { name: 'Nursing', code: 'NUR', description: 'Nursing department' },
    { name: 'Reception', code: 'REC', description: 'Front desk and reception' },
    { name: 'Pharmacy', code: 'PHAR', description: 'Pharmacy department' },
    { name: 'Laboratory', code: 'LAB', description: 'Laboratory department' },
    { name: 'Radiology', code: 'RAD', description: 'Radiology and imaging' },
    { name: 'Billing', code: 'BIL', description: 'Billing and finance' },
  ];

  for (const dept of deptData) {
    const d = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: dept.name } },
      update: {},
      create: { tenantId: tenant.id, ...dept },
    });
    departments[dept.code] = d;
  }

  console.log(`✅ Created ${deptData.length} departments`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  // Look up SystemRoles created by seed-rbac.ts so we can link users via roleId
  const roleNames = [
    'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE',
    'MEDICAL_DIRECTOR', 'HEAD_NURSE', 'PHARMACIST',
    'LAB_TECHNICIAN', 'RADIOLOGIST', 'BILLING_OFFICER', 'RECORDS_OFFICER',
  ] as const;
  const roles: Record<string, { id: string }> = {};
  for (const name of roleNames) {
    const role = await prisma.role.findFirst({ where: { name } });
    if (!role) {
      console.error(`❌ Role ${name} not found. Run seed-rbac.ts first: npx tsx prisma/seed-rbac.ts`);
      process.exit(1);
    }
    roles[name] = role;
  }
  
  // Define all users — one per role
  const usersData = [
    { email: 'admin@demohospital.com',     phone: '+233200000001', firstName: 'System',  lastName: 'Admin',    role: 'HOSPITAL_ADMIN',   deptCode: 'ADMIN' },
    { email: 'director@demohospital.com',   phone: '+233200000010', firstName: 'Nana',    lastName: 'Agyeman',  role: 'MEDICAL_DIRECTOR', deptCode: 'MED' },
    { email: 'headnurse@demohospital.com',  phone: '+233200000011', firstName: 'Adwoa',   lastName: 'Frimpong', role: 'HEAD_NURSE',       deptCode: 'NUR' },
    { email: 'doctor@demohospital.com',     phone: '+233200000002', firstName: 'Kwame',   lastName: 'Mensah',   role: 'DOCTOR',           deptCode: 'MED' },
    { email: 'nurse@demohospital.com',      phone: '+233200000004', firstName: 'Akua',    lastName: 'Boateng',  role: 'NURSE',            deptCode: 'NUR' },
    { email: 'pharmacist@demohospital.com', phone: '+233200000005', firstName: 'Yaw',     lastName: 'Osei',     role: 'PHARMACIST',       deptCode: 'PHAR' },
    { email: 'labtech@demohospital.com',    phone: '+233200000006', firstName: 'Abena',   lastName: 'Kusi',     role: 'LAB_TECHNICIAN',   deptCode: 'LAB' },
    { email: 'radiologist@demohospital.com',phone: '+233200000007', firstName: 'Kofi',    lastName: 'Amponsah', role: 'RADIOLOGIST',      deptCode: 'RAD' },
    { email: 'reception@demohospital.com',  phone: '+233200000003', firstName: 'Ama',     lastName: 'Asante',   role: 'RECEPTIONIST',     deptCode: 'REC' },
    { email: 'billing@demohospital.com',    phone: '+233200000008', firstName: 'Efua',    lastName: 'Mensah',   role: 'BILLING_OFFICER',  deptCode: 'BIL' },
    { email: 'records@demohospital.com',    phone: '+233200000009', firstName: 'Kweku',   lastName: 'Darko',    role: 'RECORDS_OFFICER',  deptCode: 'ADMIN' },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: {
        roleId: roles[u.role].id,
        branchId: branch.id,
        departmentId: departments[u.deptCode].id,
      },
      create: {
        tenantId: tenant.id,
        email: u.email,
        phone: u.phone,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role as any,
        roleId: roles[u.role].id,
        branchId: branch.id,
        departmentId: departments[u.deptCode].id,
      },
    });
    createdUsers[u.role] = user;
    console.log(`  ✅ ${u.role}: ${u.email}`);
  }

  console.log(`✅ Created ${usersData.length} users`);

  const doctorUser = createdUsers['DOCTOR'];

  // Create doctor schedule (Monday to Friday, 8am to 5pm)
  const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
  for (const dayOfWeek of daysOfWeek) {
    const existingSchedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId: doctorUser.id, dayOfWeek },
    });

    if (!existingSchedule) {
      await prisma.doctorSchedule.create({
        data: {
          tenantId: tenant.id,
          doctorId: doctorUser.id,
          dayOfWeek,
          startTime: '08:00',
          endTime: '17:00',
          slotDuration: 30,
          isActive: true,
        },
      });
    }
  }

  console.log(`✅ Created doctor schedule for Dr. ${doctorUser.lastName}`);

  // Create test patients
  const patients = [
    { firstName: 'Kofi', lastName: 'Asante', gender: 'MALE', dateOfBirth: new Date('1985-03-15'), phone: '+233241111111', mrn: 'MRN-001', address: '15 Independence Ave, Accra' },
    { firstName: 'Ama', lastName: 'Mensah', gender: 'FEMALE', dateOfBirth: new Date('1990-07-22'), phone: '+233242222222', mrn: 'MRN-002', address: '23 Liberation Road, Accra' },
    { firstName: 'Kweku', lastName: 'Owusu', gender: 'MALE', dateOfBirth: new Date('1978-11-08'), phone: '+233243333333', mrn: 'MRN-003', address: '8 Oxford Street, Osu' },
    { firstName: 'Abena', lastName: 'Darko', gender: 'FEMALE', dateOfBirth: new Date('1995-01-30'), phone: '+233244444444', mrn: 'MRN-004', address: '45 Ring Road, Accra' },
    { firstName: 'Yaw', lastName: 'Boateng', gender: 'MALE', dateOfBirth: new Date('1960-05-12'), phone: '+233245555555', mrn: 'MRN-005', address: '12 Cantonments Road, Accra' },
    { firstName: 'Efua', lastName: 'Adjei', gender: 'FEMALE', dateOfBirth: new Date('2018-09-25'), phone: '+233246666666', mrn: 'MRN-006', address: '67 Spintex Road, Accra' },
  ];

  // Hash portal password for test patients
  const portalPasswordHash = await bcrypt.hash('Patient@123', 12);

  const createdPatients = [];
  for (let idx = 0; idx < patients.length; idx++) {
    const patientData = patients[idx];
    const enablePortal = idx < 3; // First 3 patients get portal access
    const patient = await prisma.patient.upsert({
      where: { 
        tenantId_mrn: {
          tenantId: tenant.id,
          mrn: patientData.mrn,
        }
      },
      update: {
        ...(enablePortal && {
          portalAccessEnabled: true,
          portalPasswordHash,
        }),
      },
      create: {
        tenantId: tenant.id,
        mrn: patientData.mrn,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        gender: patientData.gender as any,
        dateOfBirth: patientData.dateOfBirth,
        phonePrimary: patientData.phone,
        address: patientData.address,
        email: enablePortal ? `${patientData.firstName.toLowerCase()}@patient.demo` : undefined,
        ...(enablePortal && {
          portalAccessEnabled: true,
          portalPasswordHash,
        }),
      },
    });
    createdPatients.push(patient);
  }

  console.log(`✅ Created ${createdPatients.length} test patients (${Math.min(3, patients.length)} portal-enabled)`);

  // Auto-create StaffProfiles for all users (HR sync)
  for (const [roleName, user] of Object.entries(createdUsers)) {
    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        employeeId: `EMP-${String(Object.keys(createdUsers).indexOf(roleName) + 1).padStart(3, '0')}`,
        department: usersData.find(u => u.role === roleName)?.deptCode || 'ADMIN',
        designation: (roleName as string).replace(/_/g, ' '),
        employmentType: 'FULL_TIME',
        dateOfJoining: new Date(),
        baseSalary: 5000,
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${Object.keys(createdUsers).length} staff profiles (HR sync)`);

  // Create test appointments for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  const chiefComplaints = [
    'Persistent headache for 3 days',
    'Fever and body aches',
    'Follow-up for hypertension',
    'Abdominal pain and nausea',
    'Chest pain and shortness of breath',
    'Child with high fever and cough',
  ];

  for (let i = 0; i < createdPatients.length; i++) {
    const patient = createdPatients[i];
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        patientId: patient.id,
        appointmentDate: today,
      },
    });

    if (!existingAppointment) {
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          patientId: patient.id,
          doctorId: doctorUser.id,
          appointmentDate: today,
          appointmentTime: appointmentTimes[i],
          duration: 30,
          status: 'SCHEDULED',
          bookingChannel: 'WALKIN',
          chiefComplaint: chiefComplaints[i],
        },
      });
    }
  }

  console.log(`✅ Created ${createdPatients.length} test appointments for today`);

  console.log('\n📋 Staff Credentials (all passwords: Admin@123):');
  console.log('──────────────────────────────────────────────────────');
  console.log(`Tenant ID: ${tenant.id}`);
  for (const u of usersData) {
    console.log(`  ${u.role.padEnd(20)} ${u.email}`);
  }
  console.log('──────────────────────────────────────────────────────');
  console.log('\n📋 Patient Portal Credentials (password: Patient@123):');
  console.log('──────────────────────────────────────────────────────');
  for (let i = 0; i < Math.min(3, patients.length); i++) {
    const p = patients[i];
    console.log(`  ${p.mrn.padEnd(10)} ${p.firstName} ${p.lastName.padEnd(12)} Phone: ${p.phone}`);
  }
  console.log('  Login with: MRN, phone, or email + password');
  console.log('──────────────────────────────────────────────────────\n');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
