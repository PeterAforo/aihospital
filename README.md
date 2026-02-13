# MediCare Ghana - Hospital Management System

A comprehensive, AI-powered, multi-branch hospital management system tailored for Ghana's healthcare sector with NHIS integration, mobile money payments, and offline-first capabilities.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design
- **State Management**: Redux Toolkit
- **Data Fetching**: TanStack Query (React Query)

### Mobile
- **Framework**: React Native with Expo
- **Platform**: Android (iOS in Phase 2)

## Project Structure

```
medicare-ghana/
├── backend/          # Node.js + Express + TypeScript + Prisma
├── frontend/         # React + TypeScript + Ant Design
├── mobile/           # React Native + Expo
├── shared/           # Shared types and constants
├── docker/           # Docker configurations
├── scripts/          # Utility scripts
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker (for Redis)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Development Commands

```bash
# Run all services
pnpm dev

# Run individual services
pnpm dev:backend
pnpm dev:frontend
pnpm dev:mobile

# Database commands
pnpm db:migrate    # Run migrations
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema changes
pnpm db:studio     # Open Prisma Studio

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

## Key Features

- **Multi-tenancy**: Separate hospital chains with data isolation
- **NHIS Integration**: Claims processing and compliance
- **Mobile Money**: MTN, Vodafone, AirtelTigo via Hubtel
- **Offline-first**: PWA with background sync
- **SMS/WhatsApp**: Patient engagement via Hubtel
- **Ghana-specific**: Ghana Card validation, local phone formats

## Modules

1. Patient Management
2. Appointment Scheduling
3. EMR/Clinical Notes
4. Prescription Management
5. Pharmacy
6. Laboratory
7. Billing & Payments
8. NHIS Claims
9. HR & Payroll
10. Reporting & Analytics

## License

Proprietary - All rights reserved
