import { Router, Request, Response } from 'express';
import * as svc from './community-health.service.js';

const router = Router();

// ── Dashboard ──
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getCommunityDashboard(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Workers ──
router.post('/workers', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createWorker(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/workers', async (req: Request, res: Response) => {
  try {
    const { tenantId, status } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getWorkers(tenantId as string, status as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/workers/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateWorker(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Visits ──
router.post('/visits', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createVisit(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/visits', async (req: Request, res: Response) => {
  try {
    const { tenantId, workerId, visitType, startDate, endDate } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getVisits(tenantId as string, { workerId: workerId as string, visitType: visitType as string, startDate: startDate as string, endDate: endDate as string }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Households ──
router.post('/households', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createHousehold(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/households', async (req: Request, res: Response) => {
  try {
    const { tenantId, riskLevel } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getHouseholds(tenantId as string, riskLevel as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/households/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateHousehold(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
