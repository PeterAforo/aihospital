import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

const db = prisma as any;

/**
 * SaaS Grace Period Enforcement Service
 * - 3-day grace period after subscription expires
 * - Account suspension after grace period
 * - Reactivation on payment
 */
export class GracePeriodService {
  private intervalId: NodeJS.Timeout | null = null;
  private static GRACE_PERIOD_DAYS = 3;

  start() {
    logger.info('Starting grace period enforcement service...');

    // Run every 4 hours
    this.intervalId = setInterval(async () => {
      await this.enforce();
    }, 4 * 60 * 60 * 1000);

    // Run once on start (delayed 15s)
    setTimeout(() => this.enforce(), 15000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Grace period service stopped');
    }
  }

  async enforce() {
    try {
      await this.markPastDueSubscriptions();
      await this.suspendExpiredGracePeriods();
      logger.info('[GRACE-PERIOD] Enforcement cycle complete');
    } catch (error) {
      logger.error('[GRACE-PERIOD] Enforcement error:', error);
    }
  }

  /**
   * Mark active subscriptions as PAST_DUE when period ends
   */
  private async markPastDueSubscriptions() {
    try {
      const now = new Date();

      const result = await db.saasSubscription.updateMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lt: now },
          cancelAtPeriodEnd: false,
        },
        data: {
          status: 'PAST_DUE',
        },
      });

      if (result.count > 0) {
        logger.info(`[GRACE-PERIOD] Marked ${result.count} subscriptions as PAST_DUE`);
      }
    } catch (error) {
      logger.error('[GRACE-PERIOD] Mark past due error:', error);
    }
  }

  /**
   * Suspend tenants whose grace period has expired
   */
  private async suspendExpiredGracePeriods() {
    try {
      const gracePeriodCutoff = new Date();
      gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - GracePeriodService.GRACE_PERIOD_DAYS);

      // Find PAST_DUE subscriptions older than grace period
      const expiredSubs = await db.saasSubscription.findMany({
        where: {
          status: 'PAST_DUE',
          currentPeriodEnd: { lt: gracePeriodCutoff },
        },
        include: {
          tenant: { select: { id: true, name: true, isActive: true } },
        },
      });

      for (const sub of expiredSubs) {
        try {
          // Suspend the subscription
          await db.saasSubscription.update({
            where: { id: sub.id },
            data: { status: 'SUSPENDED' },
          });

          // Deactivate the tenant
          if (sub.tenant?.isActive) {
            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { isActive: false },
            });

            logger.warn(`[GRACE-PERIOD] Suspended tenant "${sub.tenant.name}" (${sub.tenantId}) - grace period expired`);
          }
        } catch (e: any) {
          logger.error(`[GRACE-PERIOD] Failed to suspend ${sub.tenantId}:`, e.message);
        }
      }

      if (expiredSubs.length > 0) {
        logger.info(`[GRACE-PERIOD] Suspended ${expiredSubs.length} tenants after grace period`);
      }
    } catch (error) {
      logger.error('[GRACE-PERIOD] Suspend expired error:', error);
    }
  }

  /**
   * Reactivate a tenant after payment is received
   */
  async reactivateTenant(tenantId: string, subscriptionId: string): Promise<boolean> {
    try {
      const sub = await db.saasSubscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      });

      if (!sub) {
        logger.error(`[GRACE-PERIOD] Subscription ${subscriptionId} not found`);
        return false;
      }

      // Calculate new billing period
      const now = new Date();
      const newPeriodEnd = new Date(now);
      if (sub.plan?.billingCycle === 'YEARLY') {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      // Reactivate subscription
      await db.saasSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      // Reactivate tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });

      logger.info(`[GRACE-PERIOD] Reactivated tenant ${tenantId}, subscription ${subscriptionId}`);
      return true;
    } catch (error: any) {
      logger.error(`[GRACE-PERIOD] Reactivation failed for ${tenantId}:`, error.message);
      return false;
    }
  }

  /**
   * Get grace period status for a tenant
   */
  async getGracePeriodStatus(tenantId: string) {
    try {
      const sub = await db.saasSubscription.findFirst({
        where: { tenantId, status: { in: ['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'TRIALING'] } },
        include: { plan: { select: { name: true, price: true, billingCycle: true } } },
        orderBy: { createdAt: 'desc' },
      });

      if (!sub) {
        return { status: 'NO_SUBSCRIPTION', gracePeriodDays: 0, daysRemaining: 0 };
      }

      const now = new Date();
      const periodEnd = new Date(sub.currentPeriodEnd);
      const gracePeriodEnd = new Date(periodEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GracePeriodService.GRACE_PERIOD_DAYS);

      const daysRemaining = sub.status === 'PAST_DUE'
        ? Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : GracePeriodService.GRACE_PERIOD_DAYS;

      return {
        status: sub.status,
        plan: sub.plan?.name || 'Unknown',
        periodEnd: sub.currentPeriodEnd,
        gracePeriodDays: GracePeriodService.GRACE_PERIOD_DAYS,
        daysRemaining,
        isSuspended: sub.status === 'SUSPENDED',
        isPastDue: sub.status === 'PAST_DUE',
      };
    } catch (error: any) {
      logger.error(`[GRACE-PERIOD] Status check failed for ${tenantId}:`, error.message);
      return { status: 'ERROR', error: error.message };
    }
  }
}

export const gracePeriodService = new GracePeriodService();
