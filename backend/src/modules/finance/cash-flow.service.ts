import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CashFlowService {
  /**
   * Generate Cash Flow Statement using indirect method
   * Based on journal entries categorized by account codes
   */
  async getCashFlowStatement(tenantId: string, startDate: Date, endDate: Date) {
    const dateFilter = {
      journalEntry: {
        tenantId,
        status: 'POSTED',
        entryDate: { gte: startDate, lte: endDate },
      },
    };

    // Helper: sum net movement for accounts matching code prefix
    const getNetMovement = async (codePrefix: string): Promise<number> => {
      const accounts = await prisma.chartOfAccount.findMany({
        where: { tenantId, accountCode: { startsWith: codePrefix }, isActive: true },
      });
      let total = 0;
      for (const acct of accounts) {
        const agg = await prisma.journalLine.aggregate({
          where: { accountId: acct.id, ...dateFilter },
          _sum: { debit: true, credit: true },
        });
        const debit = agg._sum.debit || 0;
        const credit = agg._sum.credit || 0;
        // For assets: increase = debit, decrease = credit
        // For liabilities/equity: increase = credit, decrease = debit
        if (['ASSET', 'EXPENSE'].includes(acct.accountType)) {
          total += debit - credit;
        } else {
          total += credit - debit;
        }
      }
      return total;
    };

    // Operating Activities
    const revenue = await getNetMovement('4');
    const cogs = await getNetMovement('5');
    const opex = await getNetMovement('6');
    const netIncome = revenue - cogs - opex;

    const arChange = await getNetMovement('11'); // Accounts Receivable changes
    const inventoryChange = await getNetMovement('12'); // Inventory changes
    const prepaidChange = await getNetMovement('14'); // Prepaid changes
    const apChange = await getNetMovement('20'); // Accounts Payable changes
    const depreciation = await getNetMovement('605'); // Depreciation (non-cash)

    const operatingCashFlow = netIncome + depreciation - arChange - inventoryChange - prepaidChange + apChange;

    // Investing Activities
    const fixedAssetChange = await getNetMovement('13'); // Fixed assets

    const investingCashFlow = -fixedAssetChange;

    // Financing Activities
    const loanChange = await getNetMovement('21'); // Long-term liabilities
    const equityChange = await getNetMovement('30'); // Equity

    const financingCashFlow = loanChange + equityChange;

    // Net change in cash
    const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;

    // Beginning cash balance
    const cashAccounts = await prisma.chartOfAccount.findMany({
      where: { tenantId, accountCode: { startsWith: '10' }, isActive: true },
    });
    let beginningCash = 0;
    for (const acct of cashAccounts) {
      const agg = await prisma.journalLine.aggregate({
        where: {
          accountId: acct.id,
          journalEntry: { tenantId, status: 'POSTED', entryDate: { lt: startDate } },
        },
        _sum: { debit: true, credit: true },
      });
      beginningCash += (agg._sum.debit || 0) - (agg._sum.credit || 0);
    }

    const endingCash = beginningCash + netCashChange;

    return {
      period: { startDate, endDate },
      operatingActivities: {
        netIncome,
        adjustments: {
          depreciation,
          accountsReceivableChange: -arChange,
          inventoryChange: -inventoryChange,
          prepaidChange: -prepaidChange,
          accountsPayableChange: apChange,
        },
        totalOperating: operatingCashFlow,
      },
      investingActivities: {
        fixedAssetPurchases: -fixedAssetChange,
        totalInvesting: investingCashFlow,
      },
      financingActivities: {
        loanProceeds: loanChange,
        equityContributions: equityChange,
        totalFinancing: financingCashFlow,
      },
      netCashChange,
      beginningCash,
      endingCash,
    };
  }

  // ==================== BUDGET MANAGEMENT ====================

  async createBudget(tenantId: string, data: {
    name: string;
    fiscalYear: number;
    items: { accountId: string; monthlyAmounts: number[] }[];
    createdBy: string;
  }) {
    // Store budget as a journal-like structure or custom table
    // For now, use a simple approach with a budget record
    const budget = await prisma.fiscalPeriod.create({
      data: {
        tenantId,
        name: `BUDGET-${data.name}-${data.fiscalYear}`,
        startDate: new Date(data.fiscalYear, 0, 1),
        endDate: new Date(data.fiscalYear, 11, 31),
        status: 'OPEN',
      },
    });

    return {
      id: budget.id,
      name: data.name,
      fiscalYear: data.fiscalYear,
      itemCount: data.items.length,
      totalBudget: data.items.reduce((sum, item) =>
        sum + item.monthlyAmounts.reduce((s, m) => s + m, 0), 0
      ),
    };
  }

  async getBudgetVsActual(tenantId: string, fiscalYear: number) {
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31);

    // Get all expense accounts with their actual amounts
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: { tenantId, accountType: 'EXPENSE', isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const items = [];
    let totalActual = 0;

    for (const acct of expenseAccounts) {
      const agg = await prisma.journalLine.aggregate({
        where: {
          accountId: acct.id,
          journalEntry: {
            tenantId,
            status: 'POSTED',
            entryDate: { gte: startDate, lte: endDate },
          },
        },
        _sum: { debit: true, credit: true },
      });
      const actual = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      if (actual !== 0) {
        items.push({
          accountCode: acct.accountCode,
          accountName: acct.accountName,
          actual,
          // Budget would come from a dedicated budget table in production
          budget: 0,
          variance: -actual,
          variancePercent: 0,
        });
        totalActual += actual;
      }
    }

    return {
      fiscalYear,
      items,
      totalActual,
      totalBudget: 0,
      totalVariance: -totalActual,
    };
  }
}

export const cashFlowService = new CashFlowService();
