# User Management, Roles & RBAC Module - Implementation Guide

## 🎯 Implementation Overview

**Module Position:** **FOUNDATION** - Should be built first, but we can retrofit  
**Implementation Time:** 2-3 weeks  
**Complexity:** HIGH - Security critical  
**Impact:** CRITICAL - Used by ALL modules  

---

## 📋 QUICK START

```
I'm building a User Management, Roles, Permissions, and RBAC (Role-Based Access Control) module for a hospital management system in Ghana based on user_management_rbac_module_implementation.json.

This is the foundation of the entire system - it controls WHO can access WHAT.

Key features:
- Multi-tenancy (multiple hospitals on same platform)
- Healthcare-specific roles (Doctor, Nurse, Pharmacist, etc.)
- Granular permissions (~100 permissions)
- JWT authentication with refresh tokens
- 2FA support (Google Authenticator)
- Complete audit logging
- Password policies and account security
- Session management

Roles to implement:
- SUPER_ADMIN (platform admin)
- HOSPITAL_ADMIN
- MEDICAL_DIRECTOR
- HEAD_NURSE
- DOCTOR, NURSE, PHARMACIST
- LAB_TECHNICIAN, RADIOLOGIST
- RECEPTIONIST, BILLING_OFFICER
- PATIENT (portal users)

Let's build this step by step, starting with the database schema.

Ready to begin?
```

---

## 📊 ARCHITECTURE OVERVIEW

```
Authentication & Authorization Flow:

User Login (email + password)
         ↓
Validate Credentials (bcrypt)
         ↓
Check Account Status (active, not locked)
         ↓
2FA Enabled? → Request TOTP code
         ↓
Generate JWT Tokens:
  - Access Token (15 min) - Contains: userId, tenantId, role, permissions
  - Refresh Token (7 days) - Stored in sessions table
         ↓
Return Tokens to Client
         ↓
Client Stores Tokens (localStorage/secure cookie)
         ↓
Every API Request:
  - Send Access Token in Authorization header
  - Middleware verifies JWT signature
  - Extract permissions from JWT
  - Check required permission for endpoint
  - Allow/Deny request
         ↓
Access Token Expires (15 min):
  - Use Refresh Token to get new Access Token
  - No re-login needed
         ↓
Logout:
  - Invalidate session in database
  - Client discards tokens
```

**Permission Checking:**
```
Example: Doctor tries to create prescription

1. Request: POST /api/prescriptions
2. JWT contains: { role: 'DOCTOR', permissions: ['PRESCRIBE', 'VIEW_PATIENT', ...] }
3. Route requires: PRESCRIBE permission
4. Middleware checks: 'PRESCRIBE' in permissions array? ✓
5. Request allowed → Create prescription
```

**Multi-Tenancy:**
```
Tenant = Hospital

Hospital A (St. Mary's):
  - tenant_id: uuid-1
  - Users: 50 doctors, 100 nurses
  - Patients: 10,000
  - Data isolated from Hospital B

Hospital B (Korle Bu):
  - tenant_id: uuid-2
  - Users: 200 doctors, 400 nurses
  - Patients: 50,000
  - Cannot see Hospital A's data

Every database query: WHERE tenant_id = current_tenant
JWT contains: tenantId for data isolation
```

---

## STEP 1: Database Schema - Complete RBAC System

### Windsurf Prompt:
```
Based on user_management_rbac_module_implementation.json, create the complete database schema for user management and RBAC.

This is the FOUNDATION of the entire system. Create these tables:

1. **tenants** - Hospitals using the platform
2. **users** - All system users (doctors, nurses, patients, etc.)
3. **roles** - User roles (DOCTOR, NURSE, PHARMACIST, etc.)
4. **permissions** - Granular permissions (PRESCRIBE, VIEW_PATIENT, etc.)
5. **role_permissions** - Many-to-many: Roles have permissions
6. **user_permissions** - User-specific permission overrides
7. **departments** - Hospital departments (Emergency, OPD, Surgery, etc.)
8. **sessions** - Active user sessions (JWT refresh tokens)
9. **audit_logs** - Complete audit trail
10. **password_history** - Prevent password reuse

**tenants table:**
- id, name, slug (URL-safe identifier)
- type (hospital, clinic, diagnostic_center)
- subscription_plan (basic, pro, enterprise, trial)
- status (active, suspended, trial, expired)
- max_users (subscription limit)
- logo_url, address, phone, email, license_number
- settings (JSONB for hospital-specific config)
- expires_at (subscription expiry)

**users table (comprehensive):**
- id, tenant_id (NULL for super admins), email (unique per tenant), phone
- password_hash (bcrypt cost 12)
- first_name, last_name, middle_name, gender, date_of_birth
- profile_photo_url
- role_id (references roles), department_id, specialization, license_number
- status (active, inactive, suspended, pending_verification)
- email_verified, email_verified_at
- two_factor_enabled, two_factor_secret (TOTP)
- password_reset_token, password_reset_expires
- last_login_at, last_login_ip
- failed_login_attempts, locked_until (account lockout)
- created_by, created_at, updated_at, deactivated_at, deactivated_by

**roles table:**
- id, tenant_id (NULL for system-wide template roles)
- name (DOCTOR, NURSE, PHARMACIST - UPPER_SNAKE_CASE)
- display_name (Doctor, Nurse, Pharmacist)
- description, is_system_role (cannot be deleted), is_active

**permissions table:**
- id, name (PRESCRIBE, VIEW_PATIENT - UPPER_SNAKE_CASE)
- display_name (Prescribe medications, View patient records)
- description, module (patient, appointment, prescription, etc.)
- is_system_permission

**role_permissions table (many-to-many):**
- id, role_id, permission_id
- Unique constraint on (role_id, permission_id)

**user_permissions table (overrides):**
- id, user_id, permission_id
- grant_type (grant, revoke) - Grant additional OR revoke from role
- granted_by, reason, expires_at (temporary permissions)
- Use case: Grant specific doctor MANAGE_USERS temporarily

**departments table:**
- id, tenant_id, name, code, description
- head_of_department (references users), is_active

**sessions table (or Redis in production):**
- id, user_id, refresh_token, ip_address, user_agent
- is_active, expires_at, created_at
- Index on: user_id, refresh_token, expires_at

**audit_logs table (critical for compliance):**
- id, tenant_id, user_id, action (LOGIN, CREATE_PATIENT, PRESCRIBE, etc.)
- resource_type (patient, appointment, prescription)
- resource_id (UUID of affected resource)
- ip_address, user_agent, request_method, request_path
- request_body (JSONB, sanitized), response_status
- metadata (JSONB for additional context)
- created_at
- Indexes: user_id, tenant_id, action, created_at DESC, resource_type+resource_id
- Retention: 7 years (healthcare compliance)

**password_history table:**
- id, user_id, password_hash, created_at
- Policy: Prevent reusing last 5 passwords

**Seed Data Required:**

1. **System Roles** (is_system_role = TRUE):
   - SUPER_ADMIN
   - HOSPITAL_ADMIN
   - MEDICAL_DIRECTOR
   - HEAD_NURSE
   - DOCTOR
   - NURSE
   - PHARMACIST
   - LAB_TECHNICIAN
   - RADIOLOGIST
   - RECEPTIONIST
   - BILLING_OFFICER
   - RECORDS_OFFICER
   - PATIENT

2. **Permissions** (~100 permissions across modules):
   Patient: REGISTER_PATIENT, VIEW_PATIENT, EDIT_PATIENT, DELETE_PATIENT, MERGE_PATIENTS
   Appointments: CREATE_APPOINTMENT, VIEW_APPOINTMENT, EDIT_APPOINTMENT, CANCEL_APPOINTMENT
   Triage: TRIAGE, RECORD_VITALS, VIEW_VITALS, REPRIORITIZE_QUEUE
   Encounters: CREATE_ENCOUNTER, VIEW_ENCOUNTER, EDIT_ENCOUNTER, SIGN_ENCOUNTER
   Prescribing: PRESCRIBE, VIEW_PRESCRIPTION, DISPENSE_MEDICATION
   Lab: ORDER_LAB, VIEW_LAB_ORDER, PROCESS_LAB_TEST, UPLOAD_LAB_RESULT
   Radiology: ORDER_RADIOLOGY, PERFORM_IMAGING, UPLOAD_RADIOLOGY_RESULT
   Pharmacy: MANAGE_DRUG_INVENTORY, RECEIVE_DRUG_STOCK
   Billing: CREATE_INVOICE, PROCESS_PAYMENT, SUBMIT_NHIS_CLAIM
   Admin: MANAGE_USERS, MANAGE_ROLES, VIEW_AUDIT_LOG, MANAGE_SETTINGS

3. **Role-Permission Mappings**:
   DOCTOR → [VIEW_PATIENT, CREATE_ENCOUNTER, PRESCRIBE, ORDER_LAB, ORDER_RADIOLOGY, VIEW_LAB_RESULTS, ...]
   NURSE → [VIEW_PATIENT, TRIAGE, RECORD_VITALS, ADMINISTER_MEDICATION, ...]
   PHARMACIST → [VIEW_PRESCRIPTION, DISPENSE_MEDICATION, MANAGE_DRUG_INVENTORY, ...]
   ... etc. for all roles

4. **Sample Tenant**:
   - Name: "Demo Hospital"
   - Slug: "demo-hospital"
   - Subscription: trial

5. **Sample Super Admin**:
   - Email: admin@medicare.com
   - Password: MediCare@2024 (hashed)
   - Role: SUPER_ADMIN
   - tenant_id: NULL

**Indexes & Constraints:**
- Unique constraint: (email, tenant_id) - Same email can exist in different hospitals
- Index on: tenant_id for all tenant-specific tables
- Full-text search index on users (first_name, last_name, email)
- Cascading deletes: role_permissions, user_permissions, sessions when user/role deleted

Create:
1. schema.prisma with all 10 tables
2. Migration files
3. Comprehensive seed file with roles, permissions, mappings
4. SQL views for common queries (user_with_role, user_with_permissions)

Location: backend/prisma/
```

---

## STEP 2: Authentication Service (JWT)

### Windsurf Prompt:
```
Create a comprehensive authentication service with JWT tokens, 2FA, and password management.

File: src/services/auth.service.ts

Features to implement:

1. **register(userData)**
```typescript
interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  departmentId?: string;
  tenantId: string;
}

async register(data: RegisterUserDTO, createdBy: string) {
  // 1. Validate email is unique within tenant
  // 2. Validate password meets complexity requirements
  // 3. Check tenant hasn't exceeded max_users limit
  // 4. Hash password with bcrypt (cost 12)
  // 5. Create user with status = 'pending_verification'
  // 6. Generate email verification token
  // 7. Send verification email
  // 8. Log USER_CREATED in audit_logs
  // 9. Return user (without password)
}

// Password complexity validation
function validatePassword(password: string): boolean {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength &&
         hasUppercase &&
         hasLowercase &&
         hasNumber &&
         hasSpecialChar;
}
```

2. **login(email, password)**
```typescript
async login(email: string, password: string, ipAddress: string, userAgent: string) {
  // 1. Find user by email
  if (!user) throw new Error('Invalid credentials');
  
  // 2. Check account status
  if (user.status !== 'active') throw new Error('Account inactive');
  if (user.locked_until && user.locked_until > new Date()) {
    throw new Error('Account locked. Try again later.');
  }
  
  // 3. Compare password
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordValid) {
    // Increment failed attempts
    await this.handleFailedLogin(user.id);
    throw new Error('Invalid credentials');
  }
  
  // 4. Reset failed attempts
  await prisma.users.update({
    where: { id: user.id },
    data: { failed_login_attempts: 0, locked_until: null }
  });
  
  // 5. If 2FA enabled, return partial response
  if (user.two_factor_enabled) {
    return {
      requires2FA: true,
      userId: user.id
    };
  }
  
  // 6. Get user permissions
  const permissions = await this.getUserPermissions(user.id, user.role_id);
  
  // 7. Generate tokens
  const tokens = await this.generateTokens(user, permissions);
  
  // 8. Create session
  await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);
  
  // 9. Update last login
  await prisma.users.update({
    where: { id: user.id },
    data: {
      last_login_at: new Date(),
      last_login_ip: ipAddress
    }
  });
  
  // 10. Log LOGIN action
  await auditLog.log({
    userId: user.id,
    action: 'LOGIN',
    ipAddress,
    userAgent
  });
  
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role.name,
      permissions
    }
  };
}

// Handle failed login
async handleFailedLogin(userId: string) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  const attempts = user.failed_login_attempts + 1;
  
  const update = {
    failed_login_attempts: attempts
  };
  
  // Lock account after 5 failed attempts
  if (attempts >= 5) {
    update.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  await prisma.users.update({
    where: { id: userId },
    data: update
  });
  
  if (attempts >= 5) {
    // Send email notification about lockout
    await emailService.sendAccountLockoutEmail(user.email);
  }
}
```

3. **generateTokens(user, permissions)**
```typescript
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

async generateTokens(user: User, permissions: string[]) {
  // Access Token (15 min expiry)
  const accessTokenPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role.name,
    roleId: user.role_id,
    permissions: permissions, // Array of permission names
    departmentId: user.department_id,
    type: 'access'
  };
  
  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Refresh Token (7 days expiry)
  const refreshTokenPayload = {
    userId: user.id,
    sessionId: uuidv4(),
    type: 'refresh'
  };
  
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}
```

4. **getUserPermissions(userId, roleId)**
```typescript
async getUserPermissions(userId: string, roleId: string): Promise<string[]> {
  // 1. Get role permissions
  const rolePermissions = await prisma.role_permissions.findMany({
    where: { role_id: roleId },
    include: { permission: true }
  });
  
  let permissions = rolePermissions.map(rp => rp.permission.name);
  
  // 2. Get user-specific permission overrides
  const userPermissions = await prisma.user_permissions.findMany({
    where: {
      user_id: userId,
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } }
      ]
    },
    include: { permission: true }
  });
  
  // 3. Apply overrides
  for (const up of userPermissions) {
    if (up.grant_type === 'grant') {
      // Add permission
      if (!permissions.includes(up.permission.name)) {
        permissions.push(up.permission.name);
      }
    } else if (up.grant_type === 'revoke') {
      // Remove permission
      permissions = permissions.filter(p => p !== up.permission.name);
    }
  }
  
  return permissions;
}
```

5. **refreshToken(refreshToken)**
```typescript
async refreshToken(refreshToken: string) {
  // 1. Verify refresh token
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }
  
  // 2. Check session is active
  const session = await prisma.sessions.findFirst({
    where: {
      refresh_token: refreshToken,
      is_active: true,
      expires_at: { gt: new Date() }
    }
  });
  
  if (!session) {
    throw new Error('Session expired or invalid');
  }
  
  // 3. Get user with permissions
  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
    include: { role: true }
  });
  
  const permissions = await this.getUserPermissions(user.id, user.role_id);
  
  // 4. Generate new access token
  const accessTokenPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role.name,
    roleId: user.role_id,
    permissions,
    departmentId: user.department_id,
    type: 'access'
  };
  
  const newAccessToken = jwt.sign(
    accessTokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // 5. Optional: Rotate refresh token (security best practice)
  // Generate new refresh token, invalidate old one
  
  return { accessToken: newAccessToken };
}
```

6. **logout(refreshToken)**
```typescript
async logout(refreshToken: string, userId: string) {
  // 1. Invalidate session
  await prisma.sessions.updateMany({
    where: {
      refresh_token: refreshToken,
      user_id: userId
    },
    data: {
      is_active: false
    }
  });
  
  // 2. Log LOGOUT action
  await auditLog.log({
    userId,
    action: 'LOGOUT'
  });
}
```

7. **enable2FA(userId)**
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

async enable2FA(userId: string) {
  // 1. Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `MediCare (${user.email})`,
    length: 32
  });
  
  // 2. Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  
  // 3. Save secret temporarily (not enabled until verified)
  await prisma.users.update({
    where: { id: userId },
    data: {
      two_factor_secret: secret.base32
    }
  });
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl
  };
}
```

8. **verify2FA(userId, code)**
```typescript
async verify2FA(userId: string, code: string) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  
  const verified = speakeasy.totp.verify({
    secret: user.two_factor_secret,
    encoding: 'base32',
    token: code,
    window: 2 // Allow 2 time steps before/after for clock drift
  });
  
  if (verified) {
    // Enable 2FA
    await prisma.users.update({
      where: { id: userId },
      data: { two_factor_enabled: true }
    });
    
    return { success: true };
  }
  
  throw new Error('Invalid 2FA code');
}
```

9. **requestPasswordReset(email)**
```typescript
import crypto from 'crypto';

async requestPasswordReset(email: string) {
  const user = await prisma.users.findFirst({
    where: { email }
  });
  
  if (!user) {
    // Don't reveal if email exists (security)
    return { success: true };
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_reset_token: resetToken,
      password_reset_expires: resetExpires
    }
  });
  
  // Send reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await emailService.sendPasswordResetEmail(user.email, resetLink);
  
  await auditLog.log({
    userId: user.id,
    action: 'PASSWORD_RESET_REQUESTED'
  });
  
  return { success: true };
}
```

10. **resetPassword(token, newPassword)**
```typescript
async resetPassword(token: string, newPassword: string) {
  // 1. Find user by token
  const user = await prisma.users.findFirst({
    where: {
      password_reset_token: token,
      password_reset_expires: { gt: new Date() }
    }
  });
  
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }
  
  // 2. Validate password complexity
  if (!this.validatePassword(newPassword)) {
    throw new Error('Password does not meet complexity requirements');
  }
  
  // 3. Check password history (prevent reuse)
  const passwordHistory = await prisma.password_history.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 5
  });
  
  for (const hist of passwordHistory) {
    const matches = await bcrypt.compare(newPassword, hist.password_hash);
    if (matches) {
      throw new Error('Cannot reuse recent passwords');
    }
  }
  
  // 4. Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  // 5. Update user
  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
      failed_login_attempts: 0,
      locked_until: null
    }
  });
  
  // 6. Add to password history
  await prisma.password_history.create({
    data: {
      user_id: user.id,
      password_hash: passwordHash
    }
  });
  
  // 7. Invalidate all sessions (force re-login)
  await prisma.sessions.updateMany({
    where: { user_id: user.id },
    data: { is_active: false }
  });
  
  // 8. Send confirmation email
  await emailService.sendPasswordChangedEmail(user.email);
  
  // 9. Log action
  await auditLog.log({
    userId: user.id,
    action: 'PASSWORD_RESET_COMPLETED'
  });
  
  return { success: true };
}
```

Files to create:
- src/services/auth.service.ts
- src/services/auth.service.test.ts
- src/utils/password-validator.ts
```

---

## STEP 3: Authorization Middleware (Permission Checking)

### Windsurf Prompt:
```
Create authorization middleware for protecting routes with permission checks.

Files: 
- src/middleware/auth.middleware.ts
- src/middleware/permissions.middleware.ts

Implementation:

1. **requireAuth** - Verify JWT and authenticate user
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 2. Verify JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // 3. Check token type
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // 4. Attach user info to request
    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      roleId: payload.roleId,
      permissions: payload.permissions,
      departmentId: payload.departmentId
    };
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};
```

2. **requirePermission** - Check user has required permission
```typescript
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated first (requireAuth ran before this)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has ALL required permissions (AND logic)
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      // Log unauthorized access attempt
      auditLog.log({
        userId: req.user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        metadata: {
          requiredPermissions,
          userPermissions,
          path: req.path
        }
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: requiredPermissions,
        has: userPermissions
      });
    }
    
    next();
  };
};
```

3. **requireRole** - Check user has specific role
```typescript
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient role',
        required: allowedRoles,
        has: req.user.role
      });
    }
    
    next();
  };
};
```

4. **requireTenant** - Ensure request is for user's tenant (multi-tenancy)
```typescript
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract tenant from route params or body
  const requestedTenantId = req.params.tenantId || req.body.tenantId;
  
  // Super admins (tenant_id = NULL) can access all tenants
  if (req.user.tenantId === null) {
    next();
    return;
  }
  
  // Regular users must match tenant
  if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Cannot access resources from another tenant'
    });
  }
  
  next();
};
```

5. **Usage Examples**
```typescript
import { Router } from 'express';
import { requireAuth, requirePermission, requireRole } from './middleware';

const router = Router();

// Public route (no authentication)
router.post('/api/auth/login', authController.login);

// Authenticated route (any logged-in user)
router.get('/api/profile', requireAuth, userController.getProfile);

// Permission-based route
router.post(
  '/api/prescriptions',
  requireAuth,
  requirePermission('PRESCRIBE'),
  prescriptionController.create
);

// Multiple permissions required (AND logic)
router.post(
  '/api/users',
  requireAuth,
  requirePermission('MANAGE_USERS', 'CREATE_USER'),
  userController.create
);

// Role-based route
router.get(
  '/api/admin/reports',
  requireAuth,
  requireRole('HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  reportController.index
);

// Combination: Role + Permission
router.post(
  '/api/users/:userId/assign-role',
  requireAuth,
  requireRole('HOSPITAL_ADMIN'),
  requirePermission('ASSIGN_ROLE'),
  userController.assignRole
);
```

6. **Tenant Isolation Middleware** (Apply globally)
```typescript
// Auto-inject tenant_id into all queries
export const tenantIsolation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    next();
    return;
  }
  
  // Store tenant context for this request
  req.tenantId = req.user.tenantId;
  
  // All database queries should use: WHERE tenant_id = req.tenantId
  // OR use Prisma middleware to auto-inject tenant_id
  
  next();
};
```

Files:
- src/middleware/auth.middleware.ts (requireAuth)
- src/middleware/permissions.middleware.ts (requirePermission, requireRole)
- src/middleware/tenant-isolation.middleware.ts (requireTenant, tenantIsolation)
- src/types/express.d.ts (TypeScript type definitions for req.user)
```

---

## STEP 4: User Management APIs

### Windsurf Prompt:
```
Create complete user management API endpoints.

File: src/routes/users.routes.ts, src/controllers/users.controller.ts

Endpoints to implement:

1. **POST /api/auth/register** - Create new user
   - Permission: MANAGE_USERS
   - Validation: Email unique, password complexity, role exists, tenant not over limit
   - Side effects: Hash password, send verification email, log USER_CREATED

2. **POST /api/auth/login** - Authenticate user
   - Public endpoint
   - Returns: Access token + refresh token + user object
   - Logic: Validate credentials, check 2FA, generate tokens, create session

3. **POST /api/auth/verify-2fa** - Verify TOTP code
   - Public endpoint (after password validation)
   - Input: userId, code
   - Returns: Tokens if code valid

4. **POST /api/auth/refresh** - Refresh access token
   - Public endpoint
   - Input: Refresh token
   - Returns: New access token

5. **POST /api/auth/logout** - Logout user
   - Authenticated
   - Side effects: Invalidate session, log LOGOUT

6. **POST /api/auth/forgot-password** - Request password reset
   - Public endpoint
   - Side effects: Generate reset token, send email

7. **POST /api/auth/reset-password** - Reset password with token
   - Public endpoint
   - Validation: Token valid, password complexity, not in history
   - Side effects: Update password, invalidate sessions, log action

8. **GET /api/users** - List users
   - Permission: VIEW_USERS
   - Query params: role, department, status, search, page, limit
   - Response: Paginated list of users (without passwords)

9. **GET /api/users/:id** - Get user details
   - Permission: VIEW_USERS
   - Response: Full user object with role and permissions

10. **PUT /api/users/:id** - Update user
    - Permission: EDIT_USER
    - Input: firstName, lastName, phone, departmentId, specialization
    - Side effects: Log USER_UPDATED

11. **POST /api/users/:id/deactivate** - Deactivate user
    - Permission: DEACTIVATE_USER
    - Side effects: Set status=inactive, invalidate sessions, log USER_DEACTIVATED

12. **POST /api/users/:id/assign-role** - Change user's role
    - Permission: ASSIGN_ROLE
    - Input: roleId
    - Side effects: Update role_id, invalidate sessions (force re-login with new permissions), log ROLE_CHANGED

13. **POST /api/users/:id/reset-password** - Admin reset user password
    - Permission: RESET_USER_PASSWORD
    - Generates random password, sends email

14. **POST /api/users/:id/unlock** - Unlock locked account
    - Permission: MANAGE_USERS
    - Side effects: Clear locked_until, reset failed_login_attempts

15. **GET /api/users/:id/activity** - Get user activity log
    - Permission: VIEW_AUDIT_LOG
    - Returns: Audit logs for this user

16. **POST /api/profile/change-password** - User changes own password
    - Authenticated
    - Input: currentPassword, newPassword
    - Validation: Current password correct, new password meets requirements, not in history

17. **POST /api/profile/enable-2fa** - Enable 2FA
    - Authenticated
    - Returns: Secret + QR code

18. **POST /api/profile/verify-2fa** - Verify and enable 2FA
    - Authenticated
    - Input: code
    - Side effects: Set two_factor_enabled = true

19. **POST /api/profile/disable-2fa** - Disable 2FA
    - Authenticated
    - Input: password (for confirmation)
    - Side effects: Set two_factor_enabled = false, clear secret

**Example Implementation:**

```typescript
// src/controllers/users.controller.ts
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

export class UsersController {
  async list(req: Request, res: Response) {
    try {
      const { role, department, status, search, page = 1, limit = 20 } = req.query;
      
      const filters = {
        tenant_id: req.user.tenantId, // Multi-tenancy filter
        ...(role && { role_id: role }),
        ...(department && { department_id: department }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        })
      };
      
      const [users, total] = await Promise.all([
        prisma.users.findMany({
          where: filters,
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            status: true,
            role: { select: { name: true, display_name: true } },
            department: { select: { name: true } },
            last_login_at: true
            // Exclude password_hash
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.users.count({ where: filters })
      ]);
      
      res.json({
        success: true,
        data: {
          users,
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }
  
  async assignRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      
      // Validate role exists
      const role = await prisma.roles.findUnique({ where: { id: roleId } });
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      // Update user role
      await prisma.users.update({
        where: { id },
        data: { role_id: roleId }
      });
      
      // Invalidate user sessions (force re-login with new permissions)
      await prisma.sessions.updateMany({
        where: { user_id: id },
        data: { is_active: false }
      });
      
      // Log action
      await auditLog.log({
        userId: req.user.id,
        action: 'ROLE_CHANGED',
        resourceType: 'user',
        resourceId: id,
        metadata: { newRoleId: roleId, roleName: role.name }
      });
      
      res.json({
        success: true,
        message: 'Role updated successfully. User must re-login.'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to assign role'
      });
    }
  }
}
```

Files:
- src/routes/auth.routes.ts
- src/routes/users.routes.ts
- src/controllers/auth.controller.ts
- src/controllers/users.controller.ts
- src/services/user.service.ts
```

---

## STEP 5: Role & Permission Management APIs

### Windsurf Prompt:
```
Create role and permission management endpoints.

Files: src/routes/roles.routes.ts, src/controllers/roles.controller.ts

Endpoints:

1. **GET /api/roles** - List all roles
   - Permission: VIEW_ROLES
   - Filter by: is_system_role, is_active
   - Response: Array of roles with permission count

2. **GET /api/roles/:id** - Get role details
   - Permission: VIEW_ROLES
   - Include: List of permissions assigned to role

3. **POST /api/roles** - Create custom role
   - Permission: MANAGE_ROLES
   - Input: name, displayName, description
   - Validation: Name unique within tenant, not system role name
   - Note: Only HOSPITAL_ADMIN can create custom roles

4. **PUT /api/roles/:id** - Update role
   - Permission: MANAGE_ROLES
   - Cannot edit system roles (is_system_role = TRUE)

5. **DELETE /api/roles/:id** - Delete role
   - Permission: MANAGE_ROLES
   - Validation: Not system role, no users assigned to role

6. **GET /api/roles/:id/permissions** - Get role permissions
   - Permission: VIEW_ROLES
   - Response: Array of permissions with module grouping

7. **POST /api/roles/:id/permissions** - Update role permissions
   - Permission: MANAGE_ROLES
   - Input: { permissionsToAdd: [ids], permissionsToRemove: [ids] }
   - Side effects: 
     * Update role_permissions table
     * Invalidate sessions for all users with this role
     * Log ROLE_PERMISSIONS_UPDATED

8. **GET /api/roles/:id/users** - Get users with role
   - Permission: VIEW_USERS
   - Response: List of users assigned to this role

9. **GET /api/permissions** - List all permissions
   - Permission: VIEW_PERMISSIONS
   - Group by: module
   - Response: 
     ```json
     {
       "patient_management": [
         { "id": "...", "name": "VIEW_PATIENT", "displayName": "View patient records" }
       ],
       "prescribing": [
         { "id": "...", "name": "PRESCRIBE", "displayName": "Prescribe medications" }
       ]
     }
     ```

10. **POST /api/users/:userId/permissions** - Grant user-specific permission
    - Permission: MANAGE_USERS
    - Input: { permissionId, grantType: 'grant'|'revoke', reason, expiresAt }
    - Use case: Temporarily grant DOCTOR ability to MANAGE_USERS

**Permission Matrix Component Data**:
```typescript
// GET /api/roles/permission-matrix
// Returns data for permission assignment UI

async getPermissionMatrix(req: Request, res: Response) {
  const permissions = await prisma.permissions.findMany({
    orderBy: { module: 'asc' }
  });
  
  const roles = await prisma.roles.findMany({
    where: { tenant_id: req.user.tenantId },
    include: {
      role_permissions: {
        select: { permission_id: true }
      }
    }
  });
  
  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});
  
  // Format for UI grid
  const matrix = {
    modules: permissionsByModule,
    roles: roles.map(role => ({
      id: role.id,
      name: role.display_name,
      permissions: role.role_permissions.map(rp => rp.permission_id)
    }))
  };
  
  res.json({ success: true, data: matrix });
}
```

Files:
- src/routes/roles.routes.ts
- src/controllers/roles.controller.ts
- src/services/role.service.ts
```

---

## STEP 6: Audit Logging Service

### Windsurf Prompt:
```
Create comprehensive audit logging service for compliance.

File: src/services/audit-log.service.ts

Requirements:
- Log ALL user actions (login, view patient, prescribe, etc.)
- Capture: user, action, resource, IP, user agent, timestamp
- Sanitize sensitive data before logging
- Support querying audit logs

Implementation:

```typescript
import { Request } from 'express';

interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  requestBody?: any;
  responseStatus?: number;
  metadata?: Record<string, any>;
}

export class AuditLogService {
  async log(entry: AuditLogEntry) {
    try {
      // Sanitize sensitive data
      const sanitizedBody = entry.requestBody ? 
        this.sanitizeData(entry.requestBody) : null;
      
      await prisma.audit_logs.create({
        data: {
          tenant_id: entry.tenantId,
          user_id: entry.userId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          request_method: entry.requestMethod,
          request_path: entry.requestPath,
          request_body: sanitizedBody,
          response_status: entry.responseStatus,
          metadata: entry.metadata || {},
          created_at: new Date()
        }
      });
    } catch (error) {
      // Never let audit logging break the main flow
      console.error('Audit log failed:', error);
    }
  }
  
  // Sanitize sensitive data (remove passwords, tokens, etc.)
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'two_factor_secret',
      'creditCard',
      'ssn'
    ];
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  // Log from Express middleware
  async logRequest(req: Request, res: Response, action: string) {
    await this.log({
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      action,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.path,
      requestBody: req.body,
      resourceType: this.extractResourceType(req.path),
      resourceId: this.extractResourceId(req)
    });
  }
  
  private extractResourceType(path: string): string | undefined {
    const match = path.match(/\/api\/([^/]+)/);
    return match ? match[1] : undefined;
  }
  
  private extractResourceId(req: Request): string | undefined {
    return req.params.id || req.body.id;
  }
  
  // Query audit logs
  async query(filters: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      tenantId,
      userId,
      action,
      resourceType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = filters;
    
    const where = {
      ...(tenantId && { tenant_id: tenantId }),
      ...(userId && { user_id: userId }),
      ...(action && { action }),
      ...(resourceType && { resource_type: resourceType }),
      ...(dateFrom || dateTo ? {
        created_at: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo })
        }
      } : {})
    };
    
    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.audit_logs.count({ where })
    ]);
    
    return {
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }
  
  // Export audit logs to CSV (for compliance)
  async exportToCSV(filters: any): Promise<string> {
    const { logs } = await this.query({ ...filters, limit: 10000 });
    
    const headers = 'Date,User,Action,Resource,IP Address\n';
    const rows = logs.map(log =>
      `${log.created_at},${log.user?.email},${log.action},${log.resource_type}:${log.resource_id},${log.ip_address}`
    ).join('\n');
    
    return headers + rows;
  }
}

export const auditLog = new AuditLogService();
```

**Audit Logging Middleware** (Auto-log all API requests):
```typescript
export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Capture original send function
  const originalSend = res.send;
  
  // Override send to capture response
  res.send = function(body) {
    // Log after response
    if (req.user) {
      auditLog.log({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        action: `${req.method}_${req.path.replace(/\/\d+/g, '/:id')}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestMethod: req.method,
        requestPath: req.path,
        requestBody: req.body,
        responseStatus: res.statusCode
      });
    }
    
    // Call original send
    return originalSend.call(this, body);
  };
  
  next();
};
```

Files:
- src/services/audit-log.service.ts
- src/middleware/audit.middleware.ts
- src/routes/audit-logs.routes.ts (API for viewing logs)
```

---

## STEP 7: Frontend - Login Page

### Windsurf Prompt:
```
Create the login page with 2FA support.

Component: LoginPage

Route: /login

Features:
- Email + password form
- Remember me checkbox
- Forgot password link
- 2FA code input (if enabled)
- Error handling
- Account lockout message

Implementation:

```tsx
import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(values.email, values.password);
      
      if (response.requires2FA) {
        setRequires2FA(true);
        setUserId(response.userId);
      } else {
        // Store tokens
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        
        message.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.code === 'ACCOUNT_LOCKED') {
        setError('Account locked due to multiple failed login attempts. Try again in 30 minutes.');
      } else if (err.code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email before logging in.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerify2FA = async (values: { code: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.verify2FA(userId!, values.code);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };
  
  if (requires2FA) {
    return (
      <div className="login-container">
        <Card title="Two-Factor Authentication">
          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
          
          <Form onFinish={handleVerify2FA}>
            <Form.Item
              name="code"
              rules={[{ required: true, message: 'Please enter 2FA code' }]}
            >
              <Input
                size="large"
                placeholder="Enter 6-digit code from authenticator app"
                maxLength={6}
                autoFocus
              />
            </Form.Item>
            
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Verify
            </Button>
            
            <Button type="link" onClick={() => setRequires2FA(false)} block>
              Back to login
            </Button>
          </Form>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo">
          <img src="/logo.png" alt="MediCare" />
          <h1>MediCare Ghana</h1>
          <p>Hospital Management System</p>
        </div>
        
        {error && <Alert type="error" message={error} closable style={{ marginBottom: 16 }} />}
        
        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
              autoFocus
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          
          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            
            <a href="/forgot-password" style={{ float: 'right' }}>
              Forgot password?
            </a>
          </Form.Item>
          
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Log In
          </Button>
        </Form>
      </div>
    </div>
  );
};
```

Styling:
```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo img {
  width: 80px;
  height: 80px;
  margin-bottom: 10px;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.logo p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
```

Component: src/pages/auth/LoginPage.tsx
```

---

## STEP 8: Frontend - User Management Interface

### Windsurf Prompt:
```
Create the user management interface for hospital admins.

Component: UserManagement

Route: /admin/users
Permission: VIEW_USERS

Features:
- User list with filters
- Add new user
- Edit user
- Deactivate user
- Assign role
- Reset password
- View activity log

Implementation:

```tsx
import React, { useState } from 'react';
import { Table, Button, Space, Tag, Input, Select, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, KeyOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';

export const UserManagement: React.FC = () => {
  const [filters, setFilters] = useState({
    role: undefined,
    department: undefined,
    status: undefined,
    search: ''
  });
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Fetch users
  const { data: usersData, refetch } = useQuery(
    ['users', filters, page],
    () => fetchUsers({ ...filters, page, limit: 20 })
  );
  
  // Fetch roles for filter
  const { data: roles } = useQuery(['roles'], fetchRoles);
  
  // Fetch departments for filter
  const { data: departments } = useQuery(['departments'], fetchDepartments);
  
  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <Avatar src={record.profile_photo_url} />
          <div>
            <div>{record.first_name} {record.last_name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: ['role', 'display_name'],
      render: (role) => <Tag color="blue">{role}</Tag>
    },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      render: (dept) => dept || '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : status === 'suspended' ? 'red' : 'orange'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login_at',
      render: (date) => date ? formatDate(date) : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            Reset Password
          </Button>
          {record.status === 'active' && (
            <Button
              type="link"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDeactivate(record)}
            >
              Deactivate
            </Button>
          )}
        </Space>
      )
    }
  ];
  
  return (
    <div className="user-management">
      <Card
        title="User Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
          >
            Add User
          </Button>
        }
      >
        {/* Filters */}
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by name or email"
            style={{ width: 250 }}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
          />
          
          <Select
            placeholder="Filter by role"
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, role: value })}
            allowClear
          >
            {roles?.map(role => (
              <Select.Option key={role.id} value={role.id}>
                {role.display_name}
              </Select.Option>
            ))}
          </Select>
          
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, status: value })}
            allowClear
          >
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
            <Select.Option value="suspended">Suspended</Select.Option>
          </Select>
        </Space>
        
        {/* User Table */}
        <Table
          dataSource={usersData?.users}
          columns={columns}
          rowKey="id"
          pagination={{
            current: page,
            total: usersData?.total,
            pageSize: 20,
            onChange: setPage
          }}
        />
      </Card>
      
      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            refetch();
          }}
          roles={roles}
          departments={departments}
        />
      )}
    </div>
  );
};

const AddUserModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  roles: Role[];
  departments: Department[];
}> = ({ visible, onClose, roles, departments }) => {
  const [form] = Form.useForm();
  
  const createUser = useMutation(
    (data: any) => userService.create(data),
    {
      onSuccess: () => {
        message.success('User created successfully');
        onClose();
      },
      onError: (error: any) => {
        message.error(error.message);
      }
    }
  );
  
  const handleSubmit = async (values: any) => {
    createUser.mutate(values);
  };
  
  return (
    <Modal
      title="Add New User"
      visible={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create User"
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true },
            { type: 'email', message: 'Invalid email' }
          ]}
        >
          <Input />
        </Form.Item>
        
        <Form.Item
          name="phone"
          label="Phone"
        >
          <Input />
        </Form.Item>
        
        <Form.Item
          name="roleId"
          label="Role"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select role">
            {roles?.map(role => (
              <Select.Option key={role.id} value={role.id}>
                {role.display_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="departmentId"
          label="Department"
        >
          <Select placeholder="Select department" allowClear>
            {departments?.map(dept => (
              <Select.Option key={dept.id} value={dept.id}>
                {dept.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="password"
          label="Temporary Password"
          rules={[{ required: true, min: 8 }]}
        >
          <Input.Password />
        </Form.Item>
        
        <Alert
          type="info"
          message="User will receive an email with login credentials and must change password on first login."
        />
      </Form>
    </Modal>
  );
};
```

Component: src/pages/admin/UserManagement.tsx
```

---

## STEP 9: Frontend - Role & Permission Management

### Windsurf Prompt:
```
Create role and permission management interface with permission matrix.

Component: RoleManagement

Route: /admin/roles
Permission: MANAGE_ROLES

Features:
- List of roles
- Create custom role
- Edit role permissions (checkbox grid)
- View users with role
- Delete custom role

Implementation:

```tsx
import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Checkbox } from 'antd';

export const RoleManagement: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const { data: roles } = useQuery(['roles'], fetchRoles);
  const { data: permissionMatrix } = useQuery(['permission-matrix'], fetchPermissionMatrix);
  
  const columns = [
    {
      title: 'Role',
      dataIndex: 'display_name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.is_system_role && <Tag color="blue" style={{ marginLeft: 8 }}>System</Tag>}
        </div>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description'
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => `${record._count?.role_permissions || 0} permissions`
    },
    {
      title: 'Users',
      key: 'users',
      render: (_, record) => `${record._count?.users || 0} users`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setSelectedRole(record);
              setShowPermissionModal(true);
            }}
          >
            Manage Permissions
          </Button>
          {!record.is_system_role && (
            <Button type="link" danger onClick={() => handleDelete(record)}>
              Delete
            </Button>
          )}
        </Space>
      )
    }
  ];
  
  return (
    <div className="role-management">
      <Card title="Role Management">
        <Table
          dataSource={roles}
          columns={columns}
          rowKey="id"
        />
      </Card>
      
      {showPermissionModal && selectedRole && (
        <PermissionMatrixModal
          role={selectedRole}
          visible={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedRole(null);
          }}
          permissionMatrix={permissionMatrix}
        />
      )}
    </div>
  );
};

const PermissionMatrixModal: React.FC<{
  role: Role;
  visible: boolean;
  onClose: () => void;
  permissionMatrix: any;
}> = ({ role, visible, onClose, permissionMatrix }) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role.role_permissions?.map(rp => rp.permission_id) || []
  );
  
  const updatePermissions = useMutation(
    (data: any) => roleService.updatePermissions(role.id, data),
    {
      onSuccess: () => {
        message.success('Permissions updated');
        onClose();
      }
    }
  );
  
  const handleSave = () => {
    const currentPermissions = role.role_permissions?.map(rp => rp.permission_id) || [];
    const permissionsToAdd = selectedPermissions.filter(p => !currentPermissions.includes(p));
    const permissionsToRemove = currentPermissions.filter(p => !selectedPermissions.includes(p));
    
    updatePermissions.mutate({
      permissionsToAdd,
      permissionsToRemove
    });
  };
  
  const handleTogglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    }
  };
  
  return (
    <Modal
      title={`Manage Permissions - ${role.display_name}`}
      visible={visible}
      onCancel={onClose}
      onOk={handleSave}
      width={900}
    >
      <Alert
        type="warning"
        message="Changing permissions will force all users with this role to re-login"
        style={{ marginBottom: 16 }}
      />
      
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {Object.entries(permissionMatrix.modules).map(([module, permissions]: any) => (
          <Card key={module} size="small" title={module} style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]}>
              {permissions.map((permission) => (
                <Col span={8} key={permission.id}>
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => handleTogglePermission(permission.id)}
                  >
                    {permission.display_name}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
      </div>
      
      <div style={{ marginTop: 16 }}>
        <Text strong>Selected: {selectedPermissions.length} permissions</Text>
      </div>
    </Modal>
  );
};
```

Component: src/pages/admin/RoleManagement.tsx
```

---

## STEP 10: Testing

### Windsurf Prompt:
```
Create comprehensive tests for authentication and authorization.

1. **Unit Tests - Auth Service**

File: src/services/auth.service.test.ts

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'doctor@hospital.com',
        password: 'SecurePass@123',
        firstName: 'John',
        lastName: 'Doe',
        roleId: doctorRoleId,
        tenantId: testTenantId
      };
      
      const user = await authService.register(userData, adminId);
      
      expect(user.email).toBe(userData.email);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.status).toBe('pending_verification');
    });
    
    it('should reject weak passwords', async () => {
      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'weak',
          ...otherFields
        })
      ).rejects.toThrow('Password does not meet complexity requirements');
    });
    
    it('should reject duplicate email within tenant', async () => {
      const userData = { email: 'existing@hospital.com', ... };
      await authService.register(userData, adminId);
      
      await expect(
        authService.register(userData, adminId)
      ).rejects.toThrow('Email already exists');
    });
  });
  
  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const result = await authService.login(
        'doctor@hospital.com',
        'SecurePass@123',
        '127.0.0.1',
        'Mozilla/5.0'
      );
      
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('doctor@hospital.com');
      expect(result.user.permissions).toContain('PRESCRIBE');
    });
    
    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login('user@test.com', 'wrongpassword', '127.0.0.1', 'agent');
        } catch {}
      }
      
      const user = await prisma.users.findUnique({
        where: { email: 'user@test.com' }
      });
      
      expect(user.locked_until).toBeDefined();
      expect(user.locked_until > new Date()).toBe(true);
    });
  });
  
  describe('getUserPermissions', () => {
    it('should return role permissions', async () => {
      const permissions = await authService.getUserPermissions(doctorId, doctorRoleId);
      
      expect(permissions).toContain('VIEW_PATIENT');
      expect(permissions).toContain('PRESCRIBE');
    });
    
    it('should apply user-specific permission grants', async () => {
      // Grant additional permission
      await prisma.user_permissions.create({
        data: {
          user_id: doctorId,
          permission_id: manageUsersPermissionId,
          grant_type: 'grant'
        }
      });
      
      const permissions = await authService.getUserPermissions(doctorId, doctorRoleId);
      
      expect(permissions).toContain('MANAGE_USERS');
    });
    
    it('should apply user-specific permission revocations', async () => {
      // Revoke permission
      await prisma.user_permissions.create({
        data: {
          user_id: doctorId,
          permission_id: prescribePermissionId,
          grant_type: 'revoke'
        }
      });
      
      const permissions = await authService.getUserPermissions(doctorId, doctorRoleId);
      
      expect(permissions).not.toContain('PRESCRIBE');
    });
  });
});
```

2. **Integration Tests - Auth APIs**

File: tests/integration/auth.test.ts

```typescript
describe('Auth API', () => {
  it('should login and return JWT tokens', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'doctor@hospital.com',
        password: 'SecurePass@123'
      })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });
  
  it('should refresh access token', async () => {
    // Login first
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'pass' });
    
    const refreshToken = loginRes.body.data.refreshToken;
    
    // Refresh
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    
    expect(response.body.data.accessToken).toBeDefined();
  });
  
  it('should protect routes with requireAuth', async () => {
    await request(app)
      .get('/api/users')
      .expect(401);
  });
  
  it('should allow access with valid token', async () => {
    const token = await getTestToken('DOCTOR');
    
    await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  
  it('should enforce permissions', async () => {
    const doctorToken = await getTestToken('DOCTOR'); // Has VIEW_PATIENT
    const receptionistToken = await getTestToken('RECEPTIONIST'); // No PRESCRIBE
    
    // Doctor can prescribe
    await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ ... })
      .expect(201);
    
    // Receptionist cannot prescribe
    await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ ... })
      .expect(403);
  });
});
```

3. **E2E Tests (Cypress)**

File: cypress/e2e/auth.cy.ts

```typescript
describe('Authentication Flow', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').type('doctor@hospital.com');
    cy.get('[data-testid="password-input"]').type('SecurePass@123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Dr.').should('be.visible');
  });
  
  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').type('user@test.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.contains('Invalid email or password').should('be.visible');
  });
  
  it('should handle 2FA flow', () => {
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').type('2fa-user@test.com');
    cy.get('[data-testid="password-input"]').type('password');
    cy.get('[data-testid="login-button"]').click();
    
    // Should show 2FA input
    cy.contains('Two-Factor Authentication').should('be.visible');
    cy.get('[data-testid="2fa-code"]').type('123456');
    cy.get('[data-testid="verify-button"]').click();
    
    cy.url().should('include', '/dashboard');
  });
});
```

Run tests:
```bash
npm test
npm run test:integration
npm run cypress:run
```
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Week 1: Backend Core
- [ ] Database schema (10 tables)
- [ ] Seed roles, permissions, role-permission mappings
- [ ] Authentication service (JWT, 2FA, password management)
- [ ] Authorization middleware (permission checking)
- [ ] Audit logging service

### Week 2: APIs & Testing
- [ ] Auth APIs (login, refresh, logout, password reset)
- [ ] User management APIs
- [ ] Role & permission management APIs
- [ ] Unit tests (auth service)
- [ ] Integration tests (APIs)

### Week 3: Frontend & Polish
- [ ] Login page (with 2FA support)
- [ ] User management interface
- [ ] Role & permission management interface
- [ ] User profile page
- [ ] Audit log viewer
- [ ] E2E tests (Cypress)

---

## 🎯 SUCCESS CRITERIA

**Security:**
✅ **Zero unauthorized access** incidents  
✅ **100% of actions audited** for compliance  
✅ **Password complexity enforced** (8+ chars, upper/lower/number/special)  
✅ **2FA available** for all users  
✅ **Account lockout** after 5 failed attempts  

**Usability:**
✅ **Login time <2 seconds**  
✅ **User creation <1 minute**  
✅ **Role assignment <30 seconds**  
✅ **Permission changes immediate** (after re-login)  

**Multi-Tenancy:**
✅ **Complete data isolation** per hospital  
✅ **No cross-tenant data leakage**  
✅ **Tenant limits enforced** (max users)  

**Compliance:**
✅ **Audit logs retained for 7 years**  
✅ **HIPAA-compliant access controls**  
✅ **GDPR data protection features**  
✅ **SOC 2 audit trail requirements met**  

---

## 💡 PRO TIPS

1. **Security First** - Never compromise on authentication/authorization
2. **Audit Everything** - Log all actions for compliance (7-year retention)
3. **Multi-Tenancy** - Every query MUST filter by tenant_id
4. **Password Policies** - Enforce complexity, prevent reuse
5. **Session Management** - Short access tokens (15 min), longer refresh (7 days)
6. **2FA Recommended** - Especially for admins and doctors
7. **Permission Caching** - Store in JWT for fast checks
8. **Account Lockout** - Prevent brute force attacks
9. **Audit Middleware** - Auto-log all API requests
10. **Test Security** - Extensive security testing required

---

## 🚀 AFTER USER MANAGEMENT MODULE

This module is **FOUNDATION** - retrofit it across ALL existing modules:

**Retrofitting Existing Modules:**
```
1. Add tenant_id to all tables
2. Add permission checks to all routes
3. Update all queries: WHERE tenant_id = current_tenant
4. Add audit logging to all actions
5. Update frontend to hide features based on permissions
```

**Module Integration:**
```
✅ Registration → Check REGISTER_PATIENT permission
✅ Appointments → Check CREATE_APPOINTMENT permission
✅ Triage → Check TRIAGE permission
✅ Consultation → Check CREATE_ENCOUNTER permission
✅ Prescription → Check PRESCRIBE permission
✅ Pharmacy → Check DISPENSE_MEDICATION permission
✅ Lab → Check ORDER_LAB permission
✅ Billing → Check CREATE_INVOICE permission
```

Ready to start? Begin with **Step 1: Database Schema**! 🔐

This is the **most critical module** - get it right! 🎯
