import api from './api';

export interface PatientProfile {
  id: string;
  mrn: string;
  title?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  address: string;
  city?: string;
  region?: string;
  bloodGroup?: string;
  photoUrl?: string;
  nhisInfo?: { nhisNumber: string; expiryDate?: string; membershipType?: string };
  allergies: Array<{ id: string; allergen: string; severity: string; reaction?: string }>;
  chronicConditions: Array<{ id: string; conditionName: string; diagnosedDate?: string }>;
  currentMedications: Array<{ id: string; medicationName: string; dosage?: string; frequency?: string }>;
}

export interface PortalAppointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  chiefComplaint?: string;
  doctor?: { firstName: string; lastName: string };
  branch?: { name: string; address?: string; phone?: string };
}

export interface PortalLabOrder {
  id: string;
  orderDate: string;
  status: string;
  priority: string;
  items: Array<{
    id: string;
    status: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    normalRange?: string;
    isAbnormal: boolean;
    isCritical: boolean;
    test: { name: string; code: string; category?: string };
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
    instructions?: string;
    drug: { genericName: string; brandName?: string; dosageForm?: string };
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
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; totalPrice: number }>;
  payments: Array<{ id: string; amount: number; method: string; paidAt: string }>;
  branch?: { name: string; address?: string; phone?: string };
}

export interface EncounterSummary {
  id: string;
  encounterDate: string;
  chiefComplaint?: string;
  clinicalImpression?: string;
  disposition?: string;
  status: string;
  doctor?: { firstName: string; lastName: string };
  branch?: { name: string };
  diagnoses: Array<{ icdCode: string; icdDescription: string; isPrimary: boolean }>;
}

export interface DashboardStats {
  upcomingAppointments: number;
  pendingInvoices: number;
  recentLabResults: number;
  recentPrescriptions: number;
}

class PortalService {
  async login(tenantId: string, identifier: string, password: string) {
    const res = await api.post('/auth/login', { tenantId, identifier, password });
    return res.data.data;
  }

  async register(tenantId: string, mrn: string, phone: string, password: string) {
    const res = await api.post('/auth/register', { tenantId, mrn, phone, password });
    return res.data.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data.data;
  }

  async getProfile(): Promise<PatientProfile> {
    const res = await api.get('/profile');
    return res.data.data;
  }

  async updateProfile(data: Partial<PatientProfile>) {
    const res = await api.put('/profile', data);
    return res.data.data;
  }

  async getDashboard(): Promise<DashboardStats> {
    const res = await api.get('/dashboard');
    return res.data.data;
  }

  async getAppointments(status?: string): Promise<PortalAppointment[]> {
    const res = await api.get('/appointments', { params: { status } });
    return res.data.data;
  }

  async getUpcomingAppointments(): Promise<PortalAppointment[]> {
    const res = await api.get('/appointments/upcoming');
    return res.data.data;
  }

  async getLabResults(): Promise<PortalLabOrder[]> {
    const res = await api.get('/lab-results');
    return res.data.data;
  }

  async getPrescriptions(): Promise<PortalPrescription[]> {
    const res = await api.get('/prescriptions');
    return res.data.data;
  }

  async getInvoices(status?: string): Promise<PortalInvoice[]> {
    const res = await api.get('/invoices', { params: { status } });
    return res.data.data;
  }

  async getInvoiceDetail(invoiceId: string): Promise<PortalInvoice> {
    const res = await api.get(`/invoices/${invoiceId}`);
    return res.data.data;
  }

  async getEncounters(): Promise<EncounterSummary[]> {
    const res = await api.get('/encounters');
    return res.data.data;
  }

  async getVitals() {
    const res = await api.get('/vitals');
    return res.data.data;
  }
}

export const portalService = new PortalService();
