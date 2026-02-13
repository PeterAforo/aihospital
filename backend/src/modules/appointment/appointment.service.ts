import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { CreateAppointmentInput, UpdateAppointmentInput } from './appointment.schema.js';
import { smsService } from '../../common/services/sms.service.js';
import { logger } from '../../common/utils/logger.js';

export class AppointmentService {
  async create(tenantId: string, data: CreateAppointmentInput) {
    // Skip conflict check for walk-ins (they're immediate and don't need scheduling)
    if (!data.isWalkIn) {
      const conflict = await this.checkConflict(
        data.doctorId,
        data.appointmentDate,
        data.appointmentTime,
        data.duration || 30
      );

      if (conflict) {
        throw new AppError('Doctor is not available at this time', 409, 'APPOINTMENT_CONFLICT');
      }
    }

    // Calculate end time
    const endTime = this.calculateEndTime(data.appointmentTime, data.duration || 30);

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        branchId: data.branchId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentDate: new Date(data.appointmentDate),
        appointmentTime: data.appointmentTime,
        endTime,
        duration: data.duration || 30,
        chiefComplaint: data.reason,
        specialInstructions: data.notes,
        isWalkIn: data.isWalkIn || false,
        bookingChannel: data.isWalkIn ? 'WALKIN' : 'PORTAL',
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phonePrimary: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    return appointment;
  }

  async getById(tenantId: string, id: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phonePrimary: true, mrn: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    return appointment;
  }

  async list(tenantId: string, params: {
    doctorId?: string;
    patientId?: string;
    branchId?: string;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const { doctorId, patientId, branchId, status, date, startDate, endDate } = params;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      where.appointmentDate = { gte: dateStart, lte: dateEnd };
    } else if (startDate && endDate) {
      where.appointmentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phonePrimary: true, mrn: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return { appointments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(tenantId: string, id: string, data: UpdateAppointmentInput) {
    const appointment = await this.getById(tenantId, id);

    // Check for conflicts if date/time is being changed
    if (data.appointmentDate || data.appointmentTime) {
      const conflict = await this.checkConflict(
        appointment.doctorId,
        data.appointmentDate || appointment.appointmentDate.toISOString(),
        data.appointmentTime || appointment.appointmentTime,
        data.duration || appointment.duration,
        id
      );

      if (conflict) {
        throw new AppError('Doctor is not available at this time', 409, 'APPOINTMENT_CONFLICT');
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.appointmentDate && { appointmentDate: new Date(data.appointmentDate) }),
        ...(data.appointmentTime && { appointmentTime: data.appointmentTime }),
        ...(data.duration && { duration: data.duration }),
        ...(data.reason !== undefined && { chiefComplaint: data.reason }),
        ...(data.notes !== undefined && { specialInstructions: data.notes }),
        ...(data.status && { status: data.status }),
        ...(data.cancelReason && { cancelReason: data.cancelReason, cancelledAt: new Date() }),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phonePrimary: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    await this.getById(tenantId, id);

    await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
      },
    });
  }

  async checkIn(tenantId: string, id: string) {
    const appointment = await this.getById(tenantId, id);

    if (appointment.status !== 'SCHEDULED' && appointment.status !== 'CONFIRMED') {
      throw new AppError('Appointment cannot be checked in', 400, 'INVALID_STATUS');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });

    // Add to queue
    const queueCount = await prisma.queueEntry.count({
      where: {
        tenantId,
        branchId: appointment.branchId,
        status: 'WAITING',
      },
    });

    const queuePosition = queueCount + 1;
    const queueNumber = `Q-${queuePosition.toString().padStart(3, '0')}`;

    await prisma.queueEntry.create({
      data: {
        tenantId,
        branchId: appointment.branchId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
        queueNumber,
        queuePosition,
      },
    });

    return updated;
  }

  async complete(tenantId: string, id: string) {
    const appointment = await this.getById(tenantId, id);

    if (appointment.status !== 'CHECKED_IN' && appointment.status !== 'IN_PROGRESS') {
      throw new AppError('Appointment cannot be completed', 400, 'INVALID_STATUS');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Update queue entry
    await prisma.queueEntry.updateMany({
      where: {
        patientId: appointment.patientId,
        status: 'WAITING',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return updated;
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get doctor's schedule for this day
    const schedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!schedule) {
      return { available: false, slots: [] };
    }

    // Get existing appointments for this day
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: dateStart, lte: dateEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { appointmentTime: true, endTime: true, duration: true },
    });

    // Generate available slots
    const slots = this.generateTimeSlots(
      schedule.startTime,
      schedule.endTime,
      schedule.slotDuration,
      appointments
    );

    return { available: true, slots };
  }

  async getCurrentQueue(tenantId: string, branchId: string) {
    const queue = await prisma.queueEntry.findMany({
      where: {
        tenantId,
        branchId,
        status: 'WAITING',
      },
      orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
    });

    return queue;
  }

  private async checkConflict(
    doctorId: string,
    date: string,
    time: string,
    duration: number,
    excludeId?: string
  ): Promise<boolean> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const endTime = this.calculateEndTime(time, duration);

    const conflicts = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: dateStart, lte: dateEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    for (const apt of conflicts) {
      if (this.timesOverlap(time, endTime, apt.appointmentTime, apt.endTime || apt.appointmentTime)) {
        return true;
      }
    }

    return false;
  }

  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
    bookedAppointments: { appointmentTime: string; endTime: string | null; duration: number }[]
  ): { time: string; available: boolean }[] {
    const slots: { time: string; available: boolean }[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + slotDuration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const slotEnd = this.calculateEndTime(timeStr, slotDuration);

      const isBooked = bookedAppointments.some((apt) =>
        this.timesOverlap(timeStr, slotEnd, apt.appointmentTime, apt.endTime || this.calculateEndTime(apt.appointmentTime, apt.duration))
      );

      slots.push({ time: timeStr, available: !isBooked });
      currentMinutes += slotDuration;
    }

    return slots;
  }

  private async sendAppointmentConfirmationSMS(appointment: any): Promise<void> {
    if (!appointment.patient?.phone) {
      logger.warn(`No phone number for patient ${appointment.patientId}, skipping SMS`);
      return;
    }

    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = `${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim();

    const result = await smsService.sendAppointmentConfirmation(
      appointment.patient.phone,
      patientName,
      doctorName,
      new Date(appointment.appointmentDate),
      appointment.appointmentTime,
      appointment.branch?.name || 'MediCare Ghana'
    );

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      });
      logger.info(`Appointment confirmation SMS sent to ${appointment.patient.phone}`);
    }
  }

  async sendReminders(): Promise<{ sent: number; failed: number }> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: tomorrow, lte: tomorrowEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminderSent: false,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phonePrimary: true } },
        doctor: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      const phone = apt.patient?.phone || (apt.patient as any)?.phonePrimary;
      if (!phone) {
        failed++;
        continue;
      }

      const patientName = `${apt.patient?.firstName} ${apt.patient?.lastName}`;
      const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.trim();

      const result = await smsService.sendAppointmentReminder(
        phone,
        patientName,
        doctorName,
        apt.appointmentDate,
        apt.appointmentTime,
        apt.branch?.name || 'MediCare Ghana'
      );

      if (result.success) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSent: true },
        });
        sent++;
      } else {
        failed++;
      }
    }

    logger.info(`Appointment reminders sent: ${sent} success, ${failed} failed`);
    return { sent, failed };
  }
}
