import { prisma } from '../../common/utils/prisma.js';
import { logger } from '../../common/utils/logger.js';

const NOTIFIABLE_DISEASES = [
  'Cholera', 'Measles', 'Meningitis', 'Yellow Fever', 'COVID-19',
  'Ebola', 'Polio', 'Malaria (Severe)', 'Tuberculosis', 'Rabies',
  'Typhoid', 'Hepatitis A', 'Hepatitis B', 'Diphtheria', 'Pertussis',
];

const OUTBREAK_THRESHOLDS: Record<string, number> = {
  'Cholera': 3, 'Measles': 5, 'Meningitis': 3, 'Yellow Fever': 1,
  'COVID-19': 10, 'Ebola': 1, 'Polio': 1,
};

// ── Disease Notifications ──
export async function createNotification(data: {
  tenantId: string; branchId: string; patientId: string; encounterId?: string;
  diseaseName: string; icd10Code?: string; diagnosisDate: string;
  onsetDate?: string; severity?: string; reportedBy: string; location?: string;
}) {
  const notification = await prisma.diseaseNotification.create({
    data: {
      tenantId: data.tenantId,
      branchId: data.branchId,
      patientId: data.patientId,
      encounterId: data.encounterId,
      diseaseName: data.diseaseName,
      icd10Code: data.icd10Code,
      diagnosisDate: new Date(data.diagnosisDate),
      onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
      severity: data.severity || 'MODERATE',
      reportedBy: data.reportedBy,
      location: data.location,
      status: 'REPORTED',
    },
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
  });

  // Check outbreak threshold
  await checkOutbreakThreshold(data.tenantId, data.diseaseName);

  return notification;
}

export async function getNotifications(tenantId: string, filters?: {
  diseaseName?: string; status?: string; startDate?: string; endDate?: string;
}) {
  const where: any = { tenantId };
  if (filters?.diseaseName) where.diseaseName = filters.diseaseName;
  if (filters?.status) where.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    where.diagnosisDate = {};
    if (filters.startDate) where.diagnosisDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.diagnosisDate.lte = new Date(filters.endDate);
  }

  return prisma.diseaseNotification.findMany({
    where,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
    orderBy: { reportedAt: 'desc' },
    take: 200,
  });
}

export async function updateNotification(id: string, data: {
  status?: string; investigatedBy?: string; investigationNotes?: string;
  labConfirmed?: boolean; outcome?: string; outcomeDate?: string;
  ghsReported?: boolean; ghsReferenceNumber?: string; contactsTraced?: number;
}) {
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.investigatedBy) { updateData.investigatedBy = data.investigatedBy; updateData.investigatedAt = new Date(); }
  if (data.investigationNotes) updateData.investigationNotes = data.investigationNotes;
  if (data.labConfirmed !== undefined) updateData.labConfirmed = data.labConfirmed;
  if (data.outcome) { updateData.outcome = data.outcome; updateData.outcomeDate = data.outcomeDate ? new Date(data.outcomeDate) : new Date(); }
  if (data.ghsReported) { updateData.ghsReported = true; updateData.ghsReportedAt = new Date(); }
  if (data.ghsReferenceNumber) updateData.ghsReferenceNumber = data.ghsReferenceNumber;
  if (data.contactsTraced !== undefined) updateData.contactsTraced = data.contactsTraced;

  return prisma.diseaseNotification.update({ where: { id }, data: updateData });
}

// ── Outbreak Detection ──
async function checkOutbreakThreshold(tenantId: string, diseaseName: string) {
  const threshold = OUTBREAK_THRESHOLDS[diseaseName];
  if (!threshold) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const count = await prisma.diseaseNotification.count({
    where: { tenantId, diseaseName, diagnosisDate: { gte: thirtyDaysAgo }, status: { not: 'CLOSED' } },
  });

  if (count >= threshold) {
    const existing = await prisma.outbreakAlert.findFirst({
      where: { diseaseName, isActive: true, tenantId },
    });
    if (!existing) {
      await prisma.outbreakAlert.create({
        data: {
          tenantId,
          diseaseName,
          alertLevel: count >= threshold * 3 ? 'EMERGENCY' : count >= threshold * 2 ? 'WARNING' : 'WATCH',
          caseCount: count,
          thresholdExceeded: true,
          message: `${diseaseName}: ${count} cases in 30 days (threshold: ${threshold}). Investigation recommended.`,
        },
      });
      logger.warn(`OUTBREAK ALERT: ${diseaseName} - ${count} cases in tenant ${tenantId}`);
    } else {
      await prisma.outbreakAlert.update({
        where: { id: existing.id },
        data: {
          caseCount: count,
          alertLevel: count >= threshold * 3 ? 'EMERGENCY' : count >= threshold * 2 ? 'WARNING' : 'WATCH',
          message: `${diseaseName}: ${count} cases in 30 days (threshold: ${threshold}).`,
        },
      });
    }
  }
}

export async function getOutbreakAlerts(tenantId?: string, activeOnly = true) {
  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (activeOnly) where.isActive = true;

  return prisma.outbreakAlert.findMany({ where, orderBy: { activatedAt: 'desc' } });
}

export async function deactivateAlert(id: string, userId: string) {
  return prisma.outbreakAlert.update({
    where: { id },
    data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId },
  });
}

// ── Disease Surveillance Dashboard ──
export async function getSurveillanceDashboard(tenantId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [totalCases, byDisease, bySeverity, activeAlerts, recentCases] = await Promise.all([
    prisma.diseaseNotification.count({ where: { tenantId, diagnosisDate: { gte: thirtyDaysAgo } } }),
    prisma.diseaseNotification.groupBy({
      by: ['diseaseName'], where: { tenantId, diagnosisDate: { gte: thirtyDaysAgo } }, _count: true,
      orderBy: { _count: { diseaseName: 'desc' } },
    }),
    prisma.diseaseNotification.groupBy({
      by: ['severity'], where: { tenantId, diagnosisDate: { gte: thirtyDaysAgo } }, _count: true,
    }),
    prisma.outbreakAlert.count({ where: { tenantId, isActive: true } }),
    prisma.diseaseNotification.findMany({
      where: { tenantId, diagnosisDate: { gte: thirtyDaysAgo } },
      include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
      orderBy: { reportedAt: 'desc' }, take: 10,
    }),
  ]);

  return {
    totalCases30d: totalCases,
    byDisease: byDisease.map(d => ({ disease: d.diseaseName, count: d._count })),
    bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
    activeAlerts,
    recentCases,
    notifiableDiseases: NOTIFIABLE_DISEASES,
  };
}

// ── Immunization Registry ──
export async function createImmunization(data: {
  tenantId: string; patientId: string; vaccineName: string; doseNumber?: number;
  scheduledDate?: string; administeredDate?: string; administeredBy?: string;
  batchNumber?: string; manufacturer?: string; site?: string; route?: string;
  nextDueDate?: string; notes?: string;
}) {
  return prisma.immunizationRecord.create({
    data: {
      tenantId: data.tenantId,
      patientId: data.patientId,
      vaccineName: data.vaccineName,
      doseNumber: data.doseNumber || 1,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      administeredDate: data.administeredDate ? new Date(data.administeredDate) : null,
      administeredBy: data.administeredBy,
      batchNumber: data.batchNumber,
      manufacturer: data.manufacturer,
      site: data.site,
      route: data.route,
      status: data.administeredDate ? 'ADMINISTERED' : 'SCHEDULED',
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      notes: data.notes,
    },
  });
}

export async function getImmunizations(tenantId: string, patientId?: string, status?: string) {
  const where: any = { tenantId };
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;

  return prisma.immunizationRecord.findMany({
    where,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function administerVaccine(id: string, data: {
  administeredBy: string; batchNumber?: string; site?: string; route?: string;
  adverseReaction?: string; nextDueDate?: string;
}) {
  return prisma.immunizationRecord.update({
    where: { id },
    data: {
      status: 'ADMINISTERED',
      administeredDate: new Date(),
      administeredBy: data.administeredBy,
      batchNumber: data.batchNumber,
      site: data.site,
      route: data.route,
      adverseReaction: data.adverseReaction,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
    },
  });
}

export async function getDefaulters(tenantId: string) {
  const today = new Date();
  return prisma.immunizationRecord.findMany({
    where: { tenantId, status: 'SCHEDULED', scheduledDate: { lt: today } },
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phonePrimary: true, dateOfBirth: true } } },
    orderBy: { scheduledDate: 'asc' },
    take: 100,
  });
}

// ── Mass Campaigns ──
export async function createCampaign(data: {
  tenantId: string; campaignName: string; campaignType: string;
  targetPopulation?: string; targetCount?: number; startDate: string;
  endDate: string; locations?: string[]; teams?: string[]; notes?: string; createdBy: string;
}) {
  return prisma.massCampaign.create({
    data: {
      tenantId: data.tenantId,
      campaignName: data.campaignName,
      campaignType: data.campaignType,
      targetPopulation: data.targetPopulation,
      targetCount: data.targetCount,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      locations: data.locations ? JSON.stringify(data.locations) : null,
      teams: data.teams ? JSON.stringify(data.teams) : null,
      notes: data.notes,
      createdBy: data.createdBy,
    },
  });
}

export async function getCampaigns(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  return prisma.massCampaign.findMany({ where, orderBy: { startDate: 'desc' }, take: 50 });
}

export async function updateCampaignProgress(id: string, reachedCount: number, status?: string) {
  const data: any = { reachedCount };
  if (status) data.status = status;
  return prisma.massCampaign.update({ where: { id }, data });
}
