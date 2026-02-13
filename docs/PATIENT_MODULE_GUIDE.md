# Patient Module - Implementation Guide

## 🎯 Implementation Overview

Based on your selections:
- ✅ **Focus**: Exceptional registration workflow and UX
- ✅ **Phase 1 Features**: ALL features (ambitious but achievable)
- ✅ **Identification**: Multiple identifiers (MRN + Ghana Card + NHIS)

**Target Performance:**
- New patient registration: **< 2 minutes**
- Existing patient search: **< 5 seconds**
- Duplicate detection accuracy: **> 95%**

---

## 📋 QUICK START - Copy This to Windsurf

```
I'm building a comprehensive patient management module for a hospital management system in Ghana based on patient_module_implementation.json.

This module needs to support:
1. Fast patient registration (under 2 minutes for walk-ins)
2. Multiple identifiers (MRN, Ghana Card, NHIS number)
3. Real-time duplicate detection
4. Photo capture and biometric fingerprint
5. Patient portal access
6. Family/dependent management
7. Document uploads

Let's build this step by step, starting with the database schema and core API endpoints.

Ready to begin with the database schema?
```

---

## STEP 1: Database Schema

### Windsurf Prompt:
```
Based on patient_module_implementation.json, create the complete Prisma database schema for the patient module.

Include these tables:
1. patients (main table with all demographics and identifiers)
2. patient_emergency_contacts
3. patient_allergies
4. patient_chronic_conditions
5. patient_current_medications
6. patient_relationships (family linking)
7. patient_documents
8. patient_audit_log

Key requirements:
- Support multi-tenancy (tenant_id in all tables)
- MRN format: {HOSPITAL_CODE}-{YEAR}-{SEQUENCE}
- Ghana Card encryption
- Fingerprint template encryption
- Full-text search on names
- Optimized indexes for search performance

Create:
1. schema.prisma file with all tables
2. Migration file
3. Seed file with realistic Ghana test data (100 patients)

Location: backend/prisma/
```

---

## STEP 2: Validation Utilities

### Windsurf Prompt:
```
Create comprehensive validation utilities for the patient module.

Based on patient_module_implementation.json, implement:

1. **Ghana Card Validator**
   - Format: GHA-XXXXXXXXX-X
   - Validate checksum if known
   - Return true/false + error message

2. **NHIS Number Validator**
   - Validate format
   - Check for valid scheme codes

3. **Phone Number Utilities**
   - validateGhanaPhone(phone): boolean
   - formatGhanaPhone(phone): string  // +233XXXXXXXXX
   - detectNetwork(phone): 'MTN' | 'Vodafone' | 'AirtelTigo' | 'Unknown'

4. **MRN Generator**
   - generateMRN(hospitalCode: string, sequence: number): string
   - Format: HOS-2024-00001
   - Support yearly reset or continuous sequence

5. **Age Calculator**
   - calculateAge(dob: Date): number
   - calculateAgeAtDate(dob: Date, referenceDate: Date): number

6. **Name Similarity (for duplicate detection)**
   - calculateNameSimilarity(name1: string, name2: string): number  // 0-100
   - Use Levenshtein distance or Soundex

Include comprehensive unit tests for each function.

File: src/utils/patient-validators.ts
Tests: src/utils/patient-validators.test.ts
```

---

## STEP 3: Duplicate Detection Service

### Windsurf Prompt:
```
Create an intelligent duplicate detection service based on the algorithm in patient_module_implementation.json.

Features:
1. **Scoring System**
   - Ghana Card exact match: 100 points (definite duplicate)
   - Phone exact match: 40 points
   - Name similarity >80%: 30 points
   - DOB exact match: 20 points
   - Address similarity: 10 points

2. **Decision Logic**
   - Score 100: Definite duplicate (block creation)
   - Score 70-99: High probability (show warning)
   - Score 40-69: Possible duplicate (notification)
   - Score <40: Likely unique (proceed)

3. **API Method**
   checkForDuplicates(patientData: PatientInput): Promise<DuplicateCheckResult>

   Return:
   {
     isDuplicate: boolean,
     duplicateScore: number,
     potentialDuplicates: Patient[],  // with individual scores
     verdict: 'definite' | 'high_probability' | 'possible' | 'unique'
   }

4. **Real-time Integration**
   - Check on name entry (debounced)
   - Check on phone entry
   - Check on Ghana Card entry
   - Final comprehensive check before save

5. **Performance**
   - Query optimization
   - Index usage
   - Target: <800ms for 100,000 patient database

Implementation:
- Service: src/services/duplicate-detection.service.ts
- Include database query optimization
- Add caching for frequently checked names
- Include unit tests with various scenarios

Test scenarios:
- Exact Ghana Card match
- Similar names with same DOB
- Same phone, different names
- Edge cases (twins, family members)
```

---

## STEP 4: Patient API Endpoints

### Windsurf Prompt:
```
Create all patient management API endpoints based on patient_module_implementation.json.

Endpoints to implement:

1. POST /api/patients
   - Create new patient
   - Auto-generate MRN
   - Run duplicate check before creation
   - Validate all Ghana-specific fields
   - Return patient with MRN

2. GET /api/patients/:id
   - Get complete patient details
   - Support MRN or UUID as id
   - Query param: include=allergies,conditions,medications,relationships
   - Log access in audit trail

3. PUT /api/patients/:id
   - Update patient (except MRN)
   - Validate changes
   - Create audit log
   - Re-run duplicate check if identifiers changed

4. DELETE /api/patients/:id
   - Soft delete (set is_active = false)
   - Cancel future appointments
   - Create audit log

5. GET /api/patients/search
   - Query params: q (search term), type (mrn|phone|ghana_card|nhis|name)
   - Intelligent search type detection if type not specified
   - Pagination (default 20, max 100)
   - Performance: <500ms for name search, <100ms for exact matches

6. POST /api/patients/check-duplicate
   - Check for duplicates without creating
   - Used during registration
   - Return duplicate score + matches

7. POST /api/patients/:id/merge
   - Merge duplicate into primary patient
   - Transfer all related records (visits, appointments, bills)
   - Create MRN alias
   - Detailed audit log

8. POST /api/patients/:id/photo
   - Upload patient photo
   - Validate: max 2MB, image only
   - Resize to 400x400px
   - Generate 100x100px thumbnail
   - Upload to S3 or local storage

9. POST /api/patients/:id/allergies
   - Add allergy record
   - Required: allergen, severity
   - Optional: reaction, discovered_date

10. POST /api/patients/:id/documents
    - Upload document (lab report, etc.)
    - Max 10MB
    - Virus scan
    - Store in S3

11. POST /api/patients/:id/relationships
    - Link family members
    - Create bidirectional relationship

12. POST /api/patients/:id/fingerprint
    - Enroll fingerprint
    - Encrypt template before storage
    - Never store raw image

13. POST /api/patients/verify-fingerprint
    - Match fingerprint against database
    - Return patient if match found
    - Log attempt

14. GET /api/patients/:id/card
    - Generate printable patient card PDF
    - Include: photo, MRN, QR code, blood group
    - Credit card size

Implementation structure:
- Routes: src/routes/patient.routes.ts
- Controllers: src/controllers/patient.controller.ts
- Services: src/services/patient.service.ts
- DTOs: src/dtos/patient.dto.ts

Include:
- Express-validator for validation
- Proper error handling
- Rate limiting
- Permission checks (role-based)
- Comprehensive comments
```

---

## STEP 5: Frontend - Patient Search Component

### Windsurf Prompt:
```
Create an intelligent patient search component with auto-detection of search type.

Based on patient_module_implementation.json:

Component: PatientSearchBar

Features:
1. **Smart Search Type Detection**
   - Detect MRN format: HOS-YYYY-NNNNN
   - Detect Ghana Card: GHA-XXXXXXXXX-X
   - Detect Phone: +233XXXXXXXXX or 0XXXXXXXXX
   - Detect NHIS: Various formats
   - Default to name search if none match

2. **Real-time Search**
   - Debounced 300ms
   - Show results as dropdown
   - Keyboard navigation (up/down arrows)
   - Enter to select
   - ESC to close

3. **Search Results Display**
   - Show photo thumbnail
   - MRN + Full name
   - Age, Gender
   - Phone number
   - Last visit date
   - Match score (if fuzzy search)

4. **Recent Searches**
   - Store last 10 searches in localStorage
   - Quick access dropdown

5. **Keyboard Shortcuts**
   - Ctrl+K or Cmd+K to focus search
   - Ctrl+N for new patient
   - ESC to clear

UI Example:
┌────────────────────────────────────────┐
│ 🔍 Search Patient (MRN, Phone, Name)  │
│ [RDG-2024-00001____________]           │
│                                        │
│ 📋 Recent Searches                     │
│ • Kwame Mensah (+233 24 412 3456)     │
│ • RDG-2024-00125                       │
└────────────────────────────────────────┘

Use:
- React + TypeScript
- Ant Design AutoComplete
- React Query for API calls
- Lodash debounce

Components:
- src/components/patients/PatientSearchBar.tsx
- src/hooks/usePatientSearch.ts
```

---

## STEP 6: Frontend - Quick Registration Modal

### Windsurf Prompt:
```
Create a fast patient registration modal for walk-in patients.

Based on patient_module_implementation.json scenario_1_walkin_new_patient:

Component: PatientQuickRegistration

Target time: 90 seconds

Features:
1. **Single-Page Form**
   - All mandatory fields visible
   - Optional fields collapsible
   - No multi-step wizard (too slow)

2. **Form Sections**
   a. Personal Details
      - Title, First Name*, Last Name*, Other Names
      - Date of Birth*, Gender*
   
   b. Contact Information
      - Phone Primary*, Phone Secondary
      - Email
      - Address*, City*, Region*
   
   c. Identifiers (Collapsible)
      - Ghana Card Number
      - NHIS Number + Expiry Date
   
   d. Photo (Optional, Skippable)
      - Webcam capture OR upload
      - Square crop

3. **UX Optimizations**
   - Tab navigation (no mouse needed)
   - Auto-format phone as typed (+233 XX XXX XXXX)
   - Auto-capitalize names (First letter of each word)
   - Smart defaults (Country=Ghana, Language=English)
   - Ctrl+S to save
   - ESC to cancel
   - Auto-save draft every 30s to localStorage
   - Resume draft if browser closed

4. **Duplicate Detection**
   - Check on name blur (if DOB entered)
   - Check on phone blur
   - Check on Ghana Card blur
   - Show DuplicateWarningModal if potential match

5. **Validation**
   - Real-time with React Hook Form + Yup
   - Show errors inline
   - Prevent submit if validation fails

6. **Success Flow**
   - Save patient
   - Display success message with MRN
   - Option to: Print card, Book appointment, Go to profile
   - Auto-redirect to appointments after 5 seconds

Component structure:
- src/components/patients/PatientQuickRegistration.tsx
- Sub-components:
  - PersonalDetailsSection.tsx
  - ContactInfoSection.tsx
  - IdentifiersSection.tsx
  - PhotoCaptureSection.tsx

Use:
- Ant Design Modal, Form components
- React Hook Form + Yup validation
- react-webcam for photo
- Zustand for draft state
```

---

## STEP 7: Frontend - Duplicate Warning Modal

### Windsurf Prompt:
```
Create a duplicate patient warning modal for when potential duplicates are detected.

Based on patient_module_implementation.json duplicate_detection_system:

Component: DuplicateWarningModal

Props:
- newPatient: PatientInput  // Data being registered
- duplicates: DuplicateMatch[]  // Potential matches with scores
- onConfirmNew: () => void  // User confirms it's a new patient
- onSelectExisting: (patient: Patient) => void  // User selects existing
- onCancel: () => void

UI Layout:
┌───────────────────────────────────────────────────┐
│ ⚠️ Potential Duplicate Patient Found              │
├───────────────────────────────────────────────────┤
│                                                   │
│ New Registration        vs     Existing Patient  │
│ ┌─────────────────┐          ┌─────────────────┐│
│ │ [Photo or Icon] │          │    [Photo]      ││
│ │ Kwame Mensah    │          │ Kwame Mensa     ││
│ │ DOB: 15 Mar 1985│          │ DOB: 15 Mar 1985││
│ │ +233 24 412 3456│          │ +233 24 412 3456││
│ │                 │          │ MRN: RDG-2024-01││
│ └─────────────────┘          └─────────────────┘│
│                                                   │
│ Match Score: 85% (High probability)               │
│                                                   │
│ Matching factors:                                 │
│ ✓ Name similarity: 95%                            │
│ ✓ Date of birth: Exact match                     │
│ ✓ Phone number: Exact match                      │
│                                                   │
│ [This is the same patient] [Different patient]   │
│                          [Let me search manually] │
└───────────────────────────────────────────────────┘

Features:
1. **Side-by-side Comparison**
   - Show photos if available
   - Highlight matching fields in green
   - Highlight differences in orange

2. **Match Score Visualization**
   - Progress bar with color coding
     - 90-100%: Red (Definite)
     - 70-89%: Orange (High probability)
     - 40-69%: Yellow (Possible)
   - List of matching factors

3. **Multiple Duplicates**
   - If >1 potential duplicate found
   - Show all matches with scores
   - User can select which one (if same patient)

4. **Actions**
   - "This is the same patient" → Open existing patient profile
   - "Different patient" → Proceed with registration (log decision)
   - "Let me search manually" → Close modal, open search

Component: src/components/patients/DuplicateWarningModal.tsx
```

---

## STEP 8: Frontend - Patient Profile Page

### Windsurf Prompt:
```
Create a comprehensive patient profile page.

Based on patient_module_implementation.json PatientProfile component:

Route: /patients/:id

Layout:

┌────────────────────────────────────────────────────┐
│ Header                                             │
│ ┌─────┐ Kwame Mensah              [Edit] [Print] │
│ │Photo│ MRN: RDG-2024-00001              [Portal]│
│ └─────┘ 39 yrs, Male, O+                          │
├────────────────────────────────────────────────────┤
│ ⚠️ ALLERGIES: Penicillin (Severe), Codeine (Mod.) │
├────────────────────────────────────────────────────┤
│ [Overview] [Medical History] [Visits] [Documents] │
│            [Family] [Billing] [Audit Log]          │
│                                                    │
│ Tab Content Here                                   │
│                                                    │
└────────────────────────────────────────────────────┘

Tabs:

1. **Overview**
   - Demographics (name, DOB, gender, blood group)
   - Contact information (phone, email, address)
   - Identifiers (MRN, Ghana Card, NHIS)
   - Emergency contact
   - Registration details (date, source)

2. **Medical History**
   - Allergies (prominent, always visible)
     - Allergen, Type, Severity, Reaction
     - [Add Allergy] button
   - Chronic Conditions
     - Condition, Diagnosed Date, ICD-10 code
     - Active/Inactive toggle
     - [Add Condition] button
   - Current Medications
     - Drug, Dosage, Frequency
     - Started date, Prescribed by
     - [Add Medication] button

3. **Visits**
   - Timeline of all visits/encounters
   - Date, Type (consultation, emergency, etc.)
   - Diagnosis, Treatment
   - Prescriptions issued
   - Click to view full encounter

4. **Documents**
   - Grid view of uploaded documents
   - Document type (Lab Report, Radiology, etc.)
   - Upload date, Uploaded by
   - Preview (for images) or download (PDF)
   - [Upload Document] button
   - Search/filter documents

5. **Family**
   - Family tree visualization
   - List of linked family members
   - Relationship type (Spouse, Child, Parent)
   - Click family member to view their profile
   - [Link Family Member] button

6. **Billing**
   - Outstanding bills (amount, date, status)
   - Payment history
   - Total paid, Total outstanding
   - [View Full Billing] link to billing module

7. **Audit Log** (Admin only)
   - Who accessed/modified patient record
   - Date/time, Action, User
   - Changed fields (if update)

Features:
- Edit mode toggle (pencil icon)
- Print patient summary (PDF)
- Enable/disable portal access
- Reset portal password
- Deactivate patient (soft delete)

Components:
- src/pages/patients/PatientProfile.tsx
- src/components/patients/tabs/
  - OverviewTab.tsx
  - MedicalHistoryTab.tsx
  - VisitsTab.tsx
  - DocumentsTab.tsx
  - FamilyTab.tsx
  - BillingTab.tsx
  - AuditLogTab.tsx

Use:
- Ant Design Tabs, Descriptions, Table
- React Query for data fetching
- Recharts for any visualizations
```

---

## STEP 9: Photo Capture Component

### Windsurf Prompt:
```
Create a flexible photo capture component that supports webcam and file upload.

Component: PhotoCapture

Props:
- onPhotoCapture: (photoFile: File) => void
- existingPhotoUrl?: string
- size?: number  // Default 400
- quality?: number  // Default 0.8

Features:

1. **Capture Methods**
   - Webcam (live preview)
   - Upload from file
   - Toggle between methods

2. **Webcam Mode**
   - Request camera permission
   - Live video preview
   - "Capture" button
   - "Retake" button
   - Show captured image for review

3. **Upload Mode**
   - Drag and drop area
   - Click to browse
   - Image preview
   - File validation (type, size)

4. **Image Processing**
   - Square crop (react-image-crop)
   - Resize to specified size (400x400 default)
   - Compress (quality 0.8)
   - Convert to JPEG

5. **UI States**
   - Idle (show buttons)
   - Requesting permission
   - Camera active (live preview)
   - Photo captured (show preview + retake)
   - Processing (loading spinner)
   - Error (show message + retry)

6. **Accessibility**
   - Alt text for images
   - Keyboard navigation
   - Screen reader friendly

Layout:
┌────────────────────────────┐
│                            │
│    [Live Camera Preview]   │
│         or                 │
│    [Captured Photo]        │
│         or                 │
│  [Drag & Drop Area]        │
│                            │
├────────────────────────────┤
│ [Use Webcam] [Upload File] │
│                            │
│ [Capture] [Retake] [Save]  │
└────────────────────────────┘

Use:
- react-webcam for camera
- react-image-crop for cropping
- browser-image-compression for compression

Component: src/components/common/PhotoCapture.tsx
```

---

## STEP 10: Biometric Fingerprint Integration

### Windsurf Prompt:
```
Create fingerprint enrollment and verification components.

Based on patient_module_implementation.json biometric_integration:

Components:
1. FingerprintEnrollment
2. FingerprintVerification

Requirements:
- USB fingerprint scanner integration
- Encrypt fingerprint template before storage
- Never store raw fingerprint image
- ISO 19794-2 or ANSI 378 template format

Implementation:

1. **FingerprintEnrollment Component**

Props:
- patientId: string
- onSuccess: (enrolled: boolean) => void
- onError: (error: string) => void

Workflow:
a. Check if scanner connected
b. Initialize device SDK
c. Prompt user to place finger
d. Capture fingerprint (3 samples for quality)
e. Generate template
f. Quality check
g. Encrypt template
h. Send to API: POST /api/patients/:id/fingerprint
i. Store encrypted template in database
j. Show success message

UI:
┌────────────────────────────┐
│ Fingerprint Enrollment     │
├────────────────────────────┤
│                            │
│   [Fingerprint Icon]       │
│                            │
│ Status: Waiting for finger │
│                            │
│ Quality: ████████░░ 80%    │
│                            │
│ Samples: 2 of 3 captured   │
│                            │
└────────────────────────────┘

2. **FingerprintVerification Component**

Props:
- onPatientIdentified: (patient: Patient) => void
- onNoMatch: () => void

Workflow:
a. Capture fingerprint from scanner
b. Generate template
c. Send to API: POST /api/patients/verify-fingerprint
d. API matches against all enrolled fingerprints (1:N matching)
e. If match found (score >80%), return patient
f. Display patient info for confirmation

UI:
┌────────────────────────────┐
│ Verify Patient             │
├────────────────────────────┤
│ Place finger on scanner... │
│                            │
│ [Fingerprint scanning...]  │
│                            │
│ ─── Match Found! ───       │
│                            │
│ Kwame Mensah               │
│ MRN: RDG-2024-00001        │
│                            │
│ Confidence: 95%            │
│                            │
│ [Confirm] [Not this person]│
└────────────────────────────┘

3. **SDK Integration**

Since fingerprint scanners require native drivers:

Option A: Web USB API
- Use WebUSB to communicate with device
- Limited browser support
- Requires HTTPS

Option B: Desktop App Bridge
- Electron app running locally
- Communicates with scanner via native SDK
- Exposes REST API to web app (localhost:port)

Option C: Browser Extension
- Chrome/Firefox extension
- Access native SDK
- Message passing to web app

Recommendation: Use Option B (Desktop Bridge) for Phase 1

Provide:
- Mock implementation for development (simulates scanner)
- Device configuration UI (select scanner model)
- Fallback to manual search if fingerprint fails

Files:
- src/components/patients/FingerprintEnrollment.tsx
- src/components/patients/FingerprintVerification.tsx
- src/services/fingerprint.service.ts (API calls)
- desktop-bridge/ (separate Electron app for Phase 2)

For Phase 1, focus on:
- UI components
- API integration
- Mock mode for testing
- Document integration requirements for Phase 2
```

---

## STEP 11: Patient Portal (Web)

### Windsurf Prompt:
```
Create a patient-facing web portal for self-service.

Based on patient_module_implementation.json patient_portal_specification:

Portal URL: portal.hospital.com or hospital.com/portal

Features:

1. **Authentication**
   - Login: Phone + Password OR MRN + Password
   - SMS OTP 2FA for sensitive actions
   - Forgot password (reset via SMS)

2. **Dashboard**
   - Welcome message with patient name
   - Cards showing:
     a. Next appointment (date, time, doctor)
     b. Latest lab results (if any)
     c. Outstanding bills (amount)
     d. Recent notifications

3. **My Profile**
   - View all information
   - Edit: phone, email, address only
   - Cannot edit: name, MRN, DOB, medical history

4. **Appointments**
   - List of upcoming appointments
   - Past appointments
   - Book new appointment:
     - Select doctor
     - Select available date/time
     - Confirm booking
   - Reschedule (up to 24 hours before)
   - Cancel appointment
   - Add to calendar (Google/Apple)

5. **Lab Results**
   - List of results (approved only)
   - Date, Test name, Status
   - Click to view full result
   - Download PDF
   - SMS notification when new result available

6. **Prescriptions**
   - Current prescriptions
   - Past prescriptions
   - Drug name, dosage, duration
   - Prescribing doctor

7. **Bills & Payments**
   - Outstanding bills
   - Payment history
   - Pay online (mobile money/card)
   - Download receipts

8. **Family Members**
   - View linked family members
   - Book appointments for dependents
   - View dependents' lab results (if guardian)

9. **Documents**
   - View uploaded documents
   - Download documents
   - (Optional) Upload documents

Tech Stack:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query
- Zustand for state

Pages:
- portal/
  - login/
  - dashboard/
  - profile/
  - appointments/
  - lab-results/
  - prescriptions/
  - billing/
  - family/
  - documents/

Security:
- Separate authentication from main app
- JWT tokens
- SMS OTP for login
- Rate limiting
- HTTPS only
- Audit logging

Create:
1. Portal authentication system
2. Dashboard page
3. My Profile page
4. Appointments booking flow

Note: Focus on MVP features for Phase 1
Full billing/payment integration can be Phase 2
```

---

## STEP 12: Testing

### Windsurf Prompt:
```
Create comprehensive tests for the patient module.

Based on patient_module_implementation.json testing_strategy:

1. **Unit Tests**

a. Validation utilities
```typescript
describe('Ghana Card Validation', () => {
  it('should validate correct Ghana Card format', () => {
    expect(validateGhanaCard('GHA-123456789-1')).toBe(true);
  });
  
  it('should reject invalid Ghana Card format', () => {
    expect(validateGhanaCard('ABC-123')).toBe(false);
  });
});

describe('MRN Generation', () => {
  it('should generate MRN with correct format', () => {
    const mrn = generateMRN('RDG', 2024, 1);
    expect(mrn).toBe('RDG-2024-00001');
  });
  
  it('should generate unique MRNs', () => {
    const mrn1 = generateMRN('RDG', 2024, 1);
    const mrn2 = generateMRN('RDG', 2024, 2);
    expect(mrn1).not.toBe(mrn2);
  });
});
```

b. Duplicate detection algorithm
```typescript
describe('Duplicate Detection', () => {
  it('should detect exact Ghana Card match as definite duplicate', () => {
    const result = checkDuplicate(newPatient, existingPatients);
    expect(result.duplicateScore).toBe(100);
    expect(result.verdict).toBe('definite');
  });
  
  it('should detect high probability duplicate on similar name + DOB', () => {
    const result = checkDuplicate(
      { firstName: 'Kwame', lastName: 'Mensah', dob: '1985-03-15' },
      [{ firstName: 'Kwame', lastName: 'Mensa', dob: '1985-03-15' }]
    );
    expect(result.duplicateScore).toBeGreaterThan(70);
  });
});
```

2. **Integration Tests**

```typescript
describe('Patient API', () => {
  describe('POST /api/patients', () => {
    it('should create patient with valid data', async () => {
      const response = await request(app)
        .post('/api/patients')
        .send(validPatientData)
        .expect(201);
      
      expect(response.body.data.patient).toHaveProperty('mrn');
      expect(response.body.data.patient.first_name).toBe('Kwame');
    });
    
    it('should reject duplicate Ghana Card', async () => {
      // Create patient with Ghana Card
      await createPatient({ ghana_card_number: 'GHA-123456789-1' });
      
      // Try to create another with same Ghana Card
      const response = await request(app)
        .post('/api/patients')
        .send({ ...validPatientData, ghana_card_number: 'GHA-123456789-1' })
        .expect(409);
      
      expect(response.body.error.code).toBe('DUPLICATE_PATIENT');
    });
  });
  
  describe('GET /api/patients/search', () => {
    beforeEach(async () => {
      await seedDatabase(100); // Create 100 test patients
    });
    
    it('should search by MRN', async () => {
      const response = await request(app)
        .get('/api/patients/search?q=RDG-2024-00001&type=mrn')
        .expect(200);
      
      expect(response.body.data.patients).toHaveLength(1);
    });
    
    it('should search by name with fuzzy matching', async () => {
      const response = await request(app)
        .get('/api/patients/search?q=Kwame&type=name')
        .expect(200);
      
      expect(response.body.data.patients.length).toBeGreaterThan(0);
    });
    
    it('should return results in <500ms', async () => {
      const start = Date.now();
      await request(app).get('/api/patients/search?q=Mensah&type=name');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
    });
  });
});
```

3. **E2E Tests (Cypress)**

```typescript
describe('Patient Registration Flow', () => {
  it('should register new patient via quick registration', () => {
    cy.visit('/patients');
    cy.contains('New Patient').click();
    
    // Fill form
    cy.get('[name="firstName"]').type('Kwame');
    cy.get('[name="lastName"]').type('Mensah');
    cy.get('[name="dateOfBirth"]').type('1985-03-15');
    cy.get('[name="gender"]').select('Male');
    cy.get('[name="phone"]').type('0244123456');
    cy.get('[name="address"]').type('East Legon, Accra');
    cy.get('[name="city"]').type('Accra');
    cy.get('[name="region"]').select('Greater Accra');
    
    // Submit
    cy.contains('Save Patient').click();
    
    // Verify success
    cy.contains('Patient registered successfully');
    cy.contains('MRN:').should('be.visible');
  });
  
  it('should detect duplicate patient during registration', () => {
    // First create patient
    cy.createPatient({ name: 'Kwame Mensah', phone: '0244123456' });
    
    // Try to create duplicate
    cy.visit('/patients');
    cy.contains('New Patient').click();
    cy.get('[name="firstName"]').type('Kwame');
    cy.get('[name="lastName"]').type('Mensa');  // Similar name
    cy.get('[name="phone"]').type('0244123456');  // Same phone
    
    // Should show duplicate warning
    cy.contains('Possible duplicate found').should('be.visible');
  });
});

describe('Patient Search', () => {
  it('should find patient by MRN', () => {
    cy.visit('/patients');
    cy.get('[data-testid="search-input"]').type('RDG-2024-00001');
    
    // Should show result
    cy.contains('Kwame Mensah').should('be.visible');
  });
});
```

4. **Performance Tests**

```typescript
describe('Performance Tests', () => {
  it('should handle 50 concurrent registrations', async () => {
    const promises = Array(50).fill(null).map(() => 
      request(app)
        .post('/api/patients')
        .send(generateRandomPatient())
    );
    
    const results = await Promise.all(promises);
    
    expect(results.every(r => r.status === 201)).toBe(true);
  });
  
  it('should search 100k patients database in <500ms', async () => {
    // Seed 100,000 patients
    await seedLargeDatabase(100000);
    
    const start = Date.now();
    await request(app).get('/api/patients/search?q=Mensah&type=name');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

5. **Test Data Generation**

```typescript
// Generate realistic Ghana test data
function generateRandomPatient() {
  const firstNames = ['Kwame', 'Kofi', 'Yaw', 'Kwesi', 'Ama', 'Akua', 'Yaa', 'Abena'];
  const lastNames = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei'];
  const regions = ['Greater Accra', 'Ashanti', 'Western', 'Eastern'];
  
  return {
    first_name: faker.helpers.arrayElement(firstNames),
    last_name: faker.helpers.arrayElement(lastNames),
    date_of_birth: faker.date.between('1950-01-01', '2020-01-01'),
    gender: faker.helpers.arrayElement(['Male', 'Female']),
    phone_primary: generateGhanaPhone(),
    address: faker.address.streetAddress(),
    city: 'Accra',
    region: faker.helpers.arrayElement(regions)
  };
}

function generateGhanaPhone() {
  const prefixes = ['024', '054', '055', '020', '050', '027', '057'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const number = faker.datatype.number({ min: 1000000, max: 9999999 });
  return `+233${prefix}${number}`;
}
```

Create all test files in appropriate locations:
- Unit tests: src/**/*.test.ts
- Integration tests: tests/integration/
- E2E tests: cypress/e2e/
- Performance tests: tests/performance/
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Week 1: Database & Core API
- [ ] Database schema with all tables
- [ ] Validation utilities
- [ ] MRN generation
- [ ] Duplicate detection service
- [ ] Core CRUD API endpoints
- [ ] Search API endpoint

### Week 2: Advanced API & File Handling
- [ ] Photo upload endpoint
- [ ] Document upload endpoint
- [ ] Allergy/medication/condition endpoints
- [ ] Family relationship endpoints
- [ ] Merge patients endpoint
- [ ] Patient card PDF generation

### Week 3: Frontend Core
- [ ] Patient search component
- [ ] Quick registration modal
- [ ] Duplicate warning modal
- [ ] Patient list view
- [ ] Photo capture component

### Week 4: Frontend Advanced
- [ ] Patient profile page (all tabs)
- [ ] Medical history management
- [ ] Document upload/view
- [ ] Family management
- [ ] Edit patient form

### Week 5: Portal & Biometric
- [ ] Patient portal authentication
- [ ] Portal dashboard
- [ ] Appointments booking (portal)
- [ ] Fingerprint enrollment UI
- [ ] Fingerprint verification UI
- [ ] Biometric API integration

### Week 6: Testing & Polish
- [ ] Unit tests (all utilities)
- [ ] Integration tests (all APIs)
- [ ] E2E tests (critical flows)
- [ ] Performance tests
- [ ] Bug fixes
- [ ] Documentation

---

## 🎯 SUCCESS CRITERIA

Your patient module will be successful when:

✅ **Speed**: New walk-in patient registered in <2 minutes  
✅ **Search**: Find patient in <5 seconds  
✅ **Quality**: <5% duplicate rate  
✅ **Completeness**: >90% patients have photo and Ghana Card  
✅ **Portal**: 30% adoption within 6 months  
✅ **Satisfaction**: 4.5+ stars from receptionists  

---

## 💡 PRO TIPS

1. **Start Small**: Don't try to build everything at once. Start with core registration and search.

2. **Test Early**: Write tests as you build, not after.

3. **Use Real Data**: Generate realistic Ghana names and addresses for testing.

4. **Performance Matters**: Monitor search speed from day one. Add indexes early.

5. **Duplicate Detection is Critical**: Spend time getting this right. Bad duplicates = bad data forever.

6. **UX > Features**: A fast, simple registration form beats a feature-rich slow one.

7. **Mobile First**: Many receptionists use tablets. Design for touch.

8. **Offline Support**: Consider offline mode for unreliable internet (Phase 2).

---

Good luck with implementation! 🚀
