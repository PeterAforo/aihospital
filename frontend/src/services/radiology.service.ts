import api from './api';

export interface RadiologyStudyType {
  id: string;
  name: string;
  code?: string;
  modality: string;
  bodyRegion?: string;
  description?: string;
  preparation?: string;
  duration?: number;
  nhisApproved: boolean;
  nhisPrice?: number;
  cashPrice?: number;
  isActive: boolean;
}

export interface RadiologyOrder {
  id: string;
  tenantId: string;
  branchId?: string;
  encounterId: string;
  patientId: string;
  orderedBy: string;
  studyTypeId?: string;
  studyType: string;
  bodyPart?: string;
  laterality?: string;
  urgency: string;
  clinicalIndication?: string;
  clinicalHistory?: string;
  status: string;
  orderedAt: string;
  scheduledAt?: string;
  scheduledRoom?: string;
  performedBy?: string;
  performedAt?: string;
  completedAt?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  reportedBy?: string;
  reportedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  contrastUsed: boolean;
  contrastType?: string;
  radiationDose?: number;
  patient?: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth?: string; gender?: string };
  studyRef?: { id: string; name: string; modality: string; code?: string };
  images?: RadiologyImage[];
  report?: RadiologyReport;
  encounter?: any;
}

export interface RadiologyImage {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  imageType?: string;
  dicomStudyUid?: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  uploadedAt: string;
  notes?: string;
}

export interface RadiologyReport {
  id: string;
  orderId: string;
  templateId?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  criticalFinding: boolean;
  status: string;
  reportedBy: string;
  reportedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  template?: { id: string; name: string };
}

export interface RadiologyReportTemplate {
  id: string;
  name: string;
  modality?: string;
  bodyRegion?: string;
  templateText: string;
  isActive: boolean;
}

export interface DashboardStats {
  pending: number;
  scheduled: number;
  inProgress: number;
  completedToday: number;
  statOrders: number;
  totalToday: number;
}

class RadiologyApiService {
  // Study Types
  async getStudyTypes(modality?: string): Promise<RadiologyStudyType[]> {
    const params = modality ? `?modality=${modality}` : '';
    const res = await api.get(`/radiology/study-types${params}`);
    return res.data.data;
  }

  async createStudyType(data: Partial<RadiologyStudyType>): Promise<RadiologyStudyType> {
    const res = await api.post('/radiology/study-types', data);
    return res.data.data;
  }

  async updateStudyType(id: string, data: Partial<RadiologyStudyType>): Promise<RadiologyStudyType> {
    const res = await api.put(`/radiology/study-types/${id}`, data);
    return res.data.data;
  }

  // Orders
  async getOrders(filters?: Record<string, any>): Promise<{ orders: RadiologyOrder[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    }
    const res = await api.get(`/radiology/orders?${params.toString()}`);
    return res.data;
  }

  async getOrderById(id: string): Promise<RadiologyOrder> {
    const res = await api.get(`/radiology/orders/${id}`);
    return res.data.data;
  }

  async createOrder(data: any): Promise<RadiologyOrder> {
    const res = await api.post('/radiology/orders', data);
    return res.data.data;
  }

  async updateOrderStatus(id: string, status: string, data?: any): Promise<RadiologyOrder> {
    const res = await api.patch(`/radiology/orders/${id}/status`, { status, ...data });
    return res.data.data;
  }

  // Images
  async getOrderImages(orderId: string): Promise<RadiologyImage[]> {
    const res = await api.get(`/radiology/orders/${orderId}/images`);
    return res.data.data;
  }

  async addImage(orderId: string, data: any): Promise<RadiologyImage> {
    const res = await api.post(`/radiology/orders/${orderId}/images`, data);
    return res.data.data;
  }

  async deleteImage(imageId: string): Promise<void> {
    await api.delete(`/radiology/images/${imageId}`);
  }

  // Reports
  async getReport(orderId: string): Promise<RadiologyReport | null> {
    const res = await api.get(`/radiology/orders/${orderId}/report`);
    return res.data.data;
  }

  async createReport(orderId: string, data: any): Promise<RadiologyReport> {
    const res = await api.post(`/radiology/orders/${orderId}/report`, data);
    return res.data.data;
  }

  async updateReport(reportId: string, data: any): Promise<RadiologyReport> {
    const res = await api.put(`/radiology/reports/${reportId}`, data);
    return res.data.data;
  }

  // Templates
  async getReportTemplates(modality?: string): Promise<RadiologyReportTemplate[]> {
    const params = modality ? `?modality=${modality}` : '';
    const res = await api.get(`/radiology/templates${params}`);
    return res.data.data;
  }

  async createReportTemplate(data: Partial<RadiologyReportTemplate>): Promise<RadiologyReportTemplate> {
    const res = await api.post('/radiology/templates', data);
    return res.data.data;
  }

  // Worklist & Dashboard
  async getWorklist(branchId?: string): Promise<RadiologyOrder[]> {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/radiology/worklist${params}`);
    return res.data.data;
  }

  async getDashboardStats(branchId?: string): Promise<DashboardStats> {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/radiology/dashboard${params}`);
    return res.data.data;
  }
}

export const radiologyApiService = new RadiologyApiService();
