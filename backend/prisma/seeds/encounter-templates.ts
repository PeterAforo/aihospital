import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemTemplates = [
  {
    name: 'General Medical Consultation',
    description: 'Default template for routine outpatient visits',
    encounterType: 'OUTPATIENT',
    specialty: null,
    chiefComplaintPrompt: 'What brings you in today?',
    hpiPrompts: {
      onset: 'When did symptoms start?',
      location: 'Where is the problem?',
      duration: 'How long does it last?',
      character: 'What does it feel like?',
      aggravating: 'What makes it worse?',
      relieving: 'What makes it better?',
      timing: 'Is it constant or intermittent?',
      severity: 'How bad is it (1-10)?',
    },
    rosDefaults: {
      constitutional: ['Fever', 'Chills', 'Fatigue', 'Weight loss', 'Night sweats'],
      cardiovascular: ['Chest pain', 'Palpitations', 'Shortness of breath', 'Edema'],
      respiratory: ['Cough', 'Dyspnea', 'Wheezing', 'Sputum production'],
      gastrointestinal: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Abdominal pain'],
      genitourinary: ['Dysuria', 'Frequency', 'Urgency', 'Hematuria'],
      musculoskeletal: ['Joint pain', 'Muscle pain', 'Back pain', 'Stiffness'],
      neurological: ['Headache', 'Dizziness', 'Numbness', 'Weakness'],
      psychiatric: ['Depression', 'Anxiety', 'Sleep disturbance'],
      skin: ['Rash', 'Itching', 'Lesions'],
    },
    physicalExamDefaults: {
      general: 'Well-appearing, in no acute distress',
      heent: 'Normocephalic, PERRLA, oropharynx clear',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      respiratory: 'Clear to auscultation bilaterally',
      abdomen: 'Soft, non-tender, no masses',
      extremities: 'No edema, pulses intact',
      neurological: 'Alert and oriented x3',
    },
    commonDiagnoses: [],
    commonOrders: [],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Malaria Workup',
    description: 'Template for suspected malaria cases',
    encounterType: 'OUTPATIENT',
    specialty: 'Internal Medicine',
    chiefComplaintPrompt: 'Fever with chills',
    hpiPrompts: {
      onset: 'When did fever start?',
      pattern: 'Is fever intermittent or continuous?',
      associated: 'Any headache, body aches, nausea?',
      travel: 'Recent travel history?',
      prevention: 'Using mosquito nets?',
    },
    rosDefaults: {
      constitutional: ['Fever', 'Chills', 'Rigors', 'Fatigue', 'Night sweats'],
      gastrointestinal: ['Nausea', 'Vomiting', 'Abdominal pain'],
      neurological: ['Headache'],
    },
    physicalExamDefaults: {
      general: 'Appears ill, febrile',
      heent: 'Pale conjunctivae, icteric sclerae (check)',
      abdomen: 'Check for splenomegaly, hepatomegaly',
      skin: 'Check for pallor, jaundice',
    },
    commonDiagnoses: [
      { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified' },
      { code: 'R50.9', description: 'Fever, unspecified' },
    ],
    commonOrders: [
      { type: 'lab', name: 'Malaria RDT', code: 'MRDT' },
      { type: 'lab', name: 'Full Blood Count', code: 'FBC' },
      { type: 'lab', name: 'Blood Film for Malaria Parasites', code: 'BFMP' },
    ],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Hypertension Follow-up',
    description: 'Template for routine hypertension management visits',
    encounterType: 'FOLLOW_UP',
    specialty: 'Internal Medicine',
    chiefComplaintPrompt: 'Hypertension follow-up',
    hpiPrompts: {
      compliance: 'Are you taking medications as prescribed?',
      sideEffects: 'Any medication side effects?',
      symptoms: 'Any headaches, dizziness, chest pain?',
      lifestyle: 'Diet and exercise changes?',
      homeMonitoring: 'Home BP readings?',
    },
    rosDefaults: {
      cardiovascular: ['Chest pain', 'Palpitations', 'Shortness of breath', 'Edema'],
      neurological: ['Headache', 'Dizziness', 'Vision changes'],
    },
    physicalExamDefaults: {
      cardiovascular: 'Regular rate and rhythm, no murmurs, no JVD',
      extremities: 'No peripheral edema',
      neurological: 'No focal deficits',
    },
    commonDiagnoses: [
      { code: 'I10', description: 'Essential (primary) hypertension' },
    ],
    commonOrders: [
      { type: 'lab', name: 'Lipid Panel', code: 'LIPID' },
      { type: 'lab', name: 'Creatinine', code: 'CREAT' },
      { type: 'lab', name: 'Urinalysis', code: 'UA' },
      { type: 'lab', name: 'Electrolytes', code: 'ELEC' },
    ],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Diabetes Follow-up',
    description: 'Template for routine diabetes management visits',
    encounterType: 'FOLLOW_UP',
    specialty: 'Internal Medicine',
    chiefComplaintPrompt: 'Diabetes follow-up',
    hpiPrompts: {
      compliance: 'Medication compliance?',
      monitoring: 'Home glucose readings?',
      hypoglycemia: 'Any hypoglycemic episodes?',
      symptoms: 'Polyuria, polydipsia, weight changes?',
      footCare: 'Any foot problems?',
    },
    rosDefaults: {
      constitutional: ['Weight changes', 'Fatigue'],
      cardiovascular: ['Chest pain', 'Shortness of breath'],
      neurological: ['Numbness', 'Tingling in extremities'],
      genitourinary: ['Polyuria', 'Nocturia'],
    },
    physicalExamDefaults: {
      general: 'Check weight, BMI',
      cardiovascular: 'Heart sounds, peripheral pulses',
      extremities: 'Foot exam - sensation, pulses, skin integrity',
      neurological: 'Monofilament test, vibration sense',
    },
    commonDiagnoses: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    ],
    commonOrders: [
      { type: 'lab', name: 'HbA1c', code: 'HBA1C' },
      { type: 'lab', name: 'Fasting Blood Glucose', code: 'FBG' },
      { type: 'lab', name: 'Lipid Panel', code: 'LIPID' },
      { type: 'lab', name: 'Creatinine', code: 'CREAT' },
      { type: 'lab', name: 'Urinalysis', code: 'UA' },
    ],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Pediatric Consultation',
    description: 'Template for pediatric visits (children under 12)',
    encounterType: 'OUTPATIENT',
    specialty: 'Pediatrics',
    chiefComplaintPrompt: 'What is the child\'s main problem?',
    hpiPrompts: {
      onset: 'When did symptoms start?',
      feeding: 'How is feeding/appetite?',
      activity: 'Activity level - playing normally?',
      immunization: 'Immunizations up to date?',
      growth: 'Any growth concerns?',
    },
    rosDefaults: {
      constitutional: ['Fever', 'Poor feeding', 'Lethargy', 'Weight loss'],
      respiratory: ['Cough', 'Difficulty breathing', 'Noisy breathing'],
      gastrointestinal: ['Vomiting', 'Diarrhea', 'Abdominal pain'],
    },
    physicalExamDefaults: {
      general: 'Alert, active, appropriate for age',
      growth: 'Weight, height, head circumference (plot on growth chart)',
      heent: 'Fontanelle (if applicable), ears, throat',
      respiratory: 'Respiratory effort, breath sounds',
      abdomen: 'Soft, non-distended',
    },
    commonDiagnoses: [],
    commonOrders: [],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Antenatal Visit (ANC)',
    description: 'Template for routine antenatal care visits',
    encounterType: 'OUTPATIENT',
    specialty: 'Obstetrics',
    chiefComplaintPrompt: 'Routine ANC visit',
    hpiPrompts: {
      lmp: 'Last menstrual period?',
      edd: 'Expected delivery date?',
      gravida: 'Number of pregnancies (G)?',
      para: 'Number of deliveries (P)?',
      complaints: 'Any current complaints?',
      fetalMovement: 'Fetal movements felt?',
    },
    rosDefaults: {
      constitutional: ['Fatigue', 'Weight gain'],
      cardiovascular: ['Edema', 'Palpitations'],
      gastrointestinal: ['Nausea', 'Vomiting', 'Heartburn'],
      genitourinary: ['Vaginal bleeding', 'Discharge', 'Dysuria'],
    },
    physicalExamDefaults: {
      general: 'Weight, blood pressure',
      abdomen: 'Fundal height, fetal lie, presentation',
      fetal: 'Fetal heart rate',
      extremities: 'Check for edema',
    },
    commonDiagnoses: [
      { code: 'Z34.9', description: 'Encounter for supervision of normal pregnancy, unspecified' },
    ],
    commonOrders: [
      { type: 'lab', name: 'Hemoglobin', code: 'HB' },
      { type: 'lab', name: 'Urinalysis', code: 'UA' },
      { type: 'radiology', name: 'Obstetric Ultrasound', code: 'OB-US' },
    ],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Emergency Department Note',
    description: 'Template for emergency presentations',
    encounterType: 'EMERGENCY',
    specialty: 'Emergency Medicine',
    chiefComplaintPrompt: 'Emergency chief complaint',
    hpiPrompts: {
      onset: 'When did this start?',
      mechanism: 'What happened? (for trauma)',
      severity: 'How severe (1-10)?',
      progression: 'Getting better or worse?',
      interventions: 'Any treatment before arrival?',
    },
    rosDefaults: {
      constitutional: ['Fever', 'Chills', 'Loss of consciousness'],
      cardiovascular: ['Chest pain', 'Palpitations'],
      respiratory: ['Shortness of breath', 'Difficulty breathing'],
      neurological: ['Headache', 'Dizziness', 'Weakness', 'Numbness'],
    },
    physicalExamDefaults: {
      general: 'Appearance, level of distress',
      vitals: 'Complete vital signs including GCS',
      primary: 'Primary survey - ABCDE',
      secondary: 'Secondary survey - head to toe',
    },
    commonDiagnoses: [],
    commonOrders: [],
    isSystemTemplate: true,
    isActive: true,
  },
];

export async function seedEncounterTemplates() {
  console.log('Seeding encounter templates...');
  
  for (const template of systemTemplates) {
    await prisma.encounterTemplate.upsert({
      where: {
        tenantId_name: {
          tenantId: null as any,
          name: template.name,
        },
      },
      update: {
        description: template.description,
        encounterType: template.encounterType,
        specialty: template.specialty,
        chiefComplaintPrompt: template.chiefComplaintPrompt,
        hpiPrompts: template.hpiPrompts,
        rosDefaults: template.rosDefaults,
        physicalExamDefaults: template.physicalExamDefaults,
        commonDiagnoses: template.commonDiagnoses,
        commonOrders: template.commonOrders,
        isSystemTemplate: template.isSystemTemplate,
        isActive: template.isActive,
      },
      create: {
        tenantId: null,
        name: template.name,
        description: template.description,
        encounterType: template.encounterType,
        specialty: template.specialty,
        chiefComplaintPrompt: template.chiefComplaintPrompt,
        hpiPrompts: template.hpiPrompts,
        rosDefaults: template.rosDefaults,
        physicalExamDefaults: template.physicalExamDefaults,
        commonDiagnoses: template.commonDiagnoses,
        commonOrders: template.commonOrders,
        isSystemTemplate: template.isSystemTemplate,
        isActive: template.isActive,
      },
    });
  }
  
  console.log(`Seeded ${systemTemplates.length} encounter templates`);
}

if (require.main === module) {
  seedEncounterTemplates()
    .then(() => {
      console.log('Encounter templates seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding encounter templates:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
