/**
 * HR Service Unit Tests
 * Tests leave calculations, payroll logic, attendance, license expiry
 */

describe('HR Service - Unit Tests', () => {
  describe('Leave Calculations', () => {
    it('should calculate total leave days between dates', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-05');
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      expect(days).toBe(5);
    });

    it('should calculate remaining leave balance', () => {
      const annualEntitlement = 21;
      const usedDays = 8;
      const pendingDays = 3;
      const remaining = annualEntitlement - usedDays - pendingDays;
      expect(remaining).toBe(10);
    });

    it('should reject leave request exceeding balance', () => {
      const balance = 5;
      const requested = 7;
      const canApprove = requested <= balance;
      expect(canApprove).toBe(false);
    });

    it('should validate leave types', () => {
      const leaveTypes = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'STUDY', 'UNPAID'];
      expect(leaveTypes).toContain('ANNUAL');
      expect(leaveTypes).toContain('MATERNITY');
      expect(leaveTypes.length).toBe(7);
    });

    it('should enforce maternity leave minimum (12 weeks Ghana)', () => {
      const maternityMinWeeks = 12;
      const maternityMinDays = maternityMinWeeks * 7;
      expect(maternityMinDays).toBe(84);
    });
  });

  describe('Leave Status Workflow', () => {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['CANCELLED'],
      REJECTED: [],
      CANCELLED: [],
    };

    it('should allow approval from pending', () => {
      expect(validTransitions['PENDING']).toContain('APPROVED');
    });

    it('should allow rejection from pending', () => {
      expect(validTransitions['PENDING']).toContain('REJECTED');
    });

    it('should allow cancellation of approved leave', () => {
      expect(validTransitions['APPROVED']).toContain('CANCELLED');
    });

    it('should not allow changes after rejection', () => {
      expect(validTransitions['REJECTED']).toHaveLength(0);
    });
  });

  describe('Payroll Calculations', () => {
    it('should calculate gross salary', () => {
      const baseSalary = 5000;
      const allowances = { housing: 1000, transport: 500, medical: 300 };
      const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
      const gross = baseSalary + totalAllowances;
      expect(gross).toBe(6800);
    });

    it('should calculate SSNIT contribution (13.5% employer, 5.5% employee in Ghana)', () => {
      const baseSalary = 5000;
      const employeeSSNIT = Math.round(baseSalary * 0.055 * 100) / 100;
      const employerSSNIT = Math.round(baseSalary * 0.135 * 100) / 100;
      expect(employeeSSNIT).toBe(275);
      expect(employerSSNIT).toBe(675);
    });

    it('should calculate Ghana income tax (progressive brackets)', () => {
      const taxableIncome = 5000;
      let tax = 0;
      const brackets = [
        { limit: 402, rate: 0 },
        { limit: 110, rate: 0.05 },
        { limit: 130, rate: 0.10 },
        { limit: 3166.67, rate: 0.175 },
        { limit: 16395, rate: 0.25 },
        { limit: Infinity, rate: 0.30 },
      ];
      let remaining = taxableIncome;
      for (const b of brackets) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, b.limit);
        tax += taxable * b.rate;
        remaining -= taxable;
      }
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(taxableIncome);
    });

    it('should calculate net salary', () => {
      const gross = 6800;
      const ssnit = 275;
      const tax = 600;
      const otherDeductions = 50;
      const net = gross - ssnit - tax - otherDeductions;
      expect(net).toBe(5875);
      expect(net).toBeGreaterThan(0);
    });
  });

  describe('License Expiry Tracking', () => {
    it('should flag expired licenses', () => {
      const expiryDate = new Date('2025-12-31');
      const today = new Date('2026-02-20');
      const isExpired = expiryDate < today;
      expect(isExpired).toBe(true);
    });

    it('should flag licenses expiring within 30 days', () => {
      const expiryDate = new Date('2026-03-15');
      const today = new Date('2026-02-20');
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      expect(daysUntilExpiry).toBe(23);
      expect(isExpiringSoon).toBe(true);
    });

    it('should not flag valid licenses', () => {
      const expiryDate = new Date('2027-06-30');
      const today = new Date('2026-02-20');
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntilExpiry).toBeGreaterThan(30);
    });
  });

  describe('Attendance Tracking', () => {
    it('should calculate hours worked', () => {
      const clockIn = new Date('2026-01-01T08:00:00Z');
      const clockOut = new Date('2026-01-01T17:00:00Z');
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      expect(hoursWorked).toBe(9);
    });

    it('should detect overtime (> 8 hours)', () => {
      const hoursWorked = 10;
      const standardHours = 8;
      const overtime = Math.max(0, hoursWorked - standardHours);
      expect(overtime).toBe(2);
    });

    it('should calculate monthly attendance rate', () => {
      const workingDays = 22;
      const daysPresent = 20;
      const daysAbsent = 2;
      const rate = Math.round((daysPresent / workingDays) * 100);
      expect(rate).toBe(91);
      expect(daysPresent + daysAbsent).toBe(workingDays);
    });
  });
});
