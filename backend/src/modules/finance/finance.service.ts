import { prisma } from '../../common/utils/prisma.js';
import { ServiceCategory } from '@prisma/client';

// ==================== INTERFACES ====================

export interface PriceCalculationInput {
  serviceId?: string;
  serviceCode?: string;
  branchId?: string;
  patientId?: string;
  quantity?: number;
  discountSchemeId?: string;
}

export interface PriceCalculationResult {
  serviceCode: string;
  serviceName: string;
  category: string;
  basePrice: number;
  finalPrice: number;
  taxAmount: number;
  totalPrice: number;
  priceSource: 'base' | 'branch_override' | 'nhis' | 'insurance';
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

export interface CreateServiceInput {
  serviceCode: string;
  serviceName: string;
  category: ServiceCategory;
  subcategory?: string;
  description?: string;
  basePrice: number;
  unit?: string;
  isNhisCovered?: boolean;
  nhisPrice?: number;
  nhisCode?: string;
  requiresNhisPreauth?: boolean;
  isTaxable?: boolean;
  taxRate?: number;
  effectiveFrom?: Date;
}

export interface UpdatePriceInput {
  newPrice: number;
  changeReason?: string;
  effectiveDate?: Date;
}

export interface BranchPriceInput {
  serviceId: string;
  branchPrice: number;
  reason?: string;
  effectiveFrom?: Date;
}

// ==================== SERVICE ====================

class FinanceService {
  // ==================== SERVICE CATALOG CRUD ====================

  async listServices(
    tenantId: string,
    filters: {
      category?: ServiceCategory;
      nhisOnly?: boolean;
      active?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { category, nhisOnly, active = true, search, page = 1, limit = 50 } = filters;

    const where: any = { tenantId };
    if (category) where.category = category;
    if (nhisOnly) where.isNhisCovered = true;
    if (active !== undefined) where.isActive = active;
    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { serviceCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [services, total] = await Promise.all([
      prisma.serviceCatalog.findMany({
        where,
        orderBy: [{ category: 'asc' }, { serviceName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branchPricing: {
            where: { isActive: true },
            select: { id: true, branchId: true, branch: { select: { name: true } } },
          },
        },
      }),
      prisma.serviceCatalog.count({ where }),
    ]);

    const enriched = services.map(s => {
      const branchCount = s.branchPricing.length;
      const branchNames = s.branchPricing.map((bp: any) => bp.branch.name);
      const { branchPricing, ...rest } = s;
      return {
        ...rest,
        branchOverrideCount: branchCount,
        branchNames,
        pricingScope: branchCount > 0 ? 'branch_specific' : 'all_branches',
      };
    });

    return { services: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getServiceById(tenantId: string, serviceId: string) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
      include: {
        branchPricing: {
          where: { isActive: true },
          include: { branch: { select: { id: true, name: true } } },
        },
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!service) throw new Error('Service not found');
    return service;
  }

  async createService(tenantId: string, userId: string, data: CreateServiceInput) {
    // Check for duplicate code
    const existing = await prisma.serviceCatalog.findUnique({
      where: { tenantId_serviceCode: { tenantId, serviceCode: data.serviceCode } },
    });
    if (existing) throw new Error(`Service code ${data.serviceCode} already exists`);

    return prisma.serviceCatalog.create({
      data: {
        tenantId,
        serviceCode: data.serviceCode.toUpperCase(),
        serviceName: data.serviceName,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        basePrice: data.basePrice,
        unit: data.unit || 'per_visit',
        isNhisCovered: data.isNhisCovered || false,
        nhisPrice: data.nhisPrice,
        nhisCode: data.nhisCode,
        requiresNhisPreauth: data.requiresNhisPreauth || false,
        isTaxable: data.isTaxable || false,
        taxRate: data.taxRate || 0,
        effectiveFrom: data.effectiveFrom,
        createdBy: userId,
      },
    });
  }

  async updateService(tenantId: string, serviceId: string, data: Partial<CreateServiceInput>) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    const updateData: any = {};
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.isNhisCovered !== undefined) updateData.isNhisCovered = data.isNhisCovered;
    if (data.nhisPrice !== undefined) updateData.nhisPrice = data.nhisPrice;
    if (data.nhisCode !== undefined) updateData.nhisCode = data.nhisCode;
    if (data.requiresNhisPreauth !== undefined) updateData.requiresNhisPreauth = data.requiresNhisPreauth;
    if (data.isTaxable !== undefined) updateData.isTaxable = data.isTaxable;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;

    return prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: updateData,
    });
  }

  async updateServicePrice(
    tenantId: string,
    serviceId: string,
    userId: string,
    data: UpdatePriceInput
  ) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    // Create price history record and update price in a transaction
    const [history, updated] = await prisma.$transaction([
      prisma.priceHistory.create({
        data: {
          serviceId,
          oldPrice: service.basePrice,
          newPrice: data.newPrice,
          changeReason: data.changeReason,
          effectiveDate: data.effectiveDate || new Date(),
          changedBy: userId,
        },
      }),
      prisma.serviceCatalog.update({
        where: { id: serviceId },
        data: { basePrice: data.newPrice },
      }),
    ]);

    return { service: updated, priceHistory: history };
  }

  async toggleServiceActive(tenantId: string, serviceId: string) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    return prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: { isActive: !service.isActive },
    });
  }

  // ==================== BRANCH PRICING ====================

  async getBranchPricing(tenantId: string, branchId: string) {
    // Get all services for the tenant with their branch overrides
    const services = await prisma.serviceCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { serviceName: 'asc' }],
    });

    const branchOverrides = await prisma.branchPricing.findMany({
      where: { branchId, isActive: true },
    });

    const overrideMap = new Map(branchOverrides.map(o => [o.serviceId, o]));

    return services.map(s => {
      const override = overrideMap.get(s.id);
      return {
        serviceId: s.id,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        category: s.category,
        organizationPrice: s.basePrice,
        branchPrice: override?.branchPrice ?? s.basePrice,
        hasOverride: !!override,
        overrideId: override?.id,
        overrideReason: override?.reason,
        difference: override ? override.branchPrice - s.basePrice : 0,
        nhisPrice: s.nhisPrice,
      };
    });
  }

  async setBranchPrice(
    branchId: string,
    userId: string,
    data: BranchPriceInput
  ) {
    // Deactivate any existing override for this service at this branch
    await prisma.branchPricing.updateMany({
      where: { branchId, serviceId: data.serviceId, isActive: true },
      data: { isActive: false },
    });

    return prisma.branchPricing.create({
      data: {
        branchId,
        serviceId: data.serviceId,
        branchPrice: data.branchPrice,
        reason: data.reason,
        effectiveFrom: data.effectiveFrom || new Date(),
        createdBy: userId,
      },
      include: {
        service: { select: { serviceCode: true, serviceName: true, basePrice: true } },
        branch: { select: { name: true } },
      },
    });
  }

  async removeBranchPrice(branchId: string, overrideId: string) {
    const override = await prisma.branchPricing.findFirst({
      where: { id: overrideId, branchId },
    });
    if (!override) throw new Error('Branch pricing override not found');

    return prisma.branchPricing.update({
      where: { id: overrideId },
      data: { isActive: false },
    });
  }

  // ==================== DISCOUNT SCHEMES ====================

  async listDiscountSchemes(tenantId: string) {
    return prisma.discountScheme.findMany({
      where: { tenantId },
      orderBy: { schemeName: 'asc' },
    });
  }

  async createDiscountScheme(
    tenantId: string,
    data: {
      schemeName: string;
      discountType: string;
      discountValue: number;
      appliesTo?: string;
      eligibilityCriteria?: string;
    }
  ) {
    return prisma.discountScheme.create({
      data: {
        tenantId,
        schemeName: data.schemeName,
        discountType: data.discountType,
        discountValue: data.discountValue,
        appliesTo: data.appliesTo || 'all_services',
        eligibilityCriteria: data.eligibilityCriteria,
      },
    });
  }

  // ==================== PRICE CALCULATION (CORE) ====================

  async calculatePrice(
    tenantId: string,
    input: PriceCalculationInput
  ): Promise<PriceCalculationResult> {
    // 1. Get service from catalog
    let service;
    if (input.serviceId) {
      service = await prisma.serviceCatalog.findFirst({
        where: { id: input.serviceId, tenantId },
      });
    } else if (input.serviceCode) {
      service = await prisma.serviceCatalog.findUnique({
        where: { tenantId_serviceCode: { tenantId, serviceCode: input.serviceCode } },
      });
    }

    if (!service) throw new Error('Service not found in catalog');

    let finalPrice = service.basePrice;
    let priceSource: PriceCalculationResult['priceSource'] = 'base';
    let branchOverride: number | null = null;
    let insuranceAdjustment: number | null = null;
    let discountApplied = 0;

    // 2. Check for branch-specific pricing (HIGHEST PRIORITY for cash)
    if (input.branchId) {
      const branchPrice = await prisma.branchPricing.findFirst({
        where: {
          branchId: input.branchId,
          serviceId: service.id,
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (branchPrice) {
        finalPrice = branchPrice.branchPrice;
        branchOverride = branchPrice.branchPrice;
        priceSource = 'branch_override';
      }
    }

    // 3. Check patient insurance type
    if (input.patientId) {
      // Check NHIS membership
      const nhisMember = await prisma.nHISMember.findUnique({
        where: { patientId: input.patientId },
      });

      if (nhisMember && nhisMember.isActive && service.isNhisCovered && service.nhisPrice !== null) {
        insuranceAdjustment = service.nhisPrice - finalPrice;
        finalPrice = service.nhisPrice;
        priceSource = 'nhis';
      } else {
        // Check private insurance
        const activePolicy = await prisma.insurancePolicy.findFirst({
          where: {
            patientId: input.patientId,
            isActive: true,
            validTo: { gte: new Date() },
          },
        });

        if (activePolicy) {
          const insurancePrice = await prisma.insurancePricing.findFirst({
            where: {
              tenantId,
              serviceId: service.id,
              isActive: true,
              contractStartDate: { lte: new Date() },
              OR: [
                { contractEndDate: null },
                { contractEndDate: { gte: new Date() } },
              ],
            },
          });

          if (insurancePrice) {
            insuranceAdjustment = insurancePrice.insurancePrice - finalPrice;
            finalPrice = insurancePrice.insurancePrice;
            priceSource = 'insurance';
          }
        }
      }
    }

    // 4. Apply discount scheme
    if (input.discountSchemeId) {
      const discount = await prisma.discountScheme.findFirst({
        where: { id: input.discountSchemeId, tenantId, isActive: true },
      });

      if (discount) {
        const categoryMatch =
          discount.appliesTo === 'all_services' ||
          discount.appliesTo === service.category;

        if (categoryMatch) {
          if (discount.discountType === 'percentage') {
            discountApplied = finalPrice * (discount.discountValue / 100);
            finalPrice = finalPrice - discountApplied;
          } else if (discount.discountType === 'fixed_amount') {
            discountApplied = Math.min(discount.discountValue, finalPrice);
            finalPrice = Math.max(0, finalPrice - discountApplied);
          }
        }
      }
    }

    // 5. Calculate tax
    let taxAmount = 0;
    if (service.isTaxable && service.taxRate > 0) {
      taxAmount = finalPrice * (service.taxRate / 100);
    }

    const quantity = input.quantity || 1;
    const totalPrice = (finalPrice + taxAmount) * quantity;

    return {
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      category: service.category,
      basePrice: service.basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      priceSource,
      isNhisCovered: service.isNhisCovered,
      unit: service.unit,
      quantity,
      breakdown: {
        organizationPrice: service.basePrice,
        branchOverride,
        insuranceAdjustment,
        discountApplied: Math.round(discountApplied * 100) / 100,
        taxAdded: Math.round(taxAmount * 100) / 100,
      },
    };
  }

  // ==================== PRICE COMPARISON ====================

  async getPriceComparison(tenantId: string, category?: ServiceCategory) {
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;

    const services = await prisma.serviceCatalog.findMany({
      where,
      include: {
        branchPricing: {
          where: { isActive: true },
          include: { branch: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ category: 'asc' }, { serviceName: 'asc' }],
    });

    return services.map(s => {
      const branches: Record<string, number> = {};
      for (const bp of s.branchPricing) {
        branches[bp.branch.name] = bp.branchPrice;
      }

      const prices = [s.basePrice, ...Object.values(branches)];
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const maxDiff = Math.max(...prices) - Math.min(...prices);

      return {
        serviceId: s.id,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        category: s.category,
        organizationPrice: s.basePrice,
        nhisPrice: s.nhisPrice,
        branches,
        average: Math.round(avg * 100) / 100,
        variance: maxDiff > s.basePrice * 0.2 ? 'High' : maxDiff > 0 ? 'Low' : 'None',
      };
    });
  }

  // ==================== PRICE HISTORY ====================

  async getPriceHistory(tenantId: string, serviceId: string) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    return prisma.priceHistory.findMany({
      where: { serviceId },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    });
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdatePrices(
    tenantId: string,
    userId: string,
    data: {
      category?: ServiceCategory;
      adjustmentType: 'percentage' | 'fixed';
      adjustmentValue: number;
      reason: string;
    }
  ) {
    const where: any = { tenantId, isActive: true };
    if (data.category) where.category = data.category;

    const services = await prisma.serviceCatalog.findMany({ where });

    const updates = [];
    for (const service of services) {
      let newPrice: number;
      if (data.adjustmentType === 'percentage') {
        newPrice = service.basePrice * (1 + data.adjustmentValue / 100);
      } else {
        newPrice = service.basePrice + data.adjustmentValue;
      }
      newPrice = Math.round(Math.max(0, newPrice) * 100) / 100;

      updates.push(
        prisma.$transaction([
          prisma.priceHistory.create({
            data: {
              serviceId: service.id,
              oldPrice: service.basePrice,
              newPrice,
              changeReason: data.reason,
              changedBy: userId,
            },
          }),
          prisma.serviceCatalog.update({
            where: { id: service.id },
            data: { basePrice: newPrice },
          }),
        ])
      );
    }

    await Promise.all(updates);
    return { updatedCount: services.length };
  }

  // ==================== COST MANAGEMENT ====================

  async updateServiceCost(
    tenantId: string,
    serviceId: string,
    userId: string,
    data: { newCostPrice: number; changeReason?: string; effectiveDate?: Date }
  ) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    const oldCost = service.costPrice || 0;
    const changeAmount = data.newCostPrice - oldCost;
    const changePct = oldCost > 0 ? (changeAmount / oldCost) * 100 : null;

    const [history, updated] = await prisma.$transaction([
      prisma.costHistory.create({
        data: {
          serviceId,
          oldCost,
          newCost: data.newCostPrice,
          costChangeAmount: Math.round(changeAmount * 100) / 100,
          costChangePercentage: changePct ? Math.round(changePct * 100) / 100 : null,
          changeReason: data.changeReason,
          effectiveDate: data.effectiveDate || new Date(),
          recordedBy: userId,
        },
      }),
      prisma.serviceCatalog.update({
        where: { id: serviceId },
        data: {
          costPrice: data.newCostPrice,
          lastCostUpdate: new Date(),
        },
      }),
    ]);

    return { service: updated, costHistory: history };
  }

  async setCostBreakdown(
    serviceId: string,
    tenantId: string,
    components: Array<{ componentType: string; componentName: string; costAmount: number; isVariable?: boolean; notes?: string }>
  ) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new Error('Service not found');

    // Delete existing components and recreate
    await prisma.costComponent.deleteMany({ where: { serviceId } });

    const totalCost = components.reduce((sum, c) => sum + c.costAmount, 0);

    const created = await prisma.costComponent.createMany({
      data: components.map(c => ({
        serviceId,
        componentType: c.componentType,
        componentName: c.componentName,
        costAmount: c.costAmount,
        percentageOfTotal: totalCost > 0 ? Math.round((c.costAmount / totalCost) * 10000) / 100 : 0,
        isVariable: c.isVariable || false,
        notes: c.notes,
      })),
    });

    // Update service cost price to match total
    await prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: { costPrice: Math.round(totalCost * 100) / 100, lastCostUpdate: new Date() },
    });

    return { componentsCreated: created.count, totalCost: Math.round(totalCost * 100) / 100 };
  }

  async getCostBreakdown(serviceId: string, tenantId: string) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId },
      include: { costComponents: true },
    });
    if (!service) throw new Error('Service not found');
    return { service, components: service.costComponents };
  }

  async getCostHistory(serviceId: string, tenantId: string) {
    const service = await prisma.serviceCatalog.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) throw new Error('Service not found');
    return prisma.costHistory.findMany({
      where: { serviceId },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    });
  }

  // ==================== CATEGORY PROFIT SETTINGS ====================

  async listCategoryProfitSettings(tenantId: string) {
    return prisma.categoryProfitSettings.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { subcategory: 'asc' }],
    });
  }

  async upsertCategoryProfitSettings(
    tenantId: string,
    data: {
      category: string;
      subcategory?: string;
      targetProfitPercentage: number;
      minimumProfitPercentage?: number;
      pricingStrategy?: string;
      autoAdjustPrices?: boolean;
    }
  ) {
    const existing = await prisma.categoryProfitSettings.findUnique({
      where: {
        tenantId_category_subcategory: {
          tenantId,
          category: data.category,
          subcategory: data.subcategory || '',
        },
      },
    });

    if (existing) {
      return prisma.categoryProfitSettings.update({
        where: { id: existing.id },
        data: {
          targetProfitPercentage: data.targetProfitPercentage,
          minimumProfitPercentage: data.minimumProfitPercentage,
          pricingStrategy: data.pricingStrategy,
          autoAdjustPrices: data.autoAdjustPrices,
        },
      });
    }

    return prisma.categoryProfitSettings.create({
      data: {
        tenantId,
        category: data.category,
        subcategory: data.subcategory || '',
        targetProfitPercentage: data.targetProfitPercentage,
        minimumProfitPercentage: data.minimumProfitPercentage,
        pricingStrategy: data.pricingStrategy || 'cost_plus',
        autoAdjustPrices: data.autoAdjustPrices || false,
      },
    });
  }

  // ==================== PRICING RECOMMENDATIONS ====================

  async calculateRecommendedPrice(
    tenantId: string,
    data: { costPrice: number; targetProfitPercentage?: number; category?: string; subcategory?: string }
  ) {
    let targetPct = data.targetProfitPercentage;
    const warnings: string[] = [];

    // Get category-level target if not provided
    if (targetPct === undefined && data.category) {
      const catSettings = await prisma.categoryProfitSettings.findFirst({
        where: {
          tenantId,
          category: data.category,
          ...(data.subcategory ? { subcategory: data.subcategory } : {}),
        },
      });
      if (catSettings) {
        targetPct = catSettings.targetProfitPercentage;
      }
    }

    if (targetPct === undefined) targetPct = 50; // fallback

    let recommendedPrice = data.costPrice * (1 + targetPct / 100);

    // Ghana essential medicines regulation: max 30% markup
    if (data.category === 'PHARMACY' && data.subcategory === 'essential_medicines') {
      const maxAllowed = data.costPrice * 1.30;
      if (recommendedPrice > maxAllowed) {
        recommendedPrice = maxAllowed;
        warnings.push('Price capped at 30% due to Ghana essential medicines regulation');
      }
    }

    // Round to nearest 0.05
    recommendedPrice = Math.ceil(recommendedPrice * 20) / 20;

    const actualProfit = recommendedPrice - data.costPrice;
    const actualPct = data.costPrice > 0 ? (actualProfit / data.costPrice) * 100 : 0;

    return {
      costPrice: data.costPrice,
      targetProfitPercentage: targetPct,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      actualProfitAmount: Math.round(actualProfit * 100) / 100,
      actualProfitPercentage: Math.round(actualPct * 100) / 100,
      warnings,
    };
  }

  // ==================== PROFITABILITY REPORTS ====================

  async getMarginAnalysis(tenantId: string, filters: { category?: string; marginStatus?: string } = {}) {
    const where: any = { tenantId, isActive: true };
    if (filters.category) where.category = filters.category;

    const services = await prisma.serviceCatalog.findMany({ where, orderBy: { serviceName: 'asc' } });

    // Get category settings for target margins
    const catSettings = await prisma.categoryProfitSettings.findMany({ where: { tenantId } });
    const catMap = new Map(catSettings.map(c => [`${c.category}:${c.subcategory || ''}`, c]));

    let totalCost = 0, totalRevenue = 0;
    let aboveTarget = 0, atTarget = 0, belowTarget = 0, lowMargin = 0, lossMaking = 0;

    const analyzed = services.map(s => {
      const cost = s.costPrice || 0;
      const price = s.basePrice;
      const profit = price - cost;
      const marginPct = cost > 0 ? (profit / cost) * 100 : (price > 0 ? 999 : 0);

      // Get target from service or category
      const catKey = `${s.category}:${s.subcategory || ''}`;
      const catFallback = `${s.category}:`;
      const target = s.targetProfitPercentage || catMap.get(catKey)?.targetProfitPercentage || catMap.get(catFallback)?.targetProfitPercentage || 50;
      const minimum = catMap.get(catKey)?.minimumProfitPercentage || catMap.get(catFallback)?.minimumProfitPercentage || 0;

      let status: string;
      if (marginPct < 0) { status = 'loss_making'; lossMaking++; }
      else if (marginPct < 20) { status = 'low_margin'; lowMargin++; }
      else if (marginPct < target - 5) { status = 'below_target'; belowTarget++; }
      else if (marginPct <= target + 5) { status = 'at_target'; atTarget++; }
      else { status = 'above_target'; aboveTarget++; }

      totalCost += cost;
      totalRevenue += price;

      return {
        serviceId: s.id,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        category: s.category,
        subcategory: s.subcategory,
        costPrice: cost,
        sellingPrice: price,
        nhisPrice: s.nhisPrice,
        profitAmount: Math.round(profit * 100) / 100,
        profitMarginPercentage: cost > 0 ? Math.round(marginPct * 100) / 100 : null,
        nhisMarginPercentage: (cost > 0 && s.nhisPrice) ? Math.round(((s.nhisPrice - cost) / cost) * 10000) / 100 : null,
        targetMargin: target,
        marginStatus: status,
      };
    });

    // Filter by margin status if requested
    const filtered = filters.marginStatus
      ? analyzed.filter(s => s.marginStatus === filters.marginStatus)
      : analyzed;

    const avgMargin = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 10000) / 100 : 0;

    return {
      summary: {
        totalServices: services.length,
        averageMargin: avgMargin,
        aboveTarget,
        atTarget,
        belowTarget,
        lowMargin,
        lossMaking,
      },
      services: filtered.sort((a, b) => (a.profitMarginPercentage || 0) - (b.profitMarginPercentage || 0)),
    };
  }

  async getCategoryProfitability(tenantId: string) {
    const services = await prisma.serviceCatalog.findMany({
      where: { tenantId, isActive: true },
    });

    const categories: Record<string, { revenue: number; cost: number; count: number; services: string[] }> = {};

    for (const s of services) {
      const cat = s.category;
      if (!categories[cat]) categories[cat] = { revenue: 0, cost: 0, count: 0, services: [] };
      categories[cat].revenue += s.basePrice;
      categories[cat].cost += s.costPrice || 0;
      categories[cat].count++;
      categories[cat].services.push(s.serviceName);
    }

    return Object.entries(categories).map(([category, data]) => {
      const profit = data.revenue - data.cost;
      const margin = data.cost > 0 ? Math.round((profit / data.cost) * 10000) / 100 : 0;
      return {
        category,
        totalRevenue: Math.round(data.revenue * 100) / 100,
        totalCost: Math.round(data.cost * 100) / 100,
        totalProfit: Math.round(profit * 100) / 100,
        averageMargin: margin,
        serviceCount: data.count,
      };
    }).sort((a, b) => b.averageMargin - a.averageMargin);
  }

  async getLowMarginAlerts(tenantId: string) {
    const analysis = await this.getMarginAnalysis(tenantId);
    return analysis.services.filter(s =>
      s.marginStatus === 'loss_making' || s.marginStatus === 'low_margin' || s.marginStatus === 'below_target'
    );
  }
}

export const financeService = new FinanceService();
