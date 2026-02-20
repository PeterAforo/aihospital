import { Router, Request, Response } from 'express';
import * as svc from './saas.service.js';

const router = Router();

// ── Plans ──
router.get('/plans', async (_req: Request, res: Response) => {
  try { res.json(await svc.getPlans()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/plans', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createPlan(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/plans/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updatePlan(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Subscriptions ──
router.get('/subscriptions/:tenantId', async (req: Request, res: Response) => {
  try {
    const sub = await svc.getSubscription(req.params.tenantId);
    if (!sub) return res.status(404).json({ error: 'No active subscription' });
    res.json(sub);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { tenantId, planId, trialDays, paymentMethod, paymentReference } = req.body;
    res.status(201).json(await svc.createSubscription(tenantId, planId, { trialDays, paymentMethod, paymentReference }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions/:tenantId/cancel', async (req: Request, res: Response) => {
  try {
    const result = await svc.cancelSubscription(req.params.tenantId);
    if (!result) return res.status(404).json({ error: 'No active subscription' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions/:tenantId/renew', async (req: Request, res: Response) => {
  try {
    const result = await svc.renewSubscription(req.params.tenantId);
    if (!result) return res.status(404).json({ error: 'No active subscription' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions/:tenantId/change-plan', async (req: Request, res: Response) => {
  try {
    const result = await svc.changePlan(req.params.tenantId, req.body.planId);
    if (!result) return res.status(404).json({ error: 'No active subscription' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Usage ──
router.get('/usage/:tenantId', async (req: Request, res: Response) => {
  try { res.json(await svc.getUsage(req.params.tenantId, req.query.metricType as string)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/usage/record', async (req: Request, res: Response) => {
  try {
    const { tenantId, metricType, increment } = req.body;
    res.json(await svc.recordUsage(tenantId, metricType, increment));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/usage/:tenantId/check/:metricType', async (req: Request, res: Response) => {
  try { res.json(await svc.checkResourceLimit(req.params.tenantId, req.params.metricType)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Provisioning ──
router.post('/provision', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.provisionTenant(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ──
router.get('/dashboard', async (_req: Request, res: Response) => {
  try { res.json(await svc.getSaasDashboard()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
