import { prisma } from '../../common/utils/prisma.js';

const db = prisma as any;

/**
 * DHIMS2 (District Health Information Management System 2) Reporting Service
 * Ghana Health Service standard reporting format
 */
export class DHIMS2Service {
  /**
   * Generate OPD attendance report (DHIMS2 format)
   */
  async generateOPDReport(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const encounters = await db.encounter.findMany({
      where: {
        tenantId,
        encounterDate: { gte: startDate, lte: endDate },
        encounterType: 'OPD',
      },
      include: {
        patient: { select: { id: true, gender: true, dateOfBirth: true } },
        diagnoses: { select: { icdCode: true, description: true, isPrimary: true } },
      },
    });

    // Age-sex disaggregation
    const ageGroups = [
      { label: '0-28 days', min: 0, max: 28, unit: 'days' },
      { label: '29 days - 11 months', min: 29, max: 365, unit: 'days' },
      { label: '1-4 years', min: 1, max: 4, unit: 'years' },
      { label: '5-9 years', min: 5, max: 9, unit: 'years' },
      { label: '10-14 years', min: 10, max: 14, unit: 'years' },
      { label: '15-19 years', min: 15, max: 19, unit: 'years' },
      { label: '20-34 years', min: 20, max: 34, unit: 'years' },
      { label: '35-49 years', min: 35, max: 49, unit: 'years' },
      { label: '50-59 years', min: 50, max: 59, unit: 'years' },
      { label: '60-69 years', min: 60, max: 69, unit: 'years' },
      { label: '70+ years', min: 70, max: 999, unit: 'years' },
    ];

    const getAge = (dob: Date | null) => {
      if (!dob) return null;
      const now = new Date();
      const diffMs = now.getTime() - new Date(dob).getTime();
      return {
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        years: Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)),
      };
    };

    const disaggregation: Record<string, { male: number; female: number }> = {};
    for (const ag of ageGroups) {
      disaggregation[ag.label] = { male: 0, female: 0 };
    }

    // Top diagnoses (ICD-10 coded)
    const diagnosisCounts: Record<string, { code: string; description: string; count: number; male: number; female: number }> = {};

    for (const enc of encounters) {
      const age = getAge(enc.patient?.dateOfBirth || null);
      const gender = (enc.patient?.gender || '').toLowerCase();
      const isMale = gender === 'male' || gender === 'm';

      // Age-sex disaggregation
      if (age) {
        for (const ag of ageGroups) {
          const ageVal = ag.unit === 'days' ? age.days : age.years;
          if (ageVal >= ag.min && ageVal <= ag.max) {
            if (isMale) disaggregation[ag.label].male++;
            else disaggregation[ag.label].female++;
            break;
          }
        }
      }

      // Diagnosis counts
      for (const dx of enc.diagnoses) {
        const key = dx.icdCode || dx.description || 'UNSPECIFIED';
        if (!diagnosisCounts[key]) {
          diagnosisCounts[key] = { code: dx.icdCode || '', description: dx.description || '', count: 0, male: 0, female: 0 };
        }
        diagnosisCounts[key].count++;
        if (isMale) diagnosisCounts[key].male++;
        else diagnosisCounts[key].female++;
      }
    }

    const topDiagnoses = Object.values(diagnosisCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      reportType: 'OPD_ATTENDANCE',
      period: { month, year },
      facility: tenantId,
      totalAttendance: encounters.length,
      newCases: encounters.length, // Simplified
      ageSexDisaggregation: disaggregation,
      topDiagnoses,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate IPD (Inpatient) report
   */
  async generateIPDReport(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [admissions, discharges, deaths] = await Promise.all([
      db.admission.count({
        where: { tenantId, admissionDate: { gte: startDate, lte: endDate } },
      }),
      db.admission.count({
        where: { tenantId, dischargeDate: { gte: startDate, lte: endDate }, status: 'DISCHARGED' },
      }),
      db.admission.count({
        where: { tenantId, dischargeDate: { gte: startDate, lte: endDate }, status: 'DECEASED' },
      }),
    ]);

    const avgLOS = await db.admission.aggregate({
      where: {
        tenantId,
        dischargeDate: { gte: startDate, lte: endDate },
        status: { in: ['DISCHARGED', 'DECEASED'] },
      },
      _avg: { lengthOfStay: true },
    });

    return {
      reportType: 'IPD_REPORT',
      period: { month, year },
      totalAdmissions: admissions,
      totalDischarges: discharges,
      totalDeaths: deaths,
      averageLengthOfStay: avgLOS._avg.lengthOfStay || 0,
      mortalityRate: admissions > 0 ? ((deaths / admissions) * 100).toFixed(2) : '0',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Maternal Health report
   */
  async generateMaternalReport(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const db = prisma as any;

    let ancVisits = 0;
    let deliveries = 0;
    try {
      ancVisits = await db.maternityRecord.count({
        where: { tenantId, visitDate: { gte: startDate, lte: endDate }, visitType: 'ANC' },
      });
    } catch { /* model may not exist */ }

    try {
      deliveries = await db.maternityRecord.count({
        where: { tenantId, visitDate: { gte: startDate, lte: endDate }, visitType: 'DELIVERY' },
      });
    } catch { /* model may not exist */ }

    return {
      reportType: 'MATERNAL_HEALTH',
      period: { month, year },
      ancVisits,
      deliveries,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Lab report summary
   */
  async generateLabReport(tenantId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const labOrders = await db.labOrder.findMany({
      where: {
        tenantId,
        orderedAt: { gte: startDate, lte: endDate },
      },
      include: {
        tests: { select: { testName: true, status: true } },
      },
    });

    const totalTests = labOrders.reduce((s: number, o: any) => s + o.tests.length, 0);
    const completedTests = labOrders.reduce((s: number, o: any) => s + o.tests.filter((t: any) => t.status === 'COMPLETED').length, 0);

    // Group by test name
    const testCounts: Record<string, number> = {};
    for (const order of labOrders as any[]) {
      for (const test of order.tests) {
        testCounts[test.testName] = (testCounts[test.testName] || 0) + 1;
      }
    }

    const topTests = Object.entries(testCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ testName: name, count }));

    return {
      reportType: 'LABORATORY',
      period: { month, year },
      totalOrders: labOrders.length,
      totalTests,
      completedTests,
      completionRate: totalTests > 0 ? ((completedTests / totalTests) * 100).toFixed(1) : '0',
      topTests,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate full DHIMS2 monthly report bundle
   */
  async generateMonthlyBundle(tenantId: string, month: number, year: number) {
    const [opd, ipd, maternal, lab] = await Promise.all([
      this.generateOPDReport(tenantId, month, year),
      this.generateIPDReport(tenantId, month, year),
      this.generateMaternalReport(tenantId, month, year),
      this.generateLabReport(tenantId, month, year),
    ]);

    return {
      reportBundle: 'DHIMS2_MONTHLY',
      period: { month, year },
      facility: tenantId,
      reports: { opd, ipd, maternal, lab },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const dhims2Service = new DHIMS2Service();
