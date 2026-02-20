import { Router, Request, Response } from 'express';
import * as svc from './white-label.service.js';

const router = Router();

// ── White Label Config ──
router.get('/config/:tenantId', async (req: Request, res: Response) => {
  try { res.json(await svc.getWhiteLabelConfig(req.params.tenantId) || { message: 'No config' }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/config/:tenantId', async (req: Request, res: Response) => {
  try { res.json(await svc.upsertWhiteLabelConfig(req.params.tenantId, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Resellers ──
router.post('/resellers', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createReseller(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/resellers', async (req: Request, res: Response) => {
  try { res.json(await svc.getResellers(req.query.status as string)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/resellers/:id', async (req: Request, res: Response) => {
  try {
    const r = await svc.getResellerById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/resellers/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateReseller(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/resellers/:id/assign-tenant', async (req: Request, res: Response) => {
  try { res.json(await svc.assignTenantToReseller(req.params.id, req.body.tenantId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/resellers/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const d = await svc.getResellerDashboard(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
