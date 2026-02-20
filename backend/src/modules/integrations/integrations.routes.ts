import { Router, Response } from 'express';
import { nhiaService } from './nhia.service.js';
import { mobileMoneyService } from './momo.service.js';
import { smsService } from './sms.service.js';
import { initializePayment, getSupportedProviders } from './payment-gateway.factory.js';
import { sendSMS as unifiedSendSMS, sendBulkSMS as unifiedSendBulkSMS, sendWhatsApp, getSupportedSMSProviders } from './sms-gateway.factory.js';
import { flutterwaveService } from './flutterwave.service.js';
import { stripeService } from './stripe.service.js';
import { mnotifierService } from './mnotifier.service.js';
import { twilioService } from './twilio.service.js';
import { paystackService } from '../billing/paystack.service.js';
import { verifyPaystackSignature, verifyFlutterwaveSignature, verifyStripeSignature, logWebhook, getWebhookLogs, getWebhookStats } from './webhook.service.js';
import { dhims2Service } from './dhims2.service.js';

const router: Router = Router();

// ==================== NHIA INTEGRATION ====================

router.get('/nhia/status', async (req: any, res: Response) => {
  try {
    const status = await nhiaService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/nhia/verify-member', async (req: any, res: Response) => {
  try {
    const { memberNumber } = req.body;
    if (!memberNumber) return res.status(400).json({ success: false, error: 'memberNumber required' });
    const result = await nhiaService.verifyMember(memberNumber);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/nhia/claims/:claimId/submit', async (req: any, res: Response) => {
  try {
    const result = await nhiaService.submitClaim(req.params.claimId);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/nhia/claims/batch-submit', async (req: any, res: Response) => {
  try {
    const { claimIds } = req.body;
    if (!claimIds?.length) return res.status(400).json({ success: false, error: 'claimIds required' });
    const result = await nhiaService.batchSubmitClaims(claimIds);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/nhia/claims/:reference/status', async (req: any, res: Response) => {
  try {
    const result = await nhiaService.checkClaimStatus(req.params.reference);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== MOBILE MONEY ====================

router.get('/momo/providers', async (req: any, res: Response) => {
  try {
    const providers = mobileMoneyService.getProviderStatus();
    res.json({ success: true, data: providers });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/momo/pay', async (req: any, res: Response) => {
  try {
    const { invoiceId, amount, phoneNumber, provider, description, patientName } = req.body;
    if (!invoiceId || !amount || !phoneNumber || !provider) {
      return res.status(400).json({ success: false, error: 'invoiceId, amount, phoneNumber, and provider are required' });
    }
    const result = await mobileMoneyService.initiatePayment({
      invoiceId, amount, currency: 'GHS', phoneNumber, provider, description: description || 'Hospital payment', patientName: patientName || '',
    });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/momo/status/:transactionId', async (req: any, res: Response) => {
  try {
    const { provider } = req.query;
    const result = await mobileMoneyService.checkPaymentStatus(req.params.transactionId, (provider as string) || 'MTN');
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/momo/callback', async (req: any, res: Response) => {
  try {
    await mobileMoneyService.handleCallback(req.body);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== SMS GATEWAY ====================

router.get('/sms/status', async (req: any, res: Response) => {
  try {
    const status = smsService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms/send', async (req: any, res: Response) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ success: false, error: 'to and message required' });
    const result = await smsService.sendSMS({ to, message });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms/send-bulk', async (req: any, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ success: false, error: 'messages array required' });
    const result = await smsService.sendBulkSMS(messages);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms/appointment-reminder/:appointmentId', async (req: any, res: Response) => {
  try {
    const result = await smsService.sendAppointmentReminder(req.params.appointmentId);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms/send-tomorrow-reminders', async (req: any, res: Response) => {
  try {
    const result = await smsService.sendTomorrowReminders();
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms/lab-result-notification', async (req: any, res: Response) => {
  try {
    const { patientId, testName } = req.body;
    if (!patientId || !testName) return res.status(400).json({ success: false, error: 'patientId and testName required' });
    const result = await smsService.sendLabResultNotification(patientId, testName);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== UNIFIED PAYMENT GATEWAY ====================

router.get('/payment/providers', async (req: any, res: Response) => {
  try {
    const providers = getSupportedProviders();
    res.json({ success: true, data: providers });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/payment/initialize', async (req: any, res: Response) => {
  try {
    const { invoiceId, tenantId, amount, email, phone, name, callbackUrl, preferredProvider, preferredChannel, metadata } = req.body;
    if (!invoiceId || !tenantId || !amount || !email) {
      return res.status(400).json({ success: false, error: 'invoiceId, tenantId, amount, and email are required' });
    }
    const result = await initializePayment({ invoiceId, tenantId, amount, email, phone, name, callbackUrl, preferredProvider, preferredChannel, metadata });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// Flutterwave direct MoMo charge
router.post('/payment/flutterwave/momo', async (req: any, res: Response) => {
  try {
    const { invoiceId, tenantId, amount, phone, network, email } = req.body;
    if (!invoiceId || !tenantId || !amount || !phone || !network || !email) {
      return res.status(400).json({ success: false, error: 'invoiceId, tenantId, amount, phone, network, and email required' });
    }
    const result = await flutterwaveService.chargeMobileMoney({ invoiceId, tenantId, amount, phone, network, email });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// Stripe payment intent (for custom frontend)
router.post('/payment/stripe/intent', async (req: any, res: Response) => {
  try {
    const { invoiceId, tenantId, amount, currency, email, description } = req.body;
    if (!invoiceId || !tenantId || !amount || !email) {
      return res.status(400).json({ success: false, error: 'invoiceId, tenantId, amount, and email required' });
    }
    const result = await stripeService.createPaymentIntent({ invoiceId, tenantId, amount, currency, email, description });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== UNIFIED SMS GATEWAY ====================

router.get('/sms-gateway/providers', async (req: any, res: Response) => {
  try {
    const providers = getSupportedSMSProviders();
    res.json({ success: true, data: providers });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms-gateway/send', async (req: any, res: Response) => {
  try {
    const { to, message, tenantId, type, preferredProvider, channel, scheduleDate } = req.body;
    if (!to || !message || !tenantId) {
      return res.status(400).json({ success: false, error: 'to, message, and tenantId are required' });
    }
    const result = await unifiedSendSMS({ to, message, tenantId, type, preferredProvider, channel, scheduleDate });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms-gateway/send-bulk', async (req: any, res: Response) => {
  try {
    const { messages, tenantId, preferredProvider } = req.body;
    if (!messages?.length || !tenantId) {
      return res.status(400).json({ success: false, error: 'messages array and tenantId required' });
    }
    const result = await unifiedSendBulkSMS({ messages, tenantId, preferredProvider });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/sms-gateway/whatsapp', async (req: any, res: Response) => {
  try {
    const { to, message, tenantId, mediaUrl } = req.body;
    if (!to || !message || !tenantId) {
      return res.status(400).json({ success: false, error: 'to, message, and tenantId required' });
    }
    const result = await sendWhatsApp(tenantId, to, message, mediaUrl);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// mNotifier specific endpoints
router.get('/sms-gateway/mnotifier/balance', async (req: any, res: Response) => {
  try {
    const result = await mnotifierService.checkBalance();
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/sms-gateway/mnotifier/delivery/:messageId', async (req: any, res: Response) => {
  try {
    const result = await mnotifierService.getDeliveryReport(req.params.messageId);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// Twilio specific endpoints
router.post('/sms-gateway/twilio/whatsapp-template', async (req: any, res: Response) => {
  try {
    const { to, templateSid, variables } = req.body;
    if (!to || !templateSid) return res.status(400).json({ success: false, error: 'to and templateSid required' });
    const result = await twilioService.sendWhatsAppTemplate(to, templateSid, variables);
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== WEBHOOKS ====================

// Paystack webhook
router.post('/webhooks/paystack', async (req: any, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (process.env.PAYSTACK_SECRET_KEY && !verifyPaystackSignature(rawBody, signature)) {
      await logWebhook({ provider: 'Paystack', eventType: req.body.event || 'unknown', payload: req.body, status: 'failed', error: 'Invalid signature' });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const result = await paystackService.handleWebhook(req.body);
    await logWebhook({ provider: 'Paystack', eventType: req.body.event, payload: req.body, status: result.processed ? 'processed' : 'ignored', referenceId: req.body.data?.reference, tenantId: req.body.data?.metadata?.tenantId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    await logWebhook({ provider: 'Paystack', eventType: req.body?.event || 'unknown', payload: req.body, status: 'failed', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Flutterwave webhook
router.post('/webhooks/flutterwave', async (req: any, res: Response) => {
  try {
    const secretHash = req.headers['verif-hash'] as string;
    if (process.env.FLUTTERWAVE_SECRET_HASH && !verifyFlutterwaveSignature(secretHash)) {
      await logWebhook({ provider: 'Flutterwave', eventType: req.body.event || 'unknown', payload: req.body, status: 'failed', error: 'Invalid hash' });
      return res.status(401).json({ error: 'Invalid hash' });
    }

    const result = await flutterwaveService.handleWebhook(req.body);
    await logWebhook({ provider: 'Flutterwave', eventType: req.body.event, payload: req.body, status: result.processed ? 'processed' : 'ignored', referenceId: req.body.data?.tx_ref, tenantId: (req.body.data?.meta as any)?.tenantId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    await logWebhook({ provider: 'Flutterwave', eventType: req.body?.event || 'unknown', payload: req.body, status: 'failed', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stripe webhook
router.post('/webhooks/stripe', async (req: any, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (process.env.STRIPE_WEBHOOK_SECRET && !verifyStripeSignature(rawBody, signature)) {
      await logWebhook({ provider: 'Stripe', eventType: req.body.type || 'unknown', payload: req.body, status: 'failed', error: 'Invalid signature' });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const result = await stripeService.handleWebhook(req.body);
    await logWebhook({ provider: 'Stripe', eventType: req.body.type, payload: req.body, status: result.processed ? 'processed' : 'ignored', referenceId: req.body.data?.object?.id, tenantId: req.body.data?.object?.metadata?.tenantId });
    res.json({ success: true, data: result });
  } catch (error: any) {
    await logWebhook({ provider: 'Stripe', eventType: req.body?.type || 'unknown', payload: req.body, status: 'failed', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// MoMo callback
router.post('/webhooks/momo', async (req: any, res: Response) => {
  try {
    await mobileMoneyService.handleCallback(req.body);
    await logWebhook({ provider: 'MoMo', eventType: 'callback', payload: req.body, status: 'processed', referenceId: req.body.externalId });
    res.json({ success: true });
  } catch (error: any) {
    await logWebhook({ provider: 'MoMo', eventType: 'callback', payload: req.body, status: 'failed', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Twilio status callback
router.post('/webhooks/twilio/status', async (req: any, res: Response) => {
  try {
    const result = await twilioService.handleStatusCallback(req.body);
    await logWebhook({ provider: 'Twilio', eventType: `status:${req.body.MessageStatus}`, payload: req.body, status: 'processed', referenceId: req.body.MessageSid });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Twilio incoming message
router.post('/webhooks/twilio/incoming', async (req: any, res: Response) => {
  try {
    const result = await twilioService.handleIncomingMessage(req.body);
    await logWebhook({ provider: 'Twilio', eventType: 'incoming_message', payload: req.body, status: 'processed', referenceId: req.body.MessageSid });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook logs
router.get('/webhooks/logs', async (req: any, res: Response) => {
  try {
    const { tenantId, limit } = req.query;
    const logs = await getWebhookLogs(tenantId as string, limit ? parseInt(limit as string) : 50);
    res.json({ success: true, data: logs });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/webhooks/stats', async (req: any, res: Response) => {
  try {
    const { tenantId } = req.query;
    const stats = await getWebhookStats(tenantId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== ALL INTEGRATIONS STATUS ====================

router.get('/status', async (req: any, res: Response) => {
  try {
    const [nhia, momo, sms, paymentProviders, smsProviders, mnotifier, twilio] = await Promise.all([
      nhiaService.getStatus(),
      Promise.resolve(mobileMoneyService.getProviderStatus()),
      Promise.resolve(smsService.getStatus()),
      Promise.resolve(getSupportedProviders()),
      Promise.resolve(getSupportedSMSProviders()),
      Promise.resolve(mnotifierService.getStatus()),
      Promise.resolve(twilioService.getStatus()),
    ]);
    res.json({ success: true, data: { nhia, momo, sms, paymentProviders, smsProviders, mnotifier, twilio } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== DHIMS2 REPORTING ====================

router.get('/dhims2/opd', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const report = await dhims2Service.generateOPDReport(req.tenantId || req.user?.tenantId, m, y);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dhims2/ipd', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const report = await dhims2Service.generateIPDReport(req.tenantId || req.user?.tenantId, m, y);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dhims2/maternal', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const report = await dhims2Service.generateMaternalReport(req.tenantId || req.user?.tenantId, m, y);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dhims2/lab', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const report = await dhims2Service.generateLabReport(req.tenantId || req.user?.tenantId, m, y);
    res.json({ success: true, data: report });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/dhims2/bundle', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const bundle = await dhims2Service.generateMonthlyBundle(req.tenantId || req.user?.tenantId, m, y);
    res.json({ success: true, data: bundle });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
