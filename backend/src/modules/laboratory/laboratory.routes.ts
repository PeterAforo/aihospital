import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { prisma } from '../../common/utils/prisma';
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
      user.branchId,
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
      user.branchId
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
      user.branchId || '',
      user.userId,
      { orderId, orderItemId, patientId, sampleType, collectionSite, volume, notes }
    );
    
    res.status(201).json({ success: true, data: sample });
  } catch (error: any) {
    console.error('[LAB_SAMPLE_COLLECT] Error:', error.message, error.stack?.slice(0, 500));
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

// ==================== SEED PANEL TEST PARAMETERS ====================

const PANEL_DEFINITIONS: Record<string, { name: string; code: string; unit: string; normalRange: string }[]> = {
  FBC: [
    { name: 'White Blood Cell Count', code: 'WBC', unit: '10^9/L', normalRange: '4.0-11.0' },
    { name: 'Red Blood Cell Count', code: 'RBC', unit: '10^12/L', normalRange: '4.5-5.5' },
    { name: 'Hemoglobin', code: 'HGB', unit: 'g/dL', normalRange: '12.0-17.0' },
    { name: 'Hematocrit', code: 'HCT', unit: '%', normalRange: '36-48' },
    { name: 'Platelet Count', code: 'PLT', unit: '10^9/L', normalRange: '150-400' },
    { name: 'Mean Corpuscular Volume', code: 'MCV', unit: 'fL', normalRange: '80-100' },
    { name: 'Mean Corpuscular Hemoglobin', code: 'MCH', unit: 'pg', normalRange: '27-33' },
    { name: 'Mean Corpuscular Hemoglobin Concentration', code: 'MCHC', unit: 'g/dL', normalRange: '32-36' },
    { name: 'Red Cell Distribution Width', code: 'RDW', unit: '%', normalRange: '11.5-14.5' },
    { name: 'Neutrophils', code: 'NEUT', unit: '%', normalRange: '40-70' },
    { name: 'Lymphocytes', code: 'LYMPH', unit: '%', normalRange: '20-40' },
    { name: 'Monocytes', code: 'MONO', unit: '%', normalRange: '2-8' },
    { name: 'Eosinophils', code: 'EOS', unit: '%', normalRange: '1-4' },
    { name: 'Basophils', code: 'BASO', unit: '%', normalRange: '0-1' },
  ],
  LFT: [
    { name: 'Alanine Aminotransferase', code: 'ALT', unit: 'U/L', normalRange: '7-56' },
    { name: 'Aspartate Aminotransferase', code: 'AST', unit: 'U/L', normalRange: '10-40' },
    { name: 'Alkaline Phosphatase', code: 'ALP', unit: 'U/L', normalRange: '44-147' },
    { name: 'Total Bilirubin', code: 'TBIL', unit: 'mg/dL', normalRange: '0.1-1.2' },
    { name: 'Direct Bilirubin', code: 'DBIL', unit: 'mg/dL', normalRange: '0.0-0.3' },
    { name: 'Albumin', code: 'ALB', unit: 'g/dL', normalRange: '3.5-5.0' },
    { name: 'Total Protein', code: 'TP', unit: 'g/dL', normalRange: '6.0-8.3' },
    { name: 'Gamma-Glutamyl Transferase', code: 'GGT', unit: 'U/L', normalRange: '9-48' },
  ],
  RFT: [
    { name: 'Blood Urea Nitrogen', code: 'BUN', unit: 'mg/dL', normalRange: '7-20' },
    { name: 'Creatinine', code: 'CREAT', unit: 'mg/dL', normalRange: '0.7-1.3' },
    { name: 'Sodium', code: 'NA', unit: 'mmol/L', normalRange: '136-145' },
    { name: 'Potassium', code: 'K', unit: 'mmol/L', normalRange: '3.5-5.1' },
    { name: 'Chloride', code: 'CL', unit: 'mmol/L', normalRange: '98-106' },
    { name: 'Bicarbonate', code: 'HCO3', unit: 'mmol/L', normalRange: '22-29' },
    { name: 'Uric Acid', code: 'UA', unit: 'mg/dL', normalRange: '3.5-7.2' },
    { name: 'eGFR', code: 'EGFR', unit: 'mL/min/1.73m2', normalRange: '>60' },
  ],
  LIPID: [
    { name: 'Total Cholesterol', code: 'TCHOL', unit: 'mg/dL', normalRange: '<200' },
    { name: 'HDL Cholesterol', code: 'HDL', unit: 'mg/dL', normalRange: '>40' },
    { name: 'LDL Cholesterol', code: 'LDL', unit: 'mg/dL', normalRange: '<130' },
    { name: 'Triglycerides', code: 'TG', unit: 'mg/dL', normalRange: '<150' },
    { name: 'VLDL Cholesterol', code: 'VLDL', unit: 'mg/dL', normalRange: '5-40' },
  ],
  WIDAL: [
    { name: 'Salmonella Typhi O', code: 'STO', unit: 'titre', normalRange: '<1:80' },
    { name: 'Salmonella Typhi H', code: 'STH', unit: 'titre', normalRange: '<1:80' },
    { name: 'Salmonella Paratyphi AO', code: 'SPAO', unit: 'titre', normalRange: '<1:80' },
    { name: 'Salmonella Paratyphi AH', code: 'SPAH', unit: 'titre', normalRange: '<1:80' },
    { name: 'Salmonella Paratyphi BO', code: 'SPBO', unit: 'titre', normalRange: '<1:80' },
    { name: 'Salmonella Paratyphi BH', code: 'SPBH', unit: 'titre', normalRange: '<1:80' },
  ],
};

router.post('/seed-panel-parameters', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let seededCount = 0;
    const results: string[] = [];

    for (const [testCode, params] of Object.entries(PANEL_DEFINITIONS)) {
      // Find the test by code for this tenant (or global)
      const test = await prisma.labTest.findFirst({
        where: {
          code: { equals: testCode, mode: 'insensitive' },
          OR: [{ tenantId: user.tenantId }, { tenantId: null }],
        },
      });

      if (!test) {
        results.push(`${testCode}: test not found, skipped`);
        continue;
      }

      // Check existing params
      const existingParams = await prisma.labTestParameter.findMany({
        where: { testId: test.id },
      });
      const existingCodes = new Set(existingParams.map(p => p.code?.toUpperCase()));

      let added = 0;
      for (let i = 0; i < params.length; i++) {
        const p = params[i];
        if (existingCodes.has(p.code.toUpperCase())) continue;

        await prisma.labTestParameter.create({
          data: {
            testId: test.id,
            name: p.name,
            code: p.code,
            unit: p.unit,
            normalRange: p.normalRange,
            sortOrder: i + 1,
            isActive: true,
          },
        });
        added++;
        seededCount++;
      }
      results.push(`${testCode} (${test.name}): ${added} params added, ${existingParams.length} already existed`);
    }

    res.json({ success: true, data: { seededCount, details: results } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
