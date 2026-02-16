import { Router, Response } from 'express';
import { inpatientService } from './inpatient.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// ==================== DASHBOARD ====================

router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const { branchId } = req.query;
    const stats = await inpatientService.getDashboardStats(user.tenantId, branchId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WARD MANAGEMENT ====================

router.get('/wards', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const { branchId } = req.query;
    const wards = await inpatientService.listWards(user.tenantId, branchId as string);
    res.json({ success: true, data: wards });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/wards', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const ward = await inpatientService.createWard(user.tenantId, req.body);
    res.status(201).json({ success: true, data: ward });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/wards/:wardId', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const ward = await inpatientService.updateWard(user.tenantId, req.params.wardId, req.body);
    res.json({ success: true, data: ward });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== BED MANAGEMENT ====================

router.get('/wards/:wardId/beds', async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const beds = await inpatientService.listBeds(req.params.wardId, status as any);
    res.json({ success: true, data: beds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/wards/:wardId/beds', async (req: any, res: Response) => {
  try {
    const bed = await inpatientService.createBed(req.params.wardId, req.body);
    res.status(201).json({ success: true, data: bed });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/wards/:wardId/beds/bulk', async (req: any, res: Response) => {
  try {
    const result = await inpatientService.createBedsBulk(req.params.wardId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/beds/:bedId/status', async (req: any, res: Response) => {
  try {
    const bed = await inpatientService.updateBedStatus(req.params.bedId, req.body.status);
    res.json({ success: true, data: bed });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/occupancy', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const { branchId } = req.query;
    const summary = await inpatientService.getOccupancySummary(user.tenantId, branchId as string);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADMISSIONS ====================

router.get('/admissions', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const { branchId, wardId, status, patientId, search, page, limit } = req.query;
    const result = await inpatientService.listAdmissions(user.tenantId, {
      branchId: branchId as string,
      wardId: wardId as string,
      status: status as any,
      patientId: patientId as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admissions/:admissionId', async (req: any, res: Response) => {
  try {
    const admission = await inpatientService.getAdmissionById(req.params.admissionId);
    res.json({ success: true, data: admission });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.post('/admissions', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const admission = await inpatientService.admitPatient(user.tenantId, user.id, req.body);
    res.status(201).json({ success: true, data: admission });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== DISCHARGE ====================

router.post('/admissions/:admissionId/discharge', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const result = await inpatientService.dischargePatient(req.params.admissionId, user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== BED TRANSFER ====================

router.post('/admissions/:admissionId/transfer', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const result = await inpatientService.transferBed(req.params.admissionId, user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== NURSING NOTES ====================

router.get('/admissions/:admissionId/nursing-notes', async (req: any, res: Response) => {
  try {
    const { page, limit } = req.query;
    const result = await inpatientService.listNursingNotes(
      req.params.admissionId,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admissions/:admissionId/nursing-notes', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const note = await inpatientService.addNursingNote(req.params.admissionId, user.id, req.body);
    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== WARD ROUNDS ====================

router.post('/admissions/:admissionId/ward-rounds', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const round = await inpatientService.addWardRound(req.params.admissionId, user.id, req.body);
    res.status(201).json({ success: true, data: round });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== VITAL CHARTS ====================

router.get('/admissions/:admissionId/vitals', async (req: any, res: Response) => {
  try {
    const { limit } = req.query;
    const vitals = await inpatientService.getVitalCharts(req.params.admissionId, limit ? parseInt(limit as string) : 48);
    res.json({ success: true, data: vitals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admissions/:admissionId/vitals', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const vital = await inpatientService.recordVitals(req.params.admissionId, user.id, req.body);
    res.status(201).json({ success: true, data: vital });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== MEDICATION ADMINISTRATION ====================

router.get('/admissions/:admissionId/medications', async (req: any, res: Response) => {
  try {
    const meds = await inpatientService.getMedicationSchedule(req.params.admissionId);
    res.json({ success: true, data: meds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admissions/:admissionId/medications', async (req: any, res: Response) => {
  try {
    const med = await inpatientService.addMedication(req.params.admissionId, req.body);
    res.status(201).json({ success: true, data: med });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/medications/:medId/administer', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const med = await inpatientService.administerMedication(req.params.medId, user.id, req.body || {});
    res.json({ success: true, data: med });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/medications/:medId/refuse', async (req: any, res: Response) => {
  try {
    const med = await inpatientService.refuseMedication(req.params.medId, req.body);
    res.json({ success: true, data: med });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== CARE PLANS ====================

router.post('/admissions/:admissionId/care-plans', async (req: any, res: Response) => {
  try {
    const user = req.user!;
    const plan = await inpatientService.addCarePlan(req.params.admissionId, user.id, req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/care-plans/:planId', async (req: any, res: Response) => {
  try {
    const plan = await inpatientService.updateCarePlan(req.params.planId, req.body);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
