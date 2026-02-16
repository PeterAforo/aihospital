import { Router, Response } from 'express';
import { radiologyService } from './radiology.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// ==================== STUDY TYPES ====================

router.get('/study-types', async (req: any, res: Response) => {
  try {
    const { modality, isActive } = req.query;
    const types = await radiologyService.getStudyTypes(req.tenantId!, {
      modality: modality as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json({ success: true, data: types });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/study-types', async (req: any, res: Response) => {
  try {
    const type = await radiologyService.createStudyType(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: type });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/study-types/:id', async (req: any, res: Response) => {
  try {
    const type = await radiologyService.updateStudyType(req.params.id, req.body);
    res.json({ success: true, data: type });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== ORDERS ====================

router.get('/orders', async (req: any, res: Response) => {
  try {
    const { status, patientId, branchId, modality, urgency, startDate, endDate, page, limit } = req.query;
    const result = await radiologyService.getOrders(req.tenantId!, {
      status: status as string,
      patientId: patientId as string,
      branchId: branchId as string,
      modality: modality as string,
      urgency: urgency as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/orders/:id', async (req: any, res: Response) => {
  try {
    const order = await radiologyService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/orders', async (req: any, res: Response) => {
  try {
    const order = await radiologyService.createOrder(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/orders/:id/status', async (req: any, res: Response) => {
  try {
    const { status, ...rest } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const order = await radiologyService.updateOrderStatus(req.params.id, status, rest);
    res.json({ success: true, data: order });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== IMAGES ====================

router.get('/orders/:orderId/images', async (req: any, res: Response) => {
  try {
    const images = await radiologyService.getOrderImages(req.params.orderId);
    res.json({ success: true, data: images });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/orders/:orderId/images', async (req: any, res: Response) => {
  try {
    const image = await radiologyService.addImage(req.params.orderId, req.body);
    res.status(201).json({ success: true, data: image });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.delete('/images/:imageId', async (req: any, res: Response) => {
  try {
    await radiologyService.deleteImage(req.params.imageId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== REPORTS ====================

router.get('/orders/:orderId/report', async (req: any, res: Response) => {
  try {
    const report = await radiologyService.getReport(req.params.orderId);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/orders/:orderId/report', async (req: any, res: Response) => {
  try {
    const report = await radiologyService.createReport(req.params.orderId, req.body);
    res.status(201).json({ success: true, data: report });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/reports/:reportId', async (req: any, res: Response) => {
  try {
    const report = await radiologyService.updateReport(req.params.reportId, req.body);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== REPORT TEMPLATES ====================

router.get('/templates', async (req: any, res: Response) => {
  try {
    const { modality } = req.query;
    const templates = await radiologyService.getReportTemplates(req.tenantId!, modality as string);
    res.json({ success: true, data: templates });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/templates', async (req: any, res: Response) => {
  try {
    const template = await radiologyService.createReportTemplate(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/templates/:id', async (req: any, res: Response) => {
  try {
    const template = await radiologyService.updateReportTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// ==================== WORKLIST & DASHBOARD ====================

router.get('/worklist', async (req: any, res: Response) => {
  try {
    const { branchId } = req.query;
    const worklist = await radiologyService.getWorklist(req.tenantId!, branchId as string);
    res.json({ success: true, data: worklist });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const { branchId } = req.query;
    const stats = await radiologyService.getDashboardStats(req.tenantId!, branchId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
