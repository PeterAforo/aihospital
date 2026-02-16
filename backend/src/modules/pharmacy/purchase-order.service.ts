import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PurchaseOrderItemDto {
  drugId: string;
  quantityOrdered: number;
  unitCost: number;
}

interface CreatePurchaseOrderDto {
  supplierId: string;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemDto[];
}

interface ReceiveItemDto {
  itemId: string;
  quantityReceived: number;
  batchNumber: string;
  expiryDate?: Date;
}

class PurchaseOrderService {
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await prisma.purchaseOrder.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async getSuppliers(tenantId: string, activeOnly = true) {
    return prisma.supplier.findMany({
      where: {
        tenantId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(
    tenantId: string,
    data: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      paymentTerms?: string;
    }
  ) {
    return prisma.supplier.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async updateSupplier(supplierId: string, data: Partial<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    paymentTerms: string;
    isActive: boolean;
  }>) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data,
    });
  }

  async getPurchaseOrders(
    tenantId: string,
    branchId?: string,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ) {
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
      include: {
        supplier: true,
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: { drug: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getPurchaseOrderById(orderId: string) {
    return prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: true,
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        receivedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: { drug: true },
        },
      },
    });
  }

  async createPurchaseOrder(
    tenantId: string,
    branchId: string,
    userId: string,
    data: CreatePurchaseOrderDto
  ) {
    const orderNumber = await this.generateOrderNumber(tenantId);
    
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0
    );

    return prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId,
        supplierId: data.supplierId,
        orderNumber,
        expectedDate: data.expectedDate,
        notes: data.notes,
        totalAmount,
        createdBy: userId,
        items: {
          create: data.items.map(item => ({
            drugId: item.drugId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            totalCost: item.quantityOrdered * item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { drug: true } },
      },
    });
  }

  async updatePurchaseOrder(
    orderId: string,
    data: Partial<{
      supplierId: string;
      expectedDate: Date;
      notes: string;
    }>
  ) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new Error('Can only update draft orders');
    }

    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data,
      include: {
        supplier: true,
        items: { include: { drug: true } },
      },
    });
  }

  async submitPurchaseOrder(orderId: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new Error('Can only submit draft orders');
    }

    if (order.items.length === 0) {
      throw new Error('Cannot submit empty order');
    }

    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'SUBMITTED' },
    });
  }

  async approvePurchaseOrder(orderId: string, userId: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status !== 'SUBMITTED') {
      throw new Error('Can only approve submitted orders');
    }

    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }

  async receiveGoods(
    orderId: string,
    userId: string,
    items: ReceiveItemDto[]
  ) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status !== 'APPROVED' && order.status !== 'PARTIAL') {
      throw new Error('Can only receive approved orders');
    }

    for (const receiveItem of items) {
      const poItem = order.items.find(i => i.id === receiveItem.itemId);
      
      if (!poItem) {
        throw new Error(`Order item ${receiveItem.itemId} not found`);
      }

      const remainingQty = poItem.quantityOrdered - poItem.quantityReceived;
      if (receiveItem.quantityReceived > remainingQty) {
        throw new Error(
          `Cannot receive ${receiveItem.quantityReceived}. Only ${remainingQty} remaining.`
        );
      }

      // Update PO item
      await prisma.purchaseOrderItem.update({
        where: { id: receiveItem.itemId },
        data: {
          quantityReceived: { increment: receiveItem.quantityReceived },
          batchNumber: receiveItem.batchNumber,
          expiryDate: receiveItem.expiryDate,
        },
      });

      // Add to stock
      let stock = await prisma.pharmacyStock.findFirst({
        where: {
          tenantId: order.tenantId,
          branchId: order.branchId,
          drugId: poItem.drugId,
          batchNumber: receiveItem.batchNumber,
        },
      });

      const balanceBefore = stock?.quantity || 0;
      const balanceAfter = balanceBefore + receiveItem.quantityReceived;

      if (stock) {
        await prisma.pharmacyStock.update({
          where: { id: stock.id },
          data: {
            quantity: balanceAfter,
            expiryDate: receiveItem.expiryDate ?? stock.expiryDate,
            costPrice: poItem.unitCost,
          },
        });
      } else {
        await prisma.pharmacyStock.create({
          data: {
            tenantId: order.tenantId,
            branchId: order.branchId,
            drugId: poItem.drugId,
            batchNumber: receiveItem.batchNumber,
            quantity: receiveItem.quantityReceived,
            expiryDate: receiveItem.expiryDate,
            costPrice: poItem.unitCost,
            reorderLevel: 10,
          },
        });
      }

      // Record stock movement
      await prisma.stockMovement.create({
        data: {
          tenantId: order.tenantId,
          branchId: order.branchId,
          drugId: poItem.drugId,
          batchNumber: receiveItem.batchNumber,
          movementType: 'RECEIPT',
          quantity: receiveItem.quantityReceived,
          balanceBefore,
          balanceAfter,
          referenceType: 'PURCHASE_ORDER',
          referenceId: orderId,
          performedBy: userId,
        },
      });
    }

    // Check if all items received
    const updatedOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    const allReceived = updatedOrder?.items.every(
      i => i.quantityReceived >= i.quantityOrdered
    );

    await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: allReceived ? 'RECEIVED' : 'PARTIAL',
        receivedBy: userId,
        receivedAt: allReceived ? new Date() : undefined,
      },
    });

    return {
      success: true,
      status: allReceived ? 'RECEIVED' : 'PARTIAL',
    };
  }

  async cancelPurchaseOrder(orderId: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot cancel ${order.status.toLowerCase()} order`);
    }

    return prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }
}

export const purchaseOrderService = new PurchaseOrderService();
