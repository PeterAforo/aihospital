import { normDrug } from './ai-helpers.js';

const INTERACTIONS = [
  { d1: 'warfarin', d2: 'ciprofloxacin', sev: 'major' as const, desc: 'Ciprofloxacin increases warfarin effect, bleeding risk', rec: 'Consider alternative antibiotic OR monitor INR closely' },
  { d1: 'warfarin', d2: 'aspirin', sev: 'major' as const, desc: 'Aspirin + Warfarin significantly increases bleeding risk', rec: 'Avoid unless specifically indicated; monitor for bleeding' },
  { d1: 'warfarin', d2: 'ibuprofen', sev: 'major' as const, desc: 'NSAIDs increase anticoagulant effect and GI bleeding risk', rec: 'Use paracetamol instead' },
  { d1: 'warfarin', d2: 'metronidazole', sev: 'major' as const, desc: 'Metronidazole inhibits warfarin metabolism', rec: 'Reduce warfarin dose, monitor INR' },
  { d1: 'warfarin', d2: 'fluconazole', sev: 'major' as const, desc: 'Fluconazole significantly increases warfarin effect', rec: 'Reduce warfarin dose by 25-50%, monitor INR' },
  { d1: 'methotrexate', d2: 'trimethoprim', sev: 'contraindicated' as const, desc: 'Trimethoprim increases methotrexate toxicity (bone marrow suppression)', rec: 'Do NOT combine. Use alternative antibiotic' },
  { d1: 'methotrexate', d2: 'amoxicillin', sev: 'moderate' as const, desc: 'Amoxicillin may increase methotrexate toxicity', rec: 'Monitor for methotrexate side effects' },
  { d1: 'simvastatin', d2: 'erythromycin', sev: 'major' as const, desc: 'Erythromycin increases statin levels, rhabdomyolysis risk', rec: 'Use azithromycin instead or hold statin' },
  { d1: 'amlodipine', d2: 'simvastatin', sev: 'moderate' as const, desc: 'Amlodipine increases simvastatin levels', rec: 'Limit simvastatin to 20mg daily' },
  { d1: 'ciprofloxacin', d2: 'theophylline', sev: 'major' as const, desc: 'Ciprofloxacin increases theophylline levels, toxicity risk', rec: 'Monitor theophylline levels or use alternative antibiotic' },
  { d1: 'digoxin', d2: 'amiodarone', sev: 'major' as const, desc: 'Amiodarone increases digoxin levels 70-100%', rec: 'Reduce digoxin dose by 50% when starting amiodarone' },
  { d1: 'clopidogrel', d2: 'omeprazole', sev: 'moderate' as const, desc: 'Omeprazole reduces clopidogrel effectiveness', rec: 'Use pantoprazole instead of omeprazole' },
  { d1: 'rifampicin', d2: 'oral_contraceptive', sev: 'major' as const, desc: 'Rifampicin reduces contraceptive effectiveness', rec: 'Use alternative contraception during TB treatment' },
  { d1: 'carbamazepine', d2: 'erythromycin', sev: 'major' as const, desc: 'Erythromycin increases carbamazepine levels, toxicity risk', rec: 'Use azithromycin instead' },
  { d1: 'metformin', d2: 'contrast_dye', sev: 'major' as const, desc: 'Risk of lactic acidosis with iodinated contrast', rec: 'Hold metformin 48h before and after contrast' },
  { d1: 'lithium', d2: 'diclofenac', sev: 'major' as const, desc: 'NSAIDs increase lithium levels', rec: 'Monitor lithium levels or use paracetamol' },
  { d1: 'lithium', d2: 'ibuprofen', sev: 'major' as const, desc: 'NSAIDs increase lithium levels', rec: 'Monitor lithium levels or use paracetamol' },
  { d1: 'ace_inhibitor', d2: 'potassium', sev: 'major' as const, desc: 'ACE inhibitors + potassium risk hyperkalemia', rec: 'Monitor serum potassium regularly' },
  { d1: 'enalapril', d2: 'potassium', sev: 'major' as const, desc: 'ACE inhibitors + potassium risk hyperkalemia', rec: 'Monitor serum potassium regularly' },
  { d1: 'lisinopril', d2: 'potassium', sev: 'major' as const, desc: 'ACE inhibitors + potassium risk hyperkalemia', rec: 'Monitor serum potassium regularly' },
];

const ALLERGY_GROUPS: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'flucloxacillin', 'piperacillin', 'coamoxiclav', 'augmentin'],
  sulfonamide: ['sulfamethoxazole', 'cotrimoxazole', 'sulfadiazine'],
  nsaid: ['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'aspirin', 'indomethacin'],
  cephalosporin: ['ceftriaxone', 'cefuroxime', 'cefalexin', 'cefixime', 'ceftazidime'],
};

export function checkDrugInteractions(drugs: string[], allergies: string[] = []) {
  const results: { interactions: any[]; allergyAlerts: any[] } = { interactions: [], allergyAlerts: [] };
  const normed = drugs.map(normDrug);

  for (let i = 0; i < normed.length; i++) {
    for (let j = i + 1; j < normed.length; j++) {
      for (const ix of INTERACTIONS) {
        if ((normed[i].includes(ix.d1) && normed[j].includes(ix.d2)) ||
            (normed[i].includes(ix.d2) && normed[j].includes(ix.d1))) {
          results.interactions.push({
            drug1: drugs[i], drug2: drugs[j], severity: ix.sev,
            description: ix.desc, recommendation: ix.rec,
          });
        }
      }
    }
  }

  for (const allergy of allergies.map(normDrug)) {
    for (const [group, members] of Object.entries(ALLERGY_GROUPS)) {
      if (allergy.includes(group) || members.some(m => allergy.includes(m))) {
        for (let i = 0; i < normed.length; i++) {
          if (members.some(m => normed[i].includes(m)) || normed[i].includes(group)) {
            results.allergyAlerts.push({
              drug: drugs[i], allergy, severity: 'contraindicated',
              description: `Patient allergic to ${allergy} — ${drugs[i]} is in the same class (${group})`,
              recommendation: `Do NOT prescribe. Choose alternative outside ${group} class`,
            });
          }
        }
      }
    }
  }
  return results;
}
