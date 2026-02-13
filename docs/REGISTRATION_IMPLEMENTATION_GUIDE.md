# Registration Wizard - Implementation Guide

## 🚀 Quick Start with Windsurf

This guide shows you exactly how to use the `registration_wizard_implementation.json` file to build the complete registration system with Windsurf AI.

---

## STEP 1: Database Setup

### Windsurf Prompt:
```
Based on the registration_wizard_implementation.json file, create the complete database schema for the registration system.

Include:
1. Prisma schema.prisma file with all tables:
   - pending_registrations
   - tenants
   - users
   - verification_codes
   - tenant_settings
   - subscriptions

2. Include all columns, data types, and relationships as specified in the JSON
3. Add proper indexes for performance
4. Add migration file

Use PostgreSQL and Prisma ORM.
```

---

## STEP 2: Backend Validation Utilities

### Windsurf Prompt:
```
Based on the "validation_utilities" section in registration_wizard_implementation.json, create a TypeScript utilities file with:

1. validateGhanaPhoneNumber(phone: string): boolean
2. formatGhanaPhoneNumber(phone: string): string
3. detectMobileNetwork(phone: string): 'MTN' | 'Vodafone' | 'AirtelTigo' | 'Unknown'
4. validateGhanaPostGPS(gps: string): boolean
5. validatePasswordStrength(password: string): { isValid: boolean; strength: string; unmetRules: string[] }
6. validateFileType(file: File, allowedTypes: string[]): boolean
7. validateFileSize(file: File, maxSizeBytes: number): boolean

Include comprehensive unit tests for each function.
File path: src/utils/validators.ts
```

---

## STEP 3: Backend API - Pre-Qualification Endpoint

### Windsurf Prompt:
```
Create the backend API endpoint for step 1 (pre-qualification) based on registration_wizard_implementation.json.

Endpoint: POST /api/registration/pre-qualify

Requirements:
1. Express.js route handler
2. Request validation using express-validator
3. Check email and phone availability
4. Create pending_registrations record
5. Generate UUID for registrationId
6. Return response with registrationId
7. Error handling with proper status codes
8. Rate limiting (10 requests per hour per IP)

Include:
- Route file: src/routes/registration.routes.ts
- Controller: src/controllers/registration.controller.ts
- Service: src/services/registration.service.ts
- DTOs: src/dtos/registration.dto.ts
```

---

## STEP 4: Backend API - All Other Endpoints

### Windsurf Prompt:
```
Based on the "backend_api_specification" section in registration_wizard_implementation.json, create all remaining registration endpoints:

1. POST /api/registration/check-email
2. POST /api/registration/check-phone
3. POST /api/registration/check-hospital-email
4. POST /api/registration/hospital-details (with file upload support)
5. POST /api/registration/admin-account
6. POST /api/registration/select-plan
7. POST /api/registration/complete (main registration transaction)
8. POST /api/registration/verify-phone
9. POST /api/registration/resend-code
10. POST /api/registration/upload (multipart/form-data)

For /api/registration/complete:
- Implement the complete database transaction as specified
- Create tenant, user, branch, settings, subscription records
- Generate verification code
- Send SMS via Hubtel API
- Send welcome email
- Handle rollback on failure
- Delete pending registration on success

Include comprehensive error handling and logging.
```

---

## STEP 5: SMS Integration (Hubtel)

### Windsurf Prompt:
```
Create an SMS service for sending verification codes via Hubtel API.

Based on the verification_flow in registration_wizard_implementation.json:

1. Create HubtelService class with methods:
   - sendVerificationCode(phoneNumber: string, code: string): Promise<boolean>
   - sendWelcomeSMS(phoneNumber: string, hospitalName: string): Promise<boolean>

2. Configuration:
   - Use environment variables for Hubtel credentials
   - SMS template: "Your MediCare Ghana verification code is: {{code}}. Valid for 10 minutes. Do not share this code."
   - Handle API errors gracefully
   - Log all SMS attempts

3. Include retry logic (3 attempts)
4. Include mock mode for development/testing

File: src/services/sms.service.ts
```

---

## STEP 6: File Upload Service

### Windsurf Prompt:
```
Create a file upload service with AWS S3 integration.

Based on registration_wizard_implementation.json file handling requirements:

1. FileUploadService class with methods:
   - uploadHospitalLicense(file: Express.Multer.File, registrationId: string): Promise<string>
   - uploadHospitalLogo(file: Express.Multer.File, registrationId: string): Promise<string>
   - deleteFile(fileUrl: string): Promise<void>

2. Features:
   - Upload to S3 bucket: medicare-ghana-uploads
   - Folder structure: /registrations/{registrationId}/
   - File validation (type, size)
   - Virus scanning (optional - use ClamAV)
   - Generate thumbnails for images
   - Return public URL or signed URL

3. Use multer for file handling
4. Include error handling

File: src/services/fileUpload.service.ts
```

---

## STEP 7: Frontend - Registration Wizard Container

### Windsurf Prompt:
```
Create the main RegistrationWizard React component based on registration_wizard_implementation.json.

Requirements:
1. Multi-step form with 7 steps
2. State management using Zustand
3. Progress indicator showing current step and percentage
4. Auto-save to localStorage every 30 seconds
5. Resume from saved progress on mount
6. Navigation between steps (next, previous, jump to completed step)
7. Form validation before proceeding to next step
8. Responsive design (mobile-friendly)

Component structure:
- RegistrationWizard (main container)
  - ProgressIndicator
  - Step components (Step1, Step2, Step3, etc.)
  - Navigation buttons (Back, Continue)

Use:
- React + TypeScript
- Zustand for state
- React Router for step routing
- Ant Design components
- Framer Motion for animations

Files:
- src/components/registration/RegistrationWizard.tsx
- src/components/registration/ProgressIndicator.tsx
- src/stores/registrationStore.ts
```

---

## STEP 8: Frontend - Step 1 Component

### Windsurf Prompt:
```
Create the Step 1 (Pre-Qualification) form component based on step_1_pre_qualification in registration_wizard_implementation.json.

Requirements:
1. React Hook Form with Yup validation
2. Fields: fullName, email, phoneNumber, hospitalName, userRole
3. Real-time validation with error display
4. Debounced API calls for email/phone availability check
5. Ghana phone number formatting (auto-add +233)
6. Conditional field for "Other" user role
7. Submit to POST /api/registration/pre-qualify
8. Show loading state during submission
9. Handle errors with toast notifications

Features:
- Auto-focus on first field
- Tab navigation
- Enter key to submit
- Responsive design

Component: src/components/registration/Step1PreQualification.tsx
```

---

## STEP 9: Frontend - Step 2 Component (Hospital Details)

### Windsurf Prompt:
```
Create the Step 2 (Hospital Details) form component based on step_2_hospital_details in registration_wizard_implementation.json.

This is a complex multi-section form with file uploads.

Requirements:
1. Four sections:
   - Hospital Information
   - Contact Information
   - Physical Address
   - Documentation (file uploads)

2. Fields as specified in JSON (officialHospitalName, hospitalType, numberOfBeds, etc.)

3. File upload for:
   - Hospital License (PDF or image, max 5MB)
   - Hospital Logo (image only, max 2MB, with preview and crop)

4. Ghana-specific validations:
   - Ghana Post GPS format
   - Region dropdown (16 Ghana regions)
   - Phone number format

5. Auto-save functionality (save to localStorage every 30s)

6. Prefill hospitalName from step 1

7. Show upload progress for files

Use:
- React Hook Form
- react-dropzone for file uploads
- react-easy-crop for logo cropping
- Ant Design Upload component

Component: src/components/registration/Step2HospitalDetails.tsx
Sub-components:
- src/components/registration/FileUpload.tsx
- src/components/registration/ImageCropper.tsx
```

---

## STEP 10: Frontend - Step 3 Component (Admin Account)

### Windsurf Prompt:
```
Create the Step 3 (Administrator Account) form component based on step_3_administrator_account in registration_wizard_implementation.json.

Requirements:
1. Fields: title, firstName, lastName, otherNames, phone (disabled, prefilled), email (disabled, prefilled), position, professionalLicenseNumber, password, confirmPassword, enable2FA

2. Password validation:
   - Min 8 characters
   - At least 1 uppercase
   - At least 1 lowercase
   - At least 1 number
   - At least 1 special character

3. Password strength meter:
   - Visual indicator (weak/medium/strong)
   - Color-coded progress bar
   - Requirements checklist

4. Show/hide password toggle

5. Confirm password must match password

6. Conditional professional license field (show if title is Dr. or Prof.)

7. 2FA toggle (default: enabled)

Component: src/components/registration/Step3AdminAccount.tsx
Sub-component: src/components/common/PasswordStrengthMeter.tsx
```

---

## STEP 11: Frontend - Step 4 Component (Plan Selection)

### Windsurf Prompt:
```
Create the Step 4 (Subscription Plan Selection) component based on step_4_subscription_plan in registration_wizard_implementation.json.

Requirements:
1. Display three plans side-by-side:
   - Starter (GHS 500/month)
   - Professional (GHS 1,500/month) - RECOMMENDED
   - Enterprise (Contact Sales)

2. Each plan card shows:
   - Name and price
   - Badge (if applicable: "Most Popular", "Custom")
   - Features list (with checkmarks)
   - "Start Free Trial" button (or "Contact Sales" for Enterprise)

3. Billing cycle toggle:
   - Monthly
   - Annual (Save 15%)
   - Only show for Starter and Professional

4. Highlight recommended plan (Professional)

5. Plan comparison table (optional, toggle to show)

6. Contact Sales modal for Enterprise plan

7. Mobile-responsive (cards stack vertically on mobile)

Use Ant Design Card, Radio, Badge components.

Component: src/components/registration/Step4PlanSelection.tsx
Sub-components:
- src/components/registration/PlanCard.tsx
- src/components/registration/PlanComparisonTable.tsx
- src/components/registration/ContactSalesModal.tsx
```

---

## STEP 12: Frontend - Step 5 Component (Setup Preferences)

### Windsurf Prompt:
```
Create the Step 5 (Setup Preferences) form component based on step_5_setup_preferences in registration_wizard_implementation.json.

Requirements:
1. Four sections:
   - Business Configuration
   - Financial Settings
   - First Branch Setup
   - Optional Information

2. Fields:
   - Primary language (dropdown)
   - Date format (dropdown)
   - Operating hours (custom time picker for weekdays/weekends)
   - Currency (disabled, GHS)
   - Tax toggles (VAT, NHIL, GETFund)
   - Branch name (prefilled with hospital name + " - Main Branch")
   - Same as hospital address checkbox
   - Referral source (dropdown)
   - Specific needs (textarea)

3. Legal checkboxes (required):
   - Agree to Terms of Service and Privacy Policy (with links)
   - Agree to data processing (Ghana Data Protection Act)

4. Operating hours component:
   - Weekdays: Start time, End time
   - Weekends: Enable toggle, Start time, End time

5. Submit button: "Create My Account" with loading state

Component: src/components/registration/Step5SetupPreferences.tsx
Sub-component: src/components/registration/OperatingHoursSelector.tsx
```

---

## STEP 13: Frontend - Step 6 Component (Verification)

### Windsurf Prompt:
```
Create the Step 6 (Phone Verification) component based on step_6_verification in registration_wizard_implementation.json.

Requirements:
1. 6-digit code input:
   - 6 separate input boxes
   - Auto-focus on first box
   - Auto-advance to next box on input
   - Numeric keyboard on mobile
   - Paste support (paste 6-digit code splits into boxes)

2. Resend code button:
   - 60-second cooldown timer
   - Disabled during cooldown
   - Shows countdown: "Resend in 45s"

3. Verification flow:
   - Submit code to POST /api/registration/verify-phone
   - Show loading state
   - On success: Generate JWT tokens, redirect to dashboard
   - On error: Show error message, allow retry

4. Max 3 attempts:
   - After 3 failed attempts, show support contact

5. Code expiry notice: "Code expires in 10 minutes"

6. Success animation when verified

Use:
- react-otp-input or custom implementation
- Ant Design Statistic for countdown
- Framer Motion for success animation

Component: src/components/registration/Step6Verification.tsx
Sub-component: src/components/registration/OTPInput.tsx
```

---

## STEP 14: Frontend - Step 7 Component (Onboarding Tour)

### Windsurf Prompt:
```
Create the Step 7 (Onboarding Tour) component based on step_7_onboarding_tour in registration_wizard_implementation.json.

Requirements:
1. Interactive product tour using react-joyride

2. Tour steps:
   - Dashboard overview
   - Add patient
   - Schedule appointments
   - Billing & payments
   - Settings

3. Features:
   - Spotlight on target elements
   - Tooltip with instructions
   - Next/Previous navigation
   - Skip tour option
   - Progress indicator (Step 1 of 5)

4. On completion:
   - Award "Quick Learner" badge
   - Redirect to dashboard

5. Make tour skippable

6. Store tour completion in user preferences

Component: src/components/registration/Step7OnboardingTour.tsx
```

---

## STEP 15: Reusable Components

### Windsurf Prompt:
```
Create reusable form components used across the registration wizard:

1. PhoneInput.tsx - Ghana phone number input
   - Auto-format to +233 XX XXX XXXX
   - Detect network (MTN, Vodafone, AirtelTigo)
   - Show network icon/badge
   - Real-time validation

2. FormField.tsx - Generic form field wrapper
   - Label, input, error message, help text
   - Required indicator (*)
   - Tooltip for help text
   - Support all input types

3. PasswordStrengthMeter.tsx - Password strength indicator
   - Color-coded bar (red/yellow/green)
   - Strength label (Weak/Medium/Strong)
   - Requirements checklist with checkmarks

4. FileUpload.tsx - File upload with preview
   - Drag and drop support
   - File type and size validation
   - Image preview
   - Upload progress bar
   - Remove file button

All components should:
- Be TypeScript
- Use Ant Design as base
- Be accessible (ARIA labels)
- Be mobile-responsive

Location: src/components/common/
```

---

## STEP 16: State Management (Zustand)

### Windsurf Prompt:
```
Create a Zustand store for managing registration state based on registration_wizard_implementation.json.

Store structure:
- currentStep: number
- registrationId: string | null
- formData: { step1: {}, step2: {}, step3: {}, step4: {}, step5: {} }
- validatedSteps: number[]
- isLoading: boolean
- error: string | null

Actions:
- setCurrentStep(step: number)
- updateFormData(step: number, data: object)
- setRegistrationId(id: string)
- markStepAsValidated(step: number)
- setLoading(isLoading: boolean)
- setError(error: string | null)
- clearError()
- resetRegistration()
- saveToLocalStorage()
- loadFromLocalStorage()

Persistence:
- Auto-save to localStorage on state change
- Key: "medicaregha_registration_draft"
- Expire after 7 days
- Load on store initialization

File: src/stores/registrationStore.ts
```

---

## STEP 17: API Client Setup

### Windsurf Prompt:
```
Create an API client for registration endpoints using Axios and React Query.

Based on registration_wizard_implementation.json backend_api_specification:

1. Axios instance with:
   - Base URL from environment variable
   - Request/response interceptors
   - Error handling
   - Timeout configuration

2. React Query hooks for each endpoint:
   - useCheckEmailAvailability (debounced)
   - useCheckPhoneAvailability (debounced)
   - usePreQualification (mutation)
   - useSubmitHospitalDetails (mutation)
   - useSubmitAdminAccount (mutation)
   - useSelectPlan (mutation)
   - useCompleteRegistration (mutation)
   - useVerifyPhone (mutation)
   - useResendCode (mutation)
   - useUploadFile (mutation)

3. Type-safe request/response types

Files:
- src/api/axios.config.ts
- src/api/registration.api.ts
- src/hooks/useRegistrationApi.ts
```

---

## STEP 18: Testing

### Windsurf Prompt:
```
Create comprehensive tests for the registration system.

Unit Tests:
1. Test all validation utilities:
   - validateGhanaPhoneNumber
   - formatGhanaPhoneNumber
   - detectMobileNetwork
   - validateGhanaPostGPS
   - validatePasswordStrength

2. Test Zustand store actions

Integration Tests (Backend):
1. POST /api/registration/pre-qualify
   - Valid data returns registrationId
   - Duplicate email returns error
   - Invalid phone format returns error

2. POST /api/registration/complete
   - Creates tenant, user, branch, settings, subscription
   - Sends verification SMS
   - Handles database transaction failure (rollback)

E2E Tests (Cypress):
1. Complete registration flow:
   - Fill step 1, submit
   - Fill step 2 with file upload, submit
   - Fill step 3 with password, submit
   - Select plan, submit
   - Fill step 5 with preferences, submit
   - Verify phone with code
   - Land on dashboard

2. Registration abandonment and resume:
   - Start registration
   - Close browser
   - Reopen, verify data is restored

Use Jest for unit/integration, Cypress for E2E.
```

---

## STEP 19: Environment Setup

### Windsurf Prompt:
```
Create environment configuration files for the registration system.

1. .env.example (backend):
```
DATABASE_URL=postgresql://user:password@localhost:5432/medicare_ghana
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

HUBTEL_CLIENT_ID=your-hubtel-client-id
HUBTEL_CLIENT_SECRET=your-hubtel-client-secret
HUBTEL_SMS_API_URL=https://sms.hubtel.com/v1/messages/send

AWS_S3_BUCKET=medicare-ghana-uploads
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@medicaregha.com

FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

NODE_ENV=development
PORT=5000
```

2. .env.example (frontend):
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=MediCare Ghana
```

3. Create config loaders in both backend and frontend
```

---

## STEP 20: Documentation

### Windsurf Prompt:
```
Create comprehensive documentation for the registration system:

1. API Documentation (Swagger/OpenAPI):
   - All registration endpoints
   - Request/response schemas
   - Error codes
   - Example requests

2. README.md:
   - Project overview
   - Setup instructions
   - Environment variables
   - Running the application
   - Running tests
   - Deployment guide

3. User Guide:
   - How to register (step-by-step screenshots)
   - Troubleshooting common issues
   - FAQ

4. Developer Guide:
   - Architecture overview
   - Component structure
   - State management
   - API integration
   - Adding new steps to wizard
```

---

## 🎯 IMPLEMENTATION TIMELINE

**Week 1: Backend**
- Days 1-2: Database schema and migrations
- Days 3-4: Validation utilities and API endpoints
- Day 5: SMS and file upload services

**Week 2: Frontend Core**
- Days 1-2: Registration wizard container and state management
- Days 3-5: Steps 1, 2, 3 components

**Week 3: Frontend Advanced**
- Days 1-2: Steps 4, 5 components
- Days 3-4: Steps 6, 7 components
- Day 5: Reusable components and polish

**Week 4: Integration & Testing**
- Days 1-2: API integration with React Query
- Days 3-4: Testing (unit, integration, E2E)
- Day 5: Bug fixes and refinement

**Week 5: Deployment**
- Days 1-2: Environment setup and configuration
- Days 3-4: Staging deployment and UAT
- Day 5: Production deployment

---

## 📝 USAGE NOTES

1. **Work sequentially**: Don't skip steps. Each step builds on the previous.

2. **Test as you go**: After implementing each component/endpoint, test it thoroughly before moving to the next.

3. **Use the JSON as reference**: Always refer back to `registration_wizard_implementation.json` for exact specifications.

4. **Ask Windsurf for refinements**: After initial code generation, you can ask Windsurf to:
   - "Add error handling to this component"
   - "Make this component more accessible"
   - "Optimize this function for performance"
   - "Add loading states to this form"

5. **Customize as needed**: The JSON provides a solid foundation, but feel free to adjust based on your specific needs.

---

## 🚀 QUICK START COMMAND

To get started immediately with Windsurf:

```
I have a detailed specification in registration_wizard_implementation.json for a hospital registration wizard system for Ghana. Let's build this step by step.

First, create the database schema with Prisma based on the "database_schema" section. Include all tables, columns, relationships, and indexes as specified.

After that's done, we'll move to the validation utilities, then the backend API, then the frontend components.

Ready to start with the database schema?
```

---

## 💡 PRO TIPS

1. **Chunking**: When working with Windsurf, break large components into smaller chunks. Don't ask it to generate all 7 steps at once.

2. **Context**: Always provide context by referencing the JSON file: "Based on registration_wizard_implementation.json..."

3. **Iteration**: Generate code, review it, then ask for improvements: "This looks good, but can you add TypeScript types and better error handling?"

4. **Testing mindset**: After generating each component, immediately ask: "Now generate comprehensive tests for this component"

5. **Documentation**: Ask Windsurf to document the code: "Add JSDoc comments to all functions in this file"

---

Good luck with your implementation! 🎉
