# Pharmacy Module - Technical Specification

## Overview

The Pharmacy Module manages drug inventory, dispensing workflow, and stock control. It integrates with the E-Prescribing module to complete the prescription-to-dispensing loop.

**Estimated Development Time:** 2 weeks  
**Priority:** HIGH 🔥  
**Dependencies:** Prescription Module ✅ (completed)

---

## 1. Database Schema

### 1.1 Existing Tables (Already in Schema)

```prisma
model Drug {
  id           String   @id @default(uuid())
  tenantId     String?
  genericName  String
  brandName    String?
  strength     String?
  form         String?              // Tablet, Capsule, Syrup, Injection, etc.
  category     String?              // Antibiotic, Analgesic, Antimalarial, etc.
  nhisApproved Boolean  @default(false)
  nhisPrice    Float?
  cashPrice    Float?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model PharmacyStock {
  id           String    @id @default(uuid())
  tenantId     String
  branchId     String?
  drugId       String
  batchNumber  String?
  expiryDate   DateTime?
  quantity     Int       @default(0)
  reorderLevel Int       @default(10)
  costPrice    Float?
  sellingPrice Float?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Prescription {
  id          String   @id @default(uuid())
  tenantId    String
  encounterId String
  patientId   String
  doctorId    String
  status      String   @default("PENDING")  // PENDING, DISPENSING, DISPENSED, CANCELLED
  notes       String?
  items       PrescriptionItem[]
}

model PrescriptionItem {
  id             String   @id @default(uuid())
  prescriptionId String
  drugId         String
  dosage         String
  frequency      String
  duration       String
  quantity       Int
  instructions   String?
  dispensedQty   Int      @default(0)
  status         String   @default("PENDING")  // PENDING, PARTIAL, DISPENSED, OUT_OF_STOCK
}
```

### 1.2 New Tables Required

```prisma
// Dispensing transaction record
model DispensingRecord {
  id               String   @id @default(uuid())
  tenantId         String
  branchId         String
  prescriptionId   String
  prescriptionItemId String
  patientId        String
  drugId           String
  batchNumber      String?
  quantityDispensed Int
  dispensedBy      String   // User ID of pharmacist
  dispensedAt      DateTime @default(now())
  counselingNotes  String?
  patientSignature String?  // Base64 or reference
  createdAt        DateTime @default(now())

  prescription     Prescription @relation(fields: [prescriptionId], references: [id])
  prescriptionItem PrescriptionItem @relation(fields: [prescriptionItemId], references: [id])
  patient          Patient @relation(fields: [patientId], references: [id])
  drug             Drug @relation(fields: [drugId], references: [id])
  dispensedByUser  User @relation(fields: [dispensedBy], references: [id])
  stock            PharmacyStock @relation(fields: [batchNumber], references: [batchNumber])

  @@index([tenantId, dispensedAt])
  @@index([prescriptionId])
  @@index([patientId])
  @@map("dispensing_records")
}

// Stock movement tracking
model StockMovement {
  id            String   @id @default(uuid())
  tenantId      String
  branchId      String
  drugId        String
  batchNumber   String?
  movementType  String   // RECEIPT, DISPENSE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, EXPIRED, DAMAGED
  quantity      Int      // Positive for in, negative for out
  balanceBefore Int
  balanceAfter  Int
  referenceType String?  // PURCHASE_ORDER, PRESCRIPTION, ADJUSTMENT, TRANSFER
  referenceId   String?
  reason        String?
  performedBy   String
  performedAt   DateTime @default(now())
  createdAt     DateTime @default(now())

  drug          Drug @relation(fields: [drugId], references: [id])
  performedByUser User @relation(fields: [performedBy], references: [id])

  @@index([tenantId, branchId, performedAt])
  @@index([drugId])
  @@map("stock_movements")
}

// Supplier management
model Supplier {
  id           String   @id @default(uuid())
  tenantId     String
  name         String
  contactPerson String?
  phone        String?
  email        String?
  address      String?
  paymentTerms String?  // COD, NET30, etc.
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  purchaseOrders PurchaseOrder[]

  @@index([tenantId])
  @@map("suppliers")
}

// Purchase orders
model PurchaseOrder {
  id           String   @id @default(uuid())
  tenantId     String
  branchId     String
  supplierId   String
  orderNumber  String   @unique
  orderDate    DateTime @default(now())
  expectedDate DateTime?
  status       String   @default("DRAFT")  // DRAFT, SUBMITTED, APPROVED, RECEIVED, CANCELLED
  totalAmount  Float    @default(0)
  notes        String?
  createdBy    String
  approvedBy   String?
  approvedAt   DateTime?
  receivedBy   String?
  receivedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  supplier     Supplier @relation(fields: [supplierId], references: [id])
  items        PurchaseOrderItem[]

  @@index([tenantId, orderDate])
  @@index([status])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              String   @id @default(uuid())
  purchaseOrderId String
  drugId          String
  quantityOrdered Int
  quantityReceived Int     @default(0)
  unitCost        Float
  totalCost       Float
  batchNumber     String?
  expiryDate      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  drug            Drug @relation(fields: [drugId], references: [id])

  @@index([purchaseOrderId])
  @@map("purchase_order_items")
}

// Stock transfer between branches
model StockTransfer {
  id             String   @id @default(uuid())
  tenantId       String
  fromBranchId   String
  toBranchId     String
  transferNumber String   @unique
  status         String   @default("PENDING")  // PENDING, IN_TRANSIT, RECEIVED, CANCELLED
  requestedBy    String
  requestedAt    DateTime @default(now())
  approvedBy     String?
  approvedAt     DateTime?
  receivedBy     String?
  receivedAt     DateTime?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  items          StockTransferItem[]

  @@index([tenantId])
  @@map("stock_transfers")
}

model StockTransferItem {
  id              String   @id @default(uuid())
  transferId      String
  drugId          String
  batchNumber     String?
  quantityRequested Int
  quantityTransferred Int  @default(0)
  createdAt       DateTime @default(now())

  transfer        StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  drug            Drug @relation(fields: [drugId], references: [id])

  @@index([transferId])
  @@map("stock_transfer_items")
}
```

---

## 2. API Endpoints

### 2.1 Dispensing Workflow

```
# Prescription Queue (for pharmacist)
GET    /api/pharmacy/queue                    # Get pending prescriptions
GET    /api/pharmacy/queue/:prescriptionId    # Get prescription details with stock availability

# Dispensing
POST   /api/pharmacy/dispense                 # Dispense prescription items
POST   /api/pharmacy/dispense/partial         # Partial dispensing
POST   /api/pharmacy/dispense/reject          # Reject/return prescription to doctor

# Dispensing History
GET    /api/pharmacy/dispensing-history       # Get dispensing records
GET    /api/pharmacy/dispensing-history/:id   # Get specific record
```

### 2.2 Stock Management

```
# Stock Queries
GET    /api/pharmacy/stock                    # Get all stock (with filters)
GET    /api/pharmacy/stock/:drugId            # Get stock for specific drug
GET    /api/pharmacy/stock/low                # Get low stock alerts
GET    /api/pharmacy/stock/expiring           # Get expiring items (next 90 days)
GET    /api/pharmacy/stock/expired            # Get expired items

# Stock Adjustments
POST   /api/pharmacy/stock/adjust             # Manual stock adjustment
POST   /api/pharmacy/stock/receive            # Receive stock (from PO or direct)
POST   /api/pharmacy/stock/write-off          # Write off expired/damaged stock

# Stock Movements
GET    /api/pharmacy/stock/movements          # Get stock movement history
GET    /api/pharmacy/stock/movements/:drugId  # Get movements for specific drug
```

### 2.3 Purchase Orders

```
# Suppliers
GET    /api/pharmacy/suppliers                # List suppliers
POST   /api/pharmacy/suppliers                # Create supplier
PUT    /api/pharmacy/suppliers/:id            # Update supplier
DELETE /api/pharmacy/suppliers/:id            # Deactivate supplier

# Purchase Orders
GET    /api/pharmacy/purchase-orders          # List POs
POST   /api/pharmacy/purchase-orders          # Create PO
GET    /api/pharmacy/purchase-orders/:id      # Get PO details
PUT    /api/pharmacy/purchase-orders/:id      # Update PO
POST   /api/pharmacy/purchase-orders/:id/submit   # Submit for approval
POST   /api/pharmacy/purchase-orders/:id/approve  # Approve PO
POST   /api/pharmacy/purchase-orders/:id/receive  # Receive goods
POST   /api/pharmacy/purchase-orders/:id/cancel   # Cancel PO
```

### 2.4 Stock Transfers

```
GET    /api/pharmacy/transfers                # List transfers
POST   /api/pharmacy/transfers                # Create transfer request
GET    /api/pharmacy/transfers/:id            # Get transfer details
POST   /api/pharmacy/transfers/:id/approve    # Approve transfer
POST   /api/pharmacy/transfers/:id/dispatch   # Mark as dispatched
POST   /api/pharmacy/transfers/:id/receive    # Receive transfer
POST   /api/pharmacy/transfers/:id/cancel     # Cancel transfer
```

### 2.5 Reports

```
GET    /api/pharmacy/reports/stock-valuation  # Current stock value
GET    /api/pharmacy/reports/drug-utilization # Drug usage report
GET    /api/pharmacy/reports/expiry-report    # Expiry tracking
GET    /api/pharmacy/reports/fast-moving      # Fast-moving drugs
GET    /api/pharmacy/reports/slow-moving      # Slow-moving drugs
GET    /api/pharmacy/reports/daily-dispensing # Daily dispensing summary
```

---

## 3. Frontend Components

### 3.1 Pages

```
/pharmacy                           # Pharmacy Dashboard
/pharmacy/queue                     # Prescription Queue (dispensing)
/pharmacy/queue/:prescriptionId     # Dispense Prescription
/pharmacy/stock                     # Stock Management
/pharmacy/stock/:drugId             # Drug Stock Details
/pharmacy/purchase-orders           # Purchase Orders List
/pharmacy/purchase-orders/new       # Create Purchase Order
/pharmacy/purchase-orders/:id       # PO Details
/pharmacy/transfers                 # Stock Transfers
/pharmacy/suppliers                 # Supplier Management
/pharmacy/reports                   # Pharmacy Reports
```

### 3.2 Key Components

```tsx
// Dashboard
<PharmacyDashboard />
  ├── <PendingPrescriptionsWidget />    // Count of pending Rx
  ├── <LowStockAlertWidget />           // Drugs below reorder level
  ├── <ExpiringStockWidget />           // Drugs expiring soon
  └── <TodayDispensingWidget />         // Today's dispensing stats

// Dispensing
<PrescriptionQueue />
  ├── <PrescriptionCard />              // Summary card for each Rx
  └── <PrescriptionFilters />           // Filter by status, date, patient

<DispenseWorkspace />
  ├── <PatientInfo />                   // Patient details + allergies
  ├── <PrescriptionItems />             // List of drugs to dispense
  │   └── <DispenseItemRow />           // Each drug with stock selection
  ├── <StockSelector />                 // Select batch/expiry
  ├── <CounselingNotes />               // Pharmacist notes
  └── <DispenseActions />               // Dispense, Partial, Reject

// Stock Management
<StockDashboard />
  ├── <StockTable />                    // Searchable stock list
  ├── <StockFilters />                  // Category, status, branch
  └── <StockActions />                  // Adjust, Transfer, Write-off

<StockAdjustmentModal />
  ├── <DrugSelector />
  ├── <AdjustmentTypeSelect />          // Add, Remove, Set
  ├── <QuantityInput />
  └── <ReasonInput />

// Purchase Orders
<PurchaseOrderList />
<PurchaseOrderForm />
  ├── <SupplierSelect />
  ├── <DrugSearchAdd />
  └── <POItemsTable />

<ReceiveGoodsForm />
  ├── <POItemsReceive />
  ├── <BatchNumberInput />
  └── <ExpiryDateInput />
```

---

## 4. Business Logic

### 4.1 Dispensing Rules

```typescript
// Dispensing validation
interface DispensingValidation {
  // Check stock availability
  checkStockAvailability(drugId: string, quantity: number, branchId: string): Promise<{
    available: boolean;
    availableQty: number;
    batches: StockBatch[];
  }>;

  // FEFO (First Expiry, First Out) - auto-select oldest expiry batch
  selectBatchFEFO(drugId: string, quantity: number): Promise<BatchSelection[]>;

  // Validate prescription not expired (e.g., 30 days from issue)
  validatePrescriptionValidity(prescription: Prescription): boolean;

  // Check for drug interactions with patient's current medications
  checkDrugInteractions(drugId: string, patientId: string): Promise<Interaction[]>;

  // Verify patient identity
  verifyPatientIdentity(patientId: string, verificationMethod: string): Promise<boolean>;
}
```

### 4.2 Stock Management Rules

```typescript
// Stock rules
interface StockRules {
  // Reorder level alerts
  LOW_STOCK_THRESHOLD: 'reorderLevel';  // Alert when stock <= reorderLevel
  
  // Expiry alerts
  EXPIRY_WARNING_DAYS: 90;              // Warn 90 days before expiry
  EXPIRY_CRITICAL_DAYS: 30;             // Critical alert 30 days before
  
  // Auto-calculations
  calculateReorderQuantity(drug: Drug, avgMonthlyUsage: number): number;
  
  // Stock valuation methods
  VALUATION_METHOD: 'FIFO' | 'WEIGHTED_AVERAGE';
}
```

### 4.3 Workflow States

```
PRESCRIPTION WORKFLOW:
PENDING → DISPENSING → DISPENSED
       ↘ PARTIAL → DISPENSED
       ↘ REJECTED (back to doctor)
       ↘ CANCELLED

PURCHASE ORDER WORKFLOW:
DRAFT → SUBMITTED → APPROVED → RECEIVED
     ↘ CANCELLED

STOCK TRANSFER WORKFLOW:
PENDING → APPROVED → IN_TRANSIT → RECEIVED
       ↘ CANCELLED
```

---

## 5. Permissions (RBAC)

```typescript
// Pharmacy permissions to add to RBAC
const pharmacyPermissions = [
  // Dispensing
  'VIEW_PRESCRIPTION_QUEUE',
  'DISPENSE_MEDICATION',
  'PARTIAL_DISPENSE',
  'REJECT_PRESCRIPTION',
  
  // Stock
  'VIEW_STOCK',
  'ADJUST_STOCK',
  'RECEIVE_STOCK',
  'WRITE_OFF_STOCK',
  
  // Purchase Orders
  'VIEW_PURCHASE_ORDERS',
  'CREATE_PURCHASE_ORDER',
  'APPROVE_PURCHASE_ORDER',
  'RECEIVE_PURCHASE_ORDER',
  
  // Transfers
  'VIEW_TRANSFERS',
  'CREATE_TRANSFER',
  'APPROVE_TRANSFER',
  'RECEIVE_TRANSFER',
  
  // Reports
  'VIEW_PHARMACY_REPORTS',
  
  // Admin
  'MANAGE_SUPPLIERS',
  'MANAGE_DRUG_CATALOG',
];

// Role assignments
const rolePermissions = {
  PHARMACIST: [
    'VIEW_PRESCRIPTION_QUEUE',
    'DISPENSE_MEDICATION',
    'PARTIAL_DISPENSE',
    'VIEW_STOCK',
    'VIEW_PHARMACY_REPORTS',
  ],
  
  PHARMACY_MANAGER: [
    ...PHARMACIST,
    'REJECT_PRESCRIPTION',
    'ADJUST_STOCK',
    'RECEIVE_STOCK',
    'WRITE_OFF_STOCK',
    'VIEW_PURCHASE_ORDERS',
    'CREATE_PURCHASE_ORDER',
    'APPROVE_PURCHASE_ORDER',
    'RECEIVE_PURCHASE_ORDER',
    'VIEW_TRANSFERS',
    'CREATE_TRANSFER',
    'APPROVE_TRANSFER',
    'RECEIVE_TRANSFER',
    'MANAGE_SUPPLIERS',
  ],
  
  ADMIN: ['*'],  // All permissions
};
```

---

## 6. UI Mockups (Text-based)

### 6.1 Prescription Queue

```
┌─────────────────────────────────────────────────────────────────┐
│ 💊 Pharmacy - Prescription Queue                    [🔍 Search] │
├─────────────────────────────────────────────────────────────────┤
│ Filters: [All ▼] [Today ▼] [Branch: Main ▼]                    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟡 PENDING                                      10:30 AM    │ │
│ │ Rx #2024-0234                                               │ │
│ │ Patient: Kwame Asante (MRN: PAT-2024-0001)                 │ │
│ │ Doctor: Dr. Mensah                                          │ │
│ │ Items: 3 medications                                        │ │
│ │ ⚠️ Allergy Alert: Penicillin                               │ │
│ │                                        [View] [Dispense →]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 READY                                        10:15 AM    │ │
│ │ Rx #2024-0233                                               │ │
│ │ Patient: Ama Serwaa (MRN: PAT-2024-0045)                   │ │
│ │ Doctor: Dr. Owusu                                           │ │
│ │ Items: 2 medications                                        │ │
│ │                                        [View] [Dispense →]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Dispense Workspace

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Queue          Dispense Prescription #2024-0234      │
├─────────────────────────────────────────────────────────────────┤
│ PATIENT INFO                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 Kwame Asante        Age: 45 years        Gender: Male    │ │
│ │ MRN: PAT-2024-0001     Phone: 0244123456                    │ │
│ │ ⚠️ ALLERGIES: Penicillin (Severe - Anaphylaxis)            │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PRESCRIPTION ITEMS                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☑️ Paracetamol 500mg Tablet                                 │ │
│ │    Dosage: 1 tablet | Frequency: TDS | Duration: 5 days    │ │
│ │    Qty Prescribed: 15 | Qty to Dispense: [15    ]          │ │
│ │    Stock: ✅ 500 available                                  │ │
│ │    Batch: [BTH-2024-001 ▼] Expiry: Dec 2025                │ │
│ │    Instructions: Take after meals                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☑️ Amoxicillin 500mg Capsule                                │ │
│ │    Dosage: 1 capsule | Frequency: TDS | Duration: 7 days   │ │
│ │    Qty Prescribed: 21 | Qty to Dispense: [21    ]          │ │
│ │    Stock: ⚠️ 15 available (partial)                        │ │
│ │    Batch: [BTH-2024-002 ▼] Expiry: Mar 2025                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☐ Omeprazole 20mg Capsule                                   │ │
│ │    Qty Prescribed: 14 | Qty to Dispense: [0     ]          │ │
│ │    Stock: ❌ OUT OF STOCK                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ COUNSELING NOTES                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Complete the full course of antibiotics. Take paracetamol │ │
│ │  only when needed for pain. Return if symptoms persist.]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [Cancel]              [Partial Dispense]        [✓ Dispense All]│
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Order

### Week 1: Core Dispensing
1. Database migrations for new tables
2. Pharmacy service (dispensing logic)
3. Prescription queue API
4. Dispensing API
5. Stock deduction on dispense
6. Frontend: Queue page + Dispense workspace

### Week 2: Stock Management & PO
1. Stock management APIs
2. Stock adjustment/write-off
3. Purchase order CRUD
4. Goods receiving
5. Stock transfer (basic)
6. Frontend: Stock pages + PO pages
7. Reports (basic)

---

## 8. Integration Points

```
PRESCRIPTION MODULE ←→ PHARMACY MODULE
- Prescription created → Appears in pharmacy queue
- Prescription dispensed → Status updated
- Partial dispense → Remaining items tracked

BILLING MODULE ←→ PHARMACY MODULE
- Dispensing creates billing line items
- Drug prices from stock (selling price)
- NHIS vs Cash pricing

INVENTORY MODULE ←→ PHARMACY MODULE
- Stock levels shared
- Reorder alerts
- Expiry tracking
```

---

## 9. Testing Checklist

```
□ Dispense full prescription
□ Partial dispense (some items out of stock)
□ Reject prescription back to doctor
□ Stock deduction on dispense
□ FEFO batch selection
□ Low stock alerts
□ Expiry alerts
□ Stock adjustment (add/remove)
□ Purchase order workflow
□ Goods receiving with batch/expiry
□ Stock transfer between branches
□ Drug utilization report
□ Stock valuation report
□ Permission checks for all actions
```
