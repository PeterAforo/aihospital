import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { authenticate, authorize, tenantGuard } from '../../common/middleware/auth.js';
import { validateBody } from '../../common/middleware/validate.js';
import { createPatientSchema, updatePatientSchema, checkDuplicateSchema } from './patient.schema.js';
import { uploadPatientPhoto, uploadPatientDocument } from '../../common/utils/upload.js';

const router: ReturnType<typeof Router> = Router();
const patientController = new PatientController();

// All routes require authentication
router.use(authenticate);
router.use(tenantGuard);

// Patient CRUD
router.post('/', validateBody(createPatientSchema), patientController.create);
router.get('/search', patientController.search);
router.post('/check-duplicate', validateBody(checkDuplicateSchema), patientController.checkDuplicate);
router.get('/:id', patientController.getById);
router.put('/:id', validateBody(updatePatientSchema), patientController.update);
router.delete('/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), patientController.delete);

// Patient related data
router.get('/:id/visits', patientController.getVisitHistory);
router.post('/:id/merge', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), patientController.merge);
router.post('/:id/photo', uploadPatientPhoto.single('photo'), patientController.uploadPhoto);

// Patient documents
router.get('/:id/documents', patientController.getDocuments);
router.post('/:id/documents', uploadPatientDocument.single('document'), patientController.uploadDocument);
router.delete('/:id/documents/:documentId', patientController.deleteDocument);

export default router;
