import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SERVICE_PRICES = [
  // Consultation fees
  { name: 'General OPD Consultation', category: 'CONSULTATION', cashPrice: 50, nhisPrice: 35 },
  { name: 'Specialist Consultation', category: 'CONSULTATION', cashPrice: 100, nhisPrice: 70 },
  { name: 'Emergency Consultation', category: 'CONSULTATION', cashPrice: 80, nhisPrice: 60 },
  { name: 'Follow-up Consultation', category: 'CONSULTATION', cashPrice: 30, nhisPrice: 20 },
  { name: 'Pediatric Consultation', category: 'CONSULTATION', cashPrice: 50, nhisPrice: 35 },

  // Triage
  { name: 'Triage Assessment', category: 'TRIAGE', cashPrice: 20, nhisPrice: 15 },

  // Nursing procedures
  { name: 'Wound Dressing (Minor)', category: 'NURSING', cashPrice: 30, nhisPrice: 20 },
  { name: 'Wound Dressing (Major)', category: 'NURSING', cashPrice: 60, nhisPrice: 40 },
  { name: 'IV Cannulation', category: 'NURSING', cashPrice: 25, nhisPrice: 18 },
  { name: 'IM/SC Injection', category: 'NURSING', cashPrice: 15, nhisPrice: 10 },
  { name: 'IV Infusion Setup', category: 'NURSING', cashPrice: 40, nhisPrice: 30 },
  { name: 'Catheterization', category: 'NURSING', cashPrice: 50, nhisPrice: 35 },
  { name: 'NGT Insertion', category: 'NURSING', cashPrice: 40, nhisPrice: 30 },
  { name: 'Nebulization', category: 'NURSING', cashPrice: 30, nhisPrice: 20 },

  // Ward / Bed charges
  { name: 'General Ward (per day)', category: 'WARD', cashPrice: 80, nhisPrice: 50 },
  { name: 'Semi-Private Ward (per day)', category: 'WARD', cashPrice: 150, nhisPrice: 100 },
  { name: 'Private Ward (per day)', category: 'WARD', cashPrice: 250, nhisPrice: null },
  { name: 'ICU (per day)', category: 'WARD', cashPrice: 500, nhisPrice: 300 },

  // Surgical / Theatre
  { name: 'Minor Surgery', category: 'SURGERY', cashPrice: 300, nhisPrice: 200 },
  { name: 'Intermediate Surgery', category: 'SURGERY', cashPrice: 800, nhisPrice: 500 },
  { name: 'Major Surgery', category: 'SURGERY', cashPrice: 2000, nhisPrice: 1200 },
  { name: 'Anaesthesia (Local)', category: 'SURGERY', cashPrice: 100, nhisPrice: 70 },
  { name: 'Anaesthesia (General)', category: 'SURGERY', cashPrice: 500, nhisPrice: 350 },

  // Imaging / Radiology
  { name: 'X-Ray (Single View)', category: 'RADIOLOGY', cashPrice: 60, nhisPrice: 40 },
  { name: 'X-Ray (Two Views)', category: 'RADIOLOGY', cashPrice: 100, nhisPrice: 70 },
  { name: 'Ultrasound (Abdomen)', category: 'RADIOLOGY', cashPrice: 120, nhisPrice: 80 },
  { name: 'Ultrasound (Obstetric)', category: 'RADIOLOGY', cashPrice: 100, nhisPrice: 70 },
  { name: 'CT Scan', category: 'RADIOLOGY', cashPrice: 800, nhisPrice: 500 },
  { name: 'ECG', category: 'RADIOLOGY', cashPrice: 50, nhisPrice: 35 },

  // Maternity
  { name: 'ANC Visit', category: 'MATERNITY', cashPrice: 30, nhisPrice: 0 },
  { name: 'Normal Delivery', category: 'MATERNITY', cashPrice: 500, nhisPrice: 350 },
  { name: 'Assisted Delivery', category: 'MATERNITY', cashPrice: 800, nhisPrice: 550 },
  { name: 'Caesarean Section', category: 'MATERNITY', cashPrice: 2500, nhisPrice: 1500 },
  { name: 'Postnatal Care', category: 'MATERNITY', cashPrice: 30, nhisPrice: 0 },

  // Registration
  { name: 'New Patient Registration', category: 'REGISTRATION', cashPrice: 10, nhisPrice: 5 },
  { name: 'Medical Report', category: 'REGISTRATION', cashPrice: 50, nhisPrice: null },
  { name: 'Insurance Verification', category: 'REGISTRATION', cashPrice: 5, nhisPrice: 0 },
];

export async function seedServicePrices() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.log('No tenant found'); return; }

  console.log(`Seeding service prices for: ${tenant.name}\n`);

  let created = 0;
  for (const sp of SERVICE_PRICES) {
    const existing = await prisma.servicePrice.findFirst({
      where: { tenantId: tenant.id, name: sp.name, category: sp.category },
    });
    if (!existing) {
      await prisma.servicePrice.create({
        data: { tenantId: tenant.id, ...sp },
      });
      created++;
    }
  }

  console.log(`Service prices seeded: ${created} created`);
  await prisma.$disconnect();
}

// Run directly
seedServicePrices().catch(console.error);
