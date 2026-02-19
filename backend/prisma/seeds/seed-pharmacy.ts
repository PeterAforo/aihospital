import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common drugs used in Ghanaian hospitals
const DRUGS_TO_SEED = [
  // Antimalarials
  { genericName: 'Artemether-Lumefantrine', brandName: 'Coartem', strength: '20/120mg', form: 'Tablet', category: 'ANTIMALARIAL', nhisApproved: true, cashPrice: 15.0 },
  { genericName: 'Artesunate', brandName: 'Artesunate', strength: '60mg', form: 'Injection', category: 'ANTIMALARIAL', nhisApproved: true, cashPrice: 25.0 },
  { genericName: 'Amodiaquine', brandName: 'Camoquin', strength: '200mg', form: 'Tablet', category: 'ANTIMALARIAL', nhisApproved: true, cashPrice: 8.0 },

  // Antibiotics
  { genericName: 'Amoxicillin', brandName: 'Amoxil', strength: '500mg', form: 'Capsule', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 5.0 },
  { genericName: 'Amoxicillin-Clavulanate', brandName: 'Augmentin', strength: '625mg', form: 'Tablet', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 18.0 },
  { genericName: 'Azithromycin', brandName: 'Zithromax', strength: '500mg', form: 'Tablet', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 12.0 },
  { genericName: 'Ciprofloxacin', brandName: 'Cipro', strength: '500mg', form: 'Tablet', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 6.0 },
  { genericName: 'Metronidazole', brandName: 'Flagyl', strength: '400mg', form: 'Tablet', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Ceftriaxone', brandName: 'Rocephin', strength: '1g', form: 'Injection', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 30.0 },
  { genericName: 'Doxycycline', brandName: 'Vibramycin', strength: '100mg', form: 'Capsule', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 5.0 },
  { genericName: 'Erythromycin', brandName: 'Erythrocin', strength: '500mg', form: 'Tablet', category: 'ANTIBIOTIC', nhisApproved: true, cashPrice: 7.0 },

  // Analgesics / Anti-inflammatory
  { genericName: 'Paracetamol', brandName: 'Panadol', strength: '500mg', form: 'Tablet', category: 'ANALGESIC', nhisApproved: true, cashPrice: 2.0 },
  { genericName: 'Ibuprofen', brandName: 'Brufen', strength: '400mg', form: 'Tablet', category: 'NSAID', nhisApproved: true, cashPrice: 3.0 },
  { genericName: 'Diclofenac', brandName: 'Voltaren', strength: '50mg', form: 'Tablet', category: 'NSAID', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Diclofenac', brandName: 'Voltaren IM', strength: '75mg/3ml', form: 'Injection', category: 'NSAID', nhisApproved: true, cashPrice: 8.0 },
  { genericName: 'Tramadol', brandName: 'Tramadol', strength: '50mg', form: 'Capsule', category: 'ANALGESIC', nhisApproved: true, cashPrice: 6.0 },

  // Antihypertensives
  { genericName: 'Amlodipine', brandName: 'Norvasc', strength: '5mg', form: 'Tablet', category: 'ANTIHYPERTENSIVE', nhisApproved: true, cashPrice: 5.0 },
  { genericName: 'Lisinopril', brandName: 'Zestril', strength: '10mg', form: 'Tablet', category: 'ANTIHYPERTENSIVE', nhisApproved: true, cashPrice: 6.0 },
  { genericName: 'Losartan', brandName: 'Cozaar', strength: '50mg', form: 'Tablet', category: 'ANTIHYPERTENSIVE', nhisApproved: true, cashPrice: 8.0 },
  { genericName: 'Hydrochlorothiazide', brandName: 'HCTZ', strength: '25mg', form: 'Tablet', category: 'DIURETIC', nhisApproved: true, cashPrice: 3.0 },
  { genericName: 'Atenolol', brandName: 'Tenormin', strength: '50mg', form: 'Tablet', category: 'ANTIHYPERTENSIVE', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Nifedipine', brandName: 'Adalat', strength: '20mg', form: 'Tablet', category: 'ANTIHYPERTENSIVE', nhisApproved: true, cashPrice: 5.0 },

  // Diabetes
  { genericName: 'Metformin', brandName: 'Glucophage', strength: '500mg', form: 'Tablet', category: 'ANTIDIABETIC', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Glibenclamide', brandName: 'Daonil', strength: '5mg', form: 'Tablet', category: 'ANTIDIABETIC', nhisApproved: true, cashPrice: 3.0 },
  { genericName: 'Insulin (Soluble)', brandName: 'Actrapid', strength: '100IU/ml', form: 'Injection', category: 'ANTIDIABETIC', nhisApproved: true, cashPrice: 45.0 },

  // GI
  { genericName: 'Omeprazole', brandName: 'Losec', strength: '20mg', form: 'Capsule', category: 'GI', nhisApproved: true, cashPrice: 5.0 },
  { genericName: 'Oral Rehydration Salts', brandName: 'ORS', strength: '20.5g', form: 'Sachet', category: 'GI', nhisApproved: true, cashPrice: 1.5 },
  { genericName: 'Loperamide', brandName: 'Imodium', strength: '2mg', form: 'Capsule', category: 'GI', nhisApproved: false, cashPrice: 4.0 },
  { genericName: 'Hyoscine Butylbromide', brandName: 'Buscopan', strength: '10mg', form: 'Tablet', category: 'GI', nhisApproved: true, cashPrice: 5.0 },

  // Respiratory
  { genericName: 'Salbutamol', brandName: 'Ventolin', strength: '100mcg', form: 'Inhaler', category: 'RESPIRATORY', nhisApproved: true, cashPrice: 15.0 },
  { genericName: 'Prednisolone', brandName: 'Prednisolone', strength: '5mg', form: 'Tablet', category: 'CORTICOSTEROID', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Aminophylline', brandName: 'Aminophylline', strength: '100mg', form: 'Tablet', category: 'RESPIRATORY', nhisApproved: true, cashPrice: 3.0 },

  // Vitamins & Supplements
  { genericName: 'Ferrous Sulphate', brandName: 'Fefol', strength: '200mg', form: 'Tablet', category: 'SUPPLEMENT', nhisApproved: true, cashPrice: 3.0 },
  { genericName: 'Folic Acid', brandName: 'Folic Acid', strength: '5mg', form: 'Tablet', category: 'SUPPLEMENT', nhisApproved: true, cashPrice: 2.0 },
  { genericName: 'Multivitamin', brandName: 'Multivite', strength: 'Standard', form: 'Tablet', category: 'SUPPLEMENT', nhisApproved: false, cashPrice: 5.0 },
  { genericName: 'Vitamin B Complex', brandName: 'B-Complex', strength: 'Standard', form: 'Tablet', category: 'SUPPLEMENT', nhisApproved: true, cashPrice: 3.0 },

  // Antihistamines
  { genericName: 'Chlorpheniramine', brandName: 'Piriton', strength: '4mg', form: 'Tablet', category: 'ANTIHISTAMINE', nhisApproved: true, cashPrice: 2.0 },
  { genericName: 'Cetirizine', brandName: 'Zyrtec', strength: '10mg', form: 'Tablet', category: 'ANTIHISTAMINE', nhisApproved: false, cashPrice: 5.0 },
  { genericName: 'Promethazine', brandName: 'Phenergan', strength: '25mg', form: 'Tablet', category: 'ANTIHISTAMINE', nhisApproved: true, cashPrice: 4.0 },

  // Antifungals
  { genericName: 'Fluconazole', brandName: 'Diflucan', strength: '150mg', form: 'Capsule', category: 'ANTIFUNGAL', nhisApproved: true, cashPrice: 8.0 },
  { genericName: 'Clotrimazole', brandName: 'Canesten', strength: '1%', form: 'Cream', category: 'ANTIFUNGAL', nhisApproved: true, cashPrice: 10.0 },

  // Emergency / Critical
  { genericName: 'Adrenaline (Epinephrine)', brandName: 'Adrenaline', strength: '1mg/ml', form: 'Injection', category: 'EMERGENCY', nhisApproved: true, cashPrice: 12.0 },
  { genericName: 'Hydrocortisone', brandName: 'Solu-Cortef', strength: '100mg', form: 'Injection', category: 'CORTICOSTEROID', nhisApproved: true, cashPrice: 20.0 },
  { genericName: 'Diazepam', brandName: 'Valium', strength: '5mg', form: 'Tablet', category: 'SEDATIVE', nhisApproved: true, cashPrice: 4.0 },
  { genericName: 'Atropine', brandName: 'Atropine', strength: '0.6mg/ml', form: 'Injection', category: 'EMERGENCY', nhisApproved: true, cashPrice: 8.0 },

  // IV Fluids
  { genericName: 'Normal Saline', brandName: 'NS 0.9%', strength: '0.9%', form: 'IV Fluid', category: 'IV_FLUID', nhisApproved: true, cashPrice: 10.0 },
  { genericName: 'Ringers Lactate', brandName: 'RL', strength: '500ml', form: 'IV Fluid', category: 'IV_FLUID', nhisApproved: true, cashPrice: 12.0 },
  { genericName: 'Dextrose', brandName: 'D5W', strength: '5%', form: 'IV Fluid', category: 'IV_FLUID', nhisApproved: true, cashPrice: 10.0 },

  // Obstetric
  { genericName: 'Oxytocin', brandName: 'Pitocin', strength: '10IU/ml', form: 'Injection', category: 'OBSTETRIC', nhisApproved: true, cashPrice: 8.0 },
  { genericName: 'Misoprostol', brandName: 'Cytotec', strength: '200mcg', form: 'Tablet', category: 'OBSTETRIC', nhisApproved: true, cashPrice: 6.0 },
  { genericName: 'Magnesium Sulphate', brandName: 'MgSO4', strength: '50%', form: 'Injection', category: 'OBSTETRIC', nhisApproved: true, cashPrice: 15.0 },
];

export async function seedPharmacy() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.log('No tenant found'); return; }

  const branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (!branch) { console.log('No branch found'); return; }

  console.log(`Seeding pharmacy for: ${tenant.name} / ${branch.name}\n`);

  let drugsCreated = 0;
  let stockCreated = 0;

  for (const drugData of DRUGS_TO_SEED) {
    let drug = await prisma.drug.findFirst({
      where: { tenantId: tenant.id, genericName: drugData.genericName, strength: drugData.strength },
    });

    if (!drug) {
      drug = await prisma.drug.create({
        data: {
          tenantId: tenant.id,
          genericName: drugData.genericName,
          brandName: drugData.brandName,
          strength: drugData.strength,
          form: drugData.form,
          category: drugData.category,
          nhisApproved: drugData.nhisApproved,
          nhisPrice: drugData.nhisApproved ? drugData.cashPrice * 0.85 : null,
          cashPrice: drugData.cashPrice,
        },
      });
      drugsCreated++;
    }

    const existingStock = await prisma.pharmacyStock.findFirst({
      where: { tenantId: tenant.id, drugId: drug.id },
    });

    if (!existingStock) {
      const qty = Math.floor(Math.random() * 400) + 100;
      const batchNum = `BN-${new Date().getFullYear()}${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Math.floor(Math.random() * 18) + 6);

      await prisma.pharmacyStock.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          drugId: drug.id,
          batchNumber: batchNum,
          expiryDate: expiry,
          quantity: qty,
          reorderLevel: Math.floor(qty * 0.15),
          costPrice: drugData.cashPrice * 0.7,
          sellingPrice: drugData.cashPrice,
        },
      });
      stockCreated++;
    } else if (existingStock.quantity === 0) {
      const qty = Math.floor(Math.random() * 400) + 100;
      await prisma.pharmacyStock.update({
        where: { id: existingStock.id },
        data: { quantity: qty },
      });
      stockCreated++;
    }
  }

  console.log(`Pharmacy seed complete: ${drugsCreated} drugs, ${stockCreated} stock records`);
  await prisma.$disconnect();
}

// Run directly
seedPharmacy().catch(console.error);
