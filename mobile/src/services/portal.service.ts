import api from './api';

export interface DashboardStats {
  upcomingAppointments: number;
  pendingInvoices: number;
  recentLabResults: number;
  recentPrescriptions: number;
}

export interface PortalAppointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  chiefComplaint?: string;
  doctor?: { firstName: string; lastName: string };
  branch?: { name: string; address?: string };
}

export interface PortalLabOrder {
  id: string;
  orderDate: string;
  status: string;
  items: Array<{
    id: string;
    status: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    normalRange?: string;
    isAbnormal: boolean;
    isCritical: boolean;
    test: { name: string; code: string };
  }>;
}

export interface PortalPrescription {
  id: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    drug: { genericName: string; brandName?: string };
  }>;
  encounter?: { doctor?: { firstName: string; lastName: string } };
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  createdAt: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

export interface PortalVital {
  id: string;
  recordedAt: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

class PortalService {
  async login(tenantId: string, identifier: string, password: string) {
    const res = await api.post('/portal/auth/login', { tenantId, identifier, password });
    return res.data.data;
  }

  async register(tenantId: string, mrn: string, phone: string, password: string) {
    const res = await api.post('/portal/auth/register', { tenantId, mrn, phone, password });
    return res.data.data;
  }

  async getDashboard(): Promise<DashboardStats> {
    const res = await api.get('/portal/dashboard');
    return res.data.data;
  }

  async getAppointments(): Promise<PortalAppointment[]> {
    const res = await api.get('/portal/appointments');
    return res.data.data;
  }

  async getUpcomingAppointments(): Promise<PortalAppointment[]> {
    const res = await api.get('/portal/appointments/upcoming');
    return res.data.data;
  }

  async getLabResults(): Promise<PortalLabOrder[]> {
    const res = await api.get('/portal/lab-results');
    return res.data.data;
  }

  async getPrescriptions(): Promise<PortalPrescription[]> {
    const res = await api.get('/portal/prescriptions');
    return res.data.data;
  }

  async getInvoices(): Promise<PortalInvoice[]> {
    const res = await api.get('/portal/invoices');
    return res.data.data;
  }

  async getProfile() {
    const res = await api.get('/portal/profile');
    return res.data.data;
  }

  async getVitals(): Promise<PortalVital[]> {
    const res = await api.get('/portal/vitals');
    return res.data.data;
  }

  async getNotifications(): Promise<PortalNotification[]> {
    const res = await api.get('/portal/notifications');
    return res.data.data;
  }

  async markNotificationRead(id: string): Promise<void> {
    await api.patch(`/portal/notifications/${id}/read`);
  }

  async initializePayment(invoiceId: string): Promise<{ authorization_url: string; reference: string }> {
    const res = await api.post('/portal/payments/initialize', { invoiceId });
    return res.data.data;
  }
}

export const portalService = new PortalService();
