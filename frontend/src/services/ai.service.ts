import api from './api';

export const aiService = {
  // Health check
  getHealth: () => api.get('/ai/health'),

  // Duplicate patient detection
  checkDuplicates: (data: {
    tenantId: string; firstName: string; lastName: string;
    dateOfBirth?: string; phone?: string; ghanaCardNumber?: string;
  }) => api.post('/ai/duplicate-check', data),

  // Drug interaction checker
  checkDrugInteractions: (drugs: string[], allergies?: string[]) =>
    api.post('/ai/drug-interactions', { drugs, allergies }),

  // Triage scoring
  calculateTriageScore: (vitals: {
    temperature?: number; systolicBP?: number; diastolicBP?: number;
    heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number;
    consciousnessLevel?: string; symptoms?: string;
  }) => api.post('/ai/triage-score', vitals),

  // ICD-10 search
  searchICD10: (query: string, limit?: number) =>
    api.get('/ai/icd10/search', { params: { q: query, limit } }),

  // AI Chatbot
  chat: (messages: { role: string; content: string }[], userMessage: string) =>
    api.post('/ai/chat', { messages, userMessage }),

  // Clinical decision support
  getClinicalDecision: (data: {
    symptoms: string; vitals?: any; patientAge?: number; patientGender?: string;
    medicalHistory?: string; currentMedications?: string[];
  }) => api.post('/ai/clinical-decision', data),

  // Lab result interpretation
  interpretLabResult: (data: {
    testName: string; value: number; unit: string; referenceRange?: string;
    patientAge?: number; patientGender?: string;
  }) => api.post('/ai/lab-interpret', data),
};
