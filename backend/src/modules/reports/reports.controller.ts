import { Response, NextFunction } from 'express';
import { prisma } from '../../common/utils/prisma.js';
import { sendSuccess } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';
import { getBranchFilter, hasAccessToBranch } from '../../common/utils/branch-scope.js';
import { AuditService } from '../../common/services/audit.service.js';

export class ReportsController {
  /**
   * Get branch activity summary
   */
  async getBranchActivitySummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const summary = await AuditService.getBranchActivitySummary(
        req.tenantId!,
        start,
        end
      );

      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization-wide summary
   */
  async getOrganizationSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get branch-level stats
      const branches = await prisma.branch.findMany({
        where: { tenantId: req.tenantId },
        select: {
          id: true,
          name: true,
          isMainBranch: true,
          _count: {
            select: {
              users: true,
              appointments: true,
              encounters: true,
            },
          },
        },
      });

      // Get appointment stats per branch for the period
      const appointmentStats = await prisma.appointment.groupBy({
        by: ['branchId', 'status'],
        where: {
          tenantId: req.tenantId,
          appointmentDate: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      // Get encounter stats per branch for the period
      const encounterStats = await prisma.encounter.groupBy({
        by: ['branchId'],
        where: {
          tenantId: req.tenantId,
          visitDate: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      // Get patient registration stats
      const patientStats = await prisma.patient.groupBy({
        by: ['registeredAtBranchId'],
        where: {
          tenantId: req.tenantId,
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      // Combine data
      const branchSummary = branches.map(branch => {
        const appointments = appointmentStats
          .filter(a => a.branchId === branch.id)
          .reduce((acc, curr) => acc + curr._count.id, 0);
        
        const encounters = encounterStats
          .find(e => e.branchId === branch.id)?._count.id || 0;
        
        const newPatients = patientStats
          .find(p => p.registeredAtBranchId === branch.id)?._count.id || 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          isMainBranch: branch.isMainBranch,
          totalStaff: branch._count.users,
          periodStats: {
            appointments,
            encounters,
            newPatients,
          },
        };
      });

      // Calculate totals
      const totals = {
        totalBranches: branches.length,
        totalStaff: branches.reduce((acc, b) => acc + b._count.users, 0),
        periodAppointments: appointmentStats.reduce((acc, a) => acc + a._count.id, 0),
        periodEncounters: encounterStats.reduce((acc, e) => acc + e._count.id, 0),
        periodNewPatients: patientStats.reduce((acc, p) => acc + p._count.id, 0),
      };

      sendSuccess(res, { branches: branchSummary, totals, period: { start, end } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single branch detailed report
   */
  async getBranchReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const { startDate, endDate } = req.query;

      // Check access
      if (!hasAccessToBranch(req, branchId)) {
        return sendSuccess(res, null, 'Access denied to this branch', 403);
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get branch info
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId: req.tenantId },
        include: {
          _count: {
            select: { users: true, appointments: true, encounters: true },
          },
        },
      });

      if (!branch) {
        return sendSuccess(res, null, 'Branch not found', 404);
      }

      // Get department breakdown
      const departmentStats = await prisma.appointment.groupBy({
        by: ['departmentId'],
        where: {
          branchId,
          appointmentDate: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      // Get departments
      const departments = await prisma.department.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, name: true },
      });
      const deptMap = new Map(departments.map(d => [d.id, d.name]));

      // Get appointment status breakdown
      const statusBreakdown = await prisma.appointment.groupBy({
        by: ['status'],
        where: {
          branchId,
          appointmentDate: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      // Get daily appointment counts
      const dailyAppointments = await prisma.appointment.groupBy({
        by: ['appointmentDate'],
        where: {
          branchId,
          appointmentDate: { gte: start, lte: end },
        },
        _count: { id: true },
        orderBy: { appointmentDate: 'asc' },
      });

      // Get top doctors by appointments
      const topDoctors = await prisma.appointment.groupBy({
        by: ['doctorId'],
        where: {
          branchId,
          appointmentDate: { gte: start, lte: end },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });

      // Get doctor names
      const doctorIds = topDoctors.map(d => d.doctorId);
      const doctors = await prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const doctorMap = new Map(doctors.map(d => [d.id, `${d.firstName} ${d.lastName}`]));

      sendSuccess(res, {
        branch: {
          id: branch.id,
          name: branch.name,
          isMainBranch: branch.isMainBranch,
          totalStaff: branch._count.users,
          totalAppointments: branch._count.appointments,
          totalEncounters: branch._count.encounters,
        },
        period: { start, end },
        departmentBreakdown: departmentStats.map(d => ({
          departmentId: d.departmentId,
          departmentName: d.departmentId ? deptMap.get(d.departmentId) || 'Unknown' : 'Unassigned',
          appointments: d._count.id,
        })),
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        dailyTrend: dailyAppointments.map(d => ({
          date: d.appointmentDate,
          count: d._count.id,
        })),
        topDoctors: topDoctors.map(d => ({
          doctorId: d.doctorId,
          doctorName: doctorMap.get(d.doctorId) || 'Unknown',
          appointments: d._count.id,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient activity across branches
   */
  async getPatientBranchActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.params;

      const activity = await AuditService.getPatientActivityAcrossBranches(
        req.tenantId!,
        patientId
      );

      // Get patient visits per branch
      const branchVisits = await prisma.appointment.groupBy({
        by: ['branchId'],
        where: {
          tenantId: req.tenantId,
          patientId,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // Get branch names
      const branchIds = branchVisits.map(b => b.branchId);
      const branches = await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      });
      const branchMap = new Map(branches.map(b => [b.id, b.name]));

      sendSuccess(res, {
        patientId,
        branchVisits: branchVisits.map(b => ({
          branchId: b.branchId,
          branchName: branchMap.get(b.branchId) || 'Unknown',
          visitCount: b._count.id,
        })),
        recentActivity: activity.activities.slice(0, 20),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { branchId, userId, action, resourceType, startDate, endDate, page, limit } = req.query;

      const branchFilter = getBranchFilter(req);

      const result = await AuditService.query({
        tenantId: req.tenantId,
        branchId: (branchId as string) || branchFilter.branchId as string,
        userId: userId as string,
        action: action as string,
        resourceType: resourceType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
