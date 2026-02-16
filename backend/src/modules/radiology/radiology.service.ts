import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class RadiologyService {
  // ==================== STUDY TYPES ====================

  async getStudyTypes(tenantId: string, filters?: { modality?: string; isActive?: boolean }) {
    const where: any = { OR: [{ tenantId }, { tenantId: null }] };
    if (filters?.modality) where.modality = filters.modality;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.radiologyStudyType.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createStudyType(tenantId: string, data: any) {
    return prisma.radiologyStudyType.create({
      data: { tenantId, ...data },
    });
  }

  async updateStudyType(id: string, data: any) {
    return prisma.radiologyStudyType.update({ where: { id }, data });
  }

  // ==================== ORDERS ====================

  async getOrders(tenantId: string, filters?: {
    status?: string; patientId?: string; branchId?: string;
    modality?: string; urgency?: string;
    startDate?: Date; endDate?: Date;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.urgency) where.urgency = filters.urgency;
    if (filters?.startDate || filters?.endDate) {
      where.orderedAt = {};
      if (filters.startDate) where.orderedAt.gte = filters.startDate;
      if (filters.endDate) where.orderedAt.lte = filters.endDate;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [orders, total] = await Promise.all([
      prisma.radiologyOrder.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
          studyRef: { select: { id: true, name: true, modality: true, code: true } },
          images: { select: { id: true, fileName: true, thumbnailUrl: true } },
          report: { select: { id: true, status: true, reportedAt: true } },
        },
        orderBy: [{ urgency: 'desc' }, { orderedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.radiologyOrder.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrderById(id: string) {
    return prisma.radiologyOrder.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, phonePrimary: true } },
        encounter: { select: { id: true, encounterType: true, encounterDate: true, chiefComplaint: true } },
        studyRef: true,
        images: { orderBy: { uploadedAt: 'desc' } },
        report: { include: { template: { select: { id: true, name: true } } } },
      },
    });
  }

  async createOrder(tenantId: string, data: any) {
    return prisma.radiologyOrder.create({
      data: {
        tenantId,
        branchId: data.branchId,
        encounterId: data.encounterId,
        patientId: data.patientId,
        orderedBy: data.orderedBy,
        studyTypeId: data.studyTypeId,
        studyType: data.studyType,
        bodyPart: data.bodyPart,
        laterality: data.laterality,
        urgency: data.urgency || 'ROUTINE',
        clinicalIndication: data.clinicalIndication,
        clinicalHistory: data.clinicalHistory,
        notes: data.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        studyRef: { select: { id: true, name: true, modality: true } },
      },
    });
  }

  async updateOrderStatus(id: string, status: string, data?: any) {
    const updateData: any = { status };
    if (status === 'SCHEDULED') {
      updateData.scheduledAt = data?.scheduledAt || new Date();
      updateData.scheduledRoom = data?.scheduledRoom;
    }
    if (status === 'IN_PROGRESS') {
      updateData.performedBy = data?.performedBy;
      updateData.performedAt = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.contrastUsed = data?.contrastUsed || false;
      updateData.contrastType = data?.contrastType;
      updateData.radiationDose = data?.radiationDose;
    }
    if (status === 'CANCELLED') {
      updateData.notes = data?.cancellationReason;
    }

    return prisma.radiologyOrder.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        studyRef: { select: { id: true, name: true, modality: true } },
      },
    });
  }

  // ==================== IMAGES ====================

  async addImage(orderId: string, data: any) {
    return prisma.radiologyImage.create({
      data: {
        orderId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        imageType: data.imageType || 'ORIGINAL',
        dicomStudyUid: data.dicomStudyUid,
        dicomSeriesUid: data.dicomSeriesUid,
        dicomInstanceUid: data.dicomInstanceUid,
        thumbnailUrl: data.thumbnailUrl,
        uploadedBy: data.uploadedBy,
        notes: data.notes,
      },
    });
  }

  async getOrderImages(orderId: string) {
    return prisma.radiologyImage.findMany({
      where: { orderId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteImage(imageId: string) {
    return prisma.radiologyImage.delete({ where: { id: imageId } });
  }

  // ==================== REPORTS ====================

  async createReport(orderId: string, data: any) {
    const report = await prisma.radiologyReport.create({
      data: {
        orderId,
        templateId: data.templateId,
        technique: data.technique,
        comparison: data.comparison,
        findings: data.findings,
        impression: data.impression,
        recommendation: data.recommendation,
        criticalFinding: data.criticalFinding || false,
        criticalNotifiedTo: data.criticalNotifiedTo,
        criticalNotifiedAt: data.criticalFinding ? new Date() : undefined,
        status: data.status || 'DRAFT',
        reportedBy: data.reportedBy,
      },
    });

    // Update order with findings/impression
    await prisma.radiologyOrder.update({
      where: { id: orderId },
      data: {
        findings: data.findings,
        impression: data.impression,
        reportedBy: data.reportedBy,
        reportedAt: new Date(),
      },
    });

    return report;
  }

  async updateReport(reportId: string, data: any) {
    const updateData: any = { ...data };

    if (data.status === 'FINAL') {
      updateData.verifiedBy = data.verifiedBy;
      updateData.verifiedAt = new Date();
    }
    if (data.status === 'AMENDED') {
      updateData.amendedBy = data.amendedBy;
      updateData.amendedAt = new Date();
      updateData.amendmentReason = data.amendmentReason;
    }

    const report = await prisma.radiologyReport.update({
      where: { id: reportId },
      data: updateData,
    });

    // Sync findings/impression to order
    if (data.findings || data.impression) {
      await prisma.radiologyOrder.update({
        where: { id: report.orderId },
        data: {
          findings: data.findings,
          impression: data.impression,
          ...(data.status === 'FINAL' ? { verifiedBy: data.verifiedBy, verifiedAt: new Date() } : {}),
        },
      });
    }

    // If finalized, mark order as completed
    if (data.status === 'FINAL') {
      await prisma.radiologyOrder.update({
        where: { id: report.orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    return report;
  }

  async getReport(orderId: string) {
    return prisma.radiologyReport.findUnique({
      where: { orderId },
      include: { template: true },
    });
  }

  // ==================== REPORT TEMPLATES ====================

  async getReportTemplates(tenantId: string, modality?: string) {
    const where: any = { OR: [{ tenantId }, { tenantId: null }], isActive: true };
    if (modality) where.modality = modality;
    return prisma.radiologyReportTemplate.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createReportTemplate(tenantId: string, data: any) {
    return prisma.radiologyReportTemplate.create({
      data: { tenantId, ...data },
    });
  }

  async updateReportTemplate(id: string, data: any) {
    return prisma.radiologyReportTemplate.update({ where: { id }, data });
  }

  // ==================== WORKLIST & DASHBOARD ====================

  async getWorklist(tenantId: string, branchId?: string) {
    const where: any = { tenantId, status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] } };
    if (branchId) where.branchId = branchId;

    return prisma.radiologyOrder.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
        studyRef: { select: { id: true, name: true, modality: true } },
      },
      orderBy: [
        { urgency: 'desc' },
        { orderedAt: 'asc' },
      ],
    });
  }

  async getDashboardStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      pendingCount, scheduledCount, inProgressCount, completedToday,
      statOrders, totalToday,
    ] = await Promise.all([
      prisma.radiologyOrder.count({ where: { ...where, status: 'PENDING' } }),
      prisma.radiologyOrder.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.radiologyOrder.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.radiologyOrder.count({ where: { ...where, status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } } }),
      prisma.radiologyOrder.count({ where: { ...where, urgency: 'STAT', status: { not: 'COMPLETED' } } }),
      prisma.radiologyOrder.count({ where: { ...where, orderedAt: { gte: today, lt: tomorrow } } }),
    ]);

    return {
      pending: pendingCount,
      scheduled: scheduledCount,
      inProgress: inProgressCount,
      completedToday,
      statOrders,
      totalToday,
    };
  }
}

export const radiologyService = new RadiologyService();
