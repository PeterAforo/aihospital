# System Audit Checklist - Usage Guide

## 🎯 Purpose

This comprehensive audit checklist ensures your **MediCare Ghana Hospital Management System** is:
- ✅ Bug-free
- ✅ All workflows functioning correctly
- ✅ RBAC/permissions properly enforced
- ✅ All UI components working
- ✅ All database tables complete
- ✅ Security best practices followed

---

## 📋 How to Use

### **Option 1: AI-Powered Audit (RECOMMENDED)**

1. **Copy the entire `system_audit_qa_checklist.json`**

2. **Open Windsurf/Cursor/Claude** and paste this prompt:

```
I need you to perform a COMPLETE system audit of my hospital management system.

Use the attached comprehensive checklist (system_audit_qa_checklist.json) to:

1. Check all 7 modules (User Management, Patient, Appointments, Triage, EMR, Prescriptions, Branches)
2. Verify all database tables exist with correct schema
3. Test all API endpoints (authentication, permissions, responses)
4. Validate RBAC - ensure roles have correct permissions
5. Test frontend components (all buttons, links, forms)
6. Verify complete workflows work end-to-end
7. Check data integrity constraints
8. Audit performance and security

For each check in the JSON:
- Execute the test/validation
- Report: ✅ PASS, ⚠️ WARNING, or ❌ FAIL
- Provide detailed findings for failures
- Suggest fixes for issues found

Generate a comprehensive audit report with:
- Executive summary (% passed)
- Critical failures (must fix)
- Warnings (should fix)
- Module health scores
- Prioritized action items

Begin the audit now.
```

3. **AI will systematically test every check** (~150 checks total)

4. **Review the generated report**

---

### **Option 2: Manual Testing**

Use the checklist as a guide and manually verify each check:

#### **Database Checks (Section 1)**

```bash
# Connect to your PostgreSQL database
psql -U postgres -d medicare_ghana

# Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# Expected tables (minimum 30):
# - organizations, branches, departments
# - users, roles, permissions, role_permissions, user_permissions
# - sessions, audit_logs, password_history
# - patients, patient_contacts, patient_allergies, etc.
# - appointments, appointment_slots, appointment_types, doctor_schedules
# - triage_records, vital_signs
# - clinical_encounters, encounter_diagnoses, problem_list, icd10_codes
# - prescriptions, prescription_items, drug_formulary, etc.

# Check if ICD-10 codes are seeded
SELECT COUNT(*) FROM icd10_codes WHERE is_common_ghana = TRUE;
# Expected: At least 50+ common Ghana diseases

# Check if drug formulary is seeded
SELECT COUNT(*) FROM drug_formulary WHERE is_active = TRUE;
# Expected: At least 50-100 essential drugs

# Check if roles are seeded
SELECT name FROM roles WHERE is_system_role = TRUE;
# Expected: SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, PHARMACIST, etc.
```

#### **API Checks (Section 2)**

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@hospital.com",
    "password": "TestPassword@123"
  }'

# Expected: 200 with { accessToken, refreshToken, user }

# Test protected endpoint without auth
curl http://localhost:3000/api/users

# Expected: 401 Unauthorized

# Test with auth token
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: 200 with user list (if user has VIEW_USERS permission)
```

#### **Frontend Checks (Section 4)**

Open browser and manually test:

1. **Login Page** (http://localhost:3000/login)
   - ✅ Email input exists
   - ✅ Password input exists
   - ✅ Login button works
   - ✅ Validation shows errors
   - ✅ Successful login redirects to dashboard

2. **Patient Registration** (http://localhost:3000/patients/register)
   - ✅ Form renders
   - ✅ All fields exist (name, DOB, gender, etc.)
   - ✅ Submit creates patient
   - ✅ MRN auto-generated

3. **Prescription Form**
   - ✅ Drug search autocomplete works
   - ✅ Allergy alerts show (RED, cannot override)
   - ✅ Drug interaction warnings show (ORANGE, can override)
   - ✅ Pediatric dosing calculations work
   - ✅ Total quantity auto-calculates

---

## 📊 Sample Audit Report

```
================================================================================
MEDICARE GHANA HOSPITAL SYSTEM - COMPREHENSIVE AUDIT REPORT
Generated: 2024-03-15 10:30 AM
Auditor: AI Assistant (Claude)
================================================================================

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Total Checks:        152
Passed (✅):        135 (88.8%)
Warnings (⚠️):       12 (7.9%)
Failed (❌):          5 (3.3%)

Overall Health:      GOOD (88.8%)
Critical Issues:     2 (MUST FIX IMMEDIATELY)
Non-Critical:        3 (Should fix soon)

================================================================================

CRITICAL FAILURES (MUST FIX)
--------------------------------------------------------------------------------

❌ [DB-012] ICD-10 Codes Not Seeded
Module:       M5 - EMR
Severity:     CRITICAL
Finding:      icd10_codes table has 0 rows
Impact:       Doctors cannot assign diagnoses to encounters
Fix:          Run seed script to populate Ghana common diseases
              ```sql
              INSERT INTO icd10_codes (code, description, is_common_ghana)
              VALUES 
                ('B50.9', 'Plasmodium falciparum malaria, unspecified', TRUE),
                ('I10', 'Essential (primary) hypertension', TRUE),
                ...
              ```
Priority:     P0 - Critical

❌ [RBAC-005] Permission Enforcement Not Working
Module:       M0 - RBAC
Severity:     CRITICAL
Finding:      NURSE role can create prescriptions (should be blocked)
Impact:       Security breach - unauthorized prescribing
Fix:          Check requirePermission('PRESCRIBE') middleware on 
              POST /api/prescriptions endpoint
              Ensure NURSE role does NOT have PRESCRIBE permission
Priority:     P0 - Critical

================================================================================

WARNINGS (SHOULD FIX)
--------------------------------------------------------------------------------

⚠️ [DB-016] Missing Indexes on Foreign Keys
Module:       Performance
Severity:     WARNING
Finding:      appointments.patient_id has no index
Impact:       Slow queries when searching appointments by patient
Fix:          CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
Priority:     P2 - Medium

⚠️ [UI-012] Branch Selector Not Visible
Module:       M7 - Branches
Severity:     WARNING
Finding:      Branch selector component not rendered in header
Impact:       Users with multi-branch access cannot switch branches
Fix:          Add <BranchSelector /> to Header component
Priority:     P1 - High

⚠️ [PERF-002] Slow API Response Time
Module:       Performance
Severity:     WARNING
Finding:      GET /api/appointments/schedule takes 3.5 seconds
Impact:       Poor user experience, timeout risk
Fix:          Add indexes, optimize query, implement caching
Priority:     P2 - Medium

[... 9 more warnings ...]

================================================================================

MODULE HEALTH SCORES
--------------------------------------------------------------------------------

✅ M0 - User Management & RBAC           92% (11/12 checks passed)
   Database:    ✅ All tables exist
   APIs:        ❌ Permission enforcement issue (RBAC-005)
   UI:          ✅ Login, user management work
   Security:    ✅ Password hashing, JWT working

✅ M2 - Patient Management               95% (19/20 checks passed)
   Database:    ✅ All tables exist
   APIs:        ✅ All endpoints working
   UI:          ⚠️ Search pagination slow
   Workflow:    ✅ Registration to profile works

✅ M3 - Appointment Scheduling           88% (15/17 checks passed)
   Database:    ✅ All tables exist
   APIs:        ✅ All endpoints working
   UI:          ✅ Scheduling interface works
   Performance: ⚠️ Schedule loading slow (PERF-002)

⚠️ M5 - EMR/Clinical Consultation        82% (14/17 checks passed)
   Database:    ❌ ICD-10 codes missing (DB-012)
   APIs:        ✅ Encounter APIs working
   UI:          ✅ SOAP interface works
   Workflow:    ⚠️ Problem list not persisting

✅ M6 - E-Prescribing                    90% (18/20 checks passed)
   Database:    ✅ All tables exist, formulary seeded
   APIs:        ✅ Prescription creation works
   UI:          ✅ Drug search, alerts working
   Safety:      ⚠️ Pediatric dosing calculation off by 10%

[... other modules ...]

================================================================================

DETAILED FINDINGS
--------------------------------------------------------------------------------

[DB-012] ICD-10 Codes Not Seeded
Location:     Backend Database
Check:        Verify Ghana National Formulary drugs seeded
Query:        SELECT COUNT(*) FROM icd10_codes WHERE is_common_ghana = TRUE
Result:       0 rows (Expected: 50+)
Root Cause:   Seed script not executed or failed
Evidence:     ```sql
              medicare_ghana=# SELECT COUNT(*) FROM icd10_codes;
              count 
              -------
                  0
              ```
Fix Steps:    1. Create seed file: backend/prisma/seeds/icd10-ghana.ts
              2. Add common Ghana diseases (Malaria, Hypertension, Diabetes, etc.)
              3. Run: npx prisma db seed
              4. Verify: SELECT COUNT(*) FROM icd10_codes;
Files:        - backend/prisma/seeds/icd10-ghana.ts (CREATE)
              - backend/prisma/schema.prisma (verify model)

[RBAC-005] Permission Enforcement Not Working
Location:     Backend API
Check:        Test permission enforcement - Nurse cannot prescribe
Test:         Login as NURSE → POST /api/prescriptions
Result:       201 Created (Expected: 403 Forbidden)
Root Cause:   requirePermission middleware not applied to route
Evidence:     File: backend/src/routes/prescriptions.routes.ts
              ```typescript
              // CURRENT (WRONG):
              router.post('/api/prescriptions', createPrescription);
              
              // SHOULD BE:
              router.post('/api/prescriptions', 
                requireAuth, 
                requirePermission('PRESCRIBE'), 
                createPrescription
              );
              ```
Fix Steps:    1. Add requirePermission('PRESCRIBE') to route
              2. Verify NURSE role doesn't have PRESCRIBE permission
              3. Test: Login as NURSE, try prescribing → should get 403
Files:        - backend/src/routes/prescriptions.routes.ts (FIX)

[... more detailed findings ...]

================================================================================

ACTION ITEMS (PRIORITIZED)
--------------------------------------------------------------------------------

PRIORITY 0 - CRITICAL (Fix Today):
1. ❌ [DB-012] Seed ICD-10 codes - Doctors cannot diagnose without this
2. ❌ [RBAC-005] Fix prescription permission enforcement - Security risk

PRIORITY 1 - HIGH (Fix This Week):
1. ⚠️ [UI-012] Add branch selector to header
2. ⚠️ [WF-007] Fix problem list persistence
3. ⚠️ [DI-004] Enforce single primary diagnosis constraint

PRIORITY 2 - MEDIUM (Fix This Sprint):
1. ⚠️ [DB-016] Add indexes on foreign keys (performance)
2. ⚠️ [PERF-002] Optimize appointment schedule loading
3. ⚠️ [UI-014] Fix pagination in patient search

PRIORITY 3 - LOW (Fix When Possible):
1. ⚠️ [DI-006] Validate appointment dates not in past
2. ⚠️ [UI-007] Add color coding to vital signs

================================================================================

RECOMMENDATIONS
--------------------------------------------------------------------------------

1. Database:
   ✓ Run all seed scripts (ICD-10, drug formulary, sample data)
   ✓ Add missing indexes for performance
   ✓ Enable foreign key constraints

2. Security:
   ✓ Review all API routes have proper permission checks
   ✓ Audit role-permission mappings
   ✓ Enable 2FA for admin accounts

3. Performance:
   ✓ Optimize slow queries (add indexes)
   ✓ Implement caching for frequent reads
   ✓ Add pagination to large lists

4. Testing:
   ✓ Write automated tests for critical workflows
   ✓ Set up CI/CD pipeline
   ✓ Regular security audits

5. Documentation:
   ✓ Document all API endpoints
   ✓ Create user manuals
   ✓ Training materials for staff

================================================================================

NEXT STEPS
--------------------------------------------------------------------------------

1. Fix P0 Critical Issues (Today)
   - Seed ICD-10 codes
   - Fix permission enforcement

2. Re-run Audit (Tomorrow)
   - Verify P0 fixes worked
   - Move to P1 issues

3. Sprint Planning (This Week)
   - Schedule P1 and P2 fixes
   - Assign to developers

4. Automated Testing (Next Sprint)
   - Convert this checklist to automated tests
   - Set up continuous monitoring

================================================================================

AUDIT COMPLETE
Generated by: AI Assistant
Timestamp: 2024-03-15 10:45 AM
Duration: 15 minutes
Next Audit: 2024-03-22 (Weekly)
================================================================================
```

---

## 🔧 Converting to Automated Tests

### **Jest (Backend Testing)**

```typescript
// tests/audit/database.test.ts
describe('Database Schema Audit', () => {
  it('[DB-001] should have all 11 RBAC tables', async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'organizations', 'branches', 'users', 'roles', 
        'permissions', 'role_permissions', 'user_permissions',
        'departments', 'sessions', 'audit_logs', 'password_history'
      )
    `;
    expect(tables).toHaveLength(11);
  });

  it('[DB-012] should have ICD-10 codes seeded', async () => {
    const count = await prisma.icd10_codes.count({
      where: { is_common_ghana: true }
    });
    expect(count).toBeGreaterThanOrEqual(50);
  });
});

describe('API Permission Enforcement', () => {
  it('[RBAC-005] should block NURSE from prescribing', async () => {
    const nurseToken = await loginAs('NURSE');
    
    const response = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ /* prescription data */ });
    
    expect(response.status).toBe(403);
  });
});
```

### **Cypress (Frontend E2E Testing)**

```typescript
// cypress/e2e/audit/workflows.cy.ts
describe('Complete Outpatient Workflow', () => {
  it('[WF-001] should complete entire patient visit', () => {
    // Step 1: Register patient
    cy.login('receptionist@hospital.com', 'password');
    cy.visit('/patients/register');
    cy.get('[data-testid="first-name"]').type('Kwame');
    cy.get('[data-testid="last-name"]').type('Mensah');
    cy.get('[data-testid="submit"]').click();
    cy.contains('Patient registered successfully');
    
    // Step 2: Create appointment
    // ... continue workflow
  });
});
```

---

## 📅 Recommended Audit Schedule

**Daily:** Quick smoke tests (login, critical workflows)  
**Weekly:** Full audit (all 150 checks)  
**Monthly:** Security audit + performance review  
**Quarterly:** Complete system review + penetration testing  

---

## 🎯 Success Metrics

**System is HEALTHY when:**
- ✅ 95%+ checks passing
- ✅ Zero critical failures
- ✅ All workflows complete successfully
- ✅ All permissions properly enforced
- ✅ Database fully seeded

**System needs ATTENTION when:**
- ⚠️ 85-95% checks passing
- ⚠️ 1-2 critical failures
- ⚠️ Some workflows incomplete

**System is BROKEN when:**
- ❌ <85% checks passing
- ❌ 3+ critical failures
- ❌ Core workflows failing

---

## 💡 Tips

1. **Run audit after every deployment**
2. **Fix critical issues immediately**
3. **Track metrics over time** (trending up/down)
4. **Automate what you can** (CI/CD integration)
5. **Keep checklist updated** (add checks for new features)

---

**Ready to audit your system? Copy `system_audit_qa_checklist.json` and start testing!** 🚀
