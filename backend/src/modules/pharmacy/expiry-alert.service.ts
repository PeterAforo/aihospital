import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExpiryAlertSummary {
  expired: { count: number; totalValue: number; items: any[] };
  expiring30: { count: number; totalValue: number; items: any[] };
  expiring60: { count: number; totalValue: number; items: any[] };
  expiring90: { count: number; totalValue: number; items: any[] };
  totalAtRiskValue: number;
}

export interface DisposalRecord {
  stockId: string;
  quantity: number;
  reason: string;
  disposalMethod: string; // INCINERATION, RETURN_TO_SUPPLIER, CHEMICAL_TREATMENT
  witnessedBy?: string;
}

class ExpiryAlertService {
  /**
   * Get comprehensive expiry dashboard summary
   */
  async getExpirySummary(tenantId: string, branchId?: string): Promise<ExpiryAlertSummary> {
    const now = new Date();
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in60 = new Date(); in60.setDate(in60.getDate() + 60);
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);

    const baseWhere: any = {
      tenantId,
      quantity: { gt: 0 },
      expiryDate: { not: null },
    };
    if (branchId) baseWhere.branchId = branchId;

    // Fetch all stock with expiry dates in one query
    const allStock = await prisma.pharmacyStock.findMany({
      where: baseWhere,
      include: { drug: true },
      orderBy: { expiryDate: 'asc' },
    });

    const expired: any[] = [];
    const expiring30: any[] = [];
    const expiring60: any[] = [];
    const expiring90: any[] = [];

    for (const stock of allStock) {
      if (!stock.expiryDate) continue;

      const item = {
        id: stock.id,
        drugId: stock.drugId,
        drugName: stock.drug.genericName,
        brandName: stock.drug.brandName,
        batchNumber: stock.batchNumber,
        quantity: stock.quantity,
        expiryDate: stock.expiryDate,
        costPrice: stock.costPrice,
        sellingPrice: stock.sellingPrice,
        value: (stock.costPrice || 0) * stock.quantity,
        daysUntilExpiry: Math.ceil((stock.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };

      if (stock.expiryDate < now) {
        expired.push(item);
      } else if (stock.expiryDate <= in30) {
        expiring30.push(item);
      } else if (stock.expiryDate <= in60) {
        expiring60.push(item);
      } else if (stock.expiryDate <= in90) {
        expiring90.push(item);
      }
    }

    const sumValue = (items: any[]) => items.reduce((sum, i) => sum + i.value, 0);

    return {
      expired: { count: expired.length, totalValue: sumValue(expired), items: expired },
      expiring30: { count: expiring30.length, totalValue: sumValue(expiring30), items: expiring30 },
      expiring60: { count: expiring60.length, totalValue: sumValue(expiring60), items: expiring60 },
      expiring90: { count: expiring90.length, totalValue: sumValue(expiring90), items: expiring90 },
      totalAtRiskValue: sumValue(expired) + sumValue(expiring30) + sumValue(expiring60) + sumValue(expiring90),
    };
  }

  /**
   * Get FEFO dispensing recommendations — drugs closest to expiry should be dispensed first
   */
  async getFefoRecommendations(tenantId: string, branchId?: string, limit = 20) {
    const now = new Date();
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);

    const where: any = {
      tenantId,
      quantity: { gt: 0 },
      expiryDate: { gt: now, lte: in90 },
    };
    if (branchId) where.branchId = branchId;

    return prisma.pharmacyStock.findMany({
      where,
      include: { drug: true },
      orderBy: { expiryDate: 'asc' },
      take: limit,
    });
  }

  /**
   * Process disposal of expired/damaged stock with full audit trail
   */
  async processDisposal(
    tenantId: string,
    branchId: string,
    userId: string,
    disposals: DisposalRecord[]
  ) {
    const results = [];

    for (const disposal of disposals) {
      const stock = await prisma.pharmacyStock.findUnique({
        where: { id: disposal.stockId },
        include: { drug: true },
      });

      if (!stock) {
        results.push({ stockId: disposal.stockId, success: false, error: 'Stock not found' });
        continue;
      }

      if (stock.quantity < disposal.quantity) {
        results.push({ stockId: disposal.stockId, success: false, error: `Only ${stock.quantity} in stock` });
        continue;
      }

      const balanceBefore = stock.quantity;
      const balanceAfter = stock.quantity - disposal.quantity;

      // Update stock quantity
      await prisma.pharmacyStock.update({
        where: { id: disposal.stockId },
        data: { quantity: balanceAfter },
      });

      // Record stock movement with disposal details
      await prisma.stockMovement.create({
        data: {
          tenantId,
          branchId,
          drugId: stock.drugId,
          batchNumber: stock.batchNumber,
          movementType: 'EXPIRED',
          quantity: -disposal.quantity,
          balanceBefore,
          balanceAfter,
          reason: `${disposal.reason} | Method: ${disposal.disposalMethod}${disposal.witnessedBy ? ` | Witnessed by: ${disposal.witnessedBy}` : ''}`,
          performedBy: userId,
        },
      });

      results.push({
        stockId: disposal.stockId,
        success: true,
        drugName: stock.drug.genericName,
        batchNumber: stock.batchNumber,
        quantityDisposed: disposal.quantity,
        balanceAfter,
        disposalMethod: disposal.disposalMethod,
        costLoss: (stock.costPrice || 0) * disposal.quantity,
      });
    }

    const totalDisposed = results.filter(r => r.success).length;
    const totalCostLoss = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + ((r as any).costLoss || 0), 0);

    return {
      totalDisposed,
      totalFailed: results.length - totalDisposed,
      totalCostLoss,
      details: results,
    };
  }

  /**
   * Get disposal history for audit/compliance
   */
  async getDisposalHistory(
    tenantId: string,
    branchId?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ) {
    const where: any = {
      tenantId,
      movementType: { in: ['EXPIRED', 'DAMAGED'] },
    };
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.performedAt = {};
      if (startDate) where.performedAt.gte = startDate;
      if (endDate) where.performedAt.lte = endDate;
    }

    return prisma.stockMovement.findMany({
      where,
      include: {
        drug: true,
        performedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Generate expiry alert notifications (to be called by a scheduled job)
   * Returns alerts that should be sent via SMS/email/in-app
   */
  async generateAlertNotifications(tenantId: string) {
    const summary = await this.getExpirySummary(tenantId);
    const notifications: { type: string; severity: string; message: string; data: any }[] = [];

    if (summary.expired.count > 0) {
      notifications.push({
        type: 'DRUG_EXPIRED',
        severity: 'CRITICAL',
        message: `${summary.expired.count} drug batch(es) have EXPIRED. Total value at risk: GH₵${summary.expired.totalValue.toFixed(2)}. Immediate disposal required.`,
        data: { count: summary.expired.count, value: summary.expired.totalValue },
      });
    }

    if (summary.expiring30.count > 0) {
      notifications.push({
        type: 'DRUG_EXPIRING_30',
        severity: 'WARNING',
        message: `${summary.expiring30.count} drug batch(es) expiring within 30 days. Value: GH₵${summary.expiring30.totalValue.toFixed(2)}. Prioritize for dispensing (FEFO).`,
        data: { count: summary.expiring30.count, value: summary.expiring30.totalValue },
      });
    }

    if (summary.expiring60.count > 0) {
      notifications.push({
        type: 'DRUG_EXPIRING_60',
        severity: 'INFO',
        message: `${summary.expiring60.count} drug batch(es) expiring within 60 days. Value: GH₵${summary.expiring60.totalValue.toFixed(2)}.`,
        data: { count: summary.expiring60.count, value: summary.expiring60.totalValue },
      });
    }

    if (summary.expiring90.count > 0) {
      notifications.push({
        type: 'DRUG_EXPIRING_90',
        severity: 'INFO',
        message: `${summary.expiring90.count} drug batch(es) expiring within 90 days. Value: GH₵${summary.expiring90.totalValue.toFixed(2)}.`,
        data: { count: summary.expiring90.count, value: summary.expiring90.totalValue },
      });
    }

    // Store notifications in the NotificationLog
    for (const notif of notifications) {
      try {
        await prisma.notificationLog.create({
          data: {
            tenantId,
            type: notif.type,
            title: `[${notif.severity}] Drug Expiry Alert`,
            message: notif.message,
            data: notif.data as any,
          },
        });
      } catch (e) {
        console.warn('[EXPIRY_ALERT] Failed to log notification:', e);
      }
    }

    return { notifications, summary };
  }
}

export const expiryAlertService = new ExpiryAlertService();
