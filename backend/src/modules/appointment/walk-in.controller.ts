import { Response, NextFunction } from 'express';
import { WalkInQueueService } from './walk-in-queue.service.js';
import { sendSuccess } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';
import { queueWebSocketService } from '../../common/services/queue-websocket.service.js';

const walkInQueueService = new WalkInQueueService();

export class WalkInController {
  async addToQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { patientId, doctorId, priority, chiefComplaint } = req.body;

      const result = await walkInQueueService.addToQueue({
        tenantId: req.tenantId!,
        branchId: req.body.branchId || 'default-branch',
        patientId,
        doctorId,
        priority,
        chiefComplaint,
      });

      // Notify WebSocket clients
      const queue = await walkInQueueService.getQueue(req.tenantId!, doctorId);
      queueWebSocketService.notifyPatientAdded(doctorId, {
        queueNumber: result.queueNumber,
        queuePosition: result.queuePosition,
        estimatedWaitMinutes: result.estimatedWaitMinutes,
        queue: queue.queue,
      });

      sendSuccess(res, result, 'Patient added to queue', 201);
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const queue = await walkInQueueService.getQueue(req.tenantId!, doctorId);
      sendSuccess(res, queue);
    } catch (error) {
      next(error);
    }
  }

  async callNextPatient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const { roomNumber } = req.body;

      const result = await walkInQueueService.callNextPatient(req.tenantId!, doctorId, roomNumber);

      // Notify WebSocket clients
      if (result.nextPatient) {
        queueWebSocketService.notifyPatientCalled(doctorId, result.nextPatient);
      }

      const queue = await walkInQueueService.getQueue(req.tenantId!, doctorId);
      queueWebSocketService.notifyQueueUpdate(doctorId, queue);

      sendSuccess(res, result, result.nextPatient ? 'Next patient called' : 'No patients in queue');
    } catch (error) {
      next(error);
    }
  }

  async removeFromQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { queueEntryId } = req.params;
      const { reason } = req.body;

      // Get doctor ID before removing
      const entry = await walkInQueueService.getQueue(req.tenantId!, '');
      
      await walkInQueueService.removeFromQueue(queueEntryId, reason);

      sendSuccess(res, null, 'Patient removed from queue');
    } catch (error) {
      next(error);
    }
  }

  async updatePriority(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { queueEntryId } = req.params;
      const { priority } = req.body;

      await walkInQueueService.updatePriority(queueEntryId, priority);

      sendSuccess(res, null, 'Priority updated');
    } catch (error) {
      next(error);
    }
  }

  async getQueueDisplay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const display = await walkInQueueService.getQueueDisplay(doctorId);
      sendSuccess(res, display);
    } catch (error) {
      next(error);
    }
  }
}
