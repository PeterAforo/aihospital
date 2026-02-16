# Laboratory Module - Technical Specification

## Overview

The Laboratory Module manages lab test ordering, sample collection, results entry, and reporting. It integrates with the EMR module for test ordering and results viewing.

**Estimated Development Time:** 2-3 weeks  
**Priority:** HIGH 🔥  
**Dependencies:** EMR/Encounter Module ✅ (completed), Lab Orders ✅ (basic implementation done)

---

## 1. Database Schema

### 1.1 Existing Tables (Already in Schema)

```prisma
model LabTest {
  id             String   @id @default(uuid())
  tenantId       String?
  name           String
  code           String?
  category       String?              // Hematology, Biochemistry, Microbiology, etc.
  sampleType     String?              // Blood, Urine, Stool, Sputum, etc.
  normalRange    String?
  unit           String?
  nhisApproved   Boolean  @default(false)
  nhisPrice      Float?
  cashPrice      Float?
  turnaroundTime Int?                 // Hours
  isActive       Boolean  @default(true)
}

model LabOrder {
  id          String   @id @default(uuid())
  tenantId    String
  encounterId String?
  patientId   String
  orderedBy   String                  // Doctor user ID
  orderDate   DateTime @default(now())
  priority    String   @default("ROUTINE")  // ROUTINE, URGENT, STAT
  status      String   @default("PENDING")
  notes       String?
  items       LabOrderItem[]
}

model LabOrderItem {
  id          String    @id @default(uuid())
  orderId     String
  testId      String
  status      String    @default("PENDING")
  result      String?
  resultValue Float?
  unit        String?
  normalRange String?
  isAbnormal  Boolean   @default(false)
  isCritical  Boolean   @default(false)
  performedBy String?
  performedAt DateTime?
  approvedBy  String?
  approvedAt  DateTime?
  notes       String?
}
```

### 1.2 New Tables Required

```prisma
// Sample collection tracking
model LabSample {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  orderId         String
  orderItemId     String
  patientId       String
  sampleNumber    String   @unique      // Barcode/accession number
  sampleType      String                // Blood, Urine, etc.
  collectedBy     String                // Phlebotomist user ID
  collectedAt     DateTime @default(now())
  collectionSite  String?               // Left arm, Right arm, etc.
  volume          Float?                // ml
  condition       String   @default("ADEQUATE")  // ADEQUATE, HEMOLYZED, LIPEMIC, CLOTTED, INSUFFICIENT
  status          String   @default("COLLECTED")  // COLLECTED, IN_TRANSIT, RECEIVED, PROCESSING, COMPLETED, REJECTED
  receivedBy      String?
  receivedAt      DateTime?
  rejectionReason String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           LabOrder @relation(fields: [orderId], references: [id])
  orderItem       LabOrderItem @relation(fields: [orderItemId], references: [id])
  patient         Patient @relation(fields: [patientId], references: [id])

  @@index([tenantId, collectedAt])
  @@index([sampleNumber])
  @@index([orderId])
  @@map("lab_samples")
}

// Test panels (groups of tests)
model LabPanel {
  id          String   @id @default(uuid())
  tenantId    String?
  name        String
  code        String?
  description String?
  category    String?
  nhisApproved Boolean @default(false)
  nhisPrice   Float?
  cashPrice   Float?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tests       LabPanelTest[]

  @@index([name])
  @@map("lab_panels")
}

model LabPanelTest {
  id       String @id @default(uuid())
  panelId  String
  testId   String

  panel    LabPanel @relation(fields: [panelId], references: [id], onDelete: Cascade)
  test     LabTest @relation(fields: [testId], references: [id])

  @@unique([panelId, testId])
  @@map("lab_panel_tests")
}

// Reference ranges (age/gender specific)
model LabReferenceRange {
  id          String   @id @default(uuid())
  testId      String
  gender      String?  // MALE, FEMALE, ALL
  ageMinDays  Int?     // Age in days (for pediatric ranges)
  ageMaxDays  Int?
  lowValue    Float?
  highValue   Float?
  criticalLow Float?
  criticalHigh Float?
  unit        String?
  notes       String?
  createdAt   DateTime @default(now())

  test        LabTest @relation(fields: [testId], references: [id])

  @@index([testId])
  @@map("lab_reference_ranges")
}

// Quality control logs
model LabQCLog {
  id          String   @id @default(uuid())
  tenantId    String
  branchId    String
  testId      String
  equipmentId String?
  lotNumber   String?
  level       String   // LOW, NORMAL, HIGH
  expectedValue Float
  observedValue Float
  isAcceptable Boolean
  performedBy String
  performedAt DateTime @default(now())
  notes       String?
  createdAt   DateTime @default(now())

  test        LabTest @relation(fields: [testId], references: [id])

  @@index([tenantId, performedAt])
  @@map("lab_qc_logs")
}

// Lab equipment tracking
model LabEquipment {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  name            String
  model           String?
  serialNumber    String?
  manufacturer    String?
  purchaseDate    DateTime?
  lastCalibration DateTime?
  nextCalibration DateTime?
  status          String   @default("ACTIVE")  // ACTIVE, MAINTENANCE, OUT_OF_SERVICE
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId, branchId])
  @@map("lab_equipment")
}

// Critical value notifications
model CriticalValueAlert {
  id            String   @id @default(uuid())
  tenantId      String
  orderItemId   String
  patientId     String
  testName      String
  resultValue   Float
  criticalType  String   // HIGH, LOW
  notifiedTo    String   // Doctor user ID
  notifiedAt    DateTime @default(now())
  acknowledgedBy String?
  acknowledgedAt DateTime?
  notes         String?
  createdAt     DateTime @default(now())

  orderItem     LabOrderItem @relation(fields: [orderItemId], references: [id])
  patient       Patient @relation(fields: [patientId], references: [id])

  @@index([tenantId, notifiedAt])
  @@index([patientId])
  @@map("critical_value_alerts")
}
```

---

## 2. API Endpoints

### 2.1 Lab Worklist (for Lab Technicians)

```
# Worklist
GET    /api/lab/worklist                      # Get pending orders/samples
GET    /api/lab/worklist/stats                # Worklist statistics
GET    /api/lab/orders/:orderId               # Get order details

# Sample Collection
POST   /api/lab/samples/collect               # Record sample collection
GET    /api/lab/samples/:sampleNumber         # Get sample by barcode
POST   /api/lab/samples/:id/receive           # Receive sample in lab
POST   /api/lab/samples/:id/reject            # Reject sample (recollect needed)
```

### 2.2 Results Entry

```
# Results
POST   /api/lab/results                       # Enter results for order item
PUT    /api/lab/results/:orderItemId          # Update result
POST   /api/lab/results/:orderItemId/verify   # Verify/approve result
POST   /api/lab/results/batch                 # Batch result entry

# Critical Values
GET    /api/lab/critical-values               # Get pending critical alerts
POST   /api/lab/critical-values/:id/acknowledge  # Acknowledge critical value
```

### 2.3 Test Catalog

```
# Tests
GET    /api/lab/tests                         # List all tests
GET    /api/lab/tests/search                  # Search tests
POST   /api/lab/tests                         # Create test (admin)
PUT    /api/lab/tests/:id                     # Update test
DELETE /api/lab/tests/:id                     # Deactivate test

# Panels
GET    /api/lab/panels                        # List panels
POST   /api/lab/panels                        # Create panel
PUT    /api/lab/panels/:id                    # Update panel
DELETE /api/lab/panels/:id                    # Deactivate panel

# Reference Ranges
GET    /api/lab/tests/:testId/ranges          # Get reference ranges
POST   /api/lab/tests/:testId/ranges          # Add reference range
PUT    /api/lab/ranges/:id                    # Update range
```

### 2.4 Quality Control

```
GET    /api/lab/qc                            # Get QC logs
POST   /api/lab/qc                            # Log QC result
GET    /api/lab/qc/charts/:testId             # Get QC chart data (Levey-Jennings)
```

### 2.5 Reports

```
GET    /api/lab/reports/turnaround            # Turnaround time report
GET    /api/lab/reports/workload              # Workload by test/technician
GET    /api/lab/reports/critical-values       # Critical value summary
GET    /api/lab/reports/test-utilization      # Test ordering patterns
GET    /api/lab/reports/patient/:patientId    # Patient lab history
GET    /api/lab/reports/print/:orderId        # Generate printable report
```

---

## 3. Frontend Components

### 3.1 Pages

```
/lab                                # Lab Dashboard
/lab/worklist                       # Lab Worklist (pending orders)
/lab/collection                     # Sample Collection Queue
/lab/results                        # Results Entry
/lab/results/:orderId               # Enter Results for Order
/lab/critical-values                # Critical Value Alerts
/lab/tests                          # Test Catalog Management
/lab/panels                         # Panel Management
/lab/qc                             # Quality Control
/lab/reports                        # Lab Reports
```

### 3.2 Key Components

```tsx
// Dashboard
<LabDashboard />
  ├── <PendingOrdersWidget />       // Orders awaiting processing
  ├── <SamplesCollectedWidget />    // Today's collections
  ├── <ResultsPendingWidget />      // Results to be entered
  ├── <CriticalAlertsWidget />      // Unacknowledged critical values
  └── <TurnaroundTimeWidget />      // Average TAT today

// Worklist
<LabWorklist />
  ├── <WorklistFilters />           // Status, priority, date, test type
  ├── <OrderCard />                 // Order summary card
  └── <BarcodeScanner />            // Scan sample barcode

// Sample Collection
<SampleCollectionForm />
  ├── <PatientVerification />       // Verify patient identity
  ├── <SampleTypeSelect />          // Blood, Urine, etc.
  ├── <CollectionSiteSelect />      // Left arm, etc.
  ├── <VolumeInput />
  ├── <SampleConditionSelect />     // Adequate, Hemolyzed, etc.
  └── <PrintBarcodeButton />        // Print sample label

// Results Entry
<ResultsEntryForm />
  ├── <OrderHeader />               // Patient, doctor, order info
  ├── <TestResultRow />             // Each test with result input
  │   ├── <ResultValueInput />      // Numeric or text result
  │   ├── <UnitDisplay />
  │   ├── <ReferenceRangeDisplay />
  │   ├── <AbnormalFlag />          // Auto-calculated
  │   └── <CriticalFlag />          // Auto-calculated
  ├── <ResultNotes />
  └── <VerifyButton />              // Submit for verification

// Critical Values
<CriticalValueAlert />
  ├── <PatientInfo />
  ├── <TestResult />
  ├── <DoctorNotification />
  └── <AcknowledgeButton />

// Reports
<LabReportViewer />
  ├── <ReportHeader />              // Hospital logo, patient info
  ├── <TestResultsTable />          // Results with reference ranges
  ├── <InterpretationNotes />
  ├── <DigitalSignature />
  └── <PrintButton />
```

---

## 4. Business Logic

### 4.1 Sample Workflow

```
ORDER PLACED (by doctor)
    ↓
SAMPLE COLLECTION (by phlebotomist)
    ↓ Generate barcode/accession number
SAMPLE RECEIVED (in lab)
    ↓ Verify sample quality
PROCESSING (run tests)
    ↓
RESULTS ENTRY (by technician)
    ↓ Auto-flag abnormal/critical
VERIFICATION (by senior tech/pathologist)
    ↓
RESULTS AVAILABLE (to doctor)
    ↓ Notify if critical
REPORT GENERATED
```

### 4.2 Result Validation Rules

```typescript
interface ResultValidation {
  // Auto-calculate abnormal flag
  isAbnormal(value: number, referenceRange: ReferenceRange): boolean {
    return value < referenceRange.lowValue || value > referenceRange.highValue;
  }

  // Auto-calculate critical flag
  isCritical(value: number, referenceRange: ReferenceRange): boolean {
    return value < referenceRange.criticalLow || value > referenceRange.criticalHigh;
  }

  // Delta check (compare with previous result)
  deltaCheck(currentValue: number, previousValue: number, threshold: number): boolean {
    const percentChange = Math.abs((currentValue - previousValue) / previousValue) * 100;
    return percentChange > threshold;
  }

  // Validate result is within plausible range
  isPlausible(testCode: string, value: number): boolean {
    const limits = PLAUSIBILITY_LIMITS[testCode];
    return value >= limits.min && value <= limits.max;
  }
}
```

### 4.3 Critical Value Handling

```typescript
// Critical value workflow
async function handleCriticalValue(orderItem: LabOrderItem, result: number) {
  // 1. Create critical value alert
  const alert = await createCriticalValueAlert({
    orderItemId: orderItem.id,
    patientId: orderItem.order.patientId,
    testName: orderItem.test.name,
    resultValue: result,
    criticalType: result > referenceRange.criticalHigh ? 'HIGH' : 'LOW',
    notifiedTo: orderItem.order.orderedBy,  // Ordering doctor
  });

  // 2. Send immediate notification
  await sendCriticalValueNotification({
    doctorId: orderItem.order.orderedBy,
    patientName: patient.fullName,
    testName: orderItem.test.name,
    result: `${result} ${orderItem.test.unit}`,
    alertId: alert.id,
  });

  // 3. Log notification
  await logNotification({
    type: 'CRITICAL_VALUE',
    alertId: alert.id,
    method: 'SMS',  // or 'IN_APP', 'EMAIL'
    sentAt: new Date(),
  });

  // 4. Require acknowledgment before result is finalized
  return alert;
}
```

### 4.4 Turnaround Time Calculation

```typescript
// TAT calculation
interface TATMetrics {
  // Collection to Receipt
  collectionToReceipt: number;  // minutes
  
  // Receipt to Result
  receiptToResult: number;  // minutes
  
  // Result to Verification
  resultToVerification: number;  // minutes
  
  // Total TAT (Order to Verified Result)
  totalTAT: number;  // minutes
  
  // Target TAT by priority
  targetTAT: {
    STAT: 60,      // 1 hour
    URGENT: 240,   // 4 hours
    ROUTINE: 1440, // 24 hours
  };
}
```

---

## 5. Permissions (RBAC)

```typescript
const labPermissions = [
  // Ordering (for doctors)
  'ORDER_LAB_TEST',
  'VIEW_LAB_RESULTS',
  'CANCEL_LAB_ORDER',
  
  // Sample Collection
  'COLLECT_SAMPLE',
  'RECEIVE_SAMPLE',
  'REJECT_SAMPLE',
  
  // Results
  'ENTER_LAB_RESULTS',
  'VERIFY_LAB_RESULTS',
  'AMEND_LAB_RESULTS',
  
  // Critical Values
  'VIEW_CRITICAL_VALUES',
  'ACKNOWLEDGE_CRITICAL_VALUE',
  
  // Quality Control
  'ENTER_QC_RESULTS',
  'VIEW_QC_REPORTS',
  
  // Administration
  'MANAGE_LAB_TESTS',
  'MANAGE_LAB_PANELS',
  'MANAGE_REFERENCE_RANGES',
  'MANAGE_LAB_EQUIPMENT',
  
  // Reports
  'VIEW_LAB_REPORTS',
  'PRINT_LAB_REPORTS',
];

const rolePermissions = {
  DOCTOR: [
    'ORDER_LAB_TEST',
    'VIEW_LAB_RESULTS',
    'CANCEL_LAB_ORDER',
    'ACKNOWLEDGE_CRITICAL_VALUE',
  ],
  
  PHLEBOTOMIST: [
    'COLLECT_SAMPLE',
    'VIEW_LAB_RESULTS',
  ],
  
  LAB_TECHNICIAN: [
    'RECEIVE_SAMPLE',
    'REJECT_SAMPLE',
    'ENTER_LAB_RESULTS',
    'ENTER_QC_RESULTS',
    'VIEW_LAB_RESULTS',
    'VIEW_LAB_REPORTS',
  ],
  
  LAB_SCIENTIST: [
    ...LAB_TECHNICIAN,
    'VERIFY_LAB_RESULTS',
    'AMEND_LAB_RESULTS',
    'VIEW_QC_REPORTS',
  ],
  
  LAB_MANAGER: [
    ...LAB_SCIENTIST,
    'MANAGE_LAB_TESTS',
    'MANAGE_LAB_PANELS',
    'MANAGE_REFERENCE_RANGES',
    'MANAGE_LAB_EQUIPMENT',
    'PRINT_LAB_REPORTS',
  ],
};
```

---

## 6. UI Mockups (Text-based)

### 6.1 Lab Worklist

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔬 Laboratory Worklist                          [🔍 Scan/Search]│
├─────────────────────────────────────────────────────────────────┤
│ Filters: [All Status ▼] [All Priority ▼] [Today ▼]             │
│ Stats: Pending: 12 | In Progress: 5 | Completed: 45            │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔴 STAT                                Order #LAB-2024-0567 │ │
│ │ Patient: Kofi Mensah (MRN: PAT-2024-0089)                   │ │
│ │ Doctor: Dr. Owusu | Ordered: 10:30 AM                       │ │
│ │ Tests: FBC, Malaria RDT, Blood Sugar                        │ │
│ │ Status: ⏳ Awaiting Sample Collection                       │ │
│ │                              [Collect Sample] [View Details] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟡 URGENT                              Order #LAB-2024-0566 │ │
│ │ Patient: Ama Serwaa (MRN: PAT-2024-0045)                    │ │
│ │ Doctor: Dr. Mensah | Ordered: 09:45 AM                      │ │
│ │ Tests: Liver Function Test, Renal Function Test             │ │
│ │ Status: 🧪 Sample Received - Processing                     │ │
│ │ Sample: LAB-S-2024-0890                                     │ │
│ │                                [Enter Results] [View Details]│ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Results Entry

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Worklist          Enter Results - Order #LAB-2024-0566│
├─────────────────────────────────────────────────────────────────┤
│ PATIENT: Ama Serwaa | Age: 35 | Gender: Female                  │
│ DOCTOR: Dr. Mensah | ORDERED: Feb 14, 2026 09:45 AM             │
│ SAMPLE: LAB-S-2024-0890 | Collected: 10:00 AM | Blood           │
├─────────────────────────────────────────────────────────────────┤
│ LIVER FUNCTION TEST                                             │
│ ┌───────────────────┬─────────┬────────┬──────────┬───────────┐ │
│ │ Test              │ Result  │ Unit   │ Ref Range│ Flag      │ │
│ ├───────────────────┼─────────┼────────┼──────────┼───────────┤ │
│ │ Total Bilirubin   │ [1.2  ] │ mg/dL  │ 0.1-1.2  │ ✓ Normal  │ │
│ │ Direct Bilirubin  │ [0.4  ] │ mg/dL  │ 0.0-0.3  │ ⚠️ High   │ │
│ │ ALT (SGPT)        │ [45   ] │ U/L    │ 7-56     │ ✓ Normal  │ │
│ │ AST (SGOT)        │ [38   ] │ U/L    │ 10-40    │ ✓ Normal  │ │
│ │ ALP               │ [120  ] │ U/L    │ 44-147   │ ✓ Normal  │ │
│ │ Total Protein     │ [7.2  ] │ g/dL   │ 6.0-8.3  │ ✓ Normal  │ │
│ │ Albumin           │ [4.0  ] │ g/dL   │ 3.5-5.0  │ ✓ Normal  │ │
│ │ Globulin          │ [3.2  ] │ g/dL   │ 2.0-3.5  │ ✓ Normal  │ │
│ └───────────────────┴─────────┴────────┴──────────┴───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ RENAL FUNCTION TEST                                             │
│ ┌───────────────────┬─────────┬────────┬──────────┬───────────┐ │
│ │ Urea              │ [25   ] │ mg/dL  │ 7-20     │ ⚠️ High   │ │
│ │ Creatinine        │ [1.8  ] │ mg/dL  │ 0.7-1.3  │ 🔴 CRIT   │ │
│ │ eGFR              │ [42   ] │ mL/min │ >60      │ ⚠️ Low    │ │
│ │ Sodium            │ [140  ] │ mEq/L  │ 136-145  │ ✓ Normal  │ │
│ │ Potassium         │ [4.5  ] │ mEq/L  │ 3.5-5.0  │ ✓ Normal  │ │
│ │ Chloride          │ [102  ] │ mEq/L  │ 98-106   │ ✓ Normal  │ │
│ └───────────────────┴─────────┴────────┴──────────┴───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL VALUE DETECTED: Creatinine 1.8 mg/dL (High)         │
│    Doctor will be notified immediately upon verification.       │
├─────────────────────────────────────────────────────────────────┤
│ Notes: [                                                      ] │
├─────────────────────────────────────────────────────────────────┤
│ [Cancel]                    [Save Draft]    [✓ Submit & Verify] │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Lab Report (Printable)

```
┌─────────────────────────────────────────────────────────────────┐
│                     🏥 DEMO HOSPITAL                            │
│                   Laboratory Report                             │
│                                                                 │
│ Patient: Ama Serwaa              MRN: PAT-2024-0045            │
│ Age/Gender: 35 years / Female    Phone: 0244567890             │
│ Doctor: Dr. Mensah               Date: Feb 14, 2026            │
│ Sample: Blood                    Report #: LAB-R-2024-0566     │
├─────────────────────────────────────────────────────────────────┤
│                    LIVER FUNCTION TEST                          │
│ ─────────────────────────────────────────────────────────────── │
│ Test                  Result      Unit      Reference    Flag   │
│ ─────────────────────────────────────────────────────────────── │
│ Total Bilirubin       1.2         mg/dL     0.1-1.2             │
│ Direct Bilirubin      0.4         mg/dL     0.0-0.3      H     │
│ ALT (SGPT)            45          U/L       7-56                │
│ AST (SGOT)            38          U/L       10-40               │
│ ALP                   120         U/L       44-147              │
│ Total Protein         7.2         g/dL      6.0-8.3             │
│ Albumin               4.0         g/dL      3.5-5.0             │
│ Globulin              3.2         g/dL      2.0-3.5             │
│                                                                 │
│                    RENAL FUNCTION TEST                          │
│ ─────────────────────────────────────────────────────────────── │
│ Urea                  25          mg/dL     7-20         H     │
│ Creatinine            1.8         mg/dL     0.7-1.3      H*    │
│ eGFR                  42          mL/min    >60          L     │
│ Sodium                140         mEq/L     136-145            │
│ Potassium             4.5         mEq/L     3.5-5.0            │
│ Chloride              102         mEq/L     98-106             │
│                                                                 │
│ H = High, L = Low, * = Critical Value                          │
├─────────────────────────────────────────────────────────────────┤
│ Performed by: John Doe, Lab Technician                         │
│ Verified by: Dr. Jane Smith, Pathologist                       │
│ Date/Time: Feb 14, 2026 11:30 AM                               │
│                                                                 │
│ [Digital Signature]                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Order

### Week 1: Core Lab Workflow
1. Database migrations for new tables
2. Sample collection service
3. Barcode/accession number generation
4. Sample receiving workflow
5. Frontend: Lab worklist + Sample collection

### Week 2: Results & Reporting
1. Results entry service
2. Auto-flagging (abnormal/critical)
3. Reference range validation
4. Critical value alerts
5. Frontend: Results entry form
6. Result verification workflow

### Week 3: Advanced Features
1. Lab report PDF generation
2. QC logging
3. Turnaround time tracking
4. Lab reports/analytics
5. Frontend: Reports + QC pages
6. Integration testing

---

## 8. Integration Points

```
EMR MODULE ←→ LAB MODULE
- Doctor orders test → Lab receives order
- Lab results ready → Appears in EMR
- Critical values → Doctor notification

BILLING MODULE ←→ LAB MODULE
- Test completed → Billing line item created
- NHIS vs Cash pricing applied

NOTIFICATION MODULE ←→ LAB MODULE
- Critical value → SMS/In-app alert to doctor
- Results ready → Patient notification (optional)
```

---

## 9. Testing Checklist

```
□ Order lab test from EMR
□ Collect sample with barcode
□ Receive sample in lab
□ Reject sample (recollect)
□ Enter results for all test types
□ Auto-flag abnormal values
□ Auto-flag critical values
□ Critical value notification sent
□ Verify/approve results
□ View results in EMR
□ Generate printable report
□ Turnaround time calculation
□ QC logging
□ Reference range by age/gender
□ Permission checks for all actions
□ Panel ordering (multiple tests)
```
