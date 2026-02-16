import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { sampleService } from './sample.service';
import { resultsService } from './results.service';
import { labReportService } from './report.service';

const router = Router();

router.use(authenticate);

// ==================== WORKLIST ====================

router.get('/worklist', requirePermission('VIEW_LAB_RESULTS', 'ENTER_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, priority } = req.query;
    
    const worklist = await sampleService.getLabWorklist(
      user.tenantId,
      user.currentBranchId || user.primaryBranchId,
      status as string,
      priority as string
    );
    
    res.json({ success: true, data: worklist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/worklist/stats', requirePermission('VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const stats = await sampleService.getWorklistStats(
      user.tenantId,
      user.currentBranchId || user.primaryBranchId
    );
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SAMPLE COLLECTION ====================

router.post('/samples/collect', requirePermission('COLLECT_SAMPLE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { orderId, orderItemId, patientId, sampleType, collectionSite, volume, notes } = req.body;
    
    if (!orderId || !orderItemId || !patientId) {
      return res.status(400).json({ success: false, error: 'orderId, orderItemId, and patientId are required' });
    }
    
    const sample = await sampleService.collectSample(
      user.tenantId,
      user.currentBranchId || user.primaryBranchId || '',
      user.userId,
      { orderId, orderItemId, patientId, sampleType, collectionSite, volume, notes }
    );
    
    res.status(201).json({ success: true, data: sample });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/samples/:sampleNumber', requirePermission('VIEW_LAB_RESULTS', 'COLLECT_SAMPLE'), async (req: AuthRequest, res: Response) => {
  try {
    const { sampleNumber } = req.params;
    const sample = await sampleService.getSampleByNumber(sampleNumber);
    
    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }
    
    res.json({ success: true, data: sample });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/samples/:id/receive', requirePermission('RECEIVE_SAMPLE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { condition } = req.body;
    
    const result = await sampleService.receiveSample(id, user.userId, condition);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/samples/:id/reject', requirePermission('REJECT_SAMPLE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ success: false, error: 'rejectionReason is required' });
    }
    
    const result = await sampleService.rejectSample(id, user.userId, rejectionReason);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RESULTS ====================

router.post('/results', requirePermission('ENTER_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { orderItemId, result, resultValue, unit, notes } = req.body;
    
    if (!orderItemId) {
      return res.status(400).json({ success: false, error: 'orderItemId is required' });
    }
    
    const item = await resultsService.enterResult(
      user.tenantId,
      user.userId,
      { orderItemId, result, resultValue, unit, notes }
    );
    
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/results/batch', requirePermission('ENTER_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { results } = req.body;
    
    if (!results || results.length === 0) {
      return res.status(400).json({ success: false, error: 'results array is required' });
    }
    
    const result = await resultsService.batchEnterResults(user.tenantId, user.userId, results);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[BATCH_RESULTS_ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enter panel test results (multiple parameters)
router.post('/results/panel', requirePermission('ENTER_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { orderItemId, subResults } = req.body;
    
    if (!orderItemId || !subResults || subResults.length === 0) {
      return res.status(400).json({ success: false, error: 'orderItemId and subResults are required' });
    }
    
    const result = await resultsService.enterPanelResults(
      user.tenantId,
      user.userId,
      orderItemId,
      subResults
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[PANEL_RESULTS_ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/results/:orderItemId/verify', requirePermission('VERIFY_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { orderItemId } = req.params;
    
    const result = await resultsService.verifyResult(orderItemId, user.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/:orderId/results', requirePermission('VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const results = await resultsService.getOrderResults(orderId);
    
    if (!results) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CRITICAL VALUES ====================

router.get('/critical-values', requirePermission('VIEW_CRITICAL_VALUES', 'VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { all } = req.query;
    
    const alerts = await resultsService.getCriticalAlerts(user.tenantId, all !== 'true');
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/critical-values/:id/acknowledge', requirePermission('ACKNOWLEDGE_CRITICAL_VALUE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { notes } = req.body;
    
    const alert = await resultsService.acknowledgeCriticalAlert(id, user.userId, notes);
    res.json({ success: true, data: alert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PATIENT HISTORY ====================

router.get('/patient/:patientId/history', requirePermission('VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { limit } = req.query;
    
    const history = await resultsService.getPatientLabHistory(
      patientId,
      limit ? parseInt(limit as string) : 20
    );
    
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPORTS ====================

router.get('/orders/:orderId/report', requirePermission('VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const html = await labReportService.generateReportHTML(orderId);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/:orderId/report-data', requirePermission('VIEW_LAB_RESULTS'), async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const data = await labReportService.getReportData(orderId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
