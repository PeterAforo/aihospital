import { Router, Response } from 'express';
import { hrService } from './hr.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// Staff Profiles
router.get('/staff', async (req: any, res: Response) => {
  try {
    const { department, employmentType, search, page, limit } = req.query;
    const result = await hrService.getStaffProfiles(req.tenantId!, {
      department: department as string, employmentType: employmentType as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/staff/:id', async (req: any, res: Response) => {
  try {
    const profile = await hrService.getStaffProfileById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Staff profile not found' });
    res.json({ success: true, data: profile });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/staff', async (req: any, res: Response) => {
  try {
    const profile = await hrService.createStaffProfile(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: profile });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/staff/:id', async (req: any, res: Response) => {
  try {
    const profile = await hrService.updateStaffProfile(req.params.id, req.body);
    res.json({ success: true, data: profile });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Leave
router.get('/leave', async (req: any, res: Response) => {
  try {
    const { status, page, limit } = req.query;
    const result = await hrService.getLeaveRequests(req.tenantId!, {
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/leave/:staffProfileId', async (req: any, res: Response) => {
  try {
    const request = await hrService.createLeaveRequest(req.params.staffProfileId, req.tenantId!, req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/leave/:id/status', async (req: any, res: Response) => {
  try {
    const { status, ...rest } = req.body;
    const request = await hrService.updateLeaveStatus(req.params.id, status, rest);
    res.json({ success: true, data: request });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Payroll
router.get('/payroll', async (req: any, res: Response) => {
  try {
    const { period, status, page, limit } = req.query;
    const result = await hrService.getPayrollRecords(req.tenantId!, {
      period: period as string, status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/payroll/generate', async (req: any, res: Response) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ success: false, error: 'period is required' });
    const result = await hrService.generatePayroll(req.tenantId!, period);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/payroll/approve', async (req: any, res: Response) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ success: false, error: 'period is required' });
    const result = await hrService.approvePayroll(req.tenantId!, period, req.user?.id);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Dashboard
router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const stats = await hrService.getDashboardStats(req.tenantId!);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
