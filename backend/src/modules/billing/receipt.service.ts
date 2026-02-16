import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../../common/services/email.service.js';

const prisma = new PrismaClient();

interface ReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  patientName: string;
  patientMRN: string;
  invoiceNumber: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  cashierName: string;
}

class ReceiptService {
  /**
   * Generate a PDF receipt as a Buffer
   */
  generatePDFReceipt(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(data.hospitalName, { align: 'center' });
      if (data.hospitalAddress) {
        doc.fontSize(10).font('Helvetica').text(data.hospitalAddress, { align: 'center' });
      }
      if (data.hospitalPhone) {
        doc.fontSize(10).text(`Tel: ${data.hospitalPhone}`, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(0.5);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Receipt info
      const infoY = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('Receipt No:', 50, infoY);
      doc.font('Helvetica').text(data.receiptNumber, 140, infoY);
      doc.font('Helvetica-Bold').text('Date:', 350, infoY);
      doc.font('Helvetica').text(data.paymentDate.toLocaleDateString('en-GB'), 400, infoY);

      doc.moveDown(0.3);
      const patY = doc.y;
      doc.font('Helvetica-Bold').text('Patient:', 50, patY);
      doc.font('Helvetica').text(data.patientName, 140, patY);
      doc.font('Helvetica-Bold').text('MRN:', 350, patY);
      doc.font('Helvetica').text(data.patientMRN, 400, patY);

      doc.moveDown(0.3);
      const invY = doc.y;
      doc.font('Helvetica-Bold').text('Invoice:', 50, invY);
      doc.font('Helvetica').text(data.invoiceNumber, 140, invY);
      doc.font('Helvetica-Bold').text('Payment:', 350, invY);
      doc.font('Helvetica').text(data.paymentMethod, 400, invY);

      doc.moveDown(1);

      // Items table header
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
      const headerY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Description', 50, headerY, { width: 220 });
      doc.text('Qty', 280, headerY, { width: 50, align: 'center' });
      doc.text('Unit Price', 340, headerY, { width: 90, align: 'right' });
      doc.text('Total', 440, headerY, { width: 105, align: 'right' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      doc.font('Helvetica').fontSize(9);
      for (const item of data.items) {
        const itemY = doc.y;
        doc.text(item.description, 50, itemY, { width: 220 });
        doc.text(String(item.quantity), 280, itemY, { width: 50, align: 'center' });
        doc.text(`GH₵${item.unitPrice.toFixed(2)}`, 340, itemY, { width: 90, align: 'right' });
        doc.text(`GH₵${item.total.toFixed(2)}`, 440, itemY, { width: 105, align: 'right' });
        doc.moveDown(0.3);
      }

      // Totals
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10);

      const totalsX = 380;
      const totalsValX = 440;

      doc.text('Subtotal:', totalsX, doc.y);
      doc.text(`GH₵${data.subtotal.toFixed(2)}`, totalsValX, doc.y - 12, { width: 105, align: 'right' });

      if (data.discount > 0) {
        doc.text('Discount:', totalsX, doc.y);
        doc.text(`-GH₵${data.discount.toFixed(2)}`, totalsValX, doc.y - 12, { width: 105, align: 'right' });
      }

      if (data.tax > 0) {
        doc.text('Tax:', totalsX, doc.y);
        doc.text(`GH₵${data.tax.toFixed(2)}`, totalsValX, doc.y - 12, { width: 105, align: 'right' });
      }

      doc.moveDown(0.3);
      doc.moveTo(380, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL:', totalsX, doc.y);
      doc.text(`GH₵${data.totalAmount.toFixed(2)}`, totalsValX, doc.y - 14, { width: 105, align: 'right' });

      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10);
      doc.text('Amount Paid:', totalsX, doc.y);
      doc.text(`GH₵${data.amountPaid.toFixed(2)}`, totalsValX, doc.y - 12, { width: 105, align: 'right' });

      if (data.balance > 0) {
        doc.text('Balance Due:', totalsX, doc.y);
        doc.text(`GH₵${data.balance.toFixed(2)}`, totalsValX, doc.y - 12, { width: 105, align: 'right' });
      }

      // Footer
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Cashier: ${data.cashierName}`, 50);
      doc.text(`Printed: ${new Date().toLocaleString('en-GB')}`, 50);
      doc.moveDown(1);
      doc.fontSize(8).text('Thank you for choosing our hospital. Get well soon!', { align: 'center' });
      doc.text('This is a computer-generated receipt.', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Get receipt data for a payment
   */
  async getReceiptData(paymentId: string, tenantId: string): Promise<ReceiptData> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        invoice: {
          include: {
            items: true,
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Look up cashier name from receivedBy
    let cashierName = 'System';
    if (payment.receivedBy) {
      const cashier = await prisma.user.findUnique({
        where: { id: payment.receivedBy },
        select: { firstName: true, lastName: true },
      });
      if (cashier) cashierName = `${cashier.firstName} ${cashier.lastName}`;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true, phone: true },
    });

    const items = payment.invoice.items.map((item: any) => ({
      description: item.description || item.serviceName || 'Service',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.amount || 0,
      total: item.amount || (item.unitPrice || 0) * (item.quantity || 1),
    }));

    // Generate receipt number from payment ID and date
    const receiptNum = `RCP-${payment.paymentDate.getFullYear()}${String(payment.paymentDate.getMonth() + 1).padStart(2, '0')}-${payment.id.slice(0, 8).toUpperCase()}`;

    return {
      receiptNumber: receiptNum,
      paymentDate: payment.paymentDate,
      patientName: `${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName}`,
      patientMRN: payment.invoice.patient.mrn,
      invoiceNumber: payment.invoice.invoiceNumber,
      items,
      subtotal: payment.invoice.subtotal,
      discount: payment.invoice.discount || 0,
      tax: payment.invoice.tax || 0,
      totalAmount: payment.invoice.total,
      amountPaid: payment.amount,
      balance: payment.invoice.balance,
      paymentMethod: payment.paymentMethod,
      hospitalName: tenant?.name || 'Hospital',
      hospitalAddress: tenant?.address || undefined,
      hospitalPhone: tenant?.phone || undefined,
      cashierName,
    };
  }

  /**
   * Generate and return PDF buffer for a payment receipt
   */
  async generateReceipt(paymentId: string, tenantId: string): Promise<Buffer> {
    const data = await this.getReceiptData(paymentId, tenantId);
    return this.generatePDFReceipt(data);
  }

  /**
   * Email receipt to patient
   */
  async emailReceipt(paymentId: string, tenantId: string, patientEmail: string) {
    const data = await this.getReceiptData(paymentId, tenantId);

    // Build HTML receipt for email
    const itemRows = data.items.map(i =>
      `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i.description}</td>
       <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
       <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">GH₵${i.unitPrice.toFixed(2)}</td>
       <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">GH₵${i.total.toFixed(2)}</td></tr>`
    ).join('');

    const receiptHtml = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px;font-weight:bold;">Receipt #</td><td style="padding:8px;">${data.receiptNumber}</td>
            <td style="padding:8px;font-weight:bold;">Date</td><td style="padding:8px;">${data.paymentDate.toLocaleDateString('en-GB')}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;">Patient</td><td style="padding:8px;">${data.patientName}</td>
            <td style="padding:8px;font-weight:bold;">MRN</td><td style="padding:8px;">${data.patientMRN}</td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#1e40af;color:white;">
              <th style="padding:10px;text-align:left;">Description</th>
              <th style="padding:10px;text-align:center;">Qty</th>
              <th style="padding:10px;text-align:right;">Unit Price</th>
              <th style="padding:10px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f9fafb;">
              <td colspan="3" style="padding:10px;text-align:right;">Total:</td>
              <td style="padding:10px;text-align:right;">GH₵${data.totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:10px;text-align:right;">Amount Paid:</td>
              <td style="padding:10px;text-align:right;">GH₵${data.amountPaid.toFixed(2)}</td>
            </tr>
            ${data.balance > 0 ? `<tr style="color:#dc2626;">
              <td colspan="3" style="padding:10px;text-align:right;">Balance:</td>
              <td style="padding:10px;text-align:right;">GH₵${data.balance.toFixed(2)}</td>
            </tr>` : ''}
          </tfoot>
        </table>
      </div>
    `;

    return emailService.sendReceipt(patientEmail, data.patientName, receiptHtml);
  }
}

export const receiptService = new ReceiptService();
