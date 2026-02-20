import { prisma } from '../../common/utils/prisma.js';
import { logger } from '../../common/utils/logger.js';
import crypto from 'crypto';

// ── Teleconsult Sessions ──
export async function createSession(data: {
  tenantId: string; branchId: string; patientId: string; doctorId: string;
  sessionType?: string; scheduledAt: string; appointmentId?: string;
  recordingConsent?: boolean; notes?: string;
}) {
  const roomId = `room_${crypto.randomUUID().slice(0, 8)}`;
  const roomUrl = `/telemedicine/join/${roomId}`;

  return prisma.teleconsultSession.create({
    data: {
      tenantId: data.tenantId,
      branchId: data.branchId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      sessionType: data.sessionType || 'VIDEO',
      scheduledAt: new Date(data.scheduledAt),
      appointmentId: data.appointmentId,
      recordingConsent: data.recordingConsent || false,
      notes: data.notes,
      roomId,
      roomUrl,
      status: 'SCHEDULED',
    },
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } }, doctor: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function getSessions(tenantId: string, filters?: { doctorId?: string; patientId?: string; status?: string; date?: string }) {
  const where: any = { tenantId };
  if (filters?.doctorId) where.doctorId = filters.doctorId;
  if (filters?.patientId) where.patientId = filters.patientId;
  if (filters?.status) where.status = filters.status;
  if (filters?.date) {
    const d = new Date(filters.date);
    where.scheduledAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
  }

  return prisma.teleconsultSession.findMany({
    where,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phonePrimary: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
}

export async function getSessionById(id: string) {
  return prisma.teleconsultSession.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phonePrimary: true, dateOfBirth: true, gender: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function startSession(id: string) {
  return prisma.teleconsultSession.update({
    where: { id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
}

export async function joinWaitingRoom(id: string) {
  return prisma.teleconsultSession.update({
    where: { id },
    data: { status: 'WAITING' },
  });
}

export async function endSession(id: string, data: { notes?: string; diagnosis?: string; followUpDate?: string; billingAmount?: number }) {
  const session = await prisma.teleconsultSession.findUnique({ where: { id } });
  const duration = session?.startedAt ? Math.round((Date.now() - session.startedAt.getTime()) / 60000) : null;

  return prisma.teleconsultSession.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      duration,
      notes: data.notes,
      diagnosis: data.diagnosis,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      billingAmount: data.billingAmount,
    },
  });
}

export async function cancelSession(id: string, reason: string) {
  return prisma.teleconsultSession.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason: reason },
  });
}

// ── Remote Monitoring ──
export async function submitReading(data: {
  tenantId: string; patientId: string; readingType: string;
  value: number; value2?: number; unit: string; notes?: string;
}) {
  // Determine if abnormal
  let isAbnormal = false;
  if (data.readingType === 'BP' && (data.value > 140 || data.value < 90 || (data.value2 && (data.value2 > 90 || data.value2 < 60)))) isAbnormal = true;
  if (data.readingType === 'GLUCOSE' && (data.value > 11.1 || data.value < 3.5)) isAbnormal = true;
  if (data.readingType === 'SPO2' && data.value < 93) isAbnormal = true;
  if (data.readingType === 'HEART_RATE' && (data.value > 120 || data.value < 50)) isAbnormal = true;
  if (data.readingType === 'TEMPERATURE' && (data.value > 38.5 || data.value < 35)) isAbnormal = true;

  return prisma.remoteMonitoringReading.create({
    data: {
      tenantId: data.tenantId,
      patientId: data.patientId,
      readingType: data.readingType,
      value: data.value,
      value2: data.value2,
      unit: data.unit,
      notes: data.notes,
      isAbnormal,
      alertSent: isAbnormal,
    },
  });
}

export async function getReadings(tenantId: string, patientId: string, readingType?: string, limit = 50) {
  const where: any = { tenantId, patientId };
  if (readingType) where.readingType = readingType;

  return prisma.remoteMonitoringReading.findMany({
    where,
    orderBy: { readingDate: 'desc' },
    take: limit,
  });
}

export async function getAbnormalReadings(tenantId: string, reviewed = false) {
  return prisma.remoteMonitoringReading.findMany({
    where: { tenantId, isAbnormal: true, reviewedBy: reviewed ? { not: null } : null },
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
    orderBy: { readingDate: 'desc' },
    take: 50,
  });
}

export async function reviewReading(id: string, reviewedBy: string) {
  return prisma.remoteMonitoringReading.update({
    where: { id },
    data: { reviewedBy, reviewedAt: new Date() },
  });
}

// ── E-Consultations ──
export async function createEConsultation(data: {
  tenantId: string; patientId: string; subject: string; symptoms: string;
  patientMessage: string; priority?: string; attachments?: string[];
}) {
  return prisma.eConsultation.create({
    data: {
      tenantId: data.tenantId,
      patientId: data.patientId,
      subject: data.subject,
      symptoms: data.symptoms,
      patientMessage: data.patientMessage,
      priority: data.priority || 'NORMAL',
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    },
  });
}

export async function getEConsultations(tenantId: string, filters?: { status?: string; doctorId?: string; patientId?: string }) {
  const where: any = { tenantId };
  if (filters?.status) where.status = filters.status;
  if (filters?.doctorId) where.doctorId = filters.doctorId;
  if (filters?.patientId) where.patientId = filters.patientId;

  return prisma.eConsultation.findMany({
    where,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function respondToEConsultation(id: string, doctorId: string, response: string, billingAmount?: number) {
  return prisma.eConsultation.update({
    where: { id },
    data: { doctorId, doctorResponse: response, respondedAt: new Date(), status: 'RESPONDED', billingAmount },
  });
}
