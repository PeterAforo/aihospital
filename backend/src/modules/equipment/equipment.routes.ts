import { Router, Response } from 'express';
import { equipmentService } from './equipment.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: any, res: Response) => {
  try {
    const { status, category, search, page, limit } = req.query;
    const result = await equipmentService.getEquipment(req.tenantId!, {
      status: status as string, category: category as string, search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const stats = await equipmentService.getDashboardStats(req.tenantId!);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/:id', async (req: any, res: Response) => {
  try {
    const eq = await equipmentService.getEquipmentById(req.params.id);
    if (!eq) return res.status(404).json({ success: false, error: 'Equipment not found' });
    res.json({ success: true, data: eq });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/', async (req: any, res: Response) => {
  try {
    const eq = await equipmentService.createEquipment(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: eq });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/:id', async (req: any, res: Response) => {
  try {
    const eq = await equipmentService.updateEquipment(req.params.id, req.body);
    res.json({ success: true, data: eq });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/:equipmentId/maintenance', async (req: any, res: Response) => {
  try {
    const log = await equipmentService.createMaintenanceLog(req.params.equipmentId, req.tenantId!, req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/maintenance/:logId', async (req: any, res: Response) => {
  try {
    const log = await equipmentService.updateMaintenanceLog(req.params.logId, req.body);
    res.json({ success: true, data: log });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

export default router;
