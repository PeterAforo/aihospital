import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

const db = prisma as any;

/**
 * Auto-Billing Service
 * Handles recurring invoice generation, overdue payment reminders,
 * and SaaS subscription billing
 */
export class AutoBillingService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    logger.info('Starting auto-billing service...');

    // Run daily at midnight equivalent (every 24 hours)
    this.intervalId = setInterval(async () => {
      await this.runDailyBilling();
    }, 24 * 60 * 60 * 1000);

    // Run immediately on start
    setTimeout(() => this.runDailyBilling(), 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Auto-billing service stopped');
    }
  }

  async runDailyBilling() {
    try {
      logger.info('[AUTO-BILLING] Starting daily billing run...');
      const results = await Promise.allSettled([
        this.generateRecurringInvoices(),
        this.markOverdueInvoices(),
        this.processSaasSubscriptionBilling(),
      ]);

      for (const [idx, result] of results.entries()) {
        const labels = ['RecurringInvoices', 'OverdueInvoices', 'SaasBilling'];
        if (result.status === 'fulfilled') {
          logger.info(`[AUTO-BILLING] ${labels[idx]}: ${JSON.stringify(result.value)}`);
        } else {
          logger.error(`[AUTO-BILLING] ${labels[idx]} failed:`, result.reason);
        }
      }
    } catch (error) {
      logger.error('[AUTO-BILLING] Daily billing run failed:', error);
    }
  }

  /**
   * Generate recurring invoices for patients with active treatment plans
   * (e.g., dialysis, physiotherapy, chronic disease management)
   */
  async generateRecurringInvoices(): Promise<{ generated: number; skipped: number }> {
    let generated = 0;
    let skipped = 0;

    try {
      // Find active admissions that need daily billing
      const activeAdmissions = await db.admission.findMany({
        where: {
          status: 'ADMITTED',
          dischargeDate: null,
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          ward: { select: { id: true, name: true, dailyRate: true } },
        },
        take: 500,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const admission of activeAdmissions) {
        // Check if invoice already generated today
        const existingInvoice = await db.invoice.findFirst({
          where: {
            patientId: admission.patientId,
            admissionId: admission.id,
            invoiceDate: { gte: today },
          },
        });

        if (existingInvoice) {
          skipped++;
          continue;
        }

        const dailyRate = admission.ward?.dailyRate || 0;
        if (dailyRate <= 0) {
          skipped++;
          continue;
        }

        // Generate daily ward charge invoice
        try {
          await db.invoice.create({
            data: {
              tenantId: admission.tenantId,
              patientId: admission.patientId,
              admissionId: admission.id,
              invoiceNumber: `INV-AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              invoiceDate: new Date(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
              subtotal: dailyRate,
              taxAmount: 0,
              discountAmount: 0,
              totalAmount: dailyRate,
              status: 'PENDING',
              notes: `Auto-generated daily ward charge - ${admission.ward?.name || 'Ward'}`,
              items: {
                create: [{
                  description: `Daily Ward Charge - ${admission.ward?.name || 'Ward'}`,
                  quantity: 1,
                  unitPrice: dailyRate,
                  totalPrice: dailyRate,
                }],
              },
            },
          });
          generated++;
        } catch (e: any) {
          logger.error(`[AUTO-BILLING] Failed to generate invoice for admission ${admission.id}:`, e.message);
        }
      }
    } catch (error) {
      logger.error('[AUTO-BILLING] Recurring invoice generation error:', error);
    }

    return { generated, skipped };
  }

  /**
   * Mark invoices as overdue if past due date
   */
  async markOverdueInvoices(): Promise<{ marked: number }> {
    let marked = 0;

    try {
      const result = await db.invoice.updateMany({
        where: {
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
        data: {
          status: 'OVERDUE',
        },
      });
      marked = result.count || 0;
    } catch (error) {
      logger.error('[AUTO-BILLING] Mark overdue error:', error);
    }

    return { marked };
  }

  /**
   * Process SaaS subscription billing for tenants
   */
  async processSaasSubscriptionBilling(): Promise<{ billed: number; expired: number }> {
    let billed = 0;
    let expired = 0;

    try {
      const now = new Date();

      // Find subscriptions that need renewal
      const dueSubscriptions = await db.saasSubscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lte: now },
        },
        include: {
          plan: true,
          tenant: { select: { id: true, name: true, email: true } },
        },
      });

      for (const sub of dueSubscriptions) {
        if (sub.cancelAtPeriodEnd) {
          // Cancel the subscription
          await db.saasSubscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED' },
          });
          expired++;
          continue;
        }

        // Extend the subscription period
        const newPeriodEnd = new Date(sub.currentPeriodEnd);
        if (sub.plan?.billingCycle === 'YEARLY') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        }

        await db.saasSubscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: sub.currentPeriodEnd,
            currentPeriodEnd: newPeriodEnd,
          },
        });

        // Log usage meter
        try {
          await db.usageMeter.create({
            data: {
              tenantId: sub.tenantId,
              subscriptionId: sub.id,
              metricName: 'subscription_renewal',
              quantity: 1,
              unitCost: sub.plan?.price || 0,
              totalCost: sub.plan?.price || 0,
              periodStart: sub.currentPeriodEnd,
              periodEnd: newPeriodEnd,
            },
          });
        } catch { /* usage meter may not exist */ }

        billed++;
      }

      // Expire trial subscriptions
      const expiredTrials = await db.saasSubscription.updateMany({
        where: {
          status: 'TRIALING',
          trialEnd: { lte: now },
        },
        data: { status: 'PAST_DUE' },
      });
      expired += expiredTrials.count || 0;

    } catch (error) {
      logger.error('[AUTO-BILLING] SaaS billing error:', error);
    }

    return { billed, expired };
  }
}

export const autoBillingService = new AutoBillingService();
