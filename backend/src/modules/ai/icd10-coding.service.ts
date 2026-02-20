import { strSim } from './ai-helpers.js';

const ICD10_COMMON: { code: string; description: string; keywords: string[] }[] = [
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified', keywords: ['malaria', 'falciparum'] },
  { code: 'B51.9', description: 'Plasmodium vivax malaria, unspecified', keywords: ['vivax', 'malaria'] },
  { code: 'A01.0', description: 'Typhoid fever', keywords: ['typhoid', 'enteric fever', 'salmonella typhi'] },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis', keywords: ['gastroenteritis', 'diarrhea', 'diarrhoea', 'vomiting'] },
  { code: 'A90', description: 'Dengue fever', keywords: ['dengue'] },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', keywords: ['urti', 'cold', 'upper respiratory', 'sore throat', 'pharyngitis'] },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', keywords: ['pneumonia', 'chest infection'] },
  { code: 'J45.9', description: 'Asthma, unspecified', keywords: ['asthma', 'wheeze', 'bronchospasm'] },
  { code: 'J44.1', description: 'COPD with acute exacerbation', keywords: ['copd', 'chronic obstructive'] },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', keywords: ['diabetes', 'type 2', 'dm2', 'sugar'] },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', keywords: ['type 1 diabetes', 'dm1', 'iddm'] },
  { code: 'I10', description: 'Essential (primary) hypertension', keywords: ['hypertension', 'high blood pressure', 'hbp'] },
  { code: 'I25.9', description: 'Chronic ischaemic heart disease, unspecified', keywords: ['ischemic heart', 'coronary artery', 'cad'] },
  { code: 'I50.9', description: 'Heart failure, unspecified', keywords: ['heart failure', 'cardiac failure', 'chf'] },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified', keywords: ['stroke', 'cva', 'cerebral infarction'] },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', keywords: ['heart attack', 'mi', 'myocardial infarction'] },
  { code: 'D50.9', description: 'Iron deficiency anaemia, unspecified', keywords: ['anemia', 'anaemia', 'iron deficiency'] },
  { code: 'D64.9', description: 'Anaemia, unspecified', keywords: ['anemia', 'anaemia', 'low hemoglobin'] },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', keywords: ['uti', 'urinary tract infection', 'cystitis'] },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', keywords: ['ckd', 'chronic kidney', 'renal failure'] },
  { code: 'K29.7', description: 'Gastritis, unspecified', keywords: ['gastritis', 'stomach ulcer', 'peptic'] },
  { code: 'K21.0', description: 'GERD with oesophagitis', keywords: ['gerd', 'reflux', 'heartburn'] },
  { code: 'K80.2', description: 'Calculus of gallbladder without cholecystitis', keywords: ['gallstone', 'cholelithiasis'] },
  { code: 'K35.8', description: 'Acute appendicitis, other and unspecified', keywords: ['appendicitis', 'appendix'] },
  { code: 'M54.5', description: 'Low back pain', keywords: ['back pain', 'lumbago', 'lower back'] },
  { code: 'G43.9', description: 'Migraine, unspecified', keywords: ['migraine', 'headache'] },
  { code: 'L30.9', description: 'Dermatitis, unspecified', keywords: ['dermatitis', 'eczema', 'skin rash'] },
  { code: 'B35.9', description: 'Dermatophytosis, unspecified', keywords: ['fungal', 'ringworm', 'tinea'] },
  { code: 'O80', description: 'Single spontaneous delivery', keywords: ['normal delivery', 'svd', 'vaginal delivery'] },
  { code: 'O82', description: 'Encounter for caesarean delivery', keywords: ['caesarean', 'c-section', 'cs'] },
  { code: 'O20.0', description: 'Threatened abortion', keywords: ['threatened abortion', 'threatened miscarriage'] },
  { code: 'B20', description: 'HIV disease', keywords: ['hiv', 'aids', 'human immunodeficiency'] },
  { code: 'A15.0', description: 'Tuberculosis of lung', keywords: ['tuberculosis', 'tb', 'pulmonary tb'] },
  { code: 'R50.9', description: 'Fever, unspecified', keywords: ['fever', 'pyrexia'] },
  { code: 'R10.4', description: 'Other and unspecified abdominal pain', keywords: ['abdominal pain', 'stomach pain'] },
  { code: 'R05', description: 'Cough', keywords: ['cough'] },
  { code: 'R11.2', description: 'Nausea with vomiting, unspecified', keywords: ['nausea', 'vomiting', 'emesis'] },
  { code: 'S06.0', description: 'Concussion', keywords: ['concussion', 'head injury', 'head trauma'] },
  { code: 'T78.2', description: 'Anaphylactic shock, unspecified', keywords: ['anaphylaxis', 'anaphylactic'] },
  { code: 'E86.0', description: 'Dehydration', keywords: ['dehydration', 'dehydrated'] },
  { code: 'G40.9', description: 'Epilepsy, unspecified', keywords: ['epilepsy', 'seizure', 'convulsion'] },
  { code: 'F32.9', description: 'Major depressive disorder, single episode', keywords: ['depression', 'depressive'] },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', keywords: ['anxiety', 'panic'] },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', keywords: ['hypothyroidism', 'thyroid'] },
  { code: 'E05.9', description: 'Thyrotoxicosis, unspecified', keywords: ['hyperthyroidism', 'thyrotoxicosis'] },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified', keywords: ['pharyngitis', 'sore throat', 'tonsillitis'] },
  { code: 'H66.9', description: 'Otitis media, unspecified', keywords: ['ear infection', 'otitis media'] },
  { code: 'H10.9', description: 'Conjunctivitis, unspecified', keywords: ['conjunctivitis', 'pink eye', 'eye infection'] },
];

export function searchICD10(query: string, limit = 10) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  const scored = ICD10_COMMON.map(item => {
    let score = 0;
    if (item.code.toLowerCase().startsWith(q)) score += 100;
    if (item.description.toLowerCase().includes(q)) score += 50;
    for (const kw of item.keywords) {
      if (kw.includes(q) || q.includes(kw)) score += 30;
      if (strSim(kw, q) > 70) score += 20;
    }
    return { ...item, score };
  }).filter(i => i.score > 0).sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ score, ...rest }) => rest);
}
