/**
 * Patient Module Validation Utilities
 * Ghana-specific validators for patient data
 */

// Ghana Card Validator
// Format: GHA-XXXXXXXXX-X (where X is alphanumeric)
export function validateGhanaCard(ghanaCard: string): { valid: boolean; error?: string } {
  if (!ghanaCard) {
    return { valid: true }; // Optional field
  }

  const trimmed = ghanaCard.trim().toUpperCase();
  
  // Format: GHA-XXXXXXXXX-X
  const ghanaCardRegex = /^GHA-[0-9]{9}-[0-9]$/;
  
  if (!ghanaCardRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid Ghana Card format. Expected: GHA-XXXXXXXXX-X' };
  }

  return { valid: true };
}

// NHIS Number Validator
export function validateNHISNumber(nhisNumber: string): { valid: boolean; error?: string } {
  if (!nhisNumber) {
    return { valid: true }; // Optional field
  }

  const trimmed = nhisNumber.trim();
  
  // NHIS numbers are typically alphanumeric, 10-15 characters
  if (trimmed.length < 5 || trimmed.length > 20) {
    return { valid: false, error: 'NHIS number should be 5-20 characters' };
  }

  return { valid: true };
}

// Ghana Phone Number Validator
export function validateGhanaPhone(phone: string): { valid: boolean; error?: string; formatted?: string } {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check various formats
  let normalized: string;
  
  if (cleaned.startsWith('+233')) {
    normalized = cleaned;
  } else if (cleaned.startsWith('233')) {
    normalized = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    normalized = '+233' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    normalized = '+233' + cleaned;
  } else {
    return { valid: false, error: 'Invalid phone number format' };
  }

  // Should be +233 followed by 9 digits
  if (!/^\+233[0-9]{9}$/.test(normalized)) {
    return { valid: false, error: 'Phone number must be 9 digits after country code' };
  }

  return { valid: true, formatted: normalized };
}

// Format Ghana Phone for display
export function formatGhanaPhone(phone: string): string {
  const result = validateGhanaPhone(phone);
  if (!result.valid || !result.formatted) {
    return phone;
  }
  
  // Format as +233 XX XXX XXXX
  const num = result.formatted;
  return `${num.slice(0, 4)} ${num.slice(4, 6)} ${num.slice(6, 9)} ${num.slice(9)}`;
}

// Normalize Ghana Phone (for storage)
export function normalizeGhanaPhone(phone: string): string {
  const result = validateGhanaPhone(phone);
  return result.formatted || phone;
}

// Detect Mobile Network
export function detectNetwork(phone: string): 'MTN' | 'Vodafone' | 'AirtelTigo' | 'Glo' | 'Unknown' {
  const result = validateGhanaPhone(phone);
  if (!result.valid || !result.formatted) {
    return 'Unknown';
  }

  // Get the network prefix (first 2 digits after +233)
  const prefix = result.formatted.substring(4, 6);

  // MTN prefixes
  const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];
  if (mtnPrefixes.includes(prefix)) {
    return 'MTN';
  }

  // Vodafone prefixes
  const vodafonePrefixes = ['20', '50'];
  if (vodafonePrefixes.includes(prefix)) {
    return 'Vodafone';
  }

  // AirtelTigo prefixes
  const airtelTigoPrefixes = ['26', '27', '56', '57'];
  if (airtelTigoPrefixes.includes(prefix)) {
    return 'AirtelTigo';
  }

  // Glo prefixes
  const gloPrefixes = ['23'];
  if (gloPrefixes.includes(prefix)) {
    return 'Glo';
  }

  return 'Unknown';
}

// MRN Generator
// Format: {HOSPITAL_CODE}-{YEAR}-{SEQUENCE}
export function generateMRN(hospitalCode: string, year: number, sequence: number): string {
  const code = hospitalCode.toUpperCase().substring(0, 3).padEnd(3, 'X');
  const yearStr = year.toString();
  const seqStr = sequence.toString().padStart(5, '0');
  
  return `${code}-${yearStr}-${seqStr}`;
}

// Validate MRN format
export function validateMRN(mrn: string): { valid: boolean; error?: string } {
  if (!mrn) {
    return { valid: false, error: 'MRN is required' };
  }

  const mrnRegex = /^[A-Z]{3}-[0-9]{4}-[0-9]{5}$/;
  
  if (!mrnRegex.test(mrn.toUpperCase())) {
    return { valid: false, error: 'Invalid MRN format. Expected: XXX-YYYY-NNNNN' };
  }

  return { valid: true };
}

// Parse MRN components
export function parseMRN(mrn: string): { hospitalCode: string; year: number; sequence: number } | null {
  const result = validateMRN(mrn);
  if (!result.valid) {
    return null;
  }

  const parts = mrn.toUpperCase().split('-');
  return {
    hospitalCode: parts[0],
    year: parseInt(parts[1], 10),
    sequence: parseInt(parts[2], 10),
  };
}

// Age Calculator
export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Calculate age at a specific date
export function calculateAgeAtDate(dob: Date | string, referenceDate: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const refDate = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  
  let age = refDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = refDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Name Similarity (Levenshtein Distance based)
export function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const len1 = s1.length;
  const len2 = s2.length;

  // Create distance matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(similarity);
}

// Soundex for phonetic matching
export function soundex(name: string): string {
  const s = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  const codes: { [key: string]: string } = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let result = s[0];
  let prevCode = codes[s[0]] || '';

  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || '';
    if (code && code !== prevCode) {
      result += code;
    }
    prevCode = code || prevCode;
  }

  return result.padEnd(4, '0');
}

// Compare names using Soundex
export function soundexMatch(name1: string, name2: string): boolean {
  return soundex(name1) === soundex(name2);
}

// Detect search type from input
export function detectSearchType(query: string): 'mrn' | 'phone' | 'ghana_card' | 'nhis' | 'name' {
  const trimmed = query.trim();

  // MRN format: XXX-YYYY-NNNNN
  if (/^[A-Za-z]{3}-[0-9]{4}-[0-9]{5}$/.test(trimmed)) {
    return 'mrn';
  }

  // Ghana Card format: GHA-XXXXXXXXX-X
  if (/^GHA-[0-9]{9}-[0-9]$/i.test(trimmed)) {
    return 'ghana_card';
  }

  // Phone number (starts with +233, 233, or 0, followed by digits)
  if (/^(\+233|233|0)[0-9]{9}$/.test(trimmed.replace(/[\s\-]/g, ''))) {
    return 'phone';
  }

  // NHIS (alphanumeric, typically starts with letters)
  if (/^[A-Z]{2,4}[0-9]+$/i.test(trimmed)) {
    return 'nhis';
  }

  // Default to name search
  return 'name';
}

// Ghana regions list
export const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const;

export type GhanaRegion = typeof GHANA_REGIONS[number];

// Blood groups
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

// Gender options
export const GENDERS = ['Male', 'Female', 'Other'] as const;
export type Gender = typeof GENDERS[number];

// Marital status options
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const;
export type MaritalStatus = typeof MARITAL_STATUSES[number];

// Title options
export const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Rev.', 'Chief'] as const;
export type Title = typeof TITLES[number];

// Registration sources
export const REGISTRATION_SOURCES = ['walk-in', 'online', 'emergency', 'referral'] as const;
export type RegistrationSource = typeof REGISTRATION_SOURCES[number];
