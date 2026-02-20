import api from './api';

export const publicHealthService = {
  // Disease Notifications
  createNotification: (data: any) => api.post('/public-health/notifications', data),
  getNotifications: (params: any) => api.get('/public-health/notifications', { params }),
  updateNotification: (id: string, data: any) => api.patch(`/public-health/notifications/${id}`, data),

  // Outbreak Alerts
  getOutbreaks: (tenantId?: string) => api.get('/public-health/outbreaks', { params: { tenantId } }),
  deactivateAlert: (id: string, userId: string) => api.patch(`/public-health/outbreaks/${id}/deactivate`, { userId }),

  // Dashboard
  getDashboard: (tenantId: string) => api.get('/public-health/dashboard', { params: { tenantId } }),

  // Immunizations
  createImmunization: (data: any) => api.post('/public-health/immunizations', data),
  getImmunizations: (params: any) => api.get('/public-health/immunizations', { params }),
  administerVaccine: (id: string, data: any) => api.patch(`/public-health/immunizations/${id}/administer`, data),
  getDefaulters: (tenantId: string) => api.get('/public-health/immunizations/defaulters', { params: { tenantId } }),

  // Mass Campaigns
  createCampaign: (data: any) => api.post('/public-health/campaigns', data),
  getCampaigns: (tenantId: string, status?: string) => api.get('/public-health/campaigns', { params: { tenantId, status } }),
  updateCampaignProgress: (id: string, data: any) => api.patch(`/public-health/campaigns/${id}/progress`, data),
};
