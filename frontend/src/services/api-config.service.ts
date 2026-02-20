import api from './api';

export const apiConfigService = {
  // Resolve config for a tenant
  resolve: (tenantId: string, branchId: string | null, apiType: string) =>
    api.get('/api-config/resolve', { params: { tenantId, branchId, apiType } }),

  // Super Admin
  getSuperAdminConfigs: () => api.get('/api-config/super-admin'),
  upsertSuperAdminConfig: (data: any) => api.post('/api-config/super-admin', data),

  // Tenant
  getTenantConfigs: (tenantId: string) => api.get(`/api-config/tenant/${tenantId}`),
  upsertTenantConfig: (tenantId: string, data: any) => api.post(`/api-config/tenant/${tenantId}`, data),

  // Branch
  getBranchConfigs: (branchId: string) => api.get(`/api-config/branch/${branchId}`),
  upsertBranchConfig: (branchId: string, data: any) => api.post(`/api-config/branch/${branchId}`, data),

  // Delete
  deleteConfig: (id: string) => api.delete(`/api-config/${id}`),

  // Test connection
  testConnection: (data: { apiType: string; provider: string; credentials: any }) =>
    api.post('/api-config/test', data),

  // Usage
  getUsageSummary: (tenantId?: string, startDate?: string, endDate?: string) =>
    api.get('/api-config/usage', { params: { tenantId, startDate, endDate } }),
};
