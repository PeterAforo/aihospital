import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class HRService {
  // ==================== STAFF PROFILES ====================

  async getStaffProfiles(tenantId: string, filters?: {
    department?: string; employmentType?: string; search?: string;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId, isActive: true };
    if (filters?.department) where.department = filters.department;
    if (filters?.employmentType) where.employmentType = filters.employmentType;
    if (filters?.search) {
      where.OR = [
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
        { designation: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [profiles, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staffProfile.count({ where }),
    ]);

    return { profiles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStaffProfileById(id: string) {
    return prisma.staffProfile.findUnique({
      where: { id },
      include: {
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
        payrollRecords: { orderBy: { period: 'desc' }, take: 6 },
      },
    });
  }

  async createStaffProfile(tenantId: string, data: any) {
    return prisma.staffProfile.create({
      data: {
        tenantId, userId: data.userId, employeeId: data.employeeId,
        department: data.department, designation: data.designation,
        employmentType: data.employmentType || 'FULL_TIME',
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
        reportingTo: data.reportingTo, qualifications: data.qualifications,
        specializations: data.specializations, licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        bankName: data.bankName, bankAccountNumber: data.bankAccountNumber,
        bankBranch: data.bankBranch, ssnit: data.ssnit, tinNumber: data.tinNumber,
        baseSalary: data.baseSalary, allowances: data.allowances,
        deductions: data.deductions, notes: data.notes,
      },
    });
  }

  async updateStaffProfile(id: string, data: any) {
    return prisma.staffProfile.update({ where: { id }, data });
  }

  // ==================== LEAVE ====================

  async createLeaveRequest(staffProfileId: string, tenantId: string, data: any) {
    return prisma.leaveRequest.create({
      data: {
        staffProfileId, tenantId, leaveType: data.leaveType,
        startDate: new Date(data.startDate), endDate: new Date(data.endDate),
        totalDays: data.totalDays, reason: data.reason, notes: data.notes,
      },
    });
  }

  async getLeaveRequests(tenantId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: { staffProfile: { select: { id: true, employeeId: true, department: true, designation: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { requests, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateLeaveStatus(id: string, status: string, data?: any) {
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as any,
        approvedBy: data?.approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectionReason: data?.rejectionReason,
      },
    });
  }

  // ==================== PAYROLL ====================

  async generatePayroll(tenantId: string, period: string) {
    const profiles = await prisma.staffProfile.findMany({
      where: { tenantId, isActive: true, baseSalary: { not: null } },
    });

    const records = [];
    for (const profile of profiles) {
      const baseSalary = profile.baseSalary || 0;
      const allowances = profile.allowances || 0;
      const grossPay = baseSalary + allowances;
      const taxDeduction = grossPay * 0.05; // Simplified Ghana tax
      const ssnitDeduction = baseSalary * 0.055; // 5.5% employee SSNIT
      const otherDeductions = profile.deductions || 0;
      const netPay = grossPay - taxDeduction - ssnitDeduction - otherDeductions;

      try {
        const record = await prisma.payrollRecord.create({
          data: {
            staffProfileId: profile.id, tenantId, period,
            baseSalary, allowances, grossPay,
            taxDeduction, ssnitDeduction, otherDeductions, netPay,
          },
        });
        records.push(record);
      } catch (e: any) {
        // Skip duplicates (unique constraint on staffProfileId + period)
        if (!e.message?.includes('Unique constraint')) throw e;
      }
    }

    return { generated: records.length, period };
  }

  async getPayrollRecords(tenantId: string, filters?: { period?: string; status?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.period) where.period = filters.period;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [records, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where,
        include: { staffProfile: { select: { id: true, employeeId: true, department: true, designation: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollRecord.count({ where }),
    ]);

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approvePayroll(tenantId: string, period: string, approvedBy: string) {
    return prisma.payrollRecord.updateMany({
      where: { tenantId, period, status: 'DRAFT' },
      data: { status: 'APPROVED', approvedBy },
    });
  }

  // ==================== DASHBOARD ====================

  async getDashboardStats(tenantId: string) {
    const [totalStaff, onLeave, pendingLeave, departments] = await Promise.all([
      prisma.staffProfile.count({ where: { tenantId, isActive: true } }),
      prisma.leaveRequest.count({
        where: { tenantId, status: 'APPROVED', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      }),
      prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.staffProfile.groupBy({ by: ['department'], where: { tenantId, isActive: true }, _count: true }),
    ]);

    return {
      totalStaff, onLeave, pendingLeave,
      departmentBreakdown: departments.map(d => ({ department: d.department || 'Unassigned', count: d._count })),
    };
  }
}

export const hrService = new HRService();
