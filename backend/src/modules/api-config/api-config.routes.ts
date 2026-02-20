import { Router, Request, Response } from 'express';
import {
  resolveApiConfig, getApiConfigs, upsertApiConfig, deleteApiConfig,
  testApiConnection, getApiUsageSummary,
} from './api-config.service.js';

const router = Router();

// ── Resolve config for a tenant (used internally) ──
router.get('/resolve', async (req: Request, res: Response) => {
  try {
    const { tenantId, branchId, apiType } = req.query;
    if (!tenantId || !apiType) return res.status(400).json({ error: 'tenantId and apiType required' });
    const config = await resolveApiConfig(tenantId as string, (branchId as string) || null, apiType as string);
    res.json(config || { message: 'No configuration found' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Super Admin: Get all default configs ──
router.get('/super-admin', async (_req: Request, res: Response) => {
  try {
    const configs = await getApiConfigs('SUPER_ADMIN');
    res.json(configs);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Super Admin: Upsert default config ──
router.post('/super-admin', async (req: Request, res: Response) => {
  try {
    const { apiType, provider, credentials, isActive, allowOverride, commissionRate, settings } = req.body;
    if (!apiType || !provider || !credentials) return res.status(400).json({ error: 'apiType, provider, credentials required' });
    const result = await upsertApiConfig({ configLevel: 'SUPER_ADMIN', apiType, provider, credentials, isActive, allowOverride, commissionRate, settings });
    res.json({ id: result.id, message: 'Configuration saved' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Tenant: Get configs ──
router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const configs = await getApiConfigs('TENANT', req.params.tenantId);
    // Also get super admin defaults for display
    const defaults = await getApiConfigs('SUPER_ADMIN');
    res.json({ tenantConfigs: configs, superAdminDefaults: defaults });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Tenant: Upsert own config ──
router.post('/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { apiType, provider, credentials, isActive, settings } = req.body;
    if (!apiType || !provider || !credentials) return res.status(400).json({ error: 'apiType, provider, credentials required' });
    const result = await upsertApiConfig({ configLevel: 'TENANT', configOwnerId: req.params.tenantId, apiType, provider, credentials, isActive, settings });
    res.json({ id: result.id, message: 'Configuration saved' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Branch: Get configs ──
router.get('/branch/:branchId', async (req: Request, res: Response) => {
  try {
    const configs = await getApiConfigs('BRANCH', req.params.branchId);
    res.json(configs);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Branch: Upsert own config ──
router.post('/branch/:branchId', async (req: Request, res: Response) => {
  try {
    const { apiType, provider, credentials, isActive, settings } = req.body;
    if (!apiType || !provider || !credentials) return res.status(400).json({ error: 'apiType, provider, credentials required' });
    const result = await upsertApiConfig({ configLevel: 'BRANCH', configOwnerId: req.params.branchId, apiType, provider, credentials, isActive, settings });
    res.json({ id: result.id, message: 'Configuration saved' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Delete config ──
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteApiConfig(req.params.id);
    res.json({ message: 'Configuration deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Test connection ──
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { apiType, provider, credentials } = req.body;
    const result = await testApiConnection(apiType, provider, credentials);
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Usage summary ──
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const { tenantId, startDate, endDate } = req.query;
    const summary = await getApiUsageSummary(
      tenantId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );
    res.json(summary);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
