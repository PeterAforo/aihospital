import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class EmergencyService {
  async getERVisits(tenantId: string, filters?: {
    status?: string; triageCategory?: string; isTrauma?: boolean;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.triageCategory) where.triageCategory = filters.triageCategory;
    if (filters?.isTrauma !== undefined) where.isTrauma = filters.isTrauma;

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [visits, total] = await Promise.all([
      prisma.eRVisit.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, bloodGroup: true } },
        },
        orderBy: [{ triageCategory: 'asc' }, { arrivalTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.eRVisit.count({ where }),
    ]);

    return { visits, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getERVisitById(id: string) {
    return prisma.eRVisit.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, phonePrimary: true, bloodGroup: true } },
        erNotes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createERVisit(tenantId: string, data: any) {
    return prisma.eRVisit.create({
      data: {
        tenantId,
        branchId: data.branchId,
        patientId: data.patientId,
        encounterId: data.encounterId,
        arrivalMode: data.arrivalMode,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : new Date(),
        chiefComplaint: data.chiefComplaint,
        isTrauma: data.isTrauma || false,
        traumaMechanism: data.traumaMechanism,
        allergies: data.allergies,
        currentMedications: data.currentMedications,
        temperature: data.temperature,
        heartRate: data.heartRate,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        glasgowComaScale: data.glasgowComaScale,
        painScore: data.painScore,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
  }

  async triageERVisit(id: string, data: any) {
    return prisma.eRVisit.update({
      where: { id },
      data: {
        triageCategory: data.triageCategory,
        acuityScore: data.acuityScore,
        triageTime: new Date(),
        triagedBy: data.triagedBy,
        status: 'TRIAGED',
        temperature: data.temperature,
        heartRate: data.heartRate,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        glasgowComaScale: data.glasgowComaScale,
        painScore: data.painScore,
      },
    });
  }

  async updateERVisitStatus(id: string, status: string, data?: any) {
    const updateData: any = { status };
    if (data?.assignedDoctor) updateData.assignedDoctor = data.assignedDoctor;
    if (data?.assignedNurse) updateData.assignedNurse = data.assignedNurse;
    if (data?.bedLocation) updateData.bedLocation = data.bedLocation;
    if (data?.primaryDiagnosis) updateData.primaryDiagnosis = data.primaryDiagnosis;
    if (data?.secondaryDiagnosis) updateData.secondaryDiagnosis = data.secondaryDiagnosis;
    if (data?.procedures) updateData.procedures = data.procedures;
    if (data?.treatmentNotes) updateData.treatmentNotes = data.treatmentNotes;

    if (status === 'DISCHARGED' || status === 'ADMITTED' || status === 'TRANSFERRED' || status === 'DECEASED') {
      updateData.disposition = status;
      updateData.dispositionTime = new Date();
      updateData.dispositionNotes = data?.dispositionNotes;
      if (data?.admissionId) updateData.admissionId = data.admissionId;
      if (data?.transferTo) updateData.transferTo = data.transferTo;
    }

    return prisma.eRVisit.update({ where: { id }, data: updateData });
  }

  async addERNote(erVisitId: string, data: any) {
    return prisma.eRNote.create({
      data: {
        erVisitId,
        authorId: data.authorId,
        noteType: data.noteType,
        content: data.content,
      },
    });
  }

  async getActiveBoard(tenantId: string) {
    return prisma.eRVisit.findMany({
      where: {
        tenantId,
        status: { notIn: ['DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'LEFT_AMA', 'DECEASED'] },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
      },
      orderBy: [{ triageCategory: 'asc' }, { arrivalTime: 'asc' }],
    });
  }

  async getDashboardStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activePatients, awaitingTriage, awaitingDoctor,
      inTreatment, todayTotal, todayAdmitted, todayDischarged,
    ] = await Promise.all([
      prisma.eRVisit.count({ where: { tenantId, status: { notIn: ['DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'LEFT_AMA', 'DECEASED'] } } }),
      prisma.eRVisit.count({ where: { tenantId, status: 'REGISTERED' } }),
      prisma.eRVisit.count({ where: { tenantId, status: { in: ['TRIAGED', 'AWAITING_DOCTOR'] } } }),
      prisma.eRVisit.count({ where: { tenantId, status: 'IN_TREATMENT' } }),
      prisma.eRVisit.count({ where: { tenantId, arrivalTime: { gte: today, lt: tomorrow } } }),
      prisma.eRVisit.count({ where: { tenantId, disposition: 'ADMITTED', dispositionTime: { gte: today, lt: tomorrow } } }),
      prisma.eRVisit.count({ where: { tenantId, disposition: 'DISCHARGED', dispositionTime: { gte: today, lt: tomorrow } } }),
    ]);

    return { activePatients, awaitingTriage, awaitingDoctor, inTreatment, todayTotal, todayAdmitted, todayDischarged };
  }
}

export const emergencyService = new EmergencyService();
