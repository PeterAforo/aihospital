import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/index.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { auditLogger } from './common/middleware/audit.middleware.js';
import { logger } from './common/utils/logger.js';
import { prisma } from './common/utils/prisma.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import registrationRoutes from './modules/registration/registration.routes.js';
import patientRoutes from './modules/patient/patient.routes.js';
import appointmentRoutes from './modules/appointment/appointment.routes.js';
import walkInRoutes from './modules/appointment/walk-in.routes.js';
import userRoutes from './modules/user/user.routes.js';
import rbacRoutes from './modules/user/rbac.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import triageRoutes from './modules/triage/triage.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import emrRoutes from './modules/emr/emr.routes.js';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes.js';
import laboratoryRoutes from './modules/laboratory/laboratory.routes.js';
import billingRoutes from './modules/billing/billing.routes';
import notificationRoutes from './modules/notifications/notification.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import inpatientRoutes from './modules/inpatient/inpatient.routes.js';
import integrationsRoutes from './modules/integrations/integrations.routes.js';
import radiologyRoutes from './modules/radiology/radiology.routes.js';
import theatreRoutes from './modules/theatre/theatre.routes.js';
import maternityRoutes from './modules/maternity/maternity.routes.js';
import emergencyRoutes from './modules/emergency/emergency.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import equipmentRoutes from './modules/equipment/equipment.routes.js';
import hrRoutes from './modules/hr/hr.routes.js';
import portalRoutes from './modules/portal/portal.routes.js';
import mobileRoutes from './modules/mobile/mobile.routes.js';
import setupRoutes from './modules/setup/setup.routes.js';

// Import services
import { queueWebSocketService } from './common/services/queue-websocket.service.js';
import { reminderScheduler } from './common/services/reminder-scheduler.service.js';
import { paystackService } from './modules/billing/paystack.service';
import crypto from 'crypto';
import { apiLimiter, webhookLimiter } from './common/middleware/rate-limiter';
import { erWebSocketService } from './common/services/er-websocket.service';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowed = config.allowedOrigins.map(o => o.trim());
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked origin: ${origin}. Allowed: ${allowed.join(', ')}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch { dbStatus = 'disconnected'; }

  res.json({
    uptime: Math.round(uptime),
    uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    },
    database: dbStatus,
    websockets: {
      queueClients: queueWebSocketService.getAllConnectedClients(),
    },
    timestamp: new Date().toISOString(),
  });
});

// Apply global API rate limiter
app.use('/api', apiLimiter);

// Paystack webhook (no auth — verified by signature)
app.post('/api/webhooks/paystack', webhookLimiter, express.json(), (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  paystackService.handleWebhook(req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Audit logging middleware (logs all POST/PUT/DELETE/PATCH requests)
app.use(auditLogger);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/walk-in', walkInRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/emr', emrRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', laboratoryRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/inpatient', inpatientRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/theatre', theatreRoutes);
app.use('/api/maternity', maternityRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/setup', setupRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server (only when not running as serverless function)
const PORT = config.port;
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  async function bootstrap() {
    try {
      // Test database connection
      await prisma.$connect();
      logger.info('Database connected successfully');

      const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });

      // Initialize WebSocket for queue updates
      queueWebSocketService.init(server);
      erWebSocketService.init(server);
      logger.info('WebSocket servers initialized (queue + ER board)');

      // Start reminder scheduler
      reminderScheduler.start();
      logger.info('Reminder scheduler started');
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });

  bootstrap();
}

export default app;
