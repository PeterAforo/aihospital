import { Response, NextFunction } from 'express';
import { prisma } from '../../common/utils/prisma.js';
import { sendSuccess, sendPaginated } from '../../common/utils/api-response.js';
import { AuthRequest, getUserPermissions } from '../../common/middleware/auth.js';
import { AppError } from '../../common/middleware/error-handler.js';

export class RBACController {
  // ==================== ROLES ====================

  async listRoles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { includeSystem = 'true' } = req.query;

      const where: any = {};
      
      // Include system roles (no tenantId) and tenant-specific roles
      if (includeSystem === 'true') {
        where.OR = [
          { tenantId: null, isSystemRole: true },
          { tenantId: req.tenantId },
        ];
      } else {
        where.tenantId = req.tenantId;
      }

      const roles = await prisma.role.findMany({
        where,
        include: {
          _count: {
            select: { permissions: true, users: true },
          },
        },
        orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
      });

      sendSuccess(res, roles);
    } catch (error) {
      next(error);
    }
  }

  async getRoleById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = await prisma.role.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { tenantId: null, isSystemRole: true },
            { tenantId: req.tenantId },
          ],
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw new AppError('Role not found', 404);
      }

      sendSuccess(res, role);
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, displayName, description, permissionIds } = req.body;

      // Check if role name already exists for this tenant
      const existing = await prisma.role.findFirst({
        where: {
          name: name.toUpperCase(),
          tenantId: req.tenantId,
        },
      });

      if (existing) {
        throw new AppError('Role with this name already exists', 409);
      }

      const role = await prisma.role.create({
        data: {
          tenantId: req.tenantId!,
          name: name.toUpperCase(),
          displayName,
          description,
          isSystemRole: false,
        },
      });

      // Assign permissions if provided
      if (permissionIds && permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permId: string) => ({
            roleId: role.id,
            permissionId: permId,
          })),
        });
      }

      sendSuccess(res, role, 'Role created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { displayName, description, permissionIds } = req.body;

      const role = await prisma.role.findFirst({
        where: {
          id: req.params.id,
          tenantId: req.tenantId,
          isSystemRole: false, // Cannot edit system roles
        },
      });

      if (!role) {
        throw new AppError('Role not found or cannot be edited', 404);
      }

      const updated = await prisma.role.update({
        where: { id: role.id },
        data: {
          ...(displayName && { displayName }),
          ...(description !== undefined && { description }),
        },
      });

      // Update permissions if provided
      if (permissionIds !== undefined) {
        await prisma.rolePermission.deleteMany({
          where: { roleId: role.id },
        });

        if (permissionIds.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissionIds.map((permId: string) => ({
              roleId: role.id,
              permissionId: permId,
            })),
          });
        }
      }

      sendSuccess(res, updated, 'Role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = await prisma.role.findFirst({
        where: {
          id: req.params.id,
          tenantId: req.tenantId,
          isSystemRole: false,
        },
        include: {
          _count: { select: { users: true } },
        },
      });

      if (!role) {
        throw new AppError('Role not found or cannot be deleted', 404);
      }

      if (role._count.users > 0) {
        throw new AppError('Cannot delete role with assigned users', 400);
      }

      await prisma.role.delete({ where: { id: role.id } });

      sendSuccess(res, null, 'Role deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==================== PERMISSIONS ====================

  async listPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { module } = req.query;

      const where: any = {};
      if (module) where.module = module;

      const permissions = await prisma.permission.findMany({
        where,
        orderBy: [{ module: 'asc' }, { name: 'asc' }],
      });

      // Group by module
      const grouped = permissions.reduce((acc: any, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {});

      sendSuccess(res, { permissions, grouped });
    } catch (error) {
      next(error);
    }
  }

  async createPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, displayName, description, module } = req.body;

      // Custom permissions are prefixed with tenant subdomain to avoid conflicts
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: { subdomain: true },
      });

      const permissionName = `${tenant?.subdomain?.toUpperCase()}_${name.toUpperCase()}`;

      // Check if permission already exists
      const existing = await prisma.permission.findFirst({
        where: { name: permissionName },
      });

      if (existing) {
        throw new AppError('Permission with this name already exists', 409);
      }

      const permission = await prisma.permission.create({
        data: {
          name: permissionName,
          displayName,
          description,
          module: module || 'custom',
          isSystemPermission: false,
        },
      });

      sendSuccess(res, permission, 'Permission created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // ==================== USER PERMISSIONS ====================

  async getUserPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user!.userId;

      const permissions = await getUserPermissions(userId);

      sendSuccess(res, { permissions });
    } catch (error) {
      next(error);
    }
  }

  async grantUserPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, permissionId, reason, expiresAt } = req.body;

      // Verify user exists and belongs to tenant
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId: req.tenantId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const userPermission = await prisma.userPermission.upsert({
        where: {
          userId_permissionId: { userId, permissionId },
        },
        update: {
          grantType: 'grant',
          grantedBy: req.user!.userId,
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        create: {
          userId,
          permissionId,
          grantType: 'grant',
          grantedBy: req.user!.userId,
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          permission: true,
        },
      });

      sendSuccess(res, userPermission, 'Permission granted successfully');
    } catch (error) {
      next(error);
    }
  }

  async revokeUserPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, permissionId, reason } = req.body;

      const userPermission = await prisma.userPermission.upsert({
        where: {
          userId_permissionId: { userId, permissionId },
        },
        update: {
          grantType: 'revoke',
          grantedBy: req.user!.userId,
          reason,
        },
        create: {
          userId,
          permissionId,
          grantType: 'revoke',
          grantedBy: req.user!.userId,
          reason,
        },
      });

      sendSuccess(res, userPermission, 'Permission revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeUserPermissionOverride(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, permissionId } = req.params;

      await prisma.userPermission.delete({
        where: {
          userId_permissionId: { userId, permissionId },
        },
      });

      sendSuccess(res, null, 'Permission override removed');
    } catch (error) {
      next(error);
    }
  }

  // ==================== DEPARTMENTS ====================

  async listDepartments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const departments = await prisma.department.findMany({
        where: { tenantId: req.tenantId },
        include: {
          _count: { select: { users: true } },
        },
        orderBy: { name: 'asc' },
      });

      sendSuccess(res, departments);
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, code, description, headOfDepartment } = req.body;

      const department = await prisma.department.create({
        data: {
          tenantId: req.tenantId!,
          name,
          code,
          description,
          headOfDepartment,
        },
      });

      sendSuccess(res, department, 'Department created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, code, description, headOfDepartment, isActive } = req.body;

      const department = await prisma.department.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(code !== undefined && { code }),
          ...(description !== undefined && { description }),
          ...(headOfDepartment !== undefined && { headOfDepartment }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      sendSuccess(res, department, 'Department updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const department = await prisma.department.findFirst({
        where: { id: req.params.id, tenantId: req.tenantId },
        include: { _count: { select: { users: true } } },
      });

      if (!department) {
        throw new AppError('Department not found', 404);
      }

      if (department._count.users > 0) {
        throw new AppError('Cannot delete department with assigned users', 400);
      }

      await prisma.department.delete({ where: { id: department.id } });

      sendSuccess(res, null, 'Department deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==================== ASSIGN ROLE TO USER ====================

  async assignRoleToUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, roleId } = req.body;

      // Verify user exists and belongs to tenant
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId: req.tenantId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify role exists and is accessible
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          OR: [
            { tenantId: null, isSystemRole: true },
            { tenantId: req.tenantId },
          ],
        },
      });

      if (!role) {
        throw new AppError('Role not found', 404);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          roleId: role.id,
          role: role.name as any, // Also update legacy role field
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          roleRelation: {
            select: { id: true, name: true, displayName: true },
          },
        },
      });

      sendSuccess(res, updated, 'Role assigned successfully');
    } catch (error) {
      next(error);
    }
  }
}
