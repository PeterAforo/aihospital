import { AuthRequest } from '../middleware/auth.js';

/**
 * Build branch filter based on user's branch access scope
 * Returns a Prisma where clause for filtering by branch
 */
export function getBranchFilter(req: AuthRequest): { branchId?: string | { in: string[] } } {
  const user = req.user;
  
  if (!user) return {};
  
  const scope = user.branchAccessScope || 'PRIMARY_ONLY';
  
  switch (scope) {
    case 'ALL_BRANCHES':
      // No branch filter - user can see all branches in tenant
      return {};
      
    case 'SPECIFIC_BRANCHES':
      // Filter to specific accessible branches
      if (user.accessibleBranches && user.accessibleBranches.length > 0) {
        return { branchId: { in: user.accessibleBranches } };
      }
      // Fall back to primary branch if no accessible branches defined
      return user.branchId ? { branchId: user.branchId } : {};
      
    case 'DEPARTMENT_ONLY':
      // Same as primary only but may have additional department restrictions
      return user.branchId ? { branchId: user.branchId } : {};
      
    case 'PRIMARY_ONLY':
    default:
      // Filter to user's primary branch only
      return user.branchId ? { branchId: user.branchId } : {};
  }
}

/**
 * Check if user has access to a specific branch
 */
export function hasAccessToBranch(req: AuthRequest, branchId: string): boolean {
  const user = req.user;
  
  if (!user) return false;
  
  const scope = user.branchAccessScope || 'PRIMARY_ONLY';
  
  switch (scope) {
    case 'ALL_BRANCHES':
      return true;
      
    case 'SPECIFIC_BRANCHES':
      return user.accessibleBranches?.includes(branchId) || user.branchId === branchId;
      
    case 'DEPARTMENT_ONLY':
    case 'PRIMARY_ONLY':
    default:
      return user.branchId === branchId;
  }
}

/**
 * Get user's current branch context for creating new records
 */
export function getCurrentBranchContext(req: AuthRequest): {
  branchId?: string;
  departmentId?: string;
} {
  return {
    branchId: req.user?.branchId || req.currentBranchId,
    departmentId: req.user?.departmentId,
  };
}

/**
 * Build a complete where clause with tenant and branch filtering
 */
export function buildTenantBranchWhere(req: AuthRequest, additionalFilters: any = {}): any {
  const branchFilter = getBranchFilter(req);
  
  return {
    tenantId: req.tenantId,
    ...branchFilter,
    ...additionalFilters,
  };
}

/**
 * Validate that user can perform action on a resource at a specific branch
 */
export function validateBranchAccess(
  req: AuthRequest,
  resourceBranchId: string | null | undefined
): void {
  if (!resourceBranchId) return; // No branch restriction
  
  if (!hasAccessToBranch(req, resourceBranchId)) {
    throw new Error('Access denied: You do not have permission to access resources at this branch');
  }
}
