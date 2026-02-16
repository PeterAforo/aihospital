import { PrismaClient, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}

class PaymentService {
  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const count = await prisma.payment.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `RCP-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  async recordPayment(
    tenantId: string,
    branchId: string,
    userId: string,
    data: RecordPaymentDto
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already fully paid');
    }

    if (invoice.status === 'CANCELLED') {
      throw new Error('Cannot pay cancelled invoice');
    }

    if (data.amount > invoice.balance) {
      throw new Error(`Payment amount exceeds balance. Maximum: ${invoice.balance}`);
    }

    const receiptNumber = await this.generateReceiptNumber(tenantId);

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionRef: data.transactionRef,
        notes: data.notes,
        receivedBy: userId,
        status: 'COMPLETED',
      },
    });

    // Update invoice
    const newAmountPaid = invoice.amountPaid + data.amount;
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      },
    });

    return {
      payment,
      receiptNumber,
      invoiceStatus: newStatus,
      remainingBalance: newBalance,
    };
  }

  async getPayments(
    tenantId: string,
    branchId?: string,
    startDate?: Date,
    endDate?: Date,
    paymentMethod?: PaymentMethod,
    limit = 50
  ) {
    const where: any = { tenantId };
    
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    return prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            patient: {
              select: {
                id: true,
                mrn: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    });
  }

  async getPaymentById(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            patient: true,
            items: true,
          },
        },
      },
    });
  }

  async processRefund(
    paymentId: string,
    userId: string,
    amount: number,
    reason: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'REFUNDED') {
      throw new Error('Payment already refunded');
    }

    if (amount > payment.amount) {
      throw new Error(`Refund amount exceeds payment. Maximum: ${payment.amount}`);
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: amount === payment.amount ? 'REFUNDED' : 'PARTIAL_REFUND',
        notes: payment.notes ? `${payment.notes}\nRefund: ${reason}` : `Refund: ${reason}`,
      },
    });

    // Update invoice
    const invoice = payment.invoice;
    const newAmountPaid = invoice.amountPaid - amount;
    const newBalance = invoice.total - newAmountPaid;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newBalance > 0 ? 'PARTIAL' : 'PAID',
      },
    });

    return {
      success: true,
      refundedAmount: amount,
      newInvoiceBalance: newBalance,
    };
  }

  async initiateMobileMoneyPayment(
    tenantId: string,
    invoiceId: string,
    phone: string,
    network: string,
    amount: number
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (amount > invoice.balance) {
      throw new Error(`Amount exceeds balance. Maximum: ${invoice.balance}`);
    }

    // Create pending transaction
    const transaction = await prisma.mobileMoneyTransaction.create({
      data: {
        tenantId,
        invoiceId,
        amount,
        phone,
        network,
        status: 'PENDING',
      },
    });

    // In production, this would call the actual MoMo API
    // For now, we simulate the request
    return {
      transactionId: transaction.id,
      status: 'PENDING',
      message: `Payment request of GHS ${amount} sent to ${phone}. Please approve on your phone.`,
    };
  }

  async handleMobileMoneyCallback(
    transactionId: string,
    status: 'SUCCESS' | 'FAILED',
    externalRef?: string,
    statusMessage?: string
  ) {
    const transaction = await prisma.mobileMoneyTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Transaction already processed');
    }

    await prisma.mobileMoneyTransaction.update({
      where: { id: transactionId },
      data: {
        status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        externalRef,
        statusMessage,
        completedAt: new Date(),
      },
    });

    if (status === 'SUCCESS' && transaction.invoiceId) {
      // Create payment record
      const invoice = await prisma.invoice.findUnique({
        where: { id: transaction.invoiceId },
      });

      if (invoice) {
        const paymentMethod = transaction.network === 'MTN' ? 'MTN_MOMO' :
          transaction.network === 'VODAFONE' ? 'VODAFONE_CASH' : 'AIRTELTIGO_MONEY';

        await prisma.payment.create({
          data: {
            tenantId: transaction.tenantId,
            invoiceId: transaction.invoiceId,
            amount: transaction.amount,
            paymentMethod: paymentMethod as PaymentMethod,
            transactionRef: externalRef,
            status: 'COMPLETED',
          },
        });

        // Update invoice
        const newAmountPaid = invoice.amountPaid + transaction.amount;
        const newBalance = invoice.total - newAmountPaid;

        await prisma.invoice.update({
          where: { id: transaction.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          },
        });
      }
    }

    return { success: true, status };
  }

  async getOutstandingInvoices(tenantId: string, patientId?: string) {
    const where: any = {
      tenantId,
      status: { in: ['PENDING', 'PARTIAL'] },
      balance: { gt: 0 },
    };

    if (patientId) where.patientId = patientId;

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
      },
      orderBy: { invoiceDate: 'asc' },
    });
  }

  async getAgingReport(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const outstanding = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'PARTIAL'] },
        balance: { gt: 0 },
      },
      include: {
        patient: {
          select: { id: true, mrn: true, firstName: true, lastName: true },
        },
      },
    });

    const current: any[] = [];
    const days30: any[] = [];
    const days60: any[] = [];
    const days90Plus: any[] = [];

    for (const invoice of outstanding) {
      if (invoice.invoiceDate >= thirtyDaysAgo) {
        current.push(invoice);
      } else if (invoice.invoiceDate >= sixtyDaysAgo) {
        days30.push(invoice);
      } else if (invoice.invoiceDate >= ninetyDaysAgo) {
        days60.push(invoice);
      } else {
        days90Plus.push(invoice);
      }
    }

    return {
      current: {
        count: current.length,
        total: current.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: current,
      },
      days30: {
        count: days30.length,
        total: days30.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: days30,
      },
      days60: {
        count: days60.length,
        total: days60.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: days60,
      },
      days90Plus: {
        count: days90Plus.length,
        total: days90Plus.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: days90Plus,
      },
      totalOutstanding: outstanding.reduce((sum, inv) => sum + inv.balance, 0),
    };
  }
}

export const paymentService = new PaymentService();
