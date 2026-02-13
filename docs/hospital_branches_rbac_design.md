# Hospital Branches & Multi-Level RBAC Design

## 🏥 PROBLEM STATEMENT

**Scenario 1: Hospital Group with Branches**
```
Korle Bu Teaching Hospital (Parent)
├─ Main Hospital (Accra)
├─ Korle Bu Clinic - Tema Branch
├─ Korle Bu Clinic - Kumasi Branch
└─ Korle Bu Clinic - Tamale Branch

Questions:
1. Can a doctor at Tema branch see patients from Kumasi branch?
2. Can the CEO view reports from all branches?
3. Can a patient who visited Tema branch go to Kumasi branch and have their records available?
4. Does drug inventory at Tema affect stock at Kumasi?
5. Can the central lab process tests from all branches?
```

**Scenario 2: Single Hospital with Satellite Clinics**
```
St. Mary's Hospital (Main)
├─ St. Mary's Outpatient Clinic - East Legon
├─ St. Mary's Diagnostic Center - Osu
└─ St. Mary's Maternity Ward - Kaneshie

Questions:
1. Should all clinics share patient records?
2. Can doctors move between clinics and access data?
3. Should billing be centralized or per-clinic?
4. Can pharmacy inventory be transferred between clinics?
```

**Scenario 3: Franchise Model**
```
MediCare Ghana (Platform)
├─ MediCare Accra (Independent owner)
├─ MediCare Kumasi (Independent owner)
└─ MediCare Takoradi (Independent owner)

Requirements:
1. Complete data isolation (like separate tenants)
2. No cross-hospital access
3. Central branding but independent operations
```

---

## 🏗️ ARCHITECTURE MODELS

### **Model 1: Hierarchical Organization Structure** (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATION                         │
│              (Korle Bu Teaching Hospital)               │
│                 organization_id: org-1                  │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────┐
        ▼                 ▼                 ▼             ▼
    ┌────────┐        ┌────────┐       ┌────────┐   ┌────────┐
    │ BRANCH │        │ BRANCH │       │ BRANCH │   │ BRANCH │
    │  Main  │        │  Tema  │       │ Kumasi │   │ Tamale │
    │Hospital│        │ Clinic │       │ Clinic │   │ Clinic │
    └────────┘        └────────┘       └────────┘   └────────┘
    branch-1          branch-2         branch-3     branch-4
        │                 │                │            │
    ┌───┴───┐         ┌───┴───┐       ┌───┴───┐   ┌───┴───┐
    │ DEPT  │         │ DEPT  │       │ DEPT  │   │ DEPT  │
    │Emergency│       │General│       │General│   │General│
    │ OPD   │         │Medicine│      │Medicine│  │Medicine│
    │Surgery│         │       │       │       │   │       │
    └───────┘         └───────┘       └───────┘   └───────┘
```

**Key Concepts:**
- **Organization** = Hospital group/network (e.g., Korle Bu Teaching Hospital system)
- **Branch** = Physical location (e.g., Main Hospital, Tema Clinic)
- **Department** = Clinical/administrative unit within a branch (e.g., Emergency, OPD)

**Data Structure:**
```sql
organizations
├─ id
├─ name (Korle Bu Teaching Hospital)
├─ type (hospital_group, single_hospital, franchise)
└─ settings (shared_emr, shared_billing, etc.)

branches
├─ id
├─ organization_id (belongs to which organization)
├─ name (Main Hospital, Tema Clinic)
├─ branch_type (main, satellite_clinic, diagnostic_center)
├─ parent_branch_id (NULL for main, or ID of parent branch)
└─ settings (local overrides)

departments
├─ id
├─ branch_id (belongs to which branch)
├─ name (Emergency, OPD, Surgery)
└─ head_of_department

users
├─ id
├─ organization_id (which organization)
├─ primary_branch_id (home branch)
├─ accessible_branches (array of branch IDs or "*" for all)
├─ role_id
└─ department_id
```

---

## 📊 ENHANCED DATABASE SCHEMA

### **New/Updated Tables:**

```sql
-- 1. ORGANIZATIONS (Top-level entity)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'hospital_group', -- hospital_group, single_hospital, franchise
  
  -- Data sharing settings
  shared_emr BOOLEAN DEFAULT TRUE,           -- Share patient records across branches?
  shared_billing BOOLEAN DEFAULT TRUE,       -- Centralized billing?
  shared_inventory BOOLEAN DEFAULT FALSE,    -- Share drug inventory?
  shared_lab BOOLEAN DEFAULT TRUE,           -- Central lab for all branches?
  
  -- Subscription
  subscription_plan VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  max_users INTEGER,
  max_branches INTEGER,
  
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. BRANCHES (Physical locations)
CREATE TABLE branches (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(200) NOT NULL,               -- "Main Hospital", "Tema Clinic"
  code VARCHAR(50),                         -- "HQ", "TEMA", "KUMASI"
  branch_type VARCHAR(50),                  -- main, satellite_clinic, diagnostic_center, maternity_ward
  parent_branch_id UUID REFERENCES branches(id), -- For hierarchical branches
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  gps_coordinates JSONB,                    -- {lat, lng}
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(200),
  
  -- Operational
  is_active BOOLEAN DEFAULT TRUE,
  operating_hours JSONB,                    -- {monday: "8am-5pm", ...}
  has_emergency BOOLEAN DEFAULT FALSE,
  has_inpatient BOOLEAN DEFAULT FALSE,
  has_lab BOOLEAN DEFAULT TRUE,
  has_pharmacy BOOLEAN DEFAULT TRUE,
  
  -- Settings (branch-specific overrides)
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_organization ON branches(organization_id);

-- 3. UPDATED USERS TABLE
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN primary_branch_id UUID REFERENCES branches(id);
ALTER TABLE users ADD COLUMN accessible_branches UUID[];  -- Array of branch IDs
ALTER TABLE users ADD COLUMN branch_access_scope VARCHAR(50) DEFAULT 'primary_only';
-- branch_access_scope values:
--   'primary_only'    - Only primary branch
--   'all_branches'    - All branches in organization
--   'specific_branches' - Listed in accessible_branches array
--   'department_only' - Only their department in primary branch

-- 4. BRANCH-SCOPED PERMISSIONS (Optional - for fine-grained control)
CREATE TABLE branch_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  grant_type VARCHAR(20) DEFAULT 'grant',   -- grant, revoke
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, branch_id, permission_id)
);
-- Use case: User has PRESCRIBE permission at Branch A but not Branch B

-- 5. UPDATED DEPARTMENTS TABLE
ALTER TABLE departments ADD COLUMN branch_id UUID REFERENCES branches(id);
-- Now departments belong to a specific branch

-- 6. DATA TABLES GET BRANCH_ID
-- Add branch_id to all clinical/operational tables
ALTER TABLE patients ADD COLUMN registered_at_branch_id UUID REFERENCES branches(id);
ALTER TABLE appointments ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE clinical_encounters ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE prescriptions ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE lab_orders ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE radiology_orders ADD COLUMN branch_id UUID REFERENCES branches(id);

-- Note: tenant_id is replaced by organization_id for multi-branch scenarios
-- OR both exist: organization_id (top level) + branch_id (specific location)
```

---

## 🎭 USER ACCESS PATTERNS

### **Pattern 1: Single Branch User (Most Common)**
```
Dr. Kwame - General Practitioner
├─ organization_id: Korle Bu
├─ primary_branch_id: Tema Clinic
├─ accessible_branches: [Tema Clinic]
├─ branch_access_scope: "primary_only"
└─ Can Access: Only patients/data at Tema Clinic

SQL Query:
SELECT * FROM patients 
WHERE organization_id = 'korle-bu' 
  AND registered_at_branch_id = 'tema-clinic'
```

### **Pattern 2: Multi-Branch Doctor (Roving Specialist)**
```
Dr. Ama - Cardiologist
├─ organization_id: Korle Bu
├─ primary_branch_id: Main Hospital
├─ accessible_branches: [Main Hospital, Tema Clinic, Kumasi Clinic]
├─ branch_access_scope: "specific_branches"
└─ Can Access: Patients at Main, Tema, and Kumasi (but not Tamale)

Use Case: Specialist who rotates between branches
```

### **Pattern 3: Organization-Wide Access (Admin/Leadership)**
```
CEO / Medical Director
├─ organization_id: Korle Bu
├─ primary_branch_id: Main Hospital
├─ accessible_branches: "*" (all)
├─ branch_access_scope: "all_branches"
└─ Can Access: All patients/data across all branches

Use Case: Leadership, central lab, billing department
```

### **Pattern 4: Department-Only Access**
```
Nurse Jane - Emergency Department
├─ organization_id: Korle Bu
├─ primary_branch_id: Main Hospital
├─ department_id: Emergency Department
├─ branch_access_scope: "department_only"
└─ Can Access: Only Emergency patients at Main Hospital

Use Case: Department-specific staff
```

---

## 🔐 AUTHORIZATION LOGIC

### **Enhanced Permission Check Flow:**

```javascript
async function checkUserCanAccessResource(
  userId: string,
  resourceType: 'patient' | 'appointment' | 'prescription',
  resourceId: string,
  requiredPermission: string
) {
  // 1. Get user details
  const user = await getUser(userId);
  
  // 2. Check user has required permission (same as before)
  if (!user.permissions.includes(requiredPermission)) {
    throw new Error('Insufficient permissions');
  }
  
  // 3. Get resource with branch info
  const resource = await getResource(resourceType, resourceId);
  
  // 4. Check organization match
  if (resource.organization_id !== user.organization_id) {
    throw new Error('Cannot access resource from different organization');
  }
  
  // 5. Check branch access based on scope
  switch (user.branch_access_scope) {
    case 'primary_only':
      if (resource.branch_id !== user.primary_branch_id) {
        throw new Error('Cannot access resource from different branch');
      }
      break;
      
    case 'specific_branches':
      if (!user.accessible_branches.includes(resource.branch_id)) {
        throw new Error('No access to this branch');
      }
      break;
      
    case 'all_branches':
      // User can access all branches - no additional check needed
      break;
      
    case 'department_only':
      if (resource.branch_id !== user.primary_branch_id ||
          resource.department_id !== user.department_id) {
        throw new Error('Can only access resources in your department');
      }
      break;
  }
  
  // 6. Check branch-specific permission overrides (if table exists)
  const branchPermission = await getBranchPermission(
    user.id,
    resource.branch_id,
    requiredPermission
  );
  
  if (branchPermission?.grant_type === 'revoke') {
    throw new Error('Permission revoked for this branch');
  }
  
  return true; // Access granted
}
```

---

## 🎯 ROLE DEFINITIONS WITH BRANCH SCOPE

### **Updated Roles with Branch Context:**

```javascript
const ROLES_WITH_BRANCH_SCOPE = {
  // ORGANIZATION-LEVEL ROLES (Access all branches)
  ORGANIZATION_ADMIN: {
    displayName: "Organization Administrator",
    defaultBranchScope: "all_branches",
    permissions: ["MANAGE_ORGANIZATION", "VIEW_ALL_BRANCHES", "MANAGE_USERS", ...]
  },
  
  MEDICAL_DIRECTOR: {
    displayName: "Medical Director",
    defaultBranchScope: "all_branches",
    permissions: ["VIEW_ALL_PATIENTS", "VIEW_ALL_ENCOUNTERS", ...]
  },
  
  // BRANCH-LEVEL ROLES (Access single branch by default)
  BRANCH_MANAGER: {
    displayName: "Branch Manager",
    defaultBranchScope: "primary_only",
    permissions: ["MANAGE_BRANCH_USERS", "VIEW_BRANCH_REPORTS", ...]
  },
  
  DOCTOR: {
    displayName: "Doctor",
    defaultBranchScope: "primary_only", // Can be upgraded to multi-branch
    permissions: ["VIEW_PATIENT", "PRESCRIBE", "CREATE_ENCOUNTER", ...]
  },
  
  NURSE: {
    displayName: "Nurse",
    defaultBranchScope: "department_only", // Usually department-specific
    permissions: ["TRIAGE", "RECORD_VITALS", "ADMINISTER_MEDICATION", ...]
  },
  
  // DEPARTMENT-LEVEL ROLES
  LAB_TECHNICIAN: {
    displayName: "Lab Technician",
    defaultBranchScope: "all_branches", // Central lab serves all branches
    permissions: ["PROCESS_LAB_TEST", "UPLOAD_LAB_RESULT", ...]
  },
  
  PHARMACIST: {
    displayName: "Pharmacist",
    defaultBranchScope: "primary_only", // Branch-specific inventory
    permissions: ["DISPENSE_MEDICATION", "MANAGE_DRUG_INVENTORY", ...]
  },
  
  // SUPPORT STAFF
  RECEPTIONIST: {
    displayName: "Receptionist",
    defaultBranchScope: "primary_only",
    permissions: ["REGISTER_PATIENT", "CREATE_APPOINTMENT", ...]
  }
};
```

---

## 📋 PATIENT RECORD ACCESS ACROSS BRANCHES

### **Scenario: Patient visits different branches**

```javascript
// Patient first visits Tema Clinic
Patient: Kwame Mensah (ID: patient-123)
├─ registered_at_branch_id: Tema Clinic
├─ Encounters:
│   ├─ 2024-01-15: Tema Clinic - Malaria (Dr. Ama)
│   ├─ 2024-02-10: Kumasi Clinic - Follow-up (Dr. Kofi)
│   └─ 2024-03-05: Main Hospital - Emergency (Dr. Yaw)
└─ Medical History: Available at all branches (if shared_emr = TRUE)

// Access Logic:
if (organization.shared_emr === TRUE) {
  // Patient record accessible from any branch in organization
  query = `
    SELECT * FROM patients 
    WHERE id = 'patient-123' 
      AND organization_id = current_user.organization_id
  `;
  
  // But encounters are branch-tagged
  encounters = `
    SELECT * FROM clinical_encounters
    WHERE patient_id = 'patient-123'
      AND organization_id = current_user.organization_id
      AND (
        -- User's branch
        branch_id = current_user.primary_branch_id
        -- OR user has all-branch access
        OR current_user.branch_access_scope = 'all_branches'
        -- OR user has access to specific branch
        OR branch_id = ANY(current_user.accessible_branches)
      )
  `;
} else {
  // Each branch has separate patient records (franchise model)
  query = `
    SELECT * FROM patients 
    WHERE id = 'patient-123' 
      AND registered_at_branch_id = current_user.primary_branch_id
  `;
}
```

---

## 🏥 COMMON USE CASES & SOLUTIONS

### **Use Case 1: Doctor Works at Multiple Branches**

**Scenario:**
```
Dr. Sarah is a cardiologist who works:
- Monday, Wednesday, Friday: Main Hospital
- Tuesday, Thursday: Tema Clinic
```

**Solution:**
```sql
-- User setup
INSERT INTO users (
  id,
  organization_id,
  primary_branch_id,
  accessible_branches,
  branch_access_scope,
  role_id
) VALUES (
  'dr-sarah-123',
  'korle-bu-org',
  'main-hospital-branch',    -- Primary branch
  ARRAY['main-hospital-branch', 'tema-clinic-branch'], -- Can access both
  'specific_branches',
  'doctor-role-id'
);

-- When Dr. Sarah logs in at Tema Clinic:
-- 1. She selects "Current Branch: Tema Clinic" from dropdown
-- 2. System stores in session: current_branch_id = 'tema-clinic-branch'
-- 3. All appointments/encounters created are tagged with branch_id = 'tema-clinic-branch'
-- 4. She can still view patients from Main Hospital (because it's in accessible_branches)
```

**UI Implementation:**
```jsx
// Branch Selector in Header
<Select 
  value={currentBranch}
  onChange={setCurrentBranch}
  style={{ width: 200 }}
>
  {user.accessible_branches.map(branch => (
    <Select.Option key={branch.id} value={branch.id}>
      {branch.name}
    </Select.Option>
  ))}
</Select>

// When creating appointment:
POST /api/appointments
{
  patientId: "...",
  doctorId: "...",
  branchId: currentBranch.id,  // Explicitly set branch
  ...
}
```

---

### **Use Case 2: Central Lab Serving All Branches**

**Scenario:**
```
Main Hospital has a central laboratory that processes tests from all branches.
Lab technicians should see orders from all branches.
```

**Solution:**
```sql
-- Lab technician setup
INSERT INTO users (
  organization_id,
  primary_branch_id,
  branch_access_scope,
  role_id
) VALUES (
  'korle-bu-org',
  'main-hospital-branch',
  'all_branches',           -- Can see all branches
  'lab-technician-role'
);

-- Query for lab orders (lab technician view)
SELECT lab_orders.*, 
       branches.name as branch_name,
       patients.first_name,
       patients.last_name
FROM lab_orders
JOIN branches ON lab_orders.branch_id = branches.id
JOIN patients ON lab_orders.patient_id = patients.id
WHERE lab_orders.organization_id = 'korle-bu-org'
  AND lab_orders.status = 'PENDING'
ORDER BY 
  CASE lab_orders.urgency 
    WHEN 'stat' THEN 1 
    WHEN 'urgent' THEN 2 
    ELSE 3 
  END,
  lab_orders.ordered_at ASC;

-- Result:
-- Order #1: Malaria RDT | Tema Clinic | Urgent
-- Order #2: Lipid Panel | Kumasi Clinic | Routine
-- Order #3: CBC | Main Hospital | STAT
```

---

### **Use Case 3: Pharmacy Inventory Per Branch**

**Scenario:**
```
Each branch has its own pharmacy with separate inventory.
Drug stock at Tema Clinic doesn't affect Kumasi Clinic.
```

**Solution:**
```sql
-- Drug inventory table
CREATE TABLE drug_inventory (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  drug_id UUID REFERENCES drug_formulary(id),
  quantity INTEGER NOT NULL,
  expiry_date DATE,
  batch_number VARCHAR(100),
  reorder_level INTEGER,
  UNIQUE(branch_id, drug_id, batch_number)
);

-- When dispensing at Tema Clinic:
SELECT quantity 
FROM drug_inventory
WHERE branch_id = 'tema-clinic-branch'
  AND drug_id = 'paracetamol-500mg'
  AND expiry_date > CURRENT_DATE
ORDER BY expiry_date ASC
LIMIT 1;

-- If out of stock at Tema, show stock at nearby branches:
SELECT branches.name, drug_inventory.quantity
FROM drug_inventory
JOIN branches ON drug_inventory.branch_id = branches.id
WHERE drug_inventory.drug_id = 'paracetamol-500mg'
  AND drug_inventory.organization_id = 'korle-bu-org'
  AND drug_inventory.branch_id != 'tema-clinic-branch' -- Exclude current branch
  AND drug_inventory.quantity > 0
ORDER BY branches.name;

-- Result:
-- Main Hospital: 500 tablets
-- Kumasi Clinic: 200 tablets
```

---

### **Use Case 4: Branch Manager (Limited Admin)**

**Scenario:**
```
Each branch has a manager who can:
- Manage users at their branch only
- View reports for their branch only
- Cannot access other branches
```

**Solution:**
```sql
-- Branch manager setup
INSERT INTO users (
  organization_id,
  primary_branch_id,
  branch_access_scope,
  role_id
) VALUES (
  'korle-bu-org',
  'tema-clinic-branch',
  'primary_only',           -- Only Tema Clinic
  'branch-manager-role'
);

-- Permissions for BRANCH_MANAGER role:
const BRANCH_MANAGER_PERMISSIONS = [
  'VIEW_BRANCH_USERS',        // Can view users at their branch
  'MANAGE_BRANCH_USERS',      // Can create/edit users at their branch
  'VIEW_BRANCH_REPORTS',      // Financial/operational reports
  'MANAGE_BRANCH_SETTINGS',   // Branch-specific settings
  'VIEW_BRANCH_INVENTORY',    // Pharmacy/supplies at their branch
  // Cannot: MANAGE_ORGANIZATION, VIEW_ALL_BRANCHES, etc.
];

-- When branch manager tries to create user:
POST /api/users
{
  ...userDetails,
  branchId: "kumasi-clinic-branch"  // Different branch!
}

// Authorization check:
if (newUser.branchId !== currentUser.primary_branch_id) {
  throw new Error('You can only manage users at your branch');
}
```

---

### **Use Case 5: Emergency Patient Transfer**

**Scenario:**
```
Patient arrives at Tema Clinic with severe condition.
Needs transfer to Main Hospital (has ICU).
Tema doctor should be able to create encounter and transfer patient.
```

**Solution:**
```sql
-- 1. Initial encounter at Tema Clinic
INSERT INTO clinical_encounters (
  patient_id,
  branch_id,
  doctor_id,
  chief_complaint,
  disposition
) VALUES (
  'patient-123',
  'tema-clinic-branch',
  'dr-sarah-123',
  'Severe chest pain',
  'TRANSFERRED'
);

-- 2. Create transfer record
CREATE TABLE patient_transfers (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  from_branch_id UUID REFERENCES branches(id),
  to_branch_id UUID REFERENCES branches(id),
  transfer_reason TEXT,
  transferred_by UUID REFERENCES users(id),
  transferred_at TIMESTAMP,
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMP,
  status VARCHAR(50) -- pending, in_transit, received, cancelled
);

INSERT INTO patient_transfers (
  patient_id,
  from_branch_id,
  to_branch_id,
  transfer_reason,
  transferred_by,
  status
) VALUES (
  'patient-123',
  'tema-clinic-branch',
  'main-hospital-branch',
  'Requires ICU care',
  'dr-sarah-123',
  'in_transit'
);

-- 3. Main Hospital receives patient
-- Doctor at Main Hospital can now access patient records from Tema
-- because shared_emr = TRUE at organization level
```

---

## 🎨 FRONTEND COMPONENTS

### **Branch Selector Component**

```jsx
// BranchSelector.tsx
import { Select, Tag } from 'antd';

export const BranchSelector: React.FC = () => {
  const { user, currentBranch, setCurrentBranch } = useAuth();
  
  // Get branches user can access
  const accessibleBranches = user.accessible_branches === '*' 
    ? allBranches // User has all-branch access
    : branches.filter(b => user.accessible_branches.includes(b.id));
  
  return (
    <div className="branch-selector">
      <Tag color="blue">Current Branch:</Tag>
      <Select
        value={currentBranch.id}
        onChange={(branchId) => {
          const branch = branches.find(b => b.id === branchId);
          setCurrentBranch(branch);
        }}
        style={{ width: 200 }}
      >
        {accessibleBranches.map(branch => (
          <Select.Option key={branch.id} value={branch.id}>
            <Space>
              {branch.branch_type === 'main' && <HomeOutlined />}
              {branch.name}
            </Space>
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};
```

### **Patient Record with Branch History**

```jsx
// PatientEncounterHistory.tsx
export const PatientEncounterHistory: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { data: encounters } = useQuery(
    ['patient-encounters', patientId],
    () => fetchPatientEncounters(patientId)
  );
  
  return (
    <Timeline>
      {encounters.map(encounter => (
        <Timeline.Item key={encounter.id}>
          <Card size="small">
            <Space direction="vertical">
              <Text strong>{formatDate(encounter.encounterDate)}</Text>
              
              {/* Branch badge */}
              <Tag color="purple">
                <EnvironmentOutlined /> {encounter.branch.name}
              </Tag>
              
              <Text>Dr. {encounter.doctor.lastName}</Text>
              <Text type="secondary">{encounter.chiefComplaint}</Text>
              
              {/* Diagnoses */}
              <div>
                {encounter.diagnoses.map(d => (
                  <Tag key={d.id}>{d.icd10Code}</Tag>
                ))}
              </div>
            </Space>
          </Card>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};
```

---

## 📊 UPDATED JWT STRUCTURE

```javascript
// JWT Payload with Branch Context
{
  userId: "doctor-123",
  organizationId: "korle-bu-org",
  primaryBranchId: "main-hospital-branch",
  currentBranchId: "tema-clinic-branch",  // Current working branch
  accessibleBranches: ["main-hospital-branch", "tema-clinic-branch"],
  branchAccessScope: "specific_branches",
  role: "DOCTOR",
  roleId: "role-uuid",
  permissions: ["VIEW_PATIENT", "PRESCRIBE", ...],
  departmentId: "surgery-dept-uuid",
  iat: 1234567890,
  exp: 1234568790
}
```

---

## 🔄 MIGRATION STRATEGY

### **For Existing Single-Tenant System:**

```sql
-- Step 1: Create organizations table
-- (Already shown above)

-- Step 2: Create branches table
-- (Already shown above)

-- Step 3: Migrate existing tenants to organizations + branches
INSERT INTO organizations (id, name, slug, type, shared_emr)
SELECT 
  id,
  name,
  slug,
  'single_hospital',
  TRUE
FROM tenants;

-- Create a default "Main Branch" for each organization
INSERT INTO branches (id, organization_id, name, code, branch_type, is_active)
SELECT 
  gen_random_uuid(),
  id,
  name || ' - Main',
  'MAIN',
  'main',
  TRUE
FROM organizations;

-- Step 4: Update users to point to organization + branch
UPDATE users u
SET 
  organization_id = t.id,
  primary_branch_id = (
    SELECT b.id FROM branches b 
    WHERE b.organization_id = t.id 
    LIMIT 1
  ),
  branch_access_scope = 'primary_only'
FROM tenants t
WHERE u.tenant_id = t.id;

-- Step 5: Update all data tables
UPDATE patients p
SET 
  organization_id = u.tenant_id,
  registered_at_branch_id = u.primary_branch_id
FROM users u
WHERE p.created_by = u.id;

-- Repeat for appointments, encounters, prescriptions, etc.

-- Step 6: Drop old tenant_id columns (after verification)
-- ALTER TABLE users DROP COLUMN tenant_id;
```

---

## ✅ SUMMARY

**Branch Access Levels:**
1. **Primary Only** - Single branch access (most common)
2. **Specific Branches** - Explicit list of branches (roving doctors)
3. **All Branches** - Organization-wide access (admins, central lab)
4. **Department Only** - Limited to department within branch (nurses)

**Key Decisions:**
- `shared_emr = TRUE` → Patient records accessible across branches
- `shared_emr = FALSE` → Each branch has separate patient records (franchise model)
- `shared_billing = TRUE` → Centralized billing for all branches
- `shared_inventory = FALSE` → Each branch manages own pharmacy stock
- `shared_lab = TRUE` → Central lab processes tests from all branches

**Permission Checks:**
1. Does user have required permission? ✓
2. Is resource in user's organization? ✓
3. Does user have access to resource's branch? ✓
4. Any branch-specific permission overrides? ✓

This design supports:
✅ Hospital groups with multiple branches  
✅ Single hospitals with satellite clinics  
✅ Franchise models with complete isolation  
✅ Roving specialists across branches  
✅ Central services (lab, billing) for all branches  
✅ Branch-specific services (pharmacy, appointments)  
