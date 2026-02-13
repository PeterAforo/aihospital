import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { smsService } from '../../common/services/sms.service.js';
import { logger } from '../../common/utils/logger.js';

export type QueuePriority = 'EMERGENCY' | 'URGENT' | 'SENIOR_CITIZEN' | 'PREGNANT' | 'WITH_CHILD' | 'REGULAR' | 'LATE_ARRIVAL';

const PRIORITY_SCORES: Record<QueuePriority, number> = {
  EMERGENCY: 100,
  URGENT: 80,
  SENIOR_CITIZEN: 60,
  PREGNANT: 60,
  WITH_CHILD: 50,
  REGULAR: 0,
  LATE_ARRIVAL: -10,
};

// Triage level priority scores (lower level = higher priority)
const TRIAGE_LEVEL_SCORES: Record<number, number> = {
  1: 200, // Red - Immediate
  2: 150, // Orange - Very Urgent
  3: 100, // Yellow - Urgent
  4: 50,  // Green - Standard
  5: 25,  // Blue - Non-urgent
};

export interface AddWalkInRequest {
  tenantId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  priority?: QueuePriority;
  chiefComplaint?: string;
}

export interface AddWalkInResponse {
  queueNumber: string;
  queuePosition: number;
  estimatedWaitMinutes: number;
  appointmentId: string;
  smsSent: boolean;
}

export interface QueuePatient {
  id: string;
  queueNumber: string;
  queuePosition: number;
  patientId: string;
  patientName: string;
  patientPhoto?: string;
  priority: QueuePriority;
  priorityScore: number;
  estimatedWaitMinutes: number;
  checkedInAt: string;
  status: string;
}

export interface QueueResponse {
  doctorId: string;
  doctorName: string;
  date: string;
  currentPatient: {
    queueNumber: string;
    patientName: string;
    startedAt: string;
    roomNumber?: string;
  } | null;
  queue: QueuePatient[];
  totalInQueue: number;
  averageWaitTime: number;
}

export interface QueueDisplayResponse {
  hospital: {
    name: string;
    logo?: string;
  };
  doctor: {
    name: string;
    specialty?: string;
    roomNumber?: string;
  };
  currentTime: string;
  nowServing: {
    queueNumber: string;
    patientName: string;
    roomNumber?: string;
  } | null;
  queue: Array<{
    queueNumber: string;
    patientName: string;
    status: 'NEXT' | 'WAITING';
  }>;
}

export class WalkInQueueService {
  async addToQueue(data: AddWalkInRequest): Promise<AddWalkInResponse> {
    const { tenantId, branchId, patientId, doctorId, priority = 'REGULAR', chiefComplaint } = data;

    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Verify doctor exists
    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, tenantId, role: 'DOCTOR' },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    // Check if patient already in queue today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEntry = await prisma.queueEntry.findFirst({
      where: {
        patientId,
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: today, lt: tomorrow },
      },
    });

    if (existingEntry) {
      throw new AppError('Patient already in queue for this doctor today', 409, 'ALREADY_IN_QUEUE');
    }

    // Generate queue number
    const queueNumber = await this.generateQueueNumber(tenantId, branchId);

    // Calculate queue position
    const queuePosition = await this.calculateQueuePosition(doctorId, priority);

    // Calculate estimated wait time
    const estimatedWait = await this.calculateEstimatedWaitTime(doctorId, queuePosition);

    // Create appointment record for walk-in
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        branchId,
        patientId,
        doctorId,
        appointmentDate: new Date(),
        appointmentTime: new Date().toTimeString().slice(0, 5),
        duration: 30,
        status: 'CHECKED_IN',
        bookingChannel: 'WALKIN',
        isWalkIn: true,
        queueNumber,
        priority: PRIORITY_SCORES[priority],
        chiefComplaint,
        checkedInAt: new Date(),
      },
    });

    // Create queue entry
    await prisma.queueEntry.create({
      data: {
        tenantId,
        branchId,
        patientId,
        doctorId,
        appointmentId: appointment.id,
        queueNumber,
        queuePosition,
        priority,
        priorityScore: PRIORITY_SCORES[priority],
        estimatedWaitMinutes: estimatedWait,
        status: 'WAITING',
      },
    });

    // Send SMS notification
    let smsSent = false;
    const phone = patient.phonePrimary || patient.phoneSecondary;
    if (phone) {
      try {
        await smsService.sendQueueNotification(
          phone,
          `${patient.firstName} ${patient.lastName}`,
          parseInt(queueNumber.replace('W-', '')),
          estimatedWait,
        );
        smsSent = true;
      } catch (error) {
        logger.error('Failed to send queue SMS:', error);
      }
    }

    return {
      queueNumber,
      queuePosition,
      estimatedWaitMinutes: estimatedWait,
      appointmentId: appointment.id,
      smsSent,
    };
  }

  async getQueue(tenantId: string, doctorId: string): Promise<QueueResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { firstName: true, lastName: true },
    });

    // Get current patient (IN_PROGRESS)
    const currentAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        isWalkIn: true,
        status: 'IN_PROGRESS',
        appointmentDate: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    // Get waiting queue
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
      orderBy: [{ priorityScore: 'desc' }, { queuePosition: 'asc' }],
    });

    // Calculate average wait time
    const completedToday = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: 'COMPLETED',
        completedAt: { gte: today, lt: tomorrow },
      },
      select: { checkedInAt: true, completedAt: true },
    });

    let averageWaitTime = 25;
    if (completedToday.length > 0) {
      const totalWait = completedToday.reduce((sum: number, entry: { checkedInAt: Date; completedAt: Date | null }) => {
        if (entry.completedAt && entry.checkedInAt) {
          return sum + (entry.completedAt.getTime() - entry.checkedInAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      averageWaitTime = Math.round(totalWait / completedToday.length);
    }

    // Recalculate estimated wait times
    const queue: QueuePatient[] = queueEntries.map((entry: any, index: number) => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      queuePosition: index + 1,
      patientId: entry.patientId,
      patientName: `${entry.patient.firstName} ${entry.patient.lastName}`,
      patientPhoto: entry.patient.photoUrl || undefined,
      priority: entry.priority as QueuePriority,
      priorityScore: entry.priorityScore,
      estimatedWaitMinutes: (index + 1) * averageWaitTime,
      checkedInAt: entry.checkedInAt.toISOString(),
      status: entry.status,
    }));

    return {
      doctorId,
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown',
      date: today.toISOString().split('T')[0],
      currentPatient: currentAppointment ? {
        queueNumber: currentAppointment.queueNumber || '',
        patientName: `${currentAppointment.patient.firstName} ${currentAppointment.patient.lastName}`,
        startedAt: currentAppointment.startedAt?.toISOString() || '',
      } : null,
      queue,
      totalInQueue: queue.length,
      averageWaitTime,
    };
  }

  async callNextPatient(tenantId: string, doctorId: string, roomNumber?: string): Promise<{
    nextPatient: QueuePatient | null;
    smsSent: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Complete current patient if exists
    const currentAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        isWalkIn: true,
        status: 'IN_PROGRESS',
        appointmentDate: { gte: today, lt: tomorrow },
      },
    });

    if (currentAppointment) {
      const startedAt = currentAppointment.startedAt || currentAppointment.checkedInAt;
      const actualDuration = startedAt 
        ? Math.round((Date.now() - startedAt.getTime()) / 60000)
        : null;

      await prisma.appointment.update({
        where: { id: currentAppointment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualDurationMinutes: actualDuration,
        },
      });

      await prisma.queueEntry.updateMany({
        where: { appointmentId: currentAppointment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    // Get next patient from queue
    const nextEntry = await prisma.queueEntry.findFirst({
      where: {
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phonePrimary: true, phoneSecondary: true, photoUrl: true } },
      },
      orderBy: [{ priorityScore: 'desc' }, { queuePosition: 'asc' }],
    });

    if (!nextEntry) {
      return { nextPatient: null, smsSent: false };
    }

    // Update appointment to IN_PROGRESS
    await prisma.appointment.updateMany({
      where: { id: nextEntry.appointmentId || undefined },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        location: roomNumber,
      },
    });

    // Update queue entry
    await prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: { status: 'IN_PROGRESS', calledAt: new Date() },
    });

    // Send SMS to patient
    let smsSent = false;
    const phone = nextEntry.patient.phonePrimary || nextEntry.patient.phoneSecondary;
    if (phone) {
      try {
        await smsService.sendSMS({
          to: phone,
          message: `It's your turn! Please proceed to ${roomNumber || 'the consultation room'}. - MediCare Ghana`,
        });
        smsSent = true;

        await prisma.queueEntry.update({
          where: { id: nextEntry.id },
          data: { smsSentTurnNow: true },
        });
      } catch (error) {
        logger.error('Failed to send turn SMS:', error);
      }
    }

    // Send "turn soon" SMS to next 2 patients
    await this.sendTurnSoonNotifications(doctorId);

    return {
      nextPatient: {
        id: nextEntry.id,
        queueNumber: nextEntry.queueNumber,
        queuePosition: 1,
        patientId: nextEntry.patientId,
        patientName: `${nextEntry.patient.firstName} ${nextEntry.patient.lastName}`,
        patientPhoto: nextEntry.patient.photoUrl || undefined,
        priority: nextEntry.priority as QueuePriority,
        priorityScore: nextEntry.priorityScore,
        estimatedWaitMinutes: 0,
        checkedInAt: nextEntry.checkedInAt.toISOString(),
        status: 'IN_PROGRESS',
      },
      smsSent,
    };
  }

  async getQueueDisplay(doctorId: string, hospitalName: string = 'MediCare Ghana'): Promise<QueueDisplayResponse> {
    const queue = await this.getQueue('', doctorId);

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { firstName: true, lastName: true },
    });

    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId, dayOfWeek: new Date().getDay() },
      select: { location: true },
    });

    return {
      hospital: {
        name: hospitalName,
      },
      doctor: {
        name: queue.doctorName,
        roomNumber: schedule?.location || undefined,
      },
      currentTime: new Date().toISOString(),
      nowServing: queue.currentPatient ? {
        queueNumber: queue.currentPatient.queueNumber,
        patientName: queue.currentPatient.patientName.split(' ')[0],
        roomNumber: schedule?.location || undefined,
      } : null,
      queue: queue.queue.slice(0, 5).map((p, index) => ({
        queueNumber: p.queueNumber,
        patientName: p.patientName.split(' ')[0],
        status: index === 0 ? 'NEXT' as const : 'WAITING' as const,
      })),
    };
  }

  async removeFromQueue(queueEntryId: string, reason?: string): Promise<void> {
    const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
    
    if (!entry) {
      throw new AppError('Queue entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    await prisma.queueEntry.delete({ where: { id: queueEntryId } });

    if (entry.appointmentId) {
      await prisma.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason || 'Removed from queue',
          cancelledAt: new Date(),
        },
      });
    }
  }

  async updatePriority(queueEntryId: string, priority: QueuePriority): Promise<void> {
    const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
    
    if (!entry) {
      throw new AppError('Queue entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        priority,
        priorityScore: PRIORITY_SCORES[priority],
      },
    });
  }

  /**
   * Reprioritize queue based on triage levels
   * Called after a patient is triaged to reorder the queue
   */
  async reprioritizeByTriageLevel(doctorId: string, date?: Date): Promise<void> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all waiting queue entries for this doctor today
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    if (queueEntries.length === 0) return;

    // Sort by: triage level (if exists), then priority score, then check-in time
    const sortedEntries = queueEntries.sort((a, b) => {
      // First, sort by triage level (lower is higher priority)
      const aTriageScore = (a as any).triageLevel ? TRIAGE_LEVEL_SCORES[(a as any).triageLevel] || 0 : 0;
      const bTriageScore = (b as any).triageLevel ? TRIAGE_LEVEL_SCORES[(b as any).triageLevel] || 0 : 0;
      
      if (aTriageScore !== bTriageScore) {
        return bTriageScore - aTriageScore; // Higher score = higher priority
      }
      
      // Then by existing priority score
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      
      // Finally by check-in time (FIFO)
      return a.checkedInAt.getTime() - b.checkedInAt.getTime();
    });

    // Update queue positions
    const avgDuration = await this.getAverageConsultationDuration(doctorId);
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const newPosition = i + 1;
      const estimatedWait = newPosition * avgDuration;

      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: {
          queuePosition: newPosition,
          estimatedWaitMinutes: Math.round(estimatedWait * 1.15), // Add 15% buffer
        },
      });
    }

    logger.info(`Queue reprioritized for doctor ${doctorId}: ${sortedEntries.length} entries`);
  }

  /**
   * Update triage level for a queue entry
   */
  async updateTriageLevel(queueEntryId: string, triageLevel: number): Promise<void> {
    const entry = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
    
    if (!entry) {
      throw new AppError('Queue entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    const triageScore = TRIAGE_LEVEL_SCORES[triageLevel] || 0;

    await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        triageLevel,
        priorityScore: entry.priorityScore + triageScore,
      } as any,
    });

    // Reprioritize the queue after updating triage level
    if (entry.doctorId) {
      await this.reprioritizeByTriageLevel(entry.doctorId);
    }
  }

  private async generateQueueNumber(tenantId: string, branchId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastEntry = await prisma.queueEntry.findFirst({
      where: {
        tenantId,
        branchId,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { queueNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastEntry && lastEntry.queueNumber) {
      const match = lastEntry.queueNumber.match(/W-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `W-${nextNumber.toString().padStart(3, '0')}`;
  }

  private async calculateQueuePosition(doctorId: string, priority: QueuePriority): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waitingCount = await prisma.queueEntry.count({
      where: {
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: today, lt: tomorrow },
      },
    });

    return waitingCount + 1;
  }

  private async calculateEstimatedWaitTime(doctorId: string, position: number): Promise<number> {
    const avgDuration = await this.getAverageConsultationDuration(doctorId);
    const estimatedWait = position * avgDuration;
    const buffer = Math.ceil(estimatedWait * 0.15);
    return estimatedWait + buffer;
  }

  private async getAverageConsultationDuration(doctorId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo },
        actualDurationMinutes: { not: null },
      },
      select: { actualDurationMinutes: true },
    });

    if (completedAppointments.length === 0) {
      return 25;
    }

    const totalDuration = completedAppointments.reduce(
      (sum: number, apt: { actualDurationMinutes: number | null }) => sum + (apt.actualDurationMinutes || 0),
      0
    );

    return Math.round(totalDuration / completedAppointments.length);
  }

  private async sendTurnSoonNotifications(doctorId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextPatients = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: 'WAITING',
        smsSentTurnSoon: false,
        checkedInAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { firstName: true, phonePrimary: true, phoneSecondary: true } },
      },
      orderBy: [{ priorityScore: 'desc' }, { queuePosition: 'asc' }],
      take: 2,
    });

    for (const entry of nextPatients) {
      const phone = entry.patient.phonePrimary || entry.patient.phoneSecondary;
      if (phone) {
        try {
          await smsService.sendSMS({
            to: phone,
            message: `Your turn is coming up! Please be ready in the waiting area. Queue: #${entry.queueNumber} - MediCare Ghana`,
          });

          await prisma.queueEntry.update({
            where: { id: entry.id },
            data: { smsSentTurnSoon: true },
          });
        } catch (error) {
          logger.error('Failed to send turn soon SMS:', error);
        }
      }
    }
  }
}
