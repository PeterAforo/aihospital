import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export interface AuditLogData {
  tenantId?: string;
  branchId?: string;
  departmentId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
}

export class AuditService {
  /**
   * Log an action with full branch/department context
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          departmentId: data.departmentId,
          userId: data.userId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          oldData: data.oldData,
          newData: data.newData,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestMethod: data.requestMethod,
          requestPath: data.requestPath,
          responseStatus: data.responseStatus,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log an action from an authenticated request with automatic context extraction
   */
  static async logFromRequest(
    req: AuthRequest,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    await this.log({
      tenantId: req.tenantId,
      branchId: req.user?.branchId,
      departmentId: req.user?.departmentId,
      userId: req.user?.userId,
      action,
      resourceType,
      resourceId,
      oldData,
      newData,
      metadata,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.originalUrl,
    });
  }

  /**
   * Query audit logs with filters
   */
  static async query(filters: {
    tenantId?: string;
    branchId?: string;
    departmentId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      tenantId,
      branchId,
      departmentId,
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get activity summary by branch
   */
  static async getBranchActivitySummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const activities = await prisma.auditLog.groupBy({
      by: ['branchId', 'action'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        branchId: { not: null },
      },
      _count: { id: true },
    });

    // Get branch names
    const branchIds = [...new Set(activities.map(a => a.branchId).filter(Boolean))] as string[];
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    });
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    // Group by branch
    const summary: Record<string, { branchName: string; actions: Record<string, number>; total: number }> = {};
    
    for (const activity of activities) {
      if (!activity.branchId) continue;
      
      if (!summary[activity.branchId]) {
        summary[activity.branchId] = {
          branchName: branchMap.get(activity.branchId) || 'Unknown',
          actions: {},
          total: 0,
        };
      }
      
      summary[activity.branchId].actions[activity.action] = activity._count.id;
      summary[activity.branchId].total += activity._count.id;
    }

    return Object.entries(summary).map(([branchId, data]) => ({
      branchId,
      ...data,
    }));
  }

  /**
   * Get user activity timeline
   */
  static async getUserActivityTimeline(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ) {
    const where: any = { userId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return prisma.auditLog.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get patient activity across branches
   */
  static async getPatientActivityAcrossBranches(
    tenantId: string,
    patientId: string
  ) {
    const activities = await prisma.auditLog.findMany({
      where: {
        tenantId,
        resourceType: 'patient',
        resourceId: patientId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by branch
    const byBranch: Record<string, any[]> = {};
    for (const activity of activities) {
      const branchName = activity.branch?.name || 'Unknown';
      if (!byBranch[branchName]) byBranch[branchName] = [];
      byBranch[branchName].push(activity);
    }

    return { activities, byBranch };
  }
}

// Common audit actions
export const AuditActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Patient Management
  REGISTER_PATIENT: 'REGISTER_PATIENT',
  VIEW_PATIENT: 'VIEW_PATIENT',
  EDIT_PATIENT: 'EDIT_PATIENT',
  DELETE_PATIENT: 'DELETE_PATIENT',

  // Appointments
  CREATE_APPOINTMENT: 'CREATE_APPOINTMENT',
  VIEW_APPOINTMENT: 'VIEW_APPOINTMENT',
  EDIT_APPOINTMENT: 'EDIT_APPOINTMENT',
  CANCEL_APPOINTMENT: 'CANCEL_APPOINTMENT',
  CHECK_IN_PATIENT: 'CHECK_IN_PATIENT',

  // Clinical
  CREATE_ENCOUNTER: 'CREATE_ENCOUNTER',
  VIEW_ENCOUNTER: 'VIEW_ENCOUNTER',
  EDIT_ENCOUNTER: 'EDIT_ENCOUNTER',
  SIGN_ENCOUNTER: 'SIGN_ENCOUNTER',
  TRIAGE: 'TRIAGE',
  RECORD_VITALS: 'RECORD_VITALS',

  // Prescriptions
  PRESCRIBE: 'PRESCRIBE',
  VIEW_PRESCRIPTION: 'VIEW_PRESCRIPTION',
  EDIT_PRESCRIPTION: 'EDIT_PRESCRIPTION',
  CANCEL_PRESCRIPTION: 'CANCEL_PRESCRIPTION',
  DISPENSE_MEDICATION: 'DISPENSE_MEDICATION',

  // Laboratory
  ORDER_LAB: 'ORDER_LAB',
  VIEW_LAB_ORDER: 'VIEW_LAB_ORDER',
  ENTER_LAB_RESULTS: 'ENTER_LAB_RESULTS',
  VALIDATE_LAB_RESULTS: 'VALIDATE_LAB_RESULTS',

  // Billing
  CREATE_INVOICE: 'CREATE_INVOICE',
  VIEW_INVOICE: 'VIEW_INVOICE',
  PROCESS_PAYMENT: 'PROCESS_PAYMENT',
  REFUND_PAYMENT: 'REFUND_PAYMENT',

  // User Management
  CREATE_USER: 'CREATE_USER',
  VIEW_USER: 'VIEW_USER',
  EDIT_USER: 'EDIT_USER',
  DELETE_USER: 'DELETE_USER',
  ASSIGN_ROLE: 'ASSIGN_ROLE',
  GRANT_PERMISSION: 'GRANT_PERMISSION',
  REVOKE_PERMISSION: 'REVOKE_PERMISSION',

  // Branch Management
  CREATE_BRANCH: 'CREATE_BRANCH',
  EDIT_BRANCH: 'EDIT_BRANCH',
  DELETE_BRANCH: 'DELETE_BRANCH',

  // Department Management
  CREATE_DEPARTMENT: 'CREATE_DEPARTMENT',
  EDIT_DEPARTMENT: 'EDIT_DEPARTMENT',
  DELETE_DEPARTMENT: 'DELETE_DEPARTMENT',
};

export default AuditService;
