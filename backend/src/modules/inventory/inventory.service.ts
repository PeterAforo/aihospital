import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class InventoryService {
  // ==================== CATEGORIES ====================

  async getCategories(tenantId: string) {
    return prisma.inventoryCategory.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createCategory(tenantId: string, data: any) {
    return prisma.inventoryCategory.create({ data: { tenantId, ...data } });
  }

  async updateCategory(id: string, data: any) {
    return prisma.inventoryCategory.update({ where: { id }, data });
  }

  // ==================== ITEMS ====================

  async getItems(tenantId: string, filters?: {
    categoryId?: string; search?: string; lowStock?: boolean;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId, isActive: true };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.lowStock) where.currentStock = { lte: prisma.inventoryItem.fields.reorderLevel };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getItemById(id: string) {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async createItem(tenantId: string, data: any) {
    return prisma.inventoryItem.create({
      data: {
        tenantId,
        branchId: data.branchId,
        categoryId: data.categoryId,
        name: data.name,
        code: data.code,
        description: data.description,
        unit: data.unit,
        currentStock: data.currentStock || 0,
        reorderLevel: data.reorderLevel || 0,
        reorderQuantity: data.reorderQuantity || 0,
        unitCost: data.unitCost,
        location: data.location,
        supplier: data.supplier,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        notes: data.notes,
      },
    });
  }

  async updateItem(id: string, data: any) {
    return prisma.inventoryItem.update({ where: { id }, data });
  }

  // ==================== TRANSACTIONS ====================

  async recordTransaction(tenantId: string, data: any) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error('Item not found');

    const previousStock = item.currentStock;
    let newStock = previousStock;

    if (data.type === 'RECEIVED' || data.type === 'RETURNED') {
      newStock = previousStock + data.quantity;
    } else if (data.type === 'ISSUED' || data.type === 'DAMAGED' || data.type === 'EXPIRED' || data.type === 'TRANSFERRED') {
      newStock = previousStock - data.quantity;
      if (newStock < 0) throw new Error('Insufficient stock');
    } else if (data.type === 'ADJUSTED') {
      newStock = data.quantity; // Absolute adjustment
    }

    const [transaction] = await Promise.all([
      prisma.inventoryTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          itemId: data.itemId,
          type: data.type,
          quantity: data.quantity,
          previousStock,
          newStock,
          unitCost: data.unitCost,
          totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
          reference: data.reference,
          reason: data.reason,
          performedBy: data.performedBy,
          notes: data.notes,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          currentStock: newStock,
          lastRestocked: (data.type === 'RECEIVED') ? new Date() : undefined,
          unitCost: data.unitCost || undefined,
        },
      }),
    ]);

    return transaction;
  }

  async getTransactions(tenantId: string, filters?: { itemId?: string; type?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.type) where.type = filters.type;

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: { item: { select: { id: true, name: true, code: true, unit: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==================== LOW STOCK ALERTS ====================

  async getLowStockItems(tenantId: string) {
    return prisma.$queryRaw`
      SELECT i.*, c.name as "categoryName"
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i."categoryId" = c.id
      WHERE i."tenantId" = ${tenantId}
        AND i."isActive" = true
        AND i."currentStock" <= i."reorderLevel"
      ORDER BY (i."currentStock"::float / NULLIF(i."reorderLevel", 0)) ASC
    `;
  }

  // ==================== DASHBOARD ====================

  async getDashboardStats(tenantId: string) {
    const [totalItems, lowStock, outOfStock, totalValue] = await Promise.all([
      prisma.inventoryItem.count({ where: { tenantId, isActive: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM inventory_items
        WHERE "tenantId" = ${tenantId} AND "isActive" = true
        AND "currentStock" <= "reorderLevel" AND "currentStock" > 0
      `,
      prisma.inventoryItem.count({ where: { tenantId, isActive: true, currentStock: 0 } }),
      prisma.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM("currentStock" * COALESCE("unitCost", 0)), 0) as total
        FROM inventory_items WHERE "tenantId" = ${tenantId} AND "isActive" = true
      `,
    ]);

    return {
      totalItems,
      lowStock: Number(lowStock[0]?.count || 0),
      outOfStock,
      totalValue: Number(totalValue[0]?.total || 0),
    };
  }
}

export const inventoryService = new InventoryService();
