import api from './api';

export interface CreatePatientRequest {
  title?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  phoneSecondary?: string;
  email?: string;
  address: string;
  ghanaPostGPS?: string;
  city?: string;
  region?: string;
  ghanaCardNumber?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  occupation?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  religion?: string;
  preferredLanguage?: 'English' | 'Twi' | 'Ga' | 'Ewe' | 'Other';
  registrationSource?: 'walk-in' | 'online' | 'emergency' | 'referral';
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
  };
  nhisInfo?: {
    nhisNumber: string;
    scheme?: string;
    expiryDate?: string;
  };
  allergies?: Array<{
    allergen: string;
    reaction?: string;
    severity?: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';
  }>;
  medicalHistory?: Array<{
    condition: string;
    diagnosedDate?: string;
    status?: string;
    notes?: string;
  }>;
  portalAccessEnabled?: boolean;
  portalPassword?: string;
}

export interface SearchPatientsParams {
  q?: string;
  type?: 'mrn' | 'phone' | 'ghana_card' | 'nhis' | 'name';
  ghanaCardNumber?: string;
  phone?: string;
  mrn?: string;
  nhisNumber?: string;
  gender?: string;
  page?: number;
  limit?: number;
}

export interface CheckDuplicateRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  ghanaCardNumber?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateScore: number;
  potentialDuplicates: Array<{
    patientId: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
    ghanaCardNumber?: string;
    photoUrl?: string;
    score: number;
    matchingFactors: Array<{
      field: string;
      weight: number;
      matched: boolean;
      details?: string;
    }>;
  }>;
  verdict: 'definite' | 'high_probability' | 'possible' | 'unique';
  message: string;
}

export const patientService = {
  create: async (data: CreatePatientRequest) => {
    const response = await api.post('/patients', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreatePatientRequest>) => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },

  search: async (params: SearchPatientsParams) => {
    const response = await api.get('/patients/search', { params });
    return response.data;
  },

  getVisitHistory: async (id: string) => {
    const response = await api.get(`/patients/${id}/visits`);
    return response.data;
  },

  merge: async (primaryId: string, secondaryId: string) => {
    const response = await api.post(`/patients/${primaryId}/merge`, {
      secondaryPatientId: secondaryId,
    });
    return response.data;
  },

  checkDuplicate: async (data: CheckDuplicateRequest): Promise<DuplicateCheckResult> => {
    const response = await api.post('/patients/check-duplicate', data);
    return response.data.data;
  },

  uploadPhoto: async (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post(`/patients/${patientId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
