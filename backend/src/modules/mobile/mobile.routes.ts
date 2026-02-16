import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/utils/prisma.js';

const router = Router();

// ==================== MOBILE AUTH MIDDLEWARE ====================

interface PortalTokenPayload {
  patientId: string;
  tenantId: string;
  type: 'portal';
}

function mobileAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as PortalTokenPayload;
    if (decoded.type !== 'portal') {
      return res.status(403).json({ success: false, message: 'Invalid token type' });
    }
    (req as any).patientId = decoded.patientId;
    (req as any).tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ==================== DEVICE REGISTRATION ====================

router.post('/devices/register', mobileAuth, async (req: Request, res: Response) => {
  try {
    const { deviceToken, platform, deviceId } = req.body;
    const patientId = (req as any).patientId;
    const tenantId = (req as any).tenantId;

    if (!deviceToken || !platform) {
      return res.status(400).json({ success: false, message: 'deviceToken and platform are required' });
    }

    // Upsert device registration
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM mobile_devices WHERE patient_id = $1 AND device_id = $2`,
      patientId, deviceId || deviceToken
    ).catch(() => []);

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE mobile_devices SET device_token = $1, platform = $2, updated_at = NOW() WHERE id = $3`,
        deviceToken, platform, existing[0].id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO mobile_devices (id, tenant_id, patient_id, device_id, device_token, platform, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
        tenantId, patientId, deviceId || deviceToken, deviceToken, platform
      );
    }

    res.json({ success: true, message: 'Device registered successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/devices/:deviceId', mobileAuth, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    await prisma.$executeRawUnsafe(
      `DELETE FROM mobile_devices WHERE patient_id = $1 AND device_id = $2`,
      patientId, req.params.deviceId
    );
    res.json({ success: true, message: 'Device unregistered' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== NOTIFICATIONS ====================

router.get('/notifications', mobileAuth, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, title, body, type, data, is_read, created_at 
       FROM patient_notifications 
       WHERE patient_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      patientId, limit, offset
    ).catch(() => []);

    const unreadCount = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as count FROM patient_notifications WHERE patient_id = $1 AND is_read = false`,
      patientId
    ).catch(() => [{ count: 0 }]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount: unreadCount[0]?.count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/notifications/:id/read', mobileAuth, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    await prisma.$executeRawUnsafe(
      `UPDATE patient_notifications SET is_read = true WHERE id = $1 AND patient_id = $2`,
      req.params.id, patientId
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/notifications/read-all', mobileAuth, async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).patientId;
    await prisma.$executeRawUnsafe(
      `UPDATE patient_notifications SET is_read = true WHERE patient_id = $1 AND is_read = false`,
      patientId
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== APP CONFIG ====================

router.get('/config', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      maintenanceMode: false,
      features: {
        appointments: true,
        labResults: true,
        prescriptions: true,
        invoices: true,
        medicalRecords: true,
        pushNotifications: true,
      },
    },
  });
});

// ==================== HEALTH CHECK ====================

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Mobile API is running', timestamp: new Date().toISOString() });
});

export default router;
