import { prisma } from '../../common/utils/prisma.js';

interface CreatePOItemDto {
  itemType: string;
  itemId?: string;
  itemName: string;
  quantityOrdered: number;
  unitOfMeasure: string;
  unitCost: number;
  taxRate?: number;
  notes?: string;
}

interface CreatePurchaseOrderDto {
  supplierId: string;
  expectedDeliveryDate?: Date;
  paymentTerms?: string;
  deliveryLocation?: string;
  notes?: string;
  items: CreatePOItemDto[];
}

class PurchaseOrderService {
  private async generatePONumber(tenantId: string): Promise<string> {
    const count = await prisma.purchaseOrder.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ── Suppliers ──

  async getSuppliers(tenantId: string, activeOnly = true) {
    return prisma.supplier.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { supplierName: 'asc' },
    });
  }

  async createSupplier(tenantId: string, data: {
    supplierName: string;
    supplierCode: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    supplierType?: string;
    paymentTerms?: string;
    taxId?: string;
    bankDetails?: any;
    isApproved?: boolean;
    notes?: string;
  }) {
    return prisma.supplier.create({ data: { tenantId, ...data } });
  }

  async updateSupplier(supplierId: string, data: Partial<{
    supplierName: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    supplierType: string;
    paymentTerms: string;
    isApproved: boolean;
    rating: number;
    isActive: boolean;
  }>) {
    return prisma.supplier.update({ where: { id: supplierId }, data });
  }

  // ── Purchase Orders ──

  async getPurchaseOrders(tenantId: string, branchId?: string, status?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = startDate;
      if (endDate) where.orderDate.lte = endDate;
    }
    return prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getPurchaseOrderById(orderId: string) {
    return prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { supplier: true, items: true, goodsReceivedNotes: { include: { items: true } } },
    });
  }

  async createPurchaseOrder(tenantId: string, branchId: string, userId: string, data: CreatePurchaseOrderDto) {
    const poNumber = await this.generatePONumber(tenantId);
    const subtotal = data.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
    const taxAmount = data.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost * (i.taxRate || 0) / 100, 0);

    return prisma.purchaseOrder.create({
      data: {
        tenantId, branchId, poNumber, supplierId: data.supplierId, requestedBy: userId,
        expectedDeliveryDate: data.expectedDeliveryDate, paymentTerms: data.paymentTerms,
        deliveryLocation: data.deliveryLocation, notes: data.notes,
        subtotal, taxAmount, totalAmount: subtotal + taxAmount,
        items: {
          create: data.items.map(i => ({
            itemType: i.itemType, itemId: i.itemId, itemName: i.itemName,
            quantityOrdered: i.quantityOrdered, unitOfMeasure: i.unitOfMeasure,
            unitCost: i.unitCost, lineTotal: i.quantityOrdered * i.unitCost,
            taxRate: i.taxRate || 0, notes: i.notes,
          })),
        },
      },
      include: { supplier: true, items: true },
    });
  }

  async submitPurchaseOrder(orderId: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error('Purchase order not found');
    if (order.status !== 'DRAFT') throw new Error('Can only submit draft orders');
    if (order.items.length === 0) throw new Error('Cannot submit empty order');
    return prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: 'SUBMITTED' } });
  }

  async approvePurchaseOrder(orderId: string, userId: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Purchase order not found');
    if (order.status !== 'SUBMITTED') throw new Error('Can only approve submitted orders');
    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async rejectPurchaseOrder(orderId: string, notes?: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Purchase order not found');
    if (order.status !== 'SUBMITTED') throw new Error('Can only reject submitted orders');
    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'REJECTED', notes: notes || order.notes },
    });
  }

  async cancelPurchaseOrder(orderId: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Purchase order not found');
    if (order.status === 'FULLY_RECEIVED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot cancel ${order.status.toLowerCase()} order`);
    }
    return prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }
}

export const purchaseOrderService = new PurchaseOrderService();
