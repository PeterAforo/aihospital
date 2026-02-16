import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

interface CreateJournalEntryInput {
  description: string;
  reference?: string;
  sourceModule?: string;
  sourceId?: string;
  entryDate?: Date;
  lines: JournalLineInput[];
}

class GeneralLedgerService {
  // ==================== CHART OF ACCOUNTS ====================

  async createAccount(tenantId: string, data: {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    parentId?: string;
    description?: string;
    normalBalance?: string;
  }) {
    return prisma.chartOfAccount.create({
      data: {
        tenantId,
        accountCode: data.accountCode,
        accountName: data.accountName,
        accountType: data.accountType,
        parentId: data.parentId,
        description: data.description,
        normalBalance: data.normalBalance || (
          ['ASSET', 'EXPENSE'].includes(data.accountType) ? 'DEBIT' : 'CREDIT'
        ),
      },
    });
  }

  async getAccounts(tenantId: string, accountType?: AccountType) {
    const where: any = { tenantId };
    if (accountType) where.accountType = accountType;

    return prisma.chartOfAccount.findMany({
      where,
      include: { children: true },
      orderBy: { accountCode: 'asc' },
    });
  }

  async getAccountById(id: string) {
    return prisma.chartOfAccount.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }

  async updateAccount(id: string, data: {
    accountName?: string;
    description?: string;
    isActive?: boolean;
  }) {
    return prisma.chartOfAccount.update({
      where: { id },
      data,
    });
  }

  async seedDefaultAccounts(tenantId: string) {
    const defaults = [
      // Assets
      { code: '1000', name: 'Cash and Bank', type: 'ASSET' as AccountType },
      { code: '1010', name: 'Cash on Hand', type: 'ASSET' as AccountType },
      { code: '1020', name: 'Bank Account - Main', type: 'ASSET' as AccountType },
      { code: '1030', name: 'Mobile Money Account', type: 'ASSET' as AccountType },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as AccountType },
      { code: '1110', name: 'Patient Receivables', type: 'ASSET' as AccountType },
      { code: '1120', name: 'NHIS Receivables', type: 'ASSET' as AccountType },
      { code: '1130', name: 'Insurance Receivables', type: 'ASSET' as AccountType },
      { code: '1200', name: 'Inventory', type: 'ASSET' as AccountType },
      { code: '1210', name: 'Pharmacy Inventory', type: 'ASSET' as AccountType },
      { code: '1220', name: 'Medical Supplies', type: 'ASSET' as AccountType },
      { code: '1300', name: 'Fixed Assets', type: 'ASSET' as AccountType },
      { code: '1310', name: 'Medical Equipment', type: 'ASSET' as AccountType },
      { code: '1320', name: 'Furniture & Fixtures', type: 'ASSET' as AccountType },
      { code: '1400', name: 'Prepaid Expenses', type: 'ASSET' as AccountType },
      // Liabilities
      { code: '2000', name: 'Current Liabilities', type: 'LIABILITY' as AccountType },
      { code: '2010', name: 'Accounts Payable', type: 'LIABILITY' as AccountType },
      { code: '2020', name: 'Supplier Payables', type: 'LIABILITY' as AccountType },
      { code: '2030', name: 'Salaries Payable', type: 'LIABILITY' as AccountType },
      { code: '2040', name: 'Tax Payable', type: 'LIABILITY' as AccountType },
      { code: '2050', name: 'SSNIT Payable', type: 'LIABILITY' as AccountType },
      { code: '2100', name: 'Long-term Liabilities', type: 'LIABILITY' as AccountType },
      { code: '2110', name: 'Bank Loans', type: 'LIABILITY' as AccountType },
      // Equity
      { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY' as AccountType },
      { code: '3010', name: 'Capital', type: 'EQUITY' as AccountType },
      { code: '3020', name: 'Retained Earnings', type: 'EQUITY' as AccountType },
      // Revenue
      { code: '4000', name: 'Revenue', type: 'REVENUE' as AccountType },
      { code: '4010', name: 'Consultation Revenue', type: 'REVENUE' as AccountType },
      { code: '4020', name: 'Pharmacy Revenue', type: 'REVENUE' as AccountType },
      { code: '4030', name: 'Laboratory Revenue', type: 'REVENUE' as AccountType },
      { code: '4040', name: 'Radiology Revenue', type: 'REVENUE' as AccountType },
      { code: '4050', name: 'Surgical Revenue', type: 'REVENUE' as AccountType },
      { code: '4060', name: 'Inpatient Revenue', type: 'REVENUE' as AccountType },
      { code: '4070', name: 'NHIS Revenue', type: 'REVENUE' as AccountType },
      { code: '4080', name: 'Insurance Revenue', type: 'REVENUE' as AccountType },
      { code: '4090', name: 'Other Revenue', type: 'REVENUE' as AccountType },
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as AccountType },
      { code: '5010', name: 'Drug Purchases', type: 'EXPENSE' as AccountType },
      { code: '5020', name: 'Medical Supplies Cost', type: 'EXPENSE' as AccountType },
      { code: '5030', name: 'Lab Reagent Cost', type: 'EXPENSE' as AccountType },
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' as AccountType },
      { code: '6010', name: 'Salaries & Wages', type: 'EXPENSE' as AccountType },
      { code: '6020', name: 'Utilities', type: 'EXPENSE' as AccountType },
      { code: '6030', name: 'Rent', type: 'EXPENSE' as AccountType },
      { code: '6040', name: 'Insurance Expense', type: 'EXPENSE' as AccountType },
      { code: '6050', name: 'Depreciation', type: 'EXPENSE' as AccountType },
      { code: '6060', name: 'Maintenance & Repairs', type: 'EXPENSE' as AccountType },
      { code: '6070', name: 'Office Supplies', type: 'EXPENSE' as AccountType },
      { code: '6080', name: 'Transport & Fuel', type: 'EXPENSE' as AccountType },
      { code: '6090', name: 'Professional Fees', type: 'EXPENSE' as AccountType },
      { code: '6100', name: 'Marketing & Advertising', type: 'EXPENSE' as AccountType },
      { code: '6110', name: 'Miscellaneous Expense', type: 'EXPENSE' as AccountType },
    ];

    const created = [];
    for (const acct of defaults) {
      const existing = await prisma.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId, accountCode: acct.code } },
      });
      if (!existing) {
        const record = await prisma.chartOfAccount.create({
          data: {
            tenantId,
            accountCode: acct.code,
            accountName: acct.name,
            accountType: acct.type,
            normalBalance: ['ASSET', 'EXPENSE'].includes(acct.type) ? 'DEBIT' : 'CREDIT',
          },
        });
        created.push(record);
      }
    }
    return { created: created.length, total: defaults.length };
  }

  // ==================== JOURNAL ENTRIES ====================

  async createJournalEntry(tenantId: string, userId: string, data: CreateJournalEntryInput) {
    // Validate double-entry: total debits must equal total credits
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry not balanced. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`);
    }

    if (data.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    // Generate entry number
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const entryNumber = `JE-${year}-${String(count + 1).padStart(6, '0')}`;

    return prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        entryDate: data.entryDate || new Date(),
        description: data.description,
        reference: data.reference,
        sourceModule: data.sourceModule,
        sourceId: data.sourceId,
        postedBy: userId,
        lines: {
          create: data.lines.map(l => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async getJournalEntries(tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    sourceModule?: string;
    limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.sourceModule) where.sourceModule = filters.sourceModule;
    if (filters?.startDate || filters?.endDate) {
      where.entryDate = {};
      if (filters.startDate) where.entryDate.gte = filters.startDate;
      if (filters.endDate) where.entryDate.lte = filters.endDate;
    }

    return prisma.journalEntry.findMany({
      where,
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: 'desc' },
      take: filters?.limit || 50,
    });
  }

  async reverseJournalEntry(tenantId: string, entryId: string, userId: string, reason: string) {
    const original = await prisma.journalEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { lines: true },
    });

    if (!original) throw new Error('Journal entry not found');
    if (original.status === 'REVERSED') throw new Error('Entry already reversed');

    // Create reversal entry with swapped debits/credits
    const reversalLines = original.lines.map(l => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal: ${l.description || ''}`,
    }));

    const reversal = await this.createJournalEntry(tenantId, userId, {
      description: `Reversal of ${original.entryNumber}: ${reason}`,
      reference: original.entryNumber,
      sourceModule: 'MANUAL',
      lines: reversalLines,
    });

    // Mark original as reversed
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { status: 'REVERSED', reversedById: reversal.id },
    });

    return reversal;
  }

  // ==================== TRIAL BALANCE ====================

  async getTrialBalance(tenantId: string, asOfDate?: Date) {
    const dateFilter = asOfDate || new Date();

    const accounts = await prisma.chartOfAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const result = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const aggregation = await prisma.journalLine.aggregate({
        where: {
          accountId: account.id,
          journalEntry: {
            tenantId,
            status: 'POSTED',
            entryDate: { lte: dateFilter },
          },
        },
        _sum: { debit: true, credit: true },
      });

      const debitSum = aggregation._sum.debit || 0;
      const creditSum = aggregation._sum.credit || 0;
      const balance = debitSum - creditSum;

      if (debitSum === 0 && creditSum === 0) continue; // Skip zero-balance accounts

      const entry = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debitBalance: balance > 0 ? balance : 0,
        creditBalance: balance < 0 ? Math.abs(balance) : 0,
      };

      totalDebit += entry.debitBalance;
      totalCredit += entry.creditBalance;
      result.push(entry);
    }

    return {
      asOfDate: dateFilter,
      accounts: result,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  // ==================== P&L STATEMENT ====================

  async getProfitAndLoss(tenantId: string, startDate: Date, endDate: Date) {
    const dateFilter = {
      journalEntry: {
        tenantId,
        status: 'POSTED',
        entryDate: { gte: startDate, lte: endDate },
      },
    };

    // Revenue accounts (4xxx)
    const revenueAccounts = await prisma.chartOfAccount.findMany({
      where: { tenantId, accountType: 'REVENUE', isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const revenueItems = [];
    let totalRevenue = 0;

    for (const acct of revenueAccounts) {
      const agg = await prisma.journalLine.aggregate({
        where: { accountId: acct.id, ...dateFilter },
        _sum: { debit: true, credit: true },
      });
      const amount = (agg._sum.credit || 0) - (agg._sum.debit || 0);
      if (amount !== 0) {
        revenueItems.push({ accountCode: acct.accountCode, accountName: acct.accountName, amount });
        totalRevenue += amount;
      }
    }

    // Expense accounts (5xxx, 6xxx)
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: { tenantId, accountType: 'EXPENSE', isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const cogsItems: any[] = [];
    const operatingItems: any[] = [];
    let totalCOGS = 0;
    let totalOperating = 0;

    for (const acct of expenseAccounts) {
      const agg = await prisma.journalLine.aggregate({
        where: { accountId: acct.id, ...dateFilter },
        _sum: { debit: true, credit: true },
      });
      const amount = (agg._sum.debit || 0) - (agg._sum.credit || 0);
      if (amount !== 0) {
        const item = { accountCode: acct.accountCode, accountName: acct.accountName, amount };
        if (acct.accountCode.startsWith('5')) {
          cogsItems.push(item);
          totalCOGS += amount;
        } else {
          operatingItems.push(item);
          totalOperating += amount;
        }
      }
    }

    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalOperating;

    return {
      period: { startDate, endDate },
      revenue: { items: revenueItems, total: totalRevenue },
      costOfGoodsSold: { items: cogsItems, total: totalCOGS },
      grossProfit,
      operatingExpenses: { items: operatingItems, total: totalOperating },
      netIncome,
    };
  }

  // ==================== BALANCE SHEET ====================

  async getBalanceSheet(tenantId: string, asOfDate?: Date) {
    const dateFilter = asOfDate || new Date();

    const getTypeBalance = async (accountType: AccountType) => {
      const accounts = await prisma.chartOfAccount.findMany({
        where: { tenantId, accountType, isActive: true },
        orderBy: { accountCode: 'asc' },
      });

      const items = [];
      let total = 0;

      for (const acct of accounts) {
        const agg = await prisma.journalLine.aggregate({
          where: {
            accountId: acct.id,
            journalEntry: { tenantId, status: 'POSTED', entryDate: { lte: dateFilter } },
          },
          _sum: { debit: true, credit: true },
        });

        const debit = agg._sum.debit || 0;
        const credit = agg._sum.credit || 0;
        const balance = ['ASSET', 'EXPENSE'].includes(accountType)
          ? debit - credit
          : credit - debit;

        if (balance !== 0) {
          items.push({ accountCode: acct.accountCode, accountName: acct.accountName, balance });
          total += balance;
        }
      }

      return { items, total };
    };

    const assets = await getTypeBalance('ASSET');
    const liabilities = await getTypeBalance('LIABILITY');
    const equity = await getTypeBalance('EQUITY');

    // Calculate retained earnings from P&L
    const startOfYear = new Date(dateFilter.getFullYear(), 0, 1);
    const pnl = await this.getProfitAndLoss(tenantId, startOfYear, dateFilter);

    return {
      asOfDate: dateFilter,
      assets,
      liabilities,
      equity: {
        items: [...equity.items, { accountCode: 'RE', accountName: 'Current Year Earnings', balance: pnl.netIncome }],
        total: equity.total + pnl.netIncome,
      },
      totalAssets: assets.total,
      totalLiabilitiesAndEquity: liabilities.total + equity.total + pnl.netIncome,
      isBalanced: Math.abs(assets.total - (liabilities.total + equity.total + pnl.netIncome)) < 0.01,
    };
  }

  // ==================== FISCAL PERIODS ====================

  async createFiscalPeriod(tenantId: string, data: { name: string; startDate: Date; endDate: Date }) {
    return prisma.fiscalPeriod.create({
      data: { tenantId, ...data },
    });
  }

  async closeFiscalPeriod(tenantId: string, periodId: string, userId: string) {
    const period = await prisma.fiscalPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) throw new Error('Fiscal period not found');
    if (period.status !== 'OPEN') throw new Error('Period is not open');

    // Verify trial balance is balanced
    const tb = await this.getTrialBalance(tenantId, period.endDate);
    if (!tb.isBalanced) {
      throw new Error('Cannot close period: trial balance is not balanced');
    }

    return prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: { status: 'CLOSED', closedBy: userId, closedAt: new Date() },
    });
  }

  async getFiscalPeriods(tenantId: string) {
    return prisma.fiscalPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }
}

export const generalLedgerService = new GeneralLedgerService();
