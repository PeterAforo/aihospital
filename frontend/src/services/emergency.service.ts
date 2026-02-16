import api from './api';

export interface ERVisit {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId?: string;
  arrivalMode?: string;
  arrivalTime: string;
  chiefComplaint: string;
  triageCategory?: string;
  triageTime?: string;
  triagedBy?: string;
  status: string;
  assignedDoctor?: string;
  assignedNurse?: string;
  bedLocation?: string;
  acuityScore?: number;
  painScore?: number;
  temperature?: number;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  glasgowComaScale?: number;
  primaryDiagnosis?: string;
  treatmentNotes?: string;
  disposition?: string;
  dispositionTime?: string;
  isTrauma: boolean;
  traumaMechanism?: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth?: string; gender?: string; bloodGroup?: string };
  erNotes?: ERNote[];
}

export interface ERNote {
  id: string;
  erVisitId: string;
  authorId: string;
  noteType: string;
  content: string;
  createdAt: string;
}

export interface ERDashboardStats {
  activePatients: number;
  awaitingTriage: number;
  awaitingDoctor: number;
  inTreatment: number;
  todayTotal: number;
  todayAdmitted: number;
  todayDischarged: number;
}

class EmergencyApiService {
  async getERVisits(filters?: Record<string, any>): Promise<{ visits: ERVisit[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/emergency/visits?${params.toString()}`);
    return res.data;
  }

  async getActiveBoard(): Promise<ERVisit[]> {
    const res = await api.get('/emergency/board');
    return res.data.data;
  }

  async getERVisitById(id: string): Promise<ERVisit> {
    const res = await api.get(`/emergency/visits/${id}`);
    return res.data.data;
  }

  async createERVisit(data: any): Promise<ERVisit> {
    const res = await api.post('/emergency/visits', data);
    return res.data.data;
  }

  async triageERVisit(id: string, data: any): Promise<ERVisit> {
    const res = await api.patch(`/emergency/visits/${id}/triage`, data);
    return res.data.data;
  }

  async updateERVisitStatus(id: string, status: string, data?: any): Promise<ERVisit> {
    const res = await api.patch(`/emergency/visits/${id}/status`, { status, ...data });
    return res.data.data;
  }

  async addERNote(visitId: string, data: any): Promise<ERNote> {
    const res = await api.post(`/emergency/visits/${visitId}/notes`, data);
    return res.data.data;
  }

  async getDashboardStats(): Promise<ERDashboardStats> {
    const res = await api.get('/emergency/dashboard');
    return res.data.data;
  }
}

export const emergencyApiService = new EmergencyApiService();
