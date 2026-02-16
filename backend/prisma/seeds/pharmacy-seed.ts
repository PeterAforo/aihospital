import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRUGS = [
  { genericName: 'Paracetamol', brandName: 'Panadol', strength: '500mg', form: 'TABLET', category: 'ANALGESIC', cashPrice: 2.0, nhisPrice: 1.5, nhisApproved: true },
  { genericName: 'Amoxicillin', brandName: 'Amoxil', strength: '500mg', form: 'CAPSULE', category: 'ANTIBIOTIC', cashPrice: 5.0, nhisPrice: 3.5, nhisApproved: true },
  { genericName: 'Metformin', brandName: 'Glucophage', strength: '500mg', form: 'TABLET', category: 'ANTIDIABETIC', cashPrice: 3.0, nhisPrice: 2.0, nhisApproved: true },
  { genericName: 'Amlodipine', brandName: 'Norvasc', strength: '5mg', form: 'TABLET', category: 'ANTIHYPERTENSIVE', cashPrice: 4.0, nhisPrice: 3.0, nhisApproved: true },
  { genericName: 'Omeprazole', brandName: 'Losec', strength: '20mg', form: 'CAPSULE', category: 'ANTACID', cashPrice: 3.5, nhisPrice: 2.5, nhisApproved: true },
  { genericName: 'Ibuprofen', brandName: 'Brufen', strength: '400mg', form: 'TABLET', category: 'NSAID', cashPrice: 2.5, nhisPrice: 1.8, nhisApproved: true },
  { genericName: 'Ciprofloxacin', brandName: 'Cipro', strength: '500mg', form: 'TABLET', category: 'ANTIBIOTIC', cashPrice: 6.0, nhisPrice: 4.0, nhisApproved: true },
  { genericName: 'Diclofenac', brandName: 'Voltaren', strength: '50mg', form: 'TABLET', category: 'NSAID', cashPrice: 3.0, nhisPrice: 2.0, nhisApproved: true },
  { genericName: 'Artemether/Lumefantrine', brandName: 'Coartem', strength: '20/120mg', form: 'TABLET', category: 'ANTIMALARIAL', cashPrice: 8.0, nhisPrice: 6.0, nhisApproved: true },
  { genericName: 'Metronidazole', brandName: 'Flagyl', strength: '400mg', form: 'TABLET', category: 'ANTIBIOTIC', cashPrice: 3.0, nhisPrice: 2.0, nhisApproved: true },
  { genericName: 'Atorvastatin', brandName: 'Lipitor', strength: '20mg', form: 'TABLET', category: 'STATIN', cashPrice: 5.0, nhisPrice: 3.5, nhisApproved: true },
  { genericName: 'Salbutamol', brandName: 'Ventolin', strength: '100mcg', form: 'INHALER', category: 'BRONCHODILATOR', cashPrice: 15.0, nhisPrice: 10.0, nhisApproved: true },
  { genericName: 'Prednisolone', brandName: 'Prednisolone', strength: '5mg', form: 'TABLET', category: 'CORTICOSTEROID', cashPrice: 4.0, nhisPrice: 3.0, nhisApproved: true },
  { genericName: 'Cetirizine', brandName: 'Zyrtec', strength: '10mg', form: 'TABLET', category: 'ANTIHISTAMINE', cashPrice: 2.0, nhisPrice: 1.5, nhisApproved: true },
  { genericName: 'Oral Rehydration Salts', brandName: 'ORS', strength: '20.5g', form: 'SACHET', category: 'REHYDRATION', cashPrice: 1.0, nhisPrice: 0.8, nhisApproved: true },
  { genericName: 'Ferrous Sulphate', brandName: 'Fefol', strength: '200mg', form: 'TABLET', category: 'SUPPLEMENT', cashPrice: 2.0, nhisPrice: 1.5, nhisApproved: true },
  { genericName: 'Folic Acid', brandName: 'Folic Acid', strength: '5mg', form: 'TABLET', category: 'SUPPLEMENT', cashPrice: 1.5, nhisPrice: 1.0, nhisApproved: true },
  { genericName: 'Ceftriaxone', brandName: 'Rocephin', strength: '1g', form: 'INJECTION', category: 'ANTIBIOTIC', cashPrice: 12.0, nhisPrice: 8.0, nhisApproved: true },
  { genericName: 'Insulin Glargine', brandName: 'Lantus', strength: '100IU/ml', form: 'INJECTION', category: 'ANTIDIABETIC', cashPrice: 45.0, nhisPrice: 30.0, nhisApproved: true },
  { genericName: 'Chlorhexidine', brandName: 'Savlon', strength: '0.5%', form: 'SOLUTION', category: 'ANTISEPTIC', cashPrice: 8.0, nhisPrice: 5.0, nhisApproved: false },
];

const SUPPLIERS = [
  { name: 'Ghana Medical Supplies Ltd', contactPerson: 'Kwame Asante', phone: '0302-123456', email: 'orders@ghanamedical.com', address: 'Industrial Area, Accra' },
  { name: 'Tobinco Pharmaceuticals', contactPerson: 'Nana Ama Mensah', phone: '0302-654321', email: 'sales@tobinco.com', address: 'Spintex Road, Accra' },
  { name: 'Ernest Chemists Ltd', contactPerson: 'Ernest Badu', phone: '0302-789012', email: 'supply@ernestchemists.com', address: 'Osu, Accra' },
  { name: 'Kinapharma Ltd', contactPerson: 'Kofi Owusu', phone: '0302-345678', email: 'procurement@kinapharma.com', address: 'North Industrial Area, Accra' },
  { name: 'Danadams Pharmaceutical', contactPerson: 'Daniel Adams', phone: '0302-901234', email: 'orders@danadams.com', address: 'Tema, Greater Accra' },
];

export async function seedPharmacy(tenantId: string, branchId: string) {
  console.log('[SEED] Seeding pharmacy data...');

  // Seed drugs
  const createdDrugs = [];
  for (const drug of DRUGS) {
    const existing = await prisma.drug.findFirst({
      where: { genericName: drug.genericName, strength: drug.strength, tenantId },
    });
    if (!existing) {
      const created = await prisma.drug.create({
        data: { ...drug, tenantId },
      });
      createdDrugs.push(created);
      console.log(`  [DRUG] Created: ${drug.genericName} ${drug.strength}`);
    } else {
      createdDrugs.push(existing);
    }
  }

  // Seed suppliers
  const createdSuppliers = [];
  for (const supplier of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({
      where: { name: supplier.name, tenantId },
    });
    if (!existing) {
      const created = await prisma.supplier.create({
        data: { ...supplier, tenantId, isActive: true },
      });
      createdSuppliers.push(created);
      console.log(`  [SUPPLIER] Created: ${supplier.name}`);
    } else {
      createdSuppliers.push(existing);
    }
  }

  // Seed stock for first 10 drugs
  for (let i = 0; i < Math.min(10, createdDrugs.length); i++) {
    const drug = createdDrugs[i];
    const existing = await prisma.pharmacyStock.findFirst({
      where: { drugId: drug.id, branchId },
    });
    if (!existing) {
      const qty = Math.floor(Math.random() * 200) + 50;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 24) + 6);

      await prisma.pharmacyStock.create({
        data: {
          tenantId,
          branchId,
          drugId: drug.id,
          batchNumber: `BATCH-${String(i + 1).padStart(3, '0')}`,
          quantity: qty,
          expiryDate,
          costPrice: (drug.cashPrice || 2) * 0.6,
          sellingPrice: drug.cashPrice || 2,
          reorderLevel: 20,
        },
      });
      console.log(`  [STOCK] Added ${qty} units of ${drug.genericName}`);
    }
  }

  console.log(`[SEED] Pharmacy seeding complete: ${createdDrugs.length} drugs, ${createdSuppliers.length} suppliers`);
}

// Run standalone
if (require.main === module) {
  const tenantId = process.argv[2] || 'default-tenant';
  const branchId = process.argv[3] || 'default-branch';
  seedPharmacy(tenantId, branchId)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
