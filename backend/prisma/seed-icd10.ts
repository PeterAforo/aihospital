import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const codes = [
  // Infectious diseases
  { code: 'A01.0', description: 'Typhoid fever', chapter: 1, category: 'Intestinal infectious diseases', isCommonGhana: true, synonyms: ['typhoid', 'enteric fever'] },
  { code: 'A06.0', description: 'Acute amoebic dysentery', chapter: 1, category: 'Intestinal infectious diseases', isCommonGhana: true, synonyms: ['dysentery', 'amoebiasis'] },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', chapter: 1, category: 'Intestinal infectious diseases', isCommonGhana: true, synonyms: ['diarrhea', 'gastro', 'food poisoning'] },
  { code: 'A15.0', description: 'Tuberculosis of lung', chapter: 1, category: 'Tuberculosis', isCommonGhana: true, synonyms: ['TB', 'pulmonary TB'] },
  { code: 'B20', description: 'Human immunodeficiency virus [HIV] disease', chapter: 1, category: 'HIV disease', isCommonGhana: true, synonyms: ['HIV', 'AIDS'] },
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified', chapter: 1, category: 'Malaria', isCommonGhana: true, synonyms: ['malaria', 'falciparum'] },
  { code: 'B54', description: 'Unspecified malaria', chapter: 1, category: 'Malaria', isCommonGhana: true, synonyms: ['malaria', 'fever malaria'] },
  { code: 'B16.9', description: 'Acute hepatitis B', chapter: 1, category: 'Viral hepatitis', isCommonGhana: true, synonyms: ['hepatitis B', 'hep B'] },
  { code: 'B82.0', description: 'Intestinal helminthiasis, unspecified', chapter: 1, category: 'Helminthiases', isCommonGhana: true, synonyms: ['worms', 'intestinal worms'] },
  // Blood diseases
  { code: 'D50.9', description: 'Iron deficiency anaemia, unspecified', chapter: 3, category: 'Nutritional anaemias', isCommonGhana: true, synonyms: ['anemia', 'anaemia', 'iron deficiency'] },
  { code: 'D57.0', description: 'Sickle-cell anaemia with crisis', chapter: 3, category: 'Haemolytic anaemias', isCommonGhana: true, synonyms: ['sickle cell crisis', 'SCD crisis'] },
  { code: 'D57.1', description: 'Sickle-cell disease without crisis', chapter: 3, category: 'Haemolytic anaemias', isCommonGhana: true, synonyms: ['sickle cell', 'SCD'] },
  // Endocrine/metabolic
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 4, category: 'Diabetes mellitus', isCommonGhana: true, synonyms: ['diabetes', 'T2DM', 'sugar disease'] },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', chapter: 4, category: 'Diabetes mellitus', isCommonGhana: true, synonyms: ['type 1 diabetes', 'T1DM'] },
  { code: 'E46', description: 'Unspecified protein-calorie malnutrition', chapter: 4, category: 'Malnutrition', isCommonGhana: true, synonyms: ['malnutrition'] },
  { code: 'E66.9', description: 'Obesity, unspecified', chapter: 4, category: 'Obesity', isCommonGhana: false, synonyms: ['obesity', 'overweight'] },
  { code: 'E78.5', description: 'Hyperlipidaemia, unspecified', chapter: 4, category: 'Lipoprotein disorders', isCommonGhana: false, synonyms: ['high cholesterol', 'dyslipidemia'] },
  // Mental
  { code: 'F32.9', description: 'Depressive episode, unspecified', chapter: 5, category: 'Mood disorders', isCommonGhana: false, synonyms: ['depression'] },
  { code: 'F41.1', description: 'Generalized anxiety disorder', chapter: 5, category: 'Anxiety disorders', isCommonGhana: false, synonyms: ['anxiety', 'GAD'] },
  // Nervous system
  { code: 'G40.9', description: 'Epilepsy, unspecified', chapter: 6, category: 'Episodic disorders', isCommonGhana: true, synonyms: ['epilepsy', 'seizure', 'fits'] },
  { code: 'G43.9', description: 'Migraine, unspecified', chapter: 6, category: 'Episodic disorders', isCommonGhana: false, synonyms: ['migraine'] },
  // Circulatory
  { code: 'I10', description: 'Essential (primary) hypertension', chapter: 9, category: 'Hypertensive diseases', isCommonGhana: true, synonyms: ['hypertension', 'high blood pressure', 'HTN'] },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', chapter: 9, category: 'Ischaemic heart diseases', isCommonGhana: false, synonyms: ['heart attack', 'MI'] },
  { code: 'I50.9', description: 'Heart failure, unspecified', chapter: 9, category: 'Heart disease', isCommonGhana: true, synonyms: ['heart failure', 'CHF'] },
  { code: 'I64', description: 'Stroke, not specified', chapter: 9, category: 'Cerebrovascular diseases', isCommonGhana: true, synonyms: ['stroke', 'CVA'] },
  // Respiratory
  { code: 'J00', description: 'Acute nasopharyngitis [common cold]', chapter: 10, category: 'Upper respiratory infections', isCommonGhana: true, synonyms: ['common cold', 'URTI', 'cold'] },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified', chapter: 10, category: 'Upper respiratory infections', isCommonGhana: true, synonyms: ['sore throat', 'pharyngitis'] },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', chapter: 10, category: 'Upper respiratory infections', isCommonGhana: true, synonyms: ['URTI', 'URI'] },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', chapter: 10, category: 'Pneumonia', isCommonGhana: true, synonyms: ['pneumonia', 'chest infection'] },
  { code: 'J45.9', description: 'Asthma, unspecified', chapter: 10, category: 'Chronic lower respiratory diseases', isCommonGhana: true, synonyms: ['asthma', 'wheezing'] },
  { code: 'J46', description: 'Status asthmaticus', chapter: 10, category: 'Chronic lower respiratory diseases', isCommonGhana: true, synonyms: ['acute severe asthma', 'asthma attack'] },
  // Digestive
  { code: 'K25.9', description: 'Gastric ulcer, unspecified', chapter: 11, category: 'Stomach diseases', isCommonGhana: true, synonyms: ['stomach ulcer', 'peptic ulcer'] },
  { code: 'K29.7', description: 'Gastritis, unspecified', chapter: 11, category: 'Stomach diseases', isCommonGhana: true, synonyms: ['gastritis'] },
  { code: 'K30', description: 'Functional dyspepsia', chapter: 11, category: 'Stomach diseases', isCommonGhana: true, synonyms: ['dyspepsia', 'indigestion'] },
  { code: 'K35.9', description: 'Acute appendicitis, unspecified', chapter: 11, category: 'Appendix diseases', isCommonGhana: true, synonyms: ['appendicitis'] },
  { code: 'K40.9', description: 'Inguinal hernia', chapter: 11, category: 'Hernia', isCommonGhana: true, synonyms: ['hernia', 'groin hernia'] },
  { code: 'K52.9', description: 'Non-infective gastroenteritis', chapter: 11, category: 'Enteritis', isCommonGhana: true, synonyms: ['gastroenteritis', 'stomach flu'] },
  // Skin
  { code: 'L02.9', description: 'Cutaneous abscess, unspecified', chapter: 12, category: 'Skin infections', isCommonGhana: true, synonyms: ['abscess', 'boil'] },
  { code: 'L30.9', description: 'Dermatitis, unspecified', chapter: 12, category: 'Dermatitis', isCommonGhana: true, synonyms: ['dermatitis', 'eczema', 'rash'] },
  // Musculoskeletal
  { code: 'M54.5', description: 'Low back pain', chapter: 13, category: 'Dorsopathies', isCommonGhana: true, synonyms: ['back pain', 'lumbago', 'LBP'] },
  { code: 'M25.5', description: 'Pain in joint', chapter: 13, category: 'Joint disorders', isCommonGhana: true, synonyms: ['joint pain', 'arthralgia'] },
  // Genitourinary
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', chapter: 14, category: 'Kidney diseases', isCommonGhana: true, synonyms: ['CKD', 'kidney failure'] },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', chapter: 14, category: 'Urinary diseases', isCommonGhana: true, synonyms: ['UTI', 'urine infection'] },
  // Pregnancy
  { code: 'O14.1', description: 'Severe pre-eclampsia', chapter: 15, category: 'Hypertensive disorders in pregnancy', isCommonGhana: true, synonyms: ['preeclampsia'] },
  { code: 'O80', description: 'Single spontaneous delivery', chapter: 15, category: 'Delivery', isCommonGhana: true, synonyms: ['normal delivery', 'SVD'] },
  { code: 'O82', description: 'Delivery by caesarean section', chapter: 15, category: 'Delivery', isCommonGhana: true, synonyms: ['C-section', 'caesarean'] },
  // Perinatal
  { code: 'P59.9', description: 'Neonatal jaundice, unspecified', chapter: 16, category: 'Neonatal jaundice', isCommonGhana: true, synonyms: ['neonatal jaundice', 'NNJ'] },
  // Symptoms/signs
  { code: 'R05', description: 'Cough', chapter: 18, category: 'Respiratory symptoms', isCommonGhana: true, synonyms: ['cough', 'coughing'] },
  { code: 'R07.9', description: 'Chest pain, unspecified', chapter: 18, category: 'Circulatory symptoms', isCommonGhana: true, synonyms: ['chest pain'] },
  { code: 'R10.4', description: 'Other and unspecified abdominal pain', chapter: 18, category: 'Digestive symptoms', isCommonGhana: true, synonyms: ['abdominal pain', 'stomach pain'] },
  { code: 'R11', description: 'Nausea and vomiting', chapter: 18, category: 'Digestive symptoms', isCommonGhana: true, synonyms: ['nausea', 'vomiting'] },
  { code: 'R42', description: 'Dizziness and giddiness', chapter: 18, category: 'General symptoms', isCommonGhana: true, synonyms: ['dizziness', 'vertigo'] },
  { code: 'R50.9', description: 'Fever, unspecified', chapter: 18, category: 'General symptoms', isCommonGhana: true, synonyms: ['fever', 'pyrexia', 'high temperature'] },
  { code: 'R51', description: 'Headache', chapter: 18, category: 'General symptoms', isCommonGhana: true, synonyms: ['headache', 'head pain'] },
  { code: 'R53', description: 'Malaise and fatigue', chapter: 18, category: 'General symptoms', isCommonGhana: true, synonyms: ['fatigue', 'weakness', 'tiredness'] },
  { code: 'R56.0', description: 'Febrile convulsions', chapter: 18, category: 'General symptoms', isCommonGhana: true, synonyms: ['febrile seizure', 'fever fits'] },
  // Injury
  { code: 'T14.9', description: 'Injury, unspecified', chapter: 19, category: 'Injuries', isCommonGhana: true, synonyms: ['injury', 'trauma'] },
  { code: 'T30.0', description: 'Burn of unspecified body region', chapter: 19, category: 'Burns', isCommonGhana: true, synonyms: ['burn', 'burns'] },
  { code: 'T63.0', description: 'Toxic effect of snake venom', chapter: 19, category: 'Toxic effects', isCommonGhana: true, synonyms: ['snake bite', 'snakebite'] },
  // Health services
  { code: 'Z00.0', description: 'General adult medical examination', chapter: 21, category: 'Health examination', isCommonGhana: true, synonyms: ['checkup', 'health screening'] },
  { code: 'Z34.9', description: 'Supervision of normal pregnancy, unspecified', chapter: 21, category: 'Reproduction', isCommonGhana: true, synonyms: ['antenatal care', 'ANC', 'prenatal'] },
];

async function main() {
  console.log('Seeding ICD-10 codes...');
  let created = 0;
  for (const code of codes) {
    await prisma.iCD10Code.upsert({
      where: { code: code.code },
      update: code,
      create: code,
    });
    created++;
  }
  console.log(`Seeded ${created} ICD-10 codes.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
