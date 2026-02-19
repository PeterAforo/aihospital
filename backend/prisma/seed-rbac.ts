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
    { name: 'ENTER_LAB_RESULTS', displayName: 'Enter Lab Results', description: 'Enter lab test results' },
    { name: 'VERIFY_LAB_RESULTS', displayName: 'Verify Lab Results', description: 'Verify lab test results' },
    { name: 'COLLECT_SAMPLE', displayName: 'Collect Sample', description: 'Collect lab samples' },
    { name: 'RECEIVE_SAMPLE', displayName: 'Receive Sample', description: 'Receive lab samples' },
    { name: 'REJECT_SAMPLE', displayName: 'Reject Sample', description: 'Reject lab samples' },
    { name: 'VIEW_CRITICAL_VALUES', displayName: 'View Critical Values', description: 'View critical lab values' },
    { name: 'ACKNOWLEDGE_CRITICAL_VALUE', displayName: 'Acknowledge Critical Value', description: 'Acknowledge critical lab values' },
  ],
  radiology: [
    { name: 'ORDER_RADIOLOGY', displayName: 'Order Radiology', description: 'Order imaging studies' },
    { name: 'VIEW_RADIOLOGY_ORDER', displayName: 'View Radiology Order', description: 'View radiology orders' },
    { name: 'PERFORM_IMAGING', displayName: 'Perform Imaging', description: 'Perform imaging procedures' },
    { name: 'UPLOAD_RADIOLOGY_RESULT', displayName: 'Upload Radiology Result', description: 'Upload imaging results' },
    { name: 'APPROVE_RADIOLOGY_REPORT', displayName: 'Approve Radiology Report', description: 'Approve radiology reports' },
    { name: 'VIEW_RADIOLOGY_RESULTS', displayName: 'View Radiology Results', description: 'View imaging results' },
    { name: 'CREATE_RADIOLOGY_REPORT', displayName: 'Create Radiology Report', description: 'Write radiology reports' },
    { name: 'VERIFY_RADIOLOGY_REPORT', displayName: 'Verify Radiology Report', description: 'Verify and finalize radiology reports' },
    { name: 'MANAGE_RADIOLOGY_TEMPLATES', displayName: 'Manage Radiology Templates', description: 'Create and edit report templates' },
    { name: 'MANAGE_STUDY_TYPES', displayName: 'Manage Study Types', description: 'Configure imaging study types' },
  ],
  pharmacy: [
    { name: 'MANAGE_DRUG_INVENTORY', displayName: 'Manage Drug Inventory', description: 'Manage pharmacy inventory' },
    { name: 'RECEIVE_DRUG_STOCK', displayName: 'Receive Drug Stock', description: 'Receive new drug shipments' },
    { name: 'VIEW_PRESCRIPTION_QUEUE', displayName: 'View Prescription Queue', description: 'View prescription dispensing queue' },
    { name: 'DISPENSE_MEDICATION', displayName: 'Dispense Medication', description: 'Dispense medications to patients' },
    { name: 'VIEW_STOCK', displayName: 'View Stock', description: 'View pharmacy stock levels' },
    { name: 'ADJUST_STOCK', displayName: 'Adjust Stock', description: 'Adjust pharmacy stock levels' },
    { name: 'RECEIVE_STOCK', displayName: 'Receive Stock', description: 'Receive pharmacy stock' },
    { name: 'WRITE_OFF_STOCK', displayName: 'Write Off Stock', description: 'Write off expired/damaged stock' },
    { name: 'MANAGE_SUPPLIERS', displayName: 'Manage Suppliers', description: 'Manage pharmacy suppliers' },
    { name: 'VIEW_PURCHASE_ORDERS', displayName: 'View Purchase Orders', description: 'View pharmacy purchase orders' },
    { name: 'CREATE_PURCHASE_ORDER', displayName: 'Create Purchase Order', description: 'Create pharmacy purchase orders' },
    { name: 'APPROVE_PURCHASE_ORDER', displayName: 'Approve Purchase Order', description: 'Approve pharmacy purchase orders' },
    { name: 'RECEIVE_PURCHASE_ORDER', displayName: 'Receive Purchase Order', description: 'Receive goods from purchase orders' },
    { name: 'VIEW_PHARMACY_REPORTS', displayName: 'View Pharmacy Reports', description: 'View pharmacy reports' },
  ],
  billing: [
    { name: 'VIEW_INVOICE', displayName: 'View Invoice', description: 'View patient invoices' },
    { name: 'CREATE_INVOICE', displayName: 'Create Invoice', description: 'Create new invoices' },
    { name: 'EDIT_INVOICE', displayName: 'Edit Invoice', description: 'Modify invoices' },
    { name: 'DELETE_INVOICE', displayName: 'Delete Invoice', description: 'Delete invoices' },
    { name: 'PROCESS_PAYMENT', displayName: 'Process Payment', description: 'Process patient payments' },
    { name: 'VOID_PAYMENT', displayName: 'Void Payment', description: 'Void processed payments' },
    { name: 'VIEW_FINANCIAL_REPORTS', displayName: 'View Financial Reports', description: 'View financial reports' },
    { name: 'VIEW_NHIS_CLAIMS', displayName: 'View NHIS Claims', description: 'View NHIS insurance claims' },
    { name: 'CREATE_NHIS_CLAIM', displayName: 'Create NHIS Claim', description: 'Create NHIS insurance claims' },
    { name: 'SUBMIT_NHIS_CLAIM', displayName: 'Submit NHIS Claim', description: 'Submit insurance claims' },
    { name: 'APPROVE_NHIS_CLAIM', displayName: 'Approve NHIS Claim', description: 'Approve insurance claims' },
    { name: 'MANAGE_NHIS_CLAIMS', displayName: 'Manage NHIS Claims', description: 'Approve, reject, reconcile NHIS claims' },
    { name: 'VIEW_INVOICES', displayName: 'View Invoices', description: 'View patient invoices' },
    { name: 'VIEW_PAYMENTS', displayName: 'View Payments', description: 'View payment records' },
    { name: 'RECEIVE_PAYMENT', displayName: 'Receive Payment', description: 'Receive patient payments' },
    { name: 'PROCESS_REFUND', displayName: 'Process Refund', description: 'Process payment refunds' },
    { name: 'APPLY_DISCOUNT', displayName: 'Apply Discount', description: 'Apply discounts to invoices' },
    { name: 'CANCEL_INVOICE', displayName: 'Cancel Invoice', description: 'Cancel invoices' },
    { name: 'VIEW_BILLING_REPORTS', displayName: 'View Billing Reports', description: 'View billing reports' },
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
  inpatient: [
    { name: 'VIEW_ADMISSIONS', displayName: 'View Admissions', description: 'View inpatient admissions' },
    { name: 'ADMIT_PATIENT', displayName: 'Admit Patient', description: 'Admit patients to wards' },
    { name: 'DISCHARGE_PATIENT', displayName: 'Discharge Patient', description: 'Discharge admitted patients' },
    { name: 'TRANSFER_BED', displayName: 'Transfer Bed', description: 'Transfer patients between beds' },
    { name: 'MANAGE_WARDS', displayName: 'Manage Wards', description: 'Create and manage wards and beds' },
    { name: 'ADD_NURSING_NOTE', displayName: 'Add Nursing Note', description: 'Add nursing notes to admissions' },
    { name: 'RECORD_WARD_ROUND', displayName: 'Record Ward Round', description: 'Record ward round findings' },
    { name: 'RECORD_INPATIENT_VITALS', displayName: 'Record Inpatient Vitals', description: 'Record vitals for admitted patients' },
    { name: 'MANAGE_MEDICATION_ADMIN', displayName: 'Manage Medication Administration', description: 'Schedule and administer medications' },
    { name: 'VIEW_INPATIENT_REPORTS', displayName: 'View Inpatient Reports', description: 'View inpatient reports and statistics' },
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
      'VIEW_PATIENT', 'VIEW_ALL_ENCOUNTERS', 'VIEW_FINANCIAL_REPORTS', 'VIEW_NHIS_CLAIMS', 'CREATE_NHIS_CLAIM', 'SUBMIT_NHIS_CLAIM', 'APPROVE_NHIS_CLAIM', 'MANAGE_NHIS_CLAIMS',
      'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
      'VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS', 'VERIFY_LAB_RESULTS', 'COLLECT_SAMPLE', 'RECEIVE_SAMPLE', 'REJECT_SAMPLE',
      'VIEW_CRITICAL_VALUES', 'ACKNOWLEDGE_CRITICAL_VALUE',
      // Pharmacy permissions
      'VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION', 'VIEW_STOCK', 'ADJUST_STOCK', 'RECEIVE_STOCK', 'WRITE_OFF_STOCK',
      'MANAGE_SUPPLIERS', 'VIEW_PURCHASE_ORDERS', 'CREATE_PURCHASE_ORDER', 'APPROVE_PURCHASE_ORDER', 'RECEIVE_PURCHASE_ORDER',
      'VIEW_PHARMACY_REPORTS',
      // Billing permissions
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'DELETE_INVOICE', 'VIEW_PAYMENTS', 'RECEIVE_PAYMENT',
      'PROCESS_REFUND', 'APPLY_DISCOUNT', 'CANCEL_INVOICE', 'VIEW_BILLING_REPORTS',
      // Inpatient permissions
      'VIEW_ADMISSIONS', 'ADMIT_PATIENT', 'DISCHARGE_PATIENT', 'TRANSFER_BED', 'MANAGE_WARDS',
      'ADD_NURSING_NOTE', 'RECORD_WARD_ROUND', 'RECORD_INPATIENT_VITALS', 'MANAGE_MEDICATION_ADMIN', 'VIEW_INPATIENT_REPORTS',
    ],
  },
  MEDICAL_DIRECTOR: {
    displayName: 'Medical Director',
    description: 'Chief Medical Officer',
    permissions: [
      'VIEW_PATIENT', 'VIEW_PATIENT_HISTORY', 'VIEW_ALL_ENCOUNTERS', 'VIEW_LAB_RESULTS', 'VIEW_RADIOLOGY_RESULTS',
      'VIEW_AUDIT_LOG', 'VIEW_SYSTEM_REPORTS', 'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
      'VIEW_ADMISSIONS', 'VIEW_INPATIENT_REPORTS',
    ],
  },
  HEAD_NURSE: {
    displayName: 'Head Nurse',
    description: 'Nursing supervisor',
    permissions: [
      'VIEW_PATIENT', 'TRIAGE', 'VIEW_TRIAGE', 'RECORD_VITALS', 'VIEW_VITALS', 'REPRIORITIZE_QUEUE',
      'VIEW_PRESCRIPTION', 'VIEW_ENCOUNTER', 'CHECK_IN_PATIENT', 'VIEW_APPOINTMENT', 'VIEW_USERS',
      'VIEW_ADMISSIONS', 'ADD_NURSING_NOTE', 'RECORD_INPATIENT_VITALS', 'MANAGE_MEDICATION_ADMIN', 'MANAGE_WARDS',
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
      'VIEW_ADMISSIONS', 'ADMIT_PATIENT', 'DISCHARGE_PATIENT', 'RECORD_WARD_ROUND', 'MANAGE_MEDICATION_ADMIN',
    ],
  },
  NURSE: {
    displayName: 'Nurse',
    description: 'Registered nurse',
    permissions: [
      'VIEW_PATIENT', 'TRIAGE', 'VIEW_TRIAGE', 'RECORD_VITALS', 'VIEW_VITALS',
      'VIEW_PRESCRIPTION', 'VIEW_ENCOUNTER', 'CHECK_IN_PATIENT',
      'VIEW_APPOINTMENT', 'VIEW_APPOINTMENT_SCHEDULE',
      'VIEW_ADMISSIONS', 'ADD_NURSING_NOTE', 'RECORD_INPATIENT_VITALS', 'MANAGE_MEDICATION_ADMIN',
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
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'APPLY_DISCOUNT', 'CANCEL_INVOICE',
      'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'PROCESS_REFUND',
      'VIEW_BILLING_REPORTS', 'VIEW_FINANCIAL_REPORTS',
      'VIEW_NHIS_CLAIMS', 'CREATE_NHIS_CLAIM', 'SUBMIT_NHIS_CLAIM',
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
