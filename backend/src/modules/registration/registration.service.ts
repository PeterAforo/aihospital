import bcrypt from 'bcryptjs';
import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { generateVerificationCode, generateSubdomain, normalizeGhanaPhone } from '../../common/utils/validators.js';
import { logger } from '../../common/utils/logger.js';
import { mnotifyService } from '../../common/services/mnotify.service.js';
import { emailService } from '../../common/services/email.service.js';
import type {
  PreQualifyInput,
  HospitalDetailsInput,
  AdminAccountInput,
  PlanSelectionInput,
  SetupPreferencesInput,
  VerifyCodeInput,
  SelectVerificationMethodInput,
} from './registration.schema.js';

export class RegistrationService {
  // Step 1: Pre-qualification
  async preQualify(data: PreQualifyInput, ipAddress?: string, userAgent?: string) {
    const normalizedPhone = normalizeGhanaPhone(data.phone);

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new AppError('Phone number already registered', 400, 'PHONE_EXISTS');
    }

    // Check for existing pending registration
    const existingPending = await prisma.pendingRegistration.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: normalizedPhone }],
      },
    });

    if (existingPending) {
      // Update existing pending registration
      const updated = await prisma.pendingRegistration.update({
        where: { id: existingPending.id },
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: normalizedPhone,
          hospitalName: data.hospitalName,
          userRole: data.userRole,
          userRoleOther: data.userRoleOther,
          currentStep: 1,
          lastSavedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress,
          userAgent,
        },
      });
      return { registrationId: updated.id, resumed: true };
    }

    // Create new pending registration
    const registration = await prisma.pendingRegistration.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: normalizedPhone,
        hospitalName: data.hospitalName,
        userRole: data.userRole,
        userRoleOther: data.userRoleOther,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress,
        userAgent,
      },
    });

    return { registrationId: registration.id, resumed: false };
  }

  // Step 2: Hospital Details
  async saveHospitalDetails(data: HospitalDetailsInput) {
    const registration = await this.getRegistration(data.registrationId);

    await prisma.pendingRegistration.update({
      where: { id: data.registrationId },
      data: {
        officialHospitalName: data.officialHospitalName,
        hospitalType: data.hospitalType,
        numberOfBeds: data.numberOfBeds,
        hospitalLicenseNumber: data.hospitalLicenseNumber,
        ghsRegistrationNumber: data.ghsRegistrationNumber,
        hospitalPhone: normalizeGhanaPhone(data.hospitalPhone),
        hospitalEmail: data.hospitalEmail,
        hospitalWebsite: data.hospitalWebsite || null,
        streetAddress: data.streetAddress,
        ghanaPostGPS: data.ghanaPostGPS || null,
        region: data.region,
        city: data.city,
        landmark: data.landmark,
        currentStep: 2,
        lastSavedAt: new Date(),
      },
    });

    return { success: true, currentStep: 2 };
  }

  // Step 3: Admin Account
  async saveAdminAccount(data: AdminAccountInput) {
    const registration = await this.getRegistration(data.registrationId);

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.pendingRegistration.update({
      where: { id: data.registrationId },
      data: {
        adminTitle: data.adminTitle,
        adminFirstName: data.adminFirstName,
        adminLastName: data.adminLastName,
        adminOtherNames: data.adminOtherNames,
        adminPosition: data.adminPosition,
        professionalLicense: data.professionalLicenseNumber,
        passwordHash,
        enable2FA: data.enable2FA,
        currentStep: 3,
        lastSavedAt: new Date(),
      },
    });

    return { success: true, currentStep: 3 };
  }

  // Step 4: Plan Selection
  async savePlanSelection(data: PlanSelectionInput) {
    const registration = await this.getRegistration(data.registrationId);

    await prisma.pendingRegistration.update({
      where: { id: data.registrationId },
      data: {
        selectedPlan: data.selectedPlan,
        billingCycle: data.billingCycle || 'monthly',
        currentStep: 4,
        lastSavedAt: new Date(),
      },
    });

    return { success: true, currentStep: 4 };
  }

  // Step 5: Complete Registration
  async completeRegistration(data: SetupPreferencesInput) {
    const registration = await this.getRegistration(data.registrationId);

    // Validate all required fields are present
    if (!registration.passwordHash || !registration.adminFirstName || !registration.adminLastName) {
      throw new AppError('Registration incomplete. Please complete all previous steps.', 400, 'INCOMPLETE_REGISTRATION');
    }

    // Generate subdomain
    let subdomain = generateSubdomain(registration.officialHospitalName || registration.hospitalName);
    
    // Check subdomain uniqueness
    const existingSubdomain = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existingSubdomain) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: registration.officialHospitalName || registration.hospitalName,
          subdomain,
          phone: registration.hospitalPhone || registration.phone,
          email: registration.hospitalEmail || registration.email,
          address: registration.streetAddress,
          city: registration.city,
          region: registration.region,
          logo: registration.hospitalLogo,
        },
      });

      // 2. Create Main Branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: data.branchName,
          phone: registration.hospitalPhone || registration.phone,
          email: registration.hospitalEmail || registration.email,
          address: data.sameAsHospitalAddress ? registration.streetAddress! : data.branchAddress!,
          city: registration.city,
          region: registration.region,
          isMainBranch: true,
        },
      });

      // 3. Create Admin User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          email: registration.email,
          phone: registration.phone,
          password: registration.passwordHash!,
          firstName: registration.adminFirstName!,
          lastName: registration.adminLastName!,
          role: 'HOSPITAL_ADMIN',
          mfaEnabled: registration.enable2FA,
        },
      });

      // 4. Create Tenant Settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          primaryLanguage: data.primaryLanguage,
          dateFormat: data.dateFormat,
          operatingHours: data.operatingHours,
          applyVAT: data.applyVAT,
          applyNHIL: data.applyNHIL,
          applyGETFund: data.applyGETFund,
        },
      });

      // 5. Create Subscription (30-day trial)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: registration.selectedPlan?.toUpperCase() as any || 'STARTER',
          status: 'TRIAL',
          billingCycle: registration.billingCycle || 'monthly',
          trialEndDate,
        },
      });

      return { tenant, user, branch };
    });

    return {
      success: true,
      tenantId: result.tenant.id,
      userId: result.user.id,
      phone: registration.phone,
      email: registration.email,
      message: 'Registration complete. Please verify your account.',
    };
  }

  // Step 6: Verify Code (supports both email and phone)
  async verifyCode(data: VerifyCodeInput) {
    const registration = await this.getRegistration(data.registrationId);
    const identifier = data.method === 'phone' ? registration.phone : registration.email;
    const type = data.method === 'phone' ? 'PHONE' : 'EMAIL';

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        identifier,
        type,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      throw new AppError('No verification code found. Please request a new one.', 400, 'NO_CODE');
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new AppError('Verification code has expired. Please request a new one.', 400, 'CODE_EXPIRED');
    }

    if (verificationCode.attempts >= verificationCode.maxAttempts) {
      throw new AppError('Maximum verification attempts exceeded. Please contact support.', 400, 'MAX_ATTEMPTS');
    }

    if (verificationCode.code !== data.code) {
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_CODE');
    }

    // Mark as verified
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { verifiedAt: new Date() },
    });

    // Get the user that was created
    const user = await prisma.user.findFirst({
      where: { email: registration.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new AppError('User not found. Please contact support.', 500, 'USER_NOT_FOUND');
    }

    // Delete pending registration
    await prisma.pendingRegistration.delete({
      where: { id: data.registrationId },
    });

    // Send welcome messages
    const hospitalName = registration.officialHospitalName || registration.hospitalName;
    const adminName = `${registration.adminFirstName} ${registration.adminLastName}`;
    
    // Send welcome SMS
    mnotifyService.sendWelcome(registration.phone, hospitalName).catch((err) => {
      logger.error(`Failed to send welcome SMS: ${err.message}`);
    });
    
    // Send welcome email
    emailService.sendWelcome(registration.email, adminName, hospitalName).catch((err) => {
      logger.error(`Failed to send welcome email: ${err.message}`);
    });

    return {
      success: true,
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
    };
  }

  // Send verification code (supports both email and phone)
  async sendVerificationCode(data: SelectVerificationMethodInput) {
    const registration = await this.getRegistration(data.registrationId);
    const identifier = data.method === 'phone' ? registration.phone : registration.email;
    const type = data.method === 'phone' ? 'PHONE' : 'EMAIL';

    // Check cooldown
    const lastCode = await prisma.verificationCode.findFirst({
      where: { identifier, type },
      orderBy: { createdAt: 'desc' },
    });

    if (lastCode && Date.now() - lastCode.createdAt.getTime() < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - lastCode.createdAt.getTime())) / 1000);
      throw new AppError(`Please wait ${waitSeconds} seconds before requesting a new code`, 429, 'COOLDOWN');
    }

    // Generate new code
    const code = generateVerificationCode(6);
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        identifier,
        code,
        type,
        expiresAt: codeExpiry,
      },
    });

    // Send the code via the selected method
    if (data.method === 'phone') {
      const result = await mnotifyService.sendOTP(registration.phone, code);
      if (!result.success) {
        logger.error(`Failed to send SMS OTP: ${result.error}`);
        // Don't throw - log the code for dev purposes
        logger.info(`[DEV] Verification code for ${registration.phone}: ${code}`);
      }
    } else {
      const result = await emailService.sendOTP(registration.email, code);
      if (!result.success) {
        logger.error(`Failed to send email OTP: ${result.error}`);
        logger.info(`[DEV] Verification code for ${registration.email}: ${code}`);
      }
    }

    // Log notification
    const user = await prisma.user.findFirst({ where: { email: registration.email } });
    if (user) {
      await prisma.notificationLog.create({
        data: {
          tenantId: user.tenantId,
          type: data.method === 'phone' ? 'SMS' : 'EMAIL',
          title: `Verification to ${identifier}`,
          message: `Verification code: ${code}`,
        },
      });
    }

    return {
      success: true,
      method: data.method,
      destination: data.method === 'phone' 
        ? `****${registration.phone.slice(-4)}` 
        : `${registration.email.slice(0, 3)}***@${registration.email.split('@')[1]}`,
      message: `Verification code sent to your ${data.method}`,
    };
  }

  // Resend verification code (legacy support + new method)
  async resendCode(registrationId: string, method: 'phone' | 'email' = 'phone') {
    return this.sendVerificationCode({ registrationId, method });
  }

  // Check email availability
  async checkEmailAvailability(email: string) {
    const existingUser = await prisma.user.findFirst({ where: { email } });
    const existingPending = await prisma.pendingRegistration.findFirst({ where: { email } });
    
    return {
      available: !existingUser,
      pendingRegistration: !!existingPending,
    };
  }

  // Check phone availability
  async checkPhoneAvailability(phone: string) {
    const normalized = normalizeGhanaPhone(phone);
    const existingUser = await prisma.user.findFirst({ where: { phone: normalized } });
    const existingPending = await prisma.pendingRegistration.findFirst({ where: { phone: normalized } });
    
    return {
      available: !existingUser,
      pendingRegistration: !!existingPending,
    };
  }

  // Get registration by ID
  async getRegistration(registrationId: string) {
    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }

    if (registration.expiresAt < new Date()) {
      await prisma.pendingRegistration.delete({ where: { id: registrationId } });
      throw new AppError('Registration has expired. Please start again.', 400, 'REGISTRATION_EXPIRED');
    }

    return registration;
  }

  // Get registration progress
  async getProgress(registrationId: string) {
    const registration = await this.getRegistration(registrationId);
    
    return {
      currentStep: registration.currentStep,
      data: {
        step1: {
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          hospitalName: registration.hospitalName,
          userRole: registration.userRole,
        },
        step2: registration.currentStep >= 2 ? {
          officialHospitalName: registration.officialHospitalName,
          hospitalType: registration.hospitalType,
          numberOfBeds: registration.numberOfBeds,
          region: registration.region,
          city: registration.city,
        } : null,
        step3: registration.currentStep >= 3 ? {
          adminTitle: registration.adminTitle,
          adminFirstName: registration.adminFirstName,
          adminLastName: registration.adminLastName,
          adminPosition: registration.adminPosition,
        } : null,
        step4: registration.currentStep >= 4 ? {
          selectedPlan: registration.selectedPlan,
          billingCycle: registration.billingCycle,
        } : null,
      },
    };
  }
}
