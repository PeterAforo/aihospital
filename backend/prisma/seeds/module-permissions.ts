import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedModulePermissions() {
  const permissions = [
    // ==================== PHARMACY PERMISSIONS ====================
    { name: 'VIEW_PRESCRIPTION_QUEUE', displayName: 'View Prescription Queue', description: 'View prescription dispensing queue', module: 'PHARMACY' },
    { name: 'DISPENSE_MEDICATION', displayName: 'Dispense Medication', description: 'Dispense medications to patients', module: 'PHARMACY' },
    { name: 'VIEW_STOCK', displayName: 'View Stock', description: 'View pharmacy stock levels', module: 'PHARMACY' },
    { name: 'ADJUST_STOCK', displayName: 'Adjust Stock', description: 'Adjust stock quantities', module: 'PHARMACY' },
    { name: 'RECEIVE_STOCK', displayName: 'Receive Stock', description: 'Receive stock into inventory', module: 'PHARMACY' },
    { name: 'WRITE_OFF_STOCK', displayName: 'Write Off Stock', description: 'Write off expired or damaged stock', module: 'PHARMACY' },
    { name: 'VIEW_PHARMACY_REPORTS', displayName: 'View Pharmacy Reports', description: 'View pharmacy reports and analytics', module: 'PHARMACY' },
    { name: 'MANAGE_SUPPLIERS', displayName: 'Manage Suppliers', description: 'Manage supplier information', module: 'PHARMACY' },
    { name: 'VIEW_PURCHASE_ORDERS', displayName: 'View Purchase Orders', description: 'View purchase orders', module: 'PHARMACY' },
    { name: 'CREATE_PURCHASE_ORDER', displayName: 'Create Purchase Order', description: 'Create new purchase orders', module: 'PHARMACY' },
    { name: 'APPROVE_PURCHASE_ORDER', displayName: 'Approve Purchase Order', description: 'Approve purchase orders', module: 'PHARMACY' },
    { name: 'RECEIVE_PURCHASE_ORDER', displayName: 'Receive Purchase Order', description: 'Receive goods from purchase orders', module: 'PHARMACY' },

    // ==================== LABORATORY PERMISSIONS ====================
    { name: 'VIEW_LAB_RESULTS', displayName: 'View Lab Results', description: 'View laboratory results', module: 'LABORATORY' },
    { name: 'ENTER_LAB_RESULTS', displayName: 'Enter Lab Results', description: 'Enter laboratory test results', module: 'LABORATORY' },
    { name: 'VERIFY_LAB_RESULTS', displayName: 'Verify Lab Results', description: 'Verify and approve lab results', module: 'LABORATORY' },
    { name: 'COLLECT_SAMPLE', displayName: 'Collect Sample', description: 'Collect patient samples', module: 'LABORATORY' },
    { name: 'RECEIVE_SAMPLE', displayName: 'Receive Sample', description: 'Receive samples in the lab', module: 'LABORATORY' },
    { name: 'REJECT_SAMPLE', displayName: 'Reject Sample', description: 'Reject inadequate samples', module: 'LABORATORY' },
    { name: 'VIEW_CRITICAL_VALUES', displayName: 'View Critical Values', description: 'View critical value alerts', module: 'LABORATORY' },
    { name: 'ACKNOWLEDGE_CRITICAL_VALUE', displayName: 'Acknowledge Critical Value', description: 'Acknowledge critical value alerts', module: 'LABORATORY' },
    { name: 'VIEW_LAB_REPORTS', displayName: 'View Lab Reports', description: 'View laboratory reports and analytics', module: 'LABORATORY' },

    // ==================== BILLING PERMISSIONS ====================
    { name: 'VIEW_INVOICES', displayName: 'View Invoices', description: 'View patient invoices', module: 'BILLING' },
    { name: 'CREATE_INVOICE', displayName: 'Create Invoice', description: 'Create new invoices', module: 'BILLING' },
    { name: 'EDIT_INVOICE', displayName: 'Edit Invoice', description: 'Edit existing invoices', module: 'BILLING' },
    { name: 'CANCEL_INVOICE', displayName: 'Cancel Invoice', description: 'Cancel invoices', module: 'BILLING' },
    { name: 'APPLY_DISCOUNT', displayName: 'Apply Discount', description: 'Apply discounts to invoices', module: 'BILLING' },
    { name: 'VIEW_PAYMENTS', displayName: 'View Payments', description: 'View payment records', module: 'BILLING' },
    { name: 'RECEIVE_PAYMENT', displayName: 'Receive Payment', description: 'Receive payments from patients', module: 'BILLING' },
    { name: 'PROCESS_REFUND', displayName: 'Process Refund', description: 'Process payment refunds', module: 'BILLING' },
    { name: 'VIEW_BILLING_REPORTS', displayName: 'View Billing Reports', description: 'View billing reports', module: 'BILLING' },
    { name: 'VIEW_FINANCIAL_REPORTS', displayName: 'View Financial Reports', description: 'View financial reports and aging', module: 'BILLING' },

    // ==================== NHIS PERMISSIONS ====================
    { name: 'VIEW_NHIS_CLAIMS', displayName: 'View NHIS Claims', description: 'View NHIS insurance claims', module: 'BILLING' },
    { name: 'CREATE_NHIS_CLAIM', displayName: 'Create NHIS Claim', description: 'Create NHIS insurance claims', module: 'BILLING' },
    { name: 'SUBMIT_NHIS_CLAIM', displayName: 'Submit NHIS Claim', description: 'Submit NHIS claims for processing', module: 'BILLING' },
    { name: 'MANAGE_NHIS_CLAIMS', displayName: 'Manage NHIS Claims', description: 'Approve, reject, reconcile NHIS claims', module: 'BILLING' },

    // ==================== STOCK TRANSFER PERMISSIONS ====================
    { name: 'TRANSFER_STOCK', displayName: 'Transfer Stock', description: 'Create inter-branch stock transfers', module: 'PHARMACY' },
    { name: 'APPROVE_TRANSFER', displayName: 'Approve Transfer', description: 'Approve stock transfer requests', module: 'PHARMACY' },
    { name: 'RECEIVE_TRANSFER', displayName: 'Receive Transfer', description: 'Receive stock transfers at destination', module: 'PHARMACY' },
  ];

  console.log('Seeding module permissions...');

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, displayName: perm.displayName, module: perm.module },
      create: perm,
    });
  }

  console.log(`Seeded ${permissions.length} permissions`);

  // Assign permissions to roles
  await assignPermissionsToRoles();
}

async function assignPermissionsToRoles() {
  // Define role-permission mappings
  const rolePermissions: Record<string, string[]> = {
    'HOSPITAL_ADMIN': [
      // All pharmacy permissions
      'VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION', 'VIEW_STOCK', 'ADJUST_STOCK',
      'RECEIVE_STOCK', 'WRITE_OFF_STOCK', 'VIEW_PHARMACY_REPORTS', 'MANAGE_SUPPLIERS',
      'VIEW_PURCHASE_ORDERS', 'CREATE_PURCHASE_ORDER', 'APPROVE_PURCHASE_ORDER', 'RECEIVE_PURCHASE_ORDER',
      'TRANSFER_STOCK', 'APPROVE_TRANSFER', 'RECEIVE_TRANSFER',
      // All lab permissions
      'VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS', 'VERIFY_LAB_RESULTS', 'COLLECT_SAMPLE',
      'RECEIVE_SAMPLE', 'REJECT_SAMPLE', 'VIEW_CRITICAL_VALUES', 'ACKNOWLEDGE_CRITICAL_VALUE', 'VIEW_LAB_REPORTS',
      // All billing permissions
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'CANCEL_INVOICE', 'APPLY_DISCOUNT',
      'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'PROCESS_REFUND', 'VIEW_BILLING_REPORTS', 'VIEW_FINANCIAL_REPORTS',
      'VIEW_NHIS_CLAIMS', 'CREATE_NHIS_CLAIM', 'SUBMIT_NHIS_CLAIM', 'MANAGE_NHIS_CLAIMS',
    ],
    'DOCTOR': [
      'VIEW_PRESCRIPTION_QUEUE', 'VIEW_STOCK', 'VIEW_LAB_RESULTS', 'VIEW_CRITICAL_VALUES',
      'ACKNOWLEDGE_CRITICAL_VALUE', 'VIEW_INVOICES',
    ],
    'NURSE': [
      'VIEW_PRESCRIPTION_QUEUE', 'VIEW_STOCK', 'COLLECT_SAMPLE', 'VIEW_LAB_RESULTS',
      'VIEW_CRITICAL_VALUES', 'VIEW_INVOICES',
    ],
    'PHARMACIST': [
      'VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION', 'VIEW_STOCK', 'ADJUST_STOCK',
      'RECEIVE_STOCK', 'WRITE_OFF_STOCK', 'VIEW_PHARMACY_REPORTS', 'MANAGE_SUPPLIERS',
      'VIEW_PURCHASE_ORDERS', 'CREATE_PURCHASE_ORDER', 'RECEIVE_PURCHASE_ORDER',
      'TRANSFER_STOCK', 'RECEIVE_TRANSFER',
    ],
    'LAB_TECHNICIAN': [
      'VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS', 'COLLECT_SAMPLE', 'RECEIVE_SAMPLE',
      'REJECT_SAMPLE', 'VIEW_CRITICAL_VALUES', 'VIEW_LAB_REPORTS',
    ],
    'LAB_SCIENTIST': [
      'VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS', 'VERIFY_LAB_RESULTS', 'COLLECT_SAMPLE',
      'RECEIVE_SAMPLE', 'REJECT_SAMPLE', 'VIEW_CRITICAL_VALUES', 'ACKNOWLEDGE_CRITICAL_VALUE', 'VIEW_LAB_REPORTS',
    ],
    'BILLING_OFFICER': [
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'APPLY_DISCOUNT',
      'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'VIEW_BILLING_REPORTS',
      'VIEW_NHIS_CLAIMS', 'CREATE_NHIS_CLAIM', 'SUBMIT_NHIS_CLAIM',
    ],
    'CASHIER': [
      'VIEW_INVOICES', 'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'VIEW_BILLING_REPORTS',
    ],
    'ACCOUNTANT': [
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'CANCEL_INVOICE', 'APPLY_DISCOUNT',
      'VIEW_PAYMENTS', 'RECEIVE_PAYMENT', 'PROCESS_REFUND', 'VIEW_BILLING_REPORTS', 'VIEW_FINANCIAL_REPORTS',
      'VIEW_NHIS_CLAIMS', 'CREATE_NHIS_CLAIM', 'SUBMIT_NHIS_CLAIM', 'MANAGE_NHIS_CLAIMS',
    ],
    'RECEPTIONIST': [
      'VIEW_INVOICES', 'CREATE_INVOICE', 'VIEW_PAYMENTS', 'RECEIVE_PAYMENT',
    ],
  };

  console.log('Assigning permissions to roles...');

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    // Find the role
    const role = await prisma.role.findFirst({
      where: { name: roleName },
    });

    if (!role) {
      console.log(`Role ${roleName} not found, skipping...`);
      continue;
    }

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    // Create role-permission associations
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(`Assigned ${permissions.length} permissions to ${roleName}`);
  }
}

// Export for use in main seed file
export default seedModulePermissions;
