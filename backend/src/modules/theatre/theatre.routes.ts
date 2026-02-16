import { Router, Response } from 'express';
import { theatreService } from './theatre.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// ==================== THEATRES ====================

router.get('/theatres', async (req: any, res: Response) => {
  try {
    const { status, branchId } = req.query;
    const theatres = await theatreService.getTheatres(req.tenantId!, { status: status as string, branchId: branchId as string });
    res.json({ success: true, data: theatres });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/theatres', async (req: any, res: Response) => {
  try {
    const theatre = await theatreService.createTheatre(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: theatre });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/theatres/:id', async (req: any, res: Response) => {
  try {
    const theatre = await theatreService.updateTheatre(req.params.id, req.body);
    res.json({ success: true, data: theatre });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/theatres/:id/status', async (req: any, res: Response) => {
  try {
    const { status } = req.body;
    const theatre = await theatreService.updateTheatreStatus(req.params.id, status);
    res.json({ success: true, data: theatre });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== SURGERY TYPES ====================

router.get('/surgery-types', async (req: any, res: Response) => {
  try {
    const { category } = req.query;
    const types = await theatreService.getSurgeryTypes(req.tenantId!, category as string);
    res.json({ success: true, data: types });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/surgery-types', async (req: any, res: Response) => {
  try {
    const type = await theatreService.createSurgeryType(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: type });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/surgery-types/:id', async (req: any, res: Response) => {
  try {
    const type = await theatreService.updateSurgeryType(req.params.id, req.body);
    res.json({ success: true, data: type });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== SURGERIES ====================

router.get('/surgeries', async (req: any, res: Response) => {
  try {
    const { status, patientId, theatreId, urgency, startDate, endDate, page, limit } = req.query;
    const result = await theatreService.getSurgeries(req.tenantId!, {
      status: status as string, patientId: patientId as string,
      theatreId: theatreId as string, urgency: urgency as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/surgeries/:id', async (req: any, res: Response) => {
  try {
    const surgery = await theatreService.getSurgeryById(req.params.id);
    if (!surgery) return res.status(404).json({ success: false, error: 'Surgery not found' });
    res.json({ success: true, data: surgery });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/surgeries', async (req: any, res: Response) => {
  try {
    const surgery = await theatreService.createSurgery(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: surgery });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/surgeries/:id/status', async (req: any, res: Response) => {
  try {
    const { status, ...rest } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const surgery = await theatreService.updateSurgeryStatus(req.params.id, status, rest);
    res.json({ success: true, data: surgery });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/surgeries/:id', async (req: any, res: Response) => {
  try {
    const surgery = await theatreService.updateSurgery(req.params.id, req.body);
    res.json({ success: true, data: surgery });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== TEAM ====================

router.post('/surgeries/:surgeryId/team', async (req: any, res: Response) => {
  try {
    const member = await theatreService.addTeamMember(req.params.surgeryId, req.body);
    res.status(201).json({ success: true, data: member });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.delete('/team/:memberId', async (req: any, res: Response) => {
  try {
    await theatreService.removeTeamMember(req.params.memberId);
    res.json({ success: true, message: 'Team member removed' });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== CHECKLIST ====================

router.post('/surgeries/:surgeryId/checklist/init', async (req: any, res: Response) => {
  try {
    const items = await theatreService.initializeChecklist(req.params.surgeryId);
    res.status(201).json({ success: true, data: items });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/checklist/:itemId', async (req: any, res: Response) => {
  try {
    const { isChecked } = req.body;
    const item = await theatreService.updateChecklistItem(req.params.itemId, isChecked, req.user?.id || '');
    res.json({ success: true, data: item });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== SCHEDULE & DASHBOARD ====================

router.get('/schedule', async (req: any, res: Response) => {
  try {
    const { date, branchId } = req.query;
    const schedule = await theatreService.getSchedule(req.tenantId!, date ? new Date(date as string) : new Date(), branchId as string);
    res.json({ success: true, data: schedule });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const { branchId } = req.query;
    const stats = await theatreService.getDashboardStats(req.tenantId!, branchId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
