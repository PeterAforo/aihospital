import { z } from 'zod';

// Ghana phone: 0XX XXXX XXX or +233 XX XXXX XXX (10 digits local, 12 with country code)
const ghanaPhoneRegex = /^(\+233|233|0)?[0-9]{9,10}$/;

// Step 1 - Pre-qualification
export const preQualifySchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(ghanaPhoneRegex, 'Invalid phone number'),
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters').max(200),
  userRole: z.enum(['Owner/Director', 'Hospital Administrator', 'IT Manager', 'Medical Director', 'Other']),
  userRoleOther: z.string().optional().or(z.literal('')),
});

// Step 2 - Hospital Details
export const hospitalDetailsSchema = z.object({
  registrationId: z.string().uuid(),
  officialHospitalName: z.string().min(3).max(200),
  hospitalType: z.enum([
    'general_hospital', 'maternity_home', 'polyclinic', 'diagnostic_center',
    'specialist_hospital', 'dental_clinic', 'eye_clinic', 'other'
  ]),
  numberOfBeds: z.string(),
  hospitalLicenseNumber: z.string().min(3, 'License number is required'),
  ghsRegistrationNumber: z.string().optional().or(z.literal('')),
  hospitalPhone: z.string().regex(ghanaPhoneRegex, 'Invalid phone number'),
  hospitalEmail: z.string().email('Invalid email address'),
  hospitalWebsite: z.string().optional().or(z.literal('')),
  streetAddress: z.string().min(5),
  ghanaPostGPS: z.string().optional().or(z.literal('')),
  region: z.string().min(1),
  city: z.string().min(1),
  landmark: z.string().optional().or(z.literal('')),
});

// Step 3 - Admin Account
export const adminAccountSchema = z.object({
  registrationId: z.string().uuid(),
  adminTitle: z.enum(['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Rev.']),
  adminFirstName: z.string().min(2).max(50),
  adminLastName: z.string().min(2).max(50),
  adminOtherNames: z.string().optional(),
  adminPosition: z.enum([
    'Hospital Administrator', 'Medical Director', 'Director/Owner',
    'IT Manager', 'Operations Manager', 'Other'
  ]),
  professionalLicenseNumber: z.string().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  enable2FA: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 4 - Plan Selection
export const planSelectionSchema = z.object({
  registrationId: z.string().uuid(),
  selectedPlan: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

// Step 5 - Setup Preferences
export const setupPreferencesSchema = z.object({
  registrationId: z.string().uuid(),
  primaryLanguage: z.enum(['english', 'twi', 'ga', 'ewe']).default('english'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  operatingHours: z.object({
    weekdays: z.object({
      start: z.string(),
      end: z.string(),
    }),
    weekends: z.object({
      enabled: z.boolean(),
      start: z.string().optional(),
      end: z.string().optional(),
    }),
  }).optional(),
  applyVAT: z.boolean().default(true),
  applyNHIL: z.boolean().default(true),
  applyGETFund: z.boolean().default(true),
  branchName: z.string().min(3),
  sameAsHospitalAddress: z.boolean().default(true),
  branchAddress: z.string().optional(),
  referralSource: z.string().optional(),
  specificNeeds: z.string().max(500).optional(),
  agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the Terms of Service' }) }),
  agreeToDataProcessing: z.literal(true, { errorMap: () => ({ message: 'You must consent to data processing' }) }),
});

// Verification
export const verifyCodeSchema = z.object({
  registrationId: z.string().uuid(),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^[0-9]{6}$/, 'Invalid code format'),
  method: z.enum(['phone', 'email']),
});

export const resendCodeSchema = z.object({
  registrationId: z.string().uuid(),
  method: z.enum(['phone', 'email']),
});

export const selectVerificationMethodSchema = z.object({
  registrationId: z.string().uuid(),
  method: z.enum(['phone', 'email']),
});

// Check availability
export const checkEmailSchema = z.object({
  email: z.string().email(),
});

export const checkPhoneSchema = z.object({
  phone: z.string().regex(/^(\+233|0)[2-5][0-9]{8}$/),
});

export type PreQualifyInput = z.infer<typeof preQualifySchema>;
export type HospitalDetailsInput = z.infer<typeof hospitalDetailsSchema>;
export type AdminAccountInput = z.infer<typeof adminAccountSchema>;
export type PlanSelectionInput = z.infer<typeof planSelectionSchema>;
export type SetupPreferencesInput = z.infer<typeof setupPreferencesSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type SelectVerificationMethodInput = z.infer<typeof selectVerificationMethodSchema>;
