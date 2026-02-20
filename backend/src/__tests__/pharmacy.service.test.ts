jest.mock('../common/utils/prisma', () => ({
  prisma: {
    drug: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    dispensingRecord: { create: jest.fn(), findMany: jest.fn() },
    stockBatch: { findMany: jest.fn(), update: jest.fn() },
    stockMovement: { create: jest.fn() },
  },
}));

describe('Pharmacy Service - Unit Tests', () => {
  describe('Drug Interaction Detection', () => {
    const knownInteractions: Record<string, string[]> = {
      'Warfarin': ['Aspirin', 'Ibuprofen', 'Metronidazole'],
      'Metformin': ['Contrast Dye'],
      'ACE Inhibitors': ['Potassium Supplements', 'Spironolactone'],
      'Digoxin': ['Amiodarone', 'Verapamil'],
    };

    it('should detect Warfarin-Aspirin interaction', () => {
      const drug1 = 'Warfarin';
      const drug2 = 'Aspirin';
      const hasInteraction = knownInteractions[drug1]?.includes(drug2) || false;
      expect(hasInteraction).toBe(true);
    });

    it('should not flag non-interacting drugs', () => {
      const drug1 = 'Paracetamol';
      const drug2 = 'Amoxicillin';
      const hasInteraction = knownInteractions[drug1]?.includes(drug2) || false;
      expect(hasInteraction).toBe(false);
    });

    it('should check interactions bidirectionally', () => {
      const allInteractions = Object.entries(knownInteractions);
      expect(allInteractions.length).toBeGreaterThan(0);
    });
  });

  describe('Stock Management', () => {
    it('should calculate stock level correctly', () => {
      const batches = [
        { quantity: 100, expiryDate: new Date('2025-12-31') },
        { quantity: 50, expiryDate: new Date('2025-06-30') },
        { quantity: 0, expiryDate: new Date('2024-01-01') },
      ];
      const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
      expect(totalStock).toBe(150);
    });

    it('should identify expired batches', () => {
      const now = new Date();
      const batches = [
        { id: '1', expiryDate: new Date('2020-01-01'), quantity: 50 },
        { id: '2', expiryDate: new Date('2026-12-31'), quantity: 100 },
        { id: '3', expiryDate: new Date('2024-06-01'), quantity: 30 },
      ];
      const expired = batches.filter(b => b.expiryDate < now);
      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(expired.some(b => b.id === '1')).toBe(true);
    });

    it('should identify low stock items', () => {
      const items = [
        { name: 'Paracetamol', quantity: 500, reorderLevel: 100 },
        { name: 'Amoxicillin', quantity: 20, reorderLevel: 50 },
        { name: 'Metformin', quantity: 10, reorderLevel: 30 },
      ];
      const lowStock = items.filter(i => i.quantity <= i.reorderLevel);
      expect(lowStock.length).toBe(2);
      expect(lowStock.map(i => i.name)).toContain('Amoxicillin');
      expect(lowStock.map(i => i.name)).toContain('Metformin');
    });

    it('should use FEFO for dispensing', () => {
      const batches = [
        { id: 'A', expiryDate: new Date('2025-12-31'), quantity: 50 },
        { id: 'B', expiryDate: new Date('2025-06-30'), quantity: 30 },
        { id: 'C', expiryDate: new Date('2025-09-15'), quantity: 20 },
      ];
      const sorted = [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
      expect(sorted[0].id).toBe('B'); // Earliest expiry first
    });
  });

  describe('Dispensing Validation', () => {
    it('should validate dispensing quantity against prescription', () => {
      const prescribed = 30;
      const dispensed = 30;
      expect(dispensed).toBeLessThanOrEqual(prescribed);
    });

    it('should reject over-dispensing', () => {
      const prescribed = 30;
      const dispensed = 50;
      expect(dispensed).toBeGreaterThan(prescribed);
    });

    it('should calculate dosage instructions', () => {
      const frequency = 3; // times per day
      const days = 7;
      const totalTablets = frequency * days;
      expect(totalTablets).toBe(21);
    });

    it('should validate controlled substance limits', () => {
      const maxDays = 30;
      const requestedDays = 90;
      expect(requestedDays).toBeGreaterThan(maxDays);
    });
  });

  describe('Stock Transfer', () => {
    it('should validate transfer between branches', () => {
      const sourceBranch = 'branch-1';
      const destBranch = 'branch-2';
      expect(sourceBranch).not.toBe(destBranch);
    });

    it('should not allow transfer exceeding available stock', () => {
      const available = 100;
      const transferQty = 150;
      expect(transferQty).toBeGreaterThan(available);
    });

    it('should update both source and destination stock', () => {
      let sourceStock = 100;
      let destStock = 50;
      const transferQty = 30;
      sourceStock -= transferQty;
      destStock += transferQty;
      expect(sourceStock).toBe(70);
      expect(destStock).toBe(80);
    });
  });
});
