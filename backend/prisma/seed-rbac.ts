import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All permissions organized by module
const PERMISSIONS = {
  patient_management: [
    { name: 'REGISTER_PATIENT', displayName: 'Register Patient', description: 'Create new patient records' },
    { name: 'VIEW_PATIENT', displayName: 'View Patient', description: 'View patient details and history' },
    { name: 'VIEW_PATIENT_BASIC', displayName: 'View Patient Basic Info', description: 'View basic patient demographics only' },
    { name: 'EDIT_PATIENT', displayName: 'Edit Patient', description: 'Modify patient information' },
    { name: 'DELETE_PATIENT', displayName: 'Delete Patient', description: 'Delete patient records' },
    { name: 'MERGE_PATIENTS', displayName: 'Merge Patients', description: 'Merge duplicate patient records' },
    { name: 'VIEW_PATIENT_HISTORY', displayName: 'View Patient History', description: 'View complete patient medical history' },
    { name: 'EXPORT_PATIENT_DATA', displayName: 'Export Patient Data', description: 'Export patient data to files' },
  ],
  appointments: [
    { name: 'CREATE_APPOINTMENT', displayName: 'Create Appointment', description: 'Book new appointments' },
    { name: 'VIEW_APPOINTMENT', displayName: 'View Appointment', description: 'View appointment details' },
    { name: 'EDIT_APPOINTMENT', displayName: 'Edit Appointment', description: 'Modify appointment details' },
    { name: 'CANCEL_APPOINTMENT', displayName: 'Cancel Appointment', description: 'Cancel appointments' },
    { name: 'CHECK_IN_PATIENT', displayName: 'Check In Patient', description: 'Check in patients for appointments' },
    { name: 'VIEW_APPOINTMENT_SCHEDULE', displayName: 'View Appointment Schedule', description: 'View doctor schedules' },
  ],
  triage: [
    { name: 'TRIAGE', displayName: 'Perform Triage', description: 'Triage patients and assign priority' },
    { name: 'VIEW_TRIAGE', displayName: 'View Triage', description: 'View triage records' },
    { name: 'RECORD_VITALS', displayName: 'Record Vitals', description: 'Record patient vital signs' },
    { name: 'VIEW_VITALS', displayName: 'View Vitals', description: 'View patient vital signs' },
    { name: 'REPRIORITIZE_QUEUE', displayName: 'Reprioritize Queue', description: 'Change patient queue priority' },
  ],
  clinical_encounters: [
    { name: 'CREATE_ENCOUNTER', displayName: 'Create Encounter', description: 'Create clinical encounters' },
    { name: 'VIEW_ENCOUNTER', displayName: 'View Encounter', description: 'View encounter details' },
    { name: 'EDIT_ENCOUNTER', displayName: 'Edit Encounter', description: 'Modify encounter details' },
    { name: 'SIGN_ENCOUNTER', displayName: 'Sign Encounter', description: 'Sign off on encounters' },
    { name: 'VIEW_ALL_ENCOUNTERS', displayName: 'View All Encounters', description: 'View all patient encounters' },
    { name: 'DELETE_ENCOUNTER', displayName: 'Delete Encounter', description: 'Delete encounter records' },
  ],
  prescribing: [
    { name: 'PRESCRIBE', displayName: 'Prescribe Medications', description: 'Write prescriptions' },
    { name: 'VIEW_PRESCRIPTION', displayName: 'View Prescription', description: 'View prescription details' },
    { name: 'EDIT_PRESCRIPTION', displayName: 'Edit Prescription', description: 'Modify prescriptions' },
    { name: 'CANCEL_PRESCRIPTION', displayName: 'Cancel Prescription', description: 'Cancel prescriptions' },
    { name: 'DISPENSE_MEDICATION', displayName: 'Dispense Medication', description: 'Dispense medications to patients' },
    { name: 'VIEW_DRUG_FORMULARY', displayName: 'View Drug Formulary', description: 'View available medications' },
    { name: 'MANAGE_DRUG_FORMULARY', displayName: 'Manage Drug Formulary', description: 'Add/edit medications in formulary' },
  ],
  laboratory: [
    { name: 'ORDER_LAB', displayName: 'Order Lab Tests', description: 'Order laboratory tests' },
    { name: 'VIEW_LAB_ORDER', displayName: 'View Lab Order', description: 'View lab test orders' },
    { name: 'PROCESS_LAB_TEST', displayName: 'Process Lab Test', description: 'Process and run lab tests' },
    { name: 'UPLOAD_LAB_RESULT', displayName: 'Upload Lab Result', description: 'Upload lab test results' },
    { name: 'APPROVE_LAB_RESULT', displayName: 'Approve Lab Result', description: 'Approve and sign lab results' },
    { name: 'VIEW_LAB_RESULTS', displayName: 'View Lab Results', description: 'View lab test results' },
    { name: 'CANCEL_LAB_ORDER', displayName: 'Cancel Lab Order', description: 'Cancel lab test orders' },
  ],
  radiology: [
    { name: 'ORDER_RADIOLOGY', displayName: 'Order Radiology', description: 'Order imaging studies' },
    { name: 'VIEW_RADIOLOGY_ORDER', displayName: 'View Radiology Order', description: 'View radiology orders' },
    { name: 'PERFORM_IMAGING', displayName: 'Perform Imaging', description: 'Perform imaging procedures' },
    { name: 'UPLOAD_RADIOLOGY_RESULT', displayName: 'Upload Radiology Result', description: 'Upload imaging results' },
    { name: 'APPROVE_RADIOLOGY_REPORT', displayName: 'Approve Radiology Report', description: 'Approve radiology reports' },
    { name: 'VIEW_RADIOLOGY_RESULTS', displayName: 'View Radiology Results', description: 'View imaging results' },
  ],
  pharmacy: [
    { name: 'MANAGE_DRUG_INVENTORY', displayName: 'Manage Drug Inventory', description: 'Manage pharmacy inventory' },
    { name: 'RECEIVE_DRUG_STOCK', displayName: 'Receive Drug Stock', description: 'Receive new drug shipments' },
    { name: 'ADJUST_STOCK', displayName: 'Adjust Stock', description: 'Adjust inventory quantities' },
    { name: 'VIEW_STOCK_LEVELS', displayName: 'View Stock Levels', description: 'View current inventory levels' },
    { name: 'GENERATE_STOCK_REPORT', displayName: 'Generate Stock Report', description: 'Generate inventory reports' },
  ],
  billing: [
    { name: 'VIEW_INVOICE', displayName: 'View Invoice', description: 'View patient invoices' },
    { name: 'CREATE_INVOICE', displayName: 'Create Invoice', description: 'Create new invoices' },
    { name: 'EDIT_INVOICE', displayName: 'Edit Invoice', description: 'Modify invoices' },
    { name: 'DELETE_INVOICE', displayName: 'Delete Invoice', description: 'Delete invoices' },
    { name: 'PROCESS_PAYMENT', displayName: 'Process Payment', description: 'Process patient payments' },
    { name: 'VOID_PAYMENT', displayName: 'Void Payment', description: 'Void processed payments' },
    { name: 'VIEW_FINANCIAL_REPORTS', displayName: 'View Financial Reports', description: 'View financial reports' },
    { name: 'SUBMIT_NHIS_CLAIM', displayName: 'Submit NHIS Claim', description: 'Submit insurance claims' },
    { name: 'APPROVE_NHIS_CLAIM', displayName: 'Approve NHIS Claim', description: 'Approve insurance claims' },
  ],
  user_management: [
    { name: 'MANAGE_USERS', displayName: 'Manage Users', description: 'Full user management access' },
    { name: 'CREATE_USER', displayName: 'Create User', description: 'Create new user accounts' },
    { name: 'EDIT_USER', displayName: 'Edit User', description: 'Modify user accounts' },
    { name: 'DEACTIVATE_USER', displayName: 'Deactivate User', description: 'Deactivate user accounts' },
    { name: 'ASSIGN_ROLE', displayName: 'Assign Role', description: 'Assign roles to users' },
    { name: 'VIEW_USERS', displayName: 'View Users', description: 'View user list' },
    { name: 'RESET_USER_PASSWORD', displayName: 'Reset User Password', description: 'Reset user passwords' },
  ],
  system_admin: [
    { name: 'MANAGE_TENANTS', displayName: 'Manage Tenants', description: 'Manage hospital tenants' },
    { name: 'MANAGE_DEPARTMENTS', displayName: 'Manage Departments', description: 'Manage hospital departments' },
    { name: 'MANAGE_SETTINGS', displayName: 'Manage Settings', description: 'Manage system settings' },
    { name: 'VIEW_AUDIT_LOG', displayName: 'View Audit Log', description: 'View system audit logs' },
    { name: 'MANAGE_ROLES', displayName: 'Manage Roles', description: 'Create and modify roles' },
    { name: 'MANAGE_PERMISSIONS', displayName: 'Manage Permissions', description: 'Assign permissions to roles' },
    { name: 'VIEW_SYSTEM_REPORTS', displayName: 'View System Reports', description: 'View system-wide reports' },
  ],
  patient_portal: [
    { name: 'VIEW_OWN_RECORDS', displayName: 'View Own Records', description: 'View own medical records' },
    { name: 'BOOK_OWN_APPOINTMENT', displayName: 'Book Own Appointment', description: 'Book appointments for self' },
    { name: 'VIEW_OWN_PRESCRIPTIONS', displayName: 'View Own Prescriptions', description: 'View own prescriptions' },
    { name: 'VIEW_OWN_LAB_RESULTS', displayName: 'View Own Lab Results', description: 'View own lab results' },
  ],
};

// System roles with their permissions
const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    displayName: 'Super Admin',
    description: 'System administrator with full access',
    permissions: 'ALL',
  },
  HOSPITAL_ADMIN: {
    displayName: 'Hospital Admin',
    description: 'Hospital administrator',
    permissions: [
      'MANAGE_USERS', 'CREATE_USER', 'EDIT_USER', 'DEACTIVATE_USER', 'ASSIGN_ROLE', 'VIEW_USERS', 'RESET_USER_PASSWORD',
      'MANAGE_DEPARTMENTS', 'MANAGE_SETTINGS', 'VIEW_AUDIT_LOG', 'MANAGE_ROLES', 'MANAGE_PERMISSIONS', 'VIEW_SYSTEM_REPORTS',
      'VIEW_PATIENT', 'VIEW_ALL_ENCOUNTERS', 'VIEW_FINANCIAL_REPORTS', 'SUBMIT_NHIS_CLAIM', 'APPROVE_NHIS_CLAIM',
      'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
    ],
  },
  MEDICAL_DIRECTOR: {
    displayName: 'Medical Director',
    description: 'Chief Medical Officer',
    permissions: [
      'VIEW_PATIENT', 'VIEW_PATIENT_HISTORY', 'VIEW_ALL_ENCOUNTERS', 'VIEW_LAB_RESULTS', 'VIEW_RADIOLOGY_RESULTS',
      'VIEW_AUDIT_LOG', 'VIEW_SYSTEM_REPORTS', 'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
    ],
  },
  HEAD_NURSE: {
    displayName: 'Head Nurse',
    description: 'Nursing supervisor',
    permissions: [
      'VIEW_PATIENT', 'TRIAGE', 'VIEW_TRIAGE', 'RECORD_VITALS', 'VIEW_VITALS', 'REPRIORITIZE_QUEUE',
      'VIEW_PRESCRIPTION', 'VIEW_ENCOUNTER', 'CHECK_IN_PATIENT', 'VIEW_APPOINTMENT', 'VIEW_USERS',
    ],
  },
  DOCTOR: {
    displayName: 'Doctor',
    description: 'Physician/Medical doctor',
    permissions: [
      'VIEW_PATIENT', 'EDIT_PATIENT', 'VIEW_PATIENT_HISTORY',
      'CREATE_ENCOUNTER', 'VIEW_ENCOUNTER', 'EDIT_ENCOUNTER', 'SIGN_ENCOUNTER',
      'PRESCRIBE', 'VIEW_PRESCRIPTION', 'EDIT_PRESCRIPTION',
      'ORDER_LAB', 'VIEW_LAB_RESULTS', 'ORDER_RADIOLOGY', 'VIEW_RADIOLOGY_RESULTS',
      'CREATE_APPOINTMENT', 'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
      'VIEW_VITALS', 'VIEW_TRIAGE',
    ],
  },
  NURSE: {
    displayName: 'Nurse',
    description: 'Registered nurse',
    permissions: [
      'VIEW_PATIENT', 'TRIAGE', 'VIEW_TRIAGE', 'RECORD_VITALS', 'VIEW_VITALS',
      'VIEW_PRESCRIPTION', 'VIEW_ENCOUNTER', 'CHECK_IN_PATIENT',
      'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
    ],
  },
  PHARMACIST: {
    displayName: 'Pharmacist',
    description: 'Licensed pharmacist',
    permissions: [
      'VIEW_PRESCRIPTION', 'DISPENSE_MEDICATION', 'VIEW_DRUG_FORMULARY', 'MANAGE_DRUG_FORMULARY',
      'MANAGE_DRUG_INVENTORY', 'RECEIVE_DRUG_STOCK', 'ADJUST_STOCK', 'VIEW_STOCK_LEVELS', 'GENERATE_STOCK_REPORT',
      'VIEW_PATIENT_BASIC',
    ],
  },
  LAB_TECHNICIAN: {
    displayName: 'Lab Technician',
    description: 'Laboratory technician',
    permissions: [
      'VIEW_LAB_ORDER', 'PROCESS_LAB_TEST', 'UPLOAD_LAB_RESULT', 'VIEW_LAB_RESULTS',
      'VIEW_PATIENT_BASIC',
    ],
  },
  RADIOLOGIST: {
    displayName: 'Radiologist',
    description: 'Radiology specialist',
    permissions: [
      'VIEW_RADIOLOGY_ORDER', 'PERFORM_IMAGING', 'UPLOAD_RADIOLOGY_RESULT', 'APPROVE_RADIOLOGY_REPORT', 'VIEW_RADIOLOGY_RESULTS',
      'VIEW_PATIENT_BASIC',
    ],
  },
  RECEPTIONIST: {
    displayName: 'Receptionist',
    description: 'Front desk staff',
    permissions: [
      'REGISTER_PATIENT', 'VIEW_PATIENT_BASIC', 'EDIT_PATIENT',
      'CREATE_APPOINTMENT', 'VIEW_APPOINTMENT', 'EDIT_APPOINTMENT', 'CANCEL_APPOINTMENT', 'CHECK_IN_PATIENT',
      'VIEW_APPOINTMENT_SCHEDULE',
    ],
  },
  BILLING_OFFICER: {
    displayName: 'Billing Officer',
    description: 'Accounts/billing staff',
    permissions: [
      'VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PROCESS_PAYMENT',
      'VIEW_FINANCIAL_REPORTS', 'SUBMIT_NHIS_CLAIM',
      'VIEW_PATIENT_BASIC',
    ],
  },
  RECORDS_OFFICER: {
    displayName: 'Records Officer',
    description: 'Medical records officer',
    permissions: [
      'VIEW_PATIENT', 'VIEW_ENCOUNTER', 'EXPORT_PATIENT_DATA', 'VIEW_PATIENT_HISTORY',
    ],
  },
  PATIENT: {
    displayName: 'Patient',
    description: 'Patient portal user',
    permissions: [
      'VIEW_OWN_RECORDS', 'BOOK_OWN_APPOINTMENT', 'VIEW_OWN_PRESCRIPTIONS', 'VIEW_OWN_LAB_RESULTS',
    ],
  },
};

async function seedPermissions() {
  console.log('Seeding permissions...');
  
  const allPermissions: { name: string; displayName: string; description: string; module: string }[] = [];
  
  for (const [module, permissions] of Object.entries(PERMISSIONS)) {
    for (const perm of permissions) {
      allPermissions.push({
        ...perm,
        module,
      });
    }
  }

  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        displayName: perm.displayName,
        description: perm.description,
        module: perm.module,
      },
      create: {
        name: perm.name,
        displayName: perm.displayName,
        description: perm.description || '',
        module: perm.module,
        isSystemPermission: true,
      },
    });
  }

  console.log(`✅ Seeded ${allPermissions.length} permissions`);
  return allPermissions;
}

async function seedRoles() {
  console.log('Seeding system roles...');

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));

  for (const [roleName, roleConfig] of Object.entries(SYSTEM_ROLES)) {
    // Check if system role already exists
    let role = await prisma.role.findFirst({
      where: {
        name: roleName,
        isSystemRole: true,
      },
    });

    if (role) {
      // Update existing role
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          displayName: roleConfig.displayName,
          description: roleConfig.description,
        },
      });
    } else {
      // Create new system role
      role = await prisma.role.create({
        data: {
          name: roleName,
          displayName: roleConfig.displayName,
          description: roleConfig.description,
          isSystemRole: true,
          tenantId: null,
        },
      });
    }

    // Assign permissions to role
    let permissionsToAssign: string[] = [];
    
    if (roleConfig.permissions === 'ALL') {
      permissionsToAssign = allPermissions.map(p => p.name);
    } else {
      permissionsToAssign = roleConfig.permissions as string[];
    }

    // Delete existing role permissions and recreate
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const permName of permissionsToAssign) {
      const permId = permissionMap.get(permName);
      if (permId) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }

    console.log(`  ✅ ${roleName}: ${permissionsToAssign.length} permissions`);
  }

  console.log(`✅ Seeded ${Object.keys(SYSTEM_ROLES).length} system roles`);
}

async function main() {
  console.log('🚀 Starting RBAC seed...\n');
  
  await seedPermissions();
  await seedRoles();
  
  console.log('\n✅ RBAC seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
