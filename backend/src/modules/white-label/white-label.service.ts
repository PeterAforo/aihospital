import { prisma } from '../../common/utils/prisma.js';
import crypto from 'crypto';

const db = prisma as any;

// ── White Label Config ──
export async function getWhiteLabelConfig(tenantId: string) {
  return db.whiteLabelConfig.findUnique({ where: { tenantId } });
}

export async function upsertWhiteLabelConfig(tenantId: string, data: {
  brandName: string; logoUrl?: string; faviconUrl?: string;
  primaryColor?: string; secondaryColor?: string; accentColor?: string;
  customDomain?: string; customCss?: string; emailFromName?: string;
  emailFromAddress?: string; smsFromName?: string; footerText?: string;
  supportEmail?: string; supportPhone?: string;
}) {
  return db.whiteLabelConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
}

// ── Reseller Accounts ──
export async function createReseller(data: {
  name: string; contactName: string; email: string; phone?: string;
  companyName?: string; website?: string; commissionRate?: number;
  tier?: string; maxTenants?: number; notes?: string;
}) {
  const apiKey = 'rsm_' + crypto.randomBytes(24).toString('hex');
  return db.resellerAccount.create({
    data: { ...data, commissionRate: data.commissionRate || 0.30, apiKey },
  });
}

export async function getResellers(status?: string) {
  const where: any = {};
  if (status) where.status = status;
  return db.resellerAccount.findMany({
    where, include: { tenants: true }, orderBy: { createdAt: 'desc' },
  });
}

export async function getResellerById(id: string) {
  return db.resellerAccount.findUnique({
    where: { id },
    include: { tenants: true },
  });
}

export async function updateReseller(id: string, data: any) {
  return db.resellerAccount.update({ where: { id }, data });
}

// ── Reseller Tenants ──
export async function assignTenantToReseller(resellerId: string, tenantId: string) {
  const result = await db.resellerTenant.create({
    data: { resellerId, tenantId },
  });
  await db.resellerAccount.update({
    where: { id: resellerId },
    data: { tenantCount: { increment: 1 } },
  });
  return result;
}

export async function getResellerDashboard(resellerId: string) {
  const reseller = await db.resellerAccount.findUnique({
    where: { id: resellerId },
    include: { tenants: true },
  });
  if (!reseller) return null;

  return {
    reseller: { ...reseller, apiKey: reseller.apiKey ? '***' + reseller.apiKey.slice(-6) : null },
    tenantCount: reseller.tenants.length,
    totalRevenue: reseller.totalRevenue,
    totalCommission: reseller.totalCommission,
    pendingCommission: reseller.totalRevenue * reseller.commissionRate - reseller.totalCommission,
  };
}
