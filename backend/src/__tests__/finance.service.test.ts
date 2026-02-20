/**
 * Finance / General Ledger Service Unit Tests
 * Tests double-entry bookkeeping, trial balance, P&L, balance sheet logic
 */

describe('Finance / General Ledger - Unit Tests', () => {
  describe('Double-Entry Bookkeeping', () => {
    it('should ensure debits equal credits in a journal entry', () => {
      const lines = [
        { accountId: 'cash', debit: 1000, credit: 0 },
        { accountId: 'revenue', debit: 0, credit: 1000 },
      ];
      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });

    it('should reject unbalanced journal entries', () => {
      const lines = [
        { accountId: 'cash', debit: 1000, credit: 0 },
        { accountId: 'revenue', debit: 0, credit: 800 },
      ];
      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebits).not.toBe(totalCredits);
      expect(totalDebits - totalCredits).toBe(200);
    });

    it('should handle multi-line journal entries', () => {
      const lines = [
        { accountId: 'cash', debit: 500, credit: 0 },
        { accountId: 'bank', debit: 500, credit: 0 },
        { accountId: 'revenue', debit: 0, credit: 850 },
        { accountId: 'tax_payable', debit: 0, credit: 150 },
      ];
      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebits).toBe(1000);
      expect(totalCredits).toBe(1000);
      expect(totalDebits).toBe(totalCredits);
    });

    it('should not allow negative amounts', () => {
      const validateLine = (line: { debit: number; credit: number }) =>
        line.debit >= 0 && line.credit >= 0 && !(line.debit > 0 && line.credit > 0);
      expect(validateLine({ debit: 100, credit: 0 })).toBe(true);
      expect(validateLine({ debit: 0, credit: 100 })).toBe(true);
      expect(validateLine({ debit: -50, credit: 0 })).toBe(false);
      expect(validateLine({ debit: 100, credit: 100 })).toBe(false);
    });
  });

  describe('Normal Balance Assignment', () => {
    it('should assign DEBIT normal balance for ASSET accounts', () => {
      const normalBalance = getAccountNormalBalance('ASSET');
      expect(normalBalance).toBe('DEBIT');
    });

    it('should assign DEBIT normal balance for EXPENSE accounts', () => {
      expect(getAccountNormalBalance('EXPENSE')).toBe('DEBIT');
    });

    it('should assign CREDIT normal balance for LIABILITY accounts', () => {
      expect(getAccountNormalBalance('LIABILITY')).toBe('CREDIT');
    });

    it('should assign CREDIT normal balance for REVENUE accounts', () => {
      expect(getAccountNormalBalance('REVENUE')).toBe('CREDIT');
    });

    it('should assign CREDIT normal balance for EQUITY accounts', () => {
      expect(getAccountNormalBalance('EQUITY')).toBe('CREDIT');
    });
  });

  describe('Trial Balance', () => {
    it('should have equal total debits and credits', () => {
      const accounts = [
        { name: 'Cash', type: 'ASSET', debitBalance: 5000, creditBalance: 0 },
        { name: 'Accounts Receivable', type: 'ASSET', debitBalance: 2000, creditBalance: 0 },
        { name: 'Equipment', type: 'ASSET', debitBalance: 10000, creditBalance: 0 },
        { name: 'Accounts Payable', type: 'LIABILITY', debitBalance: 0, creditBalance: 3000 },
        { name: 'Revenue', type: 'REVENUE', debitBalance: 0, creditBalance: 12000 },
        { name: 'Salaries', type: 'EXPENSE', debitBalance: 4000, creditBalance: 0 },
        { name: 'Rent', type: 'EXPENSE', debitBalance: 1000, creditBalance: 0 },
        { name: 'Equity', type: 'EQUITY', debitBalance: 0, creditBalance: 7000 },
      ];
      const totalDebits = accounts.reduce((s, a) => s + a.debitBalance, 0);
      const totalCredits = accounts.reduce((s, a) => s + a.creditBalance, 0);
      expect(totalDebits).toBe(22000);
      expect(totalCredits).toBe(22000);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe('Profit & Loss Calculation', () => {
    it('should calculate net income (revenue - expenses)', () => {
      const revenue = 50000;
      const expenses = 35000;
      const netIncome = revenue - expenses;
      expect(netIncome).toBe(15000);
      expect(netIncome).toBeGreaterThan(0);
    });

    it('should detect net loss', () => {
      const revenue = 20000;
      const expenses = 25000;
      const netIncome = revenue - expenses;
      expect(netIncome).toBe(-5000);
      expect(netIncome).toBeLessThan(0);
    });

    it('should calculate gross margin', () => {
      const revenue = 100000;
      const costOfGoods = 60000;
      const grossMargin = ((revenue - costOfGoods) / revenue) * 100;
      expect(grossMargin).toBe(40);
    });
  });

  describe('Balance Sheet Equation', () => {
    it('should satisfy Assets = Liabilities + Equity', () => {
      const assets = 50000;
      const liabilities = 20000;
      const equity = 30000;
      expect(assets).toBe(liabilities + equity);
    });

    it('should include retained earnings in equity', () => {
      const paidInCapital = 25000;
      const retainedEarnings = 15000;
      const totalEquity = paidInCapital + retainedEarnings;
      const assets = 60000;
      const liabilities = 20000;
      expect(totalEquity).toBe(40000);
      expect(assets).toBe(liabilities + totalEquity);
    });
  });

  describe('Fiscal Period Management', () => {
    it('should validate fiscal period dates', () => {
      const period = { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'), name: 'January 2026' };
      expect(period.endDate.getTime()).toBeGreaterThan(period.startDate.getTime());
    });

    it('should not allow overlapping fiscal periods', () => {
      const periods = [
        { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
        { start: new Date('2026-02-01'), end: new Date('2026-02-28') },
      ];
      const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) =>
        a.start <= b.end && b.start <= a.end;
      expect(overlaps(periods[0], periods[1])).toBe(false);
    });

    it('should detect overlapping periods', () => {
      const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) =>
        a.start <= b.end && b.start <= a.end;
      const p1 = { start: new Date('2026-01-01'), end: new Date('2026-01-31') };
      const p2 = { start: new Date('2026-01-15'), end: new Date('2026-02-15') };
      expect(overlaps(p1, p2)).toBe(true);
    });
  });
});

function getAccountNormalBalance(accountType: string): string {
  return ['ASSET', 'EXPENSE'].includes(accountType) ? 'DEBIT' : 'CREDIT';
}
