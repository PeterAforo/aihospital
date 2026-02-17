import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../../common/middleware/auth';
import { invoiceService } from './invoice.service';
import { paymentService } from './payment.service';
import { nhisService } from './nhis.service';
import { receiptService } from './receipt.service';
import { paystackService } from './paystack.service';
import crypto from 'crypto';

const router = Router();

router.use(authenticate);

// ==================== INVOICES ====================

router.get('/invoices', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, patientId, startDate, endDate, limit } = req.query;
    
    const invoices = await invoiceService.getInvoices(
      user.tenantId,
      status as string,
      patientId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/invoices/:id', requirePermission('VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/invoices', requirePermission('CREATE_INVOICE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { patientId, encounterId, items, paymentMethod, notes } = req.body;
    
    if (!patientId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'patientId and items are required' });
    }
    
    const invoice = await invoiceService.createInvoice(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { patientId, encounterId, items, paymentMethod, notes }
    );
    
    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/invoices/from-encounter/:encounterId', requirePermission('CREATE_INVOICE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { encounterId } = req.params;
    
    const invoice = await invoiceService.generateFromEncounter(
      user.tenantId,
      user.branchId || '',
      user.userId,
      encounterId
    );
    
    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/invoices/:id/items', requirePermission('EDIT_INVOICE'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = req.body;
    
    if (!item.description || !item.quantity || !item.unitPrice) {
      return res.status(400).json({ success: false, error: 'description, quantity, and unitPrice are required' });
    }
    
    const invoice = await invoiceService.addItem(id, item);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/invoices/:id/items/:itemId', requirePermission('EDIT_INVOICE'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const invoice = await invoiceService.removeItem(id, itemId);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/invoices/:id/discount', requirePermission('APPLY_DISCOUNT'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { discount, reason } = req.body;
    
    if (discount === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'discount and reason are required' });
    }
    
    const invoice = await invoiceService.applyDiscount(id, discount, reason);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/invoices/:id/cancel', requirePermission('CANCEL_INVOICE'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }
    
    const invoice = await invoiceService.cancelInvoice(id, reason);
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENTS ====================

router.get('/payments', requirePermission('VIEW_PAYMENTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate, paymentMethod, limit } = req.query;
    
    const payments = await paymentService.getPayments(
      user.tenantId,
      user.branchId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      paymentMethod as any,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/payments/:id', requirePermission('VIEW_PAYMENTS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/payments', requirePermission('RECEIVE_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { invoiceId, amount, paymentMethod, transactionRef, notes } = req.body;
    
    if (!invoiceId || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'invoiceId, amount, and paymentMethod are required' });
    }
    
    const result = await paymentService.recordPayment(
      user.tenantId,
      user.branchId || '',
      user.userId,
      { invoiceId, amount, paymentMethod, transactionRef, notes }
    );
    
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/payments/:id/refund', requirePermission('PROCESS_REFUND'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || !reason) {
      return res.status(400).json({ success: false, error: 'amount and reason are required' });
    }
    
    const result = await paymentService.processRefund(id, user.userId, amount, reason);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MOBILE MONEY ====================

router.post('/payments/mobile-money/initiate', requirePermission('RECEIVE_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { invoiceId, phone, network, amount } = req.body;
    
    if (!invoiceId || !phone || !network || !amount) {
      return res.status(400).json({ success: false, error: 'invoiceId, phone, network, and amount are required' });
    }
    
    const result = await paymentService.initiateMobileMoneyPayment(
      user.tenantId,
      invoiceId,
      phone,
      network,
      amount
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/payments/mobile-money/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, status, externalRef, statusMessage } = req.body;
    
    const result = await paymentService.handleMobileMoneyCallback(
      transactionId,
      status,
      externalRef,
      statusMessage
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPORTS ====================

router.get('/reports/daily-summary', requirePermission('VIEW_BILLING_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { date } = req.query;
    
    const summary = await invoiceService.getDailySummary(
      user.tenantId,
      user.branchId,
      date ? new Date(date as string) : undefined
    );
    
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/outstanding', requirePermission('VIEW_BILLING_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { patientId } = req.query;
    
    const invoices = await paymentService.getOutstandingInvoices(
      user.tenantId,
      patientId as string
    );
    
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/aging', requirePermission('VIEW_FINANCIAL_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const report = await paymentService.getAgingReport(user.tenantId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== NHIS CLAIMS ====================

router.get('/nhis/claims', requirePermission('VIEW_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, startDate, endDate, limit } = req.query;
    const claims = await nhisService.getClaims(
      user.tenantId,
      status as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, data: claims });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/nhis/claims/summary', requirePermission('VIEW_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const summary = await nhisService.getClaimsSummary(user.tenantId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/nhis/claims/:id', requirePermission('VIEW_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claim = await nhisService.getClaimById(id);
    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found' });
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims', requirePermission('CREATE_NHIS_CLAIM'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const claim = await nhisService.createClaim(user.tenantId, user.userId, req.body);
    res.status(201).json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/from-invoice/:invoiceId', requirePermission('CREATE_NHIS_CLAIM'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { invoiceId } = req.params;
    const claim = await nhisService.createClaimFromInvoice(user.tenantId, user.userId, invoiceId);
    res.status(201).json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/:id/submit', requirePermission('SUBMIT_NHIS_CLAIM'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claim = await nhisService.submitClaim(id);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/:id/approve', requirePermission('MANAGE_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approvedAmount } = req.body;
    if (approvedAmount === undefined) return res.status(400).json({ success: false, error: 'approvedAmount is required' });
    const claim = await nhisService.approveClaim(id, approvedAmount);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/:id/reject', requirePermission('MANAGE_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const claim = await nhisService.rejectClaim(id, reason);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/:id/mark-paid', requirePermission('MANAGE_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paidAmount } = req.body;
    if (paidAmount === undefined) return res.status(400).json({ success: false, error: 'paidAmount is required' });
    const claim = await nhisService.markClaimPaid(id, paidAmount);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/nhis/claims/:id/xml', requirePermission('SUBMIT_NHIS_CLAIM'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const xml = await nhisService.generateClaimXML(id);
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="nhis-claim-${id}.xml"`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/claims/batch-xml', requirePermission('SUBMIT_NHIS_CLAIM'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { claimIds } = req.body;
    if (!claimIds || claimIds.length === 0) return res.status(400).json({ success: false, error: 'claimIds are required' });
    const xml = await nhisService.generateBatchXML(user.tenantId, claimIds);
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', 'attachment; filename="nhis-batch-claims.xml"');
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/nhis/reconcile', requirePermission('MANAGE_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'items are required' });
    const results = await nhisService.reconcileClaims(user.tenantId, items);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/nhis/tariffs', requirePermission('VIEW_NHIS_CLAIMS'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, activeOnly } = req.query;
    const tariffs = await nhisService.getTariffs(category as string, activeOnly !== 'false');
    res.json({ success: true, data: tariffs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYSTACK PAYMENT GATEWAY ====================

// Initialize Paystack payment
router.post('/paystack/initialize', requirePermission('PROCESS_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { invoiceId, email, channels } = req.body;
    if (!invoiceId || !email) {
      return res.status(400).json({ success: false, error: 'invoiceId and email are required' });
    }
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice || invoice.balance <= 0) {
      return res.status(400).json({ success: false, error: 'Invoice not found or already paid' });
    }
    const result = await paystackService.initializePayment({
      invoiceId,
      tenantId: user.tenantId,
      amount: invoice.balance,
      email,
      channels,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify Paystack transaction
router.get('/paystack/verify/:reference', requirePermission('PROCESS_PAYMENT', 'VIEW_INVOICES'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await paystackService.verifyTransaction(req.params.reference);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RECEIPTS ====================

// Generate PDF receipt for a payment
router.get('/receipts/:paymentId/pdf', requirePermission('VIEW_INVOICES', 'PROCESS_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const pdfBuffer = await receiptService.generateReceipt(req.params.paymentId, user.tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt-${req.params.paymentId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get receipt data (JSON) for a payment
router.get('/receipts/:paymentId', requirePermission('VIEW_INVOICES', 'PROCESS_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const data = await receiptService.getReceiptData(req.params.paymentId, user.tenantId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email receipt to patient
router.post('/receipts/:paymentId/email', requirePermission('VIEW_INVOICES', 'PROCESS_PAYMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Patient email is required' });
    }
    const result = await receiptService.emailReceipt(req.params.paymentId, user.tenantId, email);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
