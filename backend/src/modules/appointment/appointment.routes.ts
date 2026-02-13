import { Router } from 'express';
import { AppointmentController } from './appointment.controller.js';
import { ScheduleController } from './schedule.controller.js';
import { authenticate, authorize, tenantGuard } from '../../common/middleware/auth.js';
import { validateBody } from '../../common/middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema } from './appointment.schema.js';

const router: ReturnType<typeof Router> = Router();
const appointmentController = new AppointmentController();
const scheduleController = new ScheduleController();

router.use(authenticate);
router.use(tenantGuard);

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
