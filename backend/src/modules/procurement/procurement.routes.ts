import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../common/middleware/auth.js';
import { procurementService } from './procurement.service.js';

const router = Router();
router.use(authenticate);

// ══════════════════════════════════════════════════════════════
// GOODS RECEIVED NOTES
// ══════════════════════════════════════════════════════════════

router.get('/grn', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const data = await procurementService.getGRNs(req.user!.tenantId, status as string);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/grn/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getGRNById(req.params.id);
    if (!data) return res.status(404).json({ status: 'error', message: 'GRN not found' });
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.post('/grn', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = await procurementService.createGRN(user.tenantId, user.branchId || '', user.userId, req.body);
    res.status(201).json({ status: 'success', data });
  } catch (e: any) { res.status(e.statusCode || 500).json({ status: 'error', message: e.message }); }
});

router.post('/grn/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.verifyGRN(req.params.id, req.user!.userId);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(e.statusCode || 500).json({ status: 'error', message: e.message }); }
});

router.post('/grn/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.rejectGRN(req.params.id, req.user!.userId, req.body.notes);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(e.statusCode || 500).json({ status: 'error', message: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// CENTRAL INVENTORY
// ══════════════════════════════════════════════════════════════

router.get('/central', async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, lowStockOnly } = req.query;
    const data = await procurementService.getCentralInventory(req.user!.tenantId, itemType as string, lowStockOnly === 'true');
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/central/valuation', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getCentralInventoryValuation(req.user!.tenantId);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/central/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getLowStockCentral(req.user!.tenantId);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/central/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getCentralInventoryById(req.params.id);
    if (!data) return res.status(404).json({ status: 'error', message: 'Item not found' });
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// STOCK ISSUES
// ══════════════════════════════════════════════════════════════

router.get('/stock-issues', async (req: AuthRequest, res: Response) => {
  try {
    const { department } = req.query;
    const data = await procurementService.getStockIssues(req.user!.tenantId, department as string);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/stock-issues/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getStockIssueById(req.params.id);
    if (!data) return res.status(404).json({ status: 'error', message: 'Stock issue not found' });
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.post('/stock-issues', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = await procurementService.createStockIssue(user.tenantId, user.branchId || '', user.userId, req.body);
    res.status(201).json({ status: 'success', data });
  } catch (e: any) { res.status(e.statusCode || 500).json({ status: 'error', message: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// DEPARTMENT STOCK
// ══════════════════════════════════════════════════════════════

router.get('/department/:department', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getDepartmentStock(req.user!.tenantId, req.params.department.toUpperCase());
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// STOCK MOVEMENTS (Audit Trail)
// ══════════════════════════════════════════════════════════════

router.get('/movements', async (req: AuthRequest, res: Response) => {
  try {
    const { movementType, itemId, fromLocation, toLocation, startDate, endDate, limit } = req.query;
    const data = await procurementService.getStockMovements(req.user!.tenantId, {
      movementType: movementType as string, itemId: itemId as string,
      fromLocation: fromLocation as string, toLocation: toLocation as string,
      startDate: startDate as string, endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

router.get('/movements/audit-trail/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const data = await procurementService.getStockMovementAuditTrail(req.user!.tenantId, req.params.itemId);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

export default router;
