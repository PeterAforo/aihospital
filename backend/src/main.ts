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

// Import services
import { queueWebSocketService } from './common/services/queue-websocket.service.js';
import { reminderScheduler } from './common/services/reminder-scheduler.service.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;

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
    logger.info('WebSocket server initialized');

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

export default app;
