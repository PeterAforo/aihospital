import api from './api';

export interface OperatingTheatre {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  code?: string;
  theatreType?: string;
  floor?: string;
  equipment?: any;
  status: string;
  isActive: boolean;
  notes?: string;
}

export interface SurgeryType {
  id: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  estimatedDuration?: number;
  anesthesiaType?: string;
  nhisApproved: boolean;
  nhisPrice?: number;
  cashPrice?: number;
  isActive: boolean;
}

export interface Surgery {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  theatreId?: string;
  surgeryTypeId?: string;
  procedureName: string;
  procedureCode?: string;
  urgency: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  preOpDiagnosis?: string;
  postOpDiagnosis?: string;
  indication?: string;
  laterality?: string;
  anesthesiaType?: string;
  estimatedBloodLoss?: number;
  complications?: string;
  operativeNotes?: string;
  postOpNotes?: string;
  postOpInstructions?: string;
  consentObtained: boolean;
  outcome?: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth?: string; gender?: string; bloodGroup?: string };
  theatre?: { id: string; name: string; code?: string };
  surgeryType?: { id: string; name: string; category?: string };
  team?: SurgicalTeamMember[];
  checklistItems?: SurgicalChecklist[];
}

export interface SurgicalTeamMember {
  id: string;
  surgeryId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  user?: { id: string; firstName: string; lastName: string; role?: string };
}

export interface SurgicalChecklist {
  id: string;
  surgeryId: string;
  phase: string;
  item: string;
  isChecked: boolean;
  checkedBy?: string;
  checkedAt?: string;
}

export interface TheatreDashboardStats {
  todaySurgeries: number;
  inProgress: number;
  scheduled: number;
  requested: number;
  completedThisMonth: number;
  availableTheatres: number;
}

class TheatreApiService {
  // Theatres
  async getTheatres(filters?: Record<string, any>): Promise<OperatingTheatre[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    const res = await api.get(`/theatre/theatres?${params.toString()}`);
    return res.data.data;
  }

  async createTheatre(data: Partial<OperatingTheatre>): Promise<OperatingTheatre> {
    const res = await api.post('/theatre/theatres', data);
    return res.data.data;
  }

  async updateTheatre(id: string, data: Partial<OperatingTheatre>): Promise<OperatingTheatre> {
    const res = await api.put(`/theatre/theatres/${id}`, data);
    return res.data.data;
  }

  async updateTheatreStatus(id: string, status: string): Promise<OperatingTheatre> {
    const res = await api.patch(`/theatre/theatres/${id}/status`, { status });
    return res.data.data;
  }

  // Surgery Types
  async getSurgeryTypes(category?: string): Promise<SurgeryType[]> {
    const params = category ? `?category=${category}` : '';
    const res = await api.get(`/theatre/surgery-types${params}`);
    return res.data.data;
  }

  // Surgeries
  async getSurgeries(filters?: Record<string, any>): Promise<{ surgeries: Surgery[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/theatre/surgeries?${params.toString()}`);
    return res.data;
  }

  async getSurgeryById(id: string): Promise<Surgery> {
    const res = await api.get(`/theatre/surgeries/${id}`);
    return res.data.data;
  }

  async createSurgery(data: any): Promise<Surgery> {
    const res = await api.post('/theatre/surgeries', data);
    return res.data.data;
  }

  async updateSurgeryStatus(id: string, status: string, data?: any): Promise<Surgery> {
    const res = await api.patch(`/theatre/surgeries/${id}/status`, { status, ...data });
    return res.data.data;
  }

  // Team
  async addTeamMember(surgeryId: string, data: any): Promise<SurgicalTeamMember> {
    const res = await api.post(`/theatre/surgeries/${surgeryId}/team`, data);
    return res.data.data;
  }

  async removeTeamMember(memberId: string): Promise<void> {
    await api.delete(`/theatre/team/${memberId}`);
  }

  // Checklist
  async initializeChecklist(surgeryId: string): Promise<SurgicalChecklist[]> {
    const res = await api.post(`/theatre/surgeries/${surgeryId}/checklist/init`);
    return res.data.data;
  }

  async updateChecklistItem(itemId: string, isChecked: boolean): Promise<SurgicalChecklist> {
    const res = await api.patch(`/theatre/checklist/${itemId}`, { isChecked });
    return res.data.data;
  }

  // Schedule & Dashboard
  async getSchedule(date?: string, branchId?: string): Promise<Surgery[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const res = await api.get(`/theatre/schedule?${params.toString()}`);
    return res.data.data;
  }

  async getDashboardStats(branchId?: string): Promise<TheatreDashboardStats> {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/theatre/dashboard${params}`);
    return res.data.data;
  }
}

export const theatreApiService = new TheatreApiService();
