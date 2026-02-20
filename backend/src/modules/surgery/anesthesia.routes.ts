import { Router, Request, Response } from 'express';
import { anesthesiaService } from './anesthesia.service.js';

const router = Router();

// Create anesthesia record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...data } = req.body;
    if (!tenantId || !data.surgeryId || !data.patientId || !data.anesthetistId) {
      return res.status(400).json({ error: 'tenantId, surgeryId, patientId, and anesthetistId required' });
    }
    const record = await anesthesiaService.createRecord(tenantId, data);
    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// List anesthesia records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, surgeryId, patientId, anesthetistId, status, page, limit } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const result = await anesthesiaService.getRecords(tenantId as string, {
      surgeryId: surgeryId as string,
      patientId: patientId as string,
      anesthetistId: anesthetistId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get single record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await anesthesiaService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Update record
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const record = await anesthesiaService.updateRecord(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Start anesthesia
router.patch('/:id/start', async (req: Request, res: Response) => {
  try {
    const record = await anesthesiaService.startAnesthesia(req.params.id);
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Complete anesthesia
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const record = await anesthesiaService.completeAnesthesia(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Add vital sign reading
router.post('/:id/vitals', async (req: Request, res: Response) => {
  try {
    const record = await anesthesiaService.addVitalSign(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Discharge from PACU
router.patch('/:id/pacu-discharge', async (req: Request, res: Response) => {
  try {
    const { pacuDischargeScore, postOpNotes } = req.body;
    if (pacuDischargeScore === undefined) return res.status(400).json({ error: 'pacuDischargeScore required' });
    const record = await anesthesiaService.dischargePACU(req.params.id, { pacuDischargeScore, postOpNotes });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
