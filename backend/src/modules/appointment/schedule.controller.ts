import { Response, NextFunction } from 'express';
import { ScheduleService } from './schedule.service.js';
import { sendSuccess } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';

const scheduleService = new ScheduleService();

export class ScheduleController {
  async createSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schedule = await scheduleService.createSchedule(req.tenantId!, req.body);
      sendSuccess(res, schedule, 'Schedule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getSchedulesByDoctor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schedules = await scheduleService.getSchedulesByDoctor(req.params.doctorId);
      sendSuccess(res, schedules);
    } catch (error) {
      next(error);
    }
  }

  async getDoctors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const doctors = await scheduleService.getDoctorsByTenant(req.tenantId!);
      sendSuccess(res, doctors);
    } catch (error) {
      next(error);
    }
  }

  async updateSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
      sendSuccess(res, schedule, 'Schedule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await scheduleService.deleteSchedule(req.params.id);
      sendSuccess(res, null, 'Schedule deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async createWeeklySchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId, schedules } = req.body;
      const result = await scheduleService.createWeeklySchedule(req.tenantId!, doctorId, schedules);
      sendSuccess(res, result, 'Weekly schedule created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAvailableDoctors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { date, branchId } = req.query;
      const doctors = await scheduleService.getAvailableDoctors(req.tenantId!, date as string, branchId as string);
      sendSuccess(res, doctors);
    } catch (error) {
      next(error);
    }
  }
}
