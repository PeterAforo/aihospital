import { prisma } from '../../common/utils/prisma';
import { invoiceService } from '../billing/invoice.service';

export interface CreateEncounterDto {
  patientId: string;
  appointmentId?: string;
  encounterType?: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'TELEMEDICINE' | 'FOLLOW_UP';
  template?: string;
}

export interface UpdateEncounterDto {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  reviewOfSystems?: Record<string, unknown>;
  pastMedicalHistory?: string;
  medicationsReviewed?: boolean;
  allergiesReviewed?: boolean;
  socialHistory?: string;
  familyHistory?: string;
  generalAppearance?: string;
  physicalExamination?: Record<string, unknown>;
  clinicalImpression?: string;
  differentialDiagnoses?: string[];
  treatmentPlan?: string;
  patientEducation?: string;
  followUpPlan?: string;
  followUpDate?: Date;
  disposition?: 'DISCHARGED' | 'ADMITTED' | 'TRANSFERRED' | 'AMA' | 'DECEASED' | 'FOLLOW_UP';
}

export interface AddDiagnosisDto {
  icd10Code: string;
  icd10Description: string;
  diagnosisType: 'PRIMARY' | 'SECONDARY';
  status?: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  onsetDate?: Date;
  notes?: string;
}

export class EncounterService {
  /**
   * Create a new encounter
   */
  async createEncounter(
    tenantId: string,
    branchId: string,
    doctorId: string,
    departmentId: string | null,
    data: CreateEncounterDto
  ) {
    // Get patient context
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: {
        allergies: true,
        currentMedications: { where: { isActive: true } },
        chronicConditions: { where: { isActive: true } },
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Get problem list
    const problemList = await prisma.problemList.findMany({
      where: { patientId: data.patientId, status: 'active' },
    });

    // Get recent vitals from triage if appointment provided
    let recentVitals = null;
    let triageRecordId = null;
    if (data.appointmentId) {
      const triageRecord = await prisma.triageRecord.findUnique({
        where: { appointmentId: data.appointmentId },
      });
      if (triageRecord) {
        triageRecordId = triageRecord.id;
        recentVitals = {
          bpSystolic: triageRecord.bpSystolic,
          bpDiastolic: triageRecord.bpDiastolic,
          temperature: triageRecord.temperature,
          pulseRate: triageRecord.pulseRate,
          respiratoryRate: triageRecord.respiratoryRate,
          spo2: triageRecord.spo2,
          weight: triageRecord.weight,
          height: triageRecord.height,
          bmi: triageRecord.bmi,
          chiefComplaint: triageRecord.chiefComplaint,
        };
      }

      // Update appointment status
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    // Get template if specified
    let templateData = null;
    if (data.template) {
      templateData = await prisma.encounterTemplate.findFirst({
        where: {
          OR: [
            { tenantId, name: data.template },
            { tenantId: null, name: data.template, isSystemTemplate: true },
          ],
          isActive: true,
        },
      });
    }

    // Create encounter
    const encounter = await prisma.encounter.create({
      data: {
        tenantId,
        branchId,
        departmentId,
        patientId: data.patientId,
        doctorId,
        appointmentId: data.appointmentId,
        triageRecordId,
        encounterType: data.encounterType || 'OUTPATIENT',
        encounterDate: new Date(),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        chiefComplaint: recentVitals?.chiefComplaint || null,
        templateUsed: data.template || null,
      },
    });

    return {
      encounter,
      patientContext: {
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        chronicConditions: patient.chronicConditions,
        problemList,
        recentVitals,
      },
      template: templateData,
    };
  }

  /**
   * Get encounter by ID with all related data
   */
  async getEncounter(encounterId: string, tenantId: string) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        patient: {
          include: {
            allergies: true,
            currentMedications: { where: { isActive: true } },
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        diagnoses: {
          orderBy: [{ diagnosisType: 'asc' }, { rank: 'asc' }],
        },
        labOrders: {
          include: { items: true },
        },
        radiologyOrders: true,
        prescriptions: {
          include: { items: true },
        },
        vitalSigns: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    // Get problem list
    const problemList = await prisma.problemList.findMany({
      where: { patientId: encounter.patientId, status: 'active' },
    });

    return {
      encounter,
      problemList,
    };
  }

  /**
   * Update encounter documentation
   */
  async updateEncounter(
    encounterId: string,
    tenantId: string,
    doctorId: string,
    data: UpdateEncounterDto
  ) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'SIGNED') {
      throw new Error('Cannot edit signed encounter. Create an addendum instead.');
    }

    // If encounter is completed, log changes for audit
    if (encounter.status === 'COMPLETED') {
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
      
      for (const [key, value] of Object.entries(data)) {
        const oldValue = (encounter as Record<string, unknown>)[key];
        if (oldValue !== value) {
          changes.push({
            field: key,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: value ? String(value) : null,
          });
        }
      }

      if (changes.length > 0) {
        await prisma.encounterNotesHistory.createMany({
          data: changes.map(c => ({
            encounterId,
            fieldName: c.field,
            oldValue: c.oldValue,
            newValue: c.newValue,
            editedBy: doctorId,
          })),
        });
      }
    }

    // Sanitize: convert empty strings to null/undefined for enum and optional fields
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = value === '' ? null : value;
    }

    const updated = await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        ...sanitized,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Add diagnosis to encounter
   */
  async addDiagnosis(
    encounterId: string,
    tenantId: string,
    data: AddDiagnosisDto
  ) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: { diagnoses: true },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'SIGNED') {
      throw new Error('Cannot add diagnosis to signed encounter');
    }

    // Check if primary diagnosis already exists
    if (data.diagnosisType === 'PRIMARY') {
      const existingPrimary = encounter.diagnoses.find(
        d => d.diagnosisType === 'PRIMARY'
      );
      if (existingPrimary) {
        throw new Error('Primary diagnosis already exists. Remove it first or add as secondary.');
      }
    }

    // Calculate rank
    const rank = data.diagnosisType === 'PRIMARY' 
      ? 1 
      : encounter.diagnoses.filter(d => d.diagnosisType === 'SECONDARY').length + 2;

    const diagnosis = await prisma.diagnosis.create({
      data: {
        encounterId,
        icd10Code: data.icd10Code,
        icd10Description: data.icd10Description,
        diagnosisType: data.diagnosisType,
        status: data.status || 'ACTIVE',
        onsetDate: data.onsetDate,
        notes: data.notes,
        rank,
      },
    });

    // If chronic condition, add to problem list
    if (data.status === 'CHRONIC') {
      await prisma.problemList.create({
        data: {
          tenantId,
          patientId: encounter.patientId,
          icd10Code: data.icd10Code,
          icd10Description: data.icd10Description,
          problemName: data.icd10Description,
          status: 'active',
          onsetDate: data.onsetDate,
          addedBy: encounter.doctorId,
          addedFromEncounterId: encounterId,
        },
      });
    }

    return diagnosis;
  }

  /**
   * Remove diagnosis from encounter
   */
  async removeDiagnosis(
    encounterId: string,
    diagnosisId: string,
    tenantId: string
  ) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'SIGNED') {
      throw new Error('Cannot remove diagnosis from signed encounter');
    }

    await prisma.diagnosis.delete({
      where: { id: diagnosisId },
    });

    return { success: true };
  }

  /**
   * Complete encounter
   */
  async completeEncounter(encounterId: string, tenantId: string, branchId?: string, userId?: string) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: { diagnoses: true },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'COMPLETED') {
      throw new Error('Encounter is already completed');
    }

    // Calculate duration
    const durationMinutes = encounter.encounterDate
      ? Math.floor((new Date().getTime() - encounter.encounterDate.getTime()) / (1000 * 60))
      : 0;

    // Update encounter
    const completed = await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        encounterDurationMinutes: durationMinutes,
      },
    });

    // Update appointment if exists
    if (encounter.appointmentId) {
      await prisma.appointment.update({
        where: { id: encounter.appointmentId },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date(),
          actualDurationMinutes: durationMinutes,
        },
      });
    }

    // Auto-generate invoice if branchId and userId are provided
    if (branchId && userId) {
      try {
        console.log(`[INVOICE_GENERATION] Generating invoice for encounter ${encounterId}`);
        const invoice = await invoiceService.generateFromEncounter(
          tenantId,
          branchId,
          userId,
          encounterId
        );
        console.log(`[INVOICE_GENERATION] Invoice generated: ${invoice.invoiceNumber}`);
      } catch (error: any) {
        console.warn(`[INVOICE_GENERATION] Failed to generate invoice for encounter ${encounterId}:`, error.message);
        // Don't fail the encounter completion if invoice generation fails
      }
    }

    return completed;
  }

  /**
   * Sign encounter (make immutable)
   */
  async signEncounter(encounterId: string, tenantId: string, doctorId: string) {
    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'SIGNED') {
      throw new Error('Encounter is already signed');
    }

    if (encounter.status !== 'COMPLETED') {
      throw new Error('Encounter must be completed before signing');
    }

    const signed = await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedBy: doctorId,
      },
    });

    return signed;
  }

  /**
   * Get patient encounter history
   */
  async getPatientEncounters(
    patientId: string,
    tenantId: string,
    options: { limit?: number; status?: string; dateFrom?: Date; dateTo?: Date } = {}
  ) {
    const { limit = 20, status, dateFrom, dateTo } = options;

    const encounters = await prisma.encounter.findMany({
      where: {
        patientId,
        tenantId,
        ...(status && { status: status as 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'CANCELLED' }),
        ...(dateFrom && { encounterDate: { gte: dateFrom } }),
        ...(dateTo && { encounterDate: { lte: dateTo } }),
      },
      include: {
        doctor: {
          select: { firstName: true, lastName: true, specialization: true },
        },
        diagnoses: {
          where: { diagnosisType: 'PRIMARY' },
          take: 1,
        },
      },
      orderBy: { encounterDate: 'desc' },
      take: limit,
    });

    const total = await prisma.encounter.count({
      where: {
        patientId,
        tenantId,
        ...(status && { status: status as 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'CANCELLED' }),
      },
    });

    return { encounters, total };
  }
}

export const encounterService = new EncounterService();
