import { Router, Response } from 'express';
import { emergencyService } from './emergency.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';
import { erWebSocketService } from '../../common/services/er-websocket.service';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/visits', async (req: any, res: Response) => {
  try {
    const { status, triageCategory, isTrauma, page, limit } = req.query;
    const result = await emergencyService.getERVisits(req.tenantId!, {
      status: status as string, triageCategory: triageCategory as string,
      isTrauma: isTrauma === 'true' ? true : isTrauma === 'false' ? false : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/board', async (req: any, res: Response) => {
  try {
    const board = await emergencyService.getActiveBoard(req.tenantId!);
    res.json({ success: true, data: board });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const stats = await emergencyService.getDashboardStats(req.tenantId!);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/visits/:id', async (req: any, res: Response) => {
  try {
    const visit = await emergencyService.getERVisitById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, error: 'ER visit not found' });
    res.json({ success: true, data: visit });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/visits', async (req: any, res: Response) => {
  try {
    const visit = await emergencyService.createERVisit(req.tenantId!, req.body);
    erWebSocketService.notifyPatientAdded(req.tenantId!, visit);
    res.status(201).json({ success: true, data: visit });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/visits/:id/triage', async (req: any, res: Response) => {
  try {
    const visit = await emergencyService.triageERVisit(req.params.id, req.body);
    erWebSocketService.notifyTriageUpdate(req.tenantId!, visit);
    res.json({ success: true, data: visit });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/visits/:id/status', async (req: any, res: Response) => {
  try {
    const { status, ...rest } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const visit = await emergencyService.updateERVisitStatus(req.params.id, status, rest);
    if (status === 'DISCHARGED' || status === 'TRANSFERRED') {
      erWebSocketService.notifyPatientDischarged(req.tenantId!, req.params.id);
    } else {
      erWebSocketService.notifyPatientUpdated(req.tenantId!, visit);
    }
    res.json({ success: true, data: visit });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/visits/:id/notes', async (req: any, res: Response) => {
  try {
    const note = await emergencyService.addERNote(req.params.id, req.body);
    res.status(201).json({ success: true, data: note });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

export default router;
