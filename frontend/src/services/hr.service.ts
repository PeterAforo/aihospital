import api from './api';

export interface StaffProfile {
  id: string;
  tenantId: string;
  userId: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  employmentType: string;
  dateOfJoining?: string;
  baseSalary?: number;
  allowances?: number;
  isActive: boolean;
  leaveRequests?: LeaveRequest[];
  payrollRecords?: PayrollRecord[];
}

export interface LeaveRequest {
  id: string;
  staffProfileId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  approvedBy?: string;
  staffProfile?: { id: string; employeeId?: string; department?: string; designation?: string };
}

export interface PayrollRecord {
  id: string;
  staffProfileId: string;
  period: string;
  baseSalary: number;
  allowances: number;
  grossPay: number;
  taxDeduction: number;
  ssnitDeduction: number;
  otherDeductions: number;
  netPay: number;
  status: string;
  staffProfile?: { id: string; employeeId?: string; department?: string; designation?: string };
}

export interface HRDashboardStats {
  totalStaff: number;
  onLeave: number;
  pendingLeave: number;
  departmentBreakdown: { department: string; count: number }[];
}

class HRApiService {
  async getStaffProfiles(filters?: Record<string, any>): Promise<{ profiles: StaffProfile[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/hr/staff?${params.toString()}`);
    return res.data;
  }

  async getStaffProfileById(id: string): Promise<StaffProfile> {
    const res = await api.get(`/hr/staff/${id}`);
    return res.data.data;
  }

  async createStaffProfile(data: any): Promise<StaffProfile> {
    const res = await api.post('/hr/staff', data);
    return res.data.data;
  }

  async getLeaveRequests(filters?: Record<string, any>): Promise<{ requests: LeaveRequest[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/hr/leave?${params.toString()}`);
    return res.data;
  }

  async updateLeaveStatus(id: string, status: string, data?: any): Promise<LeaveRequest> {
    const res = await api.patch(`/hr/leave/${id}/status`, { status, ...data });
    return res.data.data;
  }

  async getPayrollRecords(filters?: Record<string, any>): Promise<{ records: PayrollRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/hr/payroll?${params.toString()}`);
    return res.data;
  }

  async generatePayroll(period: string): Promise<{ generated: number; period: string }> {
    const res = await api.post('/hr/payroll/generate', { period });
    return res.data.data;
  }

  async getDashboardStats(): Promise<HRDashboardStats> {
    const res = await api.get('/hr/dashboard');
    return res.data.data;
  }
}

export const hrApiService = new HRApiService();
