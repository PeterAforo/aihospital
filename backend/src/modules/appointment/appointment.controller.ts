import { Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service.js';
import { sendSuccess, sendPaginated } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';

const appointmentService = new AppointmentService();

export class AppointmentController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.create(req.tenantId!, req.body);
      sendSuccess(res, appointment, 'Appointment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.getById(req.tenantId!, req.params.id);
      sendSuccess(res, appointment);
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('Listing appointments for tenant:', req.tenantId, 'query:', req.query);
      const result = await appointmentService.list(req.tenantId!, req.query as any);
      console.log('Found appointments:', result.appointments.length);
      sendPaginated(res, result.appointments, result.page, result.limit, result.total);
    } catch (error) {
      console.error('Error listing appointments:', error);
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.update(req.tenantId!, req.params.id, req.body);
      sendSuccess(res, appointment, 'Appointment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await appointmentService.cancel(req.tenantId!, req.params.id, req.body.reason);
      sendSuccess(res, null, 'Appointment cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkIn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.checkIn(req.tenantId!, req.params.id);
      sendSuccess(res, appointment, 'Patient checked in successfully');
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.complete(req.tenantId!, req.params.id);
      sendSuccess(res, appointment, 'Appointment completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDoctorAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;
      const availability = await appointmentService.getDoctorAvailability(doctorId, date as string);
      sendSuccess(res, availability);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.query;
      const queue = await appointmentService.getCurrentQueue(req.tenantId!, branchId as string);
      sendSuccess(res, queue);
    } catch (error) {
      next(error);
    }
  }
}
