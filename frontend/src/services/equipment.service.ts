import api from './api';

export interface Equipment {
  id: string;
  tenantId: string;
  name: string;
  assetTag?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  department?: string;
  location?: string;
  status: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  currentValue?: number;
  supplier?: string;
  notes?: string;
  maintenanceLogs?: MaintenanceLog[];
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  type: string;
  description: string;
  scheduledDate?: string;
  completedDate?: string;
  performedBy?: string;
  vendor?: string;
  cost?: number;
  status: string;
  nextDueDate?: string;
  findings?: string;
}

export interface EquipmentDashboardStats {
  total: number;
  operational: number;
  underMaintenance: number;
  outOfService: number;
  maintenanceDue: number;
  warrantyExpiring: number;
}

class EquipmentApiService {
  async getEquipment(filters?: Record<string, any>): Promise<{ equipment: Equipment[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/equipment?${params.toString()}`);
    return res.data;
  }

  async getEquipmentById(id: string): Promise<Equipment> {
    const res = await api.get(`/equipment/${id}`);
    return res.data.data;
  }

  async createEquipment(data: any): Promise<Equipment> {
    const res = await api.post('/equipment', data);
    return res.data.data;
  }

  async updateEquipment(id: string, data: any): Promise<Equipment> {
    const res = await api.put(`/equipment/${id}`, data);
    return res.data.data;
  }

  async createMaintenanceLog(equipmentId: string, data: any): Promise<MaintenanceLog> {
    const res = await api.post(`/equipment/${equipmentId}/maintenance`, data);
    return res.data.data;
  }

  async getDashboardStats(): Promise<EquipmentDashboardStats> {
    const res = await api.get('/equipment/dashboard');
    return res.data.data;
  }
}

export const equipmentApiService = new EquipmentApiService();
