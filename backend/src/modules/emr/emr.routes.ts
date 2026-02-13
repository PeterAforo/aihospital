import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { encounterService } from './encounter.service';
import { icd10Service } from './icd10.service';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== ICD-10 ROUTES ====================

/**
 * Search ICD-10 codes
 * GET /api/emr/icd10/search?q=malaria&limit=10
 */
router.get('/icd10/search', async (req, res) => {
  try {
    const { q, limit, ghanaOnly, chapter } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter "q" is required' 
      });
    }

    const results = await icd10Service.search(q, {
      limit: limit ? parseInt(limit as string) : 10,
      ghanaCommonOnly: ghanaOnly === 'true',
      chapter: chapter ? parseInt(chapter as string) : undefined,
    });

    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('ICD-10 search error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Ghana common diagnoses
 * GET /api/emr/icd10/ghana-common
 */
router.get('/icd10/ghana-common', async (req, res) => {
  try {
    const results = await icd10Service.getGhanaCommonDiagnoses();
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Ghana common diagnoses error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get doctor's favorite diagnoses
 * GET /api/emr/icd10/favorites
 */
router.get('/icd10/favorites', async (req, res) => {
  try {
    const doctorId = (req as any).user.userId;
    const results = await icd10Service.getDoctorFavorites(doctorId);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Doctor favorites error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get doctor's recently used diagnoses
 * GET /api/emr/icd10/recent
 */
router.get('/icd10/recent', async (req, res) => {
  try {
    const doctorId = (req as any).user.userId;
    const results = await icd10Service.getDoctorRecentlyUsed(doctorId);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Recent diagnoses error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Suggest diagnoses from chief complaint
 * GET /api/emr/icd10/suggest?complaint=fever
 */
router.get('/icd10/suggest', async (req, res) => {
  try {
    const { complaint } = req.query;
    
    if (!complaint || typeof complaint !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter "complaint" is required' 
      });
    }

    const results = await icd10Service.suggestFromChiefComplaint(complaint);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Suggest diagnoses error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ENCOUNTER ROUTES ====================

/**
 * Create new encounter
 * POST /api/emr/encounters
 */
router.post('/encounters', requirePermission('ENCOUNTER_CREATE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { patientId, appointmentId, encounterType, template } = req.body;

    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'patientId is required' 
      });
    }

    const result = await encounterService.createEncounter(
      user.tenantId,
      user.currentBranchId || user.primaryBranchId,
      user.userId,
      user.departmentId || null,
      { patientId, appointmentId, encounterType, template }
    );

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Create encounter error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get encounter by ID
 * GET /api/emr/encounters/:id
 */
router.get('/encounters/:id', requirePermission('ENCOUNTER_READ'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await encounterService.getEncounter(id, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Get encounter error:', error);
    if (error.message === 'Encounter not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update encounter
 * PUT /api/emr/encounters/:id
 */
router.put('/encounters/:id', requirePermission('ENCOUNTER_UPDATE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await encounterService.updateEncounter(
      id,
      user.tenantId,
      user.userId,
      req.body
    );

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Update encounter error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('Cannot edit')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add diagnosis to encounter
 * POST /api/emr/encounters/:id/diagnoses
 */
router.post('/encounters/:id/diagnoses', requirePermission('ENCOUNTER_UPDATE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { icd10Code, icd10Description, diagnosisType, status, onsetDate, notes } = req.body;

    if (!icd10Code || !icd10Description || !diagnosisType) {
      return res.status(400).json({ 
        success: false, 
        error: 'icd10Code, icd10Description, and diagnosisType are required' 
      });
    }

    const result = await encounterService.addDiagnosis(id, user.tenantId, {
      icd10Code,
      icd10Description,
      diagnosisType,
      status,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      notes,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Add diagnosis error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Remove diagnosis from encounter
 * DELETE /api/emr/encounters/:id/diagnoses/:diagnosisId
 */
router.delete('/encounters/:id/diagnoses/:diagnosisId', requirePermission('ENCOUNTER_UPDATE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id, diagnosisId } = req.params;

    await encounterService.removeDiagnosis(id, diagnosisId, user.tenantId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Remove diagnosis error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Complete encounter
 * POST /api/emr/encounters/:id/complete
 */
router.post('/encounters/:id/complete', requirePermission('ENCOUNTER_UPDATE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await encounterService.completeEncounter(id, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Complete encounter error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Sign encounter
 * POST /api/emr/encounters/:id/sign
 */
router.post('/encounters/:id/sign', requirePermission('ENCOUNTER_SIGN'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await encounterService.signEncounter(id, user.tenantId, user.userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Sign encounter error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('already signed') || error.message.includes('must be completed')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get patient encounter history
 * GET /api/emr/encounters/patient/:patientId
 */
router.get('/encounters/patient/:patientId', requirePermission('ENCOUNTER_READ'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { patientId } = req.params;
    const { limit, status, dateFrom, dateTo } = req.query;

    const result = await encounterService.getPatientEncounters(patientId, user.tenantId, {
      limit: limit ? parseInt(limit as string) : 20,
      status: status as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Get patient encounters error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
