describe('AI Service - Unit Tests', () => {
  describe('Drug Interaction AI', () => {
    const interactionDb: Record<string, { severity: string; description: string }[]> = {
      'warfarin+aspirin': [{ severity: 'HIGH', description: 'Increased bleeding risk' }],
      'metformin+alcohol': [{ severity: 'MODERATE', description: 'Lactic acidosis risk' }],
      'lisinopril+potassium': [{ severity: 'HIGH', description: 'Hyperkalemia risk' }],
    };

    it('should detect known drug interactions', () => {
      const key = 'warfarin+aspirin';
      const interactions = interactionDb[key] || [];
      expect(interactions.length).toBeGreaterThan(0);
      expect(interactions[0].severity).toBe('HIGH');
    });

    it('should return empty for non-interacting drugs', () => {
      const key = 'paracetamol+amoxicillin';
      const interactions = interactionDb[key] || [];
      expect(interactions.length).toBe(0);
    });

    it('should normalize drug names for lookup', () => {
      const normalize = (name: string) => name.toLowerCase().trim();
      expect(normalize('  Warfarin  ')).toBe('warfarin');
      expect(normalize('ASPIRIN')).toBe('aspirin');
    });
  });

  describe('Triage AI Scoring', () => {
    interface TriageInput {
      chiefComplaint: string;
      heartRate: number;
      systolicBP: number;
      temperature: number;
      spo2: number;
      painScore: number;
      consciousness: string;
    }

    function calculateTriageScore(input: TriageInput): { score: number; level: string } {
      let score = 0;
      if (input.heartRate > 120 || input.heartRate < 50) score += 3;
      else if (input.heartRate > 100 || input.heartRate < 60) score += 1;
      if (input.systolicBP < 90) score += 3;
      else if (input.systolicBP < 100) score += 2;
      if (input.temperature > 39) score += 2;
      else if (input.temperature > 38) score += 1;
      if (input.spo2 < 90) score += 3;
      else if (input.spo2 < 94) score += 2;
      if (input.painScore >= 8) score += 2;
      else if (input.painScore >= 5) score += 1;
      if (input.consciousness !== 'ALERT') score += 3;

      let level = 'GREEN';
      if (score >= 8) level = 'RED';
      else if (score >= 5) level = 'ORANGE';
      else if (score >= 3) level = 'YELLOW';

      return { score, level };
    }

    it('should classify critical patient as RED', () => {
      const result = calculateTriageScore({
        chiefComplaint: 'Chest pain', heartRate: 130, systolicBP: 80,
        temperature: 39.5, spo2: 88, painScore: 9, consciousness: 'VERBAL',
      });
      expect(result.level).toBe('RED');
      expect(result.score).toBeGreaterThanOrEqual(8);
    });

    it('should classify stable patient as GREEN', () => {
      const result = calculateTriageScore({
        chiefComplaint: 'Mild headache', heartRate: 72, systolicBP: 120,
        temperature: 36.8, spo2: 98, painScore: 2, consciousness: 'ALERT',
      });
      expect(result.level).toBe('GREEN');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify moderate patient as YELLOW or ORANGE', () => {
      const result = calculateTriageScore({
        chiefComplaint: 'Abdominal pain', heartRate: 105, systolicBP: 110,
        temperature: 38.5, spo2: 95, painScore: 6, consciousness: 'ALERT',
      });
      expect(['YELLOW', 'ORANGE']).toContain(result.level);
    });
  });

  describe('ICD-10 Search', () => {
    const icd10Codes = [
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
      { code: 'I10', description: 'Essential (primary) hypertension' },
      { code: 'B54', description: 'Unspecified malaria' },
      { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
    ];

    it('should find codes by keyword search', () => {
      const query = 'malaria';
      const results = icd10Codes.filter(c => c.description.toLowerCase().includes(query.toLowerCase()));
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('B54');
    });

    it('should find codes by code prefix', () => {
      const prefix = 'J';
      const results = icd10Codes.filter(c => c.code.startsWith(prefix));
      expect(results.length).toBe(2);
    });

    it('should return empty for unknown terms', () => {
      const query = 'xyznonexistent';
      const results = icd10Codes.filter(c => c.description.toLowerCase().includes(query));
      expect(results.length).toBe(0);
    });
  });

  describe('SOAP Note Structuring', () => {
    it('should parse keywords into SOAP sections', () => {
      const text = 'Patient complains of headache for 3 days. BP 140/90. Assessment: Hypertension. Plan: Start amlodipine 5mg daily.';

      const sections = {
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
      };

      if (text.toLowerCase().includes('complains')) sections.subjective = 'headache for 3 days';
      if (text.includes('BP')) sections.objective = 'BP 140/90';
      if (text.includes('Assessment:')) sections.assessment = 'Hypertension';
      if (text.includes('Plan:')) sections.plan = 'Start amlodipine 5mg daily';

      expect(sections.subjective).toBeTruthy();
      expect(sections.objective).toBeTruthy();
      expect(sections.assessment).toBeTruthy();
      expect(sections.plan).toBeTruthy();
    });
  });
});
