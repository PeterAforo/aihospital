import { prisma } from '../../common/utils/prisma.js';

interface StockAdjustmentDto {
  drugId: string;
  batchNumber?: string;
  adjustmentType: 'ADD' | 'REMOVE' | 'SET';
  quantity: number;
  reason: string;
  expiryDate?: Date;
  costPrice?: number;
  sellingPrice?: number;
}

interface ReceiveStockDto {
  drugId: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: Date;
  costPrice?: number;
  sellingPrice?: number;
  purchaseOrderId?: string;
}

class StockService {
  async getStock(
    tenantId: string,
    branchId?: string,
    drugId?: string,
    category?: string,
    lowStockOnly?: boolean,
    expiringDays?: number
  ) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (drugId) where.drugId = drugId;

    const stocks = await prisma.pharmacyStock.findMany({
      where,
      include: { drug: true },
      orderBy: [{ drug: { genericName: 'asc' } }, { expiryDate: 'asc' }],
    });

    let result = stocks;
    if (category) result = result.filter(s => s.drug.category === category);
    if (lowStockOnly) result = result.filter(s => s.quantity <= s.reorderLevel);
    if (expiringDays) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + expiringDays);
      result = result.filter(s => s.expiryDate && s.expiryDate <= threshold);
    }
    return result;
  }

  async getLowStockAlerts(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    const stocks = await prisma.pharmacyStock.findMany({ where, include: { drug: true } });
    const drugTotals = new Map<string, { drug: any; total: number; reorderLevel: number }>();
    for (const stock of stocks) {
      const existing = drugTotals.get(stock.drugId);
      if (existing) { existing.total += stock.quantity; }
      else { drugTotals.set(stock.drugId, { drug: stock.drug, total: stock.quantity, reorderLevel: stock.reorderLevel }); }
    }
    return Array.from(drugTotals.values())
      .filter(d => d.total <= d.reorderLevel)
      .map(d => ({ drug: d.drug, currentStock: d.total, reorderLevel: d.reorderLevel, shortfall: d.reorderLevel - d.total }));
  }

  async getExpiringStock(tenantId: string, branchId?: string, days = 90) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    const where: any = { tenantId, quantity: { gt: 0 }, expiryDate: { lte: threshold } };
    if (branchId) where.branchId = branchId;
    return prisma.pharmacyStock.findMany({ where, include: { drug: true }, orderBy: { expiryDate: 'asc' } });
  }

  async getExpiredStock(tenantId: string, branchId?: string) {
    const where: any = { tenantId, quantity: { gt: 0 }, expiryDate: { lt: new Date() } };
    if (branchId) where.branchId = branchId;
    return prisma.pharmacyStock.findMany({ where, include: { drug: true }, orderBy: { expiryDate: 'asc' } });
  }

  async adjustStock(tenantId: string, branchId: string, userId: string, data: StockAdjustmentDto) {
    let stock = await prisma.pharmacyStock.findFirst({
      where: { tenantId, branchId, drugId: data.drugId, batchNumber: data.batchNumber || null },
    });
    const balanceBefore = stock?.quantity || 0;
    let balanceAfter: number;
    let movementQty: number;
    switch (data.adjustmentType) {
      case 'ADD': balanceAfter = balanceBefore + data.quantity; movementQty = data.quantity; break;
      case 'REMOVE':
        if (balanceBefore < data.quantity) throw new Error(`Cannot remove ${data.quantity}. Only ${balanceBefore} in stock.`);
        balanceAfter = balanceBefore - data.quantity; movementQty = -data.quantity; break;
      case 'SET': balanceAfter = data.quantity; movementQty = data.quantity - balanceBefore; break;
      default: throw new Error('Invalid adjustment type');
    }
    if (stock) {
      await prisma.pharmacyStock.update({ where: { id: stock.id }, data: { quantity: balanceAfter, costPrice: data.costPrice ?? stock.costPrice, sellingPrice: data.sellingPrice ?? stock.sellingPrice, expiryDate: data.expiryDate ?? stock.expiryDate } });
    } else {
      stock = await prisma.pharmacyStock.create({ data: { tenantId, branchId, drugId: data.drugId, batchNumber: data.batchNumber, quantity: balanceAfter, expiryDate: data.expiryDate, costPrice: data.costPrice, sellingPrice: data.sellingPrice, reorderLevel: 10 } });
    }
    const drug = await prisma.drug.findUnique({ where: { id: data.drugId } });
    await prisma.stockMovement.create({
      data: { tenantId, branchId, movementType: 'ADJUSTMENT', itemName: drug?.genericName || 'Unknown', itemId: data.drugId, itemType: 'DRUG', batchNumber: data.batchNumber, quantity: movementQty, unitCost: data.costPrice, fromLocation: 'PHARMACY', toLocation: 'PHARMACY', referenceType: 'ADJUSTMENT', notes: data.reason, performedBy: userId },
    });
    return { success: true, balanceBefore, balanceAfter, adjustment: movementQty };
  }

  async receiveStock(tenantId: string, branchId: string, userId: string, data: ReceiveStockDto) {
    let stock = await prisma.pharmacyStock.findFirst({
      where: { tenantId, branchId, drugId: data.drugId, batchNumber: data.batchNumber },
    });
    const balanceBefore = stock?.quantity || 0;
    const balanceAfter = balanceBefore + data.quantity;
    if (stock) {
      await prisma.pharmacyStock.update({ where: { id: stock.id }, data: { quantity: balanceAfter, expiryDate: data.expiryDate ?? stock.expiryDate, costPrice: data.costPrice ?? stock.costPrice, sellingPrice: data.sellingPrice ?? stock.sellingPrice } });
    } else {
      stock = await prisma.pharmacyStock.create({ data: { tenantId, branchId, drugId: data.drugId, batchNumber: data.batchNumber, quantity: data.quantity, expiryDate: data.expiryDate, costPrice: data.costPrice, sellingPrice: data.sellingPrice, reorderLevel: 10 } });
    }
    const drug = await prisma.drug.findUnique({ where: { id: data.drugId } });
    await prisma.stockMovement.create({
      data: { tenantId, branchId, movementType: 'PURCHASE_GRN', itemName: drug?.genericName || 'Unknown', itemId: data.drugId, itemType: 'DRUG', batchNumber: data.batchNumber, quantity: data.quantity, unitCost: data.costPrice, toLocation: 'PHARMACY', referenceType: data.purchaseOrderId ? 'GRN' : undefined, referenceId: data.purchaseOrderId, performedBy: userId },
    });
    return { success: true, stockId: stock.id, balanceBefore, balanceAfter };
  }

  async writeOffStock(tenantId: string, branchId: string, userId: string, stockId: string, quantity: number, reason: string, writeOffType: 'EXPIRED' | 'DAMAGED') {
    const stock = await prisma.pharmacyStock.findUnique({ where: { id: stockId }, include: { drug: true } });
    if (!stock) throw new Error('Stock record not found');
    if (stock.quantity < quantity) throw new Error(`Cannot write off ${quantity}. Only ${stock.quantity} in stock.`);
    const balanceBefore = stock.quantity;
    const balanceAfter = stock.quantity - quantity;
    await prisma.pharmacyStock.update({ where: { id: stockId }, data: { quantity: balanceAfter } });
    const mvType = writeOffType === 'EXPIRED' ? 'EXPIRED_WRITE_OFF' as const : 'DAMAGED_WRITE_OFF' as const;
    await prisma.stockMovement.create({
      data: { tenantId, branchId, movementType: mvType, itemName: stock.drug.genericName, itemId: stock.drugId, itemType: 'DRUG', batchNumber: stock.batchNumber, quantity: -quantity, unitCost: stock.costPrice, fromLocation: 'PHARMACY', toLocation: 'WASTE', notes: reason, performedBy: userId },
    });
    return { success: true, balanceBefore, balanceAfter, writtenOff: quantity };
  }

  async getStockMovements(tenantId: string, branchId?: string, itemId?: string, startDate?: Date, endDate?: Date, limit = 100) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (itemId) where.itemId = itemId;
    if (startDate || endDate) {
      where.movementDate = {};
      if (startDate) where.movementDate.gte = startDate;
      if (endDate) where.movementDate.lte = endDate;
    }
    return prisma.stockMovement.findMany({ where, orderBy: { movementDate: 'desc' }, take: limit });
  }

  async getStockValuation(tenantId: string, branchId?: string) {
    const where: any = { tenantId, quantity: { gt: 0 } };
    if (branchId) where.branchId = branchId;
    const stocks = await prisma.pharmacyStock.findMany({ where, include: { drug: true } });
    let totalCostValue = 0;
    let totalSellingValue = 0;
    const items = [];
    for (const stock of stocks) {
      const costValue = (stock.costPrice || 0) * stock.quantity;
      const sellingValue = (stock.sellingPrice || stock.drug.cashPrice || 0) * stock.quantity;
      totalCostValue += costValue;
      totalSellingValue += sellingValue;
      items.push({ drug: stock.drug, batchNumber: stock.batchNumber, quantity: stock.quantity, costPrice: stock.costPrice, sellingPrice: stock.sellingPrice || stock.drug.cashPrice, costValue, sellingValue, expiryDate: stock.expiryDate });
    }
    return { totalItems: items.length, totalCostValue, totalSellingValue, potentialProfit: totalSellingValue - totalCostValue, items };
  }
}

export const stockService = new StockService();
