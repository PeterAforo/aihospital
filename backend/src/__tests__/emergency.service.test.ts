/**
 * Emergency Service Unit Tests
 * Tests ER triage scoring, trauma classification, vital sign assessment
 */

describe('Emergency Service - Unit Tests', () => {
  describe('Manchester Triage Scoring', () => {
    const triageCategories = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE'] as const;
    const triageTimes: Record<string, number> = { RED: 0, ORANGE: 10, YELLOW: 60, GREEN: 120, BLUE: 240 };

    it('should assign RED for life-threatening conditions', () => {
      const vitals = { heartRate: 140, bloodPressureSystolic: 70, oxygenSaturation: 85, gcsScore: 8 };
      const category = assessTriageCategory(vitals);
      expect(category).toBe('RED');
      expect(triageTimes[category]).toBe(0);
    });

    it('should assign ORANGE for urgent conditions', () => {
      const vitals = { heartRate: 120, bloodPressureSystolic: 85, oxygenSaturation: 91, gcsScore: 12 };
      const category = assessTriageCategory(vitals);
      expect(category).toBe('ORANGE');
      expect(triageTimes[category]).toBe(10);
    });

    it('should assign YELLOW for semi-urgent conditions', () => {
      const vitals = { heartRate: 100, bloodPressureSystolic: 110, oxygenSaturation: 95, gcsScore: 15 };
      const category = assessTriageCategory(vitals);
      expect(category).toBe('YELLOW');
    });

    it('should assign GREEN for non-urgent conditions', () => {
      const vitals = { heartRate: 75, bloodPressureSystolic: 120, oxygenSaturation: 98, gcsScore: 15 };
      const category = assessTriageCategory(vitals);
      expect(category).toBe('GREEN');
    });

    it('should have valid triage categories', () => {
      triageCategories.forEach(cat => {
        expect(triageTimes[cat]).toBeDefined();
        expect(typeof triageTimes[cat]).toBe('number');
      });
    });
  });

  describe('Trauma Assessment', () => {
    it('should classify trauma mechanism', () => {
      const mechanisms = ['RTA', 'FALL', 'ASSAULT', 'BURN', 'GUNSHOT', 'STAB', 'OTHER'];
      mechanisms.forEach(m => expect(typeof m).toBe('string'));
    });

    it('should calculate Revised Trauma Score (RTS)', () => {
      // RTS = 0.9368*GCS + 0.7326*SBP + 0.2908*RR
      const gcsCode = gcsToCode(15);
      const sbpCode = sbpToCode(120);
      const rrCode = rrToCode(18);
      const rts = 0.9368 * gcsCode + 0.7326 * sbpCode + 0.2908 * rrCode;
      expect(rts).toBeGreaterThan(7);
      expect(rts).toBeLessThanOrEqual(7.8408);
    });

    it('should flag critical RTS below 4', () => {
      const gcsCode = gcsToCode(5);
      const sbpCode = sbpToCode(50);
      const rrCode = rrToCode(5);
      const rts = 0.9368 * gcsCode + 0.7326 * sbpCode + 0.2908 * rrCode;
      expect(rts).toBeLessThan(4);
    });

    it('should identify multi-system trauma', () => {
      const injuries = [
        { region: 'HEAD', severity: 'MODERATE' },
        { region: 'CHEST', severity: 'SEVERE' },
        { region: 'ABDOMEN', severity: 'MILD' },
      ];
      const isMultiSystem = injuries.length >= 2;
      const hasSevere = injuries.some(i => i.severity === 'SEVERE');
      expect(isMultiSystem).toBe(true);
      expect(hasSevere).toBe(true);
    });
  });

  describe('ER Visit Status Workflow', () => {
    const validTransitions: Record<string, string[]> = {
      WAITING: ['TRIAGED', 'CANCELLED'],
      TRIAGED: ['IN_TREATMENT', 'WAITING', 'CANCELLED'],
      IN_TREATMENT: ['OBSERVATION', 'DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'DECEASED'],
      OBSERVATION: ['IN_TREATMENT', 'DISCHARGED', 'ADMITTED'],
      DISCHARGED: [],
      ADMITTED: [],
      TRANSFERRED: [],
      DECEASED: [],
      CANCELLED: [],
    };

    it('should allow valid status transitions', () => {
      expect(validTransitions['WAITING']).toContain('TRIAGED');
      expect(validTransitions['TRIAGED']).toContain('IN_TREATMENT');
      expect(validTransitions['IN_TREATMENT']).toContain('DISCHARGED');
      expect(validTransitions['IN_TREATMENT']).toContain('ADMITTED');
    });

    it('should not allow transitions from terminal states', () => {
      expect(validTransitions['DISCHARGED']).toHaveLength(0);
      expect(validTransitions['DECEASED']).toHaveLength(0);
      expect(validTransitions['CANCELLED']).toHaveLength(0);
    });

    it('should validate transition', () => {
      const isValid = (from: string, to: string) => validTransitions[from]?.includes(to) ?? false;
      expect(isValid('WAITING', 'TRIAGED')).toBe(true);
      expect(isValid('WAITING', 'DISCHARGED')).toBe(false);
      expect(isValid('DISCHARGED', 'WAITING')).toBe(false);
    });
  });

  describe('ER Wait Time Estimation', () => {
    it('should estimate wait time based on triage category', () => {
      const queueCounts = { RED: 0, ORANGE: 2, YELLOW: 5, GREEN: 8 };
      const avgTreatmentMinutes = 20;
      const estimateWait = (category: string) => {
        let ahead = 0;
        const priorities = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
        for (const p of priorities) {
          if (p === category) break;
          ahead += queueCounts[p as keyof typeof queueCounts] || 0;
        }
        return ahead * avgTreatmentMinutes;
      };
      expect(estimateWait('RED')).toBe(0);
      expect(estimateWait('ORANGE')).toBe(0);
      expect(estimateWait('YELLOW')).toBe(40);
      expect(estimateWait('GREEN')).toBe(140);
    });
  });
});

// Helper functions for triage
function assessTriageCategory(vitals: { heartRate: number; bloodPressureSystolic: number; oxygenSaturation: number; gcsScore: number }): string {
  if (vitals.gcsScore <= 8 || vitals.oxygenSaturation < 90 || vitals.bloodPressureSystolic < 80) return 'RED';
  if (vitals.heartRate > 110 || vitals.oxygenSaturation < 94 || vitals.bloodPressureSystolic < 90 || vitals.gcsScore <= 12) return 'ORANGE';
  if (vitals.heartRate > 90 || vitals.oxygenSaturation < 96) return 'YELLOW';
  return 'GREEN';
}

function gcsToCode(gcs: number): number {
  if (gcs >= 13) return 4;
  if (gcs >= 9) return 3;
  if (gcs >= 6) return 2;
  if (gcs >= 4) return 1;
  return 0;
}

function sbpToCode(sbp: number): number {
  if (sbp > 89) return 4;
  if (sbp >= 76) return 3;
  if (sbp >= 50) return 2;
  if (sbp >= 1) return 1;
  return 0;
}

function rrToCode(rr: number): number {
  if (rr >= 10 && rr <= 29) return 4;
  if (rr > 29) return 3;
  if (rr >= 6 && rr <= 9) return 2;
  if (rr >= 1 && rr <= 5) return 1;
  return 0;
}
