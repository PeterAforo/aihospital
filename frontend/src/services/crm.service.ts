import api from './api';

export const crmService = {
  // Dashboard
  getDashboard: (tenantId: string) => api.get('/crm/dashboard', { params: { tenantId } }),

  // Segments
  getSegments: (tenantId: string) => api.get('/crm/segments', { params: { tenantId } }),
  upsertSegment: (data: any) => api.post('/crm/segments', data),
  recalculateSegments: (tenantId: string) => api.post('/crm/segments/recalculate', { tenantId }),

  // Campaigns
  createCampaign: (data: any) => api.post('/crm/campaigns', data),
  getCampaigns: (tenantId: string, status?: string) => api.get('/crm/campaigns', { params: { tenantId, status } }),
  updateCampaignStatus: (id: string, status: string) => api.patch(`/crm/campaigns/${id}/status`, { status }),

  // Feedback
  submitFeedback: (data: any) => api.post('/crm/feedback', data),
  getFeedback: (params: any) => api.get('/crm/feedback', { params }),
  getFeedbackSummary: (tenantId: string) => api.get('/crm/feedback/summary', { params: { tenantId } }),
  resolveFeedback: (id: string, data: any) => api.patch(`/crm/feedback/${id}/resolve`, data),

  // Loyalty
  enrollLoyalty: (tenantId: string, patientId: string) => api.post('/crm/loyalty/enroll', { tenantId, patientId }),
  getLoyaltyAccount: (patientId: string) => api.get(`/crm/loyalty/${patientId}`),
  earnPoints: (data: any) => api.post('/crm/loyalty/earn', data),
  redeemPoints: (data: any) => api.post('/crm/loyalty/redeem', data),

  // Referrals
  generateReferralCode: (tenantId: string, referrerId: string) => api.post('/crm/referrals/generate', { tenantId, referrerId }),
  getReferrals: (tenantId: string, referrerId?: string) => api.get('/crm/referrals', { params: { tenantId, referrerId } }),
};
