import api from './api';

export interface ICD10Code {
  code: string;
  description: string;
  chapter: number | null;
  category: string | null;
  isCommonGhana: boolean;
  synonyms: string[];
  relevanceScore?: number;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  icd10Description: string;
  diagnosisType: 'PRIMARY' | 'SECONDARY';
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  onsetDate?: string;
  notes?: string;
  rank: number;
}

export interface Encounter {
  id: string;
  tenantId: string;
  branchId: string;
  departmentId?: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  encounterType: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'TELEMEDICINE' | 'FOLLOW_UP';
  encounterDate: string;
  encounterTime?: string;
  location?: string;
  templateUsed?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  reviewOfSystems?: Record<string, unknown>;
  pastMedicalHistory?: string;
  medicationsReviewed: boolean;
  allergiesReviewed: boolean;
  socialHistory?: string;
  familyHistory?: string;
  generalAppearance?: string;
  physicalExamination?: Record<string, unknown>;
  clinicalImpression?: string;
  differentialDiagnoses: string[];
  treatmentPlan?: string;
  patientEducation?: string;
  followUpPlan?: string;
  followUpDate?: string;
  disposition?: 'DISCHARGED' | 'ADMITTED' | 'TRANSFERRED' | 'AMA' | 'DECEASED' | 'FOLLOW_UP';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'CANCELLED';
  startedAt: string;
  completedAt?: string;
  signedAt?: string;
  signedBy?: string;
  encounterDurationMinutes?: number;
  isBillable: boolean;
  billingStatus?: string;
  diagnoses?: Diagnosis[];
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    dateOfBirth: string;
    gender: string;
    allergies?: Array<{ allergen: string; reaction?: string; severity?: string }>;
    currentMedications?: Array<{ medicationName: string; dosage?: string; frequency?: string }>;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization?: string;
  };
}

export interface PatientContext {
  allergies: Array<{ allergen: string; reaction?: string; severity?: string }>;
  currentMedications: Array<{ medicationName: string; dosage?: string; frequency?: string; isActive: boolean }>;
  chronicConditions: Array<{ conditionName: string; icd10Code?: string }>;
  problemList: Array<{ problemName: string; icd10Code?: string; status: string }>;
  recentVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    temperature?: number;
    pulseRate?: number;
    respiratoryRate?: number;
    spo2?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    chiefComplaint?: string;
  };
}

export interface CreateEncounterResponse {
  encounter: Encounter;
  patientContext: PatientContext;
  template?: Record<string, unknown>;
}

class EMRService {
  // ICD-10 Search
  async searchICD10(query: string, options?: { limit?: number; ghanaOnly?: boolean; chapter?: number }): Promise<ICD10Code[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.ghanaOnly) params.append('ghanaOnly', 'true');
    if (options?.chapter) params.append('chapter', String(options.chapter));
    
    const response = await api.get(`/emr/icd10/search?${params}`);
    return response.data.data;
  }

  async getGhanaCommonDiagnoses(): Promise<ICD10Code[]> {
    const response = await api.get('/emr/icd10/ghana-common');
    return response.data.data;
  }

  async getDoctorFavorites(): Promise<ICD10Code[]> {
    const response = await api.get('/emr/icd10/favorites');
    return response.data.data;
  }

  async getDoctorRecentlyUsed(): Promise<ICD10Code[]> {
    const response = await api.get('/emr/icd10/recent');
    return response.data.data;
  }

  async suggestDiagnoses(chiefComplaint: string): Promise<ICD10Code[]> {
    const response = await api.get(`/emr/icd10/suggest?complaint=${encodeURIComponent(chiefComplaint)}`);
    return response.data.data;
  }

  // Encounters
  async createEncounter(data: {
    patientId: string;
    appointmentId?: string;
    encounterType?: string;
    template?: string;
  }): Promise<CreateEncounterResponse> {
    const response = await api.post('/emr/encounters', data);
    return response.data.data;
  }

  async getEncounter(encounterId: string): Promise<{ encounter: Encounter; problemList: Array<{ problemName: string; icd10Code?: string; status: string }> }> {
    const response = await api.get(`/emr/encounters/${encounterId}`);
    return response.data.data;
  }

  async updateEncounter(encounterId: string, data: Partial<Encounter>): Promise<Encounter> {
    const response = await api.put(`/emr/encounters/${encounterId}`, data);
    return response.data.data;
  }

  async addDiagnosis(encounterId: string, data: {
    icd10Code: string;
    icd10Description: string;
    diagnosisType: 'PRIMARY' | 'SECONDARY';
    status?: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
    onsetDate?: string;
    notes?: string;
  }): Promise<Diagnosis> {
    const response = await api.post(`/emr/encounters/${encounterId}/diagnoses`, data);
    return response.data.data;
  }

  async removeDiagnosis(encounterId: string, diagnosisId: string): Promise<void> {
    await api.delete(`/emr/encounters/${encounterId}/diagnoses/${diagnosisId}`);
  }

  async completeEncounter(encounterId: string): Promise<Encounter> {
    const response = await api.post(`/emr/encounters/${encounterId}/complete`);
    return response.data.data;
  }

  async signEncounter(encounterId: string): Promise<Encounter> {
    const response = await api.post(`/emr/encounters/${encounterId}/sign`);
    return response.data.data;
  }

  async getPatientEncounters(patientId: string, options?: {
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ encounters: Encounter[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.status) params.append('status', options.status);
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options?.dateTo) params.append('dateTo', options.dateTo);
    
    const response = await api.get(`/emr/encounters/patient/${patientId}?${params}`);
    return response.data.data;
  }

  // ==================== LAB ORDERS ====================

  async searchLabTests(query: string, limit = 20): Promise<LabTest[]> {
    const response = await api.get(`/emr/lab-tests/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  }

  async createLabOrder(data: {
    encounterId: string;
    patientId: string;
    priority?: 'ROUTINE' | 'URGENT' | 'STAT';
    notes?: string;
    tests: { testId: string; notes?: string }[];
  }): Promise<LabOrder> {
    const response = await api.post('/emr/lab-orders', data);
    return response.data.data;
  }

  async getLabOrdersByEncounter(encounterId: string): Promise<LabOrder[]> {
    const response = await api.get(`/emr/encounters/${encounterId}/lab-orders`);
    return response.data.data;
  }

  async cancelLabOrder(orderId: string): Promise<void> {
    await api.post(`/emr/lab-orders/${orderId}/cancel`);
  }

  // ==================== PRESCRIPTIONS ====================

  async searchDrugs(query: string, limit = 20): Promise<Drug[]> {
    const response = await api.get(`/emr/drugs/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  }

  async getPrescriptionOptions(): Promise<{ frequencies: FrequencyOption[]; durations: DurationOption[] }> {
    const response = await api.get('/emr/prescription-options');
    return response.data.data;
  }

  async createPrescription(data: {
    encounterId: string;
    patientId: string;
    notes?: string;
    items: {
      drugId: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions?: string;
    }[];
  }): Promise<Prescription> {
    const response = await api.post('/emr/prescriptions', data);
    return response.data.data;
  }

  async getPrescriptionsByEncounter(encounterId: string): Promise<Prescription[]> {
    const response = await api.get(`/emr/encounters/${encounterId}/prescriptions`);
    return response.data.data;
  }

  async cancelPrescription(prescriptionId: string): Promise<void> {
    await api.post(`/emr/prescriptions/${prescriptionId}/cancel`);
  }

  async validatePrescription(patientId: string, drugIds: string[]): Promise<CDSValidationResult> {
    const response = await api.post('/emr/prescriptions/validate', { patientId, drugIds });
    return response.data.data;
  }
}

// Lab Order Types
export interface LabTest {
  id: string;
  name: string;
  code?: string;
  category?: string;
  sampleType?: string;
  normalRange?: string;
  unit?: string;
  nhisApproved: boolean;
  nhisPrice?: number;
  cashPrice?: number;
  turnaroundTime?: number;
}

export interface LabOrderItem {
  id: string;
  testId: string;
  status: string;
  result?: string;
  resultValue?: number;
  unit?: string;
  normalRange?: string;
  isAbnormal: boolean;
  isCritical: boolean;
  performedAt?: string;
  notes?: string;
  test: LabTest;
}

export interface LabOrder {
  id: string;
  encounterId?: string;
  patientId: string;
  orderedBy: string;
  orderDate: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: string;
  notes?: string;
  items: LabOrderItem[];
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
  };
}

// Prescription Types
export interface Drug {
  id: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  form?: string;
  category?: string;
  nhisApproved: boolean;
  nhisPrice?: number;
  cashPrice?: number;
}

export interface PrescriptionItem {
  id: string;
  drugId: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  dispensedQty: number;
  status: string;
  drug: Drug;
}

export interface Prescription {
  id: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  status: string;
  notes?: string;
  createdAt: string;
  items: PrescriptionItem[];
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface FrequencyOption {
  value: string;
  label: string;
}

export interface DurationOption {
  value: string;
  label: string;
}

export type CDSAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface CDSAlert {
  severity: CDSAlertSeverity;
  type: 'ALLERGY' | 'INTERACTION' | 'PEDIATRIC_DOSE' | 'DUPLICATE' | 'RENAL' | 'PREGNANCY';
  drugId: string;
  drugName: string;
  message: string;
  details: string;
  canOverride: boolean;
}

export interface CDSValidationResult {
  safe: boolean;
  alerts: CDSAlert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export const emrService = new EMRService();
