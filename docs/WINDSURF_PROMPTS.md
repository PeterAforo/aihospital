# Windsurf AI Prompts - Copy & Paste Guide

This document contains ready-to-use prompts for Windsurf IDE to generate each module of the hospital management system. Copy and paste these prompts directly into Windsurf.

---

## 🚀 INITIAL PROJECT SETUP

### Prompt 1: Create Project Structure
```
Create a monorepo hospital management system with the following structure:

1. Backend (Node.js + Express + TypeScript + Prisma)
2. Frontend (React + TypeScript + Ant Design)
3. Mobile (React Native + Expo)
4. Shared types and constants

Requirements:
- Use pnpm workspaces
- Set up TypeScript with strict mode
- Configure ESLint and Prettier
- Add Docker support for PostgreSQL and Redis
- Create .env.example files
- Set up Git with proper .gitignore
- Include scripts for development, build, and deployment

Generate the complete folder structure with all configuration files.
```

### Prompt 2: Database Setup with Prisma
```
Set up Prisma ORM for a multi-tenant hospital management system:

1. Create schema.prisma with:
   - Tenant model (hospitals)
   - Branch model (multiple locations)
   - User model with roles (SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, PHARMACIST, LAB_TECHNICIAN, RECEPTIONIST, BILLING_OFFICER, HR_MANAGER)
   - Patient model with Ghana-specific fields (Ghana Card number, NHIS number)
   - Appointment model
   - Encounter model (clinical visits)

2. Implement multi-tenancy using separate schemas per tenant
3. Add proper indexes for performance
4. Include soft delete functionality
5. Add audit timestamps (createdAt, updatedAt)
6. Set up migrations folder

Database: PostgreSQL 15+
```

### Prompt 3: Authentication System
```
Create a complete JWT authentication system with the following features:

1. User registration with email and phone validation
2. Login with JWT access token (15 min expiry) and refresh token (7 days)
3. Multi-factor authentication using SMS OTP
4. Password hashing with bcrypt
5. Role-based access control (RBAC)
6. Session management
7. Logout and token revocation
8. Password reset via SMS
9. Email verification (optional)

Include:
- Auth controllers and services
- Middleware for authentication and authorization
- DTOs for validation (using class-validator)
- Error handling
- Unit tests
- API endpoints:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/refresh
  - POST /api/auth/logout
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password
  - POST /api/auth/mfa/send
  - POST /api/auth/mfa/verify

Use TypeScript and follow NestJS-style architecture.
```

---

## 📋 MODULE 1: PATIENT MANAGEMENT

### Prompt 4: Patient Management Module
```
Create a complete Patient Management module for a Ghana hospital system:

Features:
1. Patient registration with:
   - Ghana Card number validation (format: GHA-XXXXXXXXX-X)
   - Phone number (+233 format)
   - NHIS number (optional)
   - Photo upload
   - Demographics (name, DOB, gender, address)
   - Medical history and allergies
   - Emergency contacts

2. Patient search with:
   - Fuzzy search by name
   - Search by Ghana Card, phone, MRN, NHIS number
   - Pagination (20 records per page)
   - Filters (gender, age range, NHIS status)

3. Duplicate detection and merge functionality

4. Patient visit history

5. API endpoints:
   - POST /api/patients (create)
   - GET /api/patients/:id (get by id)
   - PUT /api/patients/:id (update)
   - DELETE /api/patients/:id (soft delete)
   - GET /api/patients/search (search)
   - POST /api/patients/:id/merge (merge duplicates)
   - GET /api/patients/:id/visits (visit history)
   - POST /api/patients/:id/photo (upload photo)

Include:
- Prisma models
- Controllers and services
- DTOs with validation
- Unit and integration tests
- Error handling
- Audit logging

Tech: Node.js + Express + TypeScript + Prisma
```

### Prompt 5: Patient Registration React Form
```
Create a professional patient registration form in React with the following:

1. Multi-step form:
   - Step 1: Basic Information (name, DOB, gender, Ghana Card)
   - Step 2: Contact Information (phone, email, address, region, city)
   - Step 3: Medical Information (blood group, allergies, medical history, NHIS details)
   - Step 4: Emergency Contact (name, relationship, phone)
   - Step 5: Photo capture (camera or upload)

2. Features:
   - Form validation with react-hook-form and yup
   - Ghana Card number validation with proper format
   - Phone number input with +233 prefix
   - Date picker for DOB (must be in the past)
   - Image upload with preview and cropping
   - Auto-save draft to localStorage
   - Progress indicator
   - Responsive design (mobile-friendly)

3. Components:
   - PatientRegistrationWizard (main component)
   - BasicInformationStep
   - ContactInformationStep
   - MedicalInformationStep
   - EmergencyContactStep
   - PhotoCaptureStep
   - StepIndicator

4. Integration:
   - Connect to API endpoint POST /api/patients
   - Show success/error notifications
   - Redirect to patient profile on success

Use: React + TypeScript + Ant Design + React Hook Form
```

---

## 📅 MODULE 2: APPOINTMENT SCHEDULING

### Prompt 6: Appointment Module Backend
```
Create a comprehensive appointment scheduling system:

Features:
1. Doctor schedule management:
   - Weekly templates (e.g., Mon-Fri 9am-5pm)
   - Time slot configuration (15/30/45/60 min intervals)
   - Block time for breaks/emergencies
   - Leave/unavailability management

2. Appointment booking:
   - Check doctor availability
   - Prevent double booking
   - Support appointment types (consultation, follow-up, procedure)
   - Auto-calculate end time based on duration
   - Walk-in appointments

3. Queue management:
   - Check-in functionality
   - Real-time queue position
   - Estimated wait time
   - Queue notifications

4. Notifications:
   - SMS reminder 24 hours before (via Hubtel)
   - WhatsApp confirmation
   - Rescheduling notifications

5. No-show tracking and reporting

API Endpoints:
- POST /api/appointments (create)
- GET /api/appointments/:id (get details)
- PUT /api/appointments/:id (reschedule)
- DELETE /api/appointments/:id (cancel)
- POST /api/appointments/:id/check-in (check-in)
- GET /api/doctors/:id/availability (check slots)
- GET /api/doctors/:id/schedule (get schedule)
- POST /api/doctors/:id/schedule (create schedule)
- GET /api/queue/current (current queue)
- POST /api/notifications/send-reminder (send reminder)

Include:
- Prisma models for appointments, schedules, queue
- Services for scheduling logic
- Integration with SMS provider (Hubtel API)
- Cron job for automatic reminders
- Tests

Tech: Node.js + TypeScript + Prisma + node-cron
```

### Prompt 7: Appointment Calendar UI
```
Create an interactive appointment calendar interface in React:

Features:
1. Calendar Views:
   - Day view (time slots from 8am-6pm)
   - Week view
   - Month view
   - List view

2. Functionality:
   - Click on time slot to book appointment
   - Drag and drop to reschedule (with confirmation)
   - Color-coded appointments (scheduled=blue, checked-in=green, completed=gray, cancelled=red)
   - Filter by doctor
   - Search appointments
   - Today button to jump to current date
   - Navigation (prev/next day/week/month)

3. Appointment Booking Modal:
   - Patient search/selection
   - Doctor selection with availability check
   - Date and time picker
   - Appointment type selection
   - Duration selection
   - Reason for visit
   - Send SMS reminder checkbox

4. Real-time updates using WebSocket or polling

5. Mobile responsive

Components:
- AppointmentCalendar (main)
- CalendarHeader
- DayView
- WeekView
- MonthView
- ListView
- AppointmentBookingModal
- AppointmentDetailsModal
- TimeSlotGrid

Libraries to use:
- React Big Calendar or FullCalendar React
- Ant Design for UI components
- React Query for data fetching
- Date-fns for date manipulation

Tech: React + TypeScript + Ant Design
```

---

## 🏥 MODULE 3: EMR (Electronic Medical Records)

### Prompt 8: Clinical Encounter Module
```
Create a comprehensive EMR clinical encounter module:

Features:
1. Vital Signs Recording:
   - Blood pressure (systolic/diastolic)
   - Temperature (Celsius)
   - Pulse rate
   - Respiratory rate
   - Weight (kg), Height (cm), BMI (auto-calculate)
   - Oxygen saturation (SpO2)
   - Visual alerts for abnormal values

2. Clinical Documentation (SOAP format):
   - Subjective: Chief complaint, history of present illness
   - Objective: Physical examination findings
   - Assessment: Diagnosis (with ICD-10 code search)
   - Plan: Treatment plan, follow-up instructions

3. Clinical Templates:
   - Pre-built templates for common conditions
   - Custom template creation
   - Template variables and macros

4. Medical History Display:
   - Past medical history
   - Surgical history
   - Allergies (with prominent warnings)
   - Current medications
   - Family history
   - Social history

5. Digital Signature

6. Amendment tracking (with audit trail)

API Endpoints:
- POST /api/encounters (create)
- GET /api/encounters/:id (get)
- PUT /api/encounters/:id (update)
- POST /api/encounters/:id/vitals (add vitals)
- POST /api/encounters/:id/diagnosis (add diagnosis)
- POST /api/encounters/:id/sign (sign encounter)
- GET /api/patients/:patientId/encounters (history)
- GET /api/icd10/search (search ICD-10 codes)
- GET /api/templates (get clinical templates)

Include:
- Prisma models
- Controllers and services
- ICD-10 code integration
- Validation logic for vital signs
- Tests

Tech: Node.js + TypeScript + Prisma
```

### Prompt 9: EMR Clinical Notes UI
```
Create a modern clinical documentation interface:

Features:
1. Layout:
   - Left sidebar: Patient summary (photo, demographics, allergies, vital signs)
   - Center: Clinical note editor
   - Right sidebar: Patient history (previous encounters, medications, lab results)

2. Vitals Recording:
   - Quick entry form with real-time validation
   - Visual indicators for abnormal values
   - Vital signs chart/graph

3. Clinical Note Editor:
   - Rich text editor with formatting
   - Voice-to-text capability (optional)
   - Template insertion
   - Macro support
   - Auto-save every 30 seconds
   - SOAP sections (collapsible)

4. Diagnosis Entry:
   - ICD-10 code search with autocomplete
   - Recent diagnoses quick-select
   - Multiple diagnoses support
   - Primary/secondary designation

5. Allergy Warnings:
   - Prominent red banner if patient has allergies
   - Alert before prescribing

6. Previous Encounters:
   - Timeline view
   - Click to view full encounter
   - Copy from previous note

Components:
- ClinicalEncounterForm
- VitalsRecorder
- PatientSummaryPanel
- HistoryPanel
- SOAPEditor
- DiagnosisSelector
- AllergyAlert
- EncounterTimeline

Use: React + TypeScript + Ant Design + Draft.js (or TipTap for rich text)
```

---

## 💊 MODULE 4: PRESCRIPTION & PHARMACY

### Prompt 10: Prescription Management Backend
```
Create a prescription and pharmacy management system:

Features:
1. E-Prescription:
   - Create prescription linked to encounter
   - Drug database (generic and brand names)
   - Dosage forms (tablet, capsule, syrup, injection)
   - Route of administration
   - Frequency (OD, BD, TDS, QID, PRN)
   - Duration of treatment
   - Quantity calculation
   - Instructions for use

2. Drug Safety:
   - Drug interaction checking
   - Allergy cross-check
   - Duplicate therapy detection
   - Dosage range validation
   - Pregnancy category warnings

3. NHIS Drug List:
   - Mark NHIS-approved drugs
   - Pricing (NHIS vs cash price)
   - Generic substitution suggestions

4. Pharmacy Inventory:
   - Stock levels
   - Batch and expiry tracking
   - Automatic reorder points
   - Stock-in/stock-out transactions

5. Dispensing:
   - Prescription verification
   - Partial dispensing support
   - Dispensing history
   - Patient counseling notes

API Endpoints:
- POST /api/prescriptions (create)
- GET /api/prescriptions/:id (get)
- PUT /api/prescriptions/:id (update)
- GET /api/prescriptions/patient/:patientId (patient history)
- POST /api/prescriptions/check-interactions (check)
- GET /api/drugs/search (search drug database)
- GET /api/drugs/:id (drug details)
- POST /api/pharmacy/dispense (dispense medication)
- GET /api/pharmacy/stock (inventory)
- POST /api/pharmacy/stock-in (receive stock)
- GET /api/pharmacy/expiring (expiring drugs)
- GET /api/pharmacy/low-stock (low stock alerts)

Database Models:
- prescriptions
- prescription_items
- drugs_master
- drug_interactions
- nhis_drug_list
- pharmacy_stock
- stock_batches
- dispensing_records

Include:
- Drug interaction algorithm
- Stock management logic
- Tests

Tech: Node.js + TypeScript + Prisma
```

### Prompt 11: Prescription UI
```
Create an e-prescription interface for doctors:

Features:
1. Prescription Pad:
   - Patient info header
   - Drug selection (autocomplete search)
   - Dosage input
   - Frequency selection (dropdown)
   - Duration input (days)
   - Quantity auto-calculation
   - Special instructions
   - Add multiple drugs

2. Drug Selection:
   - Search by generic or brand name
   - Show drug details (strength, form, price)
   - NHIS status indicator
   - Favorite drugs quick-add
   - Recently prescribed drugs

3. Safety Checks:
   - Real-time interaction checking
   - Allergy warnings (pop-up alert)
   - Duplicate therapy warning
   - Dosage validation

4. Prescription Templates:
   - Save common prescription combinations
   - Quick-load templates
   - Edit and save

5. Print/Digital:
   - Professional prescription layout
   - QR code for verification
   - Doctor's digital signature
   - Send to pharmacy (internal)
   - SMS/WhatsApp to patient

Components:
- PrescriptionForm
- DrugSelector
- DrugInteractionAlert
- AllergyWarning
- PrescriptionPreview
- PrescriptionPrintLayout

Use: React + TypeScript + Ant Design
```

---

## 🔬 MODULE 5: LABORATORY

### Prompt 12: Laboratory Management Backend
```
Create a laboratory management system:

Features:
1. Test Catalog:
   - Test profiles/panels (e.g., Lipid Profile = Total Cholesterol + HDL + LDL + Triglycerides)
   - Individual tests
   - Department categorization (Hematology, Biochemistry, Microbiology, etc.)
   - Normal ranges (with age/gender variants)
   - TAT (Turnaround Time)
   - Pricing (NHIS vs cash)

2. Lab Order Management:
   - Order from EMR
   - Stat orders (urgent)
   - Fasting requirements
   - Sample type (blood, urine, stool, etc.)
   - Sample collection status

3. Sample Tracking:
   - Barcode/QR code generation
   - Sample reception logging
   - Chain of custody
   - Sample storage location

4. Result Entry:
   - Numeric results with units
   - Text results
   - Dropdown selections
   - File upload (images, PDFs)
   - Flag abnormal results
   - Critical value alerts

5. Result Approval Workflow:
   - Technician enters results
   - Pathologist reviews and approves
   - Approval history

6. Result Delivery:
   - Print results
   - Digital download (PDF)
   - SMS notification to patient
   - Portal access for patients

API Endpoints:
- GET /api/lab/tests (test catalog)
- POST /api/lab/orders (create order)
- GET /api/lab/orders/:id (get order)
- PUT /api/lab/orders/:id/collect (mark sample collected)
- POST /api/lab/orders/:id/results (enter results)
- PUT /api/lab/results/:id/approve (approve)
- GET /api/patients/:patientId/lab-results (patient history)
- GET /api/lab/pending (pending tests)
- POST /api/lab/barcode (generate barcode)
- GET /api/lab/critical (critical values)

Database Models:
- lab_tests_catalog
- lab_test_panels
- lab_orders
- lab_order_items
- lab_samples
- lab_results
- test_normal_ranges

Include:
- Barcode generation (using JsBarcode or similar)
- Result validation logic
- Critical value alerting
- Tests

Tech: Node.js + TypeScript + Prisma
```

### Prompt 13: Lab Technician Interface
```
Create a laboratory technician result entry interface:

Features:
1. Work Queue:
   - List of pending tests
   - Filter by department, urgency (stat), collection status
   - Search by patient name, order number
   - Color-coded priorities (stat=red, routine=blue)

2. Result Entry Form:
   - Patient details header
   - Test details (name, sample type, collection time)
   - Result fields based on test type:
     - Numeric input with unit display
     - Text area for narrative results
     - Dropdowns for categorical results
     - File upload for images/documents
   - Normal range display next to result field
   - Auto-flag if result is outside normal range
   - Comments/notes field
   - Technician signature

3. Critical Value Handling:
   - Red alert for critical values
   - Mandatory notification to doctor
   - Documentation of notification

4. Batch Entry:
   - Enter results for multiple tests at once
   - Keyboard shortcuts for efficiency
   - Auto-save on blur

5. Result Review:
   - Preview before submission
   - Edit capability before approval
   - Submit for pathologist approval

6. Result Approval (Pathologist):
   - Review pending results
   - Approve/reject with comments
   - Batch approval

Components:
- LabWorkQueue
- ResultEntryForm
- NumericResultInput
- TextResultInput
- NormalRangeIndicator
- CriticalValueAlert
- ResultPreview
- ApprovalQueue

Use: React + TypeScript + Ant Design
```

---

## 💰 MODULE 6: BILLING & PAYMENTS

### Prompt 14: Billing System Backend
```
Create a comprehensive billing and payment system for Ghana:

Features:
1. Service Pricing:
   - Multi-tier pricing (cash, NHIS, corporate, insurance)
   - Department-wise services
   - Consultation fees
   - Procedure fees
   - Lab test fees
   - Medication fees
   - Room charges (if applicable)

2. Invoice Generation:
   - Itemized billing (services, drugs, tests)
   - Auto-capture from EMR, Pharmacy, Lab
   - Manual items addition
   - Discounts (percentage or fixed)
   - Tax calculation (VAT, NHIL, GETFund)
   - Generate invoice number
   - PDF invoice

3. Payment Processing:
   - Multiple payment methods (cash, card, mobile money, insurance, bank transfer)
   - Split payments (part cash, part insurance)
   - Mobile money integration:
     - MTN Mobile Money
     - Vodafone Cash
     - AirtelTigo Money
   - Payment confirmation
   - Receipt generation

4. Mobile Money Integration (Hubtel):
   - Send payment request to customer phone
   - Callback handling for payment status
   - Transaction reconciliation
   - Failed payment handling
   - Refund processing

5. Outstanding Bills:
   - Track unpaid invoices
   - Aging report
   - Payment reminders (SMS)
   - Credit limits for corporate clients

6. Deposit Management:
   - Record deposits
   - Apply deposits to bills
   - Refund surplus

7. Reporting:
   - Daily cash collection
   - Revenue by service type
   - Revenue by payment method
   - Outstanding receivables

API Endpoints:
- POST /api/billing/invoices (create)
- GET /api/billing/invoices/:id (get)
- PUT /api/billing/invoices/:id (update)
- POST /api/billing/invoices/:id/finalize (finalize)
- POST /api/billing/payments (record payment)
- POST /api/billing/mobile-money/request (initiate MoMo payment)
- POST /api/billing/mobile-money/callback (MoMo callback)
- GET /api/billing/invoices/outstanding (unpaid bills)
- GET /api/billing/receipts/:id (get receipt)
- POST /api/billing/refund (process refund)
- GET /api/billing/reports/daily-collection (daily report)
- GET /api/services/prices (service pricing)

Database Models:
- invoices
- invoice_items
- payments
- payment_methods
- mobile_money_transactions
- service_prices
- receipts

Include:
- Hubtel Payment API integration
- Invoice number generation logic
- Tax calculation
- Receipt PDF generation
- Tests

Tech: Node.js + TypeScript + Prisma + Axios (for Hubtel API)
```

### Prompt 15: Cashier/Billing Interface
```
Create a billing and payment interface for cashiers:

Features:
1. Patient Selection:
   - Search patient by name, phone, MRN
   - View patient outstanding bills
   - Quick patient registration (if new)

2. Invoice Creation:
   - Auto-populate pending charges (from EMR, Lab, Pharmacy)
   - Manual item addition (searchable service catalog)
   - Quantity and price editing (with authorization)
   - Apply discount (with reason and authorization)
   - Tax calculation display
   - Total amount display

3. Payment Processing:
   - Select payment method:
     - Cash (calculate change)
     - Card (enter transaction ID)
     - Mobile Money (initiate payment request)
     - Insurance/NHIS (mark for claims)
     - Bank Transfer
   - Split payment support
   - Record deposit

4. Mobile Money Payment:
   - Enter customer phone number
   - Select network (MTN, Vodafone, AirtelTigo)
   - Enter amount
   - Send payment request
   - Show pending status
   - Refresh to check payment status
   - Success/failure notification

5. Receipt:
   - Auto-generate on payment
   - Print receipt (thermal printer friendly)
   - SMS/WhatsApp receipt option
   - Email receipt
   - Reprint capability

6. Quick Actions:
   - View patient payment history
   - View outstanding bills
   - Apply deposit to bill
   - Process refund

Components:
- BillingDashboard
- PatientSearchBar
- InvoiceBuilder
- ServiceCatalog
- PaymentForm
- MobileMoneyPayment
- ReceiptPreview
- OutstandingBillsList

Use: React + TypeScript + Ant Design
```

---

## 🏥 MODULE 7: NHIS CLAIMS (Ghana Specific)

### Prompt 16: NHIS Claims Management Backend
```
Create a Ghana NHIS claims processing system:

Features:
1. NHIS Membership Verification:
   - Online verification via NHIS API (if available)
   - Manual verification
   - Store membership details (card number, scheme, expiry)
   - Validity checking

2. Claims Creation:
   - Auto-generate from patient visit
   - Service coding (NHIS tariff codes)
   - Diagnosis coding (ICD-10)
   - Prescription items (match NHIS drug list)
   - Claim amount calculation (NHIS tariff)
   - Claim number generation

3. Claims Validation:
   - Verify active membership
   - Check service is on NHIS tariff
   - Validate diagnosis codes
   - Check prescription drugs on NHIS list
   - Verify claim within allowed time frame
   - Business rules validation

4. Claims Submission:
   - Batch claims by submission period
   - Generate submission file (XML/CSV format)
   - Electronic submission to NHIS portal
   - Submission tracking

5. Claims Tracking:
   - Track claim status (submitted, approved, rejected, paid)
   - Rejection reason management
   - Resubmission workflow
   - Payment reconciliation

6. Reporting:
   - Claims summary by period
   - Approval rate analytics
   - Rejection reasons analysis
   - Outstanding claims aging
   - Payment reconciliation report

API Endpoints:
- POST /api/nhis/verify-membership (verify card)
- GET /api/nhis/membership/:cardNumber (get details)
- POST /api/nhis/claims (create claim)
- PUT /api/nhis/claims/:id (update)
- POST /api/nhis/claims/validate (validate claim)
- POST /api/nhis/claims/batch (create batch)
- POST /api/nhis/claims/submit (submit batch)
- GET /api/nhis/claims/:id/status (check status)
- PUT /api/nhis/claims/:id/reject (record rejection)
- POST /api/nhis/claims/:id/resubmit (resubmit)
- GET /api/nhis/tariffs (tariff list)
- GET /api/nhis/drugs (NHIS drug list)
- GET /api/nhis/reports/approval-rate (analytics)

Database Models:
- nhis_members
- nhis_claims
- nhis_claim_items
- nhis_tariffs
- nhis_drug_list
- nhis_batches
- nhis_rejections

Include:
- NHIS validation rules engine
- Claim batch processor
- XML/CSV file generation
- Tests

Tech: Node.js + TypeScript + Prisma
```

### Prompt 17: NHIS Claims Interface
```
Create an NHIS claims management interface:

Features:
1. Membership Verification:
   - Card number input
   - Verify button (API call)
   - Display membership details (name, scheme, expiry, status)
   - Save to patient record

2. Claims Creation:
   - Auto-populate from patient visit
   - Patient info display
   - Diagnosis entry (ICD-10 search)
   - Service/procedure selection (from NHIS tariff)
   - Prescription items (auto-populate from prescriptions)
   - Tariff amount calculation
   - Validate before save

3. Claims Validation:
   - Run validation checks
   - Display validation errors/warnings
   - Fix issues inline
   - Re-validate

4. Claims Batch Management:
   - Create submission batch
   - Add claims to batch
   - View batch summary
   - Generate submission file
   - Export as XML/CSV
   - Mark as submitted

5. Claims Tracking:
   - Claims list with status
   - Filter by status, date, amount
   - Search by claim number, patient
   - View claim details
   - Update status
   - Record rejection with reason
   - Resubmit flow

6. Analytics Dashboard:
   - Total claims (month/quarter)
   - Approval rate %
   - Rejection rate %
   - Average claim amount
   - Top rejection reasons (chart)
   - Outstanding claims aging

Components:
- MembershipVerificationForm
- ClaimCreationForm
- DiagnosisCodeSelector
- TariffServiceSelector
- ClaimValidation
- BatchManager
- ClaimsTracker
- RejectionHandler
- AnalyticsDashboard

Use: React + TypeScript + Ant Design + Recharts
```

---

## 👥 MODULE 8: HR & PAYROLL

### Prompt 18: HR & Payroll Backend
```
Create an HR and Payroll system for Ghana:

Features:
1. Employee Management:
   - Personal information
   - Professional details (department, designation, license numbers)
   - Employment details (hire date, contract type, status)
   - Bank account for salary
   - Document uploads (certificates, contracts)

2. Attendance Tracking:
   - Clock in/out (manual or biometric integration)
   - Late arrivals, early departures
   - Overtime tracking
   - Attendance reports

3. Leave Management:
   - Leave types (annual, sick, maternity, paternity, study)
   - Leave balance calculation
   - Leave application and approval workflow
   - Leave calendar

4. Shift Scheduling:
   - Roster creation
   - Shift types (day, night, on-call)
   - Shift swaps
   - Shift reports

5. Payroll Processing:
   - Salary structure (basic + allowances)
   - Deductions:
     - SSNIT (Employee 5.5% + Employer 13%)
     - Income Tax (progressive rates)
     - Loans
     - Other deductions
   - Net salary calculation
   - Payslip generation
   - Bank transfer file (Excel format for banks)

6. Statutory Reporting:
   - SSNIT contribution report
   - GRA income tax report
   - Annual returns

API Endpoints:
- POST /api/hr/employees (create)
- GET /api/hr/employees/:id (get)
- PUT /api/hr/employees/:id (update)
- POST /api/hr/attendance (clock in/out)
- GET /api/hr/attendance/report (attendance report)
- POST /api/hr/leave/apply (apply leave)
- PUT /api/hr/leave/:id/approve (approve leave)
- GET /api/hr/leave/balance/:employeeId (balance)
- POST /api/hr/shifts (create shift)
- GET /api/hr/roster (get roster)
- POST /api/hr/payroll/process (run payroll)
- GET /api/hr/payslips/:month/:employeeId (get payslip)
- GET /api/hr/reports/ssnit (SSNIT report)
- GET /api/hr/reports/tax (tax report)

Database Models:
- employees
- departments
- designations
- attendance_records
- leave_types
- leave_applications
- leave_balances
- shifts
- salary_structures
- allowances
- deductions
- payroll_runs
- payslips

Include:
- Ghana tax calculation (progressive rates)
- SSNIT calculation
- Payslip PDF generation
- Bank transfer file generation
- Tests

Tech: Node.js + TypeScript + Prisma
```

---

## 📱 MOBILE APPS

### Prompt 19: Patient Mobile App (React Native)
```
Create a patient-facing mobile app for hospitals in Ghana:

Features:
1. User Registration/Login:
   - Phone number registration
   - OTP verification
   - Profile setup

2. Find Hospitals:
   - List hospitals using the platform
   - Search by name, location
   - View hospital details
   - Save favorite hospitals

3. Book Appointment:
   - Select hospital and doctor
   - View available time slots
   - Book appointment
   - Receive confirmation SMS

4. View Appointments:
   - Upcoming appointments
   - Past appointments
   - Reschedule/cancel

5. Medical Records:
   - View encounter notes
   - View lab results
   - View prescriptions
   - Download/share PDFs

6. Bills & Payments:
   - View outstanding bills
   - Pay via mobile money
   - View payment history
   - Download receipts

7. Notifications:
   - Appointment reminders
   - Lab results ready
   - Bill reminders

8. Health Profile:
   - Allergies
   - Medical history
   - Emergency contacts

Screens:
- SplashScreen
- LoginScreen
- OTPVerificationScreen
- HomeScreen
- HospitalListScreen
- BookAppointmentScreen
- AppointmentsScreen
- LabResultsScreen
- BillsScreen
- PaymentScreen
- ProfileScreen
- NotificationsScreen

Tech Stack:
- React Native with Expo
- TypeScript
- React Navigation
- React Query
- AsyncStorage for caching
- Push notifications (Expo Notifications)
- Camera access (for profile photo)

Use Expo managed workflow for easier development.
```

---

## 📊 REPORTING & ANALYTICS

### Prompt 20: Analytics Dashboard
```
Create an executive analytics dashboard:

Features:
1. Key Metrics (Cards):
   - Total patients registered
   - Today's appointments
   - Revenue today/month
   - NHIS claims pending
   - Outstanding bills
   - Active staff

2. Revenue Charts:
   - Daily revenue (last 30 days) - Line chart
   - Revenue by service type - Pie chart
   - Revenue by payment method - Donut chart
   - Monthly revenue trend (last 12 months) - Bar chart

3. Patient Analytics:
   - New patient registrations trend
   - Patient demographics (age distribution, gender)
   - Top diagnoses (last month)

4. Operational Metrics:
   - Appointment no-show rate
   - Average wait time
   - Bed occupancy (if applicable)
   - Lab TAT compliance

5. NHIS Analytics:
   - Claims submitted vs approved
   - Approval rate %
   - Top rejection reasons
   - Outstanding claims amount

6. Staff Performance:
   - Consultations per doctor
   - Revenue per doctor
   - Patient satisfaction scores

7. Filters:
   - Date range picker
   - Department filter
   - Branch filter (for multi-branch)

Components:
- DashboardLayout
- MetricCard
- RevenueChart
- PatientChart
- NHISChart
- StaffPerformanceTable

Use:
- React + TypeScript
- Recharts or Chart.js for visualizations
- Ant Design for UI
- Date-fns for date handling
```

---

## 🔧 UTILITY PROMPTS

### Prompt 21: Ghana Phone Number Validator
```
Create a Ghana phone number validation utility:

Requirements:
1. Accept formats:
   - +233XXXXXXXXX
   - 233XXXXXXXXX
   - 0XXXXXXXXX
2. Validate network prefix:
   - MTN: 024, 054, 055, 059
   - Vodafone: 020, 050
   - AirtelTigo: 027, 057, 026, 056
3. Format to standard: +233XXXXXXXXX
4. Extract network provider

Create both backend (TypeScript) and frontend (React hook) versions.
```

### Prompt 22: Ghana Card Number Validator
```
Create a Ghana Card number validator:

Format: GHA-XXXXXXXXX-X
- GHA prefix
- 9 digits
- 1 check digit

Create validation function in TypeScript and React component.
```

### Prompt 23: NHIS Number Validator
```
Create NHIS membership number validator for Ghana:

Requirements:
1. Validate format
2. Check Luhn algorithm (if applicable)
3. Extract scheme type

TypeScript implementation.
```

---

## 🧪 TESTING PROMPTS

### Prompt 24: Unit Tests for Patient Module
```
Generate comprehensive unit tests for the patient management module:

Test cases:
1. Create patient - success
2. Create patient - duplicate Ghana Card number
3. Create patient - invalid phone number
4. Update patient - success
5. Update patient - not found
6. Search patient - by name (fuzzy)
7. Search patient - by Ghana Card
8. Search patient - by phone
9. Merge patients - success
10. Merge patients - validation errors

Use Jest and Supertest.
Framework: Node.js + TypeScript
```

### Prompt 25: Integration Tests for Appointment Booking
```
Create end-to-end integration tests for appointment booking flow:

Scenarios:
1. Book appointment - success
2. Book appointment - doctor unavailable
3. Book appointment - double booking prevention
4. Reschedule appointment - success
5. Cancel appointment - success
6. Check-in for appointment
7. Complete appointment
8. No-show appointment

Use Jest + Supertest + Test database
```

---

## 🚀 DEPLOYMENT PROMPTS

### Prompt 26: Docker Setup
```
Create Docker configuration for the hospital management system:

Requirements:
1. Multi-stage Dockerfile for backend (Node.js)
2. Dockerfile for frontend (React - production build with Nginx)
3. Docker Compose with:
   - Backend service
   - Frontend service
   - PostgreSQL database
   - Redis cache
   - Adminer (for database management)
4. Volume mounts for data persistence
5. Environment variable configuration
6. Network setup

Include .dockerignore files.
```

### Prompt 27: CI/CD Pipeline (GitHub Actions)
```
Create a CI/CD pipeline using GitHub Actions:

Workflow:
1. On push to 'develop' branch:
   - Run linting (ESLint)
   - Run unit tests
   - Build backend and frontend
   - Deploy to staging environment

2. On push to 'main' branch:
   - All above steps
   - Run integration tests
   - Build Docker images
   - Push to Docker registry
   - Deploy to production
   - Run smoke tests
   - Notify team (Slack/Email)

Include environment secrets configuration.
```

---

## 💡 USAGE TIPS

1. **Start with project setup** - Run prompts 1-3 first
2. **Build module by module** - Complete one module before moving to next
3. **Test as you go** - Use testing prompts after each module
4. **Reference the JSON** - Always mention "based on phase1_development_prompt.json" in your prompts
5. **Iterate** - Ask Windsurf to refine/improve generated code
6. **Add context** - Provide error messages or specific requirements for better results

---

Good luck with your development! 🚀
