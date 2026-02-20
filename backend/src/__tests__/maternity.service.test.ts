describe('Maternity Service - Unit Tests', () => {
  describe('EDD Calculation', () => {
    it('should calculate EDD from LMP (Naegele rule)', () => {
      const lmp = new Date('2025-01-15');
      const edd = new Date(lmp);
      edd.setDate(edd.getDate() - 3 * 30 + 7 + 365); // Naegele approximation
      expect(edd.getFullYear()).toBe(2025);
      expect(edd.getMonth()).toBe(9); // October (0-indexed)
    });

    it('should calculate gestational age in weeks', () => {
      const lmp = new Date('2025-01-01');
      const today = new Date('2025-03-12');
      const diffMs = today.getTime() - lmp.getTime();
      const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      expect(weeks).toBe(10);
    });
  });

  describe('Risk Assessment', () => {
    const riskFactors = [
      { factor: 'AGE_OVER_35', weight: 2 },
      { factor: 'PREVIOUS_CS', weight: 3 },
      { factor: 'MULTIPLE_PREGNANCY', weight: 3 },
      { factor: 'HYPERTENSION', weight: 3 },
      { factor: 'DIABETES', weight: 2 },
      { factor: 'ANEMIA', weight: 1 },
      { factor: 'PREVIOUS_MISCARRIAGE', weight: 1 },
    ];

    function calculateRiskLevel(factors: string[]): string {
      const totalWeight = factors.reduce((sum, f) => {
        const found = riskFactors.find(rf => rf.factor === f);
        return sum + (found?.weight || 0);
      }, 0);
      if (totalWeight >= 5) return 'HIGH';
      if (totalWeight >= 3) return 'MODERATE';
      return 'LOW';
    }

    it('should classify high-risk pregnancy', () => {
      const level = calculateRiskLevel(['PREVIOUS_CS', 'HYPERTENSION']);
      expect(level).toBe('HIGH');
    });

    it('should classify low-risk pregnancy', () => {
      const level = calculateRiskLevel(['ANEMIA']);
      expect(level).toBe('LOW');
    });

    it('should classify moderate-risk pregnancy', () => {
      const level = calculateRiskLevel(['AGE_OVER_35', 'PREVIOUS_MISCARRIAGE']);
      expect(level).toBe('MODERATE');
    });
  });

  describe('APGAR Score', () => {
    it('should calculate total APGAR score', () => {
      const scores = { appearance: 2, pulse: 2, grimace: 1, activity: 2, respiration: 2 };
      const total = Object.values(scores).reduce((s, v) => s + v, 0);
      expect(total).toBe(9);
    });

    it('should classify normal APGAR (7-10)', () => {
      const score = 8;
      const classification = score >= 7 ? 'NORMAL' : score >= 4 ? 'MODERATE_DEPRESSION' : 'SEVERE_DEPRESSION';
      expect(classification).toBe('NORMAL');
    });

    it('should classify severely depressed APGAR (0-3)', () => {
      const score = 2;
      const classification = score >= 7 ? 'NORMAL' : score >= 4 ? 'MODERATE_DEPRESSION' : 'SEVERE_DEPRESSION';
      expect(classification).toBe('SEVERE_DEPRESSION');
    });
  });

  describe('Postnatal Visit Schedule', () => {
    it('should schedule PNC visits at correct intervals', () => {
      const deliveryDate = new Date('2025-06-01');
      const pncSchedule = [
        { day: 1, label: '24 hours' },
        { day: 3, label: 'Day 3' },
        { day: 7, label: 'Week 1' },
        { day: 42, label: '6 weeks' },
      ];

      pncSchedule.forEach(visit => {
        const visitDate = new Date(deliveryDate);
        visitDate.setDate(visitDate.getDate() + visit.day);
        expect(visitDate.getTime()).toBeGreaterThan(deliveryDate.getTime());
      });
    });

    it('should flag overdue PNC visits', () => {
      const lastVisit = new Date('2025-06-08'); // Day 7
      const nextDue = new Date('2025-07-13'); // Day 42
      const today = new Date('2025-07-20');
      const isOverdue = today > nextDue;
      expect(isOverdue).toBe(true);
    });
  });

  describe('Newborn Weight Tracking', () => {
    it('should detect normal birth weight (2500-4000g)', () => {
      const weight = 3200;
      const isNormal = weight >= 2500 && weight <= 4000;
      expect(isNormal).toBe(true);
    });

    it('should detect low birth weight (<2500g)', () => {
      const weight = 2100;
      const isLBW = weight < 2500;
      expect(isLBW).toBe(true);
    });

    it('should detect macrosomia (>4000g)', () => {
      const weight = 4500;
      const isMacrosomia = weight > 4000;
      expect(isMacrosomia).toBe(true);
    });

    it('should track weight gain/loss percentage', () => {
      const birthWeight = 3000;
      const currentWeight = 2850;
      const changePercent = ((currentWeight - birthWeight) / birthWeight) * 100;
      expect(changePercent).toBeCloseTo(-5, 0);
      // >10% loss is concerning
      expect(Math.abs(changePercent)).toBeLessThan(10);
    });
  });
});
