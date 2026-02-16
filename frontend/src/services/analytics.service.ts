import api from './api';

export interface ExecutiveSummary {
  totalPatients: number;
  newPatients: number;
  patientGrowth: number;
  totalAppointments: number;
  appointmentGrowth: number;
  totalEncounters: number;
  encounterGrowth: number;
  totalInvoices: number;
  revenue: number;
  revenueGrowth: number;
  outstandingAmount: number;
  activeAdmissions: number;
  period: { start: string; end: string };
}

export interface RevenueAnalytics {
  byPaymentMethod: { method: string; amount: number; count: number }[];
  byCategory: { category: string; amount: number }[];
  dailyTrend: { date: string; amount: number }[];
  nhisVsCash: { nhis: number; cash: number };
  period: { start: string; end: string };
}

export interface ClinicalAnalytics {
  topDiagnoses: { icdCode: string; description: string; count: number }[];
  encountersByType: { type: string; count: number }[];
  encountersByStatus: { status: string; count: number }[];
  doctorProductivity: { doctorId: string; name: string; encounters: number }[];
  genderDistribution: { gender: string; count: number }[];
  period: { start: string; end: string };
}

export interface PharmacyAnalytics {
  totalDispensed: number;
  pendingPrescriptions: number;
  lowStockCount: number;
  expiringCount: number;
  topMedications: { name: string; count: number; quantity: number }[];
  period: { start: string; end: string };
}

export interface LabAnalytics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  completionRate: number;
  topTests: { name: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  period: { start: string; end: string };
}

export interface AppointmentAnalytics {
  total: number;
  completed: number;
  noShowRate: number;
  cancellationRate: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  dailyVolume: { date: string; count: number }[];
  period: { start: string; end: string };
}

class AnalyticsApiService {
  private buildQuery(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params.toString() ? `?${params.toString()}` : '';
  }

  async getExecutiveSummary(startDate?: string, endDate?: string): Promise<ExecutiveSummary> {
    const res = await api.get(`/reports/analytics/executive${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }

  async getRevenueAnalytics(startDate?: string, endDate?: string): Promise<RevenueAnalytics> {
    const res = await api.get(`/reports/analytics/revenue${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }

  async getClinicalAnalytics(startDate?: string, endDate?: string): Promise<ClinicalAnalytics> {
    const res = await api.get(`/reports/analytics/clinical${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }

  async getPharmacyAnalytics(startDate?: string, endDate?: string): Promise<PharmacyAnalytics> {
    const res = await api.get(`/reports/analytics/pharmacy${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }

  async getLabAnalytics(startDate?: string, endDate?: string): Promise<LabAnalytics> {
    const res = await api.get(`/reports/analytics/lab${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }

  async getAppointmentAnalytics(startDate?: string, endDate?: string): Promise<AppointmentAnalytics> {
    const res = await api.get(`/reports/analytics/appointments${this.buildQuery(startDate, endDate)}`);
    return res.data.data;
  }
}

export const analyticsApiService = new AnalyticsApiService();
