import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { dispensingService } from './dispensing.service';
import { stockService } from './stock.service';
import { purchaseOrderService } from './purchase-order.service';
import { expiryAlertService } from './expiry-alert.service';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ==================== DISPENSING ====================

// Get prescription queue
router.get('/queue', requirePermission('VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status } = req.query;
    
    const queue = await dispensingService.getPrescriptionQueue(
      user.tenantId,
      user.branchId,
      status as string
    );
    
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get prescription details with stock availability
router.get('/queue/:prescriptionId', requirePermission('VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION'), async (req: AuthRequest, res: Response) => {
  try {
    const { prescriptionId } = req.params;
    const details = await dispensingService.getPrescriptionDetails(prescriptionId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dispense prescription
router.post('/dispense', requirePermission('DISPENSE_MEDICATION'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { prescriptionId, items, counselingNotes, overrideCdsAlerts, overrideReason } = req.body;
    
    if (!prescriptionId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'prescriptionId and items are required' });
    }
    
    const result = await dispensingService.dispensePrescription(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { prescriptionId, items, counselingNotes, overrideCdsAlerts, overrideReason }
    );

    // If CDS blocked the dispensing, return 422
    if (result.blocked) {
      return res.status(422).json(result);
    }
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[DISPENSE_ERROR]', error.message);
    const isValidationError = [
      'Insufficient stock',
      'Prescription not found',
      'Prescription is already',
      'Prescription item',
      'Cannot dispense',
    ].some(msg => error.message?.startsWith(msg));
    const status = isValidationError ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Get dispensing history
router.get('/dispensing-history', requirePermission('VIEW_PRESCRIPTION_QUEUE', 'DISPENSE_MEDICATION'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { patientId, startDate, endDate, limit } = req.query;
    
    const history = await dispensingService.getDispensingHistory(
      user.tenantId,
      user.branchId,
      patientId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STOCK MANAGEMENT ====================

// Get stock
router.get('/stock', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { drugId, category, lowStockOnly, expiringDays } = req.query;
    
    const stock = await stockService.getStock(
      user.tenantId,
      user.branchId,
      drugId as string,
      category as string,
      lowStockOnly === 'true',
      expiringDays ? parseInt(expiringDays as string) : undefined
    );
    
    res.json({ success: true, data: stock });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get low stock alerts
router.get('/stock/low', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const alerts = await stockService.getLowStockAlerts(
      user.tenantId,
      user.branchId
    );
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get expiring stock
router.get('/stock/expiring', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { days } = req.query;
    
    const stock = await stockService.getExpiringStock(
      user.tenantId,
      user.branchId,
      days ? parseInt(days as string) : 90
    );
    
    res.json({ success: true, data: stock });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get expired stock
router.get('/stock/expired', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const stock = await stockService.getExpiredStock(
      user.tenantId,
      user.branchId
    );
    res.json({ success: true, data: stock });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Adjust stock
router.post('/stock/adjust', requirePermission('ADJUST_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { drugId, batchNumber, adjustmentType, quantity, reason, expiryDate, costPrice, sellingPrice } = req.body;
    
    if (!drugId || !adjustmentType || quantity === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'drugId, adjustmentType, quantity, and reason are required' });
    }
    
    const result = await stockService.adjustStock(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { drugId, batchNumber, adjustmentType, quantity, reason, expiryDate: expiryDate ? new Date(expiryDate) : undefined, costPrice, sellingPrice }
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Receive stock
router.post('/stock/receive', requirePermission('RECEIVE_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { drugId, batchNumber, quantity, expiryDate, costPrice, sellingPrice, purchaseOrderId } = req.body;
    
    if (!drugId || !batchNumber || !quantity) {
      return res.status(400).json({ success: false, error: 'drugId, batchNumber, and quantity are required' });
    }
    
    const result = await stockService.receiveStock(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { drugId, batchNumber, quantity, expiryDate: expiryDate ? new Date(expiryDate) : undefined, costPrice, sellingPrice, purchaseOrderId }
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write off stock
router.post('/stock/write-off', requirePermission('WRITE_OFF_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { stockId, quantity, reason, writeOffType } = req.body;
    
    if (!stockId || !quantity || !reason || !writeOffType) {
      return res.status(400).json({ success: false, error: 'stockId, quantity, reason, and writeOffType are required' });
    }
    
    const result = await stockService.writeOffStock(
      user.tenantId,
      user.branchId || '',
      user.userId,
      stockId,
      quantity,
      reason,
      writeOffType
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stock movements
router.get('/stock/movements', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { drugId, startDate, endDate, limit } = req.query;
    
    const movements = await stockService.getStockMovements(
      user.tenantId,
      user.branchId,
      drugId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 100
    );
    
    res.json({ success: true, data: movements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stock valuation
router.get('/stock/valuation', requirePermission('VIEW_PHARMACY_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const valuation = await stockService.getStockValuation(
      user.tenantId,
      user.branchId
    );
    res.json({ success: true, data: valuation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SUPPLIERS ====================

// Get suppliers
router.get('/suppliers', requirePermission('VIEW_STOCK', 'MANAGE_SUPPLIERS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { activeOnly } = req.query;
    const suppliers = await purchaseOrderService.getSuppliers(user.tenantId, activeOnly !== 'false');
    res.json({ success: true, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create supplier
router.post('/suppliers', requirePermission('MANAGE_SUPPLIERS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { supplierName, supplierCode, contactPerson, phone, email, address, supplierType, paymentTerms, taxId, bankDetails, isApproved, notes } = req.body;
    
    if (!supplierName || !supplierCode) {
      return res.status(400).json({ success: false, error: 'supplierName and supplierCode are required' });
    }
    
    const supplier = await purchaseOrderService.createSupplier(user.tenantId, {
      supplierName, supplierCode, contactPerson, phone, email, address, supplierType, paymentTerms, taxId, bankDetails, isApproved, notes
    });
    
    res.status(201).json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update supplier
router.put('/suppliers/:id', requirePermission('MANAGE_SUPPLIERS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await purchaseOrderService.updateSupplier(id, req.body);
    res.json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PURCHASE ORDERS ====================

// Get purchase orders
router.get('/purchase-orders', requirePermission('VIEW_PURCHASE_ORDERS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, startDate, endDate } = req.query;
    
    const orders = await purchaseOrderService.getPurchaseOrders(
      user.tenantId,
      user.branchId,
      status as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get purchase order by ID
router.get('/purchase-orders/:id', requirePermission('VIEW_PURCHASE_ORDERS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await purchaseOrderService.getPurchaseOrderById(id);
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }
    
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create purchase order
router.post('/purchase-orders', requirePermission('CREATE_PURCHASE_ORDER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { supplierId, expectedDeliveryDate, paymentTerms, deliveryLocation, notes, items } = req.body;
    
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'supplierId and items are required' });
    }
    
    const order = await purchaseOrderService.createPurchaseOrder(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { supplierId, expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined, paymentTerms, deliveryLocation, notes, items }
    );
    
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject purchase order
router.post('/purchase-orders/:id/reject', requirePermission('APPROVE_PURCHASE_ORDER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const order = await purchaseOrderService.rejectPurchaseOrder(id, notes);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit purchase order
router.post('/purchase-orders/:id/submit', requirePermission('CREATE_PURCHASE_ORDER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await purchaseOrderService.submitPurchaseOrder(id);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve purchase order
router.post('/purchase-orders/:id/approve', requirePermission('APPROVE_PURCHASE_ORDER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const order = await purchaseOrderService.approvePurchaseOrder(id, user.userId);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel purchase order
router.post('/purchase-orders/:id/cancel', requirePermission('CREATE_PURCHASE_ORDER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await purchaseOrderService.cancelPurchaseOrder(id);
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STOCK TRANSFERS ====================

// Get stock transfers
router.get('/transfers', requirePermission('VIEW_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status } = req.query;
    const where: any = { tenantId: user.tenantId };
    if (status) where.status = status;
    // Show transfers from or to user's branch
    const branchId = user.branchId;
    if (branchId) {
      where.OR = [{ fromBranchId: branchId }, { toBranchId: branchId }];
    }
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        items: { include: { drug: true } },
        requestedByUser: { select: { id: true, firstName: true, lastName: true } },
        approvedByUser: { select: { id: true, firstName: true, lastName: true } },
        receivedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: transfers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create stock transfer request
router.post('/transfers', requirePermission('TRANSFER_STOCK'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { toBranchId, items, notes } = req.body;
    const fromBranchId = user.branchId;

    if (!toBranchId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'toBranchId and items are required' });
    }
    if (!fromBranchId) {
      return res.status(400).json({ success: false, error: 'User must be assigned to a branch' });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const count = await prisma.stockTransfer.count({ where: { tenantId: user.tenantId } });
    const transferNumber = `TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId: user.tenantId,
        fromBranchId,
        toBranchId,
        transferNumber,
        requestedBy: user.userId,
        notes,
        items: {
          create: items.map((i: any) => ({
            drugId: i.drugId,
            batchNumber: i.batchNumber,
            quantityRequested: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { drug: true } },
        requestedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve stock transfer
router.post('/transfers/:id/approve', requirePermission('APPROVE_TRANSFER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user.userId,
        approvedAt: new Date(),
      },
    });
    res.json({ success: true, data: transfer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete stock transfer (receive at destination)
router.post('/transfers/:id/receive', requirePermission('RECEIVE_TRANSFER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { items } = req.body;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    if (transfer.status !== 'APPROVED') return res.status(400).json({ success: false, error: 'Transfer must be approved first' });

    // Update transfer items with received quantities
    for (const item of (items || transfer.items)) {
      const transferItem = transfer.items.find((ti: any) => ti.id === item.itemId || ti.drugId === item.drugId);
      if (transferItem) {
        await prisma.stockTransferItem.update({
          where: { id: transferItem.id },
          data: { quantityTransferred: item.quantityReceived || transferItem.quantityRequested },
        });

        // Deduct from source branch
        await prisma.pharmacyStock.updateMany({
          where: {
            drugId: transferItem.drugId,
            branchId: transfer.fromBranchId,
            ...(transferItem.batchNumber ? { batchNumber: transferItem.batchNumber } : {}),
          },
          data: { quantity: { decrement: item.quantityReceived || transferItem.quantityRequested } },
        });

        // Add to destination branch (upsert)
        const existingStock = await prisma.pharmacyStock.findFirst({
          where: {
            drugId: transferItem.drugId,
            branchId: transfer.toBranchId,
            ...(transferItem.batchNumber ? { batchNumber: transferItem.batchNumber } : {}),
          },
        });

        if (existingStock) {
          await prisma.pharmacyStock.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: item.quantityReceived || transferItem.quantityRequested } },
          });
        } else {
          const sourceStock = await prisma.pharmacyStock.findFirst({
            where: { drugId: transferItem.drugId, branchId: transfer.fromBranchId },
          });
          await prisma.pharmacyStock.create({
            data: {
              tenantId: transfer.tenantId,
              branchId: transfer.toBranchId,
              drugId: transferItem.drugId,
              batchNumber: transferItem.batchNumber || 'TRANSFER',
              quantity: item.quantityReceived || transferItem.quantityRequested,
              expiryDate: sourceStock?.expiryDate,
              costPrice: sourceStock?.costPrice,
              sellingPrice: sourceStock?.sellingPrice,
              reorderLevel: sourceStock?.reorderLevel || 10,
            },
          });
        }
      }
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        receivedBy: user.userId,
        receivedAt: new Date(),
      },
      include: { items: { include: { drug: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[TRANSFER_RECEIVE_ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPIRY ALERTS & DISPOSAL ====================

// Get expiry dashboard summary
router.get('/expiry/summary', requirePermission('VIEW_PHARMACY_STOCK', 'MANAGE_PHARMACY'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const summary = await expiryAlertService.getExpirySummary(
      user.tenantId,
      (req.query.branchId as string) || user.branchId
    );
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get FEFO dispensing recommendations
router.get('/expiry/fefo', requirePermission('VIEW_PHARMACY_STOCK', 'DISPENSE_MEDICATION'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const recommendations = await expiryAlertService.getFefoRecommendations(
      user.tenantId,
      (req.query.branchId as string) || user.branchId,
      req.query.limit ? parseInt(req.query.limit as string) : 20
    );
    res.json({ success: true, data: recommendations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process disposal of expired/damaged stock
router.post('/expiry/dispose', requirePermission('MANAGE_PHARMACY'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { disposals } = req.body;

    if (!disposals || !Array.isArray(disposals) || disposals.length === 0) {
      return res.status(400).json({ success: false, error: 'disposals array is required' });
    }

    const result = await expiryAlertService.processDisposal(
      user.tenantId,
      user.branchId || '',
      user.userId,
      disposals
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get disposal history
router.get('/expiry/disposal-history', requirePermission('VIEW_PHARMACY_STOCK', 'MANAGE_PHARMACY'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { branchId, startDate, endDate, limit } = req.query;

    const history = await expiryAlertService.getDisposalHistory(
      user.tenantId,
      (branchId as string) || user.branchId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate expiry alert notifications (can be called by cron or manually)
router.post('/expiry/generate-alerts', requirePermission('MANAGE_PHARMACY'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await expiryAlertService.generateAlertNotifications(user.tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
