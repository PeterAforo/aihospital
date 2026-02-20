import { Router, Request, Response } from 'express';
import * as svc from './telemedicine.service.js';
import { dailyVideoService } from './daily.service.js';

const router = Router();

// ── Teleconsult Sessions ──
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const result = await svc.createSession(req.body);
    res.status(201).json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { tenantId, doctorId, patientId, status, date } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const result = await svc.getSessions(tenantId as string, { doctorId: doctorId as string, patientId: patientId as string, status: status as string, date: date as string });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const result = await svc.getSessionById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Session not found' });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/sessions/:id/start', async (req: Request, res: Response) => {
  try { res.json(await svc.startSession(req.params.id)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/sessions/:id/waiting', async (req: Request, res: Response) => {
  try { res.json(await svc.joinWaitingRoom(req.params.id)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/sessions/:id/end', async (req: Request, res: Response) => {
  try { res.json(await svc.endSession(req.params.id, req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/sessions/:id/cancel', async (req: Request, res: Response) => {
  try { res.json(await svc.cancelSession(req.params.id, req.body.reason || 'Cancelled')); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Remote Monitoring ──
router.post('/readings', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.submitReading(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/readings', async (req: Request, res: Response) => {
  try {
    const { tenantId, patientId, readingType, limit } = req.query;
    if (!tenantId || !patientId) return res.status(400).json({ error: 'tenantId and patientId required' });
    res.json(await svc.getReadings(tenantId as string, patientId as string, readingType as string, limit ? parseInt(limit as string) : undefined));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/readings/abnormal', async (req: Request, res: Response) => {
  try {
    const { tenantId, reviewed } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getAbnormalReadings(tenantId as string, reviewed === 'true'));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/readings/:id/review', async (req: Request, res: Response) => {
  try { res.json(await svc.reviewReading(req.params.id, req.body.reviewedBy)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── E-Consultations ──
router.post('/e-consult', async (req: Request, res: Response) => {
  try { res.status(201).json(await svc.createEConsultation(req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/e-consult', async (req: Request, res: Response) => {
  try {
    const { tenantId, status, doctorId, patientId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    res.json(await svc.getEConsultations(tenantId as string, { status: status as string, doctorId: doctorId as string, patientId: patientId as string }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/e-consult/:id/respond', async (req: Request, res: Response) => {
  try {
    const { doctorId, response, billingAmount } = req.body;
    if (!doctorId || !response) return res.status(400).json({ error: 'doctorId and response required' });
    res.json(await svc.respondToEConsultation(req.params.id, doctorId, response, billingAmount));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Daily.co Video Rooms ──
router.post('/sessions/:id/room', async (req: Request, res: Response) => {
  try {
    const session = await svc.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { enableRecording, enableScreenShare } = req.body;
    const room = await dailyVideoService.createRoom(req.params.id, {
      expiryMinutes: 120,
      maxParticipants: 4,
      enableRecording,
      enableScreenShare,
    });

    if (!room.success) return res.status(500).json({ error: room.error });

    // Update session with room info
    await svc.startSession(req.params.id);

    res.json({ success: true, roomUrl: room.roomUrl, roomName: room.roomName });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sessions/:id/token', async (req: Request, res: Response) => {
  try {
    const session = await svc.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { userName, userId, isOwner } = req.body;
    if (!userName || !userId) return res.status(400).json({ error: 'userName and userId required' });

    const roomName = (session as any).roomId || `session-${req.params.id.slice(0, 8)}`;
    const token = await dailyVideoService.createMeetingToken(roomName, { userName, userId, isOwner });

    if (!token.success) return res.status(500).json({ error: token.error });
    res.json({ success: true, token: token.token });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/video/status', async (_req: Request, res: Response) => {
  res.json({
    configured: dailyVideoService.isConfigured,
    provider: 'daily.co',
    domain: process.env.DAILY_DOMAIN || 'not-configured',
  });
});

export default router;
