import { prisma } from '../../common/utils/prisma.js';

const db = prisma as any;

// ── Clinical Trials ──
export async function createTrial(data: {
  tenantId: string; trialCode: string; title: string; description?: string;
  principalInvestigator: string; sponsor?: string; phase?: string;
  startDate?: string; endDate?: string; targetEnrollment?: number;
  inclusionCriteria?: any; exclusionCriteria?: any;
  irbApprovalNumber?: string; irbApprovalDate?: string;
}) {
  return db.clinicalTrial.create({
    data: {
      tenantId: data.tenantId, trialCode: data.trialCode, title: data.title,
      description: data.description, principalInvestigator: data.principalInvestigator,
      sponsor: data.sponsor, phase: data.phase,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      targetEnrollment: data.targetEnrollment,
      inclusionCriteria: data.inclusionCriteria ? JSON.stringify(data.inclusionCriteria) : null,
      exclusionCriteria: data.exclusionCriteria ? JSON.stringify(data.exclusionCriteria) : null,
      irbApprovalNumber: data.irbApprovalNumber,
      irbApprovalDate: data.irbApprovalDate ? new Date(data.irbApprovalDate) : null,
    },
  });
}

export async function getTrials(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  return db.clinicalTrial.findMany({
    where, include: { _count: { select: { participants: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrialById(id: string) {
  return db.clinicalTrial.findUnique({
    where: { id },
    include: { participants: true },
  });
}

export async function updateTrial(id: string, data: any) {
  return db.clinicalTrial.update({ where: { id }, data });
}

// ── Trial Participants ──
export async function enrollParticipant(data: {
  trialId: string; patientId: string; arm?: string; consentSigned?: boolean;
}) {
  const participant = await db.trialParticipant.create({
    data: {
      trialId: data.trialId, patientId: data.patientId,
      arm: data.arm, consentSigned: data.consentSigned || false,
      consentDate: data.consentSigned ? new Date() : null,
    },
  });
  await db.clinicalTrial.update({
    where: { id: data.trialId },
    data: { currentEnrollment: { increment: 1 } },
  });
  return participant;
}

export async function updateParticipant(id: string, data: {
  status?: string; arm?: string; consentSigned?: boolean;
  withdrawalReason?: string; adverseEvents?: any; notes?: string;
}) {
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.arm) updateData.arm = data.arm;
  if (data.consentSigned !== undefined) {
    updateData.consentSigned = data.consentSigned;
    if (data.consentSigned) updateData.consentDate = new Date();
  }
  if (data.status === 'WITHDRAWN') {
    updateData.withdrawalDate = new Date();
    updateData.withdrawalReason = data.withdrawalReason;
  }
  if (data.adverseEvents) updateData.adverseEvents = JSON.stringify(data.adverseEvents);
  if (data.notes) updateData.notes = data.notes;

  return db.trialParticipant.update({ where: { id }, data: updateData });
}

export async function getResearchDashboard(tenantId: string) {
  const [totalTrials, activeTrials, totalParticipants, byPhase, byStatus] = await Promise.all([
    db.clinicalTrial.count({ where: { tenantId } }),
    db.clinicalTrial.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.trialParticipant.count({ where: { trial: { tenantId } } }),
    db.clinicalTrial.groupBy({ by: ['phase'], where: { tenantId }, _count: true }),
    db.clinicalTrial.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
  ]);

  return {
    totalTrials, activeTrials, totalParticipants,
    byPhase: byPhase.map((p: any) => ({ phase: p.phase || 'N/A', count: p._count })),
    byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count })),
  };
}
