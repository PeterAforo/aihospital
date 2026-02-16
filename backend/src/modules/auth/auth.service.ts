import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/utils/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { UserRole } from '@prisma/client';
import { getUserPermissions } from '../../common/middleware/auth.js';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  branchId?: string;
  departmentId?: string;
  branchAccessScope?: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: data.tenantId,
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    });

    if (existingUser) {
      throw new AppError('User with this email or phone already exists', 409, 'USER_EXISTS');
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // Auto-create HR StaffProfile for the new user
    try {
      await prisma.staffProfile.create({
        data: {
          tenantId: data.tenantId,
          userId: user.id,
          employmentType: 'FULL_TIME',
          dateOfJoining: new Date(),
          isActive: true,
        },
      });
    } catch (e: any) {
      // Ignore if profile already exists (unique constraint on userId)
      if (!e.code || e.code !== 'P2002') {
        console.error('Failed to auto-create StaffProfile:', e.message);
      }
    }

    return user;
  }

  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;

  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: data.email,
        ...(data.tenantId && { tenantId: data.tenantId }),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Account is locked. Try again in ${minutesLeft} minute(s).`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= AuthService.MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + AuthService.LOCKOUT_DURATION_MINUTES * 60 * 1000);
        updateData.failedLoginAttempts = 0;
        await prisma.user.update({ where: { id: user.id }, data: updateData });
        throw new AppError(
          `Too many failed attempts. Account locked for ${AuthService.LOCKOUT_DURATION_MINUTES} minutes.`,
          423,
          'ACCOUNT_LOCKED'
        );
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new AppError(
        `Invalid email or password. ${AuthService.MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining.`,
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Check if MFA is enabled — if so, return partial response requiring MFA verification
    if (user.mfaEnabled) {
      // Reset failed attempts on correct password
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });

      return {
        mfaRequired: true,
        mfaUserId: user.id,
        message: 'MFA verification required. Please provide your authenticator code.',
      };
    }

    // Successful login — reset failed attempts and lockout
    // Resolve user permissions from RBAC system
    const permissions = await getUserPermissions(user.id);

    const tokens = this.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      branchId: user.branchId || undefined,
      departmentId: user.departmentId || undefined,
      branchAccessScope: user.branchAccessScope || undefined,
      permissions,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
        tenant: user.tenant,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

      // Verify user and refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
            },
          },
        },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
      }

      // Generate new tokens with fresh permissions
      const permissions = await getUserPermissions(user.id);

      const tokens = this.generateTokens({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        permissions,
      });

      // Update refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions,
          tenant: user.tenant,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
      }
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: { id: true, name: true, subdomain: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
    }

    const permissions = await getUserPermissions(user.id);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions,
      tenant: user.tenant,
    };
  }

  async completeMFALogin(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    const permissions = await getUserPermissions(user.id);

    const tokens = this.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      branchId: user.branchId || undefined,
      departmentId: user.departmentId || undefined,
      branchAccessScope: user.branchAccessScope || undefined,
      permissions,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
        lastLoginAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
        tenant: user.tenant,
      },
      tokens,
    };
  }

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload as any, config.jwt.secret, {
      expiresIn: config.jwt.expire as any,
    });

    const refreshToken = jwt.sign(payload as any, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expire,
    };
  }
}
