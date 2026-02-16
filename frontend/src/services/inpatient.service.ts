import api from './api';

export interface Ward {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  code: string;
  wardType: string;
  floor?: string;
  building?: string;
  totalBeds: number;
  description?: string;
  nurseStation?: string;
  isActive: boolean;
  branch: { id: string; name: string };
  beds: BedItem[];
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

export interface BedItem {
  id: string;
  wardId: string;
  bedNumber: string;
  bedType: string;
  status: string;
  features: string[];
  dailyRate?: number;
  isActive: boolean;
  notes?: string;
  admissions?: { patient: { id: string; firstName: string; lastName: string; mrn: string } }[];
}

export interface AdmissionListItem {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionReason: string;
  admissionSource: string;
  status: string;
  priority: string;
  primaryDiagnosis?: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth: string; gender: string; phonePrimary: string };
  ward: { id: string; name: string; wardType: string };
  bed: { id: string; bedNumber: string };
  admittingDoctor: { id: string; firstName: string; lastName: string };
  attendingDoctor?: { id: string; firstName: string; lastName: string };
  _count: { nursingNotes: number; wardRounds: number; vitalCharts: number };
}

export interface AdmissionDetail extends AdmissionListItem {
  secondaryDiagnoses: string[];
  admissionNotes?: string;
  dietOrders?: string;
  activityLevel?: string;
  precautions: string[];
  dischargeDate?: string;
  dischargeType?: string;
  dischargeSummary?: string;
  dischargeNotes?: string;
  dischargeMedications?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  estimatedStay?: number;
  actualStay?: number;
  nursingNotes: any[];
  wardRounds: any[];
  vitalCharts: any[];
  medicationAdministrations: any[];
  carePlans: any[];
  bedTransfers: any[];
}

export interface OccupancySummary {
  totalBeds: number;
  occupied: number;
  available: number;
  maintenance: number;
  reserved: number;
  occupancyRate: number;
  byWardType: Record<string, { total: number; occupied: number }>;
}

export interface DashboardStats extends OccupancySummary {
  totalAdmitted: number;
  pendingDischarge: number;
  todayAdmissions: number;
  todayDischarges: number;
}

class InpatientService {
  // Dashboard
  async getDashboardStats(branchId?: string): Promise<DashboardStats> {
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/inpatient/dashboard${query}`);
    return res.data.data;
  }

  // Wards
  async listWards(branchId?: string): Promise<Ward[]> {
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/inpatient/wards${query}`);
    return res.data.data;
  }

  async createWard(data: { branchId: string; name: string; code: string; wardType?: string; floor?: string; building?: string; description?: string }): Promise<Ward> {
    const res = await api.post('/inpatient/wards', data);
    return res.data.data;
  }

  async updateWard(wardId: string, data: Partial<Ward>): Promise<Ward> {
    const res = await api.put(`/inpatient/wards/${wardId}`, data);
    return res.data.data;
  }

  // Beds
  async listBeds(wardId: string, status?: string): Promise<BedItem[]> {
    const query = status ? `?status=${status}` : '';
    const res = await api.get(`/inpatient/wards/${wardId}/beds${query}`);
    return res.data.data;
  }

  async createBed(wardId: string, data: { bedNumber: string; bedType?: string; dailyRate?: number }): Promise<BedItem> {
    const res = await api.post(`/inpatient/wards/${wardId}/beds`, data);
    return res.data.data;
  }

  async createBedsBulk(wardId: string, data: { prefix: string; startNumber: number; count: number; bedType?: string; dailyRate?: number }): Promise<{ created: number }> {
    const res = await api.post(`/inpatient/wards/${wardId}/beds/bulk`, data);
    return res.data.data;
  }

  async updateBedStatus(bedId: string, status: string): Promise<BedItem> {
    const res = await api.patch(`/inpatient/beds/${bedId}/status`, { status });
    return res.data.data;
  }

  async getOccupancy(branchId?: string): Promise<OccupancySummary> {
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/inpatient/occupancy${query}`);
    return res.data.data;
  }

  // Admissions
  async listAdmissions(params?: { branchId?: string; wardId?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<{ admissions: AdmissionListItem[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.wardId) query.set('wardId', params.wardId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const res = await api.get(`/inpatient/admissions?${query.toString()}`);
    return res.data.data;
  }

  async getAdmission(id: string): Promise<AdmissionDetail> {
    const res = await api.get(`/inpatient/admissions/${id}`);
    return res.data.data;
  }

  async admitPatient(data: {
    branchId: string; patientId: string; wardId: string; bedId: string;
    admissionReason: string; admissionSource?: string; priority?: string;
    primaryDiagnosis?: string; admissionNotes?: string; dietOrders?: string;
    estimatedStay?: number; attendingDoctorId?: string;
  }): Promise<any> {
    const res = await api.post('/inpatient/admissions', data);
    return res.data.data;
  }

  async dischargePatient(admissionId: string, data: {
    dischargeType?: string; dischargeSummary?: string; dischargeNotes?: string;
    dischargeMedications?: string; followUpDate?: string; followUpInstructions?: string;
  }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/discharge`, data);
    return res.data.data;
  }

  async transferBed(admissionId: string, data: { toBedId: string; reason: string }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/transfer`, data);
    return res.data.data;
  }

  // Nursing Notes
  async listNursingNotes(admissionId: string, page = 1): Promise<{ notes: any[]; total: number }> {
    const res = await api.get(`/inpatient/admissions/${admissionId}/nursing-notes?page=${page}`);
    return res.data.data;
  }

  async addNursingNote(admissionId: string, data: { content: string; noteType?: string; painLevel?: number; isHandover?: boolean; shift?: string }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/nursing-notes`, data);
    return res.data.data;
  }

  // Ward Rounds
  async addWardRound(admissionId: string, data: { findings: string; instructions?: string; planChanges?: string; dietChanges?: string; medicationChanges?: string }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/ward-rounds`, data);
    return res.data.data;
  }

  // Vitals
  async getVitals(admissionId: string, limit = 48): Promise<any[]> {
    const res = await api.get(`/inpatient/admissions/${admissionId}/vitals?limit=${limit}`);
    return res.data.data;
  }

  async recordVitals(admissionId: string, data: any): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/vitals`, data);
    return res.data.data;
  }

  // Medications
  async getMedications(admissionId: string): Promise<any[]> {
    const res = await api.get(`/inpatient/admissions/${admissionId}/medications`);
    return res.data.data;
  }

  async addMedication(admissionId: string, data: { medicationName: string; dosage: string; route: string; frequency: string; scheduledTime: string }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/medications`, data);
    return res.data.data;
  }

  async administerMedication(medId: string): Promise<any> {
    const res = await api.post(`/inpatient/medications/${medId}/administer`);
    return res.data.data;
  }

  // Care Plans
  async addCarePlan(admissionId: string, data: { problem: string; goal: string; interventions: string }): Promise<any> {
    const res = await api.post(`/inpatient/admissions/${admissionId}/care-plans`, data);
    return res.data.data;
  }

  async updateCarePlan(planId: string, data: { evaluation?: string; status?: string }): Promise<any> {
    const res = await api.patch(`/inpatient/care-plans/${planId}`, data);
    return res.data.data;
  }
}

export const inpatientService = new InpatientService();
