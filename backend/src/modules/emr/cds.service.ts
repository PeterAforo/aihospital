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

// Known drug-drug interactions
// Each entry: [drugA keywords, drugB keywords, severity, message]
const DRUG_INTERACTIONS: [string[], string[], AlertSeverity, string][] = [
  [['warfarin'], ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen'], 'WARNING', 'Increased bleeding risk. Monitor INR closely.'],
  [['warfarin'], ['metronidazole'], 'WARNING', 'Metronidazole increases warfarin effect. Monitor INR.'],
  [['warfarin'], ['erythromycin', 'azithromycin', 'ciprofloxacin'], 'WARNING', 'Antibiotic may increase warfarin effect. Monitor INR.'],
  [['metformin'], ['contrast dye'], 'WARNING', 'Hold metformin 48h before/after contrast.'],
  [['digoxin'], ['furosemide', 'hydrochlorothiazide'], 'WARNING', 'Diuretic-induced hypokalemia increases digoxin toxicity risk. Monitor K+.'],
  [['digoxin'], ['amiodarone'], 'WARNING', 'Amiodarone increases digoxin levels. Reduce digoxin dose by 50%.'],
  [['lisinopril', 'enalapril', 'ramipril'], ['losartan', 'valsartan'], 'WARNING', 'ACE inhibitor + ARB: increased risk of hyperkalemia and renal impairment.'],
  [['lisinopril', 'enalapril', 'ramipril'], ['potassium'], 'WARNING', 'ACE inhibitor + potassium: risk of hyperkalemia. Monitor K+.'],
  [['simvastatin', 'atorvastatin'], ['erythromycin', 'clarithromycin'], 'WARNING', 'Macrolide increases statin levels. Risk of rhabdomyolysis.'],
  [['methotrexate'], ['nsaid', 'ibuprofen', 'diclofenac'], 'CRITICAL', 'NSAIDs reduce methotrexate clearance. Potentially fatal toxicity.'],
  [['carbamazepine'], ['erythromycin'], 'WARNING', 'Erythromycin increases carbamazepine levels. Risk of toxicity.'],
  [['phenytoin'], ['metronidazole', 'fluconazole'], 'WARNING', 'May increase phenytoin levels. Monitor levels.'],
  [['tramadol'], ['fluoxetine', 'amitriptyline'], 'WARNING', 'Serotonin syndrome risk. Use with caution.'],
  [['amlodipine', 'nifedipine'], ['atenolol'], 'INFO', 'Calcium channel blocker + beta blocker: monitor for excessive bradycardia/hypotension.'],
  [['insulin regular', 'insulin nph'], ['glibenclamide', 'metformin'], 'INFO', 'Multiple hypoglycemics: increased hypoglycemia risk. Monitor blood glucose.'],
  [['ciprofloxacin'], ['antacid', 'omeprazole', 'ranitidine'], 'INFO', 'Antacids may reduce ciprofloxacin absorption. Space doses 2h apart.'],
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

    for (const [groupA, groupB, severity, message] of DRUG_INTERACTIONS) {
      // Check if any drug from groupA and groupB are both present
      const hasA = combinedDrugNames.some(dn => groupA.some(a => dn.includes(a)));
      const hasB = combinedDrugNames.some(dn => groupB.some(b => dn.includes(b)));

      if (hasA && hasB) {
        // Find which new drug triggered this
        const triggerDrug = drugs.find(d => {
          const name = d.genericName.toLowerCase();
          return groupA.some(a => name.includes(a)) || groupB.some(b => name.includes(b));
        });

        if (triggerDrug) {
          // Avoid duplicate alerts
          const alreadyAlerted = alerts.some(
            a => a.type === 'INTERACTION' && a.message === message && a.drugId === triggerDrug.id
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
              details: `${triggerDrug.genericName} interacts with ${interactingWith || 'another prescribed medication'}. ${message}`,
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
}

export const cdsService = new CDSService();
