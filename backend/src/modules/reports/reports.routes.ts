import { Router, Response } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';
import { analyticsService } from './analytics.service.js';

const router: Router = Router();
const reportsController = new ReportsController();

router.use(authenticate);
router.use(tenantGuard);

// Organization-wide reports (admin only)
router.get('/organization/summary', reportsController.getOrganizationSummary);
router.get('/branches/activity', reportsController.getBranchActivitySummary);

// Branch-specific reports
router.get('/branches/:branchId', reportsController.getBranchReport);

// Patient activity across branches
router.get('/patients/:patientId/branch-activity', reportsController.getPatientBranchActivity);

// Audit logs
router.get('/audit-logs', reportsController.getAuditLogs);

// ==================== ANALYTICS ENDPOINTS ====================

router.get('/analytics/executive', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getExecutiveSummary(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/analytics/revenue', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getRevenueAnalytics(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/analytics/clinical', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getClinicalAnalytics(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/analytics/pharmacy', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getPharmacyAnalytics(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/analytics/lab', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getLabAnalytics(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/analytics/appointments', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getAppointmentAnalytics(
      req.tenantId!, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
