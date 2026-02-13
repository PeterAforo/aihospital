import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ghana common ICD-10 codes based on disease prevalence
const ghanaCommonCodes = [
  // Infectious Diseases - Very common in Ghana
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['malaria', 'fever', 'plasmodium'] },
  { code: 'B51.9', description: 'Plasmodium vivax malaria, unspecified', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['vivax malaria'] },
  { code: 'B54', description: 'Unspecified malaria', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['malaria', 'fever'] },
  { code: 'A01.0', description: 'Typhoid fever', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['typhoid', 'enteric fever', 'salmonella typhi'] },
  { code: 'A09', description: 'Diarrhea and gastroenteritis of presumed infectious origin', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['diarrhea', 'gastroenteritis', 'stomach flu', 'running stomach'] },
  { code: 'A06.0', description: 'Acute amebic dysentery', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['dysentery', 'bloody diarrhea', 'amoeba'] },
  { code: 'B20', description: 'Human immunodeficiency virus [HIV] disease', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['HIV', 'AIDS', 'retroviral'] },
  { code: 'A15.0', description: 'Tuberculosis of lung', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['TB', 'tuberculosis', 'pulmonary TB'] },
  { code: 'B37.0', description: 'Candidal stomatitis (oral thrush)', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['thrush', 'oral candida', 'mouth fungus'] },
  
  // Respiratory
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['pneumonia', 'chest infection', 'lung infection'] },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['URTI', 'cold', 'flu', 'common cold'] },
  { code: 'J45.9', description: 'Asthma, unspecified', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['asthma', 'wheezing', 'bronchial asthma'] },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['bronchitis', 'chest cold', 'cough'] },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['sore throat', 'pharyngitis', 'throat infection'] },
  { code: 'J03.9', description: 'Acute tonsillitis, unspecified', chapter: 10, category: 'Respiratory diseases', isCommonGhana: true, synonyms: ['tonsillitis', 'tonsils', 'throat infection'] },
  
  // Cardiovascular - High prevalence NCDs
  { code: 'I10', description: 'Essential (primary) hypertension', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: true, synonyms: ['hypertension', 'high blood pressure', 'BP', 'HTN'] },
  { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: true, synonyms: ['hypertensive heart disease'] },
  { code: 'I50.9', description: 'Heart failure, unspecified', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: true, synonyms: ['heart failure', 'CHF', 'cardiac failure'] },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: true, synonyms: ['heart attack', 'MI', 'myocardial infarction'] },
  { code: 'I64', description: 'Stroke, not specified as hemorrhage or infarction', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: true, synonyms: ['stroke', 'CVA', 'cerebrovascular accident'] },
  
  // Endocrine - Diabetes very common
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 4, category: 'Endocrine diseases', isCommonGhana: true, synonyms: ['diabetes', 'sugar disease', 'DM', 'type 2 diabetes'] },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', chapter: 4, category: 'Endocrine diseases', isCommonGhana: true, synonyms: ['diabetes with high sugar', 'uncontrolled diabetes'] },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', chapter: 4, category: 'Endocrine diseases', isCommonGhana: true, synonyms: ['type 1 diabetes', 'juvenile diabetes', 'insulin dependent'] },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', chapter: 4, category: 'Endocrine diseases', isCommonGhana: true, synonyms: ['hypothyroid', 'low thyroid', 'underactive thyroid'] },
  
  // Blood disorders - Sickle cell very common in Ghana
  { code: 'D57.0', description: 'Sickle-cell anemia with crisis', chapter: 3, category: 'Blood diseases', isCommonGhana: true, synonyms: ['sickle cell crisis', 'SS crisis', 'vaso-occlusive crisis'] },
  { code: 'D57.1', description: 'Sickle-cell anemia without crisis', chapter: 3, category: 'Blood diseases', isCommonGhana: true, synonyms: ['sickle cell', 'SS disease', 'sickle cell anemia'] },
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified', chapter: 3, category: 'Blood diseases', isCommonGhana: true, synonyms: ['anemia', 'low blood', 'iron deficiency'] },
  { code: 'D64.9', description: 'Anemia, unspecified', chapter: 3, category: 'Blood diseases', isCommonGhana: true, synonyms: ['anemia', 'low hemoglobin', 'low blood'] },
  
  // Maternal health
  { code: 'O80', description: 'Single spontaneous delivery', chapter: 15, category: 'Pregnancy and childbirth', isCommonGhana: true, synonyms: ['normal delivery', 'vaginal delivery', 'SVD'] },
  { code: 'O14.9', description: 'Pre-eclampsia, unspecified', chapter: 15, category: 'Pregnancy and childbirth', isCommonGhana: true, synonyms: ['pre-eclampsia', 'pregnancy hypertension', 'toxemia'] },
  { code: 'O72.0', description: 'Third-stage hemorrhage (postpartum hemorrhage)', chapter: 15, category: 'Pregnancy and childbirth', isCommonGhana: true, synonyms: ['PPH', 'postpartum bleeding', 'delivery bleeding'] },
  { code: 'Z34.9', description: 'Encounter for supervision of normal pregnancy, unspecified', chapter: 21, category: 'Pregnancy and childbirth', isCommonGhana: true, synonyms: ['antenatal', 'ANC', 'pregnancy checkup'] },
  
  // Gastrointestinal
  { code: 'K29.7', description: 'Gastritis, unspecified', chapter: 11, category: 'Digestive diseases', isCommonGhana: true, synonyms: ['gastritis', 'stomach ulcer', 'stomach pain'] },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', chapter: 11, category: 'Digestive diseases', isCommonGhana: true, synonyms: ['GERD', 'acid reflux', 'heartburn'] },
  { code: 'K59.0', description: 'Constipation', chapter: 11, category: 'Digestive diseases', isCommonGhana: true, synonyms: ['constipation', 'hard stool'] },
  
  // Musculoskeletal
  { code: 'M54.5', description: 'Low back pain', chapter: 13, category: 'Musculoskeletal diseases', isCommonGhana: true, synonyms: ['back pain', 'lumbago', 'lower back pain'] },
  { code: 'M25.5', description: 'Pain in joint', chapter: 13, category: 'Musculoskeletal diseases', isCommonGhana: true, synonyms: ['joint pain', 'arthralgia'] },
  { code: 'M79.3', description: 'Panniculitis, unspecified', chapter: 13, category: 'Musculoskeletal diseases', isCommonGhana: false, synonyms: ['body pain', 'muscle pain'] },
  
  // Neurological
  { code: 'G43.9', description: 'Migraine, unspecified', chapter: 6, category: 'Nervous system diseases', isCommonGhana: true, synonyms: ['migraine', 'headache', 'severe headache'] },
  { code: 'G44.2', description: 'Tension-type headache', chapter: 6, category: 'Nervous system diseases', isCommonGhana: true, synonyms: ['tension headache', 'stress headache'] },
  { code: 'R51', description: 'Headache', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['headache', 'head pain'] },
  
  // Skin
  { code: 'L30.9', description: 'Dermatitis, unspecified', chapter: 12, category: 'Skin diseases', isCommonGhana: true, synonyms: ['dermatitis', 'skin rash', 'eczema'] },
  { code: 'B35.4', description: 'Tinea corporis (ringworm)', chapter: 1, category: 'Infectious diseases', isCommonGhana: true, synonyms: ['ringworm', 'tinea', 'fungal infection'] },
  
  // Urinary
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', chapter: 14, category: 'Genitourinary diseases', isCommonGhana: true, synonyms: ['UTI', 'urine infection', 'bladder infection'] },
  
  // Mental health
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', chapter: 5, category: 'Mental disorders', isCommonGhana: true, synonyms: ['depression', 'depressive disorder'] },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', chapter: 5, category: 'Mental disorders', isCommonGhana: true, synonyms: ['anxiety', 'nervousness', 'panic'] },
  
  // Symptoms and signs
  { code: 'R50.9', description: 'Fever, unspecified', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['fever', 'pyrexia', 'high temperature'] },
  { code: 'R05', description: 'Cough', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['cough', 'coughing'] },
  { code: 'R10.4', description: 'Other and unspecified abdominal pain', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['abdominal pain', 'stomach ache', 'belly pain'] },
  { code: 'R11', description: 'Nausea and vomiting', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['vomiting', 'nausea', 'throwing up'] },
  { code: 'R53', description: 'Malaise and fatigue', chapter: 18, category: 'Symptoms and signs', isCommonGhana: true, synonyms: ['fatigue', 'tiredness', 'weakness', 'malaise'] },
];

// Additional common ICD-10 codes (not Ghana-specific but frequently used)
const additionalCodes = [
  // Injuries
  { code: 'S00.9', description: 'Superficial injury of head, unspecified', chapter: 19, category: 'Injuries', isCommonGhana: false, synonyms: ['head injury', 'head trauma'] },
  { code: 'S60.9', description: 'Superficial injury of wrist, hand and fingers, unspecified', chapter: 19, category: 'Injuries', isCommonGhana: false, synonyms: ['hand injury', 'finger injury'] },
  { code: 'S90.9', description: 'Superficial injury of ankle, foot and toes, unspecified', chapter: 19, category: 'Injuries', isCommonGhana: false, synonyms: ['foot injury', 'ankle injury'] },
  { code: 'T14.9', description: 'Injury, unspecified', chapter: 19, category: 'Injuries', isCommonGhana: false, synonyms: ['injury', 'trauma'] },
  
  // Eye
  { code: 'H10.9', description: 'Conjunctivitis, unspecified', chapter: 7, category: 'Eye diseases', isCommonGhana: false, synonyms: ['pink eye', 'conjunctivitis', 'red eye'] },
  { code: 'H52.1', description: 'Myopia', chapter: 7, category: 'Eye diseases', isCommonGhana: false, synonyms: ['short-sightedness', 'nearsightedness'] },
  
  // Ear
  { code: 'H66.9', description: 'Otitis media, unspecified', chapter: 8, category: 'Ear diseases', isCommonGhana: false, synonyms: ['ear infection', 'middle ear infection'] },
  
  // Additional cardiovascular
  { code: 'I20.9', description: 'Angina pectoris, unspecified', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: false, synonyms: ['angina', 'chest pain', 'cardiac chest pain'] },
  { code: 'I25.9', description: 'Chronic ischemic heart disease, unspecified', chapter: 9, category: 'Cardiovascular diseases', isCommonGhana: false, synonyms: ['coronary artery disease', 'CAD', 'ischemic heart disease'] },
  
  // Additional endocrine
  { code: 'E05.9', description: 'Thyrotoxicosis, unspecified', chapter: 4, category: 'Endocrine diseases', isCommonGhana: false, synonyms: ['hyperthyroid', 'overactive thyroid'] },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', chapter: 4, category: 'Endocrine diseases', isCommonGhana: false, synonyms: ['high cholesterol', 'dyslipidemia'] },
  
  // Kidney
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', chapter: 14, category: 'Genitourinary diseases', isCommonGhana: false, synonyms: ['CKD', 'kidney failure', 'renal failure'] },
  { code: 'N17.9', description: 'Acute kidney failure, unspecified', chapter: 14, category: 'Genitourinary diseases', isCommonGhana: false, synonyms: ['AKI', 'acute renal failure'] },
];

export async function seedICD10Codes() {
  console.log('Seeding ICD-10 codes...');
  
  const allCodes = [...ghanaCommonCodes, ...additionalCodes];
  
  for (const code of allCodes) {
    await prisma.iCD10Code.upsert({
      where: { code: code.code },
      update: {
        description: code.description,
        chapter: code.chapter,
        category: code.category,
        isCommonGhana: code.isCommonGhana,
        synonyms: code.synonyms,
      },
      create: {
        code: code.code,
        description: code.description,
        chapter: code.chapter,
        category: code.category,
        isCommonGhana: code.isCommonGhana,
        synonyms: code.synonyms,
      },
    });
  }
  
  console.log(`Seeded ${allCodes.length} ICD-10 codes`);
}

// Run if called directly
if (require.main === module) {
  seedICD10Codes()
    .then(() => {
      console.log('ICD-10 seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding ICD-10 codes:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
