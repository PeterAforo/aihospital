import { prisma } from '../../common/utils/prisma.js';

const db = prisma as any;

// ── Community Health Workers ──
export async function createWorker(data: {
  tenantId: string; firstName: string; lastName: string; phone: string;
  email?: string; userId?: string; region?: string; district?: string;
  community?: string; certifications?: string[];
}) {
  return db.communityHealthWorker.create({
    data: {
      tenantId: data.tenantId, firstName: data.firstName, lastName: data.lastName,
      phone: data.phone, email: data.email, userId: data.userId,
      region: data.region, district: data.district, community: data.community,
      certifications: data.certifications ? JSON.stringify(data.certifications) : null,
    },
  });
}

export async function getWorkers(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  return db.communityHealthWorker.findMany({ where, orderBy: { lastName: 'asc' } });
}

export async function updateWorker(id: string, data: any) {
  return db.communityHealthWorker.update({ where: { id }, data });
}

// ── Community Visits ──
export async function createVisit(data: {
  tenantId: string; workerId: string; patientId?: string; householdId?: string;
  visitType: string; gpsLocation?: string; findings?: any;
  referralNeeded?: boolean; referralReason?: string; referralFacility?: string;
  followUpDate?: string; notes?: string;
}) {
  return db.communityVisit.create({
    data: {
      tenantId: data.tenantId, workerId: data.workerId, patientId: data.patientId,
      householdId: data.householdId, visitType: data.visitType,
      gpsLocation: data.gpsLocation,
      findings: data.findings ? JSON.stringify(data.findings) : null,
      referralNeeded: data.referralNeeded || false,
      referralReason: data.referralReason, referralFacility: data.referralFacility,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes,
    },
  });
}

export async function getVisits(tenantId: string, filters?: {
  workerId?: string; visitType?: string; startDate?: string; endDate?: string;
}) {
  const where: any = { tenantId };
  if (filters?.workerId) where.workerId = filters.workerId;
  if (filters?.visitType) where.visitType = filters.visitType;
  if (filters?.startDate || filters?.endDate) {
    where.visitDate = {};
    if (filters.startDate) where.visitDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.visitDate.lte = new Date(filters.endDate);
  }
  return db.communityVisit.findMany({
    where, include: { worker: { select: { firstName: true, lastName: true } } },
    orderBy: { visitDate: 'desc' }, take: 200,
  });
}

// ── Households ──
export async function createHousehold(data: {
  tenantId: string; headOfHousehold?: string; address?: string;
  community?: string; district?: string; region?: string;
  memberCount?: number; hasPregnantWoman?: boolean; hasChildUnder5?: boolean;
  hasElderly?: boolean; hasChronicIllness?: boolean;
  waterSource?: string; toiletType?: string; notes?: string;
}) {
  let riskLevel = 'LOW';
  const riskFactors = [data.hasPregnantWoman, data.hasChildUnder5, data.hasElderly, data.hasChronicIllness].filter(Boolean).length;
  if (riskFactors >= 3) riskLevel = 'HIGH';
  else if (riskFactors >= 1) riskLevel = 'MEDIUM';

  return db.household.create({ data: { ...data, riskLevel } });
}

export async function getHouseholds(tenantId: string, riskLevel?: string) {
  const where: any = { tenantId };
  if (riskLevel) where.riskLevel = riskLevel;
  return db.household.findMany({ where, orderBy: { riskLevel: 'desc' }, take: 200 });
}

export async function updateHousehold(id: string, data: any) {
  return db.household.update({ where: { id }, data });
}

// ── Dashboard ──
export async function getCommunityDashboard(tenantId: string) {
  const [workers, visits30d, households, referrals, visitsByType] = await Promise.all([
    db.communityHealthWorker.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.communityVisit.count({ where: { tenantId, visitDate: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    db.household.count({ where: { tenantId } }),
    db.communityVisit.count({ where: { tenantId, referralNeeded: true, visitDate: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    db.communityVisit.groupBy({
      by: ['visitType'], where: { tenantId, visitDate: { gte: new Date(Date.now() - 30 * 86400000) } }, _count: true,
    }),
  ]);

  return {
    activeWorkers: workers, visits30d, totalHouseholds: households, referrals30d: referrals,
    visitsByType: visitsByType.map((v: any) => ({ type: v.visitType, count: v._count })),
  };
}
