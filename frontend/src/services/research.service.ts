import api from './api';

export const researchService = {
  getDashboard: (tenantId: string) => api.get('/research/dashboard', { params: { tenantId } }),
  createTrial: (data: any) => api.post('/research/trials', data),
  getTrials: (tenantId: string, status?: string) => api.get('/research/trials', { params: { tenantId, status } }),
  getTrial: (id: string) => api.get(`/research/trials/${id}`),
  updateTrial: (id: string, data: any) => api.patch(`/research/trials/${id}`, data),
  enrollParticipant: (data: any) => api.post('/research/participants', data),
  updateParticipant: (id: string, data: any) => api.patch(`/research/participants/${id}`, data),
};
