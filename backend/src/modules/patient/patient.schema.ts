import { z } from 'zod';

// Ghana Card format: GHA-XXXXXXXXX-X
const ghanaCardRegex = /^GHA-[0-9]{9}-[0-9]$/i;

// Flexible Ghana phone format
const ghanaPhoneRegex = /^(\+233|233|0)?[0-9]{9,10}$/;

export const createPatientSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherNames: z.string().optional(),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().regex(ghanaPhoneRegex, 'Invalid phone number'),
  phoneSecondary: z.string().regex(ghanaPhoneRegex, 'Invalid phone number').optional().nullable().or(z.literal('')),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  ghanaPostGPS: z.string().optional().nullable(),
  city: z.string().optional(),
  region: z.string().optional(),
  ghanaCardNumber: z.string().regex(ghanaCardRegex, 'Ghana Card must be in format GHA-XXXXXXXXX-X').optional().nullable().or(z.literal('')),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable().or(z.literal('')),
  occupation: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional().nullable().or(z.literal('')),
  religion: z.string().optional(),
  preferredLanguage: z.enum(['English', 'Twi', 'Ga', 'Ewe', 'Other']).optional().default('English'),
  nationality: z.string().optional().default('Ghanaian'),
  registrationSource: z.enum(['walk-in', 'online', 'emergency', 'referral']).optional().default('walk-in'),
  
  // Emergency contact
  emergencyContact: z.object({
    name: z.string().min(2),
    relationship: z.string().min(2),
    phone: z.string().regex(ghanaPhoneRegex),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }).optional(),

  // NHIS info
  nhisInfo: z.object({
    nhisNumber: z.string().min(1),
    scheme: z.string().optional(),
    expiryDate: z.string().optional(),
  }).optional(),

  // Allergies
  allergies: z.array(z.object({
    allergen: z.string().min(1),
    reaction: z.string().optional(),
    severity: z.enum(['Mild', 'Moderate', 'Severe', 'Life-threatening']).optional(),
  })).optional(),

  // Medical history
  medicalHistory: z.array(z.object({
    condition: z.string().min(1),
    diagnosedDate: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const searchPatientSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['mrn', 'phone', 'ghana_card', 'nhis', 'name']).optional(),
  ghanaCardNumber: z.string().optional(),
  phone: z.string().optional(),
  mrn: z.string().optional(),
  nhisNumber: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const checkDuplicateSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string(),
  phone: z.string(),
  ghanaCardNumber: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type SearchPatientInput = z.infer<typeof searchPatientSchema>;
export type CheckDuplicateInput = z.infer<typeof checkDuplicateSchema>;
