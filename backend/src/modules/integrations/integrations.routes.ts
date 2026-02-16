import { Router, Response } from 'express';
import { nhiaService } from './nhia.service.js';
import { mobileMoneyService } from './momo.service.js';
import { smsService } from './sms.service.js';

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

// ==================== ALL INTEGRATIONS STATUS ====================

router.get('/status', async (req: any, res: Response) => {
  try {
    const [nhia, momo, sms] = await Promise.all([
      nhiaService.getStatus(),
      Promise.resolve(mobileMoneyService.getProviderStatus()),
      Promise.resolve(smsService.getStatus()),
    ]);
    res.json({ success: true, data: { nhia, momo, sms } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
