import { prisma } from '../../common/utils/prisma.js';
import { ServiceCategory } from '@prisma/client';

interface ServiceSeed {
  serviceCode: string;
  serviceName: string;
  category: ServiceCategory;
  subcategory?: string;
  basePrice: number;
  nhisPrice?: number;
  isNhisCovered: boolean;
  unit: string;
  nhisCode?: string;
  requiresNhisPreauth?: boolean;
  description?: string;
}

const SERVICES: ServiceSeed[] = [
  // ==================== CLINICAL SERVICES ====================
  { serviceCode: 'CONS-GEN', serviceName: 'Consultation - General Doctor', category: 'CLINICAL_SERVICES', subcategory: 'consultation', basePrice: 50, nhisPrice: 30, isNhisCovered: true, unit: 'per_visit' },
  { serviceCode: 'CONS-SPEC', serviceName: 'Consultation - Specialist', category: 'CLINICAL_SERVICES', subcategory: 'consultation', basePrice: 100, nhisPrice: 60, isNhisCovered: true, unit: 'per_visit' },
  { serviceCode: 'CONS-EMER', serviceName: 'Emergency Consultation', category: 'CLINICAL_SERVICES', subcategory: 'consultation', basePrice: 150, nhisPrice: 100, isNhisCovered: true, unit: 'per_visit' },
  { serviceCode: 'TRIAGE', serviceName: 'Triage Assessment', category: 'CLINICAL_SERVICES', subcategory: 'assessment', basePrice: 10, nhisPrice: 10, isNhisCovered: true, unit: 'per_patient' },
  { serviceCode: 'PROC-MINOR', serviceName: 'Minor Procedure', category: 'CLINICAL_SERVICES', subcategory: 'procedure', basePrice: 200, nhisPrice: 150, isNhisCovered: true, unit: 'per_procedure', description: 'Wound suturing, abscess drainage, foreign body removal' },
  { serviceCode: 'PROC-MAJOR', serviceName: 'Major Procedure', category: 'CLINICAL_SERVICES', subcategory: 'procedure', basePrice: 500, nhisPrice: 350, isNhisCovered: true, unit: 'per_procedure' },
  { serviceCode: 'SURG-MINOR', serviceName: 'Minor Surgery', category: 'CLINICAL_SERVICES', subcategory: 'surgery', basePrice: 800, nhisPrice: 600, isNhisCovered: true, unit: 'per_surgery' },
  { serviceCode: 'SURG-MAJOR', serviceName: 'Major Surgery', category: 'CLINICAL_SERVICES', subcategory: 'surgery', basePrice: 2000, nhisPrice: 1500, isNhisCovered: true, unit: 'per_surgery', description: 'Appendectomy, cesarean section, hernia repair' },
  { serviceCode: 'ANC-VISIT', serviceName: 'Antenatal Care Visit', category: 'CLINICAL_SERVICES', subcategory: 'maternal', basePrice: 40, nhisPrice: 30, isNhisCovered: true, unit: 'per_visit' },
  { serviceCode: 'DELIVERY-NOR', serviceName: 'Normal Delivery', category: 'CLINICAL_SERVICES', subcategory: 'maternal', basePrice: 600, nhisPrice: 450, isNhisCovered: true, unit: 'per_delivery' },
  { serviceCode: 'DELIVERY-CS', serviceName: 'Cesarean Section', category: 'CLINICAL_SERVICES', subcategory: 'maternal', basePrice: 2500, nhisPrice: 1800, isNhisCovered: true, unit: 'per_delivery' },
  { serviceCode: 'IMMUN', serviceName: 'Immunization', category: 'CLINICAL_SERVICES', subcategory: 'preventive', basePrice: 20, nhisPrice: 0, isNhisCovered: true, unit: 'per_dose', description: 'Free under NHIS for children' },
  { serviceCode: 'DRESSING', serviceName: 'Wound Dressing', category: 'CLINICAL_SERVICES', subcategory: 'nursing', basePrice: 30, nhisPrice: 20, isNhisCovered: true, unit: 'per_session' },
  { serviceCode: 'INJECTION', serviceName: 'Injection Administration', category: 'CLINICAL_SERVICES', subcategory: 'nursing', basePrice: 15, nhisPrice: 10, isNhisCovered: true, unit: 'per_injection' },
  { serviceCode: 'ECG', serviceName: 'Electrocardiogram (ECG)', category: 'CLINICAL_SERVICES', subcategory: 'diagnostics', basePrice: 60, nhisPrice: 45, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'PHYSIO', serviceName: 'Physiotherapy Session', category: 'CLINICAL_SERVICES', subcategory: 'rehabilitation', basePrice: 80, nhisPrice: 50, isNhisCovered: true, unit: 'per_session' },

  // ==================== LABORATORY ====================
  { serviceCode: 'LAB-MAL-RDT', serviceName: 'Malaria RDT', category: 'LABORATORY', subcategory: 'parasitology', basePrice: 15, nhisPrice: 12, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-MAL-FILM', serviceName: 'Malaria Blood Film', category: 'LABORATORY', subcategory: 'parasitology', basePrice: 20, nhisPrice: 15, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-CBC', serviceName: 'Complete Blood Count (CBC)', category: 'LABORATORY', subcategory: 'hematology', basePrice: 40, nhisPrice: 35, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-HB', serviceName: 'Hemoglobin Level', category: 'LABORATORY', subcategory: 'hematology', basePrice: 15, nhisPrice: 12, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-BG', serviceName: 'Blood Grouping & Rh', category: 'LABORATORY', subcategory: 'hematology', basePrice: 25, nhisPrice: 20, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-ESR', serviceName: 'Erythrocyte Sedimentation Rate', category: 'LABORATORY', subcategory: 'hematology', basePrice: 20, nhisPrice: 15, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-FBS', serviceName: 'Fasting Blood Sugar', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 25, nhisPrice: 20, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-RBS', serviceName: 'Random Blood Sugar', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 20, nhisPrice: 15, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-LIPID', serviceName: 'Lipid Panel', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 80, nhisPrice: 70, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-LFT', serviceName: 'Liver Function Test', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 70, nhisPrice: 60, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-RFT', serviceName: 'Renal Function Test', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 70, nhisPrice: 60, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-ELEC', serviceName: 'Electrolytes', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 60, nhisPrice: 50, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-UA', serviceName: 'Urinalysis', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 15, nhisPrice: 12, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-STOOL', serviceName: 'Stool Analysis', category: 'LABORATORY', subcategory: 'microbiology', basePrice: 15, nhisPrice: 12, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-WIDAL', serviceName: 'Widal Test', category: 'LABORATORY', subcategory: 'serology', basePrice: 25, nhisPrice: 20, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-HIV', serviceName: 'HIV Test', category: 'LABORATORY', subcategory: 'serology', basePrice: 25, nhisPrice: 0, isNhisCovered: true, unit: 'per_test', description: 'Free under NHIS' },
  { serviceCode: 'LAB-HEPB', serviceName: 'Hepatitis B Surface Antigen', category: 'LABORATORY', subcategory: 'serology', basePrice: 30, nhisPrice: 25, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-HEPC', serviceName: 'Hepatitis C Antibody', category: 'LABORATORY', subcategory: 'serology', basePrice: 35, nhisPrice: 30, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-VDRL', serviceName: 'VDRL/Syphilis Test', category: 'LABORATORY', subcategory: 'serology', basePrice: 20, nhisPrice: 15, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-PREG', serviceName: 'Pregnancy Test (Urine)', category: 'LABORATORY', subcategory: 'serology', basePrice: 10, nhisPrice: 8, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-CULTURE', serviceName: 'Blood Culture', category: 'LABORATORY', subcategory: 'microbiology', basePrice: 150, nhisPrice: 120, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-URINE-CS', serviceName: 'Urine Culture & Sensitivity', category: 'LABORATORY', subcategory: 'microbiology', basePrice: 80, nhisPrice: 65, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-HBA1C', serviceName: 'HbA1c (Glycated Hemoglobin)', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 60, nhisPrice: 50, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-PSA', serviceName: 'Prostate Specific Antigen', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 80, nhisPrice: 65, isNhisCovered: true, unit: 'per_test' },
  { serviceCode: 'LAB-THYROID', serviceName: 'Thyroid Function Test', category: 'LABORATORY', subcategory: 'chemistry', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_test' },

  // ==================== RADIOLOGY ====================
  { serviceCode: 'RAD-XRAY-CHEST', serviceName: 'X-Ray - Chest', category: 'RADIOLOGY', subcategory: 'x-ray', basePrice: 80, nhisPrice: 60, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-XRAY-LIMB', serviceName: 'X-Ray - Extremity', category: 'RADIOLOGY', subcategory: 'x-ray', basePrice: 60, nhisPrice: 45, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-XRAY-SPINE', serviceName: 'X-Ray - Spine', category: 'RADIOLOGY', subcategory: 'x-ray', basePrice: 100, nhisPrice: 75, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-XRAY-ABD', serviceName: 'X-Ray - Abdomen', category: 'RADIOLOGY', subcategory: 'x-ray', basePrice: 80, nhisPrice: 60, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-XRAY-SKULL', serviceName: 'X-Ray - Skull', category: 'RADIOLOGY', subcategory: 'x-ray', basePrice: 80, nhisPrice: 60, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-US-ABD', serviceName: 'Ultrasound - Abdominal', category: 'RADIOLOGY', subcategory: 'ultrasound', basePrice: 120, nhisPrice: 100, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-US-OB', serviceName: 'Ultrasound - Obstetric', category: 'RADIOLOGY', subcategory: 'ultrasound', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-US-PELV', serviceName: 'Ultrasound - Pelvic', category: 'RADIOLOGY', subcategory: 'ultrasound', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-US-BREAST', serviceName: 'Ultrasound - Breast', category: 'RADIOLOGY', subcategory: 'ultrasound', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-US-THYROID', serviceName: 'Ultrasound - Thyroid', category: 'RADIOLOGY', subcategory: 'ultrasound', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_exam' },
  { serviceCode: 'RAD-CT-HEAD', serviceName: 'CT Scan - Head', category: 'RADIOLOGY', subcategory: 'ct-scan', basePrice: 600, nhisPrice: 500, isNhisCovered: false, unit: 'per_exam', requiresNhisPreauth: true, description: 'Requires pre-authorization' },
  { serviceCode: 'RAD-CT-CHEST', serviceName: 'CT Scan - Chest', category: 'RADIOLOGY', subcategory: 'ct-scan', basePrice: 700, nhisPrice: 550, isNhisCovered: false, unit: 'per_exam', requiresNhisPreauth: true },
  { serviceCode: 'RAD-CT-ABD', serviceName: 'CT Scan - Abdomen', category: 'RADIOLOGY', subcategory: 'ct-scan', basePrice: 700, nhisPrice: 550, isNhisCovered: false, unit: 'per_exam', requiresNhisPreauth: true },
  { serviceCode: 'RAD-MRI', serviceName: 'MRI', category: 'RADIOLOGY', subcategory: 'mri', basePrice: 1200, isNhisCovered: false, unit: 'per_exam', description: 'Not covered by NHIS' },
  { serviceCode: 'RAD-MAMMO', serviceName: 'Mammography', category: 'RADIOLOGY', subcategory: 'mammography', basePrice: 150, nhisPrice: 120, isNhisCovered: true, unit: 'per_exam' },

  // ==================== INPATIENT ====================
  { serviceCode: 'BED-GEN', serviceName: 'Bed - General Ward', category: 'INPATIENT', subcategory: 'ward', basePrice: 100, nhisPrice: 80, isNhisCovered: true, unit: 'per_night' },
  { serviceCode: 'BED-SEMI', serviceName: 'Bed - Semi-Private', category: 'INPATIENT', subcategory: 'ward', basePrice: 180, nhisPrice: 120, isNhisCovered: true, unit: 'per_night' },
  { serviceCode: 'BED-PRIV', serviceName: 'Bed - Private Room', category: 'INPATIENT', subcategory: 'ward', basePrice: 250, isNhisCovered: false, unit: 'per_night', description: 'Private rooms not covered by NHIS' },
  { serviceCode: 'BED-ICU', serviceName: 'ICU Bed', category: 'INPATIENT', subcategory: 'intensive', basePrice: 500, nhisPrice: 400, isNhisCovered: true, unit: 'per_day' },
  { serviceCode: 'BED-NICU', serviceName: 'NICU Bed', category: 'INPATIENT', subcategory: 'intensive', basePrice: 400, nhisPrice: 300, isNhisCovered: true, unit: 'per_day' },
  { serviceCode: 'BED-MAT', serviceName: 'Maternity Ward', category: 'INPATIENT', subcategory: 'maternity', basePrice: 150, nhisPrice: 120, isNhisCovered: true, unit: 'per_night' },
  { serviceCode: 'ADM-FEE', serviceName: 'Admission Fee', category: 'INPATIENT', subcategory: 'admission', basePrice: 50, nhisPrice: 30, isNhisCovered: true, unit: 'per_admission' },
  { serviceCode: 'MEALS', serviceName: 'Patient Meals', category: 'INPATIENT', subcategory: 'catering', basePrice: 30, nhisPrice: 20, isNhisCovered: true, unit: 'per_day' },

  // ==================== PACKAGES ====================
  { serviceCode: 'PKG-ANC', serviceName: 'Antenatal Care (ANC) Package', category: 'PACKAGES', basePrice: 500, nhisPrice: 400, isNhisCovered: true, unit: 'per_package', description: '8 visits, labs, 2 ultrasounds, supplements' },
  { serviceCode: 'PKG-CHILD-WELLNESS', serviceName: 'Child Wellness Check (0-5 years)', category: 'PACKAGES', basePrice: 100, nhisPrice: 0, isNhisCovered: true, unit: 'per_package', description: 'Physical exam, growth monitoring, immunizations, Vitamin A, deworming' },
  { serviceCode: 'PKG-SCREENING', serviceName: 'Health Screening (Adult)', category: 'PACKAGES', basePrice: 300, isNhisCovered: false, unit: 'per_package', description: 'Physical exam, BP, blood sugar, lipid profile, ECG' },
  { serviceCode: 'PKG-DENTAL-BASIC', serviceName: 'Basic Dental Package', category: 'PACKAGES', basePrice: 150, nhisPrice: 100, isNhisCovered: true, unit: 'per_package', description: 'Exam, cleaning, 1 filling' },
  { serviceCode: 'PKG-EYE-SCREEN', serviceName: 'Eye Screening Package', category: 'PACKAGES', basePrice: 120, nhisPrice: 80, isNhisCovered: true, unit: 'per_package', description: 'Visual acuity, refraction, fundoscopy' },
];

export async function seedServiceCatalog(tenantId: string) {
  console.log(`[SEED] Seeding service catalog for tenant ${tenantId}...`);

  let created = 0;
  let skipped = 0;

  for (const svc of SERVICES) {
    const existing = await prisma.serviceCatalog.findUnique({
      where: { tenantId_serviceCode: { tenantId, serviceCode: svc.serviceCode } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.serviceCatalog.create({
      data: {
        tenantId,
        serviceCode: svc.serviceCode,
        serviceName: svc.serviceName,
        category: svc.category,
        subcategory: svc.subcategory,
        description: svc.description,
        basePrice: svc.basePrice,
        unit: svc.unit,
        isNhisCovered: svc.isNhisCovered,
        nhisPrice: svc.nhisPrice,
        nhisCode: svc.nhisCode,
        requiresNhisPreauth: svc.requiresNhisPreauth || false,
        effectiveFrom: new Date(),
      },
    });
    created++;
  }

  console.log(`[SEED] Service catalog: ${created} created, ${skipped} skipped (already exist)`);

  // Seed default discount schemes
  const discounts = [
    { schemeName: 'Senior Citizen (65+)', discountType: 'percentage', discountValue: 10, appliesTo: 'all_services', eligibilityCriteria: 'Patient age 65 years or older' },
    { schemeName: 'Hospital Staff', discountType: 'percentage', discountValue: 50, appliesTo: 'all_services', eligibilityCriteria: 'Active hospital employee or immediate family' },
    { schemeName: 'Student Discount', discountType: 'percentage', discountValue: 15, appliesTo: 'CLINICAL_SERVICES', eligibilityCriteria: 'Valid student ID required' },
  ];

  let discountCreated = 0;
  for (const d of discounts) {
    const existing = await prisma.discountScheme.findFirst({
      where: { tenantId, schemeName: d.schemeName },
    });
    if (!existing) {
      await prisma.discountScheme.create({ data: { tenantId, ...d } });
      discountCreated++;
    }
  }

  console.log(`[SEED] Discount schemes: ${discountCreated} created`);

  // Seed cost prices for all services (approx 50% of selling price as cost)
  const COST_RATIOS: Record<string, number> = {
    'CONS-GEN': 0.50, 'CONS-SPEC': 0.40, 'CONS-EMER': 0.45, 'TRIAGE': 0.60,
    'PROC-MINOR': 0.45, 'PROC-MAJOR': 0.40, 'SURG-MINOR': 0.45, 'SURG-MAJOR': 0.50,
    'ANC-VISIT': 0.50, 'DELIVERY-NOR': 0.55, 'DELIVERY-CS': 0.55, 'IMMUN': 0.80,
    'DRESSING': 0.50, 'INJECTION': 0.40, 'ECG': 0.50, 'PHYSIO': 0.45,
    'LAB-MAL-RDT': 0.50, 'LAB-MAL-FILM': 0.45, 'LAB-CBC': 0.50, 'LAB-HB': 0.50,
    'LAB-BG': 0.45, 'LAB-ESR': 0.45, 'LAB-FBS': 0.45, 'LAB-RBS': 0.45,
    'LAB-LIPID': 0.50, 'LAB-LFT': 0.50, 'LAB-RFT': 0.50, 'LAB-ELEC': 0.50,
    'LAB-UA': 0.50, 'LAB-STOOL': 0.50, 'LAB-WIDAL': 0.45, 'LAB-HIV': 1.00,
    'LAB-HEPB': 0.50, 'LAB-HEPC': 0.50, 'LAB-VDRL': 0.45, 'LAB-PREG': 0.40,
    'LAB-CULTURE': 0.55, 'LAB-URINE-CS': 0.50, 'LAB-HBA1C': 0.55, 'LAB-PSA': 0.55,
    'LAB-THYROID': 0.55,
    'RAD-XRAY-CHEST': 0.45, 'RAD-XRAY-LIMB': 0.45, 'RAD-XRAY-SPINE': 0.45,
    'RAD-XRAY-ABD': 0.45, 'RAD-XRAY-SKULL': 0.45,
    'RAD-US-ABD': 0.40, 'RAD-US-OB': 0.40, 'RAD-US-PELV': 0.40,
    'RAD-US-BREAST': 0.40, 'RAD-US-THYROID': 0.40,
    'RAD-CT-HEAD': 0.55, 'RAD-CT-CHEST': 0.55, 'RAD-CT-ABD': 0.55,
    'RAD-MRI': 0.60, 'RAD-MAMMO': 0.50,
    'BED-GEN': 0.60, 'BED-SEMI': 0.50, 'BED-PRIV': 0.45, 'BED-ICU': 0.65,
    'BED-NICU': 0.65, 'BED-MAT': 0.55, 'ADM-FEE': 0.40, 'MEALS': 0.70,
    'PKG-ANC': 0.55, 'PKG-CHILD-WELLNESS': 0.60, 'PKG-SCREENING': 0.45,
    'PKG-DENTAL-BASIC': 0.50, 'PKG-EYE-SCREEN': 0.45,
  };

  let costUpdated = 0;
  const allServices = await prisma.serviceCatalog.findMany({ where: { tenantId } });
  for (const svc of allServices) {
    if (svc.costPrice) continue; // already has cost
    const ratio = COST_RATIOS[svc.serviceCode] || 0.50;
    const costPrice = Math.round(svc.basePrice * ratio * 100) / 100;
    await prisma.serviceCatalog.update({
      where: { id: svc.id },
      data: { costPrice, lastCostUpdate: new Date() },
    });
    costUpdated++;
  }
  console.log(`[SEED] Cost prices: ${costUpdated} updated`);

  // Seed category profit settings
  const categorySettings = [
    { category: 'CLINICAL_SERVICES', subcategory: 'consultation', targetProfitPercentage: 100, minimumProfitPercentage: 75, pricingStrategy: 'value_based' },
    { category: 'CLINICAL_SERVICES', subcategory: 'procedure', targetProfitPercentage: 100, minimumProfitPercentage: 60, pricingStrategy: 'cost_plus' },
    { category: 'CLINICAL_SERVICES', subcategory: 'surgery', targetProfitPercentage: 80, minimumProfitPercentage: 50, pricingStrategy: 'cost_plus' },
    { category: 'CLINICAL_SERVICES', subcategory: 'maternal', targetProfitPercentage: 80, minimumProfitPercentage: 40, pricingStrategy: 'cost_plus' },
    { category: 'CLINICAL_SERVICES', subcategory: '', targetProfitPercentage: 100, minimumProfitPercentage: 50, pricingStrategy: 'value_based' },
    { category: 'LABORATORY', subcategory: 'hematology', targetProfitPercentage: 100, minimumProfitPercentage: 60, pricingStrategy: 'cost_plus' },
    { category: 'LABORATORY', subcategory: 'chemistry', targetProfitPercentage: 100, minimumProfitPercentage: 60, pricingStrategy: 'cost_plus' },
    { category: 'LABORATORY', subcategory: '', targetProfitPercentage: 100, minimumProfitPercentage: 50, pricingStrategy: 'cost_plus' },
    { category: 'RADIOLOGY', subcategory: 'x-ray', targetProfitPercentage: 120, minimumProfitPercentage: 80, pricingStrategy: 'cost_plus' },
    { category: 'RADIOLOGY', subcategory: 'ultrasound', targetProfitPercentage: 150, minimumProfitPercentage: 100, pricingStrategy: 'cost_plus' },
    { category: 'RADIOLOGY', subcategory: '', targetProfitPercentage: 100, minimumProfitPercentage: 60, pricingStrategy: 'cost_plus' },
    { category: 'INPATIENT', subcategory: '', targetProfitPercentage: 60, minimumProfitPercentage: 30, pricingStrategy: 'cost_plus' },
    { category: 'PACKAGES', subcategory: '', targetProfitPercentage: 80, minimumProfitPercentage: 40, pricingStrategy: 'value_based' },
    { category: 'PHARMACY', subcategory: 'essential_medicines', targetProfitPercentage: 30, minimumProfitPercentage: 20, pricingStrategy: 'cost_plus' },
    { category: 'PHARMACY', subcategory: 'brand_drugs', targetProfitPercentage: 50, minimumProfitPercentage: 35, pricingStrategy: 'market_based' },
    { category: 'PHARMACY', subcategory: '', targetProfitPercentage: 40, minimumProfitPercentage: 25, pricingStrategy: 'cost_plus' },
  ];

  let catCreated = 0;
  for (const cs of categorySettings) {
    const existing = await prisma.categoryProfitSettings.findFirst({
      where: { tenantId, category: cs.category, subcategory: cs.subcategory },
    });
    if (!existing) {
      await prisma.categoryProfitSettings.create({ data: { tenantId, ...cs } });
      catCreated++;
    }
  }
  console.log(`[SEED] Category profit settings: ${catCreated} created`);

  return {
    servicesCreated: created, servicesSkipped: skipped,
    discountsCreated: discountCreated,
    costPricesUpdated: costUpdated,
    categorySettingsCreated: catCreated,
  };
}
