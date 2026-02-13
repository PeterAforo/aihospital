export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Northern',
  'Volta',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Western North',
  'Oti',
  'North East',
  'Savannah',
] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed'] as const;

export const MOBILE_NETWORKS = {
  MTN: ['024', '054', '055', '059'],
  VODAFONE: ['020', '050'],
  AIRTELTIGO: ['027', '057', '026', '056'],
} as const;

export const GHANA_CARD_REGEX = /^GHA-[0-9]{9}-[0-9]$/;
export const GHANA_PHONE_REGEX = /^\+233[0-9]{9}$/;

export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export const NHIS_SCHEMES = [
  'Formal Sector',
  'Informal Sector',
  'SSNIT Contributor',
  'Indigent',
  'Under 18',
  'Over 70',
  'Pregnant Women',
] as const;

export const TAX_RATES = {
  VAT: 0.125,
  NHIL: 0.025,
  GETFUND: 0.025,
} as const;

export const SSNIT_RATES = {
  EMPLOYEE: 0.055,
  EMPLOYER: 0.13,
} as const;
