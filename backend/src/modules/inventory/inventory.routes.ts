import { Router, Response } from 'express';
import { inventoryService } from './inventory.service.js';
import { authenticate, tenantGuard } from '../../common/middleware/auth.js';

const router: Router = Router();

router.use(authenticate);
router.use(tenantGuard);

// Categories
router.get('/categories', async (req: any, res: Response) => {
  try {
    const categories = await inventoryService.getCategories(req.tenantId!);
    res.json({ success: true, data: categories });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/categories', async (req: any, res: Response) => {
  try {
    const category = await inventoryService.createCategory(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/categories/:id', async (req: any, res: Response) => {
  try {
    const category = await inventoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: category });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Items
router.get('/items', async (req: any, res: Response) => {
  try {
    const { categoryId, search, lowStock, page, limit } = req.query;
    const result = await inventoryService.getItems(req.tenantId!, {
      categoryId: categoryId as string, search: search as string,
      lowStock: lowStock === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/items/low-stock', async (req: any, res: Response) => {
  try {
    const items = await inventoryService.getLowStockItems(req.tenantId!);
    res.json({ success: true, data: items });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/items/:id', async (req: any, res: Response) => {
  try {
    const item = await inventoryService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/items', async (req: any, res: Response) => {
  try {
    const item = await inventoryService.createItem(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.put('/items/:id', async (req: any, res: Response) => {
  try {
    const item = await inventoryService.updateItem(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Transactions
router.get('/transactions', async (req: any, res: Response) => {
  try {
    const { itemId, type, page, limit } = req.query;
    const result = await inventoryService.getTransactions(req.tenantId!, {
      itemId: itemId as string, type: type as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/transactions', async (req: any, res: Response) => {
  try {
    const transaction = await inventoryService.recordTransaction(req.tenantId!, req.body);
    res.status(201).json({ success: true, data: transaction });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

// Dashboard
router.get('/dashboard', async (req: any, res: Response) => {
  try {
    const stats = await inventoryService.getDashboardStats(req.tenantId!);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
