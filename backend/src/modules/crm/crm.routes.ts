import { Router, Request, Response } from 'express';
import * as svc from './crm.service.js';

const router = Router();

// ── Dashboard ──
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getCRMDashboard(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Segments ──
router.get('/segments', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getSegments(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/segments', async (req: Request, res: Response) => {
  try { res.json(await svc.upsertSegment(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/segments/recalculate', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.recalculateSegments(tenantId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Marketing Campaigns ──
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

router.patch('/campaigns/:id/status', async (req: Request, res: Response) => {
  try { res.json(await svc.updateCampaignStatus(req.params.id, req.body.status)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/campaigns/:id/metrics', async (req: Request, res: Response) => {
  try { res.json(await svc.updateCampaignMetrics(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Feedback ──
router.post('/feedback', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.submitFeedback(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const { tenantId, feedbackType, status, sentiment } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getFeedback(tenantId as string, { feedbackType: feedbackType as string, status: status as string, sentiment: sentiment as string }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/feedback/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getFeedbackSummary(tenantId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/feedback/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { resolvedBy, resolution } = req.body;
    res.json(await svc.resolveFeedback(req.params.id, resolvedBy, resolution));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Loyalty ──
router.post('/loyalty/enroll', async (req: Request, res: Response) => {
  try { res.json(await svc.enrollLoyalty(req.body.tenantId, req.body.patientId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/loyalty/:patientId', async (req: Request, res: Response) => {
  try {
    const account = await svc.getLoyaltyAccount(req.params.patientId);
    if (!account) return res.status(404).json({ error: 'No loyalty account' });
    res.json(account);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/loyalty/earn', async (req: Request, res: Response) => {
  try {
    const { patientId, points, description, referenceId } = req.body;
    const result = await svc.earnPoints(patientId, points, description, referenceId);
    if (!result) return res.status(404).json({ error: 'No loyalty account' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/loyalty/redeem', async (req: Request, res: Response) => {
  try {
    const { patientId, points, description } = req.body;
    const result = await svc.redeemPoints(patientId, points, description);
    if (!result) return res.status(400).json({ error: 'Insufficient points or no account' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Referrals ──
router.post('/referrals/generate', async (req: Request, res: Response) => {
  try { res.json(await svc.createReferralCode(req.body.tenantId, req.body.referrerId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/referrals', async (req: Request, res: Response) => {
  try {
    const { tenantId, referrerId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getReferrals(tenantId as string, referrerId as string));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/referrals/:code/complete', async (req: Request, res: Response) => {
  try { res.json(await svc.completeReferral(req.params.code, req.body.referredId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
