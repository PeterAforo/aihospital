import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { authenticate, authorize, tenantGuard, requirePermission } from '../../common/middleware/auth.js';
import { validateBody } from '../../common/middleware/validate.js';
import { createPatientSchema, updatePatientSchema, checkDuplicateSchema } from './patient.schema.js';
import { uploadPatientPhoto, uploadPatientDocument } from '../../common/utils/upload.js';

const router: ReturnType<typeof Router> = Router();
const patientController = new PatientController();

// All routes require authentication
router.use(authenticate);
router.use(tenantGuard);

// Patient CRUD
router.post('/', requirePermission('REGISTER_PATIENT'), validateBody(createPatientSchema), patientController.create);
router.get('/search', requirePermission('VIEW_PATIENT', 'VIEW_PATIENT_BASIC'), patientController.search);
router.post('/check-duplicate', requirePermission('REGISTER_PATIENT'), validateBody(checkDuplicateSchema), patientController.checkDuplicate);
router.get('/:id', requirePermission('VIEW_PATIENT', 'VIEW_PATIENT_BASIC'), patientController.getById);
router.put('/:id', requirePermission('EDIT_PATIENT'), validateBody(updatePatientSchema), patientController.update);
router.delete('/:id', requirePermission('DELETE_PATIENT'), patientController.delete);

// Patient related data
router.get('/:id/visits', requirePermission('VIEW_PATIENT'), patientController.getVisitHistory);
router.post('/:id/merge', requirePermission('MERGE_PATIENT'), patientController.merge);
router.post('/:id/photo', requirePermission('EDIT_PATIENT'), uploadPatientPhoto.single('photo'), patientController.uploadPhoto);

// Patient documents
router.get('/:id/documents', requirePermission('VIEW_PATIENT'), patientController.getDocuments);
router.post('/:id/documents', requirePermission('EDIT_PATIENT'), uploadPatientDocument.single('document'), patientController.uploadDocument);
router.delete('/:id/documents/:documentId', requirePermission('EDIT_PATIENT'), patientController.deleteDocument);

export default router;
