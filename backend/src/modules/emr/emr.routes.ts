import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { encounterService } from './encounter.service';
import { icd10Service } from './icd10.service';
import { labOrderService } from './lab-order.service';
import { prescriptionService } from './prescription.service';
import { cdsService } from './cds.service';
import { prisma } from '../../common/utils/prisma';
import { validateAllVitalSigns, calculateBMI, calculatePulsePressure, calculateMAP, VitalSigns } from '../../common/utils/vital-signs-validators';

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
router.post('/encounters', requirePermission('CREATE_ENCOUNTER', 'TRIAGE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { patientId, appointmentId, encounterType, template } = req.body;

    console.log('[CREATE_ENCOUNTER] Request:', { patientId, appointmentId, encounterType, template });
    console.log('[CREATE_ENCOUNTER] User context:', { 
      userId: user.userId, 
      tenantId: user.tenantId, 
      currentBranchId: user.currentBranchId,
      primaryBranchId: user.primaryBranchId,
      departmentId: user.departmentId 
    });

    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'patientId is required' 
      });
    }

    // Ensure we have a branchId - fallback to appointment's branch if user has none
    let branchId = user.branchId;
    if (!branchId && appointmentId) {
      // Try to get branch from the appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { branchId: true },
      });
      if (appointment?.branchId) {
        branchId = appointment.branchId;
        console.log('[CREATE_ENCOUNTER] Using appointment branchId:', branchId);
      }
    }
    if (!branchId) {
      console.error('[CREATE_ENCOUNTER] No branchId available for user:', user.userId);
      return res.status(400).json({ 
        success: false, 
        error: 'User has no branch assigned. Please contact administrator.' 
      });
    }

    const result = await encounterService.createEncounter(
      user.tenantId,
      branchId,
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
router.get('/encounters/:id', requirePermission('VIEW_ENCOUNTER'), async (req: AuthRequest, res) => {
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
router.put('/encounters/:id', requirePermission('EDIT_ENCOUNTER'), async (req: AuthRequest, res) => {
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
 * Record vital signs during encounter
 * POST /api/emr/encounters/:id/vitals
 */
router.post('/encounters/:id/vitals', requirePermission('EDIT_ENCOUNTER', 'RECORD_VITALS'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const {
      bpSystolic, bpDiastolic, temperature, temperatureSite,
      pulseRate, pulseRhythm, respiratoryRate, spo2,
      weight, height, painScale, painLocation, painCharacter,
    } = req.body;

    // Verify encounter exists and belongs to tenant
    const encounter = await prisma.encounter.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { patient: { select: { dateOfBirth: true } } },
    });

    if (!encounter) {
      return res.status(404).json({ success: false, error: 'Encounter not found' });
    }

    if (encounter.status === 'SIGNED') {
      return res.status(403).json({ success: false, error: 'Cannot add vitals to a signed encounter' });
    }

    // Calculate patient age for age-specific validation
    const patientAge = encounter.patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(encounter.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;

    // Build vital signs object for validation
    const vitalSigns: VitalSigns = {};
    if (bpSystolic !== undefined) vitalSigns.bpSystolic = Number(bpSystolic);
    if (bpDiastolic !== undefined) vitalSigns.bpDiastolic = Number(bpDiastolic);
    if (temperature !== undefined) vitalSigns.temperature = Number(temperature);
    if (temperatureSite) vitalSigns.temperatureSite = temperatureSite.toLowerCase();
    if (pulseRate !== undefined) vitalSigns.pulseRate = Number(pulseRate);
    if (respiratoryRate !== undefined) vitalSigns.respiratoryRate = Number(respiratoryRate);
    if (spo2 !== undefined) vitalSigns.spo2 = Number(spo2);
    if (weight !== undefined) vitalSigns.weight = Number(weight);
    if (height !== undefined) vitalSigns.height = Number(height);
    if (painScale !== undefined) vitalSigns.painScale = Number(painScale);

    // Validate vital signs using the same validators as triage
    const validation = validateAllVitalSigns(vitalSigns, patientAge);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid vital signs: ${validation.errors.join(', ')}`,
        code: 'INVALID_VITAL_SIGNS',
      });
    }

    // Calculate derived values
    let bmi: number | null = null;
    if (vitalSigns.weight && vitalSigns.height) {
      const bmiResult = calculateBMI(vitalSigns.weight, vitalSigns.height);
      bmi = bmiResult?.bmi || null;
    }

    let pulsePressure: number | null = null;
    let meanArterialPressure: number | null = null;
    if (vitalSigns.bpSystolic && vitalSigns.bpDiastolic) {
      pulsePressure = calculatePulsePressure(vitalSigns.bpSystolic, vitalSigns.bpDiastolic);
      meanArterialPressure = calculateMAP(vitalSigns.bpSystolic, vitalSigns.bpDiastolic);
    }

    // Create vital signs history record
    const record = await prisma.vitalSignsHistory.create({
      data: {
        tenantId: user.tenantId,
        patientId: encounter.patientId,
        encounterId: id,
        recordedBy: user.userId,
        source: 'encounter',
        bpSystolic: vitalSigns.bpSystolic,
        bpDiastolic: vitalSigns.bpDiastolic,
        temperature: vitalSigns.temperature,
        temperatureSite: temperatureSite || null,
        pulseRate: vitalSigns.pulseRate,
        pulseRhythm: pulseRhythm || null,
        respiratoryRate: vitalSigns.respiratoryRate,
        spo2: vitalSigns.spo2,
        weight: vitalSigns.weight,
        height: vitalSigns.height,
        bmi,
        painScale: vitalSigns.painScale,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...record,
        pulsePressure,
        meanArterialPressure,
        warnings: validation.warnings,
      },
    });
  } catch (error: any) {
    console.error('Record vitals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get vital signs history for encounter
 * GET /api/emr/encounters/:id/vitals
 */
router.get('/encounters/:id/vitals', requirePermission('VIEW_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const encounter = await prisma.encounter.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, patientId: true },
    });

    if (!encounter) {
      return res.status(404).json({ success: false, error: 'Encounter not found' });
    }

    const vitals = await prisma.vitalSignsHistory.findMany({
      where: { encounterId: id },
      orderBy: { recordedAt: 'desc' },
    });

    return res.json({ success: true, data: vitals });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add diagnosis to encounter
 * POST /api/emr/encounters/:id/diagnoses
 */
router.post('/encounters/:id/diagnoses', requirePermission('EDIT_ENCOUNTER'), async (req: AuthRequest, res) => {
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
router.delete('/encounters/:id/diagnoses/:diagnosisId', requirePermission('EDIT_ENCOUNTER'), async (req: AuthRequest, res) => {
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
router.post('/encounters/:id/complete', requirePermission('EDIT_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await encounterService.completeEncounter(
      id, 
      user.tenantId, 
      user.branchId,
      user.userId
    );
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
router.post('/encounters/:id/sign', requirePermission('SIGN_ENCOUNTER'), async (req: AuthRequest, res) => {
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
router.get('/encounters/patient/:patientId', requirePermission('VIEW_ENCOUNTER'), async (req: AuthRequest, res) => {
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

// ==================== LAB ORDER ROUTES ====================

/**
 * Search lab tests
 * GET /api/emr/lab-tests/search?q=malaria
 */
router.get('/lab-tests/search', async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { q, limit } = req.query;
    
    const results = await labOrderService.searchTests(
      q as string,
      user.tenantId,
      limit ? parseInt(limit as string) : 20
    );
    
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Search lab tests error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create lab order
 * POST /api/emr/lab-orders
 */
router.post('/lab-orders', requirePermission('ORDER_LAB', 'CREATE_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { encounterId, patientId, priority, notes, tests } = req.body;

    if (!encounterId || !patientId || !tests || tests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'encounterId, patientId, and at least one test are required',
      });
    }

    const result = await labOrderService.createLabOrder(user.tenantId, user.userId, {
      encounterId,
      patientId,
      priority,
      notes,
      tests,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Create lab order error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get lab orders for encounter
 * GET /api/emr/encounters/:encounterId/lab-orders
 */
router.get('/encounters/:encounterId/lab-orders', requirePermission('VIEW_LAB_RESULTS', 'VIEW_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { encounterId } = req.params;

    const results = await labOrderService.getOrdersByEncounter(encounterId, user.tenantId);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Get lab orders error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cancel lab order
 * POST /api/emr/lab-orders/:id/cancel
 */
router.post('/lab-orders/:id/cancel', requirePermission('ORDER_LAB', 'CREATE_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await labOrderService.cancelOrder(id, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Cancel lab order error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('Can only cancel')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRESCRIPTION ROUTES ====================

/**
 * Search drugs
 * GET /api/emr/drugs/search?q=paracetamol
 */
router.get('/drugs/search', async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { q, limit } = req.query;
    
    const results = await prescriptionService.searchDrugs(
      q as string,
      user.tenantId,
      limit ? parseInt(limit as string) : 20
    );
    
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Search drugs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get prescription options (frequencies, durations)
 * GET /api/emr/prescription-options
 */
router.get('/prescription-options', async (req: AuthRequest, res) => {
  try {
    const frequencies = prescriptionService.getFrequencyOptions();
    const durations = prescriptionService.getDurationOptions();
    
    return res.json({ success: true, data: { frequencies, durations } });
  } catch (error: any) {
    console.error('Get prescription options error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Validate prescription (Clinical Decision Support)
 * POST /api/emr/prescriptions/validate
 */
router.post('/prescriptions/validate', requirePermission('PRESCRIBE', 'CREATE_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { patientId, drugIds } = req.body;

    if (!patientId || !drugIds || drugIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'patientId and drugIds are required',
      });
    }

    const result = await cdsService.validatePrescription(patientId, drugIds, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('CDS validation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create prescription
 * POST /api/emr/prescriptions
 */
router.post('/prescriptions', requirePermission('PRESCRIBE', 'CREATE_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { encounterId, patientId, notes, items, overrideAlerts } = req.body;

    if (!encounterId || !patientId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'encounterId, patientId, and at least one item are required',
      });
    }

    // Run CDS validation before creating
    const drugIds = items.map((i: any) => i.drugId);
    const validation = await cdsService.validatePrescription(patientId, drugIds, user.tenantId);

    if (!validation.safe && !overrideAlerts) {
      return res.status(422).json({
        success: false,
        error: 'Prescription blocked by clinical decision support',
        data: validation,
      });
    }

    // Log CDS alerts for audit trail
    if (validation.alerts.length > 0) {
      try {
        await cdsService.logAlerts(user.tenantId, patientId, validation.alerts, 'PRESCRIBING', encounterId);
      } catch (e) {
        console.warn('[CDS] Failed to log prescribing alerts:', e);
      }
    }

    const result = await prescriptionService.createPrescription(user.tenantId, user.userId, {
      encounterId,
      patientId,
      notes,
      items,
    });

    return res.status(201).json({ success: true, data: result, cdsAlerts: validation.alerts });
  } catch (error: any) {
    console.error('Create prescription error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get prescriptions for encounter
 * GET /api/emr/encounters/:encounterId/prescriptions
 */
router.get('/encounters/:encounterId/prescriptions', requirePermission('VIEW_PRESCRIPTION', 'VIEW_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { encounterId } = req.params;

    const results = await prescriptionService.getPrescriptionsByEncounter(encounterId, user.tenantId);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Get prescriptions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cancel prescription
 * POST /api/emr/prescriptions/:id/cancel
 */
router.post('/prescriptions/:id/cancel', requirePermission('PRESCRIBE', 'CREATE_ENCOUNTER'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await prescriptionService.cancelPrescription(id, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Cancel prescription error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('Can only cancel')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CDS ALERT MANAGEMENT ====================

/**
 * Validate dispensing (pharmacist safety check)
 * POST /api/emr/cds/validate-dispensing
 */
router.post('/cds/validate-dispensing', requirePermission('DISPENSE_MEDICATION', 'VIEW_PRESCRIPTION_QUEUE'), async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { prescriptionId } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ success: false, error: 'prescriptionId is required' });
    }

    const result = await cdsService.validateDispensing(prescriptionId, user.tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Record CDS alert override
 * POST /api/emr/cds/override
 */
router.post('/cds/override', async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { alertLogId, reason } = req.body;

    if (!alertLogId || !reason) {
      return res.status(400).json({ success: false, error: 'alertLogId and reason are required' });
    }

    await cdsService.recordOverride(alertLogId, user.userId, reason);
    return res.json({ success: true, message: 'Override recorded' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get CDS alert history
 * GET /api/emr/cds/alerts?patientId=&alertType=&startDate=&endDate=&limit=
 */
router.get('/cds/alerts', async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { patientId, alertType, startDate, endDate, limit } = req.query;

    const alerts = await cdsService.getAlertHistory(
      user.tenantId,
      patientId as string,
      alertType as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    return res.json({ success: true, data: alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get CDS override statistics
 * GET /api/emr/cds/override-stats?startDate=&endDate=
 */
router.get('/cds/override-stats', async (req: AuthRequest, res) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate } = req.query;

    const stats = await cdsService.getOverrideStats(
      user.tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List drug interactions database
 * GET /api/emr/cds/interactions?activeOnly=true
 */
router.get('/cds/interactions', async (req: AuthRequest, res) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const interactions = await cdsService.listInteractions(activeOnly);
    return res.json({ success: true, data: interactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add custom drug interaction
 * POST /api/emr/cds/interactions
 */
router.post('/cds/interactions', requirePermission('MANAGE_DRUGS', 'MANAGE_PHARMACY'), async (req: AuthRequest, res) => {
  try {
    const interaction = await cdsService.addInteraction(req.body);
    return res.status(201).json({ success: true, data: interaction });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Deactivate drug interaction
 * DELETE /api/emr/cds/interactions/:id
 */
router.delete('/cds/interactions/:id', requirePermission('MANAGE_DRUGS', 'MANAGE_PHARMACY'), async (req: AuthRequest, res) => {
  try {
    await cdsService.deactivateInteraction(req.params.id);
    return res.json({ success: true, message: 'Interaction deactivated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
