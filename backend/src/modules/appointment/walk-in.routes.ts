import { Router } from 'express';
import { WalkInController } from './walk-in.controller.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: ReturnType<typeof Router> = Router();
const walkInController = new WalkInController();

router.use(authenticate);
router.use(tenantGuard);

// Walk-in queue management
router.post('/add', walkInController.addToQueue);
router.get('/queue/:doctorId', walkInController.getQueue);
router.post('/next/:doctorId', walkInController.callNextPatient);
router.delete('/remove/:queueEntryId', walkInController.removeFromQueue);
router.put('/priority/:queueEntryId', walkInController.updatePriority);

// Public TV display (no auth required for this specific endpoint)
router.get('/display/:doctorId', walkInController.getQueueDisplay);

export default router;
