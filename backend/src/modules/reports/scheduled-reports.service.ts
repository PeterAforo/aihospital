import { PrismaClient } from '@prisma/client';
import { analyticsService } from './analytics.service.js';

const prisma = new PrismaClient();

export interface ScheduledReportConfig {
  id?: string;
  tenantId: string;
  name: string;
  reportType: 'EXECUTIVE' | 'REVENUE' | 'CLINICAL' | 'PHARMACY' | 'LAB' | 'APPOINTMENTS';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipients: string[];
  isActive: boolean;
  dayOfWeek?: number;
  dayOfMonth?: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

class ScheduledReportsService {
  // ==================== REPORT DATA FLATTENING ====================

  async getReportData(tenantId: string, reportType: string, startDate?: Date, endDate?: Date): Promise<{
    title: string;
    summary: Record<string, any>;
    rows: Record<string, any>[];
    columns: { key: string; label: string }[];
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    const period = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

    switch (reportType) {
      case 'EXECUTIVE': {
        const data = await analyticsService.getExecutiveSummary(tenantId, start, end);
        return {
          title: `Executive Summary (${period})`,
          summary: {
            'Total Patients': data.totalPatients,
            'New Patients': data.newPatients,
            'Revenue (GHS)': data.revenue,
            'Outstanding (GHS)': data.outstandingAmount,
            'Active Admissions': data.activeAdmissions,
          },
          rows: [{
            Metric: 'Total Patients', Value: data.totalPatients, 'Growth %': data.patientGrowth,
          }, {
            Metric: 'Appointments', Value: data.totalAppointments, 'Growth %': data.appointmentGrowth,
          }, {
            Metric: 'Consultations', Value: data.totalEncounters, 'Growth %': data.encounterGrowth,
          }, {
            Metric: 'Revenue (GHS)', Value: data.revenue, 'Growth %': data.revenueGrowth,
          }, {
            Metric: 'Outstanding (GHS)', Value: data.outstandingAmount, 'Growth %': 0,
          }],
          columns: [
            { key: 'Metric', label: 'Metric' },
            { key: 'Value', label: 'Value' },
            { key: 'Growth %', label: 'Growth %' },
          ],
        };
      }

      case 'REVENUE': {
        const data = await analyticsService.getRevenueAnalytics(tenantId, start, end);
        return {
          title: `Revenue Analytics (${period})`,
          summary: { 'NHIS Revenue': data.nhisVsCash.nhis, 'Cash Revenue': data.nhisVsCash.cash },
          rows: data.byCategory.map(c => ({ Category: c.category, 'Amount (GHS)': c.amount })),
          columns: [{ key: 'Category', label: 'Category' }, { key: 'Amount (GHS)', label: 'Amount (GHS)' }],
        };
      }

      case 'CLINICAL': {
        const data = await analyticsService.getClinicalAnalytics(tenantId, start, end);
        return {
          title: `Clinical Analytics (${period})`,
          summary: {},
          rows: data.topDiagnoses.map(d => ({ 'ICD Code': d.icdCode, Description: d.description, Count: d.count })),
          columns: [{ key: 'ICD Code', label: 'ICD Code' }, { key: 'Description', label: 'Description' }, { key: 'Count', label: 'Count' }],
        };
      }

      case 'PHARMACY': {
        const data = await analyticsService.getPharmacyAnalytics(tenantId, start, end);
        return {
          title: `Pharmacy Analytics (${period})`,
          summary: {
            'Total Dispensed': data.totalDispensed,
            'Pending Rx': data.pendingPrescriptions,
            'Low Stock': data.lowStockCount,
            'Expiring (90d)': data.expiringCount,
          },
          rows: data.topMedications.map(m => ({ Medication: m.name, 'Dispense Count': m.count, 'Total Qty': m.quantity })),
          columns: [{ key: 'Medication', label: 'Medication' }, { key: 'Dispense Count', label: 'Dispense Count' }, { key: 'Total Qty', label: 'Total Qty' }],
        };
      }

      case 'LAB': {
        const data = await analyticsService.getLabAnalytics(tenantId, start, end);
        return {
          title: `Laboratory Analytics (${period})`,
          summary: {
            'Total Orders': data.totalOrders,
            'Completed': data.completedOrders,
            'Pending': data.pendingOrders,
            'Completion Rate': `${data.completionRate}%`,
          },
          rows: data.topTests.map(t => ({ Test: t.name, Count: t.count })),
          columns: [{ key: 'Test', label: 'Test' }, { key: 'Count', label: 'Count' }],
        };
      }

      case 'APPOINTMENTS': {
        const data = await analyticsService.getAppointmentAnalytics(tenantId, start, end);
        return {
          title: `Appointment Analytics (${period})`,
          summary: {
            'Total': data.total,
            'Completed': data.completed,
            'No-Show Rate': `${data.noShowRate}%`,
            'Cancellation Rate': `${data.cancellationRate}%`,
          },
          rows: data.byStatus.map(s => ({ Status: s.status, Count: s.count })),
          columns: [{ key: 'Status', label: 'Status' }, { key: 'Count', label: 'Count' }],
        };
      }

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  // ==================== CSV EXPORT ====================

  generateCSV(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && (val.includes(',') || val.includes('"'))
          ? `"${String(val).replace(/"/g, '""')}"`
          : String(val);
      }).join(',')),
    ];
    return lines.join('\n');
  }

  // ==================== HTML REPORT (for PDF printing) ====================

  generateHTMLReport(title: string, summary: Record<string, any>, rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
    const summaryHtml = Object.keys(summary).length > 0
      ? `<div class="summary">${Object.entries(summary).map(([k, v]) => `<div class="summary-item"><span class="label">${k}</span><span class="value">${v}</span></div>`).join('')}</div>`
      : '';

    const tableHtml = rows.length > 0
      ? `<table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p>No data available for the selected period.</p>';

    return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1a1a1a; }
  h1 { font-size: 22px; color: #059669; margin-bottom: 4px; }
  h2 { font-size: 13px; color: #6b7280; margin-bottom: 20px; font-weight: 400; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .summary-item { background: #f0fdf4; border-radius: 8px; padding: 12px 20px; min-width: 140px; }
  .summary-item .label { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-item .value { display: block; font-size: 20px; font-weight: 700; color: #059669; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 30px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @media print { body { margin: 15px; } .summary-item { border: 1px solid #e5e7eb; } }
</style></head><body>
  <h1>${title}</h1>
  <h2>MediCare Ghana Hospital Management System</h2>
  ${summaryHtml}
  ${tableHtml}
  <div class="footer">Generated on ${new Date().toLocaleString()} | Confidential - For authorized personnel only</div>
</body></html>`;
  }

  // ==================== SCHEDULED REPORT MANAGEMENT ====================

  calculateNextRun(frequency: string, dayOfWeek?: number, dayOfMonth?: number): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY': {
        const next = new Date(now);
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0);
        return next;
      }
      case 'WEEKLY': {
        const next = new Date(now);
        const targetDay = dayOfWeek ?? 1; // Monday
        const daysUntil = ((targetDay - now.getDay()) + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        next.setHours(6, 0, 0, 0);
        return next;
      }
      case 'MONTHLY': {
        const next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth ?? 1, 6, 0, 0);
        return next;
      }
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

export const scheduledReportsService = new ScheduledReportsService();
