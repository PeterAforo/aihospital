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
}

export const emrService = new EMRService();
