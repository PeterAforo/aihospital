import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { portalService, PortalTokenPayload } from './portal.service.js';
import { sendSuccess, sendError } from '../../common/utils/api-response.js';

const router = Router();

// Portal-specific auth middleware
const portalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as PortalTokenPayload;

    if (decoded.type !== 'patient_portal') {
      sendError(res, 'Invalid token type', 401);
      return;
    }

    (req as any).portal = decoded;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};

// Helper to get patientId from portal token
const pid = (req: Request) => (req as any).portal.patientId as string;
const tid = (req: Request) => (req as any).portal.tenantId as string;

// ==================== AUTH (public) ====================

router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, identifier, password } = req.body;
    if (!tenantId || !identifier || !password) {
      return sendError(res, 'tenantId, identifier, and password are required', 400);
    }
    const result = await portalService.login(tenantId, identifier, password);
    return sendSuccess(res, result, 'Login successful');
  } catch (error) { next(error); }
});

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, mrn, phone, password } = req.body;
    if (!tenantId || !mrn || !phone || !password) {
      return sendError(res, 'tenantId, mrn, phone, and password are required', 400);
    }
    const result = await portalService.registerPortalAccess(tenantId, mrn, phone, password);
    return sendSuccess(res, result, 'Registration successful');
  } catch (error) { next(error); }
});

// ==================== PROTECTED ROUTES ====================

router.use(portalAuth);

// Profile
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await portalService.getProfile(pid(req));
    return sendSuccess(res, profile);
  } catch (error) { next(error); }
});

router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await portalService.updateProfile(pid(req), req.body);
    return sendSuccess(res, updated, 'Profile updated');
  } catch (error) { next(error); }
});

router.post('/auth/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await portalService.changePassword(pid(req), currentPassword, newPassword);
    return sendSuccess(res, result, 'Password changed');
  } catch (error) { next(error); }
});

// Dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await portalService.getDashboard(pid(req));
    return sendSuccess(res, data);
  } catch (error) { next(error); }
});

// Appointments
router.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const appointments = await portalService.getAppointments(pid(req), status as string);
    return sendSuccess(res, appointments);
  } catch (error) { next(error); }
});

router.get('/appointments/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await portalService.getUpcomingAppointments(pid(req));
    return sendSuccess(res, appointments);
  } catch (error) { next(error); }
});

// Lab Results
router.get('/lab-results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await portalService.getLabResults(pid(req));
    return sendSuccess(res, results);
  } catch (error) { next(error); }
});

// Prescriptions
router.get('/prescriptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prescriptions = await portalService.getPrescriptions(pid(req));
    return sendSuccess(res, prescriptions);
  } catch (error) { next(error); }
});

// Billing
router.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const invoices = await portalService.getInvoices(pid(req), status as string);
    return sendSuccess(res, invoices);
  } catch (error) { next(error); }
});

router.get('/invoices/:invoiceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await portalService.getInvoiceDetail(pid(req), req.params.invoiceId);
    return sendSuccess(res, invoice);
  } catch (error) { next(error); }
});

// Medical Records
router.get('/encounters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const encounters = await portalService.getEncounterSummaries(pid(req));
    return sendSuccess(res, encounters);
  } catch (error) { next(error); }
});

router.get('/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vitals = await portalService.getVitalHistory(pid(req));
    return sendSuccess(res, vitals);
  } catch (error) { next(error); }
});

export default router;
