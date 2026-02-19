import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import bcrypt from 'bcryptjs';

const STEPS = [
  { step: 1, id: 'hospital_profile', title: 'Hospital Profile', required: true },
  { step: 2, id: 'branches_setup', title: 'Branches & Locations', required: true },
  { step: 3, id: 'departments_setup', title: 'Departments', required: true },
  { step: 4, id: 'staff_users', title: 'Staff & Users', required: true },
  { step: 5, id: 'service_pricing', title: 'Service Pricing', required: true },
  { step: 6, id: 'drug_formulary', title: 'Drug Formulary', required: true },
  { step: 7, id: 'lab_test_catalog', title: 'Laboratory Tests', required: true },
  { step: 8, id: 'wards_beds', title: 'Wards & Beds', required: false },
  { step: 9, id: 'integrations', title: 'Integrations', required: false },
  { step: 10, id: 'review_complete', title: 'Review & Complete', required: true },
];

const sf = (n: number) => `setupStep${n}Completed`;

export class SetupService {

  async getStatus(tenantId: string) {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new AppError('Tenant not found', 404);
    const steps = STEPS.map(s => ({ ...s, completed: (t as any)[sf(s.step)] as boolean }));
    const done = steps.filter(s => s.completed).length;
    const pct = Math.round((done / steps.length) * 100);
    const missing = steps.filter(s => s.required && !s.completed).map(s => s.step);
    return { setupCompleted: t.setupCompleted, setupCompletedAt: t.setupCompletedAt, overallPercentage: pct, steps, missingRequiredSteps: missing, showWizard: !t.setupCompleted && missing.length > 0 };
  }

  async saveStep(tenantId: string, stepId: string, data: any) {
    const def = STEPS.find(s => s.id === stepId);
    if (!def) throw new AppError('Invalid step ID', 400);
    await this.handleStep(tenantId, stepId, data);
    const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const prog = (t?.setupProgress as any) || {};
    prog[`step_${def.step}`] = { completed: true, completed_at: new Date().toISOString() };
    await prisma.tenant.update({ where: { id: tenantId }, data: { [sf(def.step)]: true, setupProgress: prog } });
    const status = await this.getStatus(tenantId);
    return { success: true, stepCompleted: true, overallPercentage: status.overallPercentage };
  }

  async skipStep(tenantId: string, stepId: string) {
    const def = STEPS.find(s => s.id === stepId);
    if (!def) throw new AppError('Invalid step ID', 400);
    if (def.required) throw new AppError('Cannot skip required step', 400);
    const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const prog = (t?.setupProgress as any) || {};
    prog[`step_${def.step}`] = { completed: true, skipped: true, completed_at: new Date().toISOString() };
    await prisma.tenant.update({ where: { id: tenantId }, data: { [sf(def.step)]: true, setupProgress: prog } });
    const status = await this.getStatus(tenantId);
    return { success: true, stepSkipped: true, overallPercentage: status.overallPercentage };
  }

  async completeSetup(tenantId: string) {
    const status = await this.getStatus(tenantId);
    if (status.missingRequiredSteps.length > 0) throw new AppError(`Required steps not completed: ${status.missingRequiredSteps.join(', ')}`, 400, 'SETUP_INCOMPLETE');
    await prisma.tenant.update({ where: { id: tenantId }, data: { setupCompleted: true, setupCompletedAt: new Date(), setupStep10Completed: true } });
    return { success: true, message: 'Setup completed successfully' };
  }

  private async handleStep(tenantId: string, stepId: string, data: any) {
    switch (stepId) {
      case 'hospital_profile': return this.saveProfile(tenantId, data);
      case 'branches_setup': return this.saveBranches(tenantId, data);
      case 'departments_setup': return this.saveDepts(tenantId, data);
      case 'staff_users': return this.saveStaff(tenantId, data);
      case 'service_pricing': return this.savePricing(tenantId, data);
      case 'drug_formulary': return this.saveDrugs(tenantId, data);
      case 'lab_test_catalog': return this.saveLabs(tenantId, data);
      case 'wards_beds': return this.saveWards(tenantId, data);
      case 'integrations': return this.saveIntegrations(tenantId, data);
      default: return;
    }
  }

  private async saveProfile(tenantId: string, d: any) {
    await prisma.tenant.update({ where: { id: tenantId }, data: {
      name: d.hospital_name || d.hospitalName, phone: d.phone, email: d.email,
      address: d.address, region: d.region, licenseNumber: d.license_number || d.licenseNumber,
      hospitalType: d.hospital_type || d.hospitalType, hospitalCategory: d.hospital_category || d.hospitalCategory,
      bedCapacity: d.bed_capacity ? Number(d.bed_capacity) : d.bedCapacity ? Number(d.bedCapacity) : undefined,
      nhisAccredited: d.nhis_accreditation === 'Yes' || d.nhisAccredited === true,
      nhisProviderCode: d.nhis_provider_code || d.nhisProviderCode,
    }});
  }

  private async saveBranches(tenantId: string, d: any) {
    const branches = d.branches || [];
    for (const b of branches) {
      if (b.id) {
        await prisma.branch.update({ where: { id: b.id }, data: { name: b.branch_name || b.name, code: b.branch_code || b.code, address: b.address || '', phone: b.phone || '', email: b.email || '', isMainBranch: b.is_primary || b.isMainBranch || false } });
      } else {
        await prisma.branch.create({ data: { tenantId, name: b.branch_name || b.name, code: b.branch_code || b.code, address: b.address || '', phone: b.phone || '', email: b.email || '', isMainBranch: b.is_primary || b.isMainBranch || false } });
      }
    }
  }

  private async saveDepts(tenantId: string, d: any) {
    const depts = d.departments || [];
    for (const dept of depts) {
      const exists = await prisma.department.findFirst({ where: { tenantId, code: dept.code } });
      if (!exists) {
        await prisma.department.create({ data: { tenantId, name: dept.name, code: dept.code, description: dept.category || 'Clinical', isActive: true } });
      }
    }
  }

  private async saveStaff(tenantId: string, d: any) {
    const users = d.users || [];
    const branch = await prisma.branch.findFirst({ where: { tenantId } });
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleMap = new Map(roles.map(r => [r.name, r.id]));
    const hashed = await bcrypt.hash('Welcome123!', 10);
    for (const u of users) {
      const exists = await prisma.user.findFirst({ where: { email: u.email } });
      if (exists) continue;
      const roleId = roleMap.get(u.role);
      if (!roleId) continue;
      await prisma.user.create({ data: { tenantId, branchId: branch?.id || '', email: u.email, password: hashed, firstName: u.first_name || u.firstName, lastName: u.last_name || u.lastName, phone: u.phone, role: u.role, roleId, isActive: true, status: 'ACTIVE', branchAccessScope: 'PRIMARY_ONLY' } });
    }
  }

  private async savePricing(tenantId: string, d: any) {
    const services = d.services || [];
    const catMap: Record<string, string> = { 'Clinical Services': 'CLINICAL_SERVICES', 'Laboratory': 'LABORATORY', 'Radiology': 'RADIOLOGY', 'Inpatient': 'INPATIENT' };
    for (const s of services) {
      const exists = await prisma.serviceCatalog.findFirst({ where: { tenantId, serviceCode: s.code } });
      if (exists) {
        await prisma.serviceCatalog.update({ where: { id: exists.id }, data: { basePrice: s.cash_price ?? s.cashPrice ?? 0, nhisPrice: s.nhis_price ?? s.nhisPrice } });
      } else {
        const cat = catMap[s.category] || 'CLINICAL_SERVICES';
        await prisma.serviceCatalog.create({ data: { tenantId, serviceName: s.service || s.name, serviceCode: s.code, category: cat as any, basePrice: s.cash_price ?? s.cashPrice ?? 0, nhisPrice: s.nhis_price ?? s.nhisPrice, isNhisCovered: (s.nhis_price ?? s.nhisPrice) > 0, isActive: true } });
      }
    }
  }

  private async saveDrugs(_tenantId: string, _d: any) {
    // Drug formulary import is handled by pharmacy module
    // This step just marks completion after user confirms drugs are added
  }

  private async saveLabs(_tenantId: string, _d: any) {
    // Lab test catalog managed by lab module
    // This step marks completion after user confirms tests are configured
  }

  private async saveWards(tenantId: string, d: any) {
    const wards = d.wards || [];
    const branch = await prisma.branch.findFirst({ where: { tenantId } });
    if (!branch) return;
    for (const w of wards) {
      const code = (w.name || 'WARD').replace(/\s+/g, '-').toUpperCase().slice(0, 10);
      const ward = await prisma.ward.create({ data: { tenantId, branchId: branch.id, name: w.name, code, wardType: (w.ward_type || w.wardType || 'GENERAL').toUpperCase() as any, totalBeds: w.total_beds || w.totalBeds || w.beds || 0, isActive: true } });
      const bedCount = w.total_beds || w.totalBeds || w.beds || 0;
      for (let i = 1; i <= bedCount; i++) {
        await prisma.bed.create({ data: { wardId: ward.id, bedNumber: `Bed ${i}`, bedType: 'standard' } });
      }
    }
  }

  private async saveIntegrations(tenantId: string, d: any) {
    // Store integration config in tenant settings JSON
    await prisma.tenant.update({ where: { id: tenantId }, data: { settings: d } });
  }
}

export const setupService = new SetupService();
