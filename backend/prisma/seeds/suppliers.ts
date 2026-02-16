import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSuppliers(tenantId: string) {
  const suppliers = [
    {
      tenantId,
      name: 'Tobinco Pharmaceuticals',
      contactPerson: 'Kwame Asante',
      phone: '+233244123456',
      email: 'orders@tobinco.com.gh',
      address: 'Industrial Area, Accra',
      paymentTerms: 'Net 30',
    },
    {
      tenantId,
      name: 'Ernest Chemists',
      contactPerson: 'Ama Mensah',
      phone: '+233244789012',
      email: 'supply@ernestchemists.com',
      address: 'Osu, Accra',
      paymentTerms: 'Net 14',
    },
    {
      tenantId,
      name: 'Kama Healthcare',
      contactPerson: 'Kofi Owusu',
      phone: '+233244345678',
      email: 'procurement@kamahealthcare.com',
      address: 'Tema Industrial Area',
      paymentTerms: 'Net 30',
    },
    {
      tenantId,
      name: 'Entrance Pharmaceuticals',
      contactPerson: 'Yaa Serwaa',
      phone: '+233244901234',
      email: 'sales@entrancepharma.com',
      address: 'Spintex Road, Accra',
      paymentTerms: 'Net 21',
    },
    {
      tenantId,
      name: 'Danadams Pharmaceuticals',
      contactPerson: 'Daniel Adams',
      phone: '+233244567890',
      email: 'orders@danadams.com.gh',
      address: 'North Industrial Area, Accra',
      paymentTerms: 'Net 30',
    },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: {
        id: `${tenantId}-${supplier.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: supplier,
      create: {
        id: `${tenantId}-${supplier.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...supplier,
      },
    });
  }

  console.log(`Seeded ${suppliers.length} suppliers`);
}

export async function seedServicePrices(tenantId: string) {
  const services = [
    // Consultation fees
    { name: 'General Consultation', category: 'CONSULTATION', cashPrice: 50, nhisPrice: 35 },
    { name: 'Specialist Consultation', category: 'CONSULTATION', cashPrice: 100, nhisPrice: 70 },
    { name: 'Emergency Consultation', category: 'CONSULTATION', cashPrice: 150, nhisPrice: 100 },
    { name: 'Follow-up Consultation', category: 'CONSULTATION', cashPrice: 30, nhisPrice: 20 },
    
    // Procedures
    { name: 'Wound Dressing (Minor)', category: 'PROCEDURE', cashPrice: 30, nhisPrice: 20 },
    { name: 'Wound Dressing (Major)', category: 'PROCEDURE', cashPrice: 80, nhisPrice: 50 },
    { name: 'Injection Administration', category: 'PROCEDURE', cashPrice: 15, nhisPrice: 10 },
    { name: 'IV Cannulation', category: 'PROCEDURE', cashPrice: 40, nhisPrice: 25 },
    { name: 'Catheterization', category: 'PROCEDURE', cashPrice: 100, nhisPrice: 70 },
    { name: 'Nebulization', category: 'PROCEDURE', cashPrice: 50, nhisPrice: 35 },
    
    // Nursing services
    { name: 'Vital Signs Check', category: 'NURSING', cashPrice: 10, nhisPrice: 5 },
    { name: 'Blood Pressure Monitoring', category: 'NURSING', cashPrice: 10, nhisPrice: 5 },
    { name: 'Blood Glucose Test', category: 'NURSING', cashPrice: 20, nhisPrice: 15 },
    
    // Admission
    { name: 'Ward Admission (Per Day)', category: 'ADMISSION', cashPrice: 200, nhisPrice: 150 },
    { name: 'Private Room (Per Day)', category: 'ADMISSION', cashPrice: 500, nhisPrice: 300 },
    { name: 'ICU (Per Day)', category: 'ADMISSION', cashPrice: 1000, nhisPrice: 700 },
    
    // Other
    { name: 'Medical Report', category: 'OTHER', cashPrice: 100, nhisPrice: null },
    { name: 'Medical Certificate', category: 'OTHER', cashPrice: 50, nhisPrice: null },
    { name: 'Referral Letter', category: 'OTHER', cashPrice: 20, nhisPrice: 10 },
  ];

  for (const service of services) {
    await prisma.servicePrice.upsert({
      where: {
        id: `${tenantId}-${service.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: { ...service, tenantId },
      create: {
        id: `${tenantId}-${service.name.toLowerCase().replace(/\s+/g, '-')}`,
        tenantId,
        ...service,
      },
    });
  }

  console.log(`Seeded ${services.length} service prices`);
}

export async function seedInsuranceCompanies(tenantId: string) {
  const companies = [
    {
      tenantId,
      name: 'Star Assurance',
      code: 'STAR',
      contactPerson: 'Claims Department',
      phone: '+233302123456',
      email: 'claims@starassurance.com.gh',
      paymentTerms: 30,
    },
    {
      tenantId,
      name: 'Enterprise Insurance',
      code: 'ENTERPRISE',
      contactPerson: 'Medical Claims',
      phone: '+233302234567',
      email: 'medical@enterprise.com.gh',
      paymentTerms: 45,
    },
    {
      tenantId,
      name: 'SIC Insurance',
      code: 'SIC',
      contactPerson: 'Health Claims',
      phone: '+233302345678',
      email: 'health@sic.com.gh',
      paymentTerms: 30,
    },
    {
      tenantId,
      name: 'Glico Healthcare',
      code: 'GLICO',
      contactPerson: 'Provider Relations',
      phone: '+233302456789',
      email: 'providers@glico.com.gh',
      paymentTerms: 30,
    },
    {
      tenantId,
      name: 'Acacia Health',
      code: 'ACACIA',
      contactPerson: 'Claims Processing',
      phone: '+233302567890',
      email: 'claims@acaciahealth.com.gh',
      paymentTerms: 21,
    },
  ];

  for (const company of companies) {
    await prisma.insuranceCompany.upsert({
      where: {
        tenantId_code: { tenantId, code: company.code },
      },
      update: company,
      create: company,
    });
  }

  console.log(`Seeded ${companies.length} insurance companies`);
}
