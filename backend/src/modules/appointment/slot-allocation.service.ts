import { prisma } from '../../common/utils/prisma.js';
import { ScheduleService } from './schedule.service.js';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isAvailable: boolean;
  slotType: 'appointment' | 'walk_in_buffer' | 'emergency_buffer';
  bookedBy?: string;
  appointmentId?: string;
}

export interface SlotAllocationConfig {
  appointmentPercent: number;
  walkInPercent: number;
  emergencyPercent: number;
}

export interface AvailableSlotsResponse {
  date: string;
  doctorId: string;
  doctorName: string;
  workingHours: { start: string; end: string };
  totalMinutes: number;
  slots: TimeSlot[];
  walkInQueueLength: number;
  estimatedWaitForWalkIn: number;
  slotAllocation: SlotAllocationConfig;
}

const DEFAULT_ALLOCATION: SlotAllocationConfig = {
  appointmentPercent: 70,
  walkInPercent: 20,
  emergencyPercent: 10,
};

const DAY_SPECIFIC_ALLOCATIONS: Record<number, Record<string, SlotAllocationConfig>> = {
  1: {
    morning: { appointmentPercent: 60, walkInPercent: 30, emergencyPercent: 10 },
    afternoon: { appointmentPercent: 70, walkInPercent: 20, emergencyPercent: 10 },
  },
  5: {
    morning: { appointmentPercent: 75, walkInPercent: 15, emergencyPercent: 10 },
    afternoon: { appointmentPercent: 80, walkInPercent: 10, emergencyPercent: 10 },
  },
};

export class SlotAllocationService {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  async getAvailableSlots(
    doctorId: string,
    date: string,
    appointmentTypeId?: string,
    patientId?: string
  ): Promise<AvailableSlotsResponse> {
    const availability = await this.scheduleService.getDoctorAvailability(doctorId, date);

    if (!availability.isAvailable) {
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId },
        select: { firstName: true, lastName: true },
      });

      return {
        date,
        doctorId,
        doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown',
        workingHours: { start: '', end: '' },
        totalMinutes: 0,
        slots: [],
        walkInQueueLength: 0,
        estimatedWaitForWalkIn: 0,
        slotAllocation: DEFAULT_ALLOCATION,
      };
    }

    const { workingHours, slotAllocation } = availability;
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { firstName: true, lastName: true },
    });

    const allocation = slotAllocation || DEFAULT_ALLOCATION;
    const slotDuration = workingHours?.slotDuration || 30;

    const slots = await this.generateSlots(
      doctorId,
      date,
      workingHours!.startTime,
      workingHours!.endTime,
      slotDuration,
      allocation,
      appointmentTypeId
    );

    const walkInQueue = await this.getWalkInQueueLength(doctorId, date);
    const estimatedWait = await this.calculateEstimatedWaitTime(doctorId, date);

    return {
      date,
      doctorId,
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown',
      workingHours: { start: workingHours!.startTime, end: workingHours!.endTime },
      totalMinutes: this.calculateTotalMinutes(workingHours!.startTime, workingHours!.endTime),
      slots,
      walkInQueueLength: walkInQueue,
      estimatedWaitForWalkIn: estimatedWait,
      slotAllocation: allocation,
    };
  }

  private async generateSlots(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    slotDuration: number,
    allocation: SlotAllocationConfig,
    appointmentTypeId?: string
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const dateObj = new Date(date);
    
    const dateStart = new Date(dateObj);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateObj);
    dateEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: dateStart, lte: dateEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    const totalMinutes = this.calculateTotalMinutes(startTime, endTime);
    const lunchBreakStart = '12:00';
    const lunchBreakEnd = '13:00';

    const appointmentMinutes = Math.floor(totalMinutes * (allocation.appointmentPercent / 100));
    const walkInMinutes = Math.floor(totalMinutes * (allocation.walkInPercent / 100));

    let currentMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const lunchStart = this.timeToMinutes(lunchBreakStart);
    const lunchEnd = this.timeToMinutes(lunchBreakEnd);

    let appointmentSlotsUsed = 0;
    let walkInSlotsUsed = 0;
    const maxAppointmentSlots = Math.floor(appointmentMinutes / slotDuration);
    const maxWalkInSlots = Math.floor(walkInMinutes / slotDuration);

    while (currentMinutes + slotDuration <= endMinutes) {
      if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
        currentMinutes = lunchEnd;
        continue;
      }

      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + slotDuration);

      const existingBooking = existingAppointments.find((apt: any) => {
        const aptStart = this.timeToMinutes(apt.appointmentTime);
        const aptEnd = apt.endTime ? this.timeToMinutes(apt.endTime) : aptStart + apt.duration;
        return this.timesOverlap(currentMinutes, currentMinutes + slotDuration, aptStart, aptEnd);
      });

      let slotType: 'appointment' | 'walk_in_buffer' | 'emergency_buffer';
      
      if (appointmentSlotsUsed < maxAppointmentSlots) {
        slotType = 'appointment';
        appointmentSlotsUsed++;
      } else if (walkInSlotsUsed < maxWalkInSlots) {
        slotType = 'walk_in_buffer';
        walkInSlotsUsed++;
      } else {
        slotType = 'emergency_buffer';
      }

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes: slotDuration,
        isAvailable: !existingBooking,
        slotType,
        bookedBy: existingBooking 
          ? `${existingBooking.patient.firstName} ${existingBooking.patient.lastName}`
          : undefined,
        appointmentId: existingBooking?.id,
      });

      currentMinutes += slotDuration;
    }

    return slots;
  }

  private async getWalkInQueueLength(doctorId: string, date: string): Promise<number> {
    const dateObj = new Date(date);
    const dateStart = new Date(dateObj);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateObj);
    dateEnd.setHours(23, 59, 59, 999);

    return prisma.queueEntry.count({
      where: {
        doctorId,
        status: 'WAITING',
        checkedInAt: { gte: dateStart, lte: dateEnd },
      },
    });
  }

  private async calculateEstimatedWaitTime(doctorId: string, date: string): Promise<number> {
    const queueLength = await this.getWalkInQueueLength(doctorId, date);
    
    const avgDuration = await this.getAverageConsultationDuration(doctorId);
    
    const estimatedWait = queueLength * avgDuration;
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

  async getAIPredictedDuration(
    doctorId: string,
    appointmentTypeId: string,
    date: Date
  ): Promise<number> {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const prediction = await prisma.aISlotPrediction.findFirst({
      where: {
        doctorId,
        appointmentTypeId,
        dayOfWeek,
        timeOfDay,
      },
    });

    if (prediction) {
      return prediction.predictedDurationMinutes;
    }

    const appointmentType = await prisma.appointmentTypeConfig.findUnique({
      where: { id: appointmentTypeId },
    });

    return appointmentType?.defaultDurationMinutes || 30;
  }

  private calculateTotalMinutes(startTime: string, endTime: string): number {
    return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private timesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }

  getDynamicAllocation(dayOfWeek: number, hour: number): SlotAllocationConfig {
    const timeOfDay = hour < 12 ? 'morning' : 'afternoon';
    
    if (DAY_SPECIFIC_ALLOCATIONS[dayOfWeek]?.[timeOfDay]) {
      return DAY_SPECIFIC_ALLOCATIONS[dayOfWeek][timeOfDay];
    }
    
    return DEFAULT_ALLOCATION;
  }
}
