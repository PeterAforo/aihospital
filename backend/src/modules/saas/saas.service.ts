import { prisma } from '../../common/utils/prisma.js';

const db = prisma as any;

// ── SaaS Plans ──
export async function getPlans() {
  return db.saasPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
}

export async function createPlan(data: {
  name: string; displayName: string; price: number; currency?: string;
  billingCycle?: string; maxUsers?: number; maxBranches?: number;
  maxPatients?: number; storageGB?: number; smsPerMonth?: number;
  features: string[]; sortOrder?: number;
}) {
  return db.saasPlan.create({
    data: {
      name: data.name, displayName: data.displayName, price: data.price,
      currency: data.currency || 'GHS', billingCycle: data.billingCycle || 'MONTHLY',
      maxUsers: data.maxUsers, maxBranches: data.maxBranches,
      maxPatients: data.maxPatients, storageGB: data.storageGB,
      smsPerMonth: data.smsPerMonth, features: JSON.stringify(data.features),
      sortOrder: data.sortOrder || 0,
    },
  });
}

export async function updatePlan(id: string, data: any) {
  if (data.features && Array.isArray(data.features)) {
    data.features = JSON.stringify(data.features);
  }
  return db.saasPlan.update({ where: { id }, data });
}

// ── Subscriptions ──
export async function createSubscription(tenantId: string, planId: string, opts?: {
  trialDays?: number; paymentMethod?: string; paymentReference?: string;
}) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const trialEndsAt = opts?.trialDays
    ? new Date(now.getTime() + opts.trialDays * 86400000)
    : null;

  return db.saasSubscription.create({
    data: {
      tenantId, planId, status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
      currentPeriodStart: now, currentPeriodEnd: periodEnd,
      trialEndsAt, paymentMethod: opts?.paymentMethod,
      paymentReference: opts?.paymentReference,
    },
  });
}

export async function getSubscription(tenantId: string) {
  return db.saasSubscription.findFirst({
    where: { tenantId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelSubscription(tenantId: string) {
  const sub = await getSubscription(tenantId);
  if (!sub) return null;
  return db.saasSubscription.update({
    where: { id: sub.id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), autoRenew: false },
  });
}

export async function renewSubscription(tenantId: string) {
  const sub = await getSubscription(tenantId);
  if (!sub) return null;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return db.saasSubscription.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd },
  });
}

export async function changePlan(tenantId: string, newPlanId: string) {
  const sub = await getSubscription(tenantId);
  if (!sub) return null;
  return db.saasSubscription.update({
    where: { id: sub.id },
    data: { planId: newPlanId },
    include: { plan: true },
  });
}

// ── Usage Metering ──
export async function recordUsage(tenantId: string, metricType: string, increment: number = 1) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return db.usageMeter.upsert({
    where: { tenantId_metricType_periodStart: { tenantId, metricType, periodStart } },
    create: { tenantId, metricType, periodStart, periodEnd, currentValue: increment },
    update: { currentValue: { increment } },
  });
}

export async function getUsage(tenantId: string, metricType?: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: any = { tenantId, periodStart };
  if (metricType) where.metricType = metricType;

  return db.usageMeter.findMany({ where, orderBy: { metricType: 'asc' } });
}

export async function checkResourceLimit(tenantId: string, metricType: string): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const sub = await getSubscription(tenantId);
  if (!sub) return { allowed: false, current: 0, limit: 0 };

  const plan = sub.plan;
  let limit: number | null = null;

  switch (metricType) {
    case 'users': limit = plan.maxUsers; break;
    case 'branches': limit = plan.maxBranches; break;
    case 'patients': limit = plan.maxPatients; break;
    case 'storage_gb': limit = plan.storageGB; break;
    case 'sms': limit = plan.smsPerMonth; break;
    default: limit = null;
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usage = await db.usageMeter.findUnique({
    where: { tenantId_metricType_periodStart: { tenantId, metricType, periodStart } },
  });

  const current = usage?.currentValue || 0;
  return { allowed: limit === null || current < limit, current, limit };
}

// ── Tenant Provisioning ──
export async function provisionTenant(data: {
  name: string; subdomain: string; email: string; phone: string;
  planName?: string; adminName: string; adminEmail: string;
  trialDays?: number;
}) {
  // Find plan
  const plan = await db.saasPlan.findFirst({
    where: { name: data.planName || 'Starter', isActive: true },
  });

  // Create tenant
  const tenant = await db.tenant.create({
    data: {
      name: data.name, subdomain: data.subdomain, email: data.email,
      phone: data.phone, subscriptionPlan: data.planName === 'Enterprise' ? 'ENTERPRISE' : data.planName === 'Professional' ? 'PROFESSIONAL' : 'STARTER',
    },
  });

  // Create subscription if plan exists
  if (plan) {
    await createSubscription(tenant.id, plan.id, { trialDays: data.trialDays || 14 });
  }

  // Initialize usage meters
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const metrics = ['users', 'patients', 'sms', 'storage_gb', 'api_calls'];

  for (const metric of metrics) {
    let limitValue: number | null = null;
    if (plan) {
      switch (metric) {
        case 'users': limitValue = plan.maxUsers; break;
        case 'patients': limitValue = plan.maxPatients; break;
        case 'sms': limitValue = plan.smsPerMonth; break;
        case 'storage_gb': limitValue = plan.storageGB; break;
        default: limitValue = null;
      }
    }
    await db.usageMeter.create({
      data: { tenantId: tenant.id, metricType: metric, periodStart, periodEnd, limitValue },
    });
  }

  return { tenant, subscriptionCreated: !!plan };
}

// ── SaaS Dashboard (Super Admin) ──
export async function getSaasDashboard() {
  const [totalTenants, activeSubs, plans, revenueByPlan, expiringSoon] = await Promise.all([
    db.tenant.count(),
    db.saasSubscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] } } }),
    db.saasPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.saasSubscription.groupBy({
      by: ['planId'], where: { status: 'ACTIVE' }, _count: true,
    }),
    db.saasSubscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lte: new Date(Date.now() + 7 * 86400000) },
      },
      include: { tenant: { select: { name: true, subdomain: true } }, plan: { select: { displayName: true } } },
      take: 10,
    }),
  ]);

  return {
    totalTenants, activeSubscriptions: activeSubs, plans,
    subscriptionsByPlan: revenueByPlan.map((r: any) => ({ planId: r.planId, count: r._count })),
    expiringSoon,
  };
}
