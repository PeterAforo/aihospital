import api from './api';

// ==================== TYPES ====================

export interface VitalSigns {
  bpSystolic?: number;
  bpDiastolic?: number;
  temperature?: number;
  temperatureSite?: 'ORAL' | 'AXILLARY' | 'TYMPANIC' | 'RECTAL';
  pulseRate?: number;
  pulseRhythm?: 'REGULAR' | 'IRREGULAR';
  respiratoryRate?: number;
  respiratoryPattern?: 'REGULAR' | 'IRREGULAR' | 'LABORED';
  spo2?: number;
  weight?: number;
  height?: number;
  painScale?: number;
  painLocation?: string;
  painCharacter?: 'SHARP' | 'DULL' | 'BURNING' | 'THROBBING' | 'CRAMPING' | 'ACHING' | 'STABBING';
}

export interface Assessment {
  chiefComplaint: string;
  symptomDuration?: string;
  symptomSeverity?: 'mild' | 'moderate' | 'severe';
  associatedSymptoms?: string[];
  clinicalNotes?: string;
}

export interface CreateTriageData {
  appointmentId: string;
  patientId: string;
  vitalSigns: VitalSigns;
  assessment: Assessment;
  triageLevel: number;
  overrideReason?: string;
}

export interface UpdateTriageData {
  vitalSigns?: VitalSigns;
  assessment?: Partial<Assessment>;
  triageLevel?: number;
  overrideReason?: string;
}

export interface TriageQueuePatient {
  appointmentId: string;
  queueNumber: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    photo?: string;
    age: number;
    gender: string;
    allergies: string[];
  };
  checkedInAt: string;
  waitTime: string;
  chiefComplaint?: string;
  isTriaged: boolean;
}

export interface TriageQueueResponse {
  queue: TriageQueuePatient[];
  totalWaiting: number;
  averageTriageTime: string;
}

export interface TriageSuggestion {
  suggestedLevel: number;
  levelName: string;
  levelColor: string;
  confidence: number;
  triggers: string[];
  recommendation: string;
}

export interface TriageRecord {
  id: string;
  tenantId: string;
  patientId: string;
  appointmentId: string;
  triagedBy: string;
  triageDate: string;
  triageTime: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  temperature?: number;
  temperatureSite?: string;
  pulseRate?: number;
  pulseRhythm?: string;
  respiratoryRate?: number;
  respiratoryPattern?: string;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  painScale?: number;
  painLocation?: string;
  painCharacter?: string;
  chiefComplaint: string;
  symptomDuration?: string;
  symptomSeverity?: string;
  associatedSymptoms: string[];
  clinicalNotes?: string;
  triageLevel: number;
  triageLevelName: string;
  triageLevelColor: string;
  suggestedTriageLevel?: number;
  overrideReason?: string;
  pulsePressure?: number;
  meanArterialPressure?: number;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  nurse?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface TriageAnalytics {
  totalTriaged: number;
  averageTriageTime: string;
  triageLevelDistribution: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
  };
  criticalAlertsGenerated: number;
  nursePerformance: Array<{
    nurseId: string;
    nurseName: string;
    patientsTriaged: number;
    averageTime: string;
  }>;
}

export interface VitalSignsTrend {
  bloodPressure: Array<{ date: string; systolic: number; diastolic: number }>;
  temperature: Array<{ date: string; value: number }>;
  weight: Array<{ date: string; value: number }>;
  pulseRate: Array<{ date: string; value: number }>;
  spo2: Array<{ date: string; value: number }>;
}

export interface PatientTriageHistory {
  triageRecords: TriageRecord[];
  vitalSignsTrend: VitalSignsTrend;
}

// ==================== TRIAGE LEVELS ====================

export const TRIAGE_LEVELS = [
  { level: 1, name: 'Red - Immediate', color: '#DC2626', targetTime: 'Immediate' },
  { level: 2, name: 'Orange - Very Urgent', color: '#EA580C', targetTime: '10 min' },
  { level: 3, name: 'Yellow - Urgent', color: '#EAB308', targetTime: '60 min' },
  { level: 4, name: 'Green - Standard', color: '#16A34A', targetTime: '2 hours' },
  { level: 5, name: 'Blue - Non-urgent', color: '#3B82F6', targetTime: '4 hours' },
];

export const COMMON_COMPLAINTS = {
  general: ['Fever', 'Weakness/Fatigue', 'Weight loss', 'Loss of appetite', 'Night sweats'],
  respiratory: ['Cough', 'Shortness of breath', 'Chest pain', 'Sore throat', 'Runny nose'],
  gastrointestinal: ['Abdominal pain', 'Nausea/Vomiting', 'Diarrhea', 'Constipation', 'Heartburn'],
  cardiovascular: ['Chest pain', 'Palpitations', 'Swelling of legs', 'Dizziness'],
  neurological: ['Headache', 'Dizziness', 'Numbness/Tingling', 'Confusion', 'Seizure'],
  musculoskeletal: ['Back pain', 'Joint pain', 'Muscle pain', 'Injury'],
  skin: ['Rash', 'Itching', 'Wound', 'Swelling'],
  other: ['Follow-up visit', 'Medication refill', 'Test results review', 'Routine checkup'],
};

// ==================== API FUNCTIONS ====================

/**
 * Get patients awaiting triage
 */
export async function getTriageQueue(date?: string): Promise<TriageQueueResponse> {
  const params = date ? { date } : {};
  const response = await api.get('/triage/queue', { params });
  return response.data.data;
}

/**
 * Create a new triage record
 */
export async function createTriage(data: CreateTriageData): Promise<{
  triageRecord: TriageRecord;
  suggestedTriageLevel: number;
  actualTriageLevel: number;
  queueUpdated: boolean;
  alertSent: boolean;
}> {
  const response = await api.post('/triage', data);
  return response.data.data;
}

/**
 * Get a triage record by ID
 */
export async function getTriageById(id: string): Promise<{ triage: TriageRecord }> {
  const response = await api.get(`/triage/${id}`);
  return response.data.data;
}

/**
 * Update a triage record
 */
export async function updateTriage(id: string, data: UpdateTriageData): Promise<{ triage: TriageRecord }> {
  const response = await api.put(`/triage/${id}`, data);
  return response.data.data;
}

/**
 * Get patient's triage history
 */
export async function getPatientTriageHistory(
  patientId: string,
  options?: { limit?: number; dateFrom?: string; dateTo?: string }
): Promise<PatientTriageHistory> {
  const response = await api.get(`/triage/patient/${patientId}/history`, { params: options });
  return response.data.data;
}

/**
 * Get AI-suggested triage level
 */
export async function suggestTriageLevel(
  vitalSigns: VitalSigns,
  chiefComplaint?: string,
  painScale?: number,
  patientAge?: number
): Promise<TriageSuggestion> {
  const response = await api.post('/triage/suggest-level', {
    vitalSigns,
    chiefComplaint,
    painScale,
    patientAge,
  });
  return response.data.data;
}

/**
 * Get triage analytics
 */
export async function getTriageAnalytics(
  dateFrom: string,
  dateTo: string,
  nurseId?: string
): Promise<TriageAnalytics> {
  const params: any = { dateFrom, dateTo };
  if (nurseId) params.nurseId = nurseId;
  const response = await api.get('/triage/analytics', { params });
  return response.data.data;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get triage level info by level number
 */
export function getTriageLevelInfo(level: number) {
  return TRIAGE_LEVELS.find((l) => l.level === level) || TRIAGE_LEVELS[3];
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese Class I';
  if (bmi < 40) return 'Obese Class II';
  return 'Obese Class III';
}

/**
 * Format wait time from minutes
 */
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get vital sign status (normal, warning, critical)
 */
export function getVitalSignStatus(
  type: 'bp' | 'temp' | 'pulse' | 'rr' | 'spo2',
  value: number,
  secondaryValue?: number
): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'bp':
      if (!secondaryValue) return 'normal';
      if (value < 90 || value > 180 || secondaryValue > 120) return 'critical';
      if (value > 140 || secondaryValue > 90) return 'warning';
      return 'normal';
    case 'temp':
      if (value < 35 || value > 40) return 'critical';
      if (value > 38 || value < 36) return 'warning';
      return 'normal';
    case 'pulse':
      if (value < 50 || value > 120) return 'critical';
      if (value < 60 || value > 100) return 'warning';
      return 'normal';
    case 'rr':
      if (value < 10 || value > 30) return 'critical';
      if (value < 12 || value > 20) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

export default {
  getTriageQueue,
  createTriage,
  getTriageById,
  updateTriage,
  getPatientTriageHistory,
  suggestTriageLevel,
  getTriageAnalytics,
  getTriageLevelInfo,
  calculateBMI,
  getBMICategory,
  formatWaitTime,
  getVitalSignStatus,
  TRIAGE_LEVELS,
  COMMON_COMPLAINTS,
};
