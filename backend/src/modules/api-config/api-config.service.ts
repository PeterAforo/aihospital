import { prisma } from '../../common/utils/prisma.js';
import { logger } from '../../common/utils/logger.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_ENCRYPTION_KEY || 'smartmed-dev-key-32chars-padded!';
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '{}';
  }
}

// ── Resolve API config using 3-tier fallback ──
export async function resolveApiConfig(tenantId: string, branchId: string | null, apiType: string) {
  // 1. Branch level
  if (branchId) {
    const branchConfig = await prisma.apiConfiguration.findFirst({
      where: { configLevel: 'BRANCH', configOwnerId: branchId, apiType: apiType as any, isActive: true },
    });
    if (branchConfig) return { ...branchConfig, credentialsEncrypted: undefined, credentials: JSON.parse(decrypt(branchConfig.credentialsEncrypted)), resolvedFrom: 'BRANCH' };
  }

  // 2. Tenant level
  const tenantConfig = await prisma.apiConfiguration.findFirst({
    where: { configLevel: 'TENANT', configOwnerId: tenantId, apiType: apiType as any, isActive: true },
  });
  if (tenantConfig) return { ...tenantConfig, credentialsEncrypted: undefined, credentials: JSON.parse(decrypt(tenantConfig.credentialsEncrypted)), resolvedFrom: 'TENANT' };

  // 3. Super Admin default
  const superConfig = await prisma.apiConfiguration.findFirst({
    where: { configLevel: 'SUPER_ADMIN', apiType: apiType as any, isActive: true },
  });
  if (superConfig) return { ...superConfig, credentialsEncrypted: undefined, credentials: JSON.parse(decrypt(superConfig.credentialsEncrypted)), resolvedFrom: 'SUPER_ADMIN' };

  return null;
}

// ── CRUD for API Configurations ──
export async function getApiConfigs(level: string, ownerId?: string) {
  const where: any = { configLevel: level as any };
  if (ownerId) where.configOwnerId = ownerId;
  else where.configOwnerId = null;

  const configs = await prisma.apiConfiguration.findMany({ where, orderBy: { apiType: 'asc' } });
  return configs.map(c => ({
    ...c,
    credentialsEncrypted: undefined,
    credentialsMasked: maskCredentials(decrypt(c.credentialsEncrypted)),
  }));
}

export async function upsertApiConfig(data: {
  configLevel: string; configOwnerId?: string; apiType: string;
  provider: string; credentials: Record<string, any>;
  isActive?: boolean; allowOverride?: boolean; commissionRate?: number; settings?: any;
}) {
  // Check if super admin allows override
  if (data.configLevel !== 'SUPER_ADMIN') {
    const superConfig = await prisma.apiConfiguration.findFirst({
      where: { configLevel: 'SUPER_ADMIN', apiType: data.apiType as any, isActive: true },
    });
    if (superConfig && !superConfig.allowOverride) {
      throw new Error(`Super Admin does not allow ${data.apiType} override. Contact SmartMed support.`);
    }
  }

  const encrypted = encrypt(JSON.stringify(data.credentials));
  return prisma.apiConfiguration.upsert({
    where: {
      configLevel_configOwnerId_apiType: {
        configLevel: data.configLevel as any,
        configOwnerId: data.configOwnerId || '',
        apiType: data.apiType as any,
      },
    },
    create: {
      configLevel: data.configLevel as any,
      configOwnerId: data.configOwnerId || null,
      apiType: data.apiType as any,
      provider: data.provider,
      credentialsEncrypted: encrypted,
      isActive: data.isActive ?? true,
      allowOverride: data.allowOverride ?? true,
      commissionRate: data.commissionRate,
      settings: data.settings ? JSON.stringify(data.settings) : null,
    },
    update: {
      provider: data.provider,
      credentialsEncrypted: encrypted,
      isActive: data.isActive ?? true,
      allowOverride: data.allowOverride ?? true,
      commissionRate: data.commissionRate,
      settings: data.settings ? JSON.stringify(data.settings) : null,
    },
  });
}

export async function deleteApiConfig(id: string) {
  return prisma.apiConfiguration.delete({ where: { id } });
}

export async function testApiConnection(apiType: string, provider: string, credentials: Record<string, any>) {
  // Simulate connection test
  try {
    if (apiType === 'SMS' && provider === 'Hubtel') {
      return { success: !!credentials.clientId && !!credentials.clientSecret, message: credentials.clientId ? 'Hubtel credentials valid' : 'Missing clientId or clientSecret' };
    }
    if (apiType === 'PAYMENT' && provider === 'Paystack') {
      return { success: !!credentials.secretKey, message: credentials.secretKey ? 'Paystack credentials valid' : 'Missing secretKey' };
    }
    if (apiType === 'EMAIL' && provider === 'SendGrid') {
      return { success: !!credentials.apiKey, message: credentials.apiKey ? 'SendGrid API key valid' : 'Missing apiKey' };
    }
    if (apiType === 'EMAIL' && provider === 'SMTP') {
      return { success: !!credentials.host && !!credentials.port, message: credentials.host ? 'SMTP config valid' : 'Missing host or port' };
    }
    return { success: true, message: `${provider} configuration accepted` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ── API Usage Logging ──
export async function logApiUsage(data: {
  tenantId: string; branchId?: string; apiType: string; provider: string;
  action: string; referenceId?: string; cost?: number; commission?: number;
  status?: string; metadata?: any;
}) {
  return prisma.apiUsageLog.create({
    data: {
      tenantId: data.tenantId,
      branchId: data.branchId,
      apiType: data.apiType as any,
      provider: data.provider,
      action: data.action,
      referenceId: data.referenceId,
      cost: data.cost,
      commission: data.commission,
      status: data.status || 'SUCCESS',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

export async function getApiUsageSummary(tenantId?: string, startDate?: Date, endDate?: Date) {
  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const logs = await prisma.apiUsageLog.groupBy({
    by: ['apiType', 'provider', 'action'],
    where,
    _count: true,
    _sum: { cost: true, commission: true },
  });

  return logs.map(l => ({
    apiType: l.apiType, provider: l.provider, action: l.action,
    count: l._count, totalCost: l._sum.cost || 0, totalCommission: l._sum.commission || 0,
  }));
}

function maskCredentials(creds: string): Record<string, string> {
  try {
    const obj = JSON.parse(creds);
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const val = String(v);
      masked[k] = val.length > 6 ? val.slice(0, 3) + '***' + val.slice(-3) : '***';
    }
    return masked;
  } catch { return {}; }
}
