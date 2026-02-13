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
        where: { tenantId: req.tenantId },
        include: {
          _count: {
            select: { users: true, appointments: true },
          },
        },
        orderBy: [{ isMainBranch: 'desc' }, { name: 'asc' }],
      });

      sendSuccess(res, branches);
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { 
        name, code, branchType, phone, email, address, city, region, 
        isMainBranch, hasEmergency, hasInpatient, hasLab, hasPharmacy 
      } = req.body;

      const branch = await prisma.branch.create({
        data: {
          tenantId: req.tenantId!,
          name,
          code,
          branchType: branchType || 'SATELLITE_CLINIC',
          phone,
          email,
          address,
          city,
          region,
          isMainBranch: isMainBranch || false,
          hasEmergency: hasEmergency || false,
          hasInpatient: hasInpatient || false,
          hasLab: hasLab !== false,
          hasPharmacy: hasPharmacy !== false,
        },
      });

      sendSuccess(res, branch, 'Branch created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { 
        name, code, branchType, phone, email, address, city, region, 
        isActive, hasEmergency, hasInpatient, hasLab, hasPharmacy 
      } = req.body;

      const branch = await prisma.branch.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(code !== undefined && { code }),
          ...(branchType && { branchType }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(city !== undefined && { city }),
          ...(region !== undefined && { region }),
          ...(isActive !== undefined && { isActive }),
          ...(hasEmergency !== undefined && { hasEmergency }),
          ...(hasInpatient !== undefined && { hasInpatient }),
          ...(hasLab !== undefined && { hasLab }),
          ...(hasPharmacy !== undefined && { hasPharmacy }),
        },
      });

      sendSuccess(res, branch, 'Branch updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branch = await prisma.branch.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
        include: { _count: { select: { users: true, appointments: true } } },
      });

      if (!branch) {
        throw new AppError('Branch not found', 404);
      }

      if (branch.isMainBranch) {
        throw new AppError('Cannot delete main branch', 400);
      }

      if (branch._count.users > 0 || branch._count.appointments > 0) {
        throw new AppError('Cannot delete branch with assigned users or appointments', 400);
      }

      await prisma.branch.delete({ where: { id: branch.id } });

      sendSuccess(res, null, 'Branch deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
