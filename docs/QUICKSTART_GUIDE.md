# MediCare Ghana - Phase 1 Quick Start Guide

## How to Use This Prompt with Windsurf IDE

### Step 1: Set Up Your Development Environment

```bash
# Create project directory
mkdir medicare-ghana
cd medicare-ghana

# Initialize git repository
git init
git branch -M main
```

### Step 2: Use Windsurf AI to Generate Project Structure

**Prompt to Windsurf:**
```
I'm building a hospital management system for Ghana. I have a detailed specification in phase1_development_prompt.json. Please:

1. Create a monorepo structure with separate folders for backend, frontend, and mobile
2. Set up the backend with Node.js/Express and TypeScript
3. Configure PostgreSQL with Prisma ORM
4. Create the initial database schema for multi-tenancy (tenants, users, patients, appointments)
5. Set up authentication with JWT
6. Create basic CRUD APIs for patient management

Follow the architecture and tech stack specified in the JSON file.
```

### Step 3: Incremental Development with Windsurf

Use these focused prompts for each module:

**For Patient Management Module:**
```
Based on phase1_development_prompt.json module_1_patient_management:
- Create the complete patient registration API with all endpoints
- Include Ghana Card validation
- Add patient search functionality with fuzzy matching
- Include duplicate patient detection
- Create React forms for patient registration
- Add photo capture functionality
```

**For Appointment Module:**
```
Based on module_2_appointment_scheduling in the prompt:
- Create doctor availability management system
- Build appointment booking with conflict detection
- Implement queue management for walk-ins
- Add SMS reminder integration with Hubtel
- Create WhatsApp notification workflow
- Build calendar UI component with appointment visualization
```

**For NHIS Claims:**
```
Based on module_8_nhis_claims:
- Create NHIS membership verification API
- Build claims creation workflow from patient visits
- Implement claims validation rules
- Add claims submission queue
- Create rejection handling workflow
- Build claims analytics dashboard
```

### Step 4: Testing Each Module

**Prompt for Test Generation:**
```
Generate comprehensive tests for the patient management module:
- Unit tests for patient CRUD operations
- Integration tests for patient search
- API endpoint tests with different scenarios
- Edge case tests (duplicate patients, invalid Ghana Card)
```

### Step 5: Mobile Money Integration

**Specific Prompt:**
```
Implement mobile money payment integration:
- Integrate Hubtel Payment API for MTN, Vodafone, AirtelTigo
- Create payment request flow
- Handle callback from mobile money providers
- Implement payment reconciliation
- Add payment status tracking
- Create receipt generation after successful payment
```

## Recommended Project Structure

```
medicare-ghana/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── patient/
│   │   │   │   ├── patient.controller.ts
│   │   │   │   ├── patient.service.ts
│   │   │   │   ├── patient.repository.ts
│   │   │   │   ├── patient.dto.ts
│   │   │   │   └── patient.routes.ts
│   │   │   ├── appointment/
│   │   │   ├── billing/
│   │   │   ├── nhis/
│   │   │   ├── pharmacy/
│   │   │   ├── laboratory/
│   │   │   ├── emr/
│   │   │   ├── hr/
│   │   │   └── auth/
│   │   ├── common/
│   │   │   ├── middleware/
│   │   │   ├── guards/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   └── utils/
│   │   ├── config/
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── schema.prisma
│   │   └── main.ts
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── billing/
│   │   │   ├── nhis/
│   │   │   ├── pharmacy/
│   │   │   ├── laboratory/
│   │   │   ├── emr/
│   │   │   └── hr/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── forms/
│   │   ├── services/
│   │   │   └── api/
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   └── store.ts
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── constants/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── android/
│   ├── ios/
│   ├── package.json
│   └── app.json
│
├── ai-services/
│   ├── models/
│   │   ├── no_show_predictor/
│   │   ├── nhis_approval/
│   │   └── appointment_duration/
│   ├── api/
│   ├── requirements.txt
│   └── Dockerfile
│
├── shared/
│   ├── types/
│   └── constants/
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── ai-services.Dockerfile
│   └── docker-compose.yml
│
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── user-guides/
│   └── deployment/
│
├── scripts/
│   ├── seed-database.ts
│   ├── migrate.ts
│   └── deploy.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── .gitignore
├── README.md
├── package.json (workspace)
└── phase1_development_prompt.json
```

## Week 1 Development Roadmap

### Day 1-2: Project Setup
- [ ] Initialize monorepo with workspaces
- [ ] Set up PostgreSQL database
- [ ] Configure Prisma ORM
- [ ] Create initial migrations for tenants, users, patients
- [ ] Set up ESLint, Prettier, TypeScript
- [ ] Configure Docker for local development

### Day 3-4: Authentication & Multi-tenancy
- [ ] Implement JWT authentication
- [ ] Create user registration/login APIs
- [ ] Set up multi-tenancy middleware
- [ ] Create role-based access control
- [ ] Build login/registration UI

### Day 5-7: Patient Management
- [ ] Create patient CRUD APIs
- [ ] Implement patient search
- [ ] Build patient registration form
- [ ] Add photo upload functionality
- [ ] Implement Ghana Card validation
- [ ] Create patient list view

## Windsurf-Specific Tips

### 1. Use Context-Aware Generation
Always reference the JSON prompt file when asking Windsurf to generate code:
```
"Based on the specifications in phase1_development_prompt.json, generate..."
```

### 2. Iterate Module by Module
Don't try to generate everything at once. Focus on one module at a time:
```
"Complete the patient management module with all CRUD operations, validation, and error handling"
```

### 3. Request Tests Alongside Code
```
"Generate the appointment booking API with Jest unit tests and integration tests"
```

### 4. Ask for Documentation
```
"Create Swagger/OpenAPI documentation for all patient management endpoints"
```

### 5. Optimize Ghana-Specific Features
```
"Implement Ghana Card validation following Ghana Card number format: GHA-XXXXXXXXX-X"
```

## Environment Variables Template

Create `.env` files based on this template:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medicare_ghana"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRE="15m"
JWT_REFRESH_EXPIRE="7d"

# SMS (Hubtel)
HUBTEL_CLIENT_ID="your-client-id"
HUBTEL_CLIENT_SECRET="your-client-secret"
HUBTEL_API_URL="https://sms.hubtel.com/v1"

# Mobile Money (Hubtel)
HUBTEL_PAYMENT_API_URL="https://api.hubtel.com/v1/merchantaccount/merchants"
HUBTEL_MERCHANT_ID="your-merchant-id"

# WhatsApp
WHATSAPP_API_URL="your-whatsapp-api-url"
WHATSAPP_TOKEN="your-whatsapp-token"

# NHIS
NHIS_API_URL="nhis-api-endpoint"
NHIS_API_KEY="your-nhis-api-key"

# File Storage
AWS_S3_BUCKET="medicare-ghana-files"
AWS_REGION="af-south-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Application
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3001"

# Logging
LOG_LEVEL="debug"
SENTRY_DSN="your-sentry-dsn"
```

## Initial Database Schema (Prisma)

Here's a starter schema to use with Windsurf:

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  subdomain String   @unique
  logo      String?
  phone     String
  email     String
  address   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  branches  Branch[]
  users     User[]
  patients  Patient[]
}

model Branch {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  phone     String
  email     String
  address   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  appointments Appointment[]
}

model User {
  id           String   @id @default(uuid())
  tenantId     String
  email        String
  phone        String
  password     String
  firstName    String
  lastName     String
  role         UserRole
  isActive     Boolean  @default(true)
  lastLogin    DateTime?
  mfaEnabled   Boolean  @default(false)
  mfaSecret    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, email])
}

enum UserRole {
  SUPER_ADMIN
  HOSPITAL_ADMIN
  DOCTOR
  NURSE
  PHARMACIST
  LAB_TECHNICIAN
  RECEPTIONIST
  BILLING_OFFICER
  HR_MANAGER
  ACCOUNTANT
}

model Patient {
  id            String    @id @default(uuid())
  tenantId      String
  mrn           String    // Medical Record Number
  ghanaCardNo   String?
  firstName     String
  lastName      String
  otherNames    String?
  dateOfBirth   DateTime
  gender        Gender
  phone         String
  email         String?
  address       String
  city          String
  region        String
  photo         String?
  bloodGroup    String?
  occupation    String?
  maritalStatus String?
  nhisNumber    String?
  nhisExpiry    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  appointments  Appointment[]
  encounters    Encounter[]

  @@unique([tenantId, mrn])
  @@index([tenantId, ghanaCardNo])
  @@index([tenantId, phone])
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

model Appointment {
  id              String            @id @default(uuid())
  tenantId        String
  branchId        String
  patientId       String
  doctorId        String
  appointmentDate DateTime
  appointmentTime String
  duration        Int               @default(30) // minutes
  type            AppointmentType
  status          AppointmentStatus @default(SCHEDULED)
  reason          String?
  notes           String?
  reminderSent    Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  branch   Branch  @relation(fields: [branchId], references: [id])
  patient  Patient @relation(fields: [patientId], references: [id])

  @@index([tenantId, appointmentDate])
  @@index([doctorId, appointmentDate])
}

enum AppointmentType {
  CONSULTATION
  FOLLOW_UP
  PROCEDURE
  CHECKUP
}

enum AppointmentStatus {
  SCHEDULED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

model Encounter {
  id              String   @id @default(uuid())
  tenantId        String
  patientId       String
  doctorId        String
  visitDate       DateTime @default(now())
  chiefComplaint  String
  vitalSigns      Json?
  diagnosis       String?
  treatmentPlan   String?
  notes           String?
  status          String   @default("OPEN")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  patient Patient @relation(fields: [patientId], references: [id])
}

// Add more models for Pharmacy, Lab, Billing, NHIS, etc.
```

## Testing Strategy

### Unit Tests Example
```typescript
// patient.service.spec.ts
import { PatientService } from './patient.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PatientService', () => {
  let service: PatientService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Setup
  });

  it('should create a patient with valid Ghana Card', async () => {
    const patientData = {
      ghanaCardNo: 'GHA-123456789-1',
      firstName: 'Kwame',
      lastName: 'Mensah',
      // ...
    };
    
    const result = await service.createPatient(tenantId, patientData);
    expect(result).toBeDefined();
    expect(result.ghanaCardNo).toBe(patientData.ghanaCardNo);
  });

  it('should reject invalid Ghana Card format', async () => {
    const patientData = {
      ghanaCardNo: 'INVALID',
      // ...
    };
    
    await expect(service.createPatient(tenantId, patientData))
      .rejects
      .toThrow('Invalid Ghana Card number format');
  });
});
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] CORS configured for frontend domain
- [ ] Rate limiting enabled
- [ ] Error monitoring (Sentry) configured
- [ ] Backup strategy implemented
- [ ] Load balancer configured
- [ ] CDN for static assets
- [ ] Monitoring dashboards set up

## Support Resources

### Ghana-Specific APIs
- **Hubtel SMS**: https://developers.hubtel.com/documentations/sms
- **Hubtel Payments**: https://developers.hubtel.com/documentations/payment
- **Ghana Card** (NIA): Contact National Identification Authority
- **NHIS**: Contact Ghana Health Insurance Authority for API access

### Development Resources
- Prisma Docs: https://www.prisma.io/docs
- React Query: https://tanstack.com/query
- Ant Design: https://ant.design
- React Native: https://reactnative.dev

## Next Phase Planning

Once Phase 1 is complete (6 months), Phase 2 will include:
- Advanced inventory management
- Marketing automation
- Telemedicine
- Advanced AI features
- Additional integrations
- iOS mobile app
- Performance optimizations

---

Good luck with your development! Start with small, focused prompts to Windsurf and build iteratively. The AI will be most effective when given specific, module-focused tasks.
