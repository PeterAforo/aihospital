import { prisma } from '../utils/prisma.js';
import { smsService } from './sms.service.js';
import { logger } from '../utils/logger.js';

export interface CriticalAlertData {
  triageId: string;
  patientName: string;
  patientMRN: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  vitalSigns: {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulseRate?: number;
    spo2?: number;
    temperature?: number;
  };
  triageLevel: number;
  triageLevelName: string;
}

class TriageAlertService {
  /**
   * Send critical alert for Red triage (Level 1)
   */
  async sendCriticalAlert(
    tenantId: string,
    triageId: string,
    doctorId: string,
    alertData: CriticalAlertData
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
      // Get doctor's phone number
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });

      if (!doctor) {
        logger.warn(`Doctor ${doctorId} not found for critical alert`);
        return { success: false, error: 'Doctor not found' };
      }

      // Format alert message
      const alertMessage = this.formatCriticalAlertMessage(alertData);

      // Create alert record
      const alert = await (prisma as any).triageAlert.create({
        data: {
          tenantId,
          triageRecordId: triageId,
          alertType: 'RED_TRIAGE',
          alertMessage,
          sentTo: [doctorId],
        },
      });

      // Send SMS to doctor
      if (doctor.phone) {
        const smsResult = await smsService.sendSMS({
          to: doctor.phone,
          message: this.formatSMSAlert(alertData),
        });

        if (!smsResult.success) {
          logger.error(`Failed to send SMS alert to doctor ${doctorId}: ${smsResult.error}`);
        }
      }

      logger.info(`Critical triage alert sent for triage ${triageId} to doctor ${doctorId}`);

      return { success: true, alertId: alert.id };
    } catch (error: any) {
      logger.error(`Failed to send critical alert: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, doctorId: string): Promise<void> {
    await (prisma as any).triageAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedBy: doctorId,
        acknowledgedAt: new Date(),
      },
    });

    logger.info(`Alert ${alertId} acknowledged by doctor ${doctorId}`);
  }

  /**
   * Get unacknowledged alerts for a doctor
   */
  async getUnacknowledgedAlerts(doctorId: string): Promise<any[]> {
    const alerts = await (prisma as any).triageAlert.findMany({
      where: {
        sentTo: { has: doctorId },
        acknowledgedAt: null,
      },
      include: {
        triageRecord: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return alerts;
  }

  /**
   * Get alerts for a specific triage record
   */
  async getAlertsByTriageId(triageId: string): Promise<any[]> {
    const alerts = await (prisma as any).triageAlert.findMany({
      where: { triageRecordId: triageId },
      orderBy: { sentAt: 'desc' },
    });

    return alerts;
  }

  /**
   * Format full alert message for database storage
   */
  private formatCriticalAlertMessage(data: CriticalAlertData): string {
    const vitalSigns = [];
    if (data.vitalSigns.bpSystolic && data.vitalSigns.bpDiastolic) {
      vitalSigns.push(`BP: ${data.vitalSigns.bpSystolic}/${data.vitalSigns.bpDiastolic} mmHg`);
    }
    if (data.vitalSigns.pulseRate) {
      vitalSigns.push(`HR: ${data.vitalSigns.pulseRate} bpm`);
    }
    if (data.vitalSigns.spo2) {
      vitalSigns.push(`SpO2: ${data.vitalSigns.spo2}%`);
    }
    if (data.vitalSigns.temperature) {
      vitalSigns.push(`Temp: ${data.vitalSigns.temperature}°C`);
    }

    return `🚨 CRITICAL PATIENT ALERT

Patient: ${data.patientName} (${data.patientAge}${data.patientGender === 'MALE' ? 'M' : 'F'})
MRN: ${data.patientMRN}
Triage: ${data.triageLevelName}

Chief Complaint: ${data.chiefComplaint}

Vital Signs:
${vitalSigns.map(v => `- ${v}`).join('\n')}

Time: ${new Date().toLocaleTimeString()}

IMMEDIATE ATTENTION REQUIRED`;
  }

  /**
   * Format SMS alert (shorter version)
   */
  private formatSMSAlert(data: CriticalAlertData): string {
    const criticalVitals = [];
    if (data.vitalSigns.spo2 && data.vitalSigns.spo2 < 90) {
      criticalVitals.push(`SpO2:${data.vitalSigns.spo2}%`);
    }
    if (data.vitalSigns.bpSystolic && (data.vitalSigns.bpSystolic < 90 || data.vitalSigns.bpSystolic > 180)) {
      criticalVitals.push(`BP:${data.vitalSigns.bpSystolic}/${data.vitalSigns.bpDiastolic}`);
    }

    const vitalsStr = criticalVitals.length > 0 ? ` [${criticalVitals.join(', ')}]` : '';

    return `🚨 RED TRIAGE: ${data.patientName} (${data.patientMRN}) - ${data.chiefComplaint}${vitalsStr}. IMMEDIATE attention required. - MediCare Ghana`;
  }

  /**
   * Send deterioration alert (when vitals worsen)
   */
  async sendDeteriorationAlert(
    tenantId: string,
    triageId: string,
    doctorId: string,
    message: string
  ): Promise<{ success: boolean; alertId?: string }> {
    try {
      const alert = await (prisma as any).triageAlert.create({
        data: {
          tenantId,
          triageRecordId: triageId,
          alertType: 'DETERIORATING',
          alertMessage: message,
          sentTo: [doctorId],
        },
      });

      logger.info(`Deterioration alert sent for triage ${triageId}`);

      return { success: true, alertId: alert.id };
    } catch (error: any) {
      logger.error(`Failed to send deterioration alert: ${error.message}`);
      return { success: false };
    }
  }
}

export const triageAlertService = new TriageAlertService();
