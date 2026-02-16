import api from './api';

export interface Pregnancy {
  id: string;
  tenantId: string;
  patientId: string;
  gravida: number;
  para: number;
  lmp?: string;
  edd?: string;
  gestationalAge?: number;
  bloodGroup?: string;
  rhFactor?: string;
  riskLevel: string;
  riskFactors: string[];
  status: string;
  registeredBy: string;
  registeredAt: string;
  outcome?: string;
  outcomeDate?: string;
  notes?: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth?: string; phonePrimary?: string };
  ancVisits?: ANCVisit[];
  deliveryRecord?: DeliveryRecord;
  postnatalVisits?: PostnatalVisit[];
}

export interface ANCVisit {
  id: string;
  pregnancyId: string;
  visitNumber: number;
  visitDate: string;
  gestationalAge?: number;
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  fundalHeight?: number;
  fetalHeartRate?: number;
  fetalPresentation?: string;
  fetalMovement?: string;
  edema?: string;
  proteinuria?: string;
  hemoglobin?: number;
  complaints?: string;
  findings?: string;
  plan?: string;
  nextVisitDate?: string;
  attendedBy: string;
  notes?: string;
}

export interface DeliveryRecord {
  id: string;
  pregnancyId: string;
  deliveryDate: string;
  deliveryTime?: string;
  gestationalAgeAtDelivery?: number;
  deliveryMode: string;
  placeOfDelivery?: string;
  durationOfLabourHours?: number;
  estimatedBloodLoss?: number;
  complications?: string;
  deliveredBy: string;
  notes?: string;
  newborns?: NewbornRecord[];
}

export interface NewbornRecord {
  id: string;
  gender: string;
  birthWeight?: number;
  birthLength?: number;
  headCircumference?: number;
  apgarScore1Min?: number;
  apgarScore5Min?: number;
  status: string;
  breastfeedingInitiated: boolean;
  notes?: string;
}

export interface PostnatalVisit {
  id: string;
  pregnancyId: string;
  visitNumber: number;
  visitDate: string;
  daysPostpartum?: number;
  motherCondition?: string;
  breastfeeding?: string;
  emotionalState?: string;
  babyWeight?: number;
  babyCondition?: string;
  attendedBy: string;
  notes?: string;
}

export interface MaternityDashboardStats {
  activePregnancies: number;
  highRisk: number;
  dueSoon: number;
  deliveriesThisMonth: number;
  ancVisitsToday: number;
}

class MaternityApiService {
  async getPregnancies(filters?: Record<string, any>): Promise<{ pregnancies: Pregnancy[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/maternity/pregnancies?${params.toString()}`);
    return res.data;
  }

  async getPregnancyById(id: string): Promise<Pregnancy> {
    const res = await api.get(`/maternity/pregnancies/${id}`);
    return res.data.data;
  }

  async createPregnancy(data: any): Promise<Pregnancy> {
    const res = await api.post('/maternity/pregnancies', data);
    return res.data.data;
  }

  async updatePregnancy(id: string, data: any): Promise<Pregnancy> {
    const res = await api.put(`/maternity/pregnancies/${id}`, data);
    return res.data.data;
  }

  async createANCVisit(pregnancyId: string, data: any): Promise<ANCVisit> {
    const res = await api.post(`/maternity/pregnancies/${pregnancyId}/anc`, data);
    return res.data.data;
  }

  async createDeliveryRecord(pregnancyId: string, data: any): Promise<DeliveryRecord> {
    const res = await api.post(`/maternity/pregnancies/${pregnancyId}/delivery`, data);
    return res.data.data;
  }

  async createNewbornRecord(deliveryId: string, data: any): Promise<NewbornRecord> {
    const res = await api.post(`/maternity/deliveries/${deliveryId}/newborn`, data);
    return res.data.data;
  }

  async createPostnatalVisit(pregnancyId: string, data: any): Promise<PostnatalVisit> {
    const res = await api.post(`/maternity/pregnancies/${pregnancyId}/postnatal`, data);
    return res.data.data;
  }

  async getDashboardStats(): Promise<MaternityDashboardStats> {
    const res = await api.get('/maternity/dashboard');
    return res.data.data;
  }
}

export const maternityApiService = new MaternityApiService();
