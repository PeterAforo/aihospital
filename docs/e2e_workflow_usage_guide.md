# E2E Workflow Verification - Quick Usage Guide

## 🎯 **WHAT THIS SCRIPT DOES**

Tests the **COMPLETE patient journey** from registration to discharge:

```
1. Receptionist registers patient & checks in
2. Nurse performs triage
3. Doctor consults, orders labs, prescribes, admits patient
4. Lab tech processes tests
5. Doctor reviews results and updates notes
6. Pharmacist dispenses medications
7. System auto-generates invoice
8. IPD nurse allocates bed, records vitals, adds nursing notes
9. Doctor discharges patient
```

**Validates:**
- ✅ All modules working
- ✅ Data flowing between modules
- ✅ Role-based access control
- ✅ Notifications working
- ✅ Billing integration
- ✅ Queue systems
- ✅ Complete workflow end-to-end

---

## 📦 **WHAT YOU RECEIVED**

**`e2e_workflow_verification_script.json`**
- 1,800+ lines of comprehensive test script
- 9 workflow steps covering all major modules
- 60+ API endpoint tests
- Manual testing instructions for each step
- Automated test specifications
- Success criteria for each step

---

## 🚀 **HOW TO USE IT**

### **Option 1: Manual Testing (Human QA Tester)**

**Step-by-step walkthrough:**

1. **Open the JSON file**
2. **Follow `manual_test_instructions` for each step**
3. **Check off `success_criteria` as you go**

**Example - Step 1 (Receptionist):**
```
✓ Login as receptionist@hospital.com
✓ Navigate to Patient Registration
✓ Fill form with test patient data:
  - Name: Kwame Mensah
  - DOB: 1985-05-15
  - Phone: +233244123456
  - Ghana Card: GHA-123456789-1
  - NHIS: NHIS-2024-001234
✓ Submit - Note MRN generated
✓ Create appointment for today
✓ Check-in patient
✓ Verify patient appears in Triage Queue
✓ LOGOUT
```

**Time:** 30-45 minutes total

---

### **Option 2: Automated Testing (Postman/Newman)**

**Setup:**
```bash
# 1. Install Newman (Postman CLI)
npm install -g newman

# 2. Convert JSON to Postman collection
# (Use Postman app to import JSON as collection)

# 3. Set environment variables
# Create postman-environment.json with:
{
  "api_base_url": "http://localhost:3000",
  "receptionist_email": "receptionist@hospital.com",
  "receptionist_password": "Test123!",
  "nurse_email": "nurse.triage@hospital.com",
  ...
}

# 4. Run tests
newman run e2e_workflow_verification.json \
  -e postman-environment.json \
  --reporters cli,html
```

**Time:** 5-10 minutes

---

### **Option 3: Automated Testing (Cypress)**

**Setup:**
```bash
# 1. Install Cypress
npm install --save-dev cypress

# 2. Create test file
# cypress/e2e/complete-workflow.cy.js

# 3. Convert JSON actions to Cypress commands
```

**Example Cypress test:**
```javascript
describe('Complete Patient Journey E2E', () => {
  let patientId, encounterId, prescriptionId;

  it('Step 1: Receptionist registers patient', () => {
    // Login
    cy.request('POST', '/api/auth/login', {
      email: 'receptionist@hospital.com',
      password: 'Test123!'
    }).then((response) => {
      const token = response.body.token;
      
      // Register patient
      cy.request({
        method: 'POST',
        url: '/api/patients',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          first_name: 'Kwame',
          last_name: 'Mensah',
          // ... rest of patient data
        }
      }).then((response) => {
        patientId = response.body.id;
        expect(response.body.mrn).to.exist;
      });
    });
  });

  it('Step 2: Nurse performs triage', () => {
    // Similar pattern...
  });

  // ... more steps
});
```

**Run:**
```bash
npx cypress run
```

---

### **Option 4: Automated Testing (Playwright)**

**Similar to Cypress, but with Playwright API**

---

## 📋 **STEP-BY-STEP BREAKDOWN**

### **Step 1: Patient Registration (Receptionist)**
```
✅ LOGIN as receptionist
✅ REGISTER patient (Kwame Mensah)
✅ CREATE appointment
✅ CHECK-IN patient
✅ VERIFY patient in triage queue
```

### **Step 2: Triage (Nurse)**
```
✅ LOGIN as nurse.triage
✅ VIEW triage queue
✅ RECORD vital signs
✅ SET triage priority (URGENT/Orange)
✅ VERIFY patient moves to doctor queue
```

### **Step 3: Consultation (Doctor)**
```
✅ LOGIN as doctor
✅ VIEW patient queue (with triage data)
✅ START encounter
✅ DOCUMENT SOAP notes
✅ ADD diagnosis (ICD-10: A90 Dengue)
✅ ORDER lab tests (CBC, Malaria RDT)
✅ CREATE prescription (Paracetamol, IV Saline)
✅ ADMIT patient to IPD (General Ward)
✅ COMPLETE encounter
```

### **Step 4: Lab Processing (Lab Tech)**
```
✅ LOGIN as lab.tech
✅ VIEW lab queue (STAT orders first)
✅ MARK samples collected
✅ ENTER results (CBC, Malaria RDT)
✅ FLAG abnormal values (Platelets: 120 LOW)
✅ APPROVE results
✅ VERIFY doctor notified
```

### **Step 5: Results Review (Doctor)**
```
✅ LOGIN as doctor
✅ CHECK notifications (lab results ready)
✅ VIEW lab results
✅ VERIFY abnormal values highlighted
✅ REOPEN encounter (add addendum)
✅ ADD comments based on results
✅ CLOSE encounter
```

### **Step 6: Dispensing (Pharmacist)**
```
✅ LOGIN as pharmacist
✅ VIEW prescription queue
✅ CHECK drug availability
✅ DISPENSE Paracetamol (15 tablets)
✅ DISPENSE IV Saline (6 bags)
✅ RECORD batch numbers
✅ DOCUMENT patient counseling
✅ COMPLETE dispensing
✅ VERIFY stock deducted
```

### **Step 7: Billing (Billing Officer)**
```
✅ LOGIN as billing officer
✅ SEARCH patient invoices
✅ VERIFY invoice auto-created with:
   - Consultation fee (NHIS price ₵30)
   - Triage fee (₵10)
   - Lab tests (CBC ₵35, Malaria ₵12)
   - Dispensed drugs (Paracetamol ₵6, Saline ₵54)
✅ VERIFY total calculated correctly
✅ PROCESS payment (Cash)
✅ PRINT receipt
✅ VERIFY invoice status = PAID
```

### **Step 8: IPD Management (IPD Nurse)**
```
✅ LOGIN as nurse.ipd
✅ VIEW ward list (General Ward)
✅ VERIFY patient in ward list
✅ ALLOCATE bed (GW-101, Bed 3)
✅ RECORD vitals
✅ ADD nursing notes
✅ VIEW treatment chart (meds, vitals, notes)
```

### **Step 9: Discharge (Doctor)**
```
✅ LOGIN as doctor
✅ INITIATE discharge
✅ FILL discharge summary
✅ PRESCRIBE discharge medications
✅ ADD follow-up instructions
✅ SUBMIT discharge
✅ VERIFY bed becomes available
✅ GENERATE discharge summary PDF
✅ VERIFY final invoice includes bed charges
```

---

## ✅ **SUCCESS CRITERIA**

**The test PASSES if:**

```
✅ All 9 steps complete without errors
✅ Data flows correctly between modules:
   - Prescription → Pharmacy queue
   - Lab order → Lab queue → Results → Doctor notification
   - Dispensing → Invoice line items
   - Admission → IPD ward list → Bed allocation
   
✅ Role-based access control working:
   - Nurse CANNOT create prescriptions
   - Doctor CANNOT dispense medications
   - Lab tech CANNOT view financial data
   - Receptionist CANNOT access clinical notes
   
✅ Notifications working:
   - Doctor notified when lab results ready
   
✅ Billing integration working:
   - Invoice auto-created with all services
   - NHIS prices applied correctly
   - Payment updates invoice status
   
✅ Queue systems working:
   - Triage queue
   - Doctor queue (sorted by priority)
   - Lab queue (STAT first)
   - Pharmacy queue
   - IPD ward list
   
✅ State transitions correct:
   - Appointment: SCHEDULED → CHECKED_IN
   - Lab: PENDING → COLLECTED → ENTERED → COMPLETED
   - Prescription: PENDING → DISPENSED
   - Invoice: UNPAID → PAID
   - Admission: ADMITTED → DISCHARGED
   - Bed: AVAILABLE → OCCUPIED → AVAILABLE
```

---

## 🚨 **COMMON ISSUES & FIXES**

### **Issue 1: Login fails**
```
Error: 401 Unauthorized

Fix:
- Verify test users exist in database
- Check passwords are correct
- Ensure JWT secret configured
```

### **Issue 2: Patient not in queue**
```
Error: Patient not found in triage/doctor queue

Fix:
- Check appointment status changed to CHECKED_IN
- Verify triage status updated
- Check queue filtering logic
```

### **Issue 3: Prescription not in pharmacy queue**
```
Error: Prescription not visible to pharmacist

Fix:
- Check prescription status is PENDING_PHARMACY
- Verify branch filtering (same branch)
- Check pharmacist permissions
```

### **Issue 4: Lab results notification not sent**
```
Error: Doctor didn't receive notification

Fix:
- Check notification service running
- Verify notification preferences enabled
- Check notification logs
```

### **Issue 5: Invoice not created**
```
Error: No invoice found for patient

Fix:
- Check billing integration enabled
- Verify services have prices in Finance module
- Check invoice auto-generation triggers
```

### **Issue 6: NHIS prices not applied**
```
Error: Invoice shows cash prices instead of NHIS

Fix:
- Verify patient has NHIS number
- Check patient.insurance_type = 'NHIS'
- Verify NHIS prices exist in service_catalog
```

---

## 📊 **TEST REPORT TEMPLATE**

**After running tests, generate report:**

```
=================================================
E2E WORKFLOW VERIFICATION REPORT
Date: 2024-02-15 14:30:00
Environment: Development
=================================================

SUMMARY:
✅ Passed: 9/9 steps (100%)
⏱️ Duration: 8 minutes 32 seconds

STEP-BY-STEP RESULTS:
✅ Step 1: Patient Registration - PASSED (45s)
✅ Step 2: Triage - PASSED (32s)
✅ Step 3: Consultation - PASSED (1m 15s)
✅ Step 4: Lab Processing - PASSED (1m 5s)
✅ Step 5: Results Review - PASSED (28s)
✅ Step 6: Dispensing - PASSED (52s)
✅ Step 7: Billing - PASSED (38s)
✅ Step 8: IPD Management - PASSED (1m 2s)
✅ Step 9: Discharge - PASSED (45s)

DATA CONSISTENCY:
✅ Patient MRN: KBU-001234
✅ Encounter ID: ENC-2024-001
✅ Prescription ID: RX-2024-001
✅ Lab Order IDs: LAB-001, LAB-002
✅ Invoice ID: INV-2024-001
✅ Admission ID: ADM-2024-001

ROLE-BASED ACCESS:
✅ All users restricted to their permissions
✅ No unauthorized access detected

INTEGRATION CHECKS:
✅ Prescription → Pharmacy queue: Working
✅ Lab order → Lab queue: Working
✅ Lab results → Doctor notification: Working
✅ Dispensing → Invoice: Working
✅ Admission → IPD ward: Working

BILLING VERIFICATION:
✅ Invoice total: ₵147.00
✅ NHIS prices applied: YES
✅ Payment processed: YES
✅ Receipt generated: YES

RECOMMENDATIONS:
✅ All tests passed - System ready for UAT
=================================================
```

---

## 🎯 **WHEN TO RUN THIS TEST**

**Run BEFORE:**
- Every deployment to staging/production
- Client demos
- UAT (User Acceptance Testing) sessions
- Major feature releases

**Run AFTER:**
- Fixing critical bugs
- Major refactoring
- Database migrations
- API changes

**Run DAILY:**
- As part of CI/CD pipeline (automated)
- Morning smoke test (manual)

---

## 💡 **TIPS FOR SUCCESS**

**1. Prepare test environment:**
```
✓ Fresh database with seed data
✓ Test users created with correct roles
✓ Sample drugs in pharmacy inventory
✓ Sample lab tests in catalog
✓ Services priced in Finance module
```

**2. Use test data consistently:**
```
✓ Same patient throughout test
✓ Don't modify test data mid-test
✓ Reset database between test runs
```

**3. Document failures:**
```
✓ Screenshot where test failed
✓ Copy error messages
✓ Note which API call failed
✓ Check server logs
```

**4. Test in order:**
```
✓ Don't skip steps
✓ Don't run steps out of order
✓ Each step depends on previous steps
```

---

## 🚀 **NEXT STEPS**

**After successful E2E test:**

1. ✅ **Mark system as integration-tested**
2. ✅ **Proceed with UAT (User Acceptance Testing)**
3. ✅ **Train end users**
4. ✅ **Deploy to production**

**If test fails:**

1. ❌ **Identify which step failed**
2. ❌ **Fix the issue**
3. ❌ **Re-run complete test**
4. ❌ **Don't deploy until all tests pass**

---

## 📞 **SUPPORT**

**If you encounter issues:**
- Check server logs for errors
- Verify database state
- Review API endpoint responses
- Check role permissions
- Ensure all modules are running

**This E2E test is your QUALITY GATE - don't skip it!** ✅
