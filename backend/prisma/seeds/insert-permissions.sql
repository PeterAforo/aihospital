-- Insert Pharmacy Permissions
INSERT INTO permissions (id, name, "displayName", description, module, "isSystemPermission", "createdAt")
VALUES 
  (gen_random_uuid(), 'VIEW_PRESCRIPTION_QUEUE', 'View Prescription Queue', 'View prescription dispensing queue', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'DISPENSE_MEDICATION', 'Dispense Medication', 'Dispense medications to patients', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'VIEW_STOCK', 'View Stock', 'View pharmacy stock levels', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'ADJUST_STOCK', 'Adjust Stock', 'Adjust stock quantities', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'RECEIVE_STOCK', 'Receive Stock', 'Receive stock into inventory', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'WRITE_OFF_STOCK', 'Write Off Stock', 'Write off expired or damaged stock', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'VIEW_PHARMACY_REPORTS', 'View Pharmacy Reports', 'View pharmacy reports and analytics', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'MANAGE_SUPPLIERS', 'Manage Suppliers', 'Manage supplier information', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'VIEW_PURCHASE_ORDERS', 'View Purchase Orders', 'View purchase orders', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'CREATE_PURCHASE_ORDER', 'Create Purchase Order', 'Create new purchase orders', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'APPROVE_PURCHASE_ORDER', 'Approve Purchase Order', 'Approve purchase orders', 'PHARMACY', true, NOW()),
  (gen_random_uuid(), 'RECEIVE_PURCHASE_ORDER', 'Receive Purchase Order', 'Receive goods from purchase orders', 'PHARMACY', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert Laboratory Permissions
INSERT INTO permissions (id, name, "displayName", description, module, "isSystemPermission", "createdAt")
VALUES 
  (gen_random_uuid(), 'VIEW_LAB_RESULTS', 'View Lab Results', 'View laboratory results', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'ENTER_LAB_RESULTS', 'Enter Lab Results', 'Enter laboratory test results', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'VERIFY_LAB_RESULTS', 'Verify Lab Results', 'Verify and approve lab results', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'COLLECT_SAMPLE', 'Collect Sample', 'Collect patient samples', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'RECEIVE_SAMPLE', 'Receive Sample', 'Receive samples in the lab', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'REJECT_SAMPLE', 'Reject Sample', 'Reject inadequate samples', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'VIEW_CRITICAL_VALUES', 'View Critical Values', 'View critical value alerts', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'ACKNOWLEDGE_CRITICAL_VALUE', 'Acknowledge Critical Value', 'Acknowledge critical value alerts', 'LABORATORY', true, NOW()),
  (gen_random_uuid(), 'VIEW_LAB_REPORTS', 'View Lab Reports', 'View laboratory reports and analytics', 'LABORATORY', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert Billing Permissions
INSERT INTO permissions (id, name, "displayName", description, module, "isSystemPermission", "createdAt")
VALUES 
  (gen_random_uuid(), 'VIEW_INVOICES', 'View Invoices', 'View patient invoices', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'CREATE_INVOICE', 'Create Invoice', 'Create new invoices', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'EDIT_INVOICE', 'Edit Invoice', 'Edit existing invoices', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'CANCEL_INVOICE', 'Cancel Invoice', 'Cancel invoices', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'APPLY_DISCOUNT', 'Apply Discount', 'Apply discounts to invoices', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'VIEW_PAYMENTS', 'View Payments', 'View payment records', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'RECEIVE_PAYMENT', 'Receive Payment', 'Receive payments from patients', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'PROCESS_REFUND', 'Process Refund', 'Process payment refunds', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'VIEW_BILLING_REPORTS', 'View Billing Reports', 'View billing reports', 'BILLING', true, NOW()),
  (gen_random_uuid(), 'VIEW_FINANCIAL_REPORTS', 'View Financial Reports', 'View financial reports and aging', 'BILLING', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Assign all new permissions to HOSPITAL_ADMIN role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'HOSPITAL_ADMIN'
AND p.module IN ('PHARMACY', 'LABORATORY', 'BILLING')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Assign pharmacy permissions to PHARMACIST role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'PHARMACIST'
AND p.module = 'PHARMACY'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Assign lab permissions to LAB_TECHNICIAN role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'LAB_TECHNICIAN'
AND p.module = 'LABORATORY'
AND p.name NOT IN ('VERIFY_LAB_RESULTS', 'ACKNOWLEDGE_CRITICAL_VALUE')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Assign billing permissions to RECEPTIONIST role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'RECEPTIONIST'
AND p.name IN ('VIEW_INVOICES', 'CREATE_INVOICE', 'VIEW_PAYMENTS', 'RECEIVE_PAYMENT')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Assign view permissions to DOCTOR role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'DOCTOR'
AND p.name IN ('VIEW_PRESCRIPTION_QUEUE', 'VIEW_STOCK', 'VIEW_LAB_RESULTS', 'VIEW_CRITICAL_VALUES', 'ACKNOWLEDGE_CRITICAL_VALUE', 'VIEW_INVOICES')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Assign view permissions to NURSE role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'NURSE'
AND p.name IN ('VIEW_PRESCRIPTION_QUEUE', 'VIEW_STOCK', 'COLLECT_SAMPLE', 'VIEW_LAB_RESULTS', 'VIEW_CRITICAL_VALUES', 'VIEW_INVOICES')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
