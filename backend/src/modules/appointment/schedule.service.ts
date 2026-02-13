import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { getHolidaysForYear, isPublicHoliday } from '../../common/constants/ghana-holidays.js';

export type ExceptionType = 'LEAVE' | 'CONFERENCE' | 'HOLIDAY' | 'EMERGENCY' | 'HALF_DAY';

export interface CreateScheduleInput {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  location?: string;
  appointmentTypesAllowed?: string[];
  appointmentSplitPercent?: number;
  walkInSplitPercent?: number;
  emergencySplitPercent?: number;
}

export interface UpdateScheduleInput {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  location?: string;
  appointmentTypesAllowed?: string[];
  appointmentSplitPercent?: number;
  walkInSplitPercent?: number;
  emergencySplitPercent?: number;
  isActive?: boolean;
}

export interface CreateExceptionInput {
  doctorId: string;
  date: Date;
  exceptionType: ExceptionType;
  isAvailable?: boolean;
  customStartTime?: string;
  customEndTime?: string;
  reason?: string;
}

export interface DoctorAvailability {
  isAvailable: boolean;
  isHoliday: boolean;
  holidayName?: string;
  exception?: {
    type: ExceptionType;
    reason?: string;
  };
  workingHours?: {
    startTime: string;
    endTime: string;
    slotDuration: number;
    location?: string;
  };
  slotAllocation?: {
    appointmentPercent: number;
    walkInPercent: number;
    emergencyPercent: number;
  };
}

export class ScheduleService {
  async createSchedule(tenantId: string, data: CreateScheduleInput) {
    // Verify doctor exists and belongs to tenant
    const doctor = await prisma.user.findFirst({
      where: { id: data.doctorId, tenantId, role: 'DOCTOR' },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    // Check for existing schedule on same day
    const existing = await prisma.doctorSchedule.findFirst({
      where: { doctorId: data.doctorId, dayOfWeek: data.dayOfWeek },
    });

    if (existing) {
      throw new AppError('Schedule already exists for this day', 409, 'SCHEDULE_EXISTS');
    }

    const schedule = await prisma.doctorSchedule.create({
      data: {
        tenantId,
        doctorId: data.doctorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration || 30,
      },
      include: {
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return schedule;
  }

  async getSchedulesByDoctor(doctorId: string) {
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return schedules;
  }

  async getDoctorsByTenant(tenantId: string) {
    const doctors = await prisma.user.findMany({
      where: { tenantId, role: 'DOCTOR', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Get schedules for each doctor
    const doctorsWithSchedules = await Promise.all(
      doctors.map(async (doctor) => {
        const schedules = await prisma.doctorSchedule.findMany({
          where: { doctorId: doctor.id },
          orderBy: { dayOfWeek: 'asc' },
        });
        return { ...doctor, schedules };
      })
    );

    return doctorsWithSchedules;
  }

  async updateSchedule(id: string, data: UpdateScheduleInput) {
    const schedule = await prisma.doctorSchedule.findUnique({ where: { id } });

    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    const updated = await prisma.doctorSchedule.update({
      where: { id },
      data: {
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.slotDuration && { slotDuration: data.slotDuration }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return updated;
  }

  async deleteSchedule(id: string) {
    const schedule = await prisma.doctorSchedule.findUnique({ where: { id } });

    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    await prisma.doctorSchedule.delete({ where: { id } });
  }

  async createWeeklySchedule(tenantId: string, doctorId: string, weeklySchedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration?: number;
  }[]) {
    // Verify doctor exists
    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, tenantId, role: 'DOCTOR' },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    // Delete existing schedules
    await prisma.doctorSchedule.deleteMany({ where: { doctorId } });

    // Create new schedules
    const schedules = await prisma.doctorSchedule.createMany({
      data: weeklySchedule.map((s) => ({
        tenantId,
        doctorId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDuration: s.slotDuration || 30,
      })),
    });

    return this.getSchedulesByDoctor(doctorId);
  }

  async getAvailableDoctors(tenantId: string, date: string, branchId?: string) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get all active doctors
    const allDoctors = await prisma.user.findMany({
      where: {
        tenantId,
        role: 'DOCTOR',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Filter doctors with schedules for this day
    const doctors = [];
    for (const doctor of allDoctors) {
      const schedule = await prisma.doctorSchedule.findFirst({
        where: { doctorId: doctor.id, dayOfWeek, isActive: true },
      });
      if (schedule) {
        doctors.push({ ...doctor, schedules: [schedule] });
      }
    }

    // Filter out doctors with exceptions on this date
    const availableDoctors = [];
    for (const doctor of doctors) {
      const availability = await this.getDoctorAvailability(doctor.id, date);
      if (availability.isAvailable) {
        availableDoctors.push({ ...doctor, availability });
      }
    }

    return availableDoctors;
  }

  async createException(tenantId: string, data: CreateExceptionInput) {
    const doctor = await prisma.user.findFirst({
      where: { id: data.doctorId, tenantId, role: 'DOCTOR' },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    // Check if exception already exists for this date
    const existing = await prisma.scheduleException.findUnique({
      where: { doctorId_date: { doctorId: data.doctorId, date: data.date } },
    });

    if (existing) {
      // Update existing exception
      return prisma.scheduleException.update({
        where: { id: existing.id },
        data: {
          exceptionType: data.exceptionType,
          isAvailable: data.isAvailable ?? false,
          customStartTime: data.customStartTime,
          customEndTime: data.customEndTime,
          reason: data.reason,
        },
      });
    }

    return prisma.scheduleException.create({
      data: {
        tenantId,
        doctorId: data.doctorId,
        date: data.date,
        exceptionType: data.exceptionType,
        isAvailable: data.isAvailable ?? false,
        customStartTime: data.customStartTime,
        customEndTime: data.customEndTime,
        reason: data.reason,
      },
    });
  }

  async bulkCreateExceptions(tenantId: string, doctorId: string, exceptions: Omit<CreateExceptionInput, 'doctorId'>[]) {
    const results = [];
    for (const exc of exceptions) {
      const result = await this.createException(tenantId, { ...exc, doctorId });
      results.push(result);
    }
    return results;
  }

  async deleteException(id: string) {
    const exception = await prisma.scheduleException.findUnique({ where: { id } });
    if (!exception) {
      throw new AppError('Exception not found', 404, 'EXCEPTION_NOT_FOUND');
    }
    await prisma.scheduleException.delete({ where: { id } });
  }

  async getExceptionsByDoctor(doctorId: string, startDate?: Date, endDate?: Date) {
    return prisma.scheduleException.findMany({
      where: {
        doctorId,
        ...(startDate && endDate && {
          date: { gte: startDate, lte: endDate },
        }),
      },
      orderBy: { date: 'asc' },
    });
  }

  async getDoctorAvailability(doctorId: string, dateStr: string): Promise<DoctorAvailability> {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const year = date.getFullYear();

    // Check for public holiday
    const holidays = getHolidaysForYear(year);
    const holiday = isPublicHoliday(date, holidays);
    if (holiday) {
      return {
        isAvailable: false,
        isHoliday: true,
        holidayName: holiday.name,
      };
    }

    // Check for schedule exception
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const exception = await prisma.scheduleException.findFirst({
      where: {
        doctorId,
        date: { gte: dateStart, lte: dateEnd },
      },
    });

    if (exception) {
      if (!exception.isAvailable) {
        return {
          isAvailable: false,
          isHoliday: false,
          exception: {
            type: exception.exceptionType,
            reason: exception.reason || undefined,
          },
        };
      }

      // Custom hours for this date
      if (exception.customStartTime && exception.customEndTime) {
        return {
          isAvailable: true,
          isHoliday: false,
          exception: {
            type: exception.exceptionType,
            reason: exception.reason || undefined,
          },
          workingHours: {
            startTime: exception.customStartTime,
            endTime: exception.customEndTime,
            slotDuration: 30,
          },
        };
      }
    }

    // Get regular schedule for this day
    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId, dayOfWeek, isActive: true },
    });

    if (!schedule) {
      return {
        isAvailable: false,
        isHoliday: false,
      };
    }

    return {
      isAvailable: true,
      isHoliday: false,
      workingHours: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDuration: schedule.slotDuration,
        location: schedule.location || undefined,
      },
      slotAllocation: {
        appointmentPercent: schedule.appointmentSplitPercent,
        walkInPercent: schedule.walkInSplitPercent,
        emergencyPercent: schedule.emergencySplitPercent,
      },
    };
  }

  async isWorkingDay(doctorId: string, dateStr: string): Promise<boolean> {
    const availability = await this.getDoctorAvailability(doctorId, dateStr);
    return availability.isAvailable;
  }

  async seedPublicHolidays(tenantId: string, year: number) {
    const holidays = getHolidaysForYear(year);
    
    const holidayData = holidays.map(h => ({
      tenantId,
      name: h.name,
      date: new Date(year, h.month - 1, h.day),
      isRecurring: h.isRecurring,
    }));

    // Upsert holidays
    for (const holiday of holidayData) {
      await prisma.publicHoliday.upsert({
        where: { tenantId_date: { tenantId, date: holiday.date } },
        update: { name: holiday.name, isRecurring: holiday.isRecurring },
        create: holiday,
      });
    }

    return prisma.publicHoliday.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });
  }

  async getPublicHolidays(tenantId: string, year?: number) {
    const startDate = year ? new Date(year, 0, 1) : undefined;
    const endDate = year ? new Date(year, 11, 31) : undefined;

    return prisma.publicHoliday.findMany({
      where: {
        tenantId,
        ...(startDate && endDate && { date: { gte: startDate, lte: endDate } }),
      },
      orderBy: { date: 'asc' },
    });
  }
}
