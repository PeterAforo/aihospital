import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { prisma } from '../utils/prisma.js';
import { sendError } from '../utils/api-response.js';
import { AppError } from './error-handler.js';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  roleId?: string;
  email: string;
  permissions?: string[];
  primaryBranchId?: string;
  currentBranchId?: string;
  accessibleBranches?: string[];
  branchAccessScope?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  tenantId?: string;
  currentBranchId?: string;
  userPermissions?: string[];
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401, undefined, 'NO_TOKEN');
      return;
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true, tenantId: true, role: true },
    });

    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401, undefined, 'USER_INACTIVE');
      return;
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Token expired', 401, undefined, 'TOKEN_EXPIRED');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid token', 401, undefined, 'INVALID_TOKEN');
      return;
    }
    next(error);
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, undefined, 'NOT_AUTHENTICATED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403, undefined, 'FORBIDDEN');
      return;
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, undefined, 'NOT_AUTHENTICATED');
      return;
    }

    try {
      // Get user's permissions (from JWT if available, otherwise fetch from DB)
      let userPermissions: string[] = req.user.permissions || [];

      // If permissions not in JWT, fetch from database
      if (userPermissions.length === 0) {
        userPermissions = await getUserPermissions(req.user.userId);
        req.userPermissions = userPermissions;
      }

      // SUPER_ADMIN has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        sendError(res, `Missing required permission: ${requiredPermissions.join(' or ')}`, 403, undefined, 'PERMISSION_DENIED');
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAllPermissions = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, undefined, 'NOT_AUTHENTICATED');
      return;
    }

    try {
      let userPermissions: string[] = req.user.permissions || [];

      if (userPermissions.length === 0) {
        userPermissions = await getUserPermissions(req.user.userId);
        req.userPermissions = userPermissions;
      }

      // SUPER_ADMIN has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      // Check if user has ALL required permissions
      const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));

      if (missingPermissions.length > 0) {
        sendError(res, `Missing required permissions: ${missingPermissions.join(', ')}`, 403, undefined, 'PERMISSION_DENIED');
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export async function getUserPermissions(userId: string): Promise<string[]> {
  // Get user with their role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roleId: true,
      roleRelation: {
        select: {
          permissions: {
            select: {
              permission: {
                select: { name: true }
              }
            }
          }
        }
      },
      userPermissions: {
        select: {
          grantType: true,
          expiresAt: true,
          permission: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!user) return [];

  const permissions = new Set<string>();

  // Add permissions from role (via roleRelation)
  if (user.roleRelation?.permissions) {
    for (const rp of user.roleRelation.permissions) {
      permissions.add(rp.permission.name);
    }
  }

  // If no roleId set, fall back to legacy role enum and get permissions from system role
  if (!user.roleId && user.role) {
    const systemRole = await prisma.role.findFirst({
      where: {
        name: user.role,
        isSystemRole: true,
      },
      select: {
        permissions: {
          select: {
            permission: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (systemRole?.permissions) {
      for (const rp of systemRole.permissions) {
        permissions.add(rp.permission.name);
      }
    }
  }

  // Apply user-specific permission overrides
  if (user.userPermissions) {
    const now = new Date();
    for (const up of user.userPermissions) {
      // Skip expired permissions
      if (up.expiresAt && up.expiresAt < now) continue;

      if (up.grantType === 'grant') {
        permissions.add(up.permission.name);
      } else if (up.grantType === 'revoke') {
        permissions.delete(up.permission.name);
      }
    }
  }

  return Array.from(permissions);
}

export const tenantGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.tenantId) {
    sendError(res, 'Tenant context required', 400, undefined, 'NO_TENANT');
    return;
  }
  next();
};

export async function checkBranchAccess(
  userId: string,
  targetBranchId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      branchId: true,
      branchAccessScope: true,
      accessibleBranches: true,
      departmentId: true,
      role: true,
    },
  });

  if (!user) {
    return { hasAccess: false, reason: 'User not found' };
  }

  // SUPER_ADMIN and HOSPITAL_ADMIN have all-branch access
  if (user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN') {
    return { hasAccess: true };
  }

  switch (user.branchAccessScope) {
    case 'PRIMARY_ONLY':
      if (user.branchId !== targetBranchId) {
        return { hasAccess: false, reason: 'Cannot access resources from different branch' };
      }
      break;

    case 'SPECIFIC_BRANCHES':
      if (!user.accessibleBranches.includes(targetBranchId)) {
        return { hasAccess: false, reason: 'No access to this branch' };
      }
      break;

    case 'ALL_BRANCHES':
      // User can access all branches
      break;

    case 'DEPARTMENT_ONLY':
      if (user.branchId !== targetBranchId) {
        return { hasAccess: false, reason: 'Can only access resources in your department' };
      }
      break;

    default:
      // Default to primary only
      if (user.branchId !== targetBranchId) {
        return { hasAccess: false, reason: 'Cannot access resources from different branch' };
      }
  }

  return { hasAccess: true };
}

export const requireBranchAccess = (getBranchId: (req: AuthRequest) => string | undefined) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, undefined, 'NOT_AUTHENTICATED');
      return;
    }

    try {
      const targetBranchId = getBranchId(req);
      
      if (!targetBranchId) {
        // No branch context required for this request
        next();
        return;
      }

      const { hasAccess, reason } = await checkBranchAccess(req.user.userId, targetBranchId);

      if (!hasAccess) {
        sendError(res, reason || 'No access to this branch', 403, undefined, 'BRANCH_ACCESS_DENIED');
        return;
      }

      req.currentBranchId = targetBranchId;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export async function getUserBranchPermissions(
  userId: string,
  branchId: string
): Promise<string[]> {
  // Get base permissions
  const basePermissions = await getUserPermissions(userId);
  const permissions = new Set(basePermissions);

  // Get branch-specific permission overrides
  const branchPermissions = await prisma.branchPermission.findMany({
    where: {
      userId,
      branchId,
    },
    select: {
      grantType: true,
      expiresAt: true,
      permission: {
        select: { name: true },
      },
    },
  });

  const now = new Date();
  for (const bp of branchPermissions) {
    // Skip expired permissions
    if (bp.expiresAt && bp.expiresAt < now) continue;

    if (bp.grantType === 'grant') {
      permissions.add(bp.permission.name);
    } else if (bp.grantType === 'revoke') {
      permissions.delete(bp.permission.name);
    }
  }

  return Array.from(permissions);
}

export const requireBranchPermission = (
  requiredPermission: string,
  getBranchId: (req: AuthRequest) => string | undefined
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, undefined, 'NOT_AUTHENTICATED');
      return;
    }

    try {
      // SUPER_ADMIN has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      const targetBranchId = getBranchId(req);

      // First check branch access
      if (targetBranchId) {
        const { hasAccess, reason } = await checkBranchAccess(req.user.userId, targetBranchId);
        if (!hasAccess) {
          sendError(res, reason || 'No access to this branch', 403, undefined, 'BRANCH_ACCESS_DENIED');
          return;
        }

        // Get branch-specific permissions
        const permissions = await getUserBranchPermissions(req.user.userId, targetBranchId);
        
        if (!permissions.includes(requiredPermission)) {
          sendError(res, `Missing permission: ${requiredPermission} for this branch`, 403, undefined, 'BRANCH_PERMISSION_DENIED');
          return;
        }

        req.currentBranchId = targetBranchId;
      } else {
        // No branch context, check regular permissions
        const permissions = await getUserPermissions(req.user.userId);
        if (!permissions.includes(requiredPermission)) {
          sendError(res, `Missing permission: ${requiredPermission}`, 403, undefined, 'PERMISSION_DENIED');
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
