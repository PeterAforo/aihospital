import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface InvoiceItemDto {
  serviceType: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  nhisApproved?: boolean;
  nhisPrice?: number;
}

interface CreateInvoiceDto {
  patientId: string;
  encounterId?: string;
  items: InvoiceItemDto[];
  paymentMethod?: string;
  notes?: string;
}

class InvoiceService {
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await prisma.invoice.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  async getInvoices(
    tenantId: string,
    status?: string,
    patientId?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ) {
    const where: any = { tenantId };
    
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    return prisma.invoice.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            phonePrimary: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
      take: limit,
    });
  }

  async getInvoiceById(invoiceId: string) {
    return prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          include: {
            nhisInfo: true,
            insurancePolicies: {
              where: { isActive: true },
              include: { company: true },
            },
          },
        },
        items: true,
        payments: true,
      },
    });
  }

  async createInvoice(
    tenantId: string,
    branchId: string,
    userId: string,
    data: CreateInvoiceDto
  ) {
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    const itemsData = data.items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      subtotal += itemTotal;
      totalDiscount += itemDiscount;

      return {
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        total: itemTotal - itemDiscount,
      };
    });

    const total = subtotal - totalDiscount;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        patientId: data.patientId,
        invoiceNumber,
        subtotal,
        discount: totalDiscount,
        total,
        balance: total,
        status: 'PENDING',
        notes: data.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        patient: true,
        items: true,
      },
    });

    return invoice;
  }

  async generateFromEncounter(
    tenantId: string,
    branchId: string,
    userId: string,
    encounterId: string
  ) {
    console.log(`[INVOICE] Generating invoice for encounter ${encounterId}`);
    
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId, tenantId },
      include: {
        patient: {
          include: { nhisInfo: true },
        },
        prescriptions: {
          where: { status: { in: ['DISPENSED', 'PARTIAL'] } },
          include: {
            items: {
              where: { dispensedQty: { gt: 0 } },
              include: { drug: true },
            },
          },
        },
        labOrders: {
          where: { status: { in: ['RESULTED', 'VERIFIED', 'COMPLETED'] } },
          include: {
            items: {
              where: { status: { in: ['RESULTED', 'VERIFIED'] } },
              include: { test: true },
            },
          },
        },
      },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    const items: InvoiceItemDto[] = [];

    // Add triage fee if triage was performed
    if (encounter.triageRecordId) {
      const triagePrice = await prisma.servicePrice.findFirst({
        where: {
          category: 'TRIAGE',
          isActive: true,
        },
      });

      items.push({
        serviceType: 'TRIAGE',
        description: 'Triage Services',
        quantity: 1,
        unitPrice: triagePrice?.cashPrice || 20,
        nhisApproved: true,
        nhisPrice: triagePrice?.nhisPrice || 15,
      });
    }

    // Add consultation fee
    const consultationPrice = await prisma.servicePrice.findFirst({
      where: {
        category: 'CONSULTATION',
        isActive: true,
      },
    });

    items.push({
      serviceType: 'CONSULTATION',
      description: `${encounter.encounterType} Consultation`,
      quantity: 1,
      unitPrice: consultationPrice?.cashPrice || 50,
      nhisApproved: true,
      nhisPrice: consultationPrice?.nhisPrice || 35,
    });

    // Add dispensed drugs
    for (const prescription of encounter.prescriptions) {
      for (const item of prescription.items) {
        if (item.dispensedQty > 0) {
          items.push({
            serviceType: 'DRUG',
            serviceId: item.drugId,
            description: `${item.drug.genericName} ${item.drug.strength || ''}`.trim(),
            quantity: item.dispensedQty,
            unitPrice: item.drug.cashPrice || 0,
            nhisApproved: item.drug.nhisApproved,
            nhisPrice: item.drug.nhisPrice || undefined,
          });
        }
      }
    }

    // Add lab tests
    for (const labOrder of encounter.labOrders) {
      for (const item of labOrder.items) {
        items.push({
          serviceType: 'LAB_TEST',
          serviceId: item.testId,
          description: item.test.name,
          quantity: 1,
          unitPrice: item.test.cashPrice || 0,
          nhisApproved: item.test.nhisApproved,
          nhisPrice: item.test.nhisPrice || undefined,
        });
      }
    }

    console.log(`[INVOICE] Found ${items.length} billable items:`, items.map(i => i.serviceType));
    
    if (items.length === 0) {
      console.log(`[INVOICE] No billable items found for encounter ${encounterId}`);
      throw new Error('No billable items found for this encounter');
    }

    const invoice = await this.createInvoice(tenantId, branchId, userId, {
      patientId: encounter.patientId,
      encounterId,
      items,
    });
    
    console.log(`[INVOICE] Invoice created: ${invoice.invoiceNumber}`);
    return invoice;
  }

  async addItem(invoiceId: string, item: InvoiceItemDto) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING') {
      throw new Error('Cannot modify finalized invoice');
    }

    const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);

    await prisma.invoiceItem.create({
      data: {
        invoiceId,
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: itemTotal,
      },
    });

    // Recalculate totals
    await this.recalculateTotals(invoiceId);

    return this.getInvoiceById(invoiceId);
  }

  async removeItem(invoiceId: string, itemId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING') {
      throw new Error('Cannot modify finalized invoice');
    }

    await prisma.invoiceItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotals(invoiceId);

    return this.getInvoiceById(invoiceId);
  }

  async applyDiscount(invoiceId: string, discount: number, reason: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING') {
      throw new Error('Cannot modify finalized invoice');
    }

    const newTotal = invoice.subtotal - discount;
    const newBalance = newTotal - invoice.amountPaid;

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        discount,
        total: newTotal,
        balance: newBalance,
        notes: invoice.notes ? `${invoice.notes}\nDiscount: ${reason}` : `Discount: ${reason}`,
      },
    });
  }

  async cancelInvoice(invoiceId: string, reason: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Cannot cancel paid invoice');
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        notes: invoice.notes ? `${invoice.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`,
      },
    });
  }

  private async recalculateTotals(invoiceId: string) {
    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId },
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const total = subtotal - (invoice?.discount || 0);
    const balance = total - (invoice?.amountPaid || 0);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { subtotal, total, balance },
    });
  }

  async getDailySummary(tenantId: string, branchId?: string, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      invoiceDate: { gte: startOfDay, lte: endOfDay },
    };

    const invoices = await prisma.invoice.findMany({
      where,
      include: { payments: true },
    });

    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED',
      },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    const byPaymentMethod: Record<string, number> = {};
    for (const payment of payments) {
      const method = payment.paymentMethod;
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + payment.amount;
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      invoiceCount: invoices.length,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      byPaymentMethod,
    };
  }
}

export const invoiceService = new InvoiceService();
