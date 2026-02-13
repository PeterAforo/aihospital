import { Router } from 'express';
import { triageController } from './triage.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/triage/queue - Get patients awaiting triage
router.get('/queue', triageController.getTriageQueue.bind(triageController));

// POST /api/triage/suggest-level - Get AI-suggested triage level
router.post('/suggest-level', triageController.suggestTriageLevel.bind(triageController));

// GET /api/triage/analytics - Get triage analytics
router.get('/analytics', triageController.getAnalytics.bind(triageController));

// GET /api/triage/patient/:patientId/history - Get patient's triage history
router.get('/patient/:patientId/history', triageController.getPatientHistory.bind(triageController));

// POST /api/triage - Create a new triage record
router.post('/', triageController.createTriage.bind(triageController));

// GET /api/triage/:id - Get a triage record by ID
router.get('/:id', triageController.getTriageById.bind(triageController));

// PUT /api/triage/:id - Update a triage record
router.put('/:id', triageController.updateTriage.bind(triageController));

export default router;
