import { Response, NextFunction } from 'express';
import { prisma } from '../../common/utils/prisma.js';
import { sendSuccess, sendPaginated } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export class UserController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { tenantId: req.tenantId };
      if (role) where.role = role;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      sendPaginated(res, users, Number(page), Number(limit), total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          mfaEnabled: true,
          tenant: { select: { id: true, name: true, subdomain: true } },
          branch: { select: { id: true, name: true } },
        },
      });

      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, phone } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      sendSuccess(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, phone, role, isActive, branchId } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
          ...(branchId && { branchId }),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      sendSuccess(res, null, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDoctors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const doctors = await prisma.user.findMany({
        where: {
          tenantId: req.tenantId,
          role: 'DOCTOR',
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      sendSuccess(res, doctors);
    } catch (error) {
      next(error);
    }
  }
}
