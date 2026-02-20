import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';
import crypto from 'crypto';

const prisma = new PrismaClient();
const db = prisma as any;

// Webhook Management Service
// Handles incoming webhooks from payment/SMS providers
// Provides webhook registration, verification, logging, and retry

interface WebhookLog {
  id: string;
  provider: string;
  eventType: string;
  payload: string;
  status: string;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

/**
 * Verify Paystack webhook signature
 */
export function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  if (!secret) return false;
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
  return hash === signature;
}

/**
 * Verify Flutterwave webhook signature
 */
export function verifyFlutterwaveSignature(secretHash: string): boolean {
  const expectedHash = process.env.FLUTTERWAVE_SECRET_HASH || '';
  return secretHash === expectedHash;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(body: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;

  try {
    const elements = signature.split(',');
    const timestampStr = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const sig = elements.find(e => e.startsWith('v1='))?.split('=').slice(1).join('=');

    if (!timestampStr || !sig) return false;

    const payload = `${timestampStr}.${body}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Log a webhook event
 */
export async function logWebhook(data: {
  provider: string;
  eventType: string;
  payload: any;
  status: 'received' | 'processed' | 'failed' | 'ignored';
  error?: string;
  referenceId?: string;
  tenantId?: string;
}) {
  try {
    // Store in ApiUsageLog as webhook events
    await db.apiUsageLog.create({
      data: {
        tenantId: data.tenantId || 'system',
        apiType: 'PAYMENT',
        provider: data.provider,
        action: `webhook:${data.eventType}`,
        referenceId: data.referenceId,
        status: data.status.toUpperCase(),
        metadata: JSON.stringify({
          payload: typeof data.payload === 'string' ? data.payload.substring(0, 2000) : JSON.stringify(data.payload).substring(0, 2000),
          error: data.error,
        }),
      },
    });
  } catch (e: any) {
    logger.warn('Failed to log webhook:', e.message);
  }
}

/**
 * Get webhook logs for a tenant
 */
export async function getWebhookLogs(tenantId?: string, limit = 50) {
  const where: any = { action: { startsWith: 'webhook:' } };
  if (tenantId) where.tenantId = tenantId;

  return db.apiUsageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get webhook stats
 */
export async function getWebhookStats(tenantId?: string) {
  const where: any = { action: { startsWith: 'webhook:' } };
  if (tenantId) where.tenantId = tenantId;

  const total = await db.apiUsageLog.count({ where });
  const processed = await db.apiUsageLog.count({ where: { ...where, status: 'PROCESSED' } });
  const failed = await db.apiUsageLog.count({ where: { ...where, status: 'FAILED' } });

  return { total, processed, failed, successRate: total > 0 ? Math.round((processed / total) * 100) : 0 };
}
