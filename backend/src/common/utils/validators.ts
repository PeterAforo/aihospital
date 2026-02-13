// Ghana-specific validation utilities

export function validateGhanaPhoneNumber(phone: string): boolean {
  const pattern = /^(\+233|0)[2-5][0-9]{8}$/;
  return pattern.test(phone.replace(/\s/g, ''));
}

export function formatGhanaPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s/g, '').replace(/^0/, '+233');
  if (cleaned.startsWith('+233') && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

export function normalizeGhanaPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    return '+233' + cleaned.slice(1);
  }
  return cleaned;
}

export type MobileNetwork = 'MTN' | 'Vodafone' | 'AirtelTigo' | 'Unknown';

export function detectMobileNetwork(phone: string): MobileNetwork {
  const normalized = normalizeGhanaPhone(phone);
  const prefix = normalized.slice(4, 6);
  
  const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];
  const vodafonePrefixes = ['20', '50'];
  const airtelTigoPrefixes = ['26', '27', '56', '57'];
  
  if (mtnPrefixes.includes(prefix)) return 'MTN';
  if (vodafonePrefixes.includes(prefix)) return 'Vodafone';
  if (airtelTigoPrefixes.includes(prefix)) return 'AirtelTigo';
  return 'Unknown';
}

export function validateGhanaPostGPS(gps: string): boolean {
  const pattern = /^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$/;
  return pattern.test(gps.toUpperCase());
}

export interface PasswordStrengthResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  unmetRules: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const rules = [
    { test: /.{8,}/, message: 'At least 8 characters' },
    { test: /[A-Z]/, message: 'At least one uppercase letter' },
    { test: /[a-z]/, message: 'At least one lowercase letter' },
    { test: /[0-9]/, message: 'At least one number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/, message: 'At least one special character' },
  ];

  const unmetRules: string[] = [];
  let score = 0;

  for (const rule of rules) {
    if (rule.test.test(password)) {
      score++;
    } else {
      unmetRules.push(rule.message);
    }
  }

  // Bonus for length
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'medium';
  if (score >= 6) strength = 'strong';

  return {
    isValid: unmetRules.length === 0,
    strength,
    score,
    unmetRules,
  };
}

export function validateEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

export function generateVerificationCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function generateSubdomain(hospitalName: string): string {
  return hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
}
