# Billing & NHIS Module - Technical Specification

## Overview

The Billing & NHIS Module manages invoice generation, payment processing, and Ghana National Health Insurance Scheme (NHIS) claims submission. It integrates with all clinical modules to capture billable services.

**Estimated Development Time:** 3-4 weeks  
**Priority:** CRITICAL 🔥🔥🔥  
**Dependencies:** EMR ✅, Pharmacy ✅, Laboratory ✅ (all clinical modules)

---

## 1. Database Schema

### 1.1 Core Billing Tables

```prisma
// Patient billing account
model BillingAccount {
  id              String   @id @default(uuid())
  tenantId        String
  patientId       String   @unique
  accountNumber   String   @unique
  balance         Float    @default(0)  // Outstanding balance
  creditLimit     Float    @default(0)
  paymentTerms    String?  // CASH, CREDIT, NHIS, INSURANCE
  status          String   @default("ACTIVE")  // ACTIVE, SUSPENDED, CLOSED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  patient         Patient @relation(fields: [patientId], references: [id])
  invoices        Invoice[]
  payments        Payment[]

  @@index([tenantId])
  @@index([accountNumber])
  @@map("billing_accounts")
}

// Invoice (bill)
model Invoice {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  accountId       String
  patientId       String
  encounterId     String?
  invoiceNumber   String   @unique
  invoiceDate     DateTime @default(now())
  dueDate         DateTime?
  subtotal        Float    @default(0)
  discount        Float    @default(0)
  discountReason  String?
  tax             Float    @default(0)
  totalAmount     Float    @default(0)
  paidAmount      Float    @default(0)
  balanceDue      Float    @default(0)
  status          String   @default("DRAFT")  // DRAFT, PENDING, PARTIAL, PAID, CANCELLED, WRITTEN_OFF
  paymentMethod   String?  // CASH, NHIS, INSURANCE, MIXED
  nhisClaimId     String?
  insuranceClaimId String?
  notes           String?
  createdBy       String
  cancelledBy     String?
  cancelledAt     DateTime?
  cancelReason    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  account         BillingAccount @relation(fields: [accountId], references: [id])
  patient         Patient @relation(fields: [patientId], references: [id])
  encounter       Encounter? @relation(fields: [encounterId], references: [id])
  items           InvoiceItem[]
  payments        Payment[]
  nhisClaim       NHISClaim? @relation(fields: [nhisClaimId], references: [id])

  @@index([tenantId, invoiceDate])
  @@index([patientId])
  @@index([status])
  @@map("invoices")
}

// Invoice line items
model InvoiceItem {
  id              String   @id @default(uuid())
  invoiceId       String
  serviceType     String   // CONSULTATION, DRUG, LAB_TEST, PROCEDURE, RADIOLOGY, BED, OTHER
  serviceId       String?  // Reference to specific service (drugId, testId, etc.)
  description     String
  quantity        Int      @default(1)
  unitPrice       Float
  discount        Float    @default(0)
  totalPrice      Float
  nhisApproved    Boolean  @default(false)
  nhisPrice       Float?
  nhisClaimable   Float?   // Amount claimable from NHIS
  patientPortion  Float?   // Amount patient pays
  notes           String?
  createdAt       DateTime @default(now())

  invoice         Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("invoice_items")
}

// Payments
model Payment {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  accountId       String
  invoiceId       String?
  patientId       String
  receiptNumber   String   @unique
  paymentDate     DateTime @default(now())
  amount          Float
  paymentMethod   String   // CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, NHIS, INSURANCE, CHEQUE
  mobileMoneyProvider String?  // MTN, VODAFONE, AIRTELTIGO
  mobileMoneyNumber String?
  transactionRef  String?  // External transaction reference
  cardType        String?  // VISA, MASTERCARD
  cardLast4       String?
  chequeNumber    String?
  bankName        String?
  status          String   @default("COMPLETED")  // PENDING, COMPLETED, FAILED, REFUNDED
  receivedBy      String
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  account         BillingAccount @relation(fields: [accountId], references: [id])
  invoice         Invoice? @relation(fields: [invoiceId], references: [id])
  patient         Patient @relation(fields: [patientId], references: [id])
  receivedByUser  User @relation(fields: [receivedBy], references: [id])

  @@index([tenantId, paymentDate])
  @@index([receiptNumber])
  @@index([patientId])
  @@map("payments")
}

// Price list / Tariff
model ServicePrice {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String?  // Null = all branches
  serviceType     String   // CONSULTATION, PROCEDURE, BED, etc.
  serviceCode     String
  serviceName     String
  cashPrice       Float
  nhisPrice       Float?
  insurancePrice  Float?
  effectiveFrom   DateTime @default(now())
  effectiveTo     DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([tenantId, branchId, serviceType, serviceCode])
  @@index([tenantId, serviceType])
  @@map("service_prices")
}
```

### 1.2 NHIS Claims Tables

```prisma
// NHIS Member information
model NHISMember {
  id              String   @id @default(uuid())
  patientId       String   @unique
  membershipId    String   // NHIS card number
  membershipType  String   // FORMAL, INFORMAL, SSNIT, EXEMPT
  validFrom       DateTime?
  validTo         DateTime?
  isActive        Boolean  @default(true)
  lastVerified    DateTime?
  verificationStatus String?  // VERIFIED, EXPIRED, INVALID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  patient         Patient @relation(fields: [patientId], references: [id])
  claims          NHISClaim[]

  @@index([membershipId])
  @@map("nhis_members")
}

// NHIS Claims
model NHISClaim {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  memberId        String
  patientId       String
  encounterId     String?
  claimNumber     String   @unique
  claimDate       DateTime @default(now())
  serviceDate     DateTime
  diagnosisCodes  String[] // ICD-10 codes
  totalAmount     Float
  approvedAmount  Float?
  rejectedAmount  Float?
  status          String   @default("DRAFT")  // DRAFT, SUBMITTED, PROCESSING, APPROVED, PARTIAL, REJECTED, PAID
  submittedAt     DateTime?
  submittedBy     String?
  processedAt     DateTime?
  paidAt          DateTime?
  paidAmount      Float?
  rejectionReason String?
  batchId         String?  // For batch submission
  xmlPayload      String?  // Stored XML for submission
  responsePayload String?  // NHIA response
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  member          NHISMember @relation(fields: [memberId], references: [id])
  patient         Patient @relation(fields: [patientId], references: [id])
  encounter       Encounter? @relation(fields: [encounterId], references: [id])
  items           NHISClaimItem[]
  invoices        Invoice[]

  @@index([tenantId, claimDate])
  @@index([status])
  @@index([claimNumber])
  @@map("nhis_claims")
}

// NHIS Claim line items
model NHISClaimItem {
  id              String   @id @default(uuid())
  claimId         String
  itemType        String   // CONSULTATION, DRUG, LAB, PROCEDURE
  itemCode        String   // NHIS tariff code
  description     String
  quantity        Int      @default(1)
  unitPrice       Float    // NHIS tariff price
  totalPrice      Float
  approvedQty     Int?
  approvedAmount  Float?
  rejectionReason String?
  createdAt       DateTime @default(now())

  claim           NHISClaim @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@index([claimId])
  @@map("nhis_claim_items")
}

// NHIS Claim batches (for bulk submission)
model NHISClaimBatch {
  id              String   @id @default(uuid())
  tenantId        String
  branchId        String
  batchNumber     String   @unique
  periodFrom      DateTime
  periodTo        DateTime
  claimCount      Int      @default(0)
  totalAmount     Float    @default(0)
  status          String   @default("DRAFT")  // DRAFT, SUBMITTED, PROCESSING, RECONCILED
  submittedAt     DateTime?
  submittedBy     String?
  xmlFile         String?  // Path to generated XML file
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId, periodFrom])
  @@map("nhis_claim_batches")
}
```

### 1.3 Private Insurance Tables

```prisma
// Insurance companies
model InsuranceCompany {
  id              String   @id @default(uuid())
  tenantId        String
  name            String
  code            String
  contactPerson   String?
  phone           String?
  email           String?
  address         String?
  paymentTerms    Int?     // Days
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  policies        InsurancePolicy[]
  claims          InsuranceClaim[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("insurance_companies")
}

// Patient insurance policies
model InsurancePolicy {
  id              String   @id @default(uuid())
  patientId       String
  companyId       String
  policyNumber    String
  groupNumber     String?
  memberName      String?
  relationship    String?  // SELF, SPOUSE, CHILD, DEPENDENT
  validFrom       DateTime
  validTo         DateTime
  coverageLimit   Float?
  usedAmount      Float    @default(0)
  copayPercent    Float?   // Patient pays this %
  copayAmount     Float?   // Fixed copay amount
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  patient         Patient @relation(fields: [patientId], references: [id])
  company         InsuranceCompany @relation(fields: [companyId], references: [id])
  claims          InsuranceClaim[]

  @@index([patientId])
  @@index([policyNumber])
  @@map("insurance_policies")
}

// Insurance claims
model InsuranceClaim {
  id              String   @id @default(uuid())
  tenantId        String
  policyId        String
  companyId       String
  patientId       String
  encounterId     String?
  claimNumber     String   @unique
  claimDate       DateTime @default(now())
  totalAmount     Float
  approvedAmount  Float?
  patientPortion  Float?
  status          String   @default("DRAFT")  // DRAFT, PREAUTH_PENDING, PREAUTH_APPROVED, SUBMITTED, APPROVED, REJECTED, PAID
  preAuthRequired Boolean  @default(false)
  preAuthNumber   String?
  preAuthStatus   String?
  submittedAt     DateTime?
  processedAt     DateTime?
  paidAt          DateTime?
  rejectionReason String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  policy          InsurancePolicy @relation(fields: [policyId], references: [id])
  company         InsuranceCompany @relation(fields: [companyId], references: [id])
  patient         Patient @relation(fields: [patientId], references: [id])
  encounter       Encounter? @relation(fields: [encounterId], references: [id])
  items           InsuranceClaimItem[]

  @@index([tenantId, claimDate])
  @@index([status])
  @@map("insurance_claims")
}

model InsuranceClaimItem {
  id              String   @id @default(uuid())
  claimId         String
  serviceType     String
  description     String
  quantity        Int      @default(1)
  unitPrice       Float
  totalPrice      Float
  approvedAmount  Float?
  createdAt       DateTime @default(now())

  claim           InsuranceClaim @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@index([claimId])
  @@map("insurance_claim_items")
}
```

---

## 2. API Endpoints

### 2.1 Invoicing

```
# Invoices
GET    /api/billing/invoices                  # List invoices
POST   /api/billing/invoices                  # Create invoice
GET    /api/billing/invoices/:id              # Get invoice details
PUT    /api/billing/invoices/:id              # Update invoice
POST   /api/billing/invoices/:id/finalize     # Finalize draft invoice
POST   /api/billing/invoices/:id/cancel       # Cancel invoice
POST   /api/billing/invoices/:id/write-off    # Write off bad debt

# Auto-generate from encounter
POST   /api/billing/invoices/from-encounter/:encounterId

# Invoice items
POST   /api/billing/invoices/:id/items        # Add item
PUT    /api/billing/invoices/:id/items/:itemId  # Update item
DELETE /api/billing/invoices/:id/items/:itemId  # Remove item

# Discounts
POST   /api/billing/invoices/:id/discount     # Apply discount
```

### 2.2 Payments

```
# Payments
GET    /api/billing/payments                  # List payments
POST   /api/billing/payments                  # Record payment
GET    /api/billing/payments/:id              # Get payment details
POST   /api/billing/payments/:id/refund       # Process refund
GET    /api/billing/payments/receipt/:receiptNumber  # Get receipt

# Mobile Money
POST   /api/billing/payments/mobile-money/initiate  # Initiate MoMo payment
POST   /api/billing/payments/mobile-money/callback  # MoMo callback webhook
GET    /api/billing/payments/mobile-money/status/:ref  # Check payment status
```

### 2.3 NHIS

```
# Member verification
GET    /api/billing/nhis/verify/:membershipId  # Verify NHIS membership
POST   /api/billing/nhis/members               # Register NHIS member

# Claims
GET    /api/billing/nhis/claims                # List claims
POST   /api/billing/nhis/claims                # Create claim
GET    /api/billing/nhis/claims/:id            # Get claim details
PUT    /api/billing/nhis/claims/:id            # Update claim
POST   /api/billing/nhis/claims/:id/submit     # Submit to NHIA
POST   /api/billing/nhis/claims/:id/cancel     # Cancel claim

# Batch submission
GET    /api/billing/nhis/batches               # List batches
POST   /api/billing/nhis/batches               # Create batch
POST   /api/billing/nhis/batches/:id/generate-xml  # Generate XML file
POST   /api/billing/nhis/batches/:id/submit    # Submit batch
GET    /api/billing/nhis/batches/:id/download  # Download XML

# Reconciliation
GET    /api/billing/nhis/reconciliation        # Reconciliation report
POST   /api/billing/nhis/reconciliation/import # Import NHIA response
```

### 2.4 Private Insurance

```
# Companies
GET    /api/billing/insurance/companies        # List companies
POST   /api/billing/insurance/companies        # Add company
PUT    /api/billing/insurance/companies/:id    # Update company

# Policies
GET    /api/billing/insurance/policies/:patientId  # Get patient policies
POST   /api/billing/insurance/policies         # Add policy
PUT    /api/billing/insurance/policies/:id     # Update policy

# Claims
GET    /api/billing/insurance/claims           # List claims
POST   /api/billing/insurance/claims           # Create claim
POST   /api/billing/insurance/claims/:id/preauth  # Request pre-authorization
POST   /api/billing/insurance/claims/:id/submit   # Submit claim
```

### 2.5 Reports

```
GET    /api/billing/reports/daily-summary      # Daily sales summary
GET    /api/billing/reports/revenue            # Revenue report
GET    /api/billing/reports/outstanding        # Outstanding invoices
GET    /api/billing/reports/aging              # Debt aging report
GET    /api/billing/reports/payment-methods    # Payment method breakdown
GET    /api/billing/reports/nhis-summary       # NHIS claims summary
GET    /api/billing/reports/cashier/:userId    # Cashier report
```

### 2.6 Price Management

```
GET    /api/billing/prices                     # List prices
POST   /api/billing/prices                     # Create price
PUT    /api/billing/prices/:id                 # Update price
POST   /api/billing/prices/import              # Bulk import prices
GET    /api/billing/prices/export              # Export price list
```

---

## 3. Frontend Components

### 3.1 Pages

```
/billing                            # Billing Dashboard
/billing/invoices                   # Invoice List
/billing/invoices/new               # Create Invoice
/billing/invoices/:id               # Invoice Details
/billing/payments                   # Payment History
/billing/payments/receive           # Receive Payment
/billing/nhis                       # NHIS Dashboard
/billing/nhis/claims                # NHIS Claims List
/billing/nhis/claims/:id            # Claim Details
/billing/nhis/batches               # Batch Submissions
/billing/nhis/reconciliation        # Reconciliation
/billing/insurance                  # Private Insurance
/billing/prices                     # Price Management
/billing/reports                    # Financial Reports
```

### 3.2 Key Components

```tsx
// Dashboard
<BillingDashboard />
  ├── <TodayRevenueWidget />        // Today's collections
  ├── <OutstandingWidget />         // Outstanding invoices
  ├── <NHISPendingWidget />         // Pending NHIS claims
  ├── <PaymentMethodsChart />       // Payment breakdown
  └── <RecentTransactionsWidget />  // Recent payments

// Invoicing
<InvoiceList />
  ├── <InvoiceFilters />            // Status, date, patient
  ├── <InvoiceTable />              // List of invoices
  └── <InvoiceActions />            // Pay, Print, Cancel

<InvoiceForm />
  ├── <PatientSelector />           // Search/select patient
  ├── <PaymentTypeSelector />       // Cash, NHIS, Insurance
  ├── <InvoiceItemsTable />         // Line items
  │   └── <AddServiceModal />       // Add consultation, drug, test
  ├── <DiscountSection />           // Apply discounts
  ├── <TotalsSection />             // Subtotal, discount, total
  └── <InvoiceActions />            // Save, Finalize, Print

<InvoiceDetail />
  ├── <InvoiceHeader />             // Invoice #, date, patient
  ├── <InvoiceItems />              // Line items
  ├── <PaymentHistory />            // Payments made
  └── <InvoiceActions />            // Pay, Print, Cancel

// Payments
<PaymentForm />
  ├── <InvoiceSelector />           // Select invoice(s) to pay
  ├── <AmountInput />               // Payment amount
  ├── <PaymentMethodSelect />       // Cash, Card, MoMo
  │   ├── <CashPayment />           // Cash details
  │   ├── <CardPayment />           // Card details
  │   └── <MobileMoneyPayment />    // MoMo details
  └── <ReceiptPreview />            // Preview receipt

<ReceiptPrint />
  ├── <HospitalHeader />
  ├── <PatientInfo />
  ├── <PaymentDetails />
  └── <PrintButton />

// NHIS
<NHISDashboard />
  ├── <ClaimsSummaryWidget />       // Claims by status
  ├── <PendingSubmissionWidget />   // Ready to submit
  ├── <RejectedClaimsWidget />      // Needs attention
  └── <MonthlyTrendChart />         // Claims trend

<NHISClaimForm />
  ├── <MemberVerification />        // Verify NHIS status
  ├── <DiagnosisSelector />         // ICD-10 codes
  ├── <ClaimItemsTable />           // Services claimed
  └── <ClaimActions />              // Save, Submit

<NHISBatchSubmission />
  ├── <PeriodSelector />            // Date range
  ├── <ClaimsPreview />             // Claims in batch
  ├── <XMLGenerator />              // Generate XML
  └── <SubmitButton />              // Submit to NHIA

// Reports
<FinancialReports />
  ├── <ReportSelector />            // Choose report type
  ├── <DateRangeFilter />           // Period selection
  ├── <ReportViewer />              // Display report
  └── <ExportButtons />             // PDF, Excel
```

---

## 4. Business Logic

### 4.1 Invoice Generation

```typescript
// Auto-generate invoice from encounter
async function generateInvoiceFromEncounter(encounterId: string): Promise<Invoice> {
  const encounter = await getEncounterWithServices(encounterId);
  const patient = await getPatientWithInsurance(encounter.patientId);
  
  const items: InvoiceItem[] = [];
  
  // 1. Consultation fee
  items.push({
    serviceType: 'CONSULTATION',
    description: `${encounter.encounterType} Consultation`,
    quantity: 1,
    unitPrice: getConsultationFee(encounter),
    nhisApproved: isNHISApproved('CONSULTATION'),
    nhisPrice: getNHISPrice('CONSULTATION'),
  });
  
  // 2. Drugs dispensed
  for (const prescription of encounter.prescriptions) {
    for (const item of prescription.items) {
      if (item.dispensedQty > 0) {
        items.push({
          serviceType: 'DRUG',
          serviceId: item.drugId,
          description: `${item.drug.genericName} ${item.drug.strength}`,
          quantity: item.dispensedQty,
          unitPrice: item.drug.cashPrice,
          nhisApproved: item.drug.nhisApproved,
          nhisPrice: item.drug.nhisPrice,
        });
      }
    }
  }
  
  // 3. Lab tests
  for (const labOrder of encounter.labOrders) {
    for (const item of labOrder.items) {
      if (item.status === 'COMPLETED') {
        items.push({
          serviceType: 'LAB_TEST',
          serviceId: item.testId,
          description: item.test.name,
          quantity: 1,
          unitPrice: item.test.cashPrice,
          nhisApproved: item.test.nhisApproved,
          nhisPrice: item.test.nhisPrice,
        });
      }
    }
  }
  
  // 4. Calculate NHIS vs Patient portions
  const paymentType = determinePaymentType(patient);
  if (paymentType === 'NHIS') {
    calculateNHISPortions(items, patient.nhisMember);
  }
  
  return createInvoice({
    patientId: patient.id,
    encounterId,
    items,
    paymentMethod: paymentType,
  });
}
```

### 4.2 NHIS Claim Generation

```typescript
// Generate NHIS claim XML (Ghana NHIA format)
function generateNHISClaimXML(claim: NHISClaim): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CLAIMS>
  <CLAIM>
    <FACILITY_CODE>${claim.facilityCode}</FACILITY_CODE>
    <CLAIM_NUMBER>${claim.claimNumber}</CLAIM_NUMBER>
    <MEMBER_ID>${claim.member.membershipId}</MEMBER_ID>
    <SERVICE_DATE>${formatDate(claim.serviceDate)}</SERVICE_DATE>
    <DIAGNOSIS>
      ${claim.diagnosisCodes.map(code => `<ICD10_CODE>${code}</ICD10_CODE>`).join('\n')}
    </DIAGNOSIS>
    <SERVICES>
      ${claim.items.map(item => `
      <SERVICE>
        <SERVICE_CODE>${item.itemCode}</SERVICE_CODE>
        <SERVICE_TYPE>${item.itemType}</SERVICE_TYPE>
        <DESCRIPTION>${item.description}</DESCRIPTION>
        <QUANTITY>${item.quantity}</QUANTITY>
        <UNIT_PRICE>${item.unitPrice}</UNIT_PRICE>
        <TOTAL_PRICE>${item.totalPrice}</TOTAL_PRICE>
      </SERVICE>
      `).join('')}
    </SERVICES>
    <TOTAL_AMOUNT>${claim.totalAmount}</TOTAL_AMOUNT>
  </CLAIM>
</CLAIMS>`;
  
  return xml;
}
```

### 4.3 Mobile Money Integration

```typescript
// MTN Mobile Money integration
interface MobileMoneyPayment {
  provider: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
  phoneNumber: string;
  amount: number;
  reference: string;
  callback: string;
}

async function initiateMobileMoneyPayment(payment: MobileMoneyPayment): Promise<PaymentResponse> {
  // MTN MoMo API integration
  if (payment.provider === 'MTN') {
    const response = await mtnMomoApi.requestToPay({
      amount: payment.amount.toString(),
      currency: 'GHS',
      externalId: payment.reference,
      payer: {
        partyIdType: 'MSISDN',
        partyId: payment.phoneNumber,
      },
      payerMessage: `Payment for invoice ${payment.reference}`,
      payeeNote: 'Hospital payment',
    });
    
    return {
      transactionId: response.referenceId,
      status: 'PENDING',
      message: 'Payment request sent to customer',
    };
  }
  
  // Similar for Vodafone Cash, AirtelTigo Money
}

// Webhook handler for payment confirmation
async function handleMobileMoneyCallback(payload: MoMoCallback): Promise<void> {
  const payment = await findPaymentByReference(payload.externalId);
  
  if (payload.status === 'SUCCESSFUL') {
    await updatePaymentStatus(payment.id, 'COMPLETED', payload.financialTransactionId);
    await updateInvoicePayment(payment.invoiceId, payment.amount);
    await sendPaymentReceipt(payment);
  } else {
    await updatePaymentStatus(payment.id, 'FAILED', null, payload.reason);
  }
}
```

### 4.4 Payment Allocation

```typescript
// Allocate payment to invoice(s)
async function allocatePayment(
  paymentId: string,
  allocations: { invoiceId: string; amount: number }[]
): Promise<void> {
  for (const allocation of allocations) {
    const invoice = await getInvoice(allocation.invoiceId);
    
    // Update invoice paid amount
    const newPaidAmount = invoice.paidAmount + allocation.amount;
    const newBalance = invoice.totalAmount - newPaidAmount;
    
    let newStatus = invoice.status;
    if (newBalance <= 0) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    }
    
    await updateInvoice(invoice.id, {
      paidAmount: newPaidAmount,
      balanceDue: newBalance,
      status: newStatus,
    });
    
    // Create allocation record
    await createPaymentAllocation({
      paymentId,
      invoiceId: allocation.invoiceId,
      amount: allocation.amount,
    });
  }
}
```

---

## 5. Permissions (RBAC)

```typescript
const billingPermissions = [
  // Invoicing
  'VIEW_INVOICES',
  'CREATE_INVOICE',
  'EDIT_INVOICE',
  'CANCEL_INVOICE',
  'APPLY_DISCOUNT',
  'WRITE_OFF_INVOICE',
  
  // Payments
  'VIEW_PAYMENTS',
  'RECEIVE_PAYMENT',
  'PROCESS_REFUND',
  'PRINT_RECEIPT',
  
  // NHIS
  'VIEW_NHIS_CLAIMS',
  'CREATE_NHIS_CLAIM',
  'SUBMIT_NHIS_CLAIM',
  'RECONCILE_NHIS',
  
  // Insurance
  'VIEW_INSURANCE_CLAIMS',
  'CREATE_INSURANCE_CLAIM',
  'REQUEST_PREAUTH',
  'SUBMIT_INSURANCE_CLAIM',
  
  // Prices
  'VIEW_PRICES',
  'MANAGE_PRICES',
  
  // Reports
  'VIEW_BILLING_REPORTS',
  'VIEW_FINANCIAL_REPORTS',
  'EXPORT_REPORTS',
];

const rolePermissions = {
  CASHIER: [
    'VIEW_INVOICES',
    'CREATE_INVOICE',
    'RECEIVE_PAYMENT',
    'PRINT_RECEIPT',
    'VIEW_PAYMENTS',
  ],
  
  BILLING_OFFICER: [
    ...CASHIER,
    'EDIT_INVOICE',
    'APPLY_DISCOUNT',
    'VIEW_NHIS_CLAIMS',
    'CREATE_NHIS_CLAIM',
    'VIEW_INSURANCE_CLAIMS',
    'CREATE_INSURANCE_CLAIM',
    'VIEW_BILLING_REPORTS',
  ],
  
  BILLING_MANAGER: [
    ...BILLING_OFFICER,
    'CANCEL_INVOICE',
    'WRITE_OFF_INVOICE',
    'PROCESS_REFUND',
    'SUBMIT_NHIS_CLAIM',
    'RECONCILE_NHIS',
    'REQUEST_PREAUTH',
    'SUBMIT_INSURANCE_CLAIM',
    'MANAGE_PRICES',
    'VIEW_FINANCIAL_REPORTS',
    'EXPORT_REPORTS',
  ],
  
  ACCOUNTANT: [
    'VIEW_INVOICES',
    'VIEW_PAYMENTS',
    'VIEW_NHIS_CLAIMS',
    'VIEW_INSURANCE_CLAIMS',
    'VIEW_BILLING_REPORTS',
    'VIEW_FINANCIAL_REPORTS',
    'EXPORT_REPORTS',
    'RECONCILE_NHIS',
  ],
};
```

---

## 6. UI Mockups (Text-based)

### 6.1 Invoice Creation

```
┌─────────────────────────────────────────────────────────────────┐
│ 💰 Create Invoice                                    [← Back]   │
├─────────────────────────────────────────────────────────────────┤
│ PATIENT                                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 [Search patient by name or MRN...                      ] │ │
│ │                                                             │ │
│ │ Selected: Kwame Asante (MRN: PAT-2024-0001)                │ │
│ │ Phone: 0244123456 | Age: 45 | Gender: Male                 │ │
│ │ NHIS: ✅ Active (GHA-NHIS-123456) Valid until: Dec 2026   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PAYMENT TYPE                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ (●) NHIS    ( ) Cash    ( ) Insurance    ( ) Mixed         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ INVOICE ITEMS                                    [+ Add Item]   │
│ ┌───────────────────┬─────┬─────────┬─────────┬───────┬──────┐ │
│ │ Description       │ Qty │ Price   │ NHIS    │ Patient│ Total│ │
│ ├───────────────────┼─────┼─────────┼─────────┼───────┼──────┤ │
│ │ OPD Consultation  │ 1   │ GHS 50  │ GHS 35  │ GHS 15│ GHS50│ │
│ │ Paracetamol 500mg │ 15  │ GHS 0.50│ GHS 0.30│ GHS 3 │ GHS 8│ │
│ │ Amoxicillin 500mg │ 21  │ GHS 2   │ GHS 1.50│ GHS 11│GHS 42│ │
│ │ Full Blood Count  │ 1   │ GHS 50  │ GHS 35  │ GHS 15│GHS 50│ │
│ │ Malaria RDT       │ 1   │ GHS 25  │ GHS 18  │ GHS 7 │GHS 25│ │
│ └───────────────────┴─────┴─────────┴─────────┴───────┴──────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                          Subtotal:    GHS 175   │
│                                          NHIS Covers: GHS 124   │
│                                          Patient Pays: GHS 51   │
│                                          ─────────────────────  │
│                                          TOTAL DUE:   GHS 51    │
├─────────────────────────────────────────────────────────────────┤
│ [Cancel]                    [Save Draft]    [✓ Finalize & Pay] │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Payment Receipt

```
┌─────────────────────────────────────────────────────────────────┐
│                     🏥 DEMO HOSPITAL                            │
│                   OFFICIAL RECEIPT                              │
│                                                                 │
│ Receipt #: RCP-2024-0567              Date: Feb 14, 2026       │
│ Cashier: Abena Mensah                 Time: 11:30 AM           │
├─────────────────────────────────────────────────────────────────┤
│ PATIENT DETAILS                                                 │
│ Name: Kwame Asante                    MRN: PAT-2024-0001       │
│ Phone: 0244123456                                              │
├─────────────────────────────────────────────────────────────────┤
│ PAYMENT DETAILS                                                 │
│ Invoice #: INV-2024-0234                                       │
│                                                                 │
│ Description                           Amount                    │
│ ─────────────────────────────────────────────────────────────  │
│ OPD Consultation                      GHS 15.00                │
│ Medications (3 items)                 GHS 14.00                │
│ Laboratory Tests (2 items)            GHS 22.00                │
│ ─────────────────────────────────────────────────────────────  │
│ TOTAL PAID                            GHS 51.00                │
│                                                                 │
│ Payment Method: Mobile Money (MTN)                             │
│ Transaction Ref: MOMO-2024-0567890                             │
├─────────────────────────────────────────────────────────────────┤
│ NHIS Claim: GHS 124.00 (Claim #: NHIS-2024-0234)              │
├─────────────────────────────────────────────────────────────────┤
│                    Thank you for choosing us!                   │
│                     Get well soon! 🙏                           │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 NHIS Claims Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏥 NHIS Claims Management                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │   DRAFT     │ │  SUBMITTED  │ │  APPROVED   │ │  REJECTED   │ │
│ │     23      │ │     45      │ │    156      │ │     12      │ │
│ │  GHS 4,500  │ │  GHS 12,300 │ │  GHS 45,600 │ │  GHS 2,100  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PENDING SUBMISSION (23 claims)              [Submit All] [Export]│
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☑ NHIS-2024-0567 | Kwame Asante | Feb 14 | GHS 175         │ │
│ │   Diagnosis: A09.0 (Gastroenteritis), B54 (Malaria)        │ │
│ │   Services: Consultation, Drugs (3), Lab (2)               │ │
│ │                                              [Edit] [Submit]│ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ ☑ NHIS-2024-0566 | Ama Serwaa | Feb 14 | GHS 250           │ │
│ │   Diagnosis: J06.9 (Upper respiratory infection)           │ │
│ │   Services: Consultation, Drugs (5), Lab (1)               │ │
│ │                                              [Edit] [Submit]│ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ REJECTED CLAIMS (Needs Attention)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ NHIS-2024-0450 | Kofi Mensah | Feb 10 | GHS 320         │ │
│ │   Rejection: Invalid ICD-10 code for procedure             │ │
│ │                                         [Review] [Resubmit] │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Order

### Week 1: Core Billing
1. Database migrations
2. Billing account service
3. Invoice CRUD
4. Invoice item management
5. Auto-generate from encounter
6. Frontend: Invoice list + form

### Week 2: Payments
1. Payment service
2. Cash/card payment processing
3. Mobile Money integration (MTN MoMo)
4. Receipt generation
5. Payment allocation
6. Frontend: Payment form + receipt

### Week 3: NHIS
1. NHIS member management
2. NHIS claim generation
3. XML generation (NHIA format)
4. Batch submission
5. Reconciliation import
6. Frontend: NHIS dashboard + claims

### Week 4: Insurance & Reports
1. Private insurance claims
2. Pre-authorization workflow
3. Financial reports
4. Price management
5. Frontend: Insurance + Reports
6. Integration testing

---

## 8. Integration Points

```
EMR MODULE ←→ BILLING MODULE
- Encounter completed → Auto-generate invoice
- Services rendered → Billing line items

PHARMACY MODULE ←→ BILLING MODULE
- Drugs dispensed → Add to invoice
- Drug prices from inventory

LAB MODULE ←→ BILLING MODULE
- Tests completed → Add to invoice
- Test prices from catalog

PATIENT MODULE ←→ BILLING MODULE
- NHIS membership info
- Insurance policies
- Billing account

NOTIFICATION MODULE ←→ BILLING MODULE
- Payment confirmation SMS
- Outstanding balance reminders
```

---

## 9. Ghana-Specific Requirements

### 9.1 NHIS Integration
- **NHIA Portal**: Claims submitted via XML to NHIA portal
- **Tariff Codes**: Use NHIS tariff codes for services
- **ICD-10 Validation**: Diagnosis codes must be valid for claimed services
- **Essential Medicines**: Only NHIS-approved drugs claimable
- **Capitation**: Support for capitation-based facilities

### 9.2 Mobile Money
- **MTN MoMo**: Most popular, API integration
- **Vodafone Cash**: Second largest
- **AirtelTigo Money**: Third option
- **USSD Fallback**: For non-smartphone users

### 9.3 Tax
- **VAT**: 15% on non-medical services (if applicable)
- **NHIL/GETFund**: 2.5% each on applicable services
- **COVID Levy**: 1% (if still applicable)

---

## 10. Testing Checklist

```
□ Create invoice manually
□ Auto-generate invoice from encounter
□ Add/remove invoice items
□ Apply discount
□ Finalize invoice
□ Cancel invoice
□ Receive cash payment
□ Receive card payment
□ Initiate MoMo payment
□ Handle MoMo callback
□ Print receipt
□ Partial payment
□ Payment allocation
□ NHIS member verification
□ Create NHIS claim
□ Generate NHIS XML
□ Submit NHIS batch
□ Import NHIS reconciliation
□ Handle rejected claims
□ Private insurance claim
□ Pre-authorization request
□ Daily sales report
□ Outstanding invoices report
□ NHIS summary report
□ Permission checks
```
