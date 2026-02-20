import { prisma } from '../../common/utils/prisma.js';
import { logger } from '../../common/utils/logger.js';

export class AnesthesiaService {
  async createRecord(tenantId: string, data: any) {
    return prisma.anesthesiaRecord.create({
      data: {
        tenantId,
        surgeryId: data.surgeryId,
        patientId: data.patientId,
        anesthetistId: data.anesthetistId,
        asaClass: data.asaClass,
        mallampatiScore: data.mallampatiScore,
        airwayAssessment: data.airwayAssessment,
        allergies: data.allergies,
        npoStatus: data.npoStatus,
        preOpVitals: data.preOpVitals,
        preExistingConditions: data.preExistingConditions,
        previousAnesthesia: data.previousAnesthesia,
        anesthesiaType: data.anesthesiaType || 'GENERAL',
        technique: data.technique,
        airwayDevice: data.airwayDevice,
        ettSize: data.ettSize,
        ettDepth: data.ettDepth,
        inductionAgent: data.inductionAgent,
        inductionDose: data.inductionDose,
        muscleRelaxant: data.muscleRelaxant,
        muscleRelaxantDose: data.muscleRelaxantDose,
        maintenanceAgent: data.maintenanceAgent,
        opioidUsed: data.opioidUsed,
        opioidDose: data.opioidDose,
        localAnesthetic: data.localAnesthetic,
        localDose: data.localDose,
        ivFluids: data.ivFluids,
        monitoringUsed: data.monitoringUsed || [],
        anesthesiaPlan: data.anesthesiaPlan,
        preOpNotes: data.preOpNotes,
        status: 'PLANNED',
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
  }

  async getRecords(tenantId: string, filters?: {
    surgeryId?: string; patientId?: string; anesthetistId?: string;
    status?: string; page?: number; limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.surgeryId) where.surgeryId = filters.surgeryId;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.anesthetistId) where.anesthetistId = filters.anesthetistId;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [records, total] = await Promise.all([
      prisma.anesthesiaRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.anesthesiaRecord.count({ where }),
    ]);

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRecordById(id: string) {
    return prisma.anesthesiaRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true, bloodGroup: true } },
      },
    });
  }

  async updateRecord(id: string, data: any) {
    const updateData: any = {};
    const fields = [
      'asaClass', 'mallampatiScore', 'airwayAssessment', 'allergies', 'npoStatus',
      'preOpVitals', 'preExistingConditions', 'previousAnesthesia', 'complications',
      'anesthesiaType', 'technique', 'airwayDevice', 'ettSize', 'ettDepth',
      'inductionAgent', 'inductionDose', 'muscleRelaxant', 'muscleRelaxantDose',
      'maintenanceAgent', 'opioidUsed', 'opioidDose', 'localAnesthetic', 'localDose',
      'ivFluids', 'bloodProducts', 'vasopressors', 'monitoringUsed', 'vitalSigns',
      'intraOpEvents', 'estimatedBloodLoss', 'urineOutput', 'totalIVFluids',
      'pacuScore', 'postOpPainScore', 'postOpNausea', 'postOpShivering',
      'postOpComplications', 'preOpNotes', 'intraOpNotes', 'postOpNotes',
      'anesthesiaPlan', 'status',
    ];

    for (const f of fields) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }

    // Handle datetime fields
    const dtFields = [
      'inductionTime', 'intubationTime', 'incisionTime', 'endSurgeryTime',
      'extubationTime', 'pacuArrivalTime', 'pacuDischargeTime',
    ];
    for (const f of dtFields) {
      if (data[f]) updateData[f] = new Date(data[f]);
    }

    return prisma.anesthesiaRecord.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
  }

  async startAnesthesia(id: string) {
    return prisma.anesthesiaRecord.update({
      where: { id },
      data: { status: 'IN_PROGRESS', inductionTime: new Date() },
    });
  }

  async completeAnesthesia(id: string, data: any) {
    return prisma.anesthesiaRecord.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        extubationTime: data.extubationTime ? new Date(data.extubationTime) : new Date(),
        pacuArrivalTime: data.pacuArrivalTime ? new Date(data.pacuArrivalTime) : undefined,
        pacuScore: data.pacuScore,
        postOpPainScore: data.postOpPainScore,
        postOpNausea: data.postOpNausea,
        postOpShivering: data.postOpShivering,
        postOpComplications: data.postOpComplications,
        postOpNotes: data.postOpNotes,
        estimatedBloodLoss: data.estimatedBloodLoss,
        urineOutput: data.urineOutput,
        totalIVFluids: data.totalIVFluids,
      },
    });
  }

  async addVitalSign(id: string, vitalSign: {
    time: string; hr?: number; sbp?: number; dbp?: number;
    spo2?: number; etco2?: number; temp?: number; rr?: number;
  }) {
    const record = await prisma.anesthesiaRecord.findUnique({ where: { id } });
    if (!record) throw new Error('Record not found');

    const existing = (record.vitalSigns as any[]) || [];
    existing.push(vitalSign);

    return prisma.anesthesiaRecord.update({
      where: { id },
      data: { vitalSigns: existing },
    });
  }

  async dischargePACU(id: string, data: { pacuDischargeScore: number; postOpNotes?: string }) {
    return prisma.anesthesiaRecord.update({
      where: { id },
      data: {
        pacuDischargeTime: new Date(),
        pacuDischargeScore: data.pacuDischargeScore,
        postOpNotes: data.postOpNotes,
      },
    });
  }
}

export const anesthesiaService = new AnesthesiaService();
