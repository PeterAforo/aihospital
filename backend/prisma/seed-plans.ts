import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const db = prisma as any;

async function seedPlans() {
  const plans = [
    {
      name: 'Starter',
      displayName: 'Starter Plan',
      price: 500,
      currency: 'GHS',
      billingCycle: 'MONTHLY',
      maxUsers: 10,
      maxBranches: 1,
      maxPatients: 1000,
      storageGB: 10,
      smsPerMonth: 500,
      features: JSON.stringify([
        'Basic HMS',
        'Patient Registration',
        'Appointments',
        'Billing & Invoicing',
        'Pharmacy',
        'Laboratory',
        'NHIS Claims',
        'Basic Reports',
        'Mobile Money Payments',
        '500 SMS/month',
      ]),
      sortOrder: 1,
    },
    {
      name: 'Professional',
      displayName: 'Professional Plan',
      price: 2500,
      currency: 'GHS',
      billingCycle: 'MONTHLY',
      maxUsers: 50,
      maxBranches: 5,
      maxPatients: null,
      storageGB: 100,
      smsPerMonth: 5000,
      features: JSON.stringify([
        'Everything in Starter',
        'AI Clinical Decision Support',
        'AI Drug Interaction Checker',
        'AI Triage Scoring',
        'AI Lab Interpretation',
        'AI ICD-10 Coding',
        'Telemedicine & Video Consults',
        'Remote Patient Monitoring',
        'Marketing & CRM',
        'Patient Loyalty Program',
        'Advanced Analytics',
        'HR & Payroll',
        'Procurement',
        '5,000 SMS/month',
      ]),
      sortOrder: 2,
    },
    {
      name: 'Enterprise',
      displayName: 'Enterprise Plan',
      price: 10000,
      currency: 'GHS',
      billingCycle: 'MONTHLY',
      maxUsers: null,
      maxBranches: null,
      maxPatients: null,
      storageGB: 1000,
      smsPerMonth: null,
      features: JSON.stringify([
        'Everything in Professional',
        'Unlimited Users & Branches',
        'White Label & Custom Branding',
        'Custom Domain',
        'API Access & Webhooks',
        'Reseller Management',
        'Dedicated Support',
        'SLA 99.9% Uptime',
        'Priority Feature Requests',
        'Data Export & Migration',
        'Unlimited SMS',
        'Unlimited Storage',
      ]),
      sortOrder: 3,
    },
    {
      name: 'PublicHealth',
      displayName: 'Public Health Edition',
      price: 3000,
      currency: 'GHS',
      billingCycle: 'MONTHLY',
      maxUsers: 100,
      maxBranches: 10,
      maxPatients: null,
      storageGB: 200,
      smsPerMonth: 10000,
      features: JSON.stringify([
        'Everything in Professional',
        'Disease Surveillance & Reporting',
        'Outbreak Detection & Alerts',
        'Immunization Registry (Ghana EPI)',
        'Mass Campaign Management',
        'Community Health Workers',
        'Household Mapping',
        'DHIMS2 Reporting',
        'Epidemiological Analytics',
        'Research & Clinical Trials',
        '10,000 SMS/month',
      ]),
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await db.saasPlan.upsert({
      where: { name: plan.name },
      create: plan,
      update: { ...plan },
    });
    console.log(`✓ Seeded plan: ${plan.displayName}`);
  }

  console.log('\nAll plans seeded successfully!');
}

seedPlans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
