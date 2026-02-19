import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../common/middleware/auth.js';
import { setupService } from './setup.service.js';

const router = Router();

router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const status = await setupService.getStatus(user.tenantId);
    res.json({ status: 'success', data: status });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }
});

router.post('/steps/:stepId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { stepId } = req.params;
    const result = await setupService.saveStep(user.tenantId, stepId, req.body);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }
});

router.post('/steps/:stepId/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { stepId } = req.params;
    const result = await setupService.skipStep(user.tenantId, stepId);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }
});

router.post('/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await setupService.completeSetup(user.tenantId);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ status: 'error', message: err.message });
  }
});

export default router;
