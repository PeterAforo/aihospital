import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Step1Data {
  fullName: string;
  email: string;
  phone: string;
  hospitalName: string;
  userRole: string;
  userRoleOther?: string;
}

interface Step2Data {
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

interface Step3Data {
  adminTitle: string;
  adminFirstName: string;
  adminLastName: string;
  adminOtherNames?: string;
  adminPosition: string;
  professionalLicenseNumber?: string;
  password: string;
  enable2FA: boolean;
}

interface Step4Data {
  selectedPlan: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
}

interface Step5Data {
  primaryLanguage: string;
  dateFormat: string;
  operatingHours?: {
    weekdays: { start: string; end: string };
    weekends: { enabled: boolean; start?: string; end?: string };
  };
  applyVAT: boolean;
  applyNHIL: boolean;
  applyGETFund: boolean;
  branchName: string;
  sameAsHospitalAddress: boolean;
  branchAddress?: string;
  referralSource?: string;
  specificNeeds?: string;
  agreeToTerms: boolean;
  agreeToDataProcessing: boolean;
}

interface RegistrationState {
  registrationId: string | null;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  step1: Partial<Step1Data>;
  step2: Partial<Step2Data>;
  step3: Partial<Step3Data>;
  step4: Partial<Step4Data>;
  step5: Partial<Step5Data>;
  verificationPhone: string | null;
}

const initialState: RegistrationState = {
  registrationId: null,
  currentStep: 1,
  isLoading: false,
  error: null,
  step1: {},
  step2: {},
  step3: {},
  step4: { selectedPlan: 'professional', billingCycle: 'monthly' },
  step5: {
    primaryLanguage: 'english',
    dateFormat: 'DD/MM/YYYY',
    applyVAT: true,
    applyNHIL: true,
    applyGETFund: true,
    sameAsHospitalAddress: true,
    agreeToTerms: false,
    agreeToDataProcessing: false,
  },
  verificationPhone: null,
};

const registrationSlice = createSlice({
  name: 'registration',
  initialState,
  reducers: {
    setRegistrationId: (state, action: PayloadAction<string>) => {
      state.registrationId = action.payload;
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateStep1: (state, action: PayloadAction<Partial<Step1Data>>) => {
      state.step1 = { ...state.step1, ...action.payload };
    },
    updateStep2: (state, action: PayloadAction<Partial<Step2Data>>) => {
      state.step2 = { ...state.step2, ...action.payload };
    },
    updateStep3: (state, action: PayloadAction<Partial<Step3Data>>) => {
      state.step3 = { ...state.step3, ...action.payload };
    },
    updateStep4: (state, action: PayloadAction<Partial<Step4Data>>) => {
      state.step4 = { ...state.step4, ...action.payload };
    },
    updateStep5: (state, action: PayloadAction<Partial<Step5Data>>) => {
      state.step5 = { ...state.step5, ...action.payload };
    },
    setVerificationPhone: (state, action: PayloadAction<string>) => {
      state.verificationPhone = action.payload;
    },
    nextStep: (state) => {
      if (state.currentStep < 7) {
        state.currentStep += 1;
      }
    },
    prevStep: (state) => {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
      }
    },
    resetRegistration: () => initialState,
    loadFromStorage: (state, action: PayloadAction<Partial<RegistrationState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setRegistrationId,
  setCurrentStep,
  setLoading,
  setError,
  updateStep1,
  updateStep2,
  updateStep3,
  updateStep4,
  updateStep5,
  setVerificationPhone,
  nextStep,
  prevStep,
  resetRegistration,
  loadFromStorage,
} = registrationSlice.actions;

export default registrationSlice.reducer;
