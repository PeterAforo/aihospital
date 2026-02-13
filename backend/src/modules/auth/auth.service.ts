import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/utils/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  branchId?: string;
  departmentId?: string;
  branchAccessScope?: string;
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

    return user;
  }

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

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      branchId: user.branchId || undefined,
      departmentId: user.departmentId || undefined,
      branchAccessScope: user.branchAccessScope || undefined,
    });

    // Update refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
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

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
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

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expire,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expire,
    };
  }
}
