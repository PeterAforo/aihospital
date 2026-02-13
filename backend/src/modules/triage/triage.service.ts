import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { logger } from '../../common/utils/logger.js';
import {
  suggestTriageLevel,
  calculateBMI,
  calculatePulsePressure,
  calculateMAP,
  validateAllVitalSigns,
  TRIAGE_LEVELS,
  VitalSigns,
  TriageSuggestion,
} from '../../common/utils/vital-signs-validators.js';

// ==================== INTERFACES ====================

export interface CreateTriageInput {
  appointmentId: string;
  patientId: string;
  vitalSigns: {
    bpSystolic?: number;
    bpDiastolic?: number;
    temperature?: number;
    temperatureSite?: 'ORAL' | 'AXILLARY' | 'TYMPANIC' | 'RECTAL';
    pulseRate?: number;
    pulseRhythm?: 'REGULAR' | 'IRREGULAR';
    respiratoryRate?: number;
    respiratoryPattern?: 'REGULAR' | 'IRREGULAR' | 'LABORED';
    spo2?: number;
    weight?: number;
    height?: number;
    painScale?: number;
    painLocation?: string;
    painCharacter?: 'SHARP' | 'DULL' | 'BURNING' | 'THROBBING' | 'CRAMPING' | 'ACHING' | 'STABBING';
  };
  assessment: {
    chiefComplaint: string;
    symptomDuration?: string;
    symptomSeverity?: string;
    associatedSymptoms?: string[];
    clinicalNotes?: string;
  };
  triageLevel: number;
  overrideReason?: string;
}

export interface UpdateTriageInput {
  vitalSigns?: CreateTriageInput['vitalSigns'];
  assessment?: Partial<CreateTriageInput['assessment']>;
  triageLevel?: number;
  overrideReason?: string;
}

export interface TriageQueuePatient {
  appointmentId: string;
  queueNumber: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    photo?: string;
    age: number;
    gender: string;
    allergies: string[];
  };
  checkedInAt: string;
  waitTime: string;
  chiefComplaint?: string;
  isTriaged: boolean;
}

export interface TriageAnalytics {
  totalTriaged: number;
  averageTriageTime: string;
  triageLevelDistribution: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
  };
  criticalAlertsGenerated: number;
  nursePerformance: Array<{
    nurseId: string;
    nurseName: string;
    patientsTriaged: number;
    averageTime: string;
  }>;
}

// ==================== SERVICE CLASS ====================

export class TriageService {
  /**
   * Get patients awaiting triage (checked-in but not triaged)
   */
  async getTriageQueue(tenantId: string, date?: Date): Promise<{
    queue: TriageQueuePatient[];
    totalWaiting: number;
    averageTriageTime: string;
  }> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get appointments that are CHECKED_IN but don't have a triage record
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        status: 'CHECKED_IN',
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        triageRecord: null,
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            dateOfBirth: true,
            gender: true,
            allergies: {
              select: { allergen: true },
            },
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    const now = new Date();
    const queue: TriageQueuePatient[] = appointments.map((apt) => {
      const checkedInAt = apt.checkedInAt || apt.createdAt;
      const waitMinutes = Math.round((now.getTime() - checkedInAt.getTime()) / 60000);
      const age = Math.floor(
        (now.getTime() - new Date(apt.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      return {
        appointmentId: apt.id,
        queueNumber: apt.queueNumber || '',
        patient: {
          id: apt.patient.id,
          mrn: apt.patient.mrn,
          firstName: apt.patient.firstName,
          lastName: apt.patient.lastName,
          photo: apt.patient.photoUrl || undefined,
          age,
          gender: apt.patient.gender,
          allergies: apt.patient.allergies.map((a) => a.allergen),
        },
        checkedInAt: checkedInAt.toISOString(),
        waitTime: `${waitMinutes} minutes`,
        chiefComplaint: apt.chiefComplaint || undefined,
        isTriaged: false,
      };
    });

    // Calculate average triage time from today's completed triages
    const completedTriages = await prisma.triageRecord.findMany({
      where: {
        tenantId,
        triageDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        appointment: {
          select: { checkedInAt: true },
        },
      },
    });

    let avgTime = '4 minutes';
    if (completedTriages.length > 0) {
      const totalMinutes = completedTriages.reduce((sum, tr) => {
        const checkedIn = tr.appointment.checkedInAt;
        if (checkedIn) {
          return sum + (tr.createdAt.getTime() - checkedIn.getTime()) / 60000;
        }
        return sum;
      }, 0);
      avgTime = `${Math.round(totalMinutes / completedTriages.length)} minutes`;
    }

    return {
      queue,
      totalWaiting: queue.length,
      averageTriageTime: avgTime,
    };
  }

  /**
   * Create a new triage record
   */
  async createTriage(
    tenantId: string,
    nurseId: string,
    data: CreateTriageInput
  ): Promise<{
    triageRecord: any;
    suggestedTriageLevel: number;
    actualTriageLevel: number;
    queueUpdated: boolean;
    alertSent: boolean;
  }> {
    // Verify appointment exists and is in correct status
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: data.appointmentId,
        tenantId,
        patientId: data.patientId,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            mrn: true,
            phonePrimary: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status !== 'CHECKED_IN') {
      throw new AppError(
        'Appointment must be in CHECKED_IN status for triage',
        400,
        'INVALID_APPOINTMENT_STATUS'
      );
    }

    // Check if triage already exists
    const existingTriage = await prisma.triageRecord.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (existingTriage) {
      throw new AppError('Triage record already exists for this appointment', 409, 'TRIAGE_EXISTS');
    }

    // Calculate patient age
    const patientAge = Math.floor(
      (Date.now() - new Date(appointment.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    // Validate vital signs
    const vitalSignsForValidation: VitalSigns = {
      bpSystolic: data.vitalSigns.bpSystolic,
      bpDiastolic: data.vitalSigns.bpDiastolic,
      temperature: data.vitalSigns.temperature,
      temperatureSite: data.vitalSigns.temperatureSite?.toLowerCase() as any,
      pulseRate: data.vitalSigns.pulseRate,
      respiratoryRate: data.vitalSigns.respiratoryRate,
      spo2: data.vitalSigns.spo2,
      weight: data.vitalSigns.weight,
      height: data.vitalSigns.height,
      painScale: data.vitalSigns.painScale,
    };

    const validation = validateAllVitalSigns(vitalSignsForValidation, patientAge);
    if (!validation.isValid) {
      throw new AppError(`Invalid vital signs: ${validation.errors.join(', ')}`, 400, 'INVALID_VITAL_SIGNS');
    }

    // Get suggested triage level
    const suggestion = suggestTriageLevel(
      vitalSignsForValidation,
      data.assessment.chiefComplaint,
      patientAge
    );

    // Calculate BMI if weight and height provided
    let bmi: number | null = null;
    if (data.vitalSigns.weight && data.vitalSigns.height) {
      const bmiResult = calculateBMI(data.vitalSigns.weight, data.vitalSigns.height);
      bmi = bmiResult?.bmi || null;
    }

    // Calculate pulse pressure and MAP
    let pulsePressure: number | null = null;
    let meanArterialPressure: number | null = null;
    if (data.vitalSigns.bpSystolic && data.vitalSigns.bpDiastolic) {
      pulsePressure = calculatePulsePressure(data.vitalSigns.bpSystolic, data.vitalSigns.bpDiastolic);
      meanArterialPressure = calculateMAP(data.vitalSigns.bpSystolic, data.vitalSigns.bpDiastolic);
    }

    // Get triage level info
    const triageLevelInfo = TRIAGE_LEVELS[data.triageLevel as keyof typeof TRIAGE_LEVELS];
    if (!triageLevelInfo) {
      throw new AppError('Invalid triage level (must be 1-5)', 400, 'INVALID_TRIAGE_LEVEL');
    }

    // Create triage record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create triage record
      const triageRecord = await tx.triageRecord.create({
        data: {
          tenantId,
          patientId: data.patientId,
          appointmentId: data.appointmentId,
          triagedBy: nurseId,
          triageTime: new Date().toTimeString().slice(0, 5),
          
          // Vital Signs
          bpSystolic: data.vitalSigns.bpSystolic,
          bpDiastolic: data.vitalSigns.bpDiastolic,
          temperature: data.vitalSigns.temperature,
          temperatureSite: data.vitalSigns.temperatureSite,
          pulseRate: data.vitalSigns.pulseRate,
          pulseRhythm: data.vitalSigns.pulseRhythm,
          respiratoryRate: data.vitalSigns.respiratoryRate,
          respiratoryPattern: data.vitalSigns.respiratoryPattern,
          spo2: data.vitalSigns.spo2,
          weight: data.vitalSigns.weight,
          height: data.vitalSigns.height,
          bmi,
          painScale: data.vitalSigns.painScale,
          painLocation: data.vitalSigns.painLocation,
          painCharacter: data.vitalSigns.painCharacter,
          
          // Assessment
          chiefComplaint: data.assessment.chiefComplaint,
          symptomDuration: data.assessment.symptomDuration,
          symptomSeverity: data.assessment.symptomSeverity,
          associatedSymptoms: data.assessment.associatedSymptoms || [],
          clinicalNotes: data.assessment.clinicalNotes,
          
          // Triage Classification
          triageLevel: data.triageLevel,
          triageLevelName: triageLevelInfo.name,
          triageLevelColor: triageLevelInfo.color,
          suggestedTriageLevel: suggestion.suggestedLevel,
          overrideReason: data.triageLevel !== suggestion.suggestedLevel ? data.overrideReason : null,
          
          // Calculated values
          pulsePressure,
          meanArterialPressure,
        },
        include: {
          patient: {
            select: {
              id: true,
              mrn: true,
              firstName: true,
              lastName: true,
            },
          },
          nurse: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // 2. Update appointment status to TRIAGED
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: {
          status: 'TRIAGED',
          triagedAt: new Date(),
          chiefComplaint: data.assessment.chiefComplaint,
        },
      });

      // 3. Update queue entry with triage level
      await tx.queueEntry.updateMany({
        where: { appointmentId: data.appointmentId },
        data: {
          triageLevel: data.triageLevel,
          // Adjust priority score based on triage level
          // Lower triage level = higher priority
          priorityScore: 100 - (data.triageLevel * 15),
        },
      });

      // 4. Create vital signs history record
      await tx.vitalSignsHistory.create({
        data: {
          tenantId,
          patientId: data.patientId,
          recordedBy: nurseId,
          source: 'triage',
          bpSystolic: data.vitalSigns.bpSystolic,
          bpDiastolic: data.vitalSigns.bpDiastolic,
          temperature: data.vitalSigns.temperature,
          temperatureSite: data.vitalSigns.temperatureSite,
          pulseRate: data.vitalSigns.pulseRate,
          pulseRhythm: data.vitalSigns.pulseRhythm,
          respiratoryRate: data.vitalSigns.respiratoryRate,
          spo2: data.vitalSigns.spo2,
          weight: data.vitalSigns.weight,
          height: data.vitalSigns.height,
          bmi,
          painScale: data.vitalSigns.painScale,
          triageRecordId: triageRecord.id,
        },
      });

      return triageRecord;
    });

    // Handle alerts for critical cases (outside transaction)
    let alertSent = false;
    if (data.triageLevel === 1) {
      try {
        await this.sendCriticalAlert(tenantId, result.id, appointment.doctor.id);
        alertSent = true;
      } catch (error) {
        logger.error('Failed to send critical triage alert:', error);
      }
    }

    return {
      triageRecord: result,
      suggestedTriageLevel: suggestion.suggestedLevel,
      actualTriageLevel: data.triageLevel,
      queueUpdated: true,
      alertSent,
    };
  }

  /**
   * Get a triage record by ID
   */
  async getTriageById(tenantId: string, triageId: string) {
    const triage = await prisma.triageRecord.findFirst({
      where: { id: triageId, tenantId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            photoUrl: true,
            allergies: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentTime: true,
            queueNumber: true,
            status: true,
          },
        },
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        alerts: true,
      },
    });

    if (!triage) {
      throw new AppError('Triage record not found', 404, 'TRIAGE_NOT_FOUND');
    }

    return triage;
  }

  /**
   * Update a triage record (within 24 hours only)
   */
  async updateTriage(
    tenantId: string,
    triageId: string,
    nurseId: string,
    data: UpdateTriageInput
  ) {
    const existing = await this.getTriageById(tenantId, triageId);

    // Check if within 24 hours
    const hoursSinceCreation = (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new AppError('Triage records can only be updated within 24 hours', 400, 'UPDATE_WINDOW_EXPIRED');
    }

    // Build update data
    const updateData: any = {};

    if (data.vitalSigns) {
      Object.assign(updateData, {
        bpSystolic: data.vitalSigns.bpSystolic,
        bpDiastolic: data.vitalSigns.bpDiastolic,
        temperature: data.vitalSigns.temperature,
        temperatureSite: data.vitalSigns.temperatureSite,
        pulseRate: data.vitalSigns.pulseRate,
        pulseRhythm: data.vitalSigns.pulseRhythm,
        respiratoryRate: data.vitalSigns.respiratoryRate,
        respiratoryPattern: data.vitalSigns.respiratoryPattern,
        spo2: data.vitalSigns.spo2,
        weight: data.vitalSigns.weight,
        height: data.vitalSigns.height,
        painScale: data.vitalSigns.painScale,
        painLocation: data.vitalSigns.painLocation,
        painCharacter: data.vitalSigns.painCharacter,
      });

      // Recalculate BMI
      const weight = data.vitalSigns.weight ?? existing.weight;
      const height = data.vitalSigns.height ?? existing.height;
      if (weight && height) {
        const bmiResult = calculateBMI(weight, height);
        updateData.bmi = bmiResult?.bmi || null;
      }

      // Recalculate pulse pressure and MAP
      const systolic = data.vitalSigns.bpSystolic ?? existing.bpSystolic;
      const diastolic = data.vitalSigns.bpDiastolic ?? existing.bpDiastolic;
      if (systolic && diastolic) {
        updateData.pulsePressure = calculatePulsePressure(systolic, diastolic);
        updateData.meanArterialPressure = calculateMAP(systolic, diastolic);
      }
    }

    if (data.assessment) {
      if (data.assessment.chiefComplaint) updateData.chiefComplaint = data.assessment.chiefComplaint;
      if (data.assessment.symptomDuration) updateData.symptomDuration = data.assessment.symptomDuration;
      if (data.assessment.symptomSeverity) updateData.symptomSeverity = data.assessment.symptomSeverity;
      if (data.assessment.associatedSymptoms) updateData.associatedSymptoms = data.assessment.associatedSymptoms;
      if (data.assessment.clinicalNotes) updateData.clinicalNotes = data.assessment.clinicalNotes;
    }

    if (data.triageLevel) {
      const triageLevelInfo = TRIAGE_LEVELS[data.triageLevel as keyof typeof TRIAGE_LEVELS];
      if (!triageLevelInfo) {
        throw new AppError('Invalid triage level', 400, 'INVALID_TRIAGE_LEVEL');
      }
      updateData.triageLevel = data.triageLevel;
      updateData.triageLevelName = triageLevelInfo.name;
      updateData.triageLevelColor = triageLevelInfo.color;
      if (data.overrideReason) {
        updateData.overrideReason = data.overrideReason;
      }
    }

    const updated = await prisma.triageRecord.update({
      where: { id: triageId },
      data: updateData,
      include: {
        patient: true,
        appointment: true,
        nurse: true,
      },
    });

    // Update queue if triage level changed
    if (data.triageLevel && data.triageLevel !== existing.triageLevel) {
      await prisma.queueEntry.updateMany({
        where: { appointmentId: existing.appointmentId },
        data: {
          triageLevel: data.triageLevel,
          priorityScore: 100 - (data.triageLevel * 15),
        },
      });
    }

    return updated;
  }

  /**
   * Get patient's triage history with vital signs trends
   */
  async getPatientTriageHistory(
    tenantId: string,
    patientId: string,
    options: { limit?: number; dateFrom?: Date; dateTo?: Date } = {}
  ) {
    const { limit = 10, dateFrom, dateTo } = options;

    const where: any = { tenantId, patientId };
    if (dateFrom || dateTo) {
      where.triageDate = {};
      if (dateFrom) where.triageDate.gte = dateFrom;
      if (dateTo) where.triageDate.lte = dateTo;
    }

    const triageRecords = await prisma.triageRecord.findMany({
      where,
      orderBy: { triageDate: 'desc' },
      take: limit,
      include: {
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            queueNumber: true,
          },
        },
        nurse: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get vital signs history for trending
    const vitalSignsHistory = await prisma.vitalSignsHistory.findMany({
      where: {
        tenantId,
        patientId,
        ...(dateFrom && { recordedAt: { gte: dateFrom } }),
        ...(dateTo && { recordedAt: { lte: dateTo } }),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit * 2,
    });

    // Format trend data
    const vitalSignsTrend = {
      bloodPressure: vitalSignsHistory
        .filter((v) => v.bpSystolic && v.bpDiastolic)
        .map((v) => ({
          date: v.recordedAt.toISOString(),
          systolic: v.bpSystolic,
          diastolic: v.bpDiastolic,
        })),
      temperature: vitalSignsHistory
        .filter((v) => v.temperature)
        .map((v) => ({
          date: v.recordedAt.toISOString(),
          value: v.temperature,
        })),
      weight: vitalSignsHistory
        .filter((v) => v.weight)
        .map((v) => ({
          date: v.recordedAt.toISOString(),
          value: v.weight,
        })),
      pulseRate: vitalSignsHistory
        .filter((v) => v.pulseRate)
        .map((v) => ({
          date: v.recordedAt.toISOString(),
          value: v.pulseRate,
        })),
      spo2: vitalSignsHistory
        .filter((v) => v.spo2)
        .map((v) => ({
          date: v.recordedAt.toISOString(),
          value: v.spo2,
        })),
    };

    return {
      triageRecords,
      vitalSignsTrend,
    };
  }

  /**
   * Get real-time triage level suggestion
   */
  async suggestTriageLevel(
    vitalSigns: VitalSigns,
    chiefComplaint?: string,
    patientAge?: number
  ): Promise<TriageSuggestion> {
    return suggestTriageLevel(vitalSigns, chiefComplaint, patientAge);
  }

  /**
   * Get triage analytics for date range
   */
  async getAnalytics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
    nurseId?: string
  ): Promise<TriageAnalytics> {
    const where: any = {
      tenantId,
      triageDate: { gte: dateFrom, lte: dateTo },
    };
    if (nurseId) {
      where.triagedBy = nurseId;
    }

    // Get all triage records in range
    const triageRecords = await prisma.triageRecord.findMany({
      where,
      include: {
        appointment: {
          select: { checkedInAt: true },
        },
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate level distribution
    const distribution = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 };
    triageRecords.forEach((tr) => {
      switch (tr.triageLevel) {
        case 1: distribution.red++; break;
        case 2: distribution.orange++; break;
        case 3: distribution.yellow++; break;
        case 4: distribution.green++; break;
        case 5: distribution.blue++; break;
      }
    });

    // Calculate average triage time
    let totalMinutes = 0;
    let countWithTime = 0;
    triageRecords.forEach((tr) => {
      if (tr.appointment.checkedInAt) {
        totalMinutes += (tr.createdAt.getTime() - tr.appointment.checkedInAt.getTime()) / 60000;
        countWithTime++;
      }
    });
    const avgTime = countWithTime > 0 ? `${Math.round(totalMinutes / countWithTime)} minutes` : 'N/A';

    // Get critical alerts count
    const alertsCount = await prisma.triageAlert.count({
      where: {
        tenantId,
        sentAt: { gte: dateFrom, lte: dateTo },
      },
    });

    // Calculate nurse performance
    const nurseMap = new Map<string, { name: string; count: number; totalMinutes: number }>();
    triageRecords.forEach((tr) => {
      const nurseKey = tr.nurse.id;
      const existing = nurseMap.get(nurseKey) || {
        name: `${tr.nurse.firstName} ${tr.nurse.lastName}`,
        count: 0,
        totalMinutes: 0,
      };
      existing.count++;
      if (tr.appointment.checkedInAt) {
        existing.totalMinutes += (tr.createdAt.getTime() - tr.appointment.checkedInAt.getTime()) / 60000;
      }
      nurseMap.set(nurseKey, existing);
    });

    const nursePerformance = Array.from(nurseMap.entries()).map(([id, data]) => ({
      nurseId: id,
      nurseName: data.name,
      patientsTriaged: data.count,
      averageTime: data.count > 0 ? `${Math.round(data.totalMinutes / data.count)} minutes` : 'N/A',
    }));

    return {
      totalTriaged: triageRecords.length,
      averageTriageTime: avgTime,
      triageLevelDistribution: distribution,
      criticalAlertsGenerated: alertsCount,
      nursePerformance,
    };
  }

  /**
   * Send critical alert for Red triage
   */
  private async sendCriticalAlert(tenantId: string, triageId: string, doctorId: string): Promise<void> {
    const triage = await prisma.triageRecord.findUnique({
      where: { id: triageId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mrn: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!triage) return;

    const age = Math.floor(
      (Date.now() - new Date(triage.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    const alertMessage = `🚨 CRITICAL PATIENT ALERT

Patient: ${triage.patient.firstName} ${triage.patient.lastName} (${age}${triage.patient.gender === 'MALE' ? 'M' : 'F'})
MRN: ${triage.patient.mrn}
Triage: RED - IMMEDIATE

Chief Complaint: ${triage.chiefComplaint}

Vital Signs:
- BP: ${triage.bpSystolic}/${triage.bpDiastolic} mmHg
- HR: ${triage.pulseRate} bpm
- SpO2: ${triage.spo2}%
- Temp: ${triage.temperature}°C

Time: ${new Date().toLocaleTimeString()}

IMMEDIATE ATTENTION REQUIRED`;

    // Create alert record
    await prisma.triageAlert.create({
      data: {
        tenantId,
        triageRecordId: triageId,
        alertType: 'RED_TRIAGE',
        alertMessage,
        sentTo: [doctorId],
      },
    });

    // TODO: Integrate with SMS service to send actual alert
    logger.info(`Critical triage alert created for triage ${triageId}`);
  }
}

export const triageService = new TriageService();
