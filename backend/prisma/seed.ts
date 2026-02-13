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

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@demohospital.com',
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demohospital.com',
      phone: '+233200000001',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'HOSPITAL_ADMIN',
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create a doctor user
  const doctorUser = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'doctor@demohospital.com',
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'doctor@demohospital.com',
      phone: '+233200000002',
      password: hashedPassword,
      firstName: 'Kwame',
      lastName: 'Mensah',
      role: 'DOCTOR',
    },
  });

  console.log(`✅ Created doctor user: ${doctorUser.email}`);

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

  // Create a receptionist user
  const receptionistUser = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'reception@demohospital.com',
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'reception@demohospital.com',
      phone: '+233200000003',
      password: hashedPassword,
      firstName: 'Ama',
      lastName: 'Asante',
      role: 'RECEPTIONIST',
    },
  });

  console.log(`✅ Created receptionist user: ${receptionistUser.email}`);

  // Create a nurse user for triage
  const nurseUser = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'nurse@demohospital.com',
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'nurse@demohospital.com',
      phone: '+233200000004',
      password: hashedPassword,
      firstName: 'Akua',
      lastName: 'Boateng',
      role: 'NURSE',
    },
  });

  console.log(`✅ Created nurse user: ${nurseUser.email}`);

  // Create test patients
  const patients = [
    { firstName: 'Kofi', lastName: 'Asante', gender: 'MALE', dateOfBirth: new Date('1985-03-15'), phone: '+233241111111', mrn: 'MRN-001', address: '15 Independence Ave, Accra' },
    { firstName: 'Ama', lastName: 'Mensah', gender: 'FEMALE', dateOfBirth: new Date('1990-07-22'), phone: '+233242222222', mrn: 'MRN-002', address: '23 Liberation Road, Accra' },
    { firstName: 'Kweku', lastName: 'Owusu', gender: 'MALE', dateOfBirth: new Date('1978-11-08'), phone: '+233243333333', mrn: 'MRN-003', address: '8 Oxford Street, Osu' },
    { firstName: 'Abena', lastName: 'Darko', gender: 'FEMALE', dateOfBirth: new Date('1995-01-30'), phone: '+233244444444', mrn: 'MRN-004', address: '45 Ring Road, Accra' },
    { firstName: 'Yaw', lastName: 'Boateng', gender: 'MALE', dateOfBirth: new Date('1960-05-12'), phone: '+233245555555', mrn: 'MRN-005', address: '12 Cantonments Road, Accra' },
    { firstName: 'Efua', lastName: 'Adjei', gender: 'FEMALE', dateOfBirth: new Date('2018-09-25'), phone: '+233246666666', mrn: 'MRN-006', address: '67 Spintex Road, Accra' },
  ];

  const createdPatients = [];
  for (const patientData of patients) {
    const patient = await prisma.patient.upsert({
      where: { 
        tenantId_mrn: {
          tenantId: tenant.id,
          mrn: patientData.mrn,
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        mrn: patientData.mrn,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        gender: patientData.gender as any,
        dateOfBirth: patientData.dateOfBirth,
        phonePrimary: patientData.phone,
        address: patientData.address,
      },
    });
    createdPatients.push(patient);
  }

  console.log(`✅ Created ${createdPatients.length} test patients`);

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

  console.log('\n📋 Demo Credentials:');
  console.log('─────────────────────────────────────');
  console.log(`Tenant ID: ${tenant.id}`);
  console.log('Admin: admin@demohospital.com / Admin@123');
  console.log('Doctor: doctor@demohospital.com / Admin@123');
  console.log('Receptionist: reception@demohospital.com / Admin@123');
  console.log('Nurse: nurse@demohospital.com / Admin@123');
  console.log('─────────────────────────────────────\n');

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
