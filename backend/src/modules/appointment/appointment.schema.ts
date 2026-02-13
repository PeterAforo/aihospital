import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  branchId: z.string().uuid(),
  appointmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  duration: z.number().min(15).max(120).optional().default(30),
  type: z.enum(['CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'CHECKUP', 'EMERGENCY']).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  sendReminder: z.boolean().optional().default(true),
  isWalkIn: z.boolean().optional().default(false),
});

export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format').optional(),
  duration: z.number().min(15).max(120).optional(),
  type: z.enum(['CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'CHECKUP', 'EMERGENCY']).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional(),
  cancelReason: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
