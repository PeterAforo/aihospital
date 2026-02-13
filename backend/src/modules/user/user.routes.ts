import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate, authorize, tenantGuard } from '../../common/middleware/auth.js';

const router = Router();
const userController = new UserController();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), userController.list);
router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.get('/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), userController.getById);
router.put('/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), userController.update);
router.delete('/:id', authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), userController.deactivate);
router.get('/doctors', userController.getDoctors);

export default router;
