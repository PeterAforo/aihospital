# Multi-Branch Data Ownership & Activity Tracking Model

## 🎯 CORE PRINCIPLE

**Activities are ALWAYS tracked at Organization → Branch → Department level**
**But PATIENT OWNERSHIP depends on the organization's data sharing model**

---

## 📊 TWO OWNERSHIP MODELS

### **Model A: Shared EMR (RECOMMENDED for Hospital Groups)**

```
PATIENT BELONGS TO: Organization (not a specific branch)
ACTIVITIES BELONG TO: Specific branch where they occurred

Example:
┌─────────────────────────────────────────────────────────┐
│ Patient: Kwame Mensah                                   │
│ ├─ Patient Record:                                      │
│ │   ├─ organization_id: Korle Bu Teaching Hospital     │
│ │   ├─ registered_at_branch_id: Tema Clinic (first)    │
│ │   └─ Status: Active in ENTIRE organization           │
│ │                                                       │
│ └─ Activities/Encounters (branch-specific):             │
│     ├─ Jan 15: TEMA CLINIC                              │
│     │   └─ Registration (Receptionist A @ Tema)         │
│     │   └─ Triage (Nurse B @ Tema)                      │
│     │   └─ Consultation (Dr. Ama @ Tema)                │
│     │   └─ Prescription (Dr. Ama @ Tema)                │
│     │   └─ Pharmacy (Pharmacist C @ Tema)               │
│     │                                                   │
│     ├─ Feb 10: KUMASI CLINIC                            │
│     │   └─ Check-in (Receptionist D @ Kumasi)           │
│     │   └─ Follow-up (Dr. Kofi @ Kumasi)                │
│     │   └─ Lab Test (Lab Tech @ Kumasi)                 │
│     │                                                   │
│     └─ Mar 5: MAIN HOSPITAL                             │
│         └─ Emergency (Dr. Yaw @ Main Hospital)          │
│         └─ Admission (Ward Nurse @ Main Hospital)       │
└─────────────────────────────────────────────────────────┘

KEY POINTS:
✓ Patient exists ONCE in the organization
✓ Can visit ANY branch
✓ Full medical history visible at all branches
✓ Each activity/encounter tagged with branch where it happened
✓ Billing can be per-branch or centralized
```

### **Model B: Isolated EMR (for Franchises)**

```
PATIENT BELONGS TO: Specific branch (separate records per branch)
ACTIVITIES BELONG TO: That branch only

Example:
┌─────────────────────────────────────────────────────────┐
│ Patient: Kwame Mensah @ Tema Clinic                     │
│ ├─ Patient Record (Tema):                               │
│ │   ├─ organization_id: MediCare Ghana                  │
│ │   ├─ branch_id: Tema Clinic (LOCKED)                  │
│ │   └─ Status: Active at Tema Clinic ONLY               │
│ │                                                       │
│ └─ Activities (Tema only):                              │
│     └─ All activities at Tema Clinic                    │
│                                                         │
│ Patient: Kwame Mensah @ Kumasi Clinic (DIFFERENT!)      │
│ ├─ Patient Record (Kumasi):                             │
│ │   ├─ organization_id: MediCare Ghana                  │
│ │   ├─ branch_id: Kumasi Clinic (LOCKED)                │
│ │   └─ Status: Active at Kumasi ONLY                    │
│ │                                                       │
│ └─ Activities (Kumasi only):                            │
│     └─ All activities at Kumasi Clinic                  │
└─────────────────────────────────────────────────────────┘

KEY POINTS:
✓ Patient has SEPARATE record at each branch
✓ Cannot access records from other branches
✓ Used when branches are independently owned
✓ Patient must re-register at each branch
```

---

## 🏥 DETAILED EXAMPLES

### **Example 1: Receptionist Registers Patient**

**Scenario:** Receptionist at Tema Clinic registers new patient Kwame Mensah

```javascript
// Receptionist logs in
User: Receptionist Ama
├─ organization_id: Korle Bu Teaching Hospital
├─ primary_branch_id: Tema Clinic
├─ current_branch_id: Tema Clinic
├─ branch_access_scope: "primary_only"
└─ role: RECEPTIONIST

// Action: Register Patient
POST /api/patients
{
  firstName: "Kwame",
  lastName: "Mensah",
  dateOfBirth: "1985-05-15",
  phone: "0244123456",
  nhisNumber: "GHA-123456789"
}

// System creates patient record:
INSERT INTO patients (
  id,
  organization_id,              // Korle Bu (from user.organization_id)
  registered_at_branch_id,      // Tema Clinic (from user.current_branch_id)
  first_name,
  last_name,
  ...
) VALUES (
  'patient-uuid-123',
  'korle-bu-org-id',           // Organization level
  'tema-clinic-branch-id',     // Branch where registered
  'Kwame',
  'Mensah',
  ...
);

// Audit log records:
INSERT INTO audit_logs (
  user_id: 'receptionist-ama-id',
  organization_id: 'korle-bu-org-id',
  branch_id: 'tema-clinic-branch-id',    // Activity happened at Tema
  department_id: 'reception-dept-id',     // Department level
  action: 'REGISTER_PATIENT',
  resource_type: 'patient',
  resource_id: 'patient-uuid-123',
  metadata: {
    patient_name: 'Kwame Mensah',
    registered_by: 'Receptionist Ama'
  },
  ip_address: '192.168.1.100',
  created_at: NOW()
);
```

**Result:**
✅ Patient created in **Korle Bu organization**  
✅ Tagged as registered at **Tema Clinic**  
✅ Activity logged under: Organization → Tema Branch → Reception Department  
✅ Patient can now visit ANY branch in Korle Bu (if shared_emr = TRUE)  

---

### **Example 2: Patient Visits Different Branch**

**Scenario:** Kwame (registered at Tema) visits Kumasi Clinic

```javascript
// Receptionist at Kumasi checks in patient
User: Receptionist Kofi @ Kumasi Clinic

// Search for patient
GET /api/patients/search?phone=0244123456

// Query executed:
SELECT * FROM patients 
WHERE organization_id = 'korle-bu-org-id'  // Same organization
  AND phone = '0244123456'
  -- NO branch filter because shared_emr = TRUE

// Result: Found! (Patient exists in organization)
{
  id: 'patient-uuid-123',
  name: 'Kwame Mensah',
  registered_at_branch_id: 'tema-clinic-branch-id',  // Originally from Tema
  encounters: [
    {
      date: '2024-01-15',
      branch_name: 'Tema Clinic',           // Previous visit at Tema
      diagnosis: 'Malaria'
    }
  ]
}

// Create appointment at Kumasi
POST /api/appointments
{
  patient_id: 'patient-uuid-123',
  doctor_id: 'dr-kofi-id',
  appointment_date: '2024-02-10'
}

// System creates appointment:
INSERT INTO appointments (
  patient_id: 'patient-uuid-123',          // Same patient
  organization_id: 'korle-bu-org-id',      // Same organization
  branch_id: 'kumasi-clinic-branch-id',    // NEW branch (Kumasi)
  doctor_id: 'dr-kofi-id',
  ...
);

// Audit log:
{
  user_id: 'receptionist-kofi-id',
  organization_id: 'korle-bu-org-id',
  branch_id: 'kumasi-clinic-branch-id',    // Activity at Kumasi
  action: 'CREATE_APPOINTMENT',
  resource_id: 'appointment-uuid',
  metadata: {
    patient_name: 'Kwame Mensah',
    original_branch: 'Tema Clinic',         // Patient came from Tema
    current_branch: 'Kumasi Clinic'         // Now at Kumasi
  }
}
```

**Result:**
✅ Patient found (because shared_emr = TRUE)  
✅ Patient's history from Tema visible at Kumasi  
✅ Appointment created at **Kumasi branch**  
✅ Activity logged under: Organization → Kumasi Branch  
✅ Patient now has activities at BOTH Tema and Kumasi  

---

### **Example 3: Doctor Creates Encounter**

**Scenario:** Dr. Kofi (at Kumasi) sees Kwame and creates clinical encounter

```javascript
// Doctor creates encounter
POST /api/encounters
{
  patient_id: 'patient-uuid-123',
  appointment_id: 'appointment-uuid',
  chief_complaint: 'Follow-up for malaria',
  ...
}

// System creates encounter:
INSERT INTO clinical_encounters (
  patient_id: 'patient-uuid-123',
  organization_id: 'korle-bu-org-id',
  branch_id: 'kumasi-clinic-branch-id',    // Encounter at Kumasi
  department_id: 'general-medicine-dept',   // Department at Kumasi
  doctor_id: 'dr-kofi-id',
  appointment_id: 'appointment-uuid',
  vital_signs_id: 'vitals-from-triage',
  chief_complaint: 'Follow-up for malaria',
  ...
);

// Doctor prescribes medication
INSERT INTO prescriptions (
  patient_id: 'patient-uuid-123',
  encounter_id: 'encounter-uuid',
  organization_id: 'korle-bu-org-id',
  branch_id: 'kumasi-clinic-branch-id',     // Prescription from Kumasi
  prescribed_by: 'dr-kofi-id',
  items: [...]
);

// Audit logs:
[
  {
    action: 'CREATE_ENCOUNTER',
    branch_id: 'kumasi-clinic-branch-id',
    department_id: 'general-medicine-dept'
  },
  {
    action: 'PRESCRIBE',
    branch_id: 'kumasi-clinic-branch-id',
    department_id: 'general-medicine-dept'
  }
]
```

**Result:**
✅ Encounter created at **Kumasi branch**  
✅ Prescription issued from **Kumasi branch**  
✅ All activities logged under: Organization → Kumasi Branch → General Medicine Dept  
✅ Patient's history now shows visits at BOTH branches  

---

### **Example 4: Pharmacy Dispenses Medication**

**Scenario:** Pharmacist at Kumasi dispenses medication

```javascript
// Pharmacist views prescription queue
GET /api/prescriptions/pharmacy/queue

// Query:
SELECT prescriptions.*, patients.first_name, patients.last_name
FROM prescriptions
JOIN patients ON prescriptions.patient_id = patients.id
WHERE prescriptions.organization_id = 'korle-bu-org-id'
  AND prescriptions.branch_id = 'kumasi-clinic-branch-id'  // Only Kumasi prescriptions
  AND prescriptions.status = 'SENT_TO_PHARMACY'

// Pharmacist dispenses
POST /api/prescriptions/:id/dispense
{
  items: [
    { itemId: '...', quantityDispensed: 21 }
  ]
}

// System updates inventory:
UPDATE drug_inventory
SET quantity = quantity - 21
WHERE branch_id = 'kumasi-clinic-branch-id'  // Deduct from Kumasi stock
  AND drug_id = 'amoxicillin-500mg'

// Audit log:
{
  action: 'DISPENSE_MEDICATION',
  user_id: 'pharmacist-id',
  branch_id: 'kumasi-clinic-branch-id',      // Activity at Kumasi
  department_id: 'pharmacy-dept',             // Pharmacy dept
  resource_type: 'prescription',
  metadata: {
    drug: 'Amoxicillin 500mg',
    quantity: 21,
    stock_remaining: 179
  }
}
```

**Result:**
✅ Medication dispensed from **Kumasi pharmacy**  
✅ Inventory deducted from **Kumasi stock** (not Tema stock)  
✅ Activity logged under: Organization → Kumasi Branch → Pharmacy Dept  

---

## 📊 DATA VISUALIZATION

### **Patient Timeline (Multi-Branch Activities)**

```
Patient: Kwame Mensah (MRN: KBU-2024-001234)
Organization: Korle Bu Teaching Hospital
Registered at: Tema Clinic (Jan 15, 2024)

┌─────────────────────────────────────────────────────────┐
│                   ACTIVITY TIMELINE                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Jan 15, 2024 | 📍 TEMA CLINIC                          │
│ ├─ 08:30 AM | Registration (Receptionist Ama)          │
│ ├─ 08:45 AM | Triage (Nurse Esi) - BP: 120/80          │
│ ├─ 09:15 AM | Consultation (Dr. Ama)                   │
│ │             Diagnosis: B50.9 (Malaria)                │
│ ├─ 09:30 AM | Prescription (Dr. Ama)                   │
│ │             - Artemether-Lumefantrine 24 tablets      │
│ └─ 09:45 AM | Pharmacy Dispensed (Pharmacist C)        │
│                                                         │
│ Feb 10, 2024 | 📍 KUMASI CLINIC                        │
│ ├─ 10:00 AM | Check-in (Receptionist Kofi)             │
│ ├─ 10:15 AM | Follow-up (Dr. Kofi)                     │
│ │             Status: Recovered from malaria            │
│ └─ 10:30 AM | Lab Test Ordered (Dr. Kofi)              │
│               - CBC ordered                             │
│                                                         │
│ Mar 5, 2024 | 📍 MAIN HOSPITAL - EMERGENCY              │
│ ├─ 02:30 PM | Emergency Arrival (Ambulance)            │
│ ├─ 02:35 PM | Triage (Nurse Critical) - BP: 180/110    │
│ ├─ 02:40 PM | Emergency Consult (Dr. Yaw)              │
│ │             Diagnosis: I16.9 (Hypertensive crisis)    │
│ ├─ 02:50 PM | Admission (Ward Nurse)                   │
│ └─ 03:00 PM | ICU Transfer                             │
└─────────────────────────────────────────────────────────┘

Summary:
✓ 3 branches visited (Tema, Kumasi, Main Hospital)
✓ 3 doctors seen (Dr. Ama, Dr. Kofi, Dr. Yaw)
✓ 7 staff interactions across organization
✓ Full history visible at any branch
```

---

## 🏢 BRANCH-LEVEL REPORTING

### **Report 1: Branch Activity Summary**

```sql
-- Tema Clinic Monthly Report (February 2024)

SELECT 
  COUNT(DISTINCT patients.id) as total_patients,
  COUNT(DISTINCT CASE WHEN patients.registered_at_branch_id = 'tema-clinic' 
        THEN patients.id END) as new_registrations,
  COUNT(DISTINCT appointments.id) as total_appointments,
  COUNT(DISTINCT clinical_encounters.id) as total_encounters,
  COUNT(DISTINCT prescriptions.id) as total_prescriptions
FROM patients
LEFT JOIN appointments ON patients.id = appointments.patient_id
LEFT JOIN clinical_encounters ON patients.id = clinical_encounters.patient_id
LEFT JOIN prescriptions ON patients.id = prescriptions.patient_id
WHERE appointments.branch_id = 'tema-clinic-branch-id'
  AND appointments.appointment_date BETWEEN '2024-02-01' AND '2024-02-29';

Result:
┌─────────────────────────────────────────┐
│ TEMA CLINIC - FEBRUARY 2024             │
├─────────────────────────────────────────┤
│ Total Patients Served:        450       │
│ New Registrations:             85       │ ← Patients registered at Tema
│ Walk-ins from Other Branches: 120       │ ← Existing patients from other branches
│ Total Appointments:           550       │
│ Total Encounters:             520       │
│ Total Prescriptions:          495       │
└─────────────────────────────────────────┘

Key Insight:
✓ 85 patients registered at Tema
✓ 120 patients visited from other branches (Kumasi, Main, Tamale)
✓ All 205 patients had activities at Tema this month
```

### **Report 2: Organization-Wide Summary**

```sql
-- Korle Bu Teaching Hospital - All Branches (February 2024)

SELECT 
  branches.name,
  COUNT(DISTINCT appointments.id) as appointments,
  COUNT(DISTINCT clinical_encounters.id) as encounters,
  SUM(invoices.total_amount) as revenue
FROM branches
LEFT JOIN appointments ON branches.id = appointments.branch_id
LEFT JOIN clinical_encounters ON branches.id = clinical_encounters.branch_id
LEFT JOIN invoices ON branches.id = invoices.branch_id
WHERE branches.organization_id = 'korle-bu-org-id'
  AND appointments.appointment_date BETWEEN '2024-02-01' AND '2024-02-29'
GROUP BY branches.name;

Result:
┌─────────────────────────────────────────────────────┐
│ KORLE BU TEACHING HOSPITAL - FEBRUARY 2024          │
├─────────────────────────────────────────────────────┤
│ Branch          │ Appointments │ Encounters │ Revenue│
│─────────────────┼──────────────┼────────────┼────────│
│ Main Hospital   │    2,500     │   2,350    │ ₵45,000│
│ Tema Clinic     │      550     │     520    │ ₵12,000│
│ Kumasi Clinic   │      420     │     400    │  ₵9,500│
│ Tamale Clinic   │      180     │     170    │  ₵4,200│
│─────────────────┼──────────────┼────────────┼────────│
│ TOTAL           │    3,650     │   3,440    │ ₵70,700│
└─────────────────────────────────────────────────────┘
```

---

## 🔍 AUDIT TRAIL QUERIES

### **Query 1: All Activities by User**

```sql
-- What did Dr. Ama do today?

SELECT 
  audit_logs.action,
  audit_logs.created_at,
  branches.name as branch_name,
  departments.name as department_name,
  audit_logs.resource_type,
  audit_logs.metadata
FROM audit_logs
JOIN branches ON audit_logs.branch_id = branches.id
LEFT JOIN departments ON audit_logs.department_id = departments.id
WHERE audit_logs.user_id = 'dr-ama-id'
  AND DATE(audit_logs.created_at) = CURRENT_DATE
ORDER BY audit_logs.created_at ASC;

Result:
┌──────────────────────────────────────────────────────────────┐
│ Dr. Ama's Activities - Today                                 │
├──────────────────────────────────────────────────────────────┤
│ 08:15 | LOGIN          | Tema Clinic | General Medicine     │
│ 08:30 | VIEW_PATIENT   | Tema Clinic | General Medicine     │
│ 08:45 | CREATE_ENCOUNTER| Tema Clinic | General Medicine    │
│ 09:00 | PRESCRIBE      | Tema Clinic | General Medicine     │
│ 10:30 | ORDER_LAB      | Tema Clinic | General Medicine     │
│ 11:00 | SIGN_ENCOUNTER | Tema Clinic | General Medicine     │
│ 14:00 | VIEW_PATIENT   | Kumasi Clinic| General Medicine    │ ← Different branch!
│ 14:15 | CREATE_ENCOUNTER| Kumasi Clinic| General Medicine   │
│ 17:30 | LOGOUT         | Kumasi Clinic| -                   │
└──────────────────────────────────────────────────────────────┘

Insight: Dr. Ama worked at both Tema and Kumasi today
```

### **Query 2: Patient Activity Across Branches**

```sql
-- Where has Kwame Mensah visited?

SELECT 
  branches.name,
  COUNT(DISTINCT appointments.id) as visits,
  MIN(appointments.appointment_date) as first_visit,
  MAX(appointments.appointment_date) as last_visit
FROM appointments
JOIN branches ON appointments.branch_id = branches.id
WHERE appointments.patient_id = 'patient-uuid-123'
GROUP BY branches.name
ORDER BY last_visit DESC;

Result:
┌─────────────────────────────────────────────────────┐
│ Kwame Mensah - Branch Visit History                 │
├─────────────────────────────────────────────────────┤
│ Branch        │ Visits │ First Visit │ Last Visit   │
│───────────────┼────────┼─────────────┼──────────────│
│ Main Hospital │   1    │ 2024-03-05  │ 2024-03-05   │
│ Kumasi Clinic │   1    │ 2024-02-10  │ 2024-02-10   │
│ Tema Clinic   │   3    │ 2024-01-15  │ 2024-01-20   │
└─────────────────────────────────────────────────────┘

Insight: Patient primarily uses Tema, but has visited all 3 branches
```

---

## 💡 KEY TAKEAWAYS

### **Yes, you're 100% correct:**

1. **User Activities Recorded Hierarchically:**
   ```
   Organization → Branch → Department → User → Action
   
   Example:
   Korle Bu → Tema Clinic → Pharmacy → Pharmacist C → DISPENSE_MEDICATION
   ```

2. **Patient Registration:**
   ```
   ✓ Patient is registered AT a specific branch (registered_at_branch_id)
   ✓ But patient BELONGS TO the organization (if shared_emr = TRUE)
   ✓ Patient can visit ANY branch in the organization
   ```

3. **Activity Attribution:**
   ```
   ✓ Every action is tagged with branch_id (where it happened)
   ✓ Every action is tagged with department_id (which dept)
   ✓ Every action is tagged with user_id (who did it)
   ✓ Every action is logged in audit_logs
   ```

4. **Branch Recognition:**
   ```
   ✓ When patient visits a branch, that branch "recognizes" their activities
   ✓ Encounters, prescriptions, lab tests all tagged with branch_id
   ✓ Each branch can report on "their" activities
   ✓ Organization can aggregate across all branches
   ```

---

## 🎯 PRACTICAL IMPLICATIONS

### **For Developers:**

```javascript
// ALWAYS include branch context in data creation
async function createAppointment(data, user) {
  return prisma.appointments.create({
    data: {
      ...data,
      organization_id: user.organization_id,    // Organization level
      branch_id: user.current_branch_id,        // Branch where created
      created_by: user.id,                      // Who created it
    }
  });
}

// ALWAYS filter by branch access in queries
async function getPatientEncounters(patientId, user) {
  const where = {
    patient_id: patientId,
    organization_id: user.organization_id,
  };
  
  // Apply branch filter based on user's access
  if (user.branch_access_scope === 'primary_only') {
    where.branch_id = user.primary_branch_id;
  } else if (user.branch_access_scope === 'specific_branches') {
    where.branch_id = { in: user.accessible_branches };
  }
  // If 'all_branches', no branch filter
  
  return prisma.clinical_encounters.findMany({ where });
}

// ALWAYS log with branch context
await auditLog.log({
  user_id: user.id,
  organization_id: user.organization_id,
  branch_id: user.current_branch_id,          // Critical!
  department_id: user.department_id,
  action: 'REGISTER_PATIENT',
  resource_type: 'patient',
  resource_id: patient.id
});
```

### **For Hospital Admins:**

✅ Can track performance by branch  
✅ Can see patient movement across branches  
✅ Can analyze which branches are busiest  
✅ Can ensure drugs are stocked at right branches  
✅ Can assign staff to branches strategically  

---

## ✨ SUMMARY

**Your understanding is PERFECT:**

```
User Activity Recording:
└─ Organization (Korle Bu Teaching Hospital)
   └─ Branch (Tema Clinic)
      └─ Department (Pharmacy)
         └─ User (Pharmacist C)
            └─ Action (Dispensed medication to Kwame)

Patient Becomes Branch's Patient:
✓ Patient registered at Tema → tagged as "registered_at_branch_id: Tema"
✓ But available to entire organization (if shared_emr = TRUE)
✓ When patient visits Kumasi, activities there are "recognized by Kumasi"

Branch Recognition:
✓ Every encounter at a branch is "owned" by that branch
✓ Every prescription from a branch is from that branch
✓ Every lab test ordered at a branch belongs to that branch
✓ Branch can report: "We had 450 patients this month"
```

**Think of it like this:**
- **Patient** = Citizen of a country (organization)
- **Branch** = City where activity happens
- **Activity** = Always tagged with which city it occurred in
- **Citizen** can travel to any city, but each activity is recorded in the city where it happened

This model supports:
✅ Multi-branch hospitals  
✅ Patient continuity across branches  
✅ Branch-level reporting and accountability  
✅ Organization-wide patient records  
✅ Granular audit trails  
