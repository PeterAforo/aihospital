import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';

// ══════════════════════════════════════════════════════════════
// GOODS RECEIVED NOTES (GRN)
// ══════════════════════════════════════════════════════════════

interface GRNItemDto {
  purchaseOrderItemId?: string;
  itemType: string;
  itemId?: string;
  itemName: string;
  quantityReceived: number;
  quantityOrdered?: number;
  batchNumber?: string;
  expiryDate?: string;
  unitCost: number;
  qualityCheckPassed?: boolean;
  notes?: string;
}

interface CreateGRNDto {
  purchaseOrderId?: string;
  supplierId: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  notes?: string;
  items: GRNItemDto[];
}

class ProcurementService {

  // ── GRN Number Generator ──
  private async generateGRNNumber(tenantId: string): Promise<string> {
    const count = await prisma.goodsReceivedNote.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `GRN-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateIssueNumber(tenantId: string): Promise<string> {
    const count = await prisma.stockIssue.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `ISS-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ── GRN CRUD ──

  async createGRN(tenantId: string, branchId: string, userId: string, data: CreateGRNDto) {
    const grnNumber = await this.generateGRNNumber(tenantId);

    const grn = await prisma.goodsReceivedNote.create({
      data: {
        tenantId,
        branchId,
        grnNumber,
        purchaseOrderId: data.purchaseOrderId,
        supplierId: data.supplierId,
        supplierInvoiceNumber: data.supplierInvoiceNumber,
        supplierInvoiceDate: data.supplierInvoiceDate ? new Date(data.supplierInvoiceDate) : undefined,
        receivedBy: userId,
        notes: data.notes,
        items: {
          create: data.items.map(i => ({
            purchaseOrderItemId: i.purchaseOrderItemId,
            itemType: i.itemType,
            itemId: i.itemId,
            itemName: i.itemName,
            quantityReceived: i.quantityReceived,
            quantityOrdered: i.quantityOrdered,
            batchNumber: i.batchNumber,
            expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
            unitCost: i.unitCost,
            lineTotal: i.quantityReceived * i.unitCost,
            discrepancy: i.quantityOrdered ? i.quantityReceived - i.quantityOrdered : null,
            qualityCheckPassed: i.qualityCheckPassed ?? true,
            notes: i.notes,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    return grn;
  }

  async getGRNs(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return prisma.goodsReceivedNote.findMany({
      where,
      include: { supplier: true, purchaseOrder: true, items: true },
      orderBy: { receivedDate: 'desc' },
    });
  }

  async getGRNById(grnId: string) {
    return prisma.goodsReceivedNote.findUnique({
      where: { id: grnId },
      include: { supplier: true, purchaseOrder: { include: { items: true } }, items: true },
    });
  }

  async verifyGRN(grnId: string, userId: string) {
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id: grnId },
      include: { items: true },
    });
    if (!grn) throw new AppError('GRN not found', 404);
    if (grn.status !== 'PENDING_VERIFICATION') throw new AppError('GRN already processed', 400);

    // Update GRN status
    await prisma.goodsReceivedNote.update({
      where: { id: grnId },
      data: { status: 'VERIFIED', verifiedBy: userId, verifiedAt: new Date() },
    });

    // Add items to central inventory
    for (const item of grn.items) {
      await this.addToCentralInventory(grn.tenantId, grn.branchId, item, grn.supplierId, grnId, userId);
    }

    // Update PO status if linked
    if (grn.purchaseOrderId) {
      await this.updatePOStatusAfterGRN(grn.purchaseOrderId);
    }

    return { success: true, message: 'GRN verified and stock added to central inventory' };
  }

  async rejectGRN(grnId: string, userId: string, notes?: string) {
    const grn = await prisma.goodsReceivedNote.findUnique({ where: { id: grnId } });
    if (!grn) throw new AppError('GRN not found', 404);
    if (grn.status !== 'PENDING_VERIFICATION') throw new AppError('GRN already processed', 400);
    await prisma.goodsReceivedNote.update({
      where: { id: grnId },
      data: { status: 'REJECTED_GRN', verifiedBy: userId, verifiedAt: new Date(), notes: notes || grn.notes },
    });
    return { success: true, message: 'GRN rejected' };
  }

  // ── Central Inventory helpers ──

  private async addToCentralInventory(
    tenantId: string, branchId: string | null,
    item: { itemType: string; itemId: string | null; itemName: string; quantityReceived: number; batchNumber: string | null; expiryDate: Date | null; unitCost: number },
    supplierId: string, grnId: string, userId: string
  ) {
    const itemCode = item.itemId || item.itemName.replace(/\s+/g, '-').toUpperCase().slice(0, 20);

    // Find or create central inventory record
    let inv = await prisma.centralInventory.findFirst({
      where: { tenantId, itemCode },
    });

    if (inv) {
      // Weighted average cost
      const oldTotal = inv.quantityOnHand * inv.averageCost;
      const newTotal = item.quantityReceived * item.unitCost;
      const newQty = inv.quantityOnHand + item.quantityReceived;
      const newAvgCost = newQty > 0 ? (oldTotal + newTotal) / newQty : item.unitCost;

      await prisma.centralInventory.update({
        where: { id: inv.id },
        data: {
          quantityOnHand: newQty,
          averageCost: newAvgCost,
          totalValue: newQty * newAvgCost,
          lastRestockedAt: new Date(),
        },
      });
    } else {
      inv = await prisma.centralInventory.create({
        data: {
          tenantId,
          branchId,
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          itemCode,
          unitOfMeasure: 'UNIT',
          quantityOnHand: item.quantityReceived,
          averageCost: item.unitCost,
          totalValue: item.quantityReceived * item.unitCost,
          lastRestockedAt: new Date(),
        },
      });
    }

    // Create batch record
    await prisma.centralInventoryBatch.create({
      data: {
        centralInventoryId: inv.id,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantityReceived,
        unitCost: item.unitCost,
        supplierId,
        grnId,
      },
    });

    // Record stock movement
    await prisma.stockMovement.create({
      data: {
        tenantId,
        branchId,
        movementType: 'PURCHASE_GRN',
        centralInventoryId: inv.id,
        itemType: item.itemType,
        itemId: item.itemId,
        itemName: item.itemName,
        batchNumber: item.batchNumber,
        quantity: item.quantityReceived,
        unitCost: item.unitCost,
        toLocation: 'CENTRAL_STORE',
        referenceType: 'GRN',
        referenceId: grnId,
        performedBy: userId,
      },
    });
  }

  private async updatePOStatusAfterGRN(purchaseOrderId: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true, goodsReceivedNotes: { where: { status: 'VERIFIED' }, include: { items: true } } },
    });
    if (!po) return;

    // Sum received quantities per PO item
    const receivedMap = new Map<string, number>();
    for (const grn of po.goodsReceivedNotes) {
      for (const gi of grn.items) {
        if (gi.purchaseOrderItemId) {
          receivedMap.set(gi.purchaseOrderItemId, (receivedMap.get(gi.purchaseOrderItemId) || 0) + gi.quantityReceived);
        }
      }
    }

    const allReceived = po.items.every(i => (receivedMap.get(i.id) || 0) >= i.quantityOrdered);
    const anyReceived = Array.from(receivedMap.values()).some(v => v > 0);

    const newStatus = allReceived ? 'FULLY_RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;
    if (newStatus !== po.status) {
      await prisma.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: newStatus as any } });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CENTRAL INVENTORY
  // ══════════════════════════════════════════════════════════════

  async getCentralInventory(tenantId: string, itemType?: string, lowStockOnly?: boolean) {
    const where: any = { tenantId };
    if (itemType) where.itemType = itemType;
    if (lowStockOnly) {
      where.quantityOnHand = { lte: prisma.centralInventory.fields?.reorderLevel } as any;
    }
    const items = await prisma.centralInventory.findMany({
      where,
      include: { batches: { orderBy: { expiryDate: 'asc' } } },
      orderBy: { itemName: 'asc' },
    });

    if (lowStockOnly) {
      return items.filter(i => i.quantityOnHand <= i.reorderLevel);
    }
    return items;
  }

  async getCentralInventoryById(id: string) {
    return prisma.centralInventory.findUnique({
      where: { id },
      include: { batches: { orderBy: { expiryDate: 'asc' } }, stockMovements: { orderBy: { movementDate: 'desc' }, take: 20 } },
    });
  }

  async getCentralInventoryValuation(tenantId: string) {
    const items = await prisma.centralInventory.findMany({
      where: { tenantId, quantityOnHand: { gt: 0 } },
    });
    const totalValue = items.reduce((s, i) => s + i.totalValue, 0);
    const totalItems = items.length;
    const totalUnits = items.reduce((s, i) => s + i.quantityOnHand, 0);
    return { totalItems, totalUnits, totalValue, items };
  }

  async getLowStockCentral(tenantId: string) {
    const items = await prisma.centralInventory.findMany({
      where: { tenantId },
    });
    return items.filter(i => i.quantityOnHand <= i.reorderLevel);
  }

  // ══════════════════════════════════════════════════════════════
  // STOCK ISSUES (Central → Department)
  // ══════════════════════════════════════════════════════════════

  async createStockIssue(
    tenantId: string, branchId: string, userId: string,
    data: { requisitionId?: string; issuedToDepartment: string; receivedBy?: string; notes?: string; items: { itemType: string; itemId?: string; itemName: string; quantityIssued: number; batchNumber?: string; expiryDate?: string; unitCost: number }[] }
  ) {
    const issueNumber = await this.generateIssueNumber(tenantId);

    // Validate central inventory has enough stock
    for (const item of data.items) {
      const itemCode = item.itemId || item.itemName.replace(/\s+/g, '-').toUpperCase().slice(0, 20);
      const inv = await prisma.centralInventory.findFirst({ where: { tenantId, itemCode } });
      if (!inv || inv.quantityOnHand < item.quantityIssued) {
        throw new AppError(`Insufficient central stock for ${item.itemName}. Available: ${inv?.quantityOnHand || 0}`, 400);
      }
    }

    const issue = await prisma.stockIssue.create({
      data: {
        tenantId, branchId, issueNumber,
        requisitionId: data.requisitionId,
        issuedToDepartment: data.issuedToDepartment,
        issuedBy: userId,
        receivedBy: data.receivedBy,
        notes: data.notes,
        items: {
          create: data.items.map(i => ({
            itemType: i.itemType, itemId: i.itemId, itemName: i.itemName,
            quantityIssued: i.quantityIssued, batchNumber: i.batchNumber,
            expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
            unitCost: i.unitCost, lineTotal: i.quantityIssued * i.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    // Deduct from central inventory, add to department stock
    for (const item of data.items) {
      await this.transferToDepartment(tenantId, branchId, data.issuedToDepartment, item, issue.id, userId);
    }

    // Update requisition status if linked
    if (data.requisitionId) {
      await prisma.inventoryRequisition.update({
        where: { id: data.requisitionId },
        data: { status: 'FULFILLED', fulfilledBy: userId, fulfilledAt: new Date() },
      });
    }

    return issue;
  }

  private async transferToDepartment(
    tenantId: string, branchId: string, department: string,
    item: { itemType: string; itemId?: string; itemName: string; quantityIssued: number; batchNumber?: string; expiryDate?: string; unitCost: number },
    stockIssueId: string, userId: string
  ) {
    const itemCode = item.itemId || item.itemName.replace(/\s+/g, '-').toUpperCase().slice(0, 20);

    // Deduct from central inventory
    const inv = await prisma.centralInventory.findFirst({ where: { tenantId, itemCode } });
    if (!inv) return;

    const newQty = inv.quantityOnHand - item.quantityIssued;
    await prisma.centralInventory.update({
      where: { id: inv.id },
      data: { quantityOnHand: newQty, totalValue: newQty * inv.averageCost },
    });

    // Deduct from central batch (FEFO)
    const batches = await prisma.centralInventoryBatch.findMany({
      where: { centralInventoryId: inv.id, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
    });
    let remaining = item.quantityIssued;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, batch.quantity);
      await prisma.centralInventoryBatch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - deduct },
      });
      remaining -= deduct;
    }

    // Add to department stock
    let deptStock = await prisma.departmentStock.findFirst({
      where: { tenantId, department, itemCode },
    });

    if (deptStock) {
      const oldTotal = deptStock.quantityOnHand * deptStock.averageCost;
      const newTotal = item.quantityIssued * item.unitCost;
      const totalQty = deptStock.quantityOnHand + item.quantityIssued;
      const newAvg = totalQty > 0 ? (oldTotal + newTotal) / totalQty : item.unitCost;
      await prisma.departmentStock.update({
        where: { id: deptStock.id },
        data: { quantityOnHand: totalQty, averageCost: newAvg, totalValue: totalQty * newAvg, lastUpdated: new Date() },
      });
    } else {
      deptStock = await prisma.departmentStock.create({
        data: {
          tenantId, branchId, department,
          itemType: item.itemType, itemId: item.itemId, itemName: item.itemName, itemCode,
          quantityOnHand: item.quantityIssued, averageCost: item.unitCost,
          totalValue: item.quantityIssued * item.unitCost,
        },
      });
    }

    // Create department stock batch
    await prisma.departmentStockBatch.create({
      data: {
        departmentStockId: deptStock.id,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        quantity: item.quantityIssued,
        unitCost: item.unitCost,
        stockIssueId,
      },
    });

    // Record stock movement
    await prisma.stockMovement.create({
      data: {
        tenantId, branchId,
        movementType: 'ISSUE_TO_DEPARTMENT',
        centralInventoryId: inv.id,
        itemType: item.itemType, itemId: item.itemId, itemName: item.itemName,
        batchNumber: item.batchNumber,
        quantity: item.quantityIssued,
        unitCost: item.unitCost,
        fromLocation: 'CENTRAL_STORE',
        toLocation: department,
        referenceType: 'STOCK_ISSUE',
        referenceId: stockIssueId,
        performedBy: userId,
      },
    });
  }

  async getStockIssues(tenantId: string, department?: string) {
    const where: any = { tenantId };
    if (department) where.issuedToDepartment = department;
    return prisma.stockIssue.findMany({
      where,
      include: { items: true },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getStockIssueById(id: string) {
    return prisma.stockIssue.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // DEPARTMENT STOCK
  // ══════════════════════════════════════════════════════════════

  async getDepartmentStock(tenantId: string, department: string) {
    return prisma.departmentStock.findMany({
      where: { tenantId, department },
      include: { batches: { orderBy: { expiryDate: 'asc' } } },
      orderBy: { itemName: 'asc' },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // STOCK MOVEMENTS (Audit Trail)
  // ══════════════════════════════════════════════════════════════

  async getStockMovements(tenantId: string, filters: {
    movementType?: string; itemId?: string; fromLocation?: string;
    toLocation?: string; startDate?: string; endDate?: string; limit?: number;
  } = {}) {
    const where: any = { tenantId };
    if (filters.movementType) where.movementType = filters.movementType;
    if (filters.itemId) where.itemId = filters.itemId;
    if (filters.fromLocation) where.fromLocation = filters.fromLocation;
    if (filters.toLocation) where.toLocation = filters.toLocation;
    if (filters.startDate || filters.endDate) {
      where.movementDate = {};
      if (filters.startDate) where.movementDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.movementDate.lte = new Date(filters.endDate);
    }
    return prisma.stockMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      take: filters.limit || 100,
    });
  }

  async getStockMovementAuditTrail(tenantId: string, itemId: string) {
    return prisma.stockMovement.findMany({
      where: { tenantId, itemId },
      orderBy: { movementDate: 'desc' },
    });
  }
}

export const procurementService = new ProcurementService();
