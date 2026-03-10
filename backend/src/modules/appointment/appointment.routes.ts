import { Router, Response } from 'express';
import { AppointmentController } from './appointment.controller.js';
import { ScheduleController } from './schedule.controller.js';
import { authenticate, authorize, tenantGuard, AuthRequest } from '../../common/middleware/auth.js';
import { validateBody } from '../../common/middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema } from './appointment.schema.js';
import { prisma } from '../../common/utils/prisma.js';

const router: ReturnType<typeof Router> = Router();
const appointmentController = new AppointmentController();
const scheduleController = new ScheduleController();

router.use(authenticate);
router.use(tenantGuard);

// Check if patient is within a review/follow-up period from a previous encounter
router.get('/review-check/:patientId', async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the most recent completed encounter that has a followUpDate >= today
    const encounter = await (prisma as any).encounter.findFirst({
      where: {
        tenantId: req.tenantId,
        patientId,
        status: { in: ['COMPLETED', 'SIGNED'] },
        followUpDate: { gte: today },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        followUpDate: true,
        followUpPlan: true,
        completedAt: true,
        chiefComplaint: true,
        isBillable: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (encounter) {
      return res.json({
        success: true,
        data: {
          isReview: true,
          encounter: {
            id: encounter.id,
            followUpDate: encounter.followUpDate,
            followUpPlan: encounter.followUpPlan,
            completedAt: encounter.completedAt,
            chiefComplaint: encounter.chiefComplaint,
            doctorName: encounter.doctor
              ? `Dr. ${encounter.doctor.firstName} ${encounter.doctor.lastName}`
              : null,
            doctorId: encounter.doctor?.id,
          },
        },
      });
    }

    return res.json({ success: true, data: { isReview: false, encounter: null } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Appointment CRUD
router.post('/', validateBody(createAppointmentSchema), appointmentController.create);
router.get('/', appointmentController.list);
router.get('/queue/current', appointmentController.getCurrentQueue);
router.get('/doctors/available', scheduleController.getAvailableDoctors);
router.get('/:id', appointmentController.getById);
router.put('/:id', validateBody(updateAppointmentSchema), appointmentController.update);
router.delete('/:id', appointmentController.cancel);
router.post('/:id/check-in', appointmentController.checkIn);
router.post('/:id/complete', appointmentController.complete);

// Doctor availability
router.get('/doctor/:doctorId/availability', appointmentController.getDoctorAvailability);
router.get('/doctor/:doctorId/schedules', scheduleController.getSchedulesByDoctor);

// Schedule management (admin only)
router.get('/schedules/doctors', scheduleController.getDoctors);
router.post('/schedules', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), scheduleController.createSchedule);
router.post('/schedules/weekly', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), scheduleController.createWeeklySchedule);
router.put('/schedules/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), scheduleController.updateSchedule);
router.delete('/schedules/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), scheduleController.deleteSchedule);

export default router;
