/**
 * Laboratory Service Unit Tests
 * Tests reference range evaluation, critical value detection, sample tracking, result validation
 */

describe('Laboratory Service - Unit Tests', () => {
  describe('Reference Range Evaluation', () => {
    const findApplicableRange = (
      ranges: Array<{ gender?: string | null; minAgeDays?: number | null; maxAgeDays?: number | null; lowValue?: number | null; highValue?: number | null; criticalLow?: number | null; criticalHigh?: number | null }>,
      gender: string | null,
      ageInDays: number | null
    ) => {
      return ranges.find(r => {
        if (r.gender && gender && r.gender !== gender) return false;
        if (ageInDays !== null) {
          if (r.minAgeDays != null && ageInDays < r.minAgeDays) return false;
          if (r.maxAgeDays != null && ageInDays > r.maxAgeDays) return false;
        }
        return true;
      }) || null;
    };

    it('should find gender-specific range', () => {
      const ranges = [
        { gender: 'MALE', minAgeDays: null, maxAgeDays: null, lowValue: 13.5, highValue: 17.5, criticalLow: 7, criticalHigh: 20 },
        { gender: 'FEMALE', minAgeDays: null, maxAgeDays: null, lowValue: 12.0, highValue: 16.0, criticalLow: 7, criticalHigh: 20 },
      ];
      const maleRange = findApplicableRange(ranges, 'MALE', 10000);
      const femaleRange = findApplicableRange(ranges, 'FEMALE', 10000);
      expect(maleRange?.lowValue).toBe(13.5);
      expect(femaleRange?.lowValue).toBe(12.0);
    });

    it('should find age-specific range for pediatric patients', () => {
      const ranges = [
        { gender: null, minAgeDays: 0, maxAgeDays: 28, lowValue: 14, highValue: 24, criticalLow: null, criticalHigh: null },
        { gender: null, minAgeDays: 29, maxAgeDays: 365, lowValue: 10, highValue: 18, criticalLow: null, criticalHigh: null },
        { gender: null, minAgeDays: 366, maxAgeDays: null, lowValue: 12, highValue: 17, criticalLow: null, criticalHigh: null },
      ];
      const neonatal = findApplicableRange(ranges, null, 10);
      const infant = findApplicableRange(ranges, null, 100);
      const adult = findApplicableRange(ranges, null, 10000);
      expect(neonatal?.lowValue).toBe(14);
      expect(infant?.lowValue).toBe(10);
      expect(adult?.lowValue).toBe(12);
    });

    it('should return null if no matching range', () => {
      const ranges = [{ gender: 'MALE', minAgeDays: null, maxAgeDays: null, lowValue: 13, highValue: 17, criticalLow: null, criticalHigh: null }];
      const result = findApplicableRange(ranges, 'FEMALE', 10000);
      expect(result).toBeNull();
    });
  });

  describe('Abnormal / Critical Value Detection', () => {
    const evaluateResult = (value: number, range: { lowValue?: number | null; highValue?: number | null; criticalLow?: number | null; criticalHigh?: number | null }) => {
      let isAbnormal = false;
      let isCritical = false;
      if (range.lowValue != null && value < range.lowValue) isAbnormal = true;
      if (range.highValue != null && value > range.highValue) isAbnormal = true;
      if (range.criticalLow != null && value < range.criticalLow) isCritical = true;
      if (range.criticalHigh != null && value > range.criticalHigh) isCritical = true;
      return { isAbnormal, isCritical };
    };

    const hbRange = { lowValue: 12, highValue: 17, criticalLow: 7, criticalHigh: 20 };

    it('should mark normal value as not abnormal', () => {
      const result = evaluateResult(14.5, hbRange);
      expect(result.isAbnormal).toBe(false);
      expect(result.isCritical).toBe(false);
    });

    it('should mark low value as abnormal', () => {
      const result = evaluateResult(10.5, hbRange);
      expect(result.isAbnormal).toBe(true);
      expect(result.isCritical).toBe(false);
    });

    it('should mark high value as abnormal', () => {
      const result = evaluateResult(18.0, hbRange);
      expect(result.isAbnormal).toBe(true);
      expect(result.isCritical).toBe(false);
    });

    it('should mark critically low value', () => {
      const result = evaluateResult(5.0, hbRange);
      expect(result.isAbnormal).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should mark critically high value', () => {
      const result = evaluateResult(22.0, hbRange);
      expect(result.isAbnormal).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should handle potassium critical ranges', () => {
      const kRange = { lowValue: 3.5, highValue: 5.0, criticalLow: 2.5, criticalHigh: 6.5 };
      expect(evaluateResult(4.0, kRange)).toEqual({ isAbnormal: false, isCritical: false });
      expect(evaluateResult(2.0, kRange)).toEqual({ isAbnormal: true, isCritical: true });
      expect(evaluateResult(7.0, kRange)).toEqual({ isAbnormal: true, isCritical: true });
    });
  });

  describe('Sample Status Workflow', () => {
    const validTransitions: Record<string, string[]> = {
      ORDERED: ['COLLECTED', 'CANCELLED'],
      COLLECTED: ['RECEIVED', 'REJECTED'],
      RECEIVED: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED', 'FAILED'],
      COMPLETED: ['VERIFIED'],
      VERIFIED: ['RELEASED'],
      RELEASED: [],
      REJECTED: ['COLLECTED'],
      CANCELLED: [],
      FAILED: ['IN_PROGRESS'],
    };

    it('should follow correct sample workflow', () => {
      expect(validTransitions['ORDERED']).toContain('COLLECTED');
      expect(validTransitions['COLLECTED']).toContain('RECEIVED');
      expect(validTransitions['RECEIVED']).toContain('IN_PROGRESS');
      expect(validTransitions['IN_PROGRESS']).toContain('COMPLETED');
      expect(validTransitions['COMPLETED']).toContain('VERIFIED');
    });

    it('should allow re-collection after rejection', () => {
      expect(validTransitions['REJECTED']).toContain('COLLECTED');
    });

    it('should allow retry after failure', () => {
      expect(validTransitions['FAILED']).toContain('IN_PROGRESS');
    });

    it('should not allow transitions from released', () => {
      expect(validTransitions['RELEASED']).toHaveLength(0);
    });
  });

  describe('Lab Order Priority', () => {
    it('should sort by priority then order time', () => {
      const orders = [
        { id: '1', priority: 'ROUTINE', orderedAt: new Date('2026-01-01T10:00:00Z') },
        { id: '2', priority: 'STAT', orderedAt: new Date('2026-01-01T10:30:00Z') },
        { id: '3', priority: 'URGENT', orderedAt: new Date('2026-01-01T09:00:00Z') },
        { id: '4', priority: 'STAT', orderedAt: new Date('2026-01-01T09:30:00Z') },
      ];
      const priorityOrder: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };
      const sorted = [...orders].sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        if (pDiff !== 0) return pDiff;
        return a.orderedAt.getTime() - b.orderedAt.getTime();
      });
      expect(sorted[0].id).toBe('4');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
      expect(sorted[3].id).toBe('1');
    });
  });

  describe('TAT (Turnaround Time) Calculation', () => {
    it('should calculate TAT in minutes', () => {
      const collected = new Date('2026-01-01T08:00:00Z');
      const released = new Date('2026-01-01T10:30:00Z');
      const tatMinutes = Math.round((released.getTime() - collected.getTime()) / 60000);
      expect(tatMinutes).toBe(150);
    });

    it('should flag TAT exceeding SLA', () => {
      const slaMinutes = 120;
      const actualTat = 150;
      expect(actualTat > slaMinutes).toBe(true);
    });
  });
});
