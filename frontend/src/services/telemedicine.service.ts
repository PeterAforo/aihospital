import api from './api';

export const telemedicineService = {
  // Sessions
  createSession: (data: any) => api.post('/telemedicine/sessions', data),
  getSessions: (params: any) => api.get('/telemedicine/sessions', { params }),
  getSession: (id: string) => api.get(`/telemedicine/sessions/${id}`),
  startSession: (id: string) => api.patch(`/telemedicine/sessions/${id}/start`),
  joinWaiting: (id: string) => api.patch(`/telemedicine/sessions/${id}/waiting`),
  endSession: (id: string, data: any) => api.patch(`/telemedicine/sessions/${id}/end`, data),
  cancelSession: (id: string, reason: string) => api.patch(`/telemedicine/sessions/${id}/cancel`, { reason }),

  // Remote Monitoring
  submitReading: (data: any) => api.post('/telemedicine/readings', data),
  getReadings: (params: any) => api.get('/telemedicine/readings', { params }),
  getAbnormalReadings: (tenantId: string) => api.get('/telemedicine/readings/abnormal', { params: { tenantId } }),
  reviewReading: (id: string, reviewedBy: string) => api.patch(`/telemedicine/readings/${id}/review`, { reviewedBy }),

  // E-Consultations
  createEConsult: (data: any) => api.post('/telemedicine/e-consult', data),
  getEConsults: (params: any) => api.get('/telemedicine/e-consult', { params }),
  respondEConsult: (id: string, data: any) => api.patch(`/telemedicine/e-consult/${id}/respond`, data),
};
