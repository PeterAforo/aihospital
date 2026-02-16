import { prisma } from '../../common/utils/prisma.js';

/**
 * Clinical Decision Support (CDS) Service
 * Checks for:
 * 1. Drug-allergy conflicts (CRITICAL - blocks prescription)
 * 2. Drug-drug interactions (WARNING - can override with reason)
 * 3. Pediatric dosing alerts (WARNING)
 * 4. Duplicate therapy (INFO)
 */

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface CDSAlert {
  severity: AlertSeverity;
  type: 'ALLERGY' | 'INTERACTION' | 'PEDIATRIC_DOSE' | 'DUPLICATE' | 'RENAL' | 'PREGNANCY';
  drugId: string;
  drugName: string;
  message: string;
  details: string;
  canOverride: boolean;
}

export interface CDSValidationResult {
  safe: boolean;
  alerts: CDSAlert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

// Known drug-allergy cross-reactivity map
// Key: allergen keyword (lowercase), Value: array of drug generic name keywords that conflict
const ALLERGY_DRUG_MAP: Record<string, string[]> = {
  'penicillin': ['amoxicillin', 'amoxicillin-clavulanate', 'ampicillin', 'piperacillin', 'flucloxacillin'],
  'sulfa': ['sulfamethoxazole', 'cotrimoxazole', 'silver sulfadiazine', 'sulfasalazine'],
  'sulfonamide': ['sulfamethoxazole', 'cotrimoxazole', 'silver sulfadiazine', 'sulfasalazine'],
  'nsaid': ['ibuprofen', 'diclofenac', 'aspirin', 'naproxen', 'piroxicam', 'indomethacin'],
  'aspirin': ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen'],
  'cephalosporin': ['ceftriaxone', 'cefuroxime', 'cephalexin', 'cefixime'],
  'quinolone': ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
  'fluoroquinolone': ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
  'macrolide': ['azithromycin', 'erythromycin', 'clarithromycin'],
  'tetracycline': ['doxycycline', 'tetracycline'],
  'morphine': ['morphine', 'codeine', 'tramadol'],
  'opioid': ['morphine', 'codeine', 'tramadol', 'pethidine'],
  'codeine': ['codeine', 'tramadol'],
  'ace inhibitor': ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
  'statin': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
  'metformin': ['metformin'],
  'insulin': ['insulin regular', 'insulin nph', 'insulin glargine'],
  'iodine': ['povidone-iodine', 'amiodarone'],
  'latex': [],
  'egg': [],
};

// Known drug-drug interactions (expanded for Ghana Essential Medicines List)
// Each entry: [drugA keywords, drugB keywords, severity, message, management]
const DRUG_INTERACTIONS: [string[], string[], AlertSeverity, string, string][] = [
  // === CRITICAL (Contraindicated) ===
  [['methotrexate'], ['nsaid', 'ibuprofen', 'diclofenac', 'naproxen', 'piroxicam'], 'CRITICAL', 'NSAIDs reduce methotrexate clearance. Potentially fatal toxicity.', 'Avoid combination. Use paracetamol for pain.'],
  [['warfarin'], ['metronidazole'], 'CRITICAL', 'Metronidazole dramatically increases warfarin effect. Risk of fatal bleeding.', 'Avoid if possible. If essential, reduce warfarin dose by 25-50% and monitor INR every 2 days.'],
  [['ergotamine'], ['erythromycin', 'clarithromycin', 'azithromycin'], 'CRITICAL', 'Risk of ergotism (vasospasm, gangrene).', 'Contraindicated. Use alternative antibiotic or migraine treatment.'],
  [['cisapride'], ['erythromycin', 'clarithromycin', 'fluconazole', 'ketoconazole'], 'CRITICAL', 'Risk of fatal cardiac arrhythmia (QT prolongation).', 'Contraindicated combination.'],
  [['simvastatin', 'lovastatin'], ['itraconazole', 'ketoconazole', 'erythromycin', 'clarithromycin'], 'CRITICAL', 'Risk of rhabdomyolysis (muscle breakdown, renal failure).', 'Use atorvastatin or rosuvastatin instead, or suspend statin during antibiotic course.'],

  // === WARNING (Major) ===
  [['warfarin'], ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'indomethacin'], 'WARNING', 'Increased bleeding risk with anticoagulant + NSAID.', 'Monitor INR closely. Consider paracetamol instead. Add PPI for GI protection.'],
  [['warfarin'], ['erythromycin', 'azithromycin', 'ciprofloxacin', 'cotrimoxazole'], 'WARNING', 'Antibiotic may increase warfarin effect.', 'Monitor INR within 3-5 days of starting antibiotic. Adjust warfarin dose as needed.'],
  [['digoxin'], ['furosemide', 'hydrochlorothiazide', 'bendroflumethiazide'], 'WARNING', 'Diuretic-induced hypokalemia increases digoxin toxicity risk.', 'Monitor K+ and digoxin levels. Consider K+ supplementation or K+-sparing diuretic.'],
  [['digoxin'], ['amiodarone'], 'WARNING', 'Amiodarone increases digoxin levels by 50-100%.', 'Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels.'],
  [['digoxin'], ['verapamil'], 'WARNING', 'Verapamil increases digoxin levels and additive AV block risk.', 'Reduce digoxin dose by 25-50%. Monitor heart rate and digoxin levels.'],
  [['lisinopril', 'enalapril', 'ramipril', 'captopril'], ['losartan', 'valsartan', 'candesartan'], 'WARNING', 'ACE inhibitor + ARB: increased risk of hyperkalemia, hypotension, and renal impairment.', 'Avoid dual RAAS blockade. Use one agent only.'],
  [['lisinopril', 'enalapril', 'ramipril', 'captopril'], ['potassium', 'spironolactone'], 'WARNING', 'ACE inhibitor + potassium: risk of life-threatening hyperkalemia.', 'Monitor K+ within 1 week. Avoid K+ supplements if K+ > 5.0.'],
  [['simvastatin', 'atorvastatin'], ['erythromycin', 'clarithromycin'], 'WARNING', 'Macrolide increases statin levels. Risk of rhabdomyolysis.', 'Use azithromycin instead (less interaction). Monitor for muscle pain.'],
  [['carbamazepine'], ['erythromycin', 'clarithromycin', 'isoniazid'], 'WARNING', 'Increases carbamazepine levels. Risk of toxicity (ataxia, nystagmus, drowsiness).', 'Monitor carbamazepine levels. Use azithromycin if antibiotic needed.'],
  [['phenytoin'], ['metronidazole', 'fluconazole', 'isoniazid'], 'WARNING', 'May increase phenytoin levels causing toxicity.', 'Monitor phenytoin levels. Watch for nystagmus, ataxia.'],
  [['tramadol'], ['fluoxetine', 'amitriptyline', 'sertraline', 'paroxetine'], 'WARNING', 'Serotonin syndrome risk (agitation, tremor, hyperthermia).', 'Use with caution. Monitor for serotonin syndrome symptoms. Consider alternative analgesic.'],
  [['tramadol'], ['carbamazepine'], 'WARNING', 'Carbamazepine reduces tramadol efficacy and increases seizure risk.', 'Use alternative analgesic. Avoid combination.'],
  [['metformin'], ['contrast dye', 'iodinated contrast'], 'WARNING', 'Risk of lactic acidosis with contrast media.', 'Hold metformin 48h before and after contrast. Check renal function before restarting.'],
  [['lithium'], ['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam'], 'WARNING', 'NSAIDs increase lithium levels. Risk of toxicity.', 'Monitor lithium levels. Use paracetamol instead. If NSAID essential, check lithium in 5 days.'],
  [['lithium'], ['furosemide', 'hydrochlorothiazide', 'bendroflumethiazide'], 'WARNING', 'Diuretics increase lithium levels by reducing renal clearance.', 'Monitor lithium levels closely. Adjust lithium dose as needed.'],
  [['rifampicin'], ['oral contraceptive', 'ethinylestradiol', 'levonorgestrel'], 'WARNING', 'Rifampicin reduces contraceptive efficacy. Risk of unintended pregnancy.', 'Use additional barrier method. Consider higher-dose OCP or alternative contraception.'],
  [['rifampicin'], ['warfarin'], 'WARNING', 'Rifampicin dramatically reduces warfarin effect.', 'Increase warfarin dose (may need 2-3x). Monitor INR frequently.'],
  [['rifampicin'], ['atorvastatin', 'simvastatin'], 'WARNING', 'Rifampicin reduces statin levels significantly.', 'May need higher statin dose. Monitor lipid levels.'],
  [['ciprofloxacin', 'levofloxacin', 'moxifloxacin'], ['amiodarone'], 'WARNING', 'Both prolong QT interval. Risk of fatal arrhythmia.', 'Avoid combination. Use alternative antibiotic.'],
  [['fluconazole', 'ketoconazole'], ['warfarin'], 'WARNING', 'Azole antifungals increase warfarin effect significantly.', 'Monitor INR within 3 days. Reduce warfarin dose proactively.'],
  [['cotrimoxazole'], ['warfarin'], 'WARNING', 'Cotrimoxazole increases warfarin effect. Bleeding risk.', 'Monitor INR. Consider dose reduction.'],
  [['cotrimoxazole'], ['methotrexate'], 'WARNING', 'Both are folate antagonists. Increased bone marrow toxicity.', 'Avoid combination. If essential, give folinic acid rescue.'],
  [['artemether', 'artesunate'], ['lumefantrine', 'amodiaquine'], 'INFO', 'Standard ACT combination — monitor QT in patients with cardiac history.', 'Routine monitoring. ECG if cardiac risk factors present.'],

  // === INFO (Monitor) ===
  [['amlodipine', 'nifedipine'], ['atenolol', 'propranolol', 'metoprolol'], 'INFO', 'Calcium channel blocker + beta blocker: monitor for excessive bradycardia/hypotension.', 'Monitor heart rate and blood pressure. Reduce doses if symptomatic.'],
  [['insulin regular', 'insulin nph', 'insulin glargine'], ['glibenclamide', 'gliclazide', 'metformin'], 'INFO', 'Multiple hypoglycemics: increased hypoglycemia risk.', 'Monitor blood glucose more frequently. Educate patient on hypoglycemia symptoms.'],
  [['ciprofloxacin', 'levofloxacin'], ['antacid', 'omeprazole', 'ranitidine', 'calcium', 'iron', 'zinc'], 'INFO', 'Antacids/minerals reduce fluoroquinolone absorption.', 'Space doses at least 2 hours apart. Take fluoroquinolone first.'],
  [['doxycycline', 'tetracycline'], ['antacid', 'calcium', 'iron', 'zinc'], 'INFO', 'Minerals reduce tetracycline absorption.', 'Space doses at least 2-3 hours apart.'],
  [['metformin'], ['alcohol', 'ethanol'], 'INFO', 'Alcohol increases risk of lactic acidosis with metformin.', 'Advise patient to limit alcohol intake.'],
  [['amlodipine'], ['simvastatin'], 'INFO', 'Amlodipine increases simvastatin levels. Max simvastatin dose 20mg.', 'Limit simvastatin to 20mg/day or switch to atorvastatin.'],
  [['omeprazole', 'esomeprazole'], ['clopidogrel'], 'INFO', 'PPI may reduce clopidogrel antiplatelet effect.', 'Consider pantoprazole instead (less interaction).'],
];

export class CDSService {
  /**
   * Validate a prescription before creation
   */
  async validatePrescription(
    patientId: string,
    drugIds: string[],
    tenantId: string
  ): Promise<CDSValidationResult> {
    const alerts: CDSAlert[] = [];

    // Fetch patient data with allergies and current medications
    const [patient, drugs, activePrescriptions] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId },
        include: {
          allergies: true,
          chronicConditions: true,
        },
      }),
      prisma.drug.findMany({
        where: { id: { in: drugIds } },
      }),
      prisma.prescription.findMany({
        where: {
          patientId,
          tenantId,
          status: { in: ['PENDING', 'DISPENSED', 'PARTIAL'] },
        },
        include: {
          items: { include: { drug: true } },
        },
      }),
    ]);

    if (!patient) {
      return { safe: true, alerts: [], criticalCount: 0, warningCount: 0, infoCount: 0 };
    }

    // 1. Check drug-allergy conflicts
    for (const drug of drugs) {
      for (const allergy of patient.allergies) {
        const allergenLower = allergy.allergen.toLowerCase();
        const drugNameLower = drug.genericName.toLowerCase();

        // Direct name match
        if (drugNameLower.includes(allergenLower) || allergenLower.includes(drugNameLower)) {
          alerts.push({
            severity: 'CRITICAL',
            type: 'ALLERGY',
            drugId: drug.id,
            drugName: drug.genericName,
            message: `ALLERGY ALERT: Patient is allergic to "${allergy.allergen}"`,
            details: `${drug.genericName} (${drug.brandName || ''}) conflicts with documented allergy to "${allergy.allergen}".${allergy.reaction ? ` Known reaction: ${allergy.reaction}.` : ''}${allergy.severity ? ` Severity: ${allergy.severity}.` : ''} DO NOT PRESCRIBE.`,
            canOverride: false,
          });
          continue;
        }

        // Cross-reactivity check
        for (const [allergenKey, conflictingDrugs] of Object.entries(ALLERGY_DRUG_MAP)) {
          if (allergenLower.includes(allergenKey)) {
            if (conflictingDrugs.some(cd => drugNameLower.includes(cd))) {
              alerts.push({
                severity: 'CRITICAL',
                type: 'ALLERGY',
                drugId: drug.id,
                drugName: drug.genericName,
                message: `CROSS-REACTIVITY: Patient allergic to "${allergy.allergen}" — ${drug.genericName} may cause reaction`,
                details: `${drug.genericName} belongs to a drug class with known cross-reactivity to "${allergy.allergen}".${allergy.reaction ? ` Known reaction: ${allergy.reaction}.` : ''} Consider alternative medication.`,
                canOverride: false,
              });
            }
          }
        }
      }
    }

    // 2. Check drug-drug interactions (new drugs vs each other + vs active prescriptions)
    const allDrugNames = drugs.map(d => d.genericName.toLowerCase());

    // Get active medication names
    const activeDrugNames: string[] = [];
    for (const rx of activePrescriptions) {
      for (const item of rx.items) {
        if (item.drug) {
          activeDrugNames.push(item.drug.genericName.toLowerCase());
        }
      }
    }

    const combinedDrugNames = [...allDrugNames, ...activeDrugNames];

    // Also fetch DB-stored interactions
    const dbInteractions = await prisma.drugInteraction.findMany({
      where: { isActive: true },
    });

    // Combine built-in + DB interactions
    const allInteractions: [string[], string[], AlertSeverity, string, string][] = [
      ...DRUG_INTERACTIONS,
      ...dbInteractions.map(di => [
        [di.drugAName.toLowerCase()],
        [di.drugBName.toLowerCase()],
        di.severity as AlertSeverity,
        di.description,
        di.management || '',
      ] as [string[], string[], AlertSeverity, string, string]),
    ];

    for (const [groupA, groupB, severity, message, management] of allInteractions) {
      const hasA = combinedDrugNames.some(dn => groupA.some(a => dn.includes(a)));
      const hasB = combinedDrugNames.some(dn => groupB.some(b => dn.includes(b)));

      if (hasA && hasB) {
        const triggerDrug = drugs.find(d => {
          const name = d.genericName.toLowerCase();
          return groupA.some(a => name.includes(a)) || groupB.some(b => name.includes(b));
        });

        if (triggerDrug) {
          const alreadyAlerted = alerts.some(
            a => a.type === 'INTERACTION' && a.message === `DRUG INTERACTION: ${message}` && a.drugId === triggerDrug.id
          );
          if (!alreadyAlerted) {
            const interactingWith = combinedDrugNames.find(dn => {
              const isInA = groupA.some(a => dn.includes(a));
              const isInB = groupB.some(b => dn.includes(b));
              const triggerInA = groupA.some(a => triggerDrug.genericName.toLowerCase().includes(a));
              return triggerInA ? isInB : isInA;
            });

            alerts.push({
              severity,
              type: 'INTERACTION',
              drugId: triggerDrug.id,
              drugName: triggerDrug.genericName,
              message: `DRUG INTERACTION: ${message}`,
              details: `${triggerDrug.genericName} interacts with ${interactingWith || 'another prescribed medication'}. ${message}${management ? ` Management: ${management}` : ''}`,
              canOverride: severity !== 'CRITICAL',
            });
          }
        }
      }
    }

    // 3. Check for duplicate therapy
    for (const drug of drugs) {
      const drugNameLower = drug.genericName.toLowerCase();
      const duplicate = activeDrugNames.find(an => an === drugNameLower);
      if (duplicate) {
        alerts.push({
          severity: 'WARNING',
          type: 'DUPLICATE',
          drugId: drug.id,
          drugName: drug.genericName,
          message: `DUPLICATE THERAPY: ${drug.genericName} is already prescribed`,
          details: `Patient already has an active prescription for ${drug.genericName}. Verify this is intentional and not a duplicate order.`,
          canOverride: true,
        });
      }
    }

    // 4. Pediatric dosing check
    if (patient.dateOfBirth) {
      const ageYears = (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 12) {
        for (const drug of drugs) {
          const drugNameLower = drug.genericName.toLowerCase();
          // Flag adult-only or caution drugs for children
          const pediatricCaution = [
            'aspirin', 'doxycycline', 'ciprofloxacin', 'levofloxacin',
            'tetracycline', 'metformin', 'atorvastatin', 'simvastatin',
            'losartan', 'lisinopril', 'warfarin',
          ];
          if (pediatricCaution.some(pc => drugNameLower.includes(pc))) {
            alerts.push({
              severity: 'WARNING',
              type: 'PEDIATRIC_DOSE',
              drugId: drug.id,
              drugName: drug.genericName,
              message: `PEDIATRIC CAUTION: ${drug.genericName} — patient is ${Math.floor(ageYears)} years old`,
              details: `${drug.genericName} requires careful dosing or may be contraindicated in children under 12. Verify age-appropriate dosing.`,
              canOverride: true,
            });
          }
        }
      }
    }

    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
    const warningCount = alerts.filter(a => a.severity === 'WARNING').length;
    const infoCount = alerts.filter(a => a.severity === 'INFO').length;

    return {
      safe: criticalCount === 0,
      alerts,
      criticalCount,
      warningCount,
      infoCount,
    };
  }

  /**
   * Validate drugs at dispensing time (pharmacist safety check)
   */
  async validateDispensing(
    prescriptionId: string,
    tenantId: string
  ): Promise<CDSValidationResult> {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: { include: { drug: true } },
        patient: { include: { allergies: true, chronicConditions: true } },
      },
    });

    if (!prescription) {
      return { safe: true, alerts: [], criticalCount: 0, warningCount: 0, infoCount: 0 };
    }

    const drugIds = prescription.items.map(i => i.drugId);
    return this.validatePrescription(prescription.patientId, drugIds, tenantId);
  }

  /**
   * Log CDS alerts to the database for audit trail
   */
  async logAlerts(
    tenantId: string,
    patientId: string,
    alerts: CDSAlert[],
    context: 'PRESCRIBING' | 'DISPENSING',
    encounterId?: string,
    prescriptionId?: string
  ): Promise<void> {
    if (alerts.length === 0) return;

    await prisma.cDSAlertLog.createMany({
      data: alerts.map(alert => ({
        tenantId,
        patientId,
        encounterId,
        prescriptionId,
        alertType: alert.type,
        severity: alert.severity,
        drugId: alert.drugId,
        drugName: alert.drugName,
        message: alert.message,
        details: alert.details,
        context,
      })),
    });
  }

  /**
   * Record a pharmacist/doctor override of a CDS alert
   */
  async recordOverride(
    alertLogId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    await prisma.cDSAlertLog.update({
      where: { id: alertLogId },
      data: {
        wasOverridden: true,
        overriddenBy: userId,
        overrideReason: reason,
        overriddenAt: new Date(),
      },
    });
  }

  /**
   * Get CDS alert history for a patient
   */
  async getAlertHistory(
    tenantId: string,
    patientId?: string,
    alertType?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (alertType) where.alertType = alertType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return prisma.cDSAlertLog.findMany({
      where,
      include: {
        patient: {
          select: { id: true, mrn: true, firstName: true, lastName: true },
        },
        overrideUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get override statistics for compliance reporting
   */
  async getOverrideStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalAlerts, overriddenAlerts, criticalAlerts, criticalOverrides] = await Promise.all([
      prisma.cDSAlertLog.count({ where }),
      prisma.cDSAlertLog.count({ where: { ...where, wasOverridden: true } }),
      prisma.cDSAlertLog.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.cDSAlertLog.count({ where: { ...where, severity: 'CRITICAL', wasOverridden: true } }),
    ]);

    return {
      totalAlerts,
      overriddenAlerts,
      overrideRate: totalAlerts > 0 ? ((overriddenAlerts / totalAlerts) * 100).toFixed(1) + '%' : '0%',
      criticalAlerts,
      criticalOverrides,
      criticalOverrideRate: criticalAlerts > 0 ? ((criticalOverrides / criticalAlerts) * 100).toFixed(1) + '%' : '0%',
    };
  }

  /**
   * Manage custom drug interactions in the database
   */
  async addInteraction(data: {
    drugAName: string;
    drugBName: string;
    severity: string;
    description: string;
    mechanism?: string;
    management?: string;
    evidenceLevel?: string;
    source?: string;
  }) {
    return prisma.drugInteraction.create({ data });
  }

  async listInteractions(activeOnly = true) {
    return prisma.drugInteraction.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ severity: 'asc' }, { drugAName: 'asc' }],
    });
  }

  async deactivateInteraction(id: string) {
    return prisma.drugInteraction.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const cdsService = new CDSService();
