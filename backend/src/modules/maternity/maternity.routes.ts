import { Router, Response } from 'express';
import { maternityService } from './maternity.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// ==================== PREGNANCIES ====================

router.get('/pregnancies', async (req: any, res: Response) => {
  try {
    const { status, patientId, riskLevel, page, limit } = req.query;
    const result = await maternityService.getPregnancies(req.tenantId!, {
      status: status as string, patientId: patientId as string,
      riskLevel: riskLevel as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/pregnancies/:id', async (req: any, res: Response) => {
  try {
    const pregnancy = await maternityService.getPregnancyById(req.params.id);
    if (!pregnancy) return res.status(404).json({ success: false, error: 'Pregnancy not found' });
    res.json({ success: true, data: pregnancy });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/pregnancies', async (req: any, res: Response) => {
  try {
    const pregnancy = await maternityService.createPregnancy(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: pregnancy });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/pregnancies/:id', async (req: any, res: Response) => {
  try {
    const pregnancy = await maternityService.updatePregnancy(req.params.id, req.body);
    res.json({ success: true, data: pregnancy });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== ANC VISITS ====================

router.get('/pregnancies/:pregnancyId/anc', async (req: any, res: Response) => {
  try {
    const visits = await maternityService.getANCVisits(req.params.pregnancyId);
    res.json({ success: true, data: visits });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/pregnancies/:pregnancyId/anc', async (req: any, res: Response) => {
  try {
    const visit = await maternityService.createANCVisit(req.params.pregnancyId, req.body);
    res.status(201).json({ success: true, data: visit });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== DELIVERY ====================

router.post('/pregnancies/:pregnancyId/delivery', async (req: any, res: Response) => {
  try {
    const delivery = await maternityService.createDeliveryRecord(req.params.pregnancyId, req.tenantId!, req.body);
    res.status(201).json({ success: true, data: delivery });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== NEWBORN ====================

router.post('/deliveries/:deliveryId/newborn', async (req: any, res: Response) => {
  try {
    const newborn = await maternityService.createNewbornRecord(req.params.deliveryId, req.tenantId!, req.body);
    res.status(201).json({ success: true, data: newborn });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== POSTNATAL ====================

router.post('/pregnancies/:pregnancyId/postnatal', async (req: any, res: Response) => {
  try {
    const visit = await maternityService.createPostnatalVisit(req.params.pregnancyId, req.body);
    res.status(201).json({ success: true, data: visit });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== DASHBOARD ====================

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const stats = await maternityService.getDashboardStats(req.tenantId!);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
