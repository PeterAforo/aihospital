import { Router, Response } from 'express';
import { authenticate, requirePermission, authorize, AuthRequest } from '../../common/middleware/auth.js';
import { financeService } from './finance.service.js';
import { seedServiceCatalog } from './seed-service-catalog.js';
import { ServiceCategory, AccountType } from '@prisma/client';
import { generalLedgerService } from './general-ledger.service';
import { cashFlowService } from './cash-flow.service';

const router: Router = Router();

router.use(authenticate);

// ==================== SERVICE CATALOG ====================

/**
 * GET /api/finance/services
 * List all services in catalog
 */
router.get('/services', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, nhisOnly, active, search, page, limit } = req.query;

    const result = await financeService.listServices(user.tenantId, {
      category: category as ServiceCategory | undefined,
      nhisOnly: nhisOnly === 'true',
      active: active !== undefined ? active === 'true' : true,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/services/:id
 * Get service details with branch pricing and history
 */
router.get('/services/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const service = await financeService.getServiceById(user.tenantId, req.params.id);
    res.json({ success: true, data: service });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/services
 * Create new service in catalog
 */
router.post('/services', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { serviceCode, serviceName, category, subcategory, description, basePrice, unit, isNhisCovered, nhisPrice, nhisCode, requiresNhisPreauth, isTaxable, taxRate } = req.body;

    if (!serviceCode || !serviceName || !category || basePrice === undefined) {
      return res.status(400).json({ success: false, error: 'serviceCode, serviceName, category, and basePrice are required' });
    }

    const service = await financeService.createService(user.tenantId, user.userId, {
      serviceCode, serviceName, category, subcategory, description,
      basePrice: parseFloat(basePrice),
      unit, isNhisCovered, nhisPrice: nhisPrice !== undefined ? parseFloat(nhisPrice) : undefined,
      nhisCode, requiresNhisPreauth, isTaxable, taxRate: taxRate !== undefined ? parseFloat(taxRate) : undefined,
    });

    res.status(201).json({ success: true, data: service });
  } catch (error: any) {
    const status = error.message.includes('already exists') ? 409 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/finance/services/:id
 * Update service details (not price - use price endpoint for that)
 */
router.put('/services/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const service = await financeService.updateService(user.tenantId, req.params.id, req.body);
    res.json({ success: true, data: service });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/finance/services/:id/price
 * Update service price (creates price history)
 */
router.put('/services/:id/price', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { newPrice, changeReason, effectiveDate } = req.body;

    if (newPrice === undefined || newPrice < 0) {
      return res.status(400).json({ success: false, error: 'newPrice is required and must be >= 0' });
    }

    const result = await financeService.updateServicePrice(user.tenantId, req.params.id, user.userId, {
      newPrice: parseFloat(newPrice),
      changeReason,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/finance/services/:id/toggle
 * Toggle service active/inactive
 */
router.patch('/services/:id/toggle', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const service = await financeService.toggleServiceActive(user.tenantId, req.params.id);
    res.json({ success: true, data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/services/:id/history
 * Get price history for a service
 */
router.get('/services/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const history = await financeService.getPriceHistory(user.tenantId, req.params.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BRANCH PRICING ====================

/**
 * GET /api/finance/branches/:branchId/pricing
 * Get all branch-specific prices compared to org defaults
 */
router.get('/branches/:branchId/pricing', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const pricing = await financeService.getBranchPricing(user.tenantId, req.params.branchId);
    res.json({ success: true, data: pricing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/branches/:branchId/pricing
 * Set branch-specific price override
 */
router.post('/branches/:branchId/pricing', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { serviceId, branchPrice, reason, effectiveFrom } = req.body;

    if (!serviceId || branchPrice === undefined) {
      return res.status(400).json({ success: false, error: 'serviceId and branchPrice are required' });
    }

    const result = await financeService.setBranchPrice(req.params.branchId, user.userId, {
      serviceId,
      branchPrice: parseFloat(branchPrice),
      reason,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/finance/branches/:branchId/pricing/:id
 * Remove branch price override (revert to org default)
 */
router.delete('/branches/:branchId/pricing/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    await financeService.removeBranchPrice(req.params.branchId, req.params.id);
    res.json({ success: true, message: 'Branch price override removed' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// ==================== PRICE CALCULATION ====================

/**
 * POST /api/finance/calculate-price
 * Calculate final price for a service (used by billing)
 */
router.post('/calculate-price', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { serviceId, serviceCode, branchId, patientId, quantity, discountSchemeId } = req.body;

    if (!serviceId && !serviceCode) {
      return res.status(400).json({ success: false, error: 'serviceId or serviceCode is required' });
    }

    const result = await financeService.calculatePrice(user.tenantId, {
      serviceId, serviceCode, branchId, patientId,
      quantity: quantity ? parseInt(quantity) : 1,
      discountSchemeId,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// ==================== DISCOUNT SCHEMES ====================

/**
 * GET /api/finance/discounts
 * List all discount schemes
 */
router.get('/discounts', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const schemes = await financeService.listDiscountSchemes(user.tenantId);
    res.json({ success: true, data: schemes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/discounts
 * Create a discount scheme
 */
router.post('/discounts', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { schemeName, discountType, discountValue, appliesTo, eligibilityCriteria } = req.body;

    if (!schemeName || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, error: 'schemeName, discountType, and discountValue are required' });
    }

    const scheme = await financeService.createDiscountScheme(user.tenantId, {
      schemeName, discountType, discountValue: parseFloat(discountValue), appliesTo, eligibilityCriteria,
    });

    res.status(201).json({ success: true, data: scheme });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPORTING ====================

/**
 * GET /api/finance/price-comparison
 * Compare prices across branches
 */
router.get('/price-comparison', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category } = req.query;
    const comparison = await financeService.getPriceComparison(
      user.tenantId,
      category as ServiceCategory | undefined
    );
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/bulk-update
 * Bulk update prices (e.g., increase all lab tests by 10%)
 */
router.post('/bulk-update', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, adjustmentType, adjustmentValue, reason } = req.body;

    if (!adjustmentType || adjustmentValue === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'adjustmentType, adjustmentValue, and reason are required' });
    }

    const result = await financeService.bulkUpdatePrices(user.tenantId, user.userId, {
      category: category as ServiceCategory | undefined,
      adjustmentType,
      adjustmentValue: parseFloat(adjustmentValue),
      reason,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COST MANAGEMENT ====================

/**
 * PUT /api/finance/services/:id/cost
 * Update service cost price (creates cost history)
 */
router.put('/services/:id/cost', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { newCostPrice, changeReason, effectiveDate } = req.body;
    if (newCostPrice === undefined || newCostPrice < 0) {
      return res.status(400).json({ success: false, error: 'newCostPrice is required and must be >= 0' });
    }
    const result = await financeService.updateServiceCost(user.tenantId, req.params.id, user.userId, {
      newCostPrice: parseFloat(newCostPrice),
      changeReason,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/services/:id/cost-breakdown
 * Set cost component breakdown for a service
 */
router.post('/services/:id/cost-breakdown', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { components } = req.body;
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ success: false, error: 'components array is required' });
    }
    const result = await financeService.setCostBreakdown(req.params.id, user.tenantId, components);
    res.json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/services/:id/cost-breakdown
 * Get cost component breakdown
 */
router.get('/services/:id/cost-breakdown', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await financeService.getCostBreakdown(req.params.id, user.tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/services/:id/cost-history
 * Get cost change history
 */
router.get('/services/:id/cost-history', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const history = await financeService.getCostHistory(req.params.id, user.tenantId);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CATEGORY PROFIT SETTINGS ====================

/**
 * GET /api/finance/category-settings
 * List all category profit settings
 */
router.get('/category-settings', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const settings = await financeService.listCategoryProfitSettings(user.tenantId);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/category-settings
 * Create or update category profit settings
 */
router.post('/category-settings', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'ACCOUNTANT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, subcategory, targetProfitPercentage, minimumProfitPercentage, pricingStrategy, autoAdjustPrices } = req.body;
    if (!category || targetProfitPercentage === undefined) {
      return res.status(400).json({ success: false, error: 'category and targetProfitPercentage are required' });
    }
    const result = await financeService.upsertCategoryProfitSettings(user.tenantId, {
      category, subcategory,
      targetProfitPercentage: parseFloat(targetProfitPercentage),
      minimumProfitPercentage: minimumProfitPercentage !== undefined ? parseFloat(minimumProfitPercentage) : undefined,
      pricingStrategy, autoAdjustPrices,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRICING RECOMMENDATIONS ====================

/**
 * POST /api/finance/calculate-recommended-price
 * Calculate optimal price based on cost and target margin
 */
router.post('/calculate-recommended-price', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { costPrice, targetProfitPercentage, category, subcategory } = req.body;
    if (costPrice === undefined) {
      return res.status(400).json({ success: false, error: 'costPrice is required' });
    }
    const result = await financeService.calculateRecommendedPrice(user.tenantId, {
      costPrice: parseFloat(costPrice),
      targetProfitPercentage: targetProfitPercentage !== undefined ? parseFloat(targetProfitPercentage) : undefined,
      category, subcategory,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PROFITABILITY REPORTS ====================

/**
 * GET /api/finance/reports/margin-analysis
 * Overall margin analysis with profitability tiers
 */
router.get('/reports/margin-analysis', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, marginStatus } = req.query;
    const result = await financeService.getMarginAnalysis(user.tenantId, {
      category: category as string | undefined,
      marginStatus: marginStatus as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/category-profitability
 * Profitability summary by category
 */
router.get('/reports/category-profitability', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await financeService.getCategoryProfitability(user.tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/low-margin-alerts
 * Services below minimum acceptable margin
 */
router.get('/reports/low-margin-alerts', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const alerts = await financeService.getLowMarginAlerts(user.tenantId);
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SEED ====================

/**
 * POST /api/finance/seed
 * Seed service catalog with Ghana standard prices (admin only)
 */
router.post('/seed', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN', 'MEDICAL_DIRECTOR'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await seedServiceCatalog(user.tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GENERAL LEDGER ====================

// Chart of Accounts
router.get('/gl/accounts', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { accountType } = req.query;
    const accounts = await generalLedgerService.getAccounts(user.tenantId, accountType as AccountType | undefined);
    res.json({ success: true, data: accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gl/accounts', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const account = await generalLedgerService.createAccount(user.tenantId, req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/gl/accounts/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const account = await generalLedgerService.updateAccount(req.params.id, req.body);
    res.json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gl/accounts/seed', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await generalLedgerService.seedDefaultAccounts(user.tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Journal Entries
router.get('/gl/journal-entries', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate, status, sourceModule, limit } = req.query;
    const entries = await generalLedgerService.getJournalEntries(user.tenantId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as string,
      sourceModule: sourceModule as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gl/journal-entries', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const entry = await generalLedgerService.createJournalEntry(user.tenantId, user.userId, req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/gl/journal-entries/:id/reverse', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { reason } = req.body;
    const reversal = await generalLedgerService.reverseJournalEntry(user.tenantId, req.params.id, user.userId, reason || 'Reversal');
    res.json({ success: true, data: reversal });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reports
router.get('/gl/trial-balance', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { asOfDate } = req.query;
    const tb = await generalLedgerService.getTrialBalance(user.tenantId, asOfDate ? new Date(asOfDate as string) : undefined);
    res.json({ success: true, data: tb });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gl/profit-and-loss', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }
    const pnl = await generalLedgerService.getProfitAndLoss(user.tenantId, new Date(startDate as string), new Date(endDate as string));
    res.json({ success: true, data: pnl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gl/balance-sheet', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { asOfDate } = req.query;
    const bs = await generalLedgerService.getBalanceSheet(user.tenantId, asOfDate ? new Date(asOfDate as string) : undefined);
    res.json({ success: true, data: bs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fiscal Periods
router.get('/gl/fiscal-periods', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const periods = await generalLedgerService.getFiscalPeriods(user.tenantId);
    res.json({ success: true, data: periods });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gl/fiscal-periods', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const period = await generalLedgerService.createFiscalPeriod(user.tenantId, {
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    });
    res.status(201).json({ success: true, data: period });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gl/fiscal-periods/:id/close', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await generalLedgerService.closeFiscalPeriod(user.tenantId, req.params.id, user.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== CASH FLOW & BUDGET ====================

router.get('/gl/cash-flow', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }
    const cf = await cashFlowService.getCashFlowStatement(user.tenantId, new Date(startDate as string), new Date(endDate as string));
    res.json({ success: true, data: cf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gl/budget-vs-actual', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { fiscalYear } = req.query;
    const year = fiscalYear ? parseInt(fiscalYear as string) : new Date().getFullYear();
    const result = await cashFlowService.getBudgetVsActual(user.tenantId, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
