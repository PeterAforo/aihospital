# EMR/Clinical Consultation Module - Implementation Guide

## 🎯 Implementation Overview

**Module Position:** Core clinical documentation - where doctors practice medicine  
**Implementation Time:** 3-4 weeks  
**Complexity:** HIGH - Most complex module (but most important!)  
**Impact:** CRITICAL - Heart of the clinical system  

---

## 📋 QUICK START

```
I'm building an EMR/Clinical Consultation module for a hospital management system in Ghana based on emr_consultation_module_implementation.json.

This is where doctors document patient encounters using SOAP format (Subjective, Objective, Assessment, Plan), assign ICD-10 diagnoses, order tests, and create treatment plans.

Key features:
- SOAP note documentation
- ICD-10 diagnosis coding (required for NHIS claims)
- Clinical decision support (allergy alerts, drug interactions)
- Lab/radiology orders
- Problem list management
- Ghana-specific disease templates (malaria, hypertension, diabetes)

Let's build this step by step, starting with the database schema.

Ready to begin?
```

---

## 📊 ARCHITECTURE OVERVIEW

```
Clinical Encounter Workflow:

Doctor calls patient from queue
         ↓
Opens new encounter
         ↓
Reviews patient context:
- Vital signs (from triage)
- Allergies (RED ALERT if present)
- Problem list
- Current medications
- Recent encounters
         ↓
Documents SOAP note:
[S] Subjective - Patient's story
[O] Objective - Exam findings
[A] Assessment - Diagnoses (ICD-10)
[P] Plan - Treatment, orders, follow-up
         ↓
Orders tests (Lab/Radiology)
         ↓
Writes prescriptions
         ↓
Completes & signs encounter
         ↓
Triggers billing & next steps
```

**SOAP Structure:**
```
┌─────────────────────────────────────────┐
│ S - SUBJECTIVE (Patient's words)        │
│  • Chief Complaint                      │
│  • History of Present Illness (HPI)    │
│  • Review of Systems (ROS)              │
│  • Past Medical History                 │
│  • Medications, Allergies               │
│  • Social/Family History                │
├─────────────────────────────────────────┤
│ O - OBJECTIVE (Measurable findings)     │
│  • Vital Signs (from triage)            │
│  • Physical Examination                 │
│  • Lab Results                          │
│  • Imaging Results                      │
├─────────────────────────────────────────┤
│ A - ASSESSMENT (Clinical judgment)      │
│  • Clinical Impression                  │
│  • Diagnoses (ICD-10 coded)             │
│  • Differential Diagnoses               │
│  • Problem List                         │
├─────────────────────────────────────────┤
│ P - PLAN (What to do)                   │
│  • Treatment Plan                       │
│  • Orders (Lab/Radiology)               │
│  • Prescriptions                        │
│  • Patient Education                    │
│  • Follow-up Plan                       │
│  • Disposition                          │
└─────────────────────────────────────────┘
```

---

## STEP 1: Database Schema

### Windsurf Prompt:
```
Based on emr_consultation_module_implementation.json, create the complete Prisma database schema for the EMR/Clinical Consultation module.

Include these tables:

1. **clinical_encounters** - Main encounter/visit record
2. **encounter_diagnoses** - ICD-10 diagnoses linked to encounters
3. **problem_list** - Patient's active/chronic problems (persists across encounters)
4. **lab_orders** - Laboratory test orders
5. **radiology_orders** - Imaging orders
6. **icd10_codes** - Master ICD-10 code lookup table
7. **encounter_notes_history** - Audit trail of edits

Key requirements:

**clinical_encounters table:**
- Link to patient, appointment, doctor
- SOAP sections: chief_complaint, history_present_illness, review_of_systems (JSONB), physical_examination (JSONB)
- Clinical impression, differential diagnoses (array)
- Treatment plan, patient education, follow-up plan
- Template used, status (in_progress/completed/signed)
- Timestamps: started_at, completed_at, signed_at
- Billing integration fields
- Unique constraint: One active encounter per appointment

**encounter_diagnoses table:**
- Link to encounter
- ICD-10 code + description
- Type: primary (only one) or secondary (multiple)
- Status: active, resolved, chronic
- Onset/resolved dates
- Rank (1 for primary, 2,3,4... for secondary)

**problem_list table:**
- Patient's chronic/active problems
- Persists across encounters
- ICD-10 code + description
- Status: active, resolved, inactive
- Onset/resolved dates
- Track who added and from which encounter

**lab_orders & radiology_orders:**
- Link to encounter + patient
- Ordered by (doctor)
- Test/study details
- Urgency (routine/urgent/stat)
- Clinical indication
- Status workflow (pending → collected → resulted)

**icd10_codes table:**
- Master lookup table
- Code (PK), description
- Chapter (1-22), category
- is_common_ghana flag
- Synonyms array for search
- Full-text search index on description

**Validation:**
- Encounter must have at least one diagnosis before completing
- Only one primary diagnosis per encounter
- Signed encounters cannot be edited (only addendum)

**Indexes:**
- patient_id + encounter_date (DESC)
- doctor_id + encounter_date
- appointment_id
- status
- ICD-10 code search (full-text)

Create:
1. schema.prisma file with all tables and relations
2. Migration file
3. Seed file with:
   - 500 most common ICD-10 codes
   - Ghana-specific diagnoses (malaria, hypertension, diabetes, typhoid, sickle cell)
   - Common disease synonyms for search
   - 10 sample encounters with diagnoses

Location: backend/prisma/
```

---

## STEP 2: ICD-10 Search Service

### Windsurf Prompt:
```
Create a comprehensive ICD-10 diagnosis search service with intelligent autocomplete.

Based on emr_consultation_module_implementation.json icd10_diagnosis_system:

File: src/services/icd10-search.service.ts

Features needed:

1. **search(query: string, options?)**
```typescript
interface ICD10SearchOptions {
  limit?: number; // Default 10
  ghanaCommonOnly?: boolean; // Prioritize Ghana diagnoses
  chapter?: number; // Filter by ICD-10 chapter
}

interface ICD10SearchResult {
  code: string;
  description: string;
  chapter: number;
  isCommonGhana: boolean;
  synonyms: string[];
  relevanceScore: number;
}

// Search logic:
// 1. Full-text search on description + synonyms
// 2. Boost Ghana common diagnoses (2x score)
// 3. Exact code match = highest priority
// 4. Prefix match on description = high priority
// 5. Contains match = medium priority
// 6. Fuzzy match on synonyms = low priority
// 7. Sort by relevance score DESC
// 8. Return top N results
```

2. **getByCode(code: string)**
```typescript
// Lookup specific ICD-10 code
// Used when doctor types "I10" directly
```

3. **getCommonGhanaDiagnoses()**
```typescript
// Return pre-curated list of most common diagnoses in Ghana
// Malaria (B50.9), Hypertension (I10), Diabetes (E11.9), etc.
// Used for quick selection dropdown
```

4. **getFavoritesForDoctor(doctorId: string)**
```typescript
// Return doctor's 20 most frequently used diagnoses
// Query encounter_diagnoses grouped by doctor, ordered by count
// Cache for 24 hours
```

5. **getRecentlyUsedByDoctor(doctorId: string)**
```typescript
// Last 20 diagnoses used by this doctor
// Query encounter_diagnoses where ordered_by = doctorId
// Order by created_at DESC
```

6. **suggestBasedOnChiefComplaint(chiefComplaint: string)**
```typescript
// Keyword-based diagnosis suggestions
// Examples:
// "fever" → Malaria (B50.9), Typhoid (A01.0), Pneumonia (J18.9)
// "chest pain" → Acute MI (I21.9), Angina (I20.9)
// "headache" → Migraine (G43.9), Tension headache (G44.2)

// Implementation:
const keywords = {
  'fever': ['B50.9', 'A01.0', 'J18.9'],
  'chest pain': ['I21.9', 'I20.9', 'R07.9'],
  'headache': ['G43.9', 'G44.2', 'R51']
  // ... extensive keyword map
};
```

**Search Algorithm Example:**
```typescript
async search(query: string, options: ICD10SearchOptions = {}) {
  const { limit = 10, ghanaCommonOnly = false } = options;
  
  // Exact code match
  if (/^[A-Z]\d{2}/.test(query)) {
    const exact = await this.getByCode(query);
    if (exact) return [exact];
  }
  
  // Full-text search
  const results = await prisma.$queryRaw`
    SELECT 
      code,
      description,
      chapter,
      is_common_ghana as "isCommonGhana",
      synonyms,
      ts_rank(
        to_tsvector('english', description || ' ' || array_to_string(synonyms, ' ')),
        plainto_tsquery('english', ${query})
      ) * CASE WHEN is_common_ghana THEN 2.0 ELSE 1.0 END as relevance_score
    FROM icd10_codes
    WHERE 
      to_tsvector('english', description || ' ' || array_to_string(synonyms, ' '))
      @@ plainto_tsquery('english', ${query})
      ${ghanaCommonOnly ? Prisma.sql`AND is_common_ghana = true` : Prisma.empty}
    ORDER BY relevance_score DESC
    LIMIT ${limit}
  `;
  
  return results;
}
```

**Testing:**
```typescript
// Test cases
describe('ICD10SearchService', () => {
  it('should find malaria by code', async () => {
    const results = await service.search('B50.9');
    expect(results[0].description).toContain('malaria');
  });
  
  it('should find hypertension by keyword', async () => {
    const results = await service.search('high blood pressure');
    expect(results.some(r => r.code === 'I10')).toBe(true);
  });
  
  it('should prioritize Ghana common diagnoses', async () => {
    const results = await service.search('fever', { ghanaCommonOnly: true });
    expect(results[0].isCommonGhana).toBe(true);
  });
});
```

Integration:
- Used by GET /api/icd10/search endpoint
- Used in frontend autocomplete widget
- Cache frequently searched terms (Redis)

Files to create:
- src/services/icd10-search.service.ts
- src/services/icd10-search.service.test.ts
```

---

## STEP 3: Encounter CRUD APIs

### Windsurf Prompt:
```
Create all clinical encounter management API endpoints.

Based on emr_consultation_module_implementation.json api_endpoints:

Endpoints to implement:

1. **POST /api/encounters**
   - Create new encounter
   - Input: patientId, appointmentId (optional), encounterType, template (optional)
   - Logic:
     * Create encounter with status = IN_PROGRESS
     * If appointmentId: link and update appointment.status = IN_PROGRESS
     * Pull patient context: allergies, medications, problem list, recent vitals from triage
     * If template specified: pre-populate fields
   - Return: encounter + patient_context

2. **GET /api/encounters/:id**
   - Get complete encounter
   - Include: encounter, diagnoses, orders (lab + radiology), patient, doctor
   - Join with encounter_diagnoses, lab_orders, radiology_orders

3. **PUT /api/encounters/:id**
   - Update encounter documentation
   - Input: Any SOAP fields (chiefComplaint, HPI, ROS, physical exam, etc.)
   - Validation: Cannot edit if status = SIGNED
   - Auto-save functionality: Accept partial updates
   - Audit: If COMPLETED, log changes in encounter_notes_history

4. **POST /api/encounters/:id/diagnoses**
   - Add ICD-10 diagnosis to encounter
   - Input: { icd10Code, icd10Description, diagnosisType: 'primary'|'secondary', status, notes }
   - Validation:
     * Only one primary diagnosis
     * ICD-10 code must exist in icd10_codes table
     * Age/gender appropriateness check (e.g., pregnancy code for male)
   - Side effects:
     * If chronic disease: Auto-add to problem_list
     * If NHIS diagnosis: Flag for billing

5. **DELETE /api/encounters/:id/diagnoses/:diagnosisId**
   - Remove diagnosis from encounter
   - If primary diagnosis removed: Must add new primary

6. **POST /api/encounters/:id/complete**
   - Mark encounter as completed
   - Validation:
     * Must have ≥1 diagnosis
     * Disposition must be set
     * Required SOAP sections filled (configurable)
   - Side effects:
     * status = COMPLETED
     * completed_at = NOW()
     * appointment.status = COMPLETED
     * Calculate duration: completed_at - started_at
     * Trigger billing (create invoice)
     * If prescriptions: send to pharmacy queue
     * If orders: send to lab/radiology queue

7. **POST /api/encounters/:id/sign**
   - Legally sign encounter (doctor attestation)
   - Effect:
     * status = SIGNED
     * signed_at = NOW(), signed_by = current doctor
     * Lock encounter (immutable, cannot edit)
     * Generate clinical summary PDF
   - Note: After signing, only addendum can be added

8. **GET /api/encounters/patient/:patientId**
   - List all encounters for a patient
   - Query params: limit, status, date_from, date_to
   - Return: Array of encounters with diagnoses
   - Sort: encounter_date DESC (most recent first)

9. **GET /api/icd10/search**
   - Search ICD-10 codes (uses ICD10SearchService from Step 2)
   - Query params: q (query), limit
   - Return: Array of matching codes with relevance score

10. **POST /api/encounters/:id/orders/lab**
    - Create lab order from encounter
    - Input: { testName, testCode, urgency, clinicalIndication, specimenType }
    - Create record in lab_orders table
    - Status = PENDING
    - Notify lab if urgent/stat

11. **POST /api/encounters/:id/orders/radiology**
    - Create radiology order
    - Input: { studyType, bodyPart, laterality, urgency, clinicalIndication }
    - Create record in radiology_orders table

12. **GET /api/encounters/:id/summary**
    - Generate clinical summary PDF
    - Content: Patient demographics, visit date, diagnoses, prescriptions, follow-up
    - Use PDF library (e.g., PDFKit or Puppeteer)
    - Return: PDF file download

**Business Logic Requirements:**

Auto-save mechanism:
```typescript
// Frontend sends PUT /api/encounters/:id every 2 minutes with latest changes
// Backend updates encounter without changing status
// Store draft state to prevent data loss
```

Encounter completion workflow:
```typescript
async completeEncounter(encounterId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate
    const encounter = await tx.clinical_encounters.findUnique({
      where: { id: encounterId },
      include: { diagnoses: true }
    });
    
    if (encounter.diagnoses.length === 0) {
      throw new Error('At least one diagnosis required');
    }
    
    if (!encounter.disposition) {
      throw new Error('Disposition required');
    }
    
    // 2. Update encounter
    await tx.clinical_encounters.update({
      where: { id: encounterId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        encounter_duration_minutes: calculateDuration(encounter.started_at)
      }
    });
    
    // 3. Update appointment
    if (encounter.appointment_id) {
      await tx.appointments.update({
        where: { id: encounter.appointment_id },
        data: { status: 'COMPLETED' }
      });
    }
    
    // 4. Trigger billing (to be implemented)
    // await billingService.createInvoiceFromEncounter(encounterId);
    
    return encounter;
  });
}
```

Files to create:
- src/routes/encounter.routes.ts
- src/controllers/encounter.controller.ts
- src/services/encounter.service.ts
- src/dtos/encounter.dto.ts
- src/services/encounter-completion.service.ts
```

---

## STEP 4: Clinical Decision Support System

### Windsurf Prompt:
```
Create a clinical decision support system with real-time alerts for drug allergies, interactions, and clinical guidelines.

Based on emr_consultation_module_implementation.json clinical_decision_support:

File: src/services/clinical-decision-support.service.ts

Implement these alert systems:

1. **checkDrugAllergy(patientId, medicationName)**
```typescript
interface AllergyAlert {
  severity: 'critical' | 'warning';
  allergen: string;
  reaction: string;
  message: string;
  canOverride: boolean;
}

// Logic:
// - Get patient allergies from patient.allergies table
// - Check if medication or drug class matches allergy
// - Examples:
//   * Patient allergic to "Penicillin" → Block Amoxicillin, Ampicillin
//   * Patient allergic to "Sulfa drugs" → Block Sulfamethoxazole
// - Return critical alert (cannot override)
```

2. **checkDrugInteractions(patientId, newMedication)**
```typescript
interface DrugInteraction {
  severity: 'major' | 'moderate' | 'minor';
  drug1: string;
  drug2: string;
  interaction: string;
  clinicalEffect: string;
  recommendation: string;
  canOverride: boolean;
}

// Drug interaction database
// For Phase 1: Implement common critical interactions
const CRITICAL_INTERACTIONS = {
  'warfarin': {
    'aspirin': {
      severity: 'major',
      effect: 'Increased bleeding risk',
      recommendation: 'Monitor INR closely'
    },
    'nsaids': {
      severity: 'major',
      effect: 'Increased bleeding risk'
    }
  },
  'metformin': {
    'contrast_dye': {
      severity: 'major',
      effect: 'Risk of lactic acidosis',
      recommendation: 'Hold metformin 48 hours before/after contrast'
    }
  },
  'ace_inhibitors': {
    'potassium_supplements': {
      severity: 'moderate',
      effect: 'Hyperkalemia risk',
      recommendation: 'Monitor potassium levels'
    }
  }
  // ... expand with most critical interactions
};

// For Phase 2: Integrate with commercial drug interaction database
```

3. **checkDuplicateTherapy(patientId, newMedication)**
```typescript
// Check if patient already on drug from same class
// Example: Already on Lisinopril (ACE-I) → Adding Enalapril (also ACE-I)
// Return warning (can override with clinical justification)
```

4. **checkAbnormalVitals(vitalSigns, chiefComplaint?)**
```typescript
interface VitalSignAlert {
  vital: string;
  value: number;
  normalRange: string;
  severity: 'critical' | 'warning';
  suggestedDiagnoses: string[]; // ICD-10 codes
  clinicalAction: string;
}

// Examples:
// BP 180/110 → {
//   severity: 'critical',
//   suggestedDiagnoses: ['I10 - Hypertension', 'I16.9 - Hypertensive crisis'],
//   clinicalAction: 'Consider admission, antihypertensive therapy'
// }
//
// SpO2 85% → {
//   severity: 'critical',
//   suggestedDiagnoses: ['J18.9 - Pneumonia', 'J96.9 - Respiratory failure'],
//   clinicalAction: 'Oxygen therapy, chest X-ray'
// }
```

5. **checkPreventiveCare(patientId)**
```typescript
interface PreventiveCareReminder {
  screening: string;
  dueDate: Date;
  lastPerformed: Date | null;
  ageGuideline: string;
  recommendation: string;
}

// Age and gender-based screening reminders
// Examples:
// - Women 25-65: Cervical cancer screening (Pap smear) every 3 years
// - Adults >45: Diabetes screening every 3 years
// - Adults >50: Colorectal cancer screening
// - Hypertensive patients: Annual renal function, lipid panel
```

6. **Ghana-specific clinical alerts**
```typescript
// High fever + headache in Ghana → Suggest malaria test
if (vitalSigns.temperature > 38.5 && chiefComplaint.includes('headache')) {
  return {
    alert: 'Possible malaria',
    suggestedTest: 'Malaria RDT',
    icd10: 'B50.9'
  };
}

// Pregnant woman with BP >140/90 → Pre-eclampsia alert
if (isPregnant && vitalSigns.bpSystolic > 140) {
  return {
    alert: 'Pre-eclampsia risk',
    action: 'Urgent obstetric evaluation',
    icd10: 'O14.9'
  };
}
```

**Integration with Prescription Module:**
```typescript
// Called before finalizing prescription
async validatePrescription(patientId: string, medication: Medication) {
  const alerts = [];
  
  // 1. Allergy check (CRITICAL)
  const allergyAlert = await this.checkDrugAllergy(patientId, medication.name);
  if (allergyAlert) {
    alerts.push(allergyAlert);
    // Block prescription if critical allergy
    if (!allergyAlert.canOverride) {
      throw new Error(`ALLERGY ALERT: ${allergyAlert.message}`);
    }
  }
  
  // 2. Drug interaction check
  const interactions = await this.checkDrugInteractions(patientId, medication.name);
  alerts.push(...interactions);
  
  // 3. Duplicate therapy check
  const duplicate = await this.checkDuplicateTherapy(patientId, medication.name);
  if (duplicate) alerts.push(duplicate);
  
  return {
    canPrescribe: alerts.every(a => a.canOverride || a.severity !== 'critical'),
    alerts
  };
}
```

**Display in UI:**
```typescript
// Critical alerts: Red modal, must acknowledge
// Warning alerts: Yellow banner, can proceed
// Info alerts: Blue notice
```

Files to create:
- src/services/clinical-decision-support.service.ts
- src/data/drug-interactions.ts (interaction database)
- src/data/drug-allergies-map.ts (drug class mappings)
- src/services/clinical-decision-support.service.test.ts
```

---

## STEP 5: Frontend - Encounter Workspace

### Windsurf Prompt:
```
Create the main clinical encounter workspace where doctors document patient visits.

Component: EncounterWorkspace

Route: /encounters/:encounterId
Users: Doctors

Layout (3-column):
```
┌──────────────────────────────────────────────────────────┐
│  [MediCare]  Dr. Mensah  [Patient: Kwame]  [Save] [Complete] │
├────────────┬──────────────────────────┬──────────────────┤
│  PATIENT   │    SOAP NOTE EDITOR      │   ACTIONS        │
│  CONTEXT   │         (Main)           │   (Right)        │
│  (20%)     │         (60%)            │   (20%)          │
│            │                          │                  │
│ 📸 Photo   │  [Subjective] [Objective]│  DIAGNOSES       │
│ Kwame M.   │  [Assessment] [Plan]     │  + Add ICD-10    │
│ 45M        │                          │  □ I10 - HTN     │
│ MRN-001    │  ┌─ Subjective Tab ────┐ │  □ E11.9 - DM    │
│            │  │                      │ │                  │
│ ⚠️ ALLERGY │  │ Chief Complaint:     │ │  ORDERS          │
│ Penicillin │  │ [Fever for 3 days]   │ │  + Lab Order     │
│            │  │                      │ │  + Radiology     │
│ VITALS     │  │ HPI:                 │ │  □ CBC - Pending │
│ BP: 140/90 │  │ [Patient reports...] │ │  □ Malaria test  │
│ Temp: 38.2 │  │                      │ │                  │
│ HR: 88     │  │ Review of Systems:   │ │  PRESCRIPTIONS   │
│            │  │ ☑ Fever              │ │  + New Rx        │
│ PROBLEMS   │  │ ☑ Chills             │ │  □ ACT tabs      │
│ • HTN      │  │ ☐ Cough              │ │  □ Paracetamol   │
│ • DM       │  │ ...                  │ │                  │
│            │  └──────────────────────┘ │  [Complete Visit]│
└────────────┴──────────────────────────┴──────────────────┘
```

Implementation:

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout, Tabs, Button, message } from 'antd';

const { Sider, Content } = Layout;

export const EncounterWorkspace: React.FC = () => {
  const { encounterId } = useParams();
  const [activeTab, setActiveTab] = useState('subjective');
  const [encounterData, setEncounterData] = useState<Encounter | null>(null);
  
  // Fetch encounter
  const { data: encounter, isLoading } = useQuery(
    ['encounter', encounterId],
    () => fetchEncounter(encounterId)
  );
  
  // Auto-save every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (encounterData && encounterData.status === 'IN_PROGRESS') {
        saveEncounterDraft(encounterData);
      }
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [encounterData]);
  
  // Complete encounter mutation
  const completeEncounter = useMutation(
    () => completeEncounterAPI(encounterId),
    {
      onSuccess: () => {
        message.success('Encounter completed successfully!');
        // Navigate to patient list or next patient
      },
      onError: (error: any) => {
        message.error(error.message || 'Failed to complete encounter');
      }
    }
  );
  
  const handleComplete = async () => {
    // Validate
    if (!encounter.diagnoses || encounter.diagnoses.length === 0) {
      message.error('Please add at least one diagnosis');
      return;
    }
    
    if (!encounter.disposition) {
      message.error('Please set patient disposition');
      return;
    }
    
    // Confirm
    Modal.confirm({
      title: 'Complete Encounter?',
      content: 'This will finalize the visit and trigger billing. Continue?',
      onOk: () => completeEncounter.mutate()
    });
  };
  
  if (isLoading) return <Spin size="large" />;
  
  return (
    <Layout className="encounter-workspace" style={{ height: '100vh' }}>
      {/* Top Bar */}
      <div className="encounter-header">
        <Space>
          <Avatar src={encounter.patient.photo} />
          <Text strong>{encounter.patient.firstName} {encounter.patient.lastName}</Text>
          <Tag>{encounter.patient.mrn}</Tag>
        </Space>
        <Space>
          <Button onClick={saveEncounterDraft}>Save Draft</Button>
          <Button type="primary" onClick={handleComplete}>
            Complete Encounter
          </Button>
        </Space>
      </div>
      
      <Layout>
        {/* Left Sidebar - Patient Context */}
        <Sider width="20%" theme="light">
          <PatientContextPanel
            patient={encounter.patient}
            allergies={encounter.patient_context.allergies}
            problemList={encounter.patient_context.problem_list}
            vitals={encounter.patient_context.recent_vitals}
            medications={encounter.patient_context.current_medications}
          />
        </Sider>
        
        {/* Main Content - SOAP Editor */}
        <Content style={{ padding: 24 }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="Subjective" key="subjective">
              <SubjectiveTab
                data={encounter}
                onChange={setEncounterData}
              />
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="Objective" key="objective">
              <ObjectiveTab
                data={encounter}
                vitals={encounter.patient_context.recent_vitals}
                onChange={setEncounterData}
              />
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="Assessment" key="assessment">
              <AssessmentTab
                data={encounter}
                onChange={setEncounterData}
              />
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="Plan" key="plan">
              <PlanTab
                data={encounter}
                onChange={setEncounterData}
              />
            </Tabs.TabPane>
          </Tabs>
        </Content>
        
        {/* Right Sidebar - Actions */}
        <Sider width="20%" theme="light">
          <DiagnosesPanel
            encounterId={encounterId}
            diagnoses={encounter.diagnoses}
          />
          
          <OrdersPanel
            encounterId={encounterId}
            labOrders={encounter.orders.lab}
            radiologyOrders={encounter.orders.radiology}
          />
          
          <PrescriptionsPanel
            encounterId={encounterId}
            prescriptions={encounter.prescriptions}
          />
        </Sider>
      </Layout>
    </Layout>
  );
};
```

Features to implement:
- Auto-save every 2 minutes (visual indicator)
- Unsaved changes warning if navigating away
- Keyboard shortcuts (Ctrl+S to save, Ctrl+Enter to complete)
- Smart templates (pre-fill based on encounter type)
- Copy forward (import from previous encounter)
- Clinical decision support alerts (displayed as modals/banners)

Components:
- src/pages/encounters/EncounterWorkspace.tsx
- src/components/encounters/PatientContextPanel.tsx
- src/components/encounters/SubjectiveTab.tsx
- src/components/encounters/ObjectiveTab.tsx
- src/components/encounters/AssessmentTab.tsx
- src/components/encounters/PlanTab.tsx
- src/components/encounters/DiagnosesPanel.tsx
- src/components/encounters/OrdersPanel.tsx
```

---

## STEP 6: Frontend - ICD-10 Search Widget

### Windsurf Prompt:
```
Create an intelligent ICD-10 diagnosis search and selection widget.

Component: ICD10SearchWidget

Used in: DiagnosesPanel (right sidebar of encounter workspace)

Features:
- Real-time autocomplete search
- Quick access to favorites, recent, and Ghana common diagnoses
- Select primary vs secondary
- Add to problem list option
- Visual display of selected diagnoses

Implementation:

```tsx
import React, { useState } from 'react';
import { AutoComplete, Button, Radio, Checkbox, Tag, List } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import debounce from 'lodash/debounce';

interface ICD10SearchWidgetProps {
  encounterId: string;
  selectedDiagnoses: Diagnosis[];
  onDiagnosisAdded: () => void;
}

export const ICD10SearchWidget: React.FC<ICD10SearchWidgetProps> = ({
  encounterId,
  selectedDiagnoses,
  onDiagnosisAdded
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ICD10Code[]>([]);
  const [selectedCode, setSelectedCode] = useState<ICD10Code | null>(null);
  const [diagnosisType, setDiagnosisType] = useState<'primary' | 'secondary'>('primary');
  const [addToProblemList, setAddToProblemList] = useState(false);
  
  // Search ICD-10 codes
  const searchICD10 = debounce(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const results = await fetchICD10Codes(query);
    setSearchResults(results);
  }, 300);
  
  // Quick access queries
  const { data: favorites } = useQuery(
    ['icd10-favorites'],
    () => fetchDoctorFavorites()
  );
  
  const { data: recent } = useQuery(
    ['icd10-recent'],
    () => fetchRecentlyUsed()
  );
  
  const { data: ghanaCommon } = useQuery(
    ['icd10-ghana-common'],
    () => fetchGhanaCommonDiagnoses()
  );
  
  // Add diagnosis mutation
  const addDiagnosis = useMutation(
    (data: AddDiagnosisRequest) => addDiagnosisToEncounter(encounterId, data),
    {
      onSuccess: () => {
        message.success('Diagnosis added');
        setSearchQuery('');
        setSelectedCode(null);
        onDiagnosisAdded();
      },
      onError: (error: any) => {
        message.error(error.message);
      }
    }
  );
  
  const handleAddDiagnosis = () => {
    if (!selectedCode) {
      message.warning('Please select a diagnosis code');
      return;
    }
    
    // Check if primary diagnosis already exists
    if (diagnosisType === 'primary' && selectedDiagnoses.some(d => d.diagnosisType === 'primary')) {
      message.error('Primary diagnosis already exists. Remove it first or select as secondary.');
      return;
    }
    
    addDiagnosis.mutate({
      icd10Code: selectedCode.code,
      icd10Description: selectedCode.description,
      diagnosisType,
      status: 'active',
      addToProblemList
    });
  };
  
  // Remove diagnosis
  const removeDiagnosis = useMutation(
    (diagnosisId: string) => removeDiagnosisFromEncounter(encounterId, diagnosisId),
    {
      onSuccess: () => {
        message.success('Diagnosis removed');
        onDiagnosisAdded();
      }
    }
  );
  
  return (
    <Card title="Diagnoses (ICD-10)" size="small">
      {/* Search */}
      <AutoComplete
        value={searchQuery}
        onChange={(value) => {
          setSearchQuery(value);
          searchICD10(value);
        }}
        onSelect={(value, option) => {
          setSelectedCode(option.data);
        }}
        options={searchResults.map(code => ({
          value: code.code,
          label: (
            <div>
              <Tag color="blue">{code.code}</Tag>
              <span>{code.description}</span>
              {code.isCommonGhana && <Tag color="green">Ghana</Tag>}
            </div>
          ),
          data: code
        }))}
        placeholder="Search ICD-10 (e.g., 'malaria' or 'B50.9')"
        style={{ width: '100%', marginBottom: 12 }}
        prefix={<SearchOutlined />}
      />
      
      {/* Selected Code Preview */}
      {selectedCode && (
        <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f0f9ff' }}>
          <Text strong>{selectedCode.code}</Text>
          <Paragraph style={{ fontSize: 12, marginBottom: 8 }}>
            {selectedCode.description}
          </Paragraph>
          
          <Radio.Group
            value={diagnosisType}
            onChange={(e) => setDiagnosisType(e.target.value)}
            size="small"
          >
            <Radio.Button value="primary">Primary</Radio.Button>
            <Radio.Button value="secondary">Secondary</Radio.Button>
          </Radio.Group>
          
          <Checkbox
            checked={addToProblemList}
            onChange={(e) => setAddToProblemList(e.target.checked)}
            style={{ marginLeft: 8 }}
          >
            Add to problem list
          </Checkbox>
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddDiagnosis}
            loading={addDiagnosis.isLoading}
            style={{ marginTop: 8, width: '100%' }}
          >
            Add Diagnosis
          </Button>
        </Card>
      )}
      
      {/* Quick Access Tabs */}
      <Tabs size="small">
        <Tabs.TabPane tab="Favorites" key="favorites">
          <List
            size="small"
            dataSource={favorites}
            renderItem={(code) => (
              <List.Item
                onClick={() => setSelectedCode(code)}
                style={{ cursor: 'pointer' }}
              >
                <Tag color="blue">{code.code}</Tag>
                <Text ellipsis>{code.description}</Text>
              </List.Item>
            )}
          />
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="Recent" key="recent">
          <List
            size="small"
            dataSource={recent}
            renderItem={(code) => (
              <List.Item
                onClick={() => setSelectedCode(code)}
                style={{ cursor: 'pointer' }}
              >
                <Tag color="blue">{code.code}</Tag>
                <Text ellipsis>{code.description}</Text>
              </List.Item>
            )}
          />
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="Ghana Common" key="ghana">
          <List
            size="small"
            dataSource={ghanaCommon}
            renderItem={(code) => (
              <List.Item
                onClick={() => setSelectedCode(code)}
                style={{ cursor: 'pointer' }}
              >
                <Tag color="green">{code.code}</Tag>
                <Text ellipsis>{code.description}</Text>
              </List.Item>
            )}
          />
        </Tabs.TabPane>
      </Tabs>
      
      {/* Selected Diagnoses */}
      <Divider>Selected Diagnoses</Divider>
      <List
        dataSource={selectedDiagnoses}
        renderItem={(diagnosis) => (
          <List.Item
            actions={[
              <Button
                type="text"
                danger
                size="small"
                onClick={() => removeDiagnosis.mutate(diagnosis.id)}
              >
                Remove
              </Button>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Tag color={diagnosis.diagnosisType === 'primary' ? 'red' : 'blue'}>
                    {diagnosis.diagnosisType === 'primary' ? '1°' : '2°'}
                  </Tag>
                  <Tag>{diagnosis.icd10Code}</Tag>
                  {diagnosis.status === 'chronic' && <Tag color="orange">Chronic</Tag>}
                </Space>
              }
              description={diagnosis.icd10Description}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
```

Features:
- Debounced search (300ms)
- Autocomplete with visual code display
- Quick tabs (Favorites, Recent, Ghana Common)
- Primary/secondary selection
- Add to problem list option
- Selected diagnoses list with remove action
- Visual distinction (primary = red tag, secondary = blue tag)

Component: src/components/encounters/ICD10SearchWidget.tsx
```

---

## STEP 7: Frontend - Physical Examination Builder

### Windsurf Prompt:
```
Create a structured physical examination documentation component with system-based templates.

Component: PhysicalExaminationBuilder

Used in: ObjectiveTab

Features:
- Select which body systems to examine
- Normal/Abnormal toggle per system
- Pre-filled normal templates
- Free text for abnormal findings
- Smart defaults based on chief complaint

Implementation:

```tsx
import React, { useState } from 'react';
import { Card, Collapse, Radio, Input, Checkbox, Space } from 'antd';

const { Panel } = Collapse;
const { TextArea } = Input;

interface PhysicalExamSystem {
  system: string;
  isNormal: boolean;
  findings: string;
  normalTemplate: string;
}

const EXAM_SYSTEMS = [
  {
    system: 'General Appearance',
    normalTemplate: 'Well-appearing, in no acute distress, alert and oriented x3'
  },
  {
    system: 'HEENT',
    normalTemplate: 'Normocephalic, atraumatic. PERRLA. Conjunctiva clear. TMs intact. Oropharynx clear. Neck supple, no lymphadenopathy.'
  },
  {
    system: 'Cardiovascular',
    normalTemplate: 'Regular rate and rhythm. S1, S2 normal. No murmurs, rubs, or gallops. Pulses 2+ bilaterally. No edema.'
  },
  {
    system: 'Respiratory',
    normalTemplate: 'No respiratory distress. Chest expansion symmetrical. Clear to auscultation bilaterally. No wheezes, rales, or rhonchi.'
  },
  {
    system: 'Abdomen',
    normalTemplate: 'Soft, flat, non-tender, non-distended. Bowel sounds present and normal. No hepatosplenomegaly. No masses.'
  },
  {
    system: 'Musculoskeletal',
    normalTemplate: 'Normal gait. Full range of motion all joints. No swelling, erythema, or tenderness. Strength 5/5 all extremities.'
  },
  {
    system: 'Neurological',
    normalTemplate: 'Alert and oriented x3. Cranial nerves II-XII grossly intact. Motor 5/5. Sensory intact to light touch. Reflexes 2+ symmetric. Gait normal.'
  },
  {
    system: 'Skin',
    normalTemplate: 'Warm, dry, intact. No rash, lesions, or color changes. Normal turgor.'
  }
];

export const PhysicalExaminationBuilder: React.FC<{
  value: PhysicalExamSystem[];
  onChange: (systems: PhysicalExamSystem[]) => void;
  chiefComplaint?: string;
}> = ({ value, onChange, chiefComplaint }) => {
  // Smart defaults based on chief complaint
  const getRelevantSystems = (complaint: string): string[] => {
    const keywords: Record<string, string[]> = {
      'chest pain': ['Cardiovascular', 'Respiratory'],
      'fever': ['General Appearance', 'HEENT', 'Respiratory'],
      'headache': ['General Appearance', 'HEENT', 'Neurological'],
      'abdominal pain': ['Abdomen'],
      'cough': ['Respiratory'],
      // ... more mappings
    };
    
    for (const [key, systems] of Object.entries(keywords)) {
      if (complaint?.toLowerCase().includes(key)) {
        return systems;
      }
    }
    
    return ['General Appearance']; // Default
  };
  
  const [examSystems, setExamSystems] = useState<PhysicalExamSystem[]>(
    value || EXAM_SYSTEMS.map(s => ({
      ...s,
      isNormal: true,
      findings: s.normalTemplate
    }))
  );
  
  const handleSystemToggle = (index: number, isNormal: boolean) => {
    const updated = [...examSystems];
    updated[index] = {
      ...updated[index],
      isNormal,
      findings: isNormal ? updated[index].normalTemplate : ''
    };
    setExamSystems(updated);
    onChange(updated);
  };
  
  const handleFindingsChange = (index: number, findings: string) => {
    const updated = [...examSystems];
    updated[index] = { ...updated[index], findings };
    setExamSystems(updated);
    onChange(updated);
  };
  
  return (
    <Card title="Physical Examination">
      <Collapse
        defaultActiveKey={getRelevantSystems(chiefComplaint || '')}
        expandIconPosition="end"
      >
        {EXAM_SYSTEMS.map((system, index) => (
          <Panel
            header={
              <Space>
                <strong>{system.system}</strong>
                {examSystems[index]?.isNormal ? (
                  <Tag color="green">Normal</Tag>
                ) : (
                  <Tag color="orange">Abnormal</Tag>
                )}
              </Space>
            }
            key={system.system}
          >
            <Radio.Group
              value={examSystems[index]?.isNormal}
              onChange={(e) => handleSystemToggle(index, e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <Radio value={true}>Normal</Radio>
              <Radio value={false}>Abnormal</Radio>
            </Radio.Group>
            
            <TextArea
              value={examSystems[index]?.findings}
              onChange={(e) => handleFindingsChange(index, e.target.value)}
              placeholder={examSystems[index]?.isNormal ? 
                "Normal findings..." : 
                "Describe abnormal findings..."
              }
              rows={3}
              disabled={examSystems[index]?.isNormal}
            />
            
            {examSystems[index]?.isNormal && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Default: {system.normalTemplate}
              </div>
            )}
          </Panel>
        ))}
      </Collapse>
      
      <div style={{ marginTop: 16 }}>
        <Button
          type="link"
          onClick={() => {
            // Quick "All Normal" button
            const allNormal = EXAM_SYSTEMS.map(s => ({
              ...s,
              isNormal: true,
              findings: s.normalTemplate
            }));
            setExamSystems(allNormal);
            onChange(allNormal);
          }}
        >
          Mark All Normal
        </Button>
      </div>
    </Card>
  );
};
```

Features:
- Collapsible sections per body system
- Normal/Abnormal radio toggle
- Pre-filled normal templates (disabled when normal selected)
- Free text for abnormal findings
- Smart expansion based on chief complaint
- "Mark All Normal" quick button
- Visual indicators (green = normal, orange = abnormal)

Component: src/components/encounters/PhysicalExaminationBuilder.tsx
```

---

## STEP 8: Frontend - Orders Management

### Windsurf Prompt:
```
Create lab and radiology ordering interface within the encounter.

Component: OrdersPanel

Used in: Right sidebar of encounter workspace

Features:
- Quick order entry for common tests
- Order sets (e.g., "Diabetes Workup" = HbA1c + Lipids + Creatinine)
- Search lab/radiology catalog
- Urgency selection
- Clinical indication required
- Display pending orders

Implementation:

```tsx
import React, { useState } from 'react';
import { Card, Button, Modal, Select, Input, Radio, List, Tag } from 'antd';
import { PlusOutlined, ExperimentOutlined, CameraOutlined } from '@ant-design/icons';

const LAB_TESTS = [
  { code: 'CBC', name: 'Complete Blood Count (CBC)' },
  { code: 'BMP', name: 'Basic Metabolic Panel' },
  { code: 'LFT', name: 'Liver Function Tests' },
  { code: 'LIPID', name: 'Lipid Panel' },
  { code: 'HBA1C', name: 'Hemoglobin A1c (HbA1c)' },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone' },
  { code: 'MALARIA', name: 'Malaria Rapid Diagnostic Test (RDT)' },
  { code: 'URINE', name: 'Urinalysis' },
  { code: 'STOOL', name: 'Stool Examination' }
];

const LAB_ORDER_SETS = {
  'Diabetes Workup': ['HBA1C', 'LIPID', 'BMP', 'URINE'],
  'Anemia Workup': ['CBC', 'IRON', 'B12', 'FOLATE'],
  'Hypertension Monitoring': ['BMP', 'LIPID', 'URINE'],
  'Malaria Diagnosis': ['MALARIA', 'CBC']
};

const RADIOLOGY_STUDIES = [
  { code: 'CXR', name: 'Chest X-ray' },
  { code: 'AXR', name: 'Abdominal X-ray' },
  { code: 'ABD_US', name: 'Abdominal Ultrasound' },
  { code: 'PELV_US', name: 'Pelvic Ultrasound' },
  { code: 'OBS_US', name: 'Obstetric Ultrasound' }
];

export const OrdersPanel: React.FC<{
  encounterId: string;
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
}> = ({ encounterId, labOrders, radiologyOrders }) => {
  const [showLabModal, setShowLabModal] = useState(false);
  const [showRadModal, setShowRadModal] = useState(false);
  
  // Lab order form
  const [labOrderForm, setLabOrderForm] = useState({
    tests: [] as string[],
    urgency: 'routine' as 'routine' | 'urgent' | 'stat',
    clinicalIndication: ''
  });
  
  // Radiology order form
  const [radOrderForm, setRadOrderForm] = useState({
    studyType: '',
    bodyPart: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'stat',
    clinicalIndication: ''
  });
  
  const createLabOrder = useMutation(
    () => createLabOrderAPI(encounterId, labOrderForm),
    {
      onSuccess: () => {
        message.success('Lab order created');
        setShowLabModal(false);
        setLabOrderForm({ tests: [], urgency: 'routine', clinicalIndication: '' });
      }
    }
  );
  
  const createRadiologyOrder = useMutation(
    () => createRadiologyOrderAPI(encounterId, radOrderForm),
    {
      onSuccess: () => {
        message.success('Radiology order created');
        setShowRadModal(false);
        setRadOrderForm({ studyType: '', bodyPart: '', urgency: 'routine', clinicalIndication: '' });
      }
    }
  );
  
  return (
    <>
      <Card
        title="Orders"
        size="small"
        extra={
          <Space>
            <Button
              type="link"
              icon={<ExperimentOutlined />}
              onClick={() => setShowLabModal(true)}
            >
              Lab
            </Button>
            <Button
              type="link"
              icon={<CameraOutlined />}
              onClick={() => setShowRadModal(true)}
            >
              Imaging
            </Button>
          </Space>
        }
      >
        {/* Lab Orders */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Lab Orders</Text>
          <List
            size="small"
            dataSource={labOrders}
            renderItem={(order) => (
              <List.Item>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong>{order.testName}</Text>
                  <Space>
                    <Tag color={
                      order.urgency === 'stat' ? 'red' :
                      order.urgency === 'urgent' ? 'orange' : 'blue'
                    }>
                      {order.urgency.toUpperCase()}
                    </Tag>
                    <Tag>{order.status}</Tag>
                  </Space>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: 'No lab orders' }}
          />
        </div>
        
        {/* Radiology Orders */}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Radiology Orders</Text>
          <List
            size="small"
            dataSource={radiologyOrders}
            renderItem={(order) => (
              <List.Item>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong>{order.studyType}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{order.bodyPart}</Text>
                  <Tag>{order.status}</Tag>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: 'No imaging orders' }}
          />
        </div>
      </Card>
      
      {/* Lab Order Modal */}
      <Modal
        title="Order Laboratory Tests"
        visible={showLabModal}
        onCancel={() => setShowLabModal(false)}
        onOk={() => createLabOrder.mutate()}
        okText="Create Order"
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="Order Set (Quick Select)">
            <Select
              placeholder="Select a common order set"
              onChange={(value) => {
                setLabOrderForm({
                  ...labOrderForm,
                  tests: LAB_ORDER_SETS[value]
                });
              }}
            >
              {Object.keys(LAB_ORDER_SETS).map(set => (
                <Select.Option key={set} value={set}>{set}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="Tests" required>
            <Select
              mode="multiple"
              placeholder="Select tests"
              value={labOrderForm.tests}
              onChange={(tests) => setLabOrderForm({ ...labOrderForm, tests })}
            >
              {LAB_TESTS.map(test => (
                <Select.Option key={test.code} value={test.code}>
                  {test.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="Urgency">
            <Radio.Group
              value={labOrderForm.urgency}
              onChange={(e) => setLabOrderForm({ ...labOrderForm, urgency: e.target.value })}
            >
              <Radio.Button value="routine">Routine</Radio.Button>
              <Radio.Button value="urgent">Urgent</Radio.Button>
              <Radio.Button value="stat">STAT</Radio.Button>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item label="Clinical Indication" required>
            <TextArea
              rows={2}
              placeholder="Why are you ordering these tests?"
              value={labOrderForm.clinicalIndication}
              onChange={(e) => setLabOrderForm({ ...labOrderForm, clinicalIndication: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Radiology Order Modal */}
      <Modal
        title="Order Imaging Study"
        visible={showRadModal}
        onCancel={() => setShowRadModal(false)}
        onOk={() => createRadiologyOrder.mutate()}
        okText="Create Order"
      >
        <Form layout="vertical">
          <Form.Item label="Study Type" required>
            <Select
              placeholder="Select imaging type"
              value={radOrderForm.studyType}
              onChange={(value) => setRadOrderForm({ ...radOrderForm, studyType: value })}
            >
              {RADIOLOGY_STUDIES.map(study => (
                <Select.Option key={study.code} value={study.code}>
                  {study.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="Body Part">
            <Input
              placeholder="e.g., Chest, Abdomen, Left knee"
              value={radOrderForm.bodyPart}
              onChange={(e) => setRadOrderForm({ ...radOrderForm, bodyPart: e.target.value })}
            />
          </Form.Item>
          
          <Form.Item label="Urgency">
            <Radio.Group
              value={radOrderForm.urgency}
              onChange={(e) => setRadOrderForm({ ...radOrderForm, urgency: e.target.value })}
            >
              <Radio.Button value="routine">Routine</Radio.Button>
              <Radio.Button value="urgent">Urgent</Radio.Button>
              <Radio.Button value="stat">STAT</Radio.Button>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item label="Clinical Indication" required>
            <TextArea
              rows={2}
              placeholder="Clinical reason for imaging"
              value={radOrderForm.clinicalIndication}
              onChange={(e) => setRadOrderForm({ ...radOrderForm, clinicalIndication: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
```

Features:
- Lab and radiology modals
- Quick order sets (pre-grouped tests)
- Multi-select for lab tests
- Urgency selection (routine/urgent/stat)
- Clinical indication required
- Display pending orders with status
- Color-coded urgency tags

Components:
- src/components/encounters/OrdersPanel.tsx
- src/components/encounters/LabOrderModal.tsx
- src/components/encounters/RadiologyOrderModal.tsx
```

---

## STEP 9: Frontend - Patient Encounter History

### Windsurf Prompt:
```
Create a timeline view of patient's clinical encounters.

Component: PatientEncounterHistory

Route: /patient/:patientId/encounters
Users: Doctors, nurses (read-only)

Features:
- Chronological list of encounters
- Expandable cards showing details
- Filter by date range, doctor, diagnosis
- Click to view full encounter

Implementation:

```tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Timeline, Card, Tag, Space, Button, DatePicker, Select } from 'antd';
import { EyeOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';

export const PatientEncounterHistory: React.FC = () => {
  const { patientId } = useParams();
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [filterDoctor, setFilterDoctor] = useState<string | null>(null);
  
  const { data: encounters, isLoading } = useQuery(
    ['patient-encounters', patientId, dateRange, filterDoctor],
    () => fetchPatientEncounters(patientId, { dateRange, doctorId: filterDoctor })
  );
  
  return (
    <div className="patient-encounter-history">
      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            placeholder={['From', 'To']}
          />
          <Select
            placeholder="Filter by doctor"
            style={{ width: 200 }}
            allowClear
            onChange={setFilterDoctor}
          >
            {/* Doctor options */}
          </Select>
        </Space>
      </Card>
      
      {/* Timeline */}
      <Timeline mode="left">
        {encounters?.map((encounter) => (
          <Timeline.Item
            key={encounter.id}
            label={
              <Space direction="vertical" size={0}>
                <Text strong>{formatDate(encounter.encounterDate)}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTime(encounter.encounterTime)}
                </Text>
              </Space>
            }
            color={encounter.status === 'SIGNED' ? 'green' : 'blue'}
          >
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="blue">{encounter.encounterType}</Tag>
                  <Text>{encounter.chiefComplaint}</Text>
                </Space>
              }
              extra={
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/encounters/${encounter.id}`)}
                >
                  View
                </Button>
              }
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {/* Doctor */}
                <Space>
                  <UserOutlined />
                  <Text>Dr. {encounter.doctor.lastName}</Text>
                </Space>
                
                {/* Diagnoses */}
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Diagnoses:</Text>
                  <div style={{ marginTop: 4 }}>
                    {encounter.diagnoses.map((diagnosis) => (
                      <Tag key={diagnosis.id} color={diagnosis.diagnosisType === 'primary' ? 'red' : 'blue'}>
                        {diagnosis.icd10Code} - {diagnosis.icd10Description}
                      </Tag>
                    ))}
                  </div>
                </div>
                
                {/* Vital Signs */}
                {encounter.vitalSigns && (
                  <Space wrap>
                    <Tag>BP: {encounter.vitalSigns.bpSystolic}/{encounter.vitalSigns.bpDiastolic}</Tag>
                    <Tag>Temp: {encounter.vitalSigns.temperature}°C</Tag>
                    <Tag>HR: {encounter.vitalSigns.pulseRate}</Tag>
                  </Space>
                )}
                
                {/* Treatment Plan (collapsed) */}
                <Collapse ghost>
                  <Panel header="Treatment Plan" key="plan">
                    <Paragraph>{encounter.treatmentPlan}</Paragraph>
                  </Panel>
                </Collapse>
              </Space>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};
```

Features:
- Timeline view (chronological)
- Date range filter
- Doctor filter
- Expandable cards
- Color-coded status (green = signed, blue = completed)
- Inline vital signs display
- Quick view of diagnoses
- Link to full encounter

Component: src/pages/encounters/PatientEncounterHistory.tsx
```

---

## STEP 10: Testing

### Windsurf Prompt:
```
Create comprehensive tests for the EMR module.

Based on emr_consultation_module_implementation.json:

1. **Unit Tests**

File: src/services/icd10-search.service.test.ts
```typescript
describe('ICD10SearchService', () => {
  it('should find diagnosis by code', async () => {
    const results = await service.search('I10');
    expect(results[0].code).toBe('I10');
    expect(results[0].description).toContain('hypertension');
  });
  
  it('should find diagnosis by keyword', async () => {
    const results = await service.search('malaria');
    expect(results.some(r => r.code.startsWith('B50'))).toBe(true);
  });
  
  it('should prioritize Ghana common diagnoses', async () => {
    const results = await service.search('fever', { ghanaCommonOnly: true });
    expect(results[0].isCommonGhana).toBe(true);
  });
  
  it('should suggest diagnoses from chief complaint', async () => {
    const suggestions = await service.suggestBasedOnChiefComplaint('chest pain');
    expect(suggestions.some(s => s.code === 'I21.9')).toBe(true); // MI
  });
});
```

2. **Integration Tests**

File: tests/integration/encounter.test.ts
```typescript
describe('Encounter API', () => {
  it('should create encounter and pull patient context', async () => {
    // Create patient with allergies
    const patient = await createTestPatient({
      allergies: [{ allergen: 'Penicillin', reaction: 'Anaphylaxis' }]
    });
    
    // Create encounter
    const response = await request(app)
      .post('/api/encounters')
      .send({ patientId: patient.id })
      .expect(201);
    
    expect(response.body.data.encounter).toBeDefined();
    expect(response.body.data.patient_context.allergies).toHaveLength(1);
  });
  
  it('should require at least one diagnosis to complete', async () => {
    const encounter = await createTestEncounter();
    
    // Try to complete without diagnosis
    await request(app)
      .post(`/api/encounters/${encounter.id}/complete`)
      .expect(400);
    
    // Add diagnosis
    await addDiagnosis(encounter.id, { icd10Code: 'I10' });
    
    // Now complete should work
    await request(app)
      .post(`/api/encounters/${encounter.id}/complete`)
      .expect(200);
  });
  
  it('should only allow one primary diagnosis', async () => {
    const encounter = await createTestEncounter();
    
    // Add first primary
    await request(app)
      .post(`/api/encounters/${encounter.id}/diagnoses`)
      .send({
        icd10Code: 'I10',
        diagnosisType: 'primary'
      })
      .expect(201);
    
    // Try to add second primary
    await request(app)
      .post(`/api/encounters/${encounter.id}/diagnoses`)
      .send({
        icd10Code: 'E11.9',
        diagnosisType: 'primary'
      })
      .expect(409); // Conflict
  });
  
  it('should auto-add chronic disease to problem list', async () => {
    const patient = await createTestPatient();
    const encounter = await createTestEncounter({ patientId: patient.id });
    
    // Add chronic diagnosis (Diabetes)
    await request(app)
      .post(`/api/encounters/${encounter.id}/diagnoses`)
      .send({
        icd10Code: 'E11.9',
        diagnosisType: 'primary',
        status: 'chronic'
      })
      .expect(201);
    
    // Check problem list
    const problemList = await prisma.problem_list.findMany({
      where: { patient_id: patient.id }
    });
    
    expect(problemList.some(p => p.icd10_code === 'E11.9')).toBe(true);
  });
  
  it('should prevent editing signed encounter', async () => {
    const encounter = await createTestEncounter({ status: 'SIGNED' });
    
    await request(app)
      .put(`/api/encounters/${encounter.id}`)
      .send({ chiefComplaint: 'Updated' })
      .expect(403); // Forbidden
  });
});
```

3. **E2E Tests (Cypress)**

File: cypress/e2e/encounter.cy.ts
```typescript
describe('Clinical Encounter Workflow', () => {
  it('should complete full encounter from start to finish', () => {
    cy.login('doctor@hospital.com', 'password');
    
    // Navigate to patient
    cy.visit('/patients/123');
    cy.contains('Start Encounter').click();
    
    // Subjective tab
    cy.get('[data-testid="chief-complaint"]').type('Fever for 3 days');
    cy.get('[data-testid="hpi"]').type('Patient reports high fever started 3 days ago...');
    
    // Objective tab
    cy.contains('Objective').click();
    cy.get('[data-testid="general-appearance"]').type('Ill-appearing, febrile');
    
    // Assessment tab
    cy.contains('Assessment').click();
    
    // Search and add diagnosis
    cy.get('[data-testid="icd10-search"]').type('malaria');
    cy.contains('B50.9').click();
    cy.contains('Add Diagnosis').click();
    
    // Plan tab
    cy.contains('Plan').click();
    cy.get('[data-testid="treatment-plan"]').type('Artemether-lumefantrine...');
    
    // Order lab
    cy.contains('Lab').click();
    cy.get('[data-testid="lab-tests"]').select(['Malaria RDT', 'CBC']);
    cy.get('[data-testid="clinical-indication"]').type('Suspected malaria');
    cy.contains('Create Order').click();
    
    // Complete encounter
    cy.contains('Complete Encounter').click();
    cy.contains('Confirm').click();
    
    // Should see success message
    cy.contains('Encounter completed').should('be.visible');
  });
});
```

Run all tests:
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run cypress:run
```
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Week 1-2: Backend Core
- [ ] Database schema (all 7 tables)
- [ ] ICD-10 search service with Ghana common diagnoses
- [ ] Encounter CRUD APIs
- [ ] Clinical decision support (allergy/interaction alerts)
- [ ] Problem list management

### Week 3: Frontend Core
- [ ] Encounter workspace (3-column layout)
- [ ] SOAP note editor (4 tabs)
- [ ] Patient context panel
- [ ] ICD-10 search widget

### Week 4: Advanced Features & Polish
- [ ] Physical examination builder
- [ ] Orders management (lab/radiology)
- [ ] Patient encounter history timeline
- [ ] Clinical templates (malaria, hypertension, diabetes)
- [ ] Testing (unit + integration + E2E)

---

## 🎯 SUCCESS CRITERIA

**Functional:**
✅ Doctors can create, document, and complete encounters  
✅ SOAP documentation is comprehensive and structured  
✅ 100% of encounters have ICD-10 diagnoses  
✅ Clinical decision support alerts work (allergy, interactions)  
✅ Orders automatically created and sent to lab/radiology  
✅ Problem list persists across encounters  

**Usability:**
✅ Documentation time <20 minutes per patient  
✅ ICD-10 search finds codes in <3 clicks  
✅ Templates speed documentation by 30%+  
✅ Auto-save prevents data loss  
✅ Doctors rate system 4+ stars  

**Clinical Quality:**
✅ Zero critical allergy alerts bypassed  
✅ Drug interaction warnings reviewed  
✅ Diagnosis coding accuracy >95%  
✅ Complete SOAP documentation >90% of encounters  

---

## 💡 PRO TIPS

1. **Start with ICD-10** - Get search working first, it's critical
2. **Use templates** - Saves massive time, doctors love it
3. **Auto-save everything** - Network failures happen
4. **Test allergy alerts** - Patient safety critical
5. **Ghana common diagnoses** - Pre-load for quick access
6. **SOAP is standard** - Don't reinvent clinical documentation
7. **Problem list matters** - Chronic disease management depends on it
8. **Lock signed encounters** - Legal requirement

---

## 🚀 AFTER EMR MODULE

With EMR complete, your clinical flow will be:

```
Registration ✅ → Appointment ✅ → Triage ✅ → Consultation ✅ → Prescriptions ❌ → Lab ❌ → Pharmacy ❌ → Billing ❌
```

**Next critical modules:**
1. **Prescriptions** (E-prescribing with allergy/interaction checking)
2. **Pharmacy** (Drug dispensing + inventory)
3. **Lab** (Test ordering → Results → Approval)
4. **Billing/NHIS** (Claims submission)

Ready to start? Begin with **Step 1: Database Schema**! 🏥
