import api from './api';

export interface DoctorDashboard {
  todayAppointments: number;
  pendingEncounters: number;
  inpatientCount: number;
  pendingLabResults: number;
  pendingPrescriptions: number;
}

export interface PatientSummary {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
}

export interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  chiefComplaint?: string;
  patient: PatientSummary;
  branch?: { name: string };
}

export interface Encounter {
  id: string;
  encounterDate: string;
  encounterType: string;
  status: string;
  chiefComplaint?: string;
  patient: PatientSummary;
}

export interface LabOrder {
  id: string;
  orderDate: string;
  status: string;
  priority: string;
  patient: PatientSummary;
  items: Array<{
    id: string;
    status: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    isAbnormal: boolean;
    isCritical: boolean;
    test: { name: string; code: string };
  }>;
}

export interface InpatientRecord {
  id: string;
  admissionDate: string;
  status: string;
  ward?: string;
  bed?: string;
  diagnosis?: string;
  patient: PatientSummary;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const doctorService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  getDashboard: async (tenantId: string) => {
    const res = await api.get('/appointments', { params: { tenantId, status: 'SCHEDULED', limit: 1 } });
    const appts = res.data?.total || 0;
    return { todayAppointments: appts, pendingEncounters: 0, inpatientCount: 0, pendingLabResults: 0, pendingPrescriptions: 0 } as DoctorDashboard;
  },

  getAppointments: async (tenantId: string, doctorId: string, date?: string) => {
    const params: any = { tenantId, doctorId, limit: 50 };
    if (date) params.date = date;
    const res = await api.get('/appointments', { params });
    return res.data?.data || res.data?.appointments || [];
  },

  getEncounters: async (tenantId: string, doctorId: string) => {
    const res = await api.get('/emr/encounters', { params: { tenantId, doctorId, limit: 50 } });
    return res.data?.data || res.data?.encounters || [];
  },

  getPatient: async (patientId: string) => {
    const res = await api.get(`/patients/${patientId}`);
    return res.data?.data || res.data;
  },

  searchPatients: async (tenantId: string, query: string) => {
    const res = await api.get('/patients', { params: { tenantId, search: query, limit: 20 } });
    return res.data?.data || res.data?.patients || [];
  },

  getLabOrders: async (tenantId: string, doctorId: string) => {
    const res = await api.get('/laboratory/orders', { params: { tenantId, orderedBy: doctorId, limit: 50 } });
    return res.data?.data || res.data?.orders || [];
  },

  getPrescriptions: async (tenantId: string, doctorId: string) => {
    const res = await api.get('/pharmacy/prescriptions', { params: { tenantId, prescribedBy: doctorId, limit: 50 } });
    return res.data?.data || res.data?.prescriptions || [];
  },

  getInpatients: async (tenantId: string) => {
    const res = await api.get('/inpatient/admissions', { params: { tenantId, status: 'ADMITTED', limit: 50 } });
    return res.data?.data || res.data?.admissions || [];
  },

  getNotifications: async (userId: string) => {
    const res = await api.get('/notifications', { params: { userId, limit: 50 } });
    return res.data?.data || res.data?.notifications || [];
  },

  markNotificationRead: async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  createEncounterNote: async (encounterId: string, data: { section: string; content: string }) => {
    const res = await api.post(`/emr/encounters/${encounterId}/notes`, data);
    return res.data;
  },
};
