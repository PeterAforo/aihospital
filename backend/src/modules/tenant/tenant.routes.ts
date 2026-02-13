import { Router } from 'express';
import { TenantController } from './tenant.controller.js';
import { authenticate, authorize } from '../../common/middleware/auth.js';

const router = Router();
const tenantController = new TenantController();

// Public route for tenant lookup
router.get('/lookup/:subdomain', tenantController.lookupBySubdomain);

// Protected routes
router.use(authenticate);

router.get('/current', tenantController.getCurrent);
router.put('/current', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), tenantController.updateCurrent);

// Branch management
router.get('/branches', tenantController.listBranches);
router.post('/branches', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), tenantController.createBranch);
router.put('/branches/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), tenantController.updateBranch);
router.delete('/branches/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), tenantController.deleteBranch);

export default router;
