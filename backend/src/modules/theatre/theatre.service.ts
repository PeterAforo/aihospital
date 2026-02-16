import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class TheatreService {
  // ==================== OPERATING THEATRES ====================

  async getTheatres(tenantId: string, filters?: { status?: string; branchId?: string }) {
    const where: any = { tenantId, isActive: true };
    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    return prisma.operatingTheatre.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createTheatre(tenantId: string, data: any) {
    return prisma.operatingTheatre.create({ data: { tenantId, ...data } });
  }

  async updateTheatre(id: string, data: any) {
    return prisma.operatingTheatre.update({ where: { id }, data });
  }

  async updateTheatreStatus(id: string, status: string) {
    return prisma.operatingTheatre.update({ where: { id }, data: { status: status as any } });
  }

  // ==================== SURGERY TYPES ====================

  async getSurgeryTypes(tenantId: string, category?: string) {
    const where: any = { OR: [{ tenantId }, { tenantId: null }], isActive: true };
    if (category) where.category = category;
    return prisma.surgeryType.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createSurgeryType(tenantId: string, data: any) {
    return prisma.surgeryType.create({ data: { tenantId, ...data } });
  }

  async updateSurgeryType(id: string, data: any) {
    return prisma.surgeryType.update({ where: { id }, data });
  }

  // ==================== SURGERIES ====================

  async getSurgeries(tenantId: string, filters?: {
    status?: string; patientId?: string; theatreId?: string;
    urgency?: string; startDate?: Date; endDate?: Date;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.theatreId) where.theatreId = filters.theatreId;
    if (filters?.urgency) where.urgency = filters.urgency;
    if (filters?.startDate || filters?.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) where.scheduledDate.gte = filters.startDate;
      if (filters.endDate) where.scheduledDate.lte = filters.endDate;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [surgeries, total] = await Promise.all([
      prisma.surgery.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
          theatre: { select: { id: true, name: true, code: true } },
          surgeryType: { select: { id: true, name: true, category: true } },
          team: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: [{ urgency: 'desc' }, { scheduledDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.surgery.count({ where }),
    ]);

    return { surgeries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSurgeryById(id: string) {
    return prisma.surgery.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, phonePrimary: true, bloodGroup: true } },
        theatre: true,
        surgeryType: true,
        team: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
        checklistItems: { orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  async createSurgery(tenantId: string, data: any) {
    return prisma.surgery.create({
      data: {
        tenantId,
        branchId: data.branchId,
        patientId: data.patientId,
        encounterId: data.encounterId,
        admissionId: data.admissionId,
        theatreId: data.theatreId,
        surgeryTypeId: data.surgeryTypeId,
        procedureName: data.procedureName,
        procedureCode: data.procedureCode,
        urgency: data.urgency || 'ELECTIVE',
        requestedBy: data.requestedBy,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        scheduledStartTime: data.scheduledStartTime,
        scheduledEndTime: data.scheduledEndTime,
        preOpDiagnosis: data.preOpDiagnosis,
        indication: data.indication,
        laterality: data.laterality,
        anesthesiaType: data.anesthesiaType,
        preOpNotes: data.preOpNotes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        theatre: { select: { id: true, name: true } },
        surgeryType: { select: { id: true, name: true } },
      },
    });
  }

  async updateSurgeryStatus(id: string, status: string, data?: any) {
    const updateData: any = { status };

    if (status === 'SCHEDULED') {
      updateData.scheduledDate = data?.scheduledDate ? new Date(data.scheduledDate) : undefined;
      updateData.scheduledStartTime = data?.scheduledStartTime;
      updateData.scheduledEndTime = data?.scheduledEndTime;
      updateData.theatreId = data?.theatreId;
    }
    if (status === 'PRE_OP') {
      updateData.preOpNotes = data?.preOpNotes;
      updateData.consentObtained = data?.consentObtained || false;
      updateData.consentBy = data?.consentBy;
      updateData.consentAt = data?.consentObtained ? new Date() : undefined;
    }
    if (status === 'IN_PROGRESS') {
      updateData.actualStartTime = new Date();
      updateData.anesthesiaStartTime = data?.anesthesiaStartTime ? new Date(data.anesthesiaStartTime) : new Date();
      // Mark theatre as IN_USE
      const surgery = await prisma.surgery.findUnique({ where: { id }, select: { theatreId: true } });
      if (surgery?.theatreId) {
        await prisma.operatingTheatre.update({ where: { id: surgery.theatreId }, data: { status: 'IN_USE' } });
      }
    }
    if (status === 'POST_OP') {
      updateData.actualEndTime = new Date();
      updateData.anesthesiaEndTime = data?.anesthesiaEndTime ? new Date(data.anesthesiaEndTime) : new Date();
      updateData.operativeNotes = data?.operativeNotes;
      updateData.postOpDiagnosis = data?.postOpDiagnosis;
      updateData.estimatedBloodLoss = data?.estimatedBloodLoss;
      updateData.complications = data?.complications;
      updateData.specimens = data?.specimens;
      updateData.implants = data?.implants;
      updateData.drainType = data?.drainType;
      // Mark theatre as CLEANING
      const surgery = await prisma.surgery.findUnique({ where: { id }, select: { theatreId: true } });
      if (surgery?.theatreId) {
        await prisma.operatingTheatre.update({ where: { id: surgery.theatreId }, data: { status: 'CLEANING' } });
      }
    }
    if (status === 'COMPLETED') {
      updateData.postOpNotes = data?.postOpNotes;
      updateData.postOpInstructions = data?.postOpInstructions;
      updateData.outcome = data?.outcome || 'SUCCESSFUL';
      updateData.dischargeFromTheatre = new Date();
    }
    if (status === 'CANCELLED') {
      updateData.preOpNotes = data?.cancellationReason;
    }

    return prisma.surgery.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        theatre: { select: { id: true, name: true } },
      },
    });
  }

  async updateSurgery(id: string, data: any) {
    return prisma.surgery.update({ where: { id }, data });
  }

  // ==================== SURGICAL TEAM ====================

  async addTeamMember(surgeryId: string, data: any) {
    return prisma.surgicalTeamMember.create({
      data: {
        surgeryId,
        userId: data.userId,
        role: data.role,
        isPrimary: data.isPrimary || false,
        notes: data.notes,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  async removeTeamMember(memberId: string) {
    return prisma.surgicalTeamMember.delete({ where: { id: memberId } });
  }

  // ==================== SURGICAL CHECKLIST ====================

  async initializeChecklist(surgeryId: string) {
    const WHO_CHECKLIST = [
      { phase: 'SIGN_IN', item: 'Patient identity confirmed' },
      { phase: 'SIGN_IN', item: 'Site marked / not applicable' },
      { phase: 'SIGN_IN', item: 'Anesthesia safety check completed' },
      { phase: 'SIGN_IN', item: 'Pulse oximeter on patient and functioning' },
      { phase: 'SIGN_IN', item: 'Known allergy?' },
      { phase: 'SIGN_IN', item: 'Difficult airway / aspiration risk?' },
      { phase: 'SIGN_IN', item: 'Risk of >500ml blood loss?' },
      { phase: 'TIME_OUT', item: 'All team members introduced by name and role' },
      { phase: 'TIME_OUT', item: 'Patient name, procedure, and site confirmed' },
      { phase: 'TIME_OUT', item: 'Anticipated critical events reviewed' },
      { phase: 'TIME_OUT', item: 'Antibiotic prophylaxis given within last 60 minutes?' },
      { phase: 'TIME_OUT', item: 'Essential imaging displayed?' },
      { phase: 'SIGN_OUT', item: 'Name of procedure recorded' },
      { phase: 'SIGN_OUT', item: 'Instrument, sponge, and needle counts correct' },
      { phase: 'SIGN_OUT', item: 'Specimen labelled' },
      { phase: 'SIGN_OUT', item: 'Equipment problems addressed' },
      { phase: 'SIGN_OUT', item: 'Key concerns for recovery and management reviewed' },
    ];

    const items = WHO_CHECKLIST.map(c => ({ surgeryId, ...c }));
    await prisma.surgicalChecklist.createMany({ data: items });
    return prisma.surgicalChecklist.findMany({ where: { surgeryId }, orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }] });
  }

  async updateChecklistItem(itemId: string, isChecked: boolean, checkedBy: string) {
    return prisma.surgicalChecklist.update({
      where: { id: itemId },
      data: { isChecked, checkedBy, checkedAt: isChecked ? new Date() : null },
    });
  }

  // ==================== SCHEDULE & DASHBOARD ====================

  async getSchedule(tenantId: string, date: Date, branchId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      scheduledDate: { gte: startOfDay, lte: endOfDay },
      status: { not: 'CANCELLED' },
    };
    if (branchId) where.branchId = branchId;

    return prisma.surgery.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        theatre: { select: { id: true, name: true, code: true } },
        surgeryType: { select: { id: true, name: true, category: true } },
        team: { where: { isPrimary: true }, include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: [{ scheduledStartTime: 'asc' }],
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
      todaySurgeries, inProgress, scheduled, requested,
      completedThisMonth, availableTheatres,
    ] = await Promise.all([
      prisma.surgery.count({ where: { ...where, scheduledDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      prisma.surgery.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.surgery.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.surgery.count({ where: { ...where, status: 'REQUESTED' } }),
      prisma.surgery.count({ where: { ...where, status: 'COMPLETED', updatedAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } }),
      prisma.operatingTheatre.count({ where: { tenantId, status: 'AVAILABLE', isActive: true } }),
    ]);

    return {
      todaySurgeries,
      inProgress,
      scheduled,
      requested,
      completedThisMonth,
      availableTheatres,
    };
  }
}

export const theatreService = new TheatreService();
