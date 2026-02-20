import api from './api';

export const whiteLabelService = {
  getConfig: (tenantId: string) => api.get(`/white-label/config/${tenantId}`),
  upsertConfig: (tenantId: string, data: any) => api.post(`/white-label/config/${tenantId}`, data),
  getResellers: (status?: string) => api.get('/white-label/resellers', { params: { status } }),
  getReseller: (id: string) => api.get(`/white-label/resellers/${id}`),
  createReseller: (data: any) => api.post('/white-label/resellers', data),
  updateReseller: (id: string, data: any) => api.patch(`/white-label/resellers/${id}`, data),
  assignTenant: (resellerId: string, tenantId: string) => api.post(`/white-label/resellers/${resellerId}/assign-tenant`, { tenantId }),
  getResellerDashboard: (id: string) => api.get(`/white-label/resellers/${id}/dashboard`),
};
