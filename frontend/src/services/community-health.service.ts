import api from './api';

export const communityHealthService = {
  getDashboard: (tenantId: string) => api.get('/community-health/dashboard', { params: { tenantId } }),
  createWorker: (data: any) => api.post('/community-health/workers', data),
  getWorkers: (tenantId: string, status?: string) => api.get('/community-health/workers', { params: { tenantId, status } }),
  updateWorker: (id: string, data: any) => api.patch(`/community-health/workers/${id}`, data),
  createVisit: (data: any) => api.post('/community-health/visits', data),
  getVisits: (params: any) => api.get('/community-health/visits', { params }),
  createHousehold: (data: any) => api.post('/community-health/households', data),
  getHouseholds: (tenantId: string, riskLevel?: string) => api.get('/community-health/households', { params: { tenantId, riskLevel } }),
  updateHousehold: (id: string, data: any) => api.patch(`/community-health/households/${id}`, data),
};
