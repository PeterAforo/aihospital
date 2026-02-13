import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/utils/prisma.js';
import { sendSuccess } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export class TenantController {
  async lookupBySubdomain(req: Request, res: Response, next: NextFunction) {
    try {
      const { subdomain } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { subdomain },
        select: {
          id: true,
          name: true,
          subdomain: true,
          logo: true,
          isActive: true,
        },
      });

      if (!tenant || !tenant.isActive) {
        throw new AppError('Tenant not found', 404);
      }

      sendSuccess(res, tenant);
    } catch (error) {
      next(error);
    }
  }

  async getCurrent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        include: {
          branches: {
            where: { isActive: true },
            select: { id: true, name: true, address: true, phone: true, isMainBranch: true },
          },
        },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      sendSuccess(res, tenant);
    } catch (error) {
      next(error);
    }
  }

  async updateCurrent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, address, city, region, logo } = req.body;

      const tenant = await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(city && { city }),
          ...(region && { region }),
          ...(logo && { logo }),
        },
      });

      sendSuccess(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async listBranches(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branches = await prisma.branch.findMany({
        where: { tenantId: req.tenantId, isActive: true },
        orderBy: { isMainBranch: 'desc' },
      });

      sendSuccess(res, branches);
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, address, city, region, isMainBranch } = req.body;

      const branch = await prisma.branch.create({
        data: {
          tenantId: req.tenantId!,
          name,
          phone,
          email,
          address,
          city,
          region,
          isMainBranch: isMainBranch || false,
        },
      });

      sendSuccess(res, branch, 'Branch created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, address, city, region, isActive } = req.body;

      const branch = await prisma.branch.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(city && { city }),
          ...(region && { region }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      sendSuccess(res, branch, 'Branch updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
