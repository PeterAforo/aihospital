import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Prisma for serverless
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'vercel' });
});

// Auth - Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true, branch: true, department: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is suspended' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

    const accessToken = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tenantId: user.tenantId },
      jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), refreshToken },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name, subdomain: user.tenant.subdomain } : null,
          branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null,
          department: user.department ? { id: user.department.id, name: user.department.name } : null,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

// Auth - Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const newAccessToken = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, tenantId: user.tenantId },
      jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      },
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Tenant lookup
app.get('/api/tenants/lookup/:subdomain', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: req.params.subdomain },
      select: { id: true, name: true, subdomain: true, logoUrl: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Catch-all for unimplemented endpoints
app.all('/api/*', (req, res) => {
  res.status(501).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not yet implemented in serverless mode`,
  });
});

// Vercel handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
