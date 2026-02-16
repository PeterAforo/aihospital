import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const labTests = [
  // Hematology
  { name: 'Full Blood Count (FBC)', code: 'FBC', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 50, nhisPrice: 35, turnaroundTime: 2 },
  { name: 'Hemoglobin', code: 'HB', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Packed Cell Volume (PCV)', code: 'PCV', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 15, nhisPrice: 10, turnaroundTime: 1 },
  { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'ESR', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 25, nhisPrice: 18, turnaroundTime: 2 },
  { name: 'Blood Group & Rhesus', code: 'BG', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 30, nhisPrice: 20, turnaroundTime: 1 },
  { name: 'Sickling Test', code: 'SICK', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Hemoglobin Electrophoresis', code: 'HBE', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 80, nhisPrice: 60, turnaroundTime: 24 },
  { name: 'Clotting Time', code: 'CT', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Bleeding Time', code: 'BT', category: 'Hematology', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  
  // Biochemistry
  { name: 'Random Blood Sugar (RBS)', code: 'RBS', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Fasting Blood Sugar (FBS)', code: 'FBS', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 25, nhisPrice: 18, turnaroundTime: 1 },
  { name: 'HbA1c (Glycated Hemoglobin)', code: 'HBA1C', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 100, nhisPrice: 70, turnaroundTime: 4 },
  { name: 'Lipid Profile', code: 'LIPID', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 120, nhisPrice: 80, turnaroundTime: 4 },
  { name: 'Liver Function Test (LFT)', code: 'LFT', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 150, nhisPrice: 100, turnaroundTime: 4 },
  { name: 'Renal Function Test (RFT)', code: 'RFT', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 120, nhisPrice: 80, turnaroundTime: 4 },
  { name: 'Urea', code: 'UREA', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 30, nhisPrice: 20, turnaroundTime: 2 },
  { name: 'Creatinine', code: 'CREAT', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 30, nhisPrice: 20, turnaroundTime: 2 },
  { name: 'Electrolytes (Na, K, Cl)', code: 'ELEC', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 80, nhisPrice: 55, turnaroundTime: 2 },
  { name: 'Uric Acid', code: 'UA', category: 'Biochemistry', sampleType: 'Blood', nhisApproved: true, cashPrice: 35, nhisPrice: 25, turnaroundTime: 2 },
  
  // Microbiology
  { name: 'Malaria Parasite (MP)', code: 'MP', category: 'Microbiology', sampleType: 'Blood', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Malaria RDT', code: 'MRDT', category: 'Microbiology', sampleType: 'Blood', nhisApproved: true, cashPrice: 25, nhisPrice: 18, turnaroundTime: 0.5 },
  { name: 'Widal Test', code: 'WIDAL', category: 'Microbiology', sampleType: 'Blood', nhisApproved: true, cashPrice: 40, nhisPrice: 28, turnaroundTime: 2 },
  { name: 'Stool Routine Examination', code: 'STOOL', category: 'Microbiology', sampleType: 'Stool', nhisApproved: true, cashPrice: 25, nhisPrice: 18, turnaroundTime: 2 },
  { name: 'Urine Routine Examination', code: 'URINE', category: 'Microbiology', sampleType: 'Urine', nhisApproved: true, cashPrice: 20, nhisPrice: 15, turnaroundTime: 1 },
  { name: 'Urine Culture & Sensitivity', code: 'UCS', category: 'Microbiology', sampleType: 'Urine', nhisApproved: true, cashPrice: 80, nhisPrice: 55, turnaroundTime: 48 },
  { name: 'Blood Culture', code: 'BC', category: 'Microbiology', sampleType: 'Blood', nhisApproved: true, cashPrice: 120, nhisPrice: 80, turnaroundTime: 72 },
  { name: 'Sputum AFB', code: 'AFB', category: 'Microbiology', sampleType: 'Sputum', nhisApproved: true, cashPrice: 30, nhisPrice: 20, turnaroundTime: 24 },
  { name: 'GeneXpert MTB/RIF', code: 'GENEX', category: 'Microbiology', sampleType: 'Sputum', nhisApproved: true, cashPrice: 150, nhisPrice: 0, turnaroundTime: 4 },
  
  // Serology
  { name: 'HIV Screening', code: 'HIV', category: 'Serology', sampleType: 'Blood', nhisApproved: true, cashPrice: 30, nhisPrice: 0, turnaroundTime: 1 },
  { name: 'Hepatitis B Surface Antigen (HBsAg)', code: 'HBSAG', category: 'Serology', sampleType: 'Blood', nhisApproved: true, cashPrice: 40, nhisPrice: 28, turnaroundTime: 2 },
  { name: 'Hepatitis C Antibody', code: 'HCV', category: 'Serology', sampleType: 'Blood', nhisApproved: true, cashPrice: 50, nhisPrice: 35, turnaroundTime: 2 },
  { name: 'VDRL/RPR (Syphilis)', code: 'VDRL', category: 'Serology', sampleType: 'Blood', nhisApproved: true, cashPrice: 30, nhisPrice: 20, turnaroundTime: 2 },
  { name: 'Pregnancy Test (Urine)', code: 'UPT', category: 'Serology', sampleType: 'Urine', nhisApproved: true, cashPrice: 15, nhisPrice: 10, turnaroundTime: 0.5 },
  { name: 'Pregnancy Test (Blood)', code: 'BPT', category: 'Serology', sampleType: 'Blood', nhisApproved: true, cashPrice: 40, nhisPrice: 28, turnaroundTime: 2 },
  
  // Hormones
  { name: 'Thyroid Function Test (TFT)', code: 'TFT', category: 'Hormones', sampleType: 'Blood', nhisApproved: false, cashPrice: 200, turnaroundTime: 24 },
  { name: 'Prostate Specific Antigen (PSA)', code: 'PSA', category: 'Hormones', sampleType: 'Blood', nhisApproved: false, cashPrice: 150, turnaroundTime: 24 },
];

export async function seedLabTests() {
  console.log('Seeding lab tests...');
  
  for (const test of labTests) {
    await prisma.labTest.upsert({
      where: { id: test.code },
      update: {
        name: test.name,
        code: test.code,
        category: test.category,
        sampleType: test.sampleType,
        nhisApproved: test.nhisApproved,
        cashPrice: test.cashPrice,
        nhisPrice: test.nhisPrice,
        turnaroundTime: test.turnaroundTime,
        isActive: true,
      },
      create: {
        id: test.code,
        name: test.name,
        code: test.code,
        category: test.category,
        sampleType: test.sampleType,
        nhisApproved: test.nhisApproved,
        cashPrice: test.cashPrice,
        nhisPrice: test.nhisPrice,
        turnaroundTime: test.turnaroundTime,
        isActive: true,
      },
    });
  }
  
  console.log(`Seeded ${labTests.length} lab tests`);
}

if (require.main === module) {
  seedLabTests()
    .then(() => {
      console.log('Lab tests seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding lab tests:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
