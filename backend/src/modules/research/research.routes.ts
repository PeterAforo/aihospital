import { Router, Request, Response } from 'express';
import * as svc from './research.service.js';

const router = Router();

// ── Dashboard ──
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getResearchDashboard(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Trials ──
router.post('/trials', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createTrial(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/trials', async (req: Request, res: Response) => {
  try {
    const { tenantId, status } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getTrials(tenantId as string, status as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/trials/:id', async (req: Request, res: Response) => {
  try {
    const t = await svc.getTrialById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/trials/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateTrial(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Participants ──
router.post('/participants', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.enrollParticipant(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/participants/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateParticipant(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
