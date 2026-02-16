import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const drugs = [
  // Antimalarials
  { genericName: 'Artemether-Lumefantrine', brandName: 'Coartem', strength: '20/120mg', form: 'Tablet', category: 'Antimalarial', nhisApproved: true, cashPrice: 25, nhisPrice: 18 },
  { genericName: 'Artesunate', brandName: 'Artesun', strength: '60mg', form: 'Injection', category: 'Antimalarial', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Quinine', brandName: 'Quinine Sulphate', strength: '300mg', form: 'Tablet', category: 'Antimalarial', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  
  // Antibiotics
  { genericName: 'Amoxicillin', brandName: 'Amoxil', strength: '500mg', form: 'Capsule', category: 'Antibiotic', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Amoxicillin', brandName: 'Amoxil', strength: '250mg/5ml', form: 'Suspension', category: 'Antibiotic', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Amoxicillin-Clavulanate', brandName: 'Augmentin', strength: '625mg', form: 'Tablet', category: 'Antibiotic', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Azithromycin', brandName: 'Zithromax', strength: '500mg', form: 'Tablet', category: 'Antibiotic', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Ciprofloxacin', brandName: 'Cipro', strength: '500mg', form: 'Tablet', category: 'Antibiotic', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Metronidazole', brandName: 'Flagyl', strength: '400mg', form: 'Tablet', category: 'Antibiotic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.8 },
  { genericName: 'Ceftriaxone', brandName: 'Rocephin', strength: '1g', form: 'Injection', category: 'Antibiotic', nhisApproved: true, cashPrice: 25, nhisPrice: 18 },
  { genericName: 'Doxycycline', brandName: 'Vibramycin', strength: '100mg', form: 'Capsule', category: 'Antibiotic', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Erythromycin', brandName: 'Erythrocin', strength: '500mg', form: 'Tablet', category: 'Antibiotic', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  
  // Analgesics/Antipyretics
  { genericName: 'Paracetamol', brandName: 'Panadol', strength: '500mg', form: 'Tablet', category: 'Analgesic', nhisApproved: true, cashPrice: 0.5, nhisPrice: 0.3 },
  { genericName: 'Paracetamol', brandName: 'Calpol', strength: '120mg/5ml', form: 'Suspension', category: 'Analgesic', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Ibuprofen', brandName: 'Brufen', strength: '400mg', form: 'Tablet', category: 'NSAID', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Diclofenac', brandName: 'Voltaren', strength: '50mg', form: 'Tablet', category: 'NSAID', nhisApproved: true, cashPrice: 1.5, nhisPrice: 1 },
  { genericName: 'Tramadol', brandName: 'Tramal', strength: '50mg', form: 'Capsule', category: 'Analgesic', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  
  // Antihypertensives
  { genericName: 'Amlodipine', brandName: 'Norvasc', strength: '5mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Amlodipine', brandName: 'Norvasc', strength: '10mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Lisinopril', brandName: 'Zestril', strength: '10mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Losartan', brandName: 'Cozaar', strength: '50mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 4, nhisPrice: 3 },
  { genericName: 'Atenolol', brandName: 'Tenormin', strength: '50mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Hydrochlorothiazide', brandName: 'Esidrex', strength: '25mg', form: 'Tablet', category: 'Diuretic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Furosemide', brandName: 'Lasix', strength: '40mg', form: 'Tablet', category: 'Diuretic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  
  // Antidiabetics
  { genericName: 'Metformin', brandName: 'Glucophage', strength: '500mg', form: 'Tablet', category: 'Antidiabetic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Metformin', brandName: 'Glucophage', strength: '850mg', form: 'Tablet', category: 'Antidiabetic', nhisApproved: true, cashPrice: 1.5, nhisPrice: 1 },
  { genericName: 'Glibenclamide', brandName: 'Daonil', strength: '5mg', form: 'Tablet', category: 'Antidiabetic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Insulin Regular', brandName: 'Actrapid', strength: '100IU/ml', form: 'Injection', category: 'Antidiabetic', nhisApproved: true, cashPrice: 80, nhisPrice: 55 },
  { genericName: 'Insulin NPH', brandName: 'Insulatard', strength: '100IU/ml', form: 'Injection', category: 'Antidiabetic', nhisApproved: true, cashPrice: 80, nhisPrice: 55 },
  
  // Gastrointestinal
  { genericName: 'Omeprazole', brandName: 'Losec', strength: '20mg', form: 'Capsule', category: 'Antacid', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Ranitidine', brandName: 'Zantac', strength: '150mg', form: 'Tablet', category: 'Antacid', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Oral Rehydration Salts', brandName: 'ORS', strength: '20.5g', form: 'Sachet', category: 'Rehydration', nhisApproved: true, cashPrice: 2, nhisPrice: 1 },
  { genericName: 'Loperamide', brandName: 'Imodium', strength: '2mg', form: 'Capsule', category: 'Antidiarrheal', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Metoclopramide', brandName: 'Plasil', strength: '10mg', form: 'Tablet', category: 'Antiemetic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  
  // Respiratory
  { genericName: 'Salbutamol', brandName: 'Ventolin', strength: '100mcg', form: 'Inhaler', category: 'Bronchodilator', nhisApproved: true, cashPrice: 35, nhisPrice: 25 },
  { genericName: 'Salbutamol', brandName: 'Ventolin', strength: '2mg/5ml', form: 'Syrup', category: 'Bronchodilator', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Prednisolone', brandName: 'Predsol', strength: '5mg', form: 'Tablet', category: 'Corticosteroid', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Chlorpheniramine', brandName: 'Piriton', strength: '4mg', form: 'Tablet', category: 'Antihistamine', nhisApproved: true, cashPrice: 0.5, nhisPrice: 0.3 },
  { genericName: 'Cetirizine', brandName: 'Zyrtec', strength: '10mg', form: 'Tablet', category: 'Antihistamine', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  
  // Vitamins & Supplements
  { genericName: 'Ferrous Sulphate', brandName: 'Fefol', strength: '200mg', form: 'Tablet', category: 'Supplement', nhisApproved: true, cashPrice: 0.5, nhisPrice: 0.3 },
  { genericName: 'Folic Acid', brandName: 'Folvite', strength: '5mg', form: 'Tablet', category: 'Supplement', nhisApproved: true, cashPrice: 0.3, nhisPrice: 0.2 },
  { genericName: 'Vitamin B Complex', brandName: 'B-Complex', strength: '', form: 'Tablet', category: 'Supplement', nhisApproved: true, cashPrice: 0.5, nhisPrice: 0.3 },
  { genericName: 'Multivitamin', brandName: 'Centrum', strength: '', form: 'Tablet', category: 'Supplement', nhisApproved: false, cashPrice: 3 },
  
  // Anticonvulsants
  { genericName: 'Phenytoin', brandName: 'Dilantin', strength: '100mg', form: 'Capsule', category: 'Anticonvulsant', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Carbamazepine', brandName: 'Tegretol', strength: '200mg', form: 'Tablet', category: 'Anticonvulsant', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Diazepam', brandName: 'Valium', strength: '5mg', form: 'Tablet', category: 'Anxiolytic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Sodium Valproate', brandName: 'Epilim', strength: '200mg', form: 'Tablet', category: 'Anticonvulsant', nhisApproved: true, cashPrice: 4, nhisPrice: 3 },

  // Cardiovascular
  { genericName: 'Aspirin', brandName: 'Disprin', strength: '75mg', form: 'Tablet', category: 'Antiplatelet', nhisApproved: true, cashPrice: 0.5, nhisPrice: 0.3 },
  { genericName: 'Warfarin', brandName: 'Coumadin', strength: '5mg', form: 'Tablet', category: 'Anticoagulant', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Atorvastatin', brandName: 'Lipitor', strength: '20mg', form: 'Tablet', category: 'Statin', nhisApproved: true, cashPrice: 5, nhisPrice: 3.5 },
  { genericName: 'Simvastatin', brandName: 'Zocor', strength: '20mg', form: 'Tablet', category: 'Statin', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Nifedipine', brandName: 'Adalat', strength: '20mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Methyldopa', brandName: 'Aldomet', strength: '250mg', form: 'Tablet', category: 'Antihypertensive', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Digoxin', brandName: 'Lanoxin', strength: '0.25mg', form: 'Tablet', category: 'Cardiac Glycoside', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Glyceryl Trinitrate', brandName: 'GTN', strength: '0.5mg', form: 'Sublingual Tablet', category: 'Antianginal', nhisApproved: true, cashPrice: 5, nhisPrice: 3.5 },

  // Anti-TB
  { genericName: 'Rifampicin', brandName: 'Rimactane', strength: '300mg', form: 'Capsule', category: 'Anti-TB', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Isoniazid', brandName: 'INH', strength: '300mg', form: 'Tablet', category: 'Anti-TB', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Pyrazinamide', brandName: 'PZA', strength: '500mg', form: 'Tablet', category: 'Anti-TB', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Ethambutol', brandName: 'Myambutol', strength: '400mg', form: 'Tablet', category: 'Anti-TB', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'RHZE (Fixed-Dose Combination)', brandName: 'Rifafour', strength: '150/75/400/275mg', form: 'Tablet', category: 'Anti-TB', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },

  // Antiretrovirals
  { genericName: 'Tenofovir/Lamivudine/Dolutegravir', brandName: 'TLD', strength: '300/300/50mg', form: 'Tablet', category: 'Antiretroviral', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Zidovudine/Lamivudine', brandName: 'Combivir', strength: '300/150mg', form: 'Tablet', category: 'Antiretroviral', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Efavirenz', brandName: 'Stocrin', strength: '600mg', form: 'Tablet', category: 'Antiretroviral', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Nevirapine', brandName: 'Viramune', strength: '200mg', form: 'Tablet', category: 'Antiretroviral', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },

  // Antifungals
  { genericName: 'Fluconazole', brandName: 'Diflucan', strength: '150mg', form: 'Capsule', category: 'Antifungal', nhisApproved: true, cashPrice: 5, nhisPrice: 3.5 },
  { genericName: 'Clotrimazole', brandName: 'Canesten', strength: '1%', form: 'Cream', category: 'Antifungal', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Nystatin', brandName: 'Mycostatin', strength: '100000IU/ml', form: 'Suspension', category: 'Antifungal', nhisApproved: true, cashPrice: 12, nhisPrice: 8 },
  { genericName: 'Ketoconazole', brandName: 'Nizoral', strength: '200mg', form: 'Tablet', category: 'Antifungal', nhisApproved: true, cashPrice: 4, nhisPrice: 3 },

  // Dermatological
  { genericName: 'Hydrocortisone', brandName: 'Cortaid', strength: '1%', form: 'Cream', category: 'Topical Steroid', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Betamethasone', brandName: 'Betnovate', strength: '0.1%', form: 'Cream', category: 'Topical Steroid', nhisApproved: true, cashPrice: 12, nhisPrice: 8 },
  { genericName: 'Silver Sulfadiazine', brandName: 'Silvadene', strength: '1%', form: 'Cream', category: 'Burn Treatment', nhisApproved: true, cashPrice: 20, nhisPrice: 14 },
  { genericName: 'Calamine Lotion', brandName: 'Calamine', strength: '', form: 'Lotion', category: 'Antipruritic', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Permethrin', brandName: 'Lyclear', strength: '5%', form: 'Cream', category: 'Scabicide', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },

  // Ophthalmological
  { genericName: 'Chloramphenicol Eye Drops', brandName: 'Chlorsig', strength: '0.5%', form: 'Eye Drops', category: 'Ophthalmic', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Tetracycline Eye Ointment', brandName: 'Terramycin', strength: '1%', form: 'Eye Ointment', category: 'Ophthalmic', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  { genericName: 'Timolol Eye Drops', brandName: 'Timoptic', strength: '0.5%', form: 'Eye Drops', category: 'Antiglaucoma', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },

  // Obstetric/Gynaecological
  { genericName: 'Oxytocin', brandName: 'Pitocin', strength: '10IU/ml', form: 'Injection', category: 'Oxytocic', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  { genericName: 'Misoprostol', brandName: 'Cytotec', strength: '200mcg', form: 'Tablet', category: 'Oxytocic', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Magnesium Sulphate', brandName: 'MgSO4', strength: '50%', form: 'Injection', category: 'Anticonvulsant', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },

  // Psychiatric
  { genericName: 'Amitriptyline', brandName: 'Elavil', strength: '25mg', form: 'Tablet', category: 'Antidepressant', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Fluoxetine', brandName: 'Prozac', strength: '20mg', form: 'Capsule', category: 'Antidepressant', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },
  { genericName: 'Haloperidol', brandName: 'Haldol', strength: '5mg', form: 'Tablet', category: 'Antipsychotic', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },
  { genericName: 'Chlorpromazine', brandName: 'Largactil', strength: '100mg', form: 'Tablet', category: 'Antipsychotic', nhisApproved: true, cashPrice: 2, nhisPrice: 1.5 },

  // Emergency/Resuscitation
  { genericName: 'Adrenaline (Epinephrine)', brandName: 'EpiPen', strength: '1mg/ml', form: 'Injection', category: 'Emergency', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Hydrocortisone Injection', brandName: 'Solu-Cortef', strength: '100mg', form: 'Injection', category: 'Emergency', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Atropine', brandName: 'Atropine Sulphate', strength: '0.6mg/ml', form: 'Injection', category: 'Emergency', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  { genericName: 'Dextrose', brandName: 'D50W', strength: '50%', form: 'Injection', category: 'Emergency', nhisApproved: true, cashPrice: 8, nhisPrice: 5 },
  { genericName: 'Normal Saline', brandName: 'NS', strength: '0.9%', form: 'IV Fluid', category: 'IV Fluid', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Ringers Lactate', brandName: 'RL', strength: '', form: 'IV Fluid', category: 'IV Fluid', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },
  { genericName: 'Dextrose Saline', brandName: 'DNS', strength: '5%/0.9%', form: 'IV Fluid', category: 'IV Fluid', nhisApproved: true, cashPrice: 10, nhisPrice: 7 },

  // Anthelmintics
  { genericName: 'Albendazole', brandName: 'Zentel', strength: '400mg', form: 'Tablet', category: 'Anthelmintic', nhisApproved: true, cashPrice: 2, nhisPrice: 1 },
  { genericName: 'Mebendazole', brandName: 'Vermox', strength: '100mg', form: 'Tablet', category: 'Anthelmintic', nhisApproved: true, cashPrice: 1, nhisPrice: 0.7 },
  { genericName: 'Praziquantel', brandName: 'Biltricide', strength: '600mg', form: 'Tablet', category: 'Anthelmintic', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  { genericName: 'Ivermectin', brandName: 'Mectizan', strength: '3mg', form: 'Tablet', category: 'Anthelmintic', nhisApproved: true, cashPrice: 3, nhisPrice: 2 },

  // Ear/Nose/Throat
  { genericName: 'Ciprofloxacin Ear Drops', brandName: 'Ciloxan', strength: '0.3%', form: 'Ear Drops', category: 'ENT', nhisApproved: true, cashPrice: 12, nhisPrice: 8 },
  { genericName: 'Xylometazoline', brandName: 'Otrivin', strength: '0.1%', form: 'Nasal Drops', category: 'Decongestant', nhisApproved: false, cashPrice: 10 },

  // Contraceptives
  { genericName: 'Levonorgestrel/Ethinylestradiol', brandName: 'Microgynon', strength: '0.15/0.03mg', form: 'Tablet', category: 'Contraceptive', nhisApproved: true, cashPrice: 5, nhisPrice: 3 },
  { genericName: 'Medroxyprogesterone', brandName: 'Depo-Provera', strength: '150mg/ml', form: 'Injection', category: 'Contraceptive', nhisApproved: true, cashPrice: 15, nhisPrice: 10 },
  { genericName: 'Levonorgestrel', brandName: 'Postinor-2', strength: '0.75mg', form: 'Tablet', category: 'Emergency Contraceptive', nhisApproved: false, cashPrice: 10 },
];

export async function seedDrugs() {
  console.log('Seeding drugs...');
  
  for (const drug of drugs) {
    const id = `${drug.genericName.replace(/\s+/g, '-').toLowerCase()}-${drug.strength?.replace(/[\/\s]+/g, '-').toLowerCase() || 'std'}`;
    
    await prisma.drug.upsert({
      where: { id },
      update: {
        genericName: drug.genericName,
        brandName: drug.brandName,
        strength: drug.strength,
        form: drug.form,
        category: drug.category,
        nhisApproved: drug.nhisApproved,
        cashPrice: drug.cashPrice,
        nhisPrice: drug.nhisPrice,
        isActive: true,
      },
      create: {
        id,
        genericName: drug.genericName,
        brandName: drug.brandName,
        strength: drug.strength,
        form: drug.form,
        category: drug.category,
        nhisApproved: drug.nhisApproved,
        cashPrice: drug.cashPrice,
        nhisPrice: drug.nhisPrice,
        isActive: true,
      },
    });
  }
  
  console.log(`Seeded ${drugs.length} drugs`);
}

if (require.main === module) {
  seedDrugs()
    .then(() => {
      console.log('Drugs seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding drugs:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
