import { prisma } from '../../common/utils/prisma.js';
import crypto from 'crypto';

const db = prisma as any;

// ── Patient Segments ──
export async function getSegments(tenantId: string) {
  return db.patientSegment.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
}

export async function upsertSegment(data: {
  tenantId: string; name: string; description?: string; criteria: any; isSystem?: boolean;
}) {
  return db.patientSegment.upsert({
    where: { tenantId_name: { tenantId: data.tenantId, name: data.name } },
    create: {
      tenantId: data.tenantId, name: data.name, description: data.description,
      criteria: JSON.stringify(data.criteria), isSystem: data.isSystem || false,
    },
    update: { description: data.description, criteria: JSON.stringify(data.criteria) },
  });
}

export async function recalculateSegments(tenantId: string) {
  const segments = await db.patientSegment.findMany({ where: { tenantId } });
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
  const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  for (const seg of segments) {
    let count = 0;
    try {
      const criteria = JSON.parse(seg.criteria);
      if (criteria.type === 'new') {
        count = await db.patient.count({ where: { tenantId, createdAt: { gte: ninetyDaysAgo }, isActive: true } });
      } else if (criteria.type === 'active') {
        count = await db.patient.count({ where: { tenantId, isActive: true, encounters: { some: { encounterDate: { gte: sixMonthsAgo } } } } });
      } else if (criteria.type === 'at_risk') {
        count = await db.patient.count({
          where: { tenantId, isActive: true,
            encounters: { some: { encounterDate: { gte: twelveMonthsAgo, lt: sixMonthsAgo } } },
            NOT: { encounters: { some: { encounterDate: { gte: sixMonthsAgo } } } },
          },
        });
      } else if (criteria.type === 'inactive') {
        count = await db.patient.count({
          where: { tenantId, isActive: true, NOT: { encounters: { some: { encounterDate: { gte: twelveMonthsAgo } } } } },
        });
      } else {
        count = await db.patient.count({ where: { tenantId, isActive: true } });
      }
    } catch { count = 0; }

    await db.patientSegment.update({
      where: { id: seg.id },
      data: { patientCount: count, lastCalculated: new Date() },
    });
  }

  return db.patientSegment.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
}

// ── Marketing Campaigns ──
export async function createCampaign(data: {
  tenantId: string; name: string; campaignType: string; channel: string;
  targetSegment?: string; messageTemplate: string; subject?: string;
  scheduledAt?: string; createdBy: string;
}) {
  return db.marketingCampaign.create({
    data: {
      tenantId: data.tenantId, name: data.name, campaignType: data.campaignType,
      channel: data.channel, targetSegment: data.targetSegment,
      messageTemplate: data.messageTemplate, subject: data.subject,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT', createdBy: data.createdBy,
    },
  });
}

export async function getCampaigns(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  return db.marketingCampaign.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function updateCampaignStatus(id: string, status: string) {
  const data: any = { status };
  if (status === 'SENT') data.sentAt = new Date();
  return db.marketingCampaign.update({ where: { id }, data });
}

export async function updateCampaignMetrics(id: string, metrics: {
  sentCount?: number; deliveredCount?: number; openedCount?: number;
  clickedCount?: number; convertedCount?: number;
}) {
  return db.marketingCampaign.update({ where: { id }, data: metrics });
}

// ── Patient Feedback ──
export async function submitFeedback(data: {
  tenantId: string; patientId: string; encounterId?: string; doctorId?: string;
  feedbackType?: string; rating?: number; npsScore?: number; comment?: string;
  categories?: string[];
}) {
  // Simple sentiment analysis
  let sentiment = 'NEUTRAL';
  if (data.rating) {
    sentiment = data.rating >= 4 ? 'POSITIVE' : data.rating <= 2 ? 'NEGATIVE' : 'NEUTRAL';
  } else if (data.comment) {
    const lower = data.comment.toLowerCase();
    const posWords = ['great', 'excellent', 'good', 'wonderful', 'thank', 'happy', 'satisfied', 'amazing'];
    const negWords = ['bad', 'terrible', 'poor', 'worst', 'horrible', 'rude', 'slow', 'dirty', 'complaint'];
    const posCount = posWords.filter(w => lower.includes(w)).length;
    const negCount = negWords.filter(w => lower.includes(w)).length;
    sentiment = posCount > negCount ? 'POSITIVE' : negCount > posCount ? 'NEGATIVE' : 'NEUTRAL';
  }

  return db.patientFeedback.create({
    data: {
      tenantId: data.tenantId, patientId: data.patientId, encounterId: data.encounterId,
      doctorId: data.doctorId, feedbackType: data.feedbackType || 'POST_VISIT',
      rating: data.rating, npsScore: data.npsScore, comment: data.comment,
      categories: data.categories ? JSON.stringify(data.categories) : null, sentiment,
    },
  });
}

export async function getFeedback(tenantId: string, filters?: {
  feedbackType?: string; status?: string; sentiment?: string;
}) {
  const where: any = { tenantId };
  if (filters?.feedbackType) where.feedbackType = filters.feedbackType;
  if (filters?.status) where.status = filters.status;
  if (filters?.sentiment) where.sentiment = filters.sentiment;

  return db.patientFeedback.findMany({
    where,
    include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
    orderBy: { createdAt: 'desc' }, take: 100,
  });
}

export async function resolveFeedback(id: string, resolvedBy: string, resolution: string) {
  return db.patientFeedback.update({
    where: { id },
    data: { status: 'RESOLVED', resolvedBy, resolvedAt: new Date(), resolution },
  });
}

export async function getFeedbackSummary(tenantId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const where = { tenantId, createdAt: { gte: thirtyDaysAgo } };

  const [total, bySentiment, avgRating, byType] = await Promise.all([
    db.patientFeedback.count({ where }),
    db.patientFeedback.groupBy({ by: ['sentiment'], where, _count: true }),
    db.patientFeedback.aggregate({ where, _avg: { rating: true, npsScore: true } }),
    db.patientFeedback.groupBy({ by: ['feedbackType'], where, _count: true }),
  ]);

  return {
    total, avgRating: avgRating._avg.rating, avgNPS: avgRating._avg.npsScore,
    bySentiment: bySentiment.map((s: any) => ({ sentiment: s.sentiment, count: s._count })),
    byType: byType.map((t: any) => ({ type: t.feedbackType, count: t._count })),
  };
}

// ── Loyalty Program ──
export async function enrollLoyalty(tenantId: string, patientId: string) {
  return db.loyaltyAccount.upsert({
    where: { patientId },
    create: { tenantId, patientId, tier: 'BRONZE', totalPoints: 100, availablePoints: 100 },
    update: {},
  });
}

export async function getLoyaltyAccount(patientId: string) {
  return db.loyaltyAccount.findUnique({
    where: { patientId },
    include: { patient: { select: { firstName: true, lastName: true, mrn: true } }, transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
}

export async function earnPoints(patientId: string, points: number, description: string, referenceId?: string) {
  const account = await db.loyaltyAccount.findUnique({ where: { patientId } });
  if (!account) return null;

  const newTotal = account.totalPoints + points;
  const newAvailable = account.availablePoints + points;
  let tier = account.tier;
  if (newTotal >= 10000) tier = 'PLATINUM';
  else if (newTotal >= 5000) tier = 'GOLD';
  else if (newTotal >= 2000) tier = 'SILVER';

  await db.loyaltyTransaction.create({
    data: { loyaltyAccountId: account.id, type: 'EARN', points, description, referenceId },
  });

  return db.loyaltyAccount.update({
    where: { patientId },
    data: { totalPoints: newTotal, availablePoints: newAvailable, tier, visitCount: { increment: 1 }, lastVisitDate: new Date() },
  });
}

export async function redeemPoints(patientId: string, points: number, description: string) {
  const account = await db.loyaltyAccount.findUnique({ where: { patientId } });
  if (!account || account.availablePoints < points) return null;

  await db.loyaltyTransaction.create({
    data: { loyaltyAccountId: account.id, type: 'REDEEM', points: -points, description },
  });

  return db.loyaltyAccount.update({
    where: { patientId },
    data: { availablePoints: { decrement: points } },
  });
}

// ── Referral Program ──
export async function createReferralCode(tenantId: string, referrerId: string) {
  const code = 'SM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  return db.patientReferral.create({
    data: { tenantId, referrerId, referralCode: code },
  });
}

export async function getReferrals(tenantId: string, referrerId?: string) {
  const where: any = { tenantId };
  if (referrerId) where.referrerId = referrerId;
  return db.patientReferral.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
}

export async function completeReferral(referralCode: string, referredId: string) {
  return db.patientReferral.update({
    where: { referralCode },
    data: { referredId, status: 'COMPLETED', completedAt: new Date() },
  });
}

// ── CRM Dashboard ──
export async function getCRMDashboard(tenantId: string) {
  const [totalPatients, activePatients, segments, feedbackSummary, topReferrers] = await Promise.all([
    db.patient.count({ where: { tenantId, isActive: true } }),
    db.patient.count({ where: { tenantId, isActive: true, encounters: { some: { encounterDate: { gte: new Date(Date.now() - 180 * 86400000) } } } } }),
    db.patientSegment.findMany({ where: { tenantId }, orderBy: { patientCount: 'desc' } }),
    getFeedbackSummary(tenantId),
    db.patientReferral.groupBy({ by: ['referrerId'], where: { tenantId, status: 'COMPLETED' }, _count: true, orderBy: { _count: { referrerId: 'desc' } }, take: 5 }),
  ]);

  return {
    totalPatients, activePatients,
    churnRate: totalPatients > 0 ? Math.round(((totalPatients - activePatients) / totalPatients) * 100) : 0,
    segments, feedbackSummary, topReferrers: topReferrers.map((r: any) => ({ referrerId: r.referrerId, count: r._count })),
  };
}
