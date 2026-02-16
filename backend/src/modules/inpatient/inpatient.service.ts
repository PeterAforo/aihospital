import { PrismaClient, BedStatus, AdmissionStatus, DischargeType, WardType } from '@prisma/client';

const prisma = new PrismaClient();

class InpatientService {
  // ==================== WARD MANAGEMENT ====================

  async listWards(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const wards = await prisma.ward.findMany({
      where,
      include: {
        beds: { select: { id: true, bedNumber: true, status: true, bedType: true, dailyRate: true, isActive: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { admissions: { where: { status: 'ADMITTED' } } } },
      },
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
    });

    return wards.map(w => {
      const totalBeds = w.beds.filter(b => b.isActive).length;
      const occupied = w.beds.filter(b => b.status === 'OCCUPIED').length;
      const available = w.beds.filter(b => b.status === 'AVAILABLE').length;
      return {
        ...w,
        totalBeds,
        occupiedBeds: occupied,
        availableBeds: available,
        occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
      };
    });
  }

  async createWard(tenantId: string, data: {
    branchId: string; name: string; code: string; wardType?: WardType;
    floor?: string; building?: string; description?: string; nurseStation?: string;
  }) {
    return prisma.ward.create({
      data: { tenantId, ...data, wardType: data.wardType || 'GENERAL' },
      include: { branch: { select: { name: true } }, beds: true },
    });
  }

  async updateWard(tenantId: string, wardId: string, data: Partial<{
    name: string; wardType: WardType; floor: string; building: string;
    description: string; nurseStation: string; isActive: boolean;
  }>) {
    const ward = await prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!ward) throw new Error('Ward not found');
    return prisma.ward.update({ where: { id: wardId }, data });
  }

  // ==================== BED MANAGEMENT ====================

  async listBeds(wardId: string, status?: BedStatus) {
    const where: any = { wardId, isActive: true };
    if (status) where.status = status;

    return prisma.bed.findMany({
      where,
      include: {
        admissions: {
          where: { status: 'ADMITTED' },
          take: 1,
          include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
        },
      },
      orderBy: { bedNumber: 'asc' },
    });
  }

  async createBed(wardId: string, data: {
    bedNumber: string; bedType?: string; features?: string[]; dailyRate?: number; notes?: string;
  }) {
    const bed = await prisma.bed.create({
      data: { wardId, bedNumber: data.bedNumber, bedType: data.bedType || 'standard', features: data.features || [], dailyRate: data.dailyRate, notes: data.notes },
    });
    // Update ward totalBeds count
    const count = await prisma.bed.count({ where: { wardId, isActive: true } });
    await prisma.ward.update({ where: { id: wardId }, data: { totalBeds: count } });
    return bed;
  }

  async createBedsBulk(wardId: string, data: { prefix: string; startNumber: number; count: number; bedType?: string; dailyRate?: number }) {
    const beds = [];
    for (let i = 0; i < data.count; i++) {
      const bedNumber = `${data.prefix}${String(data.startNumber + i).padStart(2, '0')}`;
      beds.push({ wardId, bedNumber, bedType: data.bedType || 'standard', dailyRate: data.dailyRate });
    }
    await prisma.bed.createMany({ data: beds, skipDuplicates: true });
    const count = await prisma.bed.count({ where: { wardId, isActive: true } });
    await prisma.ward.update({ where: { id: wardId }, data: { totalBeds: count } });
    return { created: beds.length };
  }

  async updateBedStatus(bedId: string, status: BedStatus) {
    return prisma.bed.update({ where: { id: bedId }, data: { status } });
  }

  async getOccupancySummary(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const wards = await prisma.ward.findMany({
      where: { ...where, isActive: true },
      include: {
        beds: { where: { isActive: true }, select: { status: true } },
        branch: { select: { name: true } },
      },
    });

    let totalBeds = 0, occupied = 0, available = 0, maintenance = 0;
    const byWardType: Record<string, { total: number; occupied: number }> = {};

    for (const w of wards) {
      const t = w.beds.length;
      const o = w.beds.filter(b => b.status === 'OCCUPIED').length;
      const a = w.beds.filter(b => b.status === 'AVAILABLE').length;
      const m = w.beds.filter(b => b.status === 'MAINTENANCE' || b.status === 'CLEANING' || b.status === 'OUT_OF_SERVICE').length;
      totalBeds += t; occupied += o; available += a; maintenance += m;

      if (!byWardType[w.wardType]) byWardType[w.wardType] = { total: 0, occupied: 0 };
      byWardType[w.wardType].total += t;
      byWardType[w.wardType].occupied += o;
    }

    return {
      totalBeds, occupied, available, maintenance, reserved: totalBeds - occupied - available - maintenance,
      occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
      byWardType,
    };
  }

  // ==================== ADMISSIONS ====================

  async admitPatient(tenantId: string, userId: string, data: {
    branchId: string; patientId: string; wardId: string; bedId: string;
    admissionReason: string; admissionSource?: string; priority?: string;
    primaryDiagnosis?: string; secondaryDiagnoses?: string[]; admissionNotes?: string;
    dietOrders?: string; activityLevel?: string; precautions?: string[];
    estimatedStay?: number; encounterId?: string; attendingDoctorId?: string;
  }) {
    // Check bed is available
    const bed = await prisma.bed.findUnique({ where: { id: data.bedId } });
    if (!bed || bed.status !== 'AVAILABLE') throw new Error('Bed is not available');

    // Generate admission number
    const count = await prisma.admission.count({ where: { tenantId } });
    const admissionNumber = `ADM-${String(count + 1).padStart(6, '0')}`;

    const [admission] = await prisma.$transaction([
      prisma.admission.create({
        data: {
          tenantId,
          branchId: data.branchId,
          patientId: data.patientId,
          wardId: data.wardId,
          bedId: data.bedId,
          encounterId: data.encounterId,
          admittingDoctorId: userId,
          attendingDoctorId: data.attendingDoctorId,
          admissionNumber,
          admissionReason: data.admissionReason,
          admissionSource: data.admissionSource || 'OPD',
          priority: data.priority || 'routine',
          primaryDiagnosis: data.primaryDiagnosis,
          secondaryDiagnoses: data.secondaryDiagnoses || [],
          admissionNotes: data.admissionNotes,
          dietOrders: data.dietOrders,
          activityLevel: data.activityLevel,
          precautions: data.precautions || [],
          estimatedStay: data.estimatedStay,
          createdBy: userId,
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          ward: { select: { name: true, wardType: true } },
          bed: { select: { bedNumber: true } },
          admittingDoctor: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.bed.update({ where: { id: data.bedId }, data: { status: 'OCCUPIED' } }),
    ]);

    return admission;
  }

  async listAdmissions(tenantId: string, filters: {
    branchId?: string; wardId?: string; status?: AdmissionStatus;
    patientId?: string; search?: string; page?: number; limit?: number;
  } = {}) {
    const { branchId, wardId, status, patientId, search, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (wardId) where.wardId = wardId;
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { mrn: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, phonePrimary: true } },
          ward: { select: { id: true, name: true, wardType: true } },
          bed: { select: { id: true, bedNumber: true } },
          admittingDoctor: { select: { id: true, firstName: true, lastName: true } },
          attendingDoctor: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { nursingNotes: true, wardRounds: true, vitalCharts: true } },
        },
        orderBy: { admissionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.admission.count({ where }),
    ]);

    return { admissions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAdmissionById(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          select: {
            id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true,
            gender: true, phonePrimary: true, bloodGroup: true, address: true,
            allergies: true, nhisInfo: true,
          },
        },
        ward: { select: { id: true, name: true, wardType: true } },
        bed: { select: { id: true, bedNumber: true, bedType: true, dailyRate: true } },
        admittingDoctor: { select: { id: true, firstName: true, lastName: true } },
        attendingDoctor: { select: { id: true, firstName: true, lastName: true } },
        nursingNotes: { orderBy: { createdAt: 'desc' }, take: 10, include: { nurse: { select: { firstName: true, lastName: true } } } },
        wardRounds: { orderBy: { roundDate: 'desc' }, take: 10, include: { doctor: { select: { firstName: true, lastName: true } } } },
        vitalCharts: { orderBy: { recordedAt: 'desc' }, take: 20 },
        medicationAdministrations: { orderBy: { scheduledTime: 'desc' }, take: 20 },
        carePlans: { where: { status: 'active' } },
        bedTransfers: { orderBy: { transferDate: 'desc' } },
      },
    });
    if (!admission) throw new Error('Admission not found');
    return admission;
  }

  // ==================== DISCHARGE ====================

  async dischargePatient(admissionId: string, userId: string, data: {
    dischargeType?: DischargeType; dischargeSummary?: string; dischargeNotes?: string;
    dischargeMedications?: string; followUpDate?: string; followUpInstructions?: string;
  }) {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new Error('Admission not found');
    if (admission.status !== 'ADMITTED') throw new Error('Patient is not currently admitted');

    const admissionDate = new Date(admission.admissionDate);
    const now = new Date();
    const actualStay = Math.max(1, Math.ceil((now.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));

    const [updated] = await prisma.$transaction([
      prisma.admission.update({
        where: { id: admissionId },
        data: {
          status: 'DISCHARGED',
          dischargeDate: now,
          dischargeType: data.dischargeType || 'NORMAL',
          dischargeSummary: data.dischargeSummary,
          dischargeNotes: data.dischargeNotes,
          dischargeMedications: data.dischargeMedications,
          dischargedBy: userId,
          actualStay,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
          followUpInstructions: data.followUpInstructions,
        },
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          ward: { select: { name: true } },
          bed: { select: { bedNumber: true } },
        },
      }),
      prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'CLEANING' } }),
    ]);

    return updated;
  }

  // ==================== BED TRANSFER ====================

  async transferBed(admissionId: string, userId: string, data: { toBedId: string; reason: string }) {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission || admission.status !== 'ADMITTED') throw new Error('Active admission not found');

    const newBed = await prisma.bed.findUnique({ where: { id: data.toBedId } });
    if (!newBed || newBed.status !== 'AVAILABLE') throw new Error('Target bed is not available');

    const [updated] = await prisma.$transaction([
      prisma.admission.update({
        where: { id: admissionId },
        data: { bedId: data.toBedId, wardId: newBed.wardId },
      }),
      prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'CLEANING' } }),
      prisma.bed.update({ where: { id: data.toBedId }, data: { status: 'OCCUPIED' } }),
      prisma.bedTransfer.create({
        data: { admissionId, fromBedId: admission.bedId, toBedId: data.toBedId, reason: data.reason, authorizedBy: userId },
      }),
    ]);

    return updated;
  }

  // ==================== NURSING NOTES ====================

  async addNursingNote(admissionId: string, nurseId: string, data: {
    noteType?: string; content: string; painLevel?: number; consciousness?: string;
    isHandover?: boolean; shift?: string;
  }) {
    return prisma.nursingNote.create({
      data: {
        admissionId, nurseId,
        noteType: data.noteType || 'progress',
        content: data.content,
        painLevel: data.painLevel,
        consciousness: data.consciousness,
        isHandover: data.isHandover || false,
        shift: data.shift,
      },
      include: { nurse: { select: { firstName: true, lastName: true } } },
    });
  }

  async listNursingNotes(admissionId: string, page = 1, limit = 20) {
    const [notes, total] = await Promise.all([
      prisma.nursingNote.findMany({
        where: { admissionId },
        include: { nurse: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nursingNote.count({ where: { admissionId } }),
    ]);
    return { notes, total };
  }

  // ==================== WARD ROUNDS ====================

  async addWardRound(admissionId: string, doctorId: string, data: {
    findings: string; instructions?: string; planChanges?: string;
    dietChanges?: string; medicationChanges?: string; nextRoundDate?: string;
  }) {
    return prisma.wardRound.create({
      data: {
        admissionId, doctorId,
        findings: data.findings,
        instructions: data.instructions,
        planChanges: data.planChanges,
        dietChanges: data.dietChanges,
        medicationChanges: data.medicationChanges,
        nextRoundDate: data.nextRoundDate ? new Date(data.nextRoundDate) : undefined,
      },
      include: { doctor: { select: { firstName: true, lastName: true } } },
    });
  }

  // ==================== VITAL CHARTS ====================

  async recordVitals(admissionId: string, recordedBy: string, data: {
    bloodPressureSystolic?: number; bloodPressureDiastolic?: number;
    temperature?: number; pulse?: number; respiratoryRate?: number;
    oxygenSaturation?: number; bloodGlucose?: number; painLevel?: number;
    intakeOral?: number; intakeIV?: number; outputUrine?: number; outputOther?: number;
    consciousness?: string; notes?: string;
  }) {
    return prisma.inpatientVitalChart.create({
      data: { admissionId, recordedBy, ...data },
    });
  }

  async getVitalCharts(admissionId: string, limit = 48) {
    return prisma.inpatientVitalChart.findMany({
      where: { admissionId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  // ==================== MEDICATION ADMINISTRATION ====================

  async addMedication(admissionId: string, data: {
    medicationName: string; dosage: string; route: string; frequency: string;
    scheduledTime: string; notes?: string;
  }) {
    return prisma.medicationAdministration.create({
      data: {
        admissionId,
        medicationName: data.medicationName,
        dosage: data.dosage,
        route: data.route,
        frequency: data.frequency,
        scheduledTime: new Date(data.scheduledTime),
        notes: data.notes,
      },
    });
  }

  async administerMedication(medId: string, userId: string, data: { notes?: string }) {
    return prisma.medicationAdministration.update({
      where: { id: medId },
      data: { status: 'administered', administeredAt: new Date(), administeredBy: userId, notes: data.notes },
    });
  }

  async refuseMedication(medId: string, data: { refusedReason: string }) {
    return prisma.medicationAdministration.update({
      where: { id: medId },
      data: { status: 'refused', refusedReason: data.refusedReason },
    });
  }

  async getMedicationSchedule(admissionId: string) {
    return prisma.medicationAdministration.findMany({
      where: { admissionId },
      orderBy: { scheduledTime: 'asc' },
    });
  }

  // ==================== CARE PLANS ====================

  async addCarePlan(admissionId: string, userId: string, data: {
    problem: string; goal: string; interventions: string; evaluation?: string;
  }) {
    return prisma.carePlan.create({
      data: { admissionId, createdBy: userId, ...data },
    });
  }

  async updateCarePlan(planId: string, data: { evaluation?: string; status?: string }) {
    return prisma.carePlan.update({ where: { id: planId }, data });
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const [
      totalAdmitted, pendingDischarge, todayAdmissions, todayDischarges,
      occupancy,
    ] = await Promise.all([
      prisma.admission.count({ where: { ...where, status: 'ADMITTED' } }),
      prisma.admission.count({ where: { ...where, status: 'ADMITTED', followUpDate: { lte: new Date() } } }),
      prisma.admission.count({
        where: { ...where, admissionDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.admission.count({
        where: { ...where, status: 'DISCHARGED', dischargeDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      this.getOccupancySummary(tenantId, branchId),
    ]);

    return {
      totalAdmitted,
      pendingDischarge,
      todayAdmissions,
      todayDischarges,
      ...occupancy,
    };
  }
}

export const inpatientService = new InpatientService();
