import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class MaternityService {
  // ==================== PREGNANCIES ====================

  async getPregnancies(tenantId: string, filters?: {
    status?: string; patientId?: string; riskLevel?: string;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [pregnancies, total] = await Promise.all([
      prisma.pregnancy.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, phonePrimary: true } },
          ancVisits: { select: { id: true, visitDate: true, visitNumber: true }, orderBy: { visitDate: 'desc' }, take: 1 },
          deliveryRecord: { select: { id: true, deliveryDate: true, deliveryMode: true } },
        },
        orderBy: { edd: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pregnancy.count({ where }),
    ]);

    return { pregnancies, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPregnancyById(id: string) {
    return prisma.pregnancy.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, phonePrimary: true, bloodGroup: true } },
        ancVisits: { orderBy: { visitDate: 'desc' } },
        deliveryRecord: { include: { newborns: true } },
        postnatalVisits: { orderBy: { visitDate: 'desc' } },
      },
    });
  }

  async createPregnancy(tenantId: string, data: any) {
    return prisma.pregnancy.create({
      data: {
        tenantId,
        branchId: data.branchId,
        patientId: data.patientId,
        gravida: data.gravida,
        para: data.para,
        lmp: data.lmp ? new Date(data.lmp) : undefined,
        edd: data.edd ? new Date(data.edd) : undefined,
        gestationalAge: data.gestationalAge,
        bloodGroup: data.bloodGroup,
        rhFactor: data.rhFactor,
        riskLevel: data.riskLevel || 'LOW',
        riskFactors: data.riskFactors || [],
        registeredBy: data.registeredBy,
        notes: data.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
  }

  async updatePregnancy(id: string, data: any) {
    return prisma.pregnancy.update({ where: { id }, data });
  }

  // ==================== ANC VISITS ====================

  async createANCVisit(pregnancyId: string, data: any) {
    const visitCount = await prisma.aNCVisit.count({ where: { pregnancyId } });
    return prisma.aNCVisit.create({
      data: {
        pregnancyId,
        visitNumber: visitCount + 1,
        visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
        gestationalAge: data.gestationalAge,
        weight: data.weight,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        fundalHeight: data.fundalHeight,
        fetalHeartRate: data.fetalHeartRate,
        fetalPresentation: data.fetalPresentation,
        fetalMovement: data.fetalMovement,
        edema: data.edema,
        proteinuria: data.proteinuria,
        hemoglobin: data.hemoglobin,
        urineTest: data.urineTest,
        complaints: data.complaints,
        findings: data.findings,
        plan: data.plan,
        nextVisitDate: data.nextVisitDate ? new Date(data.nextVisitDate) : undefined,
        attendedBy: data.attendedBy,
        notes: data.notes,
      },
    });
  }

  async getANCVisits(pregnancyId: string) {
    return prisma.aNCVisit.findMany({
      where: { pregnancyId },
      orderBy: { visitDate: 'asc' },
    });
  }

  // ==================== DELIVERY ====================

  async createDeliveryRecord(pregnancyId: string, tenantId: string, data: any) {
    const delivery = await prisma.deliveryRecord.create({
      data: {
        pregnancyId,
        tenantId,
        branchId: data.branchId,
        deliveryDate: new Date(data.deliveryDate),
        deliveryTime: data.deliveryTime,
        gestationalAgeAtDelivery: data.gestationalAgeAtDelivery,
        deliveryMode: data.deliveryMode || 'SVD',
        placeOfDelivery: data.placeOfDelivery || 'HOSPITAL',
        durationOfLabourHours: data.durationOfLabourHours,
        inductionUsed: data.inductionUsed || false,
        inductionMethod: data.inductionMethod,
        augmentationUsed: data.augmentationUsed || false,
        episiotomy: data.episiotomy || false,
        perinealTear: data.perinealTear,
        placentaDelivered: data.placentaDelivered ?? true,
        placentaComplete: data.placentaComplete ?? true,
        estimatedBloodLoss: data.estimatedBloodLoss,
        complications: data.complications,
        deliveredBy: data.deliveredBy,
        assistedBy: data.assistedBy,
        anesthetist: data.anesthetist,
        notes: data.notes,
      },
    });

    // Update pregnancy status
    await prisma.pregnancy.update({
      where: { id: pregnancyId },
      data: { status: 'DELIVERED', outcome: data.outcome || 'LIVE_BIRTH', outcomeDate: new Date(data.deliveryDate) },
    });

    return delivery;
  }

  // ==================== NEWBORN ====================

  async createNewbornRecord(deliveryRecordId: string, tenantId: string, data: any) {
    return prisma.newbornRecord.create({
      data: {
        deliveryRecordId,
        tenantId,
        gender: data.gender,
        birthWeight: data.birthWeight,
        birthLength: data.birthLength,
        headCircumference: data.headCircumference,
        apgarScore1Min: data.apgarScore1Min,
        apgarScore5Min: data.apgarScore5Min,
        apgarScore10Min: data.apgarScore10Min,
        resuscitationNeeded: data.resuscitationNeeded || false,
        resuscitationDetails: data.resuscitationDetails,
        birthDefects: data.birthDefects,
        status: data.status || 'ALIVE',
        vitaminKGiven: data.vitaminKGiven || false,
        bcgGiven: data.bcgGiven || false,
        opv0Given: data.opv0Given || false,
        breastfeedingInitiated: data.breastfeedingInitiated || false,
        breastfeedingTime: data.breastfeedingTime,
        notes: data.notes,
      },
    });
  }

  // ==================== POSTNATAL ====================

  async createPostnatalVisit(pregnancyId: string, data: any) {
    const visitCount = await prisma.postnatalVisit.count({ where: { pregnancyId } });
    return prisma.postnatalVisit.create({
      data: {
        pregnancyId,
        visitNumber: visitCount + 1,
        visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
        daysPostpartum: data.daysPostpartum,
        motherCondition: data.motherCondition,
        uterusInvolution: data.uterusInvolution,
        lochia: data.lochia,
        breastCondition: data.breastCondition,
        breastfeeding: data.breastfeeding,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        temperature: data.temperature,
        episiotomyHealing: data.episiotomyHealing,
        csWoundHealing: data.csWoundHealing,
        emotionalState: data.emotionalState,
        contraceptionDiscussed: data.contraceptionDiscussed || false,
        contraceptionMethod: data.contraceptionMethod,
        babyWeight: data.babyWeight,
        babyCondition: data.babyCondition,
        immunizationsGiven: data.immunizationsGiven,
        findings: data.findings,
        plan: data.plan,
        attendedBy: data.attendedBy,
        notes: data.notes,
      },
    });
  }

  // ==================== DASHBOARD ====================

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activePregnancies, highRisk, dueSoon,
      deliveriesThisMonth, ancVisitsToday,
    ] = await Promise.all([
      prisma.pregnancy.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.pregnancy.count({ where: { tenantId, status: 'ACTIVE', riskLevel: 'HIGH' } }),
      prisma.pregnancy.count({ where: { tenantId, status: 'ACTIVE', edd: { gte: now, lte: twoWeeksFromNow } } }),
      prisma.deliveryRecord.count({ where: { tenantId, deliveryDate: { gte: thisMonth } } }),
      prisma.aNCVisit.count({ where: { pregnancy: { tenantId }, visitDate: { gte: new Date(now.toISOString().split('T')[0]) } } }),
    ]);

    return { activePregnancies, highRisk, dueSoon, deliveriesThisMonth, ancVisitsToday };
  }
}

export const maternityService = new MaternityService();
