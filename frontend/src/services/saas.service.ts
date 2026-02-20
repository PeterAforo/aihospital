import api from './api';

export const saasService = {
  // Plans
  getPlans: () => api.get('/saas/plans'),
  createPlan: (data: any) => api.post('/saas/plans', data),
  updatePlan: (id: string, data: any) => api.patch(`/saas/plans/${id}`, data),

  // Subscriptions
  getSubscription: (tenantId: string) => api.get(`/saas/subscriptions/${tenantId}`),
  createSubscription: (data: any) => api.post('/saas/subscriptions', data),
  cancelSubscription: (tenantId: string) => api.post(`/saas/subscriptions/${tenantId}/cancel`),
  renewSubscription: (tenantId: string) => api.post(`/saas/subscriptions/${tenantId}/renew`),
  changePlan: (tenantId: string, planId: string) => api.post(`/saas/subscriptions/${tenantId}/change-plan`, { planId }),

  // Usage
  getUsage: (tenantId: string) => api.get(`/saas/usage/${tenantId}`),
  checkLimit: (tenantId: string, metric: string) => api.get(`/saas/usage/${tenantId}/check/${metric}`),

  // Provisioning
  provisionTenant: (data: any) => api.post('/saas/provision', data),

  // Dashboard
  getDashboard: () => api.get('/saas/dashboard'),
};
