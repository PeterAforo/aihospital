import api from './api';

export interface ServiceCatalogItem {
  id: string;
  tenantId: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  subcategory?: string;
  description?: string;
  basePrice: number;
  costPrice?: number;
  targetProfitPercentage?: number;
  costCalculationMethod?: string;
  lastCostUpdate?: string;
  unit: string;
  isNhisCovered: boolean;
  nhisPrice?: number;
  nhisCode?: string;
  requiresNhisPreauth: boolean;
  isTaxable: boolean;
  taxRate: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  branchOverrideCount?: number;
  branchNames?: string[];
  pricingScope?: 'all_branches' | 'branch_specific';
  createdAt: string;
  updatedAt: string;
}

export interface BranchPricingItem {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  organizationPrice: number;
  branchPrice: number;
  hasOverride: boolean;
  overrideId?: string;
  overrideReason?: string;
  difference: number;
  nhisPrice?: number;
}

export interface PriceCalculationResult {
  serviceCode: string;
  serviceName: string;
  category: string;
  basePrice: number;
  finalPrice: number;
  taxAmount: number;
  totalPrice: number;
  priceSource: string;
  isNhisCovered: boolean;
  unit: string;
  quantity: number;
  breakdown: {
    organizationPrice: number;
    branchOverride: number | null;
    insuranceAdjustment: number | null;
    discountApplied: number;
    taxAdded: number;
  };
}

export interface PriceHistoryItem {
  id: string;
  serviceId: string;
  oldPrice: number;
  newPrice: number;
  changeReason?: string;
  effectiveDate: string;
  changedBy?: string;
  createdAt: string;
}

export interface DiscountScheme {
  id: string;
  tenantId: string;
  schemeName: string;
  discountType: string;
  discountValue: number;
  appliesTo: string;
  eligibilityCriteria?: string;
  isActive: boolean;
}

class FinanceService {
  async listServices(params?: {
    category?: string;
    nhisOnly?: boolean;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ services: ServiceCatalogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.nhisOnly) query.set('nhisOnly', 'true');
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await api.get(`/finance/services?${query.toString()}`);
    return res.data.data;
  }

  async getService(id: string): Promise<ServiceCatalogItem & { branchPricing: any[]; priceHistory: PriceHistoryItem[] }> {
    const res = await api.get(`/finance/services/${id}`);
    return res.data.data;
  }

  async createService(data: Partial<ServiceCatalogItem>): Promise<ServiceCatalogItem> {
    const res = await api.post('/finance/services', data);
    return res.data.data;
  }

  async updateService(id: string, data: Partial<ServiceCatalogItem>): Promise<ServiceCatalogItem> {
    const res = await api.put(`/finance/services/${id}`, data);
    return res.data.data;
  }

  async updateServicePrice(id: string, data: { newPrice: number; changeReason?: string; effectiveDate?: string }): Promise<any> {
    const res = await api.put(`/finance/services/${id}/price`, data);
    return res.data.data;
  }

  async toggleServiceActive(id: string): Promise<ServiceCatalogItem> {
    const res = await api.patch(`/finance/services/${id}/toggle`);
    return res.data.data;
  }

  async getPriceHistory(serviceId: string): Promise<PriceHistoryItem[]> {
    const res = await api.get(`/finance/services/${serviceId}/history`);
    return res.data.data;
  }

  async getBranchPricing(branchId: string): Promise<BranchPricingItem[]> {
    const res = await api.get(`/finance/branches/${branchId}/pricing`);
    return res.data.data;
  }

  async setBranchPrice(branchId: string, data: { serviceId: string; branchPrice: number; reason?: string }): Promise<any> {
    const res = await api.post(`/finance/branches/${branchId}/pricing`, data);
    return res.data.data;
  }

  async removeBranchPrice(branchId: string, overrideId: string): Promise<void> {
    await api.delete(`/finance/branches/${branchId}/pricing/${overrideId}`);
  }

  async calculatePrice(data: {
    serviceId?: string;
    serviceCode?: string;
    branchId?: string;
    patientId?: string;
    quantity?: number;
    discountSchemeId?: string;
  }): Promise<PriceCalculationResult> {
    const res = await api.post('/finance/calculate-price', data);
    return res.data.data;
  }

  async listDiscounts(): Promise<DiscountScheme[]> {
    const res = await api.get('/finance/discounts');
    return res.data.data;
  }

  async createDiscount(data: Partial<DiscountScheme>): Promise<DiscountScheme> {
    const res = await api.post('/finance/discounts', data);
    return res.data.data;
  }

  async getPriceComparison(category?: string): Promise<any[]> {
    const query = category ? `?category=${category}` : '';
    const res = await api.get(`/finance/price-comparison${query}`);
    return res.data.data;
  }

  async bulkUpdatePrices(data: {
    category?: string;
    adjustmentType: 'percentage' | 'fixed';
    adjustmentValue: number;
    reason: string;
  }): Promise<{ updatedCount: number }> {
    const res = await api.post('/finance/bulk-update', data);
    return res.data.data;
  }

  async seedCatalog(): Promise<any> {
    const res = await api.post('/finance/seed');
    return res.data.data;
  }

  // ==================== COST MANAGEMENT ====================

  async updateServiceCost(id: string, data: { newCostPrice: number; changeReason?: string }): Promise<any> {
    const res = await api.put(`/finance/services/${id}/cost`, data);
    return res.data.data;
  }

  async getCostBreakdown(id: string): Promise<any> {
    const res = await api.get(`/finance/services/${id}/cost-breakdown`);
    return res.data.data;
  }

  async setCostBreakdown(id: string, components: any[]): Promise<any> {
    const res = await api.post(`/finance/services/${id}/cost-breakdown`, { components });
    return res.data.data;
  }

  async getCostHistory(id: string): Promise<any[]> {
    const res = await api.get(`/finance/services/${id}/cost-history`);
    return res.data.data;
  }

  // ==================== CATEGORY PROFIT SETTINGS ====================

  async listCategorySettings(): Promise<CategoryProfitSetting[]> {
    const res = await api.get('/finance/category-settings');
    return res.data.data;
  }

  async upsertCategorySettings(data: Partial<CategoryProfitSetting>): Promise<CategoryProfitSetting> {
    const res = await api.post('/finance/category-settings', data);
    return res.data.data;
  }

  // ==================== PRICING RECOMMENDATIONS ====================

  async calculateRecommendedPrice(data: {
    costPrice: number;
    targetProfitPercentage?: number;
    category?: string;
    subcategory?: string;
  }): Promise<RecommendedPriceResult> {
    const res = await api.post('/finance/calculate-recommended-price', data);
    return res.data.data;
  }

  // ==================== PROFITABILITY REPORTS ====================

  async getMarginAnalysis(filters?: { category?: string; marginStatus?: string }): Promise<MarginAnalysisResult> {
    const query = new URLSearchParams();
    if (filters?.category) query.set('category', filters.category);
    if (filters?.marginStatus) query.set('marginStatus', filters.marginStatus);
    const res = await api.get(`/finance/reports/margin-analysis?${query.toString()}`);
    return res.data.data;
  }

  async getCategoryProfitability(): Promise<CategoryProfitabilityItem[]> {
    const res = await api.get('/finance/reports/category-profitability');
    return res.data.data;
  }

  async getLowMarginAlerts(): Promise<MarginServiceItem[]> {
    const res = await api.get('/finance/reports/low-margin-alerts');
    return res.data.data;
  }
}

export interface CategoryProfitSetting {
  id: string;
  tenantId: string;
  category: string;
  subcategory?: string;
  targetProfitPercentage: number;
  minimumProfitPercentage?: number;
  pricingStrategy: string;
  autoAdjustPrices: boolean;
}

export interface RecommendedPriceResult {
  costPrice: number;
  targetProfitPercentage: number;
  recommendedPrice: number;
  actualProfitAmount: number;
  actualProfitPercentage: number;
  warnings: string[];
}

export interface MarginServiceItem {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  subcategory?: string;
  costPrice: number;
  sellingPrice: number;
  nhisPrice?: number;
  profitAmount: number;
  profitMarginPercentage: number | null;
  nhisMarginPercentage?: number | null;
  targetMargin: number;
  marginStatus: string;
}

export interface MarginAnalysisResult {
  summary: {
    totalServices: number;
    averageMargin: number;
    aboveTarget: number;
    atTarget: number;
    belowTarget: number;
    lowMargin: number;
    lossMaking: number;
  };
  services: MarginServiceItem[];
}

export interface CategoryProfitabilityItem {
  category: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  serviceCount: number;
}

export const financeService = new FinanceService();
