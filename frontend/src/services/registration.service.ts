import api from './api';

export interface PreQualifyRequest {
  fullName: string;
  email: string;
  phone: string;
  hospitalName: string;
  userRole: string;
  userRoleOther?: string;
}

export interface HospitalDetailsRequest {
  registrationId: string;
  officialHospitalName: string;
  hospitalType: string;
  numberOfBeds: string;
  hospitalLicenseNumber: string;
  ghsRegistrationNumber?: string;
  hospitalPhone: string;
  hospitalEmail: string;
  hospitalWebsite?: string;
  streetAddress: string;
  ghanaPostGPS?: string;
  region: string;
  city: string;
  landmark?: string;
}

export interface AdminAccountRequest {
  registrationId: string;
  adminTitle: string;
  adminFirstName: string;
  adminLastName: string;
  adminOtherNames?: string;
  adminPosition: string;
  professionalLicenseNumber?: string;
  password: string;
  confirmPassword: string;
  enable2FA: boolean;
}

export interface PlanSelectionRequest {
  registrationId: string;
  selectedPlan: 'starter' | 'professional' | 'enterprise';
  billingCycle?: 'monthly' | 'annual';
}

export interface SetupPreferencesRequest {
  registrationId: string;
  primaryLanguage: string;
  dateFormat: string;
  operatingHours?: any;
  applyVAT: boolean;
  applyNHIL: boolean;
  applyGETFund: boolean;
  branchName: string;
  sameAsHospitalAddress: boolean;
  branchAddress?: string;
  referralSource?: string;
  specificNeeds?: string;
  agreeToTerms: true;
  agreeToDataProcessing: true;
}

export interface VerifyCodeRequest {
  registrationId: string;
  code: string;
  method: 'phone' | 'email';
}

export interface SendCodeRequest {
  registrationId: string;
  method: 'phone' | 'email';
}

export const registrationService = {
  preQualify: async (data: PreQualifyRequest) => {
    const response = await api.post('/registration/pre-qualify', data);
    return response.data;
  },

  saveHospitalDetails: async (data: HospitalDetailsRequest) => {
    const response = await api.post('/registration/hospital-details', data);
    return response.data;
  },

  saveAdminAccount: async (data: AdminAccountRequest) => {
    const response = await api.post('/registration/admin-account', data);
    return response.data;
  },

  selectPlan: async (data: PlanSelectionRequest) => {
    const response = await api.post('/registration/select-plan', data);
    return response.data;
  },

  complete: async (data: SetupPreferencesRequest) => {
    const response = await api.post('/registration/complete', data);
    return response.data;
  },

  sendCode: async (data: SendCodeRequest) => {
    const response = await api.post('/registration/send-code', data);
    return response.data;
  },

  verifyCode: async (data: VerifyCodeRequest) => {
    const response = await api.post('/registration/verify-code', data);
    return response.data;
  },

  resendCode: async (registrationId: string, method: 'phone' | 'email') => {
    const response = await api.post('/registration/resend-code', { registrationId, method });
    return response.data;
  },

  checkEmail: async (email: string) => {
    const response = await api.post('/registration/check-email', { email });
    return response.data;
  },

  checkPhone: async (phone: string) => {
    const response = await api.post('/registration/check-phone', { phone });
    return response.data;
  },

  getProgress: async (registrationId: string) => {
    const response = await api.get(`/registration/progress/${registrationId}`);
    return response.data;
  },
};
