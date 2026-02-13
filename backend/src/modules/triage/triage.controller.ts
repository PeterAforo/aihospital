import { Request, Response, NextFunction } from 'express';
import { triageService } from './triage.service.js';
import {
  CreateTriageSchema,
  UpdateTriageSchema,
  SuggestLevelSchema,
  TriageQueueQuerySchema,
  TriageHistoryQuerySchema,
  TriageAnalyticsQuerySchema,
} from './triage.schema.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { sendSuccess } from '../../common/utils/api-response.js';

// ==================== CONTROLLER CLASS ====================

export class TriageController {
  /**
   * GET /api/triage/queue
   * Get patients awaiting triage
   */
  async getTriageQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'TENANT_REQUIRED');
      }

      const query = TriageQueueQuerySchema.parse(req.query);
      const date = query.date ? new Date(query.date) : undefined;

      const result = await triageService.getTriageQueue(tenantId, date);

      return sendSuccess(res, result, 'Triage queue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/triage
   * Create a new triage record
   */
  async createTriage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const nurseId = (req as any).user?.userId;

      if (!tenantId || !nurseId) {
        throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
      }

      const data = CreateTriageSchema.parse(req.body);

      const result = await triageService.createTriage(tenantId, nurseId, data);

      return sendSuccess(res, result, 'Triage record created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/triage/:id
   * Get a triage record by ID
   */
  async getTriageById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'TENANT_REQUIRED');
      }

      const { id } = req.params;

      const triage = await triageService.getTriageById(tenantId, id);

      return sendSuccess(res, { triage }, 'Triage record retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/triage/:id
   * Update a triage record
   */
  async updateTriage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const nurseId = (req as any).user?.userId;

      if (!tenantId || !nurseId) {
        throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
      }

      const { id } = req.params;
      const data = UpdateTriageSchema.parse(req.body);

      const result = await triageService.updateTriage(tenantId, id, nurseId, data);

      return sendSuccess(res, { triage: result }, 'Triage record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/triage/patient/:patientId/history
   * Get patient's triage history
   */
  async getPatientHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'TENANT_REQUIRED');
      }

      const { patientId } = req.params;
      const query = TriageHistoryQuerySchema.parse(req.query);

      const result = await triageService.getPatientTriageHistory(tenantId, patientId, {
        limit: query.limit,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return sendSuccess(res, result, 'Patient triage history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/triage/suggest-level
   * Get AI-suggested triage level
   */
  async suggestTriageLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = SuggestLevelSchema.parse(req.body);

      const suggestion = await triageService.suggestTriageLevel(
        {
          bpSystolic: data.vitalSigns.bpSystolic,
          bpDiastolic: data.vitalSigns.bpDiastolic,
          temperature: data.vitalSigns.temperature,
          temperatureSite: data.vitalSigns.temperatureSite?.toLowerCase() as any,
          pulseRate: data.vitalSigns.pulseRate,
          respiratoryRate: data.vitalSigns.respiratoryRate,
          spo2: data.vitalSigns.spo2,
          weight: data.vitalSigns.weight,
          height: data.vitalSigns.height,
          painScale: data.painScale,
        },
        data.chiefComplaint,
        data.patientAge
      );

      return sendSuccess(res, suggestion, 'Triage level suggestion generated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/triage/analytics
   * Get triage analytics
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'TENANT_REQUIRED');
      }

      const query = TriageAnalyticsQuerySchema.parse(req.query);

      const result = await triageService.getAnalytics(
        tenantId,
        new Date(query.dateFrom),
        new Date(query.dateTo),
        query.nurseId
      );

      return sendSuccess(res, result, 'Triage analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const triageController = new TriageController();
