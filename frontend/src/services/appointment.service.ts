import api from './api';

export interface Appointment {
  id: string;
  tenantId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime?: string;
  duration: number;
  type?: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint?: string;
  specialInstructions?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phonePrimary?: string;
    mrn?: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'PROCEDURE' | 'CHECKUP' | 'EMERGENCY';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'TRIAGED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface CreateAppointmentRequest {
  branchId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration?: number;
  type: AppointmentType;
  reason?: string;
  notes?: string;
  isWalkIn?: boolean;
}

export interface UpdateAppointmentRequest {
  appointmentDate?: string;
  appointmentTime?: string;
  duration?: number;
  type?: AppointmentType;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancelReason?: string;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  specialization?: string;
  schedules?: DoctorSchedule[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DoctorAvailability {
  available: boolean;
  slots: TimeSlot[];
}

export interface QueueEntry {
  id: string;
  tenantId: string;
  branchId: string;
  patientId: string;
  doctorId?: string;
  queueNumber: number;
  priority: number;
  status: string;
  checkedInAt: string;
  calledAt?: string;
  completedAt?: string;
}

export interface AppointmentListParams {
  doctorId?: string;
  patientId?: string;
  branchId?: string;
  status?: AppointmentStatus;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AppointmentService {
  async create(data: CreateAppointmentRequest): Promise<Appointment> {
    const response = await api.post('/appointments', data);
    return response.data.data;
  }

  async getById(id: string): Promise<Appointment> {
    const response = await api.get(`/appointments/${id}`);
    return response.data.data;
  }

  async list(params: AppointmentListParams = {}): Promise<AppointmentListResponse> {
    const response = await api.get('/appointments', { params });
    // API returns { status, data: [...], meta: { page, limit, total, totalPages } }
    const { data, meta } = response.data;
    return {
      appointments: data || [],
      total: meta?.total || 0,
      page: meta?.page || 1,
      limit: meta?.limit || 20,
      totalPages: meta?.totalPages || 1,
    };
  }

  async update(id: string, data: UpdateAppointmentRequest): Promise<Appointment> {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data.data;
  }

  async cancel(id: string, reason?: string): Promise<void> {
    await api.delete(`/appointments/${id}`, { data: { reason } });
  }

  async checkIn(id: string): Promise<Appointment> {
    const response = await api.post(`/appointments/${id}/check-in`);
    return response.data.data;
  }

  async complete(id: string): Promise<Appointment> {
    const response = await api.post(`/appointments/${id}/complete`);
    return response.data.data;
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<DoctorAvailability> {
    const response = await api.get(`/appointments/doctor/${doctorId}/availability`, { params: { date } });
    return response.data.data;
  }

  async getDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
    const response = await api.get(`/appointments/doctor/${doctorId}/schedules`);
    return response.data.data;
  }

  async getAvailableDoctors(date: string, branchId?: string): Promise<Doctor[]> {
    const response = await api.get('/appointments/doctors/available', { params: { date, branchId } });
    return response.data.data;
  }

  async getDoctors(): Promise<Doctor[]> {
    const response = await api.get('/appointments/schedules/doctors');
    return response.data.data;
  }

  async getCurrentQueue(branchId: string): Promise<QueueEntry[]> {
    const response = await api.get('/appointments/queue/current', { params: { branchId } });
    return response.data.data;
  }

  async createSchedule(data: { doctorId: string; dayOfWeek: number; startTime: string; endTime: string; slotDuration?: number }): Promise<DoctorSchedule> {
    const response = await api.post('/appointments/schedules', data);
    return response.data.data;
  }

  async createWeeklySchedule(doctorId: string, schedules: { dayOfWeek: number; startTime: string; endTime: string; slotDuration?: number }[]): Promise<DoctorSchedule[]> {
    const response = await api.post('/appointments/schedules/weekly', { doctorId, schedules });
    return response.data.data;
  }

  async updateSchedule(id: string, data: { startTime?: string; endTime?: string; slotDuration?: number; isActive?: boolean }): Promise<DoctorSchedule> {
    const response = await api.put(`/appointments/schedules/${id}`, data);
    return response.data.data;
  }

  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/appointments/schedules/${id}`);
  }
}

export const appointmentService = new AppointmentService();
