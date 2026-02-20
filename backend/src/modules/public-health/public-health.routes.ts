import { Router, Request, Response } from 'express';
import * as svc from './public-health.service.js';

const router = Router();

// ── Disease Notifications ──
router.post('/notifications', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createNotification(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { tenantId, diseaseName, status, startDate, endDate } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getNotifications(tenantId as string, { diseaseName: diseaseName as string, status: status as string, startDate: startDate as string, endDate: endDate as string }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/notifications/:id', async (req: Request, res: Response) => {
  try { res.json(await svc.updateNotification(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Outbreak Alerts ──
router.get('/outbreaks', async (req: Request, res: Response) => {
  try {
    const { tenantId, activeOnly } = req.query;
    res.json(await svc.getOutbreakAlerts(tenantId as string, activeOnly !== 'false'));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/outbreaks/:id/deactivate', async (req: Request, res: Response) => {
  try { res.json(await svc.deactivateAlert(req.params.id, req.body.userId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Surveillance Dashboard ──
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getSurveillanceDashboard(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Immunization Registry ──
router.post('/immunizations', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createImmunization(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/immunizations', async (req: Request, res: Response) => {
  try {
    const { tenantId, patientId, status } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getImmunizations(tenantId as string, patientId as string, status as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/immunizations/:id/administer', async (req: Request, res: Response) => {
  try { res.json(await svc.administerVaccine(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/immunizations/defaulters', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getDefaulters(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Mass Campaigns ──
router.post('/campaigns', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createCampaign(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { tenantId, status } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getCampaigns(tenantId as string, status as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/campaigns/:id/progress', async (req: Request, res: Response) => {
  try {
    const { reachedCount, status } = req.body;
    res.json(await svc.updateCampaignProgress(req.params.id, reachedCount, status));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
