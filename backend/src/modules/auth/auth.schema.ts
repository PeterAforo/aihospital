import { z } from 'zod';

export const registerSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required').regex(/^(\+233|0)[0-9]{9}$/, 'Phone must be in format +233XXXXXXXXX or 0XXXXXXXXX'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  role: z.enum([
    'HOSPITAL_ADMIN',
    'DOCTOR',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNICIAN',
    'RECEPTIONIST',
    'BILLING_OFFICER',
    'HR_MANAGER',
    'ACCOUNTANT',
  ]).optional().default('RECEPTIONIST'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().uuid().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().uuid().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const verifyMfaSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
