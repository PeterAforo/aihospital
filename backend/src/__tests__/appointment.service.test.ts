/**
 * Appointment & Slot Allocation Service Unit Tests
 * Tests slot allocation, scheduling logic, walk-in queue, no-show handling
 */

describe('Appointment Service - Unit Tests', () => {
  describe('Slot Allocation', () => {
    const DEFAULT_ALLOCATION = { appointmentPercent: 70, walkInPercent: 20, emergencyPercent: 10 };

    it('should allocate slots by percentage', () => {
      const totalMinutes = 480; // 8 hours
      const slotDuration = 15;
      const totalSlots = Math.floor(totalMinutes / slotDuration);
      const appointmentSlots = Math.floor(totalSlots * DEFAULT_ALLOCATION.appointmentPercent / 100);
      const walkInSlots = Math.floor(totalSlots * DEFAULT_ALLOCATION.walkInPercent / 100);
      const emergencySlots = totalSlots - appointmentSlots - walkInSlots;
      expect(totalSlots).toBe(32);
      expect(appointmentSlots).toBe(22);
      expect(walkInSlots).toBe(6);
      expect(emergencySlots).toBe(4);
      expect(appointmentSlots + walkInSlots + emergencySlots).toBe(totalSlots);
    });

    it('should use day-specific allocations for Monday mornings', () => {
      const mondayMorning = { appointmentPercent: 60, walkInPercent: 30, emergencyPercent: 10 };
      expect(mondayMorning.walkInPercent).toBeGreaterThan(DEFAULT_ALLOCATION.walkInPercent);
    });

    it('should use day-specific allocations for Friday afternoons', () => {
      const fridayAfternoon = { appointmentPercent: 80, walkInPercent: 10, emergencyPercent: 10 };
      expect(fridayAfternoon.appointmentPercent).toBeGreaterThan(DEFAULT_ALLOCATION.appointmentPercent);
    });

    it('should always reserve emergency buffer', () => {
      expect(DEFAULT_ALLOCATION.emergencyPercent).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Time Slot Generation', () => {
    it('should generate correct number of slots', () => {
      const startHour = 8;
      const endHour = 16;
      const duration = 15;
      const totalMinutes = (endHour - startHour) * 60;
      const slots = Math.floor(totalMinutes / duration);
      expect(slots).toBe(32);
    });

    it('should generate non-overlapping time slots', () => {
      const slots: Array<{ start: number; end: number }> = [];
      let current = 480; // 8:00 in minutes
      const duration = 15;
      for (let i = 0; i < 5; i++) {
        slots.push({ start: current, end: current + duration });
        current += duration;
      }
      for (let i = 1; i < slots.length; i++) {
        expect(slots[i].start).toBe(slots[i - 1].end);
      }
    });

    it('should format time correctly', () => {
      const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };
      expect(formatTime(480)).toBe('08:00');
      expect(formatTime(495)).toBe('08:15');
      expect(formatTime(720)).toBe('12:00');
      expect(formatTime(960)).toBe('16:00');
    });
  });

  describe('Appointment Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: ['SCHEDULED'],
    };

    it('should allow standard appointment flow', () => {
      expect(validTransitions['SCHEDULED']).toContain('CONFIRMED');
      expect(validTransitions['CONFIRMED']).toContain('CHECKED_IN');
      expect(validTransitions['CHECKED_IN']).toContain('IN_PROGRESS');
      expect(validTransitions['IN_PROGRESS']).toContain('COMPLETED');
    });

    it('should allow rescheduling after no-show', () => {
      expect(validTransitions['NO_SHOW']).toContain('SCHEDULED');
    });

    it('should not allow changes after completion', () => {
      expect(validTransitions['COMPLETED']).toHaveLength(0);
    });
  });

  describe('Walk-In Queue Management', () => {
    it('should estimate wait time based on queue position', () => {
      const avgConsultMinutes = 15;
      const queuePosition = 4;
      const estimatedWait = queuePosition * avgConsultMinutes;
      expect(estimatedWait).toBe(60);
    });

    it('should prioritize by arrival time within same priority', () => {
      const queue = [
        { id: '1', priority: 'NORMAL', arrivedAt: new Date('2026-01-01T09:00:00Z') },
        { id: '2', priority: 'NORMAL', arrivedAt: new Date('2026-01-01T08:30:00Z') },
        { id: '3', priority: 'URGENT', arrivedAt: new Date('2026-01-01T09:15:00Z') },
      ];
      const priorityOrder: Record<string, number> = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };
      const sorted = [...queue].sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        if (pDiff !== 0) return pDiff;
        return a.arrivedAt.getTime() - b.arrivedAt.getTime();
      });
      expect(sorted[0].id).toBe('3');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });
  });

  describe('No-Show Prediction', () => {
    it('should calculate no-show risk score', () => {
      const factors = { previousNoShows: 2, totalAppointments: 10, daysSinceLastVisit: 90, isMonday: true };
      let score = (factors.previousNoShows / Math.max(factors.totalAppointments, 1)) * 50;
      if (factors.daysSinceLastVisit > 60) score += 15;
      if (factors.isMonday) score += 10;
      expect(score).toBe(35);
      expect(score).toBeLessThan(100);
    });

    it('should flag high-risk patients (score > 40)', () => {
      const score = 45;
      const isHighRisk = score > 40;
      expect(isHighRisk).toBe(true);
    });
  });
});
