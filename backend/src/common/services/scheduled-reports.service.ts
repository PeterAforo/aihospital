import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { smsService } from './sms.service.js';

const db = prisma as any;

/**
 * Scheduled Reports Service
 * Generates and delivers reports on a schedule (daily, weekly, monthly)
 */
export class ScheduledReportsService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    logger.info('Starting scheduled reports service...');

    // Run every 6 hours to check for due reports
    this.intervalId = setInterval(async () => {
      await this.processScheduledReports();
    }, 6 * 60 * 60 * 1000);

    // Run once on start (delayed 30s to let DB connect)
    setTimeout(() => this.processScheduledReports(), 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Scheduled reports service stopped');
    }
  }

  async processScheduledReports() {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Daily reports run at 6 AM
      if (hour >= 5 && hour <= 7) {
        await this.generateDailyReports();
      }

      // Weekly reports run on Monday
      if (now.getDay() === 1 && hour >= 5 && hour <= 7) {
        await this.generateWeeklyReports();
      }

      // Monthly reports run on 1st of month
      if (now.getDate() === 1 && hour >= 5 && hour <= 7) {
        await this.generateMonthlyReports();
      }
    } catch (error) {
      logger.error('[SCHEDULED-REPORTS] Processing error:', error);
    }
  }

  /**
   * Generate daily operational summary for each tenant
   */
  async generateDailyReports() {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      for (const tenant of tenants) {
        try {
          const [appointments, encounters, invoiceStats] = await Promise.all([
            db.appointment.count({
              where: { tenantId: tenant.id, appointmentDate: { gte: yesterday, lte: yesterdayEnd } },
            }),
            db.encounter.count({
              where: { tenantId: tenant.id, encounterDate: { gte: yesterday, lte: yesterdayEnd } },
            }),
            db.invoice.aggregate({
              where: { tenantId: tenant.id, invoiceDate: { gte: yesterday, lte: yesterdayEnd } },
              _sum: { totalAmount: true },
              _count: true,
            }),
          ]);

          const report = {
            tenantId: tenant.id,
            reportType: 'DAILY_SUMMARY',
            reportDate: yesterday,
            data: {
              totalAppointments: appointments,
              totalEncounters: encounters,
              totalInvoices: invoiceStats._count || 0,
              totalRevenue: invoiceStats._sum?.totalAmount || 0,
            },
            generatedAt: new Date(),
          };

          // Store report
          try {
            await db.scheduledReport.create({ data: report });
          } catch {
            // Model may not exist yet - log instead
            logger.info(`[SCHEDULED-REPORTS] Daily report for ${tenant.name}: ${JSON.stringify(report.data)}`);
          }
        } catch (e: any) {
          logger.error(`[SCHEDULED-REPORTS] Daily report failed for tenant ${tenant.id}:`, e.message);
        }
      }

      logger.info(`[SCHEDULED-REPORTS] Daily reports generated for ${tenants.length} tenants`);
    } catch (error) {
      logger.error('[SCHEDULED-REPORTS] Daily reports error:', error);
    }
  }

  /**
   * Generate weekly performance summary
   */
  async generateWeeklyReports() {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const now = new Date();

      for (const tenant of tenants) {
        try {
          const [appointments, noShows, revenue] = await Promise.all([
            db.appointment.count({
              where: { tenantId: tenant.id, appointmentDate: { gte: weekAgo, lte: now } },
            }),
            db.appointment.count({
              where: { tenantId: tenant.id, appointmentDate: { gte: weekAgo, lte: now }, status: 'NO_SHOW' },
            }),
            db.invoice.aggregate({
              where: { tenantId: tenant.id, invoiceDate: { gte: weekAgo, lte: now } },
              _sum: { totalAmount: true },
            }),
          ]);

          logger.info(`[SCHEDULED-REPORTS] Weekly for ${tenant.name}: ${appointments} appts, ${noShows} no-shows, GHS ${revenue._sum?.totalAmount || 0}`);
        } catch (e: any) {
          logger.error(`[SCHEDULED-REPORTS] Weekly report failed for ${tenant.id}:`, e.message);
        }
      }
    } catch (error) {
      logger.error('[SCHEDULED-REPORTS] Weekly reports error:', error);
    }
  }

  /**
   * Generate monthly financial and clinical summary
   */
  async generateMonthlyReports() {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

      for (const tenant of tenants) {
        try {
          const [totalRevenue, totalPatients, nhisClaimsCount] = await Promise.all([
            db.invoice.aggregate({
              where: { tenantId: tenant.id, invoiceDate: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { totalAmount: true },
            }),
            db.patient.count({
              where: { tenantId: tenant.id, createdAt: { gte: startOfMonth, lte: endOfMonth } },
            }),
            db.nhisClaim.count({
              where: { tenantId: tenant.id, createdAt: { gte: startOfMonth, lte: endOfMonth } },
            }).catch(() => 0),
          ]);

          logger.info(`[SCHEDULED-REPORTS] Monthly for ${tenant.name}: GHS ${totalRevenue._sum?.totalAmount || 0} revenue, ${totalPatients} new patients, ${nhisClaimsCount} NHIS claims`);
        } catch (e: any) {
          logger.error(`[SCHEDULED-REPORTS] Monthly report failed for ${tenant.id}:`, e.message);
        }
      }
    } catch (error) {
      logger.error('[SCHEDULED-REPORTS] Monthly reports error:', error);
    }
  }
}

export const scheduledReportsService = new ScheduledReportsService();
