import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

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

export default router;
