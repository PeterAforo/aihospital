import { prisma } from '../../common/utils/prisma';
import { smsService } from '../../common/services/sms.service.js';
import { logger } from '../../common/utils/logger.js';

export interface CreatePrescriptionDto {
  encounterId: string;
  patientId: string;
  notes?: string;
  items: {
    drugId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
  }[];
}

export class PrescriptionService {
  /**
   * Search available drugs
   */
  async searchDrugs(query: string, tenantId?: string, limit = 20) {
    if (!query || query.length < 2) {
      // Return common drugs if no query
      return prisma.drug.findMany({
        where: {
          isActive: true,
          OR: [
            { tenantId: null },
            { tenantId },
          ],
        },
        take: limit,
        orderBy: { genericName: 'asc' },
      });
    }

    return prisma.drug.findMany({
      where: {
        isActive: true,
        OR: [
          { genericName: { contains: query, mode: 'insensitive' } },
          { brandName: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
        AND: [
          {
            OR: [
              { tenantId: null },
              { tenantId },
            ],
          },
        ],
      },
      take: limit,
      orderBy: [
        { nhisApproved: 'desc' },
        { genericName: 'asc' },
      ],
    });
  }

  /**
   * Create a new prescription
   */
  async createPrescription(tenantId: string, doctorId: string, data: CreatePrescriptionDto) {
    // Validate drugs exist
    const drugIds = data.items.map(i => i.drugId);
    const drugs = await prisma.drug.findMany({
      where: { id: { in: drugIds }, isActive: true },
    });

    if (drugs.length !== drugIds.length) {
      throw new Error('One or more selected drugs are invalid');
    }

    // Create prescription with items
    const prescription = await prisma.prescription.create({
      data: {
        tenantId,
        encounterId: data.encounterId,
        patientId: data.patientId,
        doctorId,
        status: 'PENDING',
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            drugId: item.drugId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions,
            status: 'PENDING',
          })),
        },
      },
      include: {
        items: {
          include: {
            drug: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send e-prescription SMS to patient (async, non-blocking)
    this.sendPrescriptionSMS(prescription).catch(e =>
      logger.warn(`Failed to send prescription SMS: ${e.message}`)
    );

    return prescription;
  }

  /**
   * Send prescription details via SMS to patient
   */
  private async sendPrescriptionSMS(prescription: any) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: prescription.patientId },
        select: { phonePrimary: true, phoneSecondary: true, firstName: true },
      });

      const phone = patient?.phonePrimary || patient?.phoneSecondary;
      if (!phone) return;

      const drugList = (prescription.items || [])
        .slice(0, 5)
        .map((item: any) => `- ${item.drug?.genericName || item.drug?.brandName || 'Medication'}: ${item.dosage}, ${item.frequency}`)
        .join('\n');

      const message = `Dear ${patient.firstName}, your prescription is ready:\n${drugList}\n\nPlease visit the pharmacy for dispensing.\n-MediCare Ghana`;

      await smsService.sendSMS({ to: phone, message });
    } catch (error: any) {
      logger.warn(`Prescription SMS error: ${error.message}`);
    }
  }

  /**
   * Get prescriptions for an encounter
   */
  async getPrescriptionsByEncounter(encounterId: string, tenantId: string) {
    return prisma.prescription.findMany({
      where: { encounterId, tenantId },
      include: {
        items: {
          include: {
            drug: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get prescription by ID
   */
  async getPrescriptionById(prescriptionId: string, tenantId: string) {
    return prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: {
        items: {
          include: {
            drug: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dateOfBirth: true,
            gender: true,
            allergies: true,
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
      },
    });
  }

  /**
   * Cancel a prescription
   */
  async cancelPrescription(prescriptionId: string, tenantId: string) {
    const prescription = await prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    if (prescription.status !== 'PENDING') {
      throw new Error('Can only cancel pending prescriptions');
    }

    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Get common frequency options
   */
  getFrequencyOptions() {
    return [
      { value: 'OD', label: 'Once daily (OD)', dosesPerDay: 1 },
      { value: 'BD', label: 'Twice daily (BD)', dosesPerDay: 2 },
      { value: 'TDS', label: 'Three times daily (TDS)', dosesPerDay: 3 },
      { value: 'QDS', label: 'Four times daily (QDS)', dosesPerDay: 4 },
      { value: 'PRN', label: 'As needed (PRN)', dosesPerDay: 0 },
      { value: 'STAT', label: 'Immediately (STAT)', dosesPerDay: 1 },
      { value: 'NOCTE', label: 'At night (NOCTE)', dosesPerDay: 1 },
      { value: 'MANE', label: 'In the morning (MANE)', dosesPerDay: 1 },
      { value: 'Q2H', label: 'Every 2 hours', dosesPerDay: 12 },
      { value: 'Q4H', label: 'Every 4 hours', dosesPerDay: 6 },
      { value: 'Q6H', label: 'Every 6 hours', dosesPerDay: 4 },
      { value: 'Q8H', label: 'Every 8 hours', dosesPerDay: 3 },
      { value: 'Q12H', label: 'Every 12 hours', dosesPerDay: 2 },
      { value: 'WEEKLY', label: 'Once weekly', dosesPerDay: 0.143 },
    ];
  }

  /**
   * Get common duration options
   */
  getDurationOptions() {
    return [
      { value: '6 hours', label: '6 hours', days: 0.25 },
      { value: '8 hours', label: '8 hours', days: 0.333 },
      { value: '12 hours', label: '12 hours', days: 0.5 },
      { value: '24 hours', label: '24 hours (1 day)', days: 1 },
      { value: '48 hours', label: '48 hours (2 days)', days: 2 },
      { value: '72 hours', label: '72 hours (3 days)', days: 3 },
      { value: '3 days', label: '3 days', days: 3 },
      { value: '5 days', label: '5 days', days: 5 },
      { value: '7 days', label: '7 days (1 week)', days: 7 },
      { value: '10 days', label: '10 days', days: 10 },
      { value: '14 days', label: '14 days (2 weeks)', days: 14 },
      { value: '21 days', label: '21 days (3 weeks)', days: 21 },
      { value: '28 days', label: '28 days (4 weeks)', days: 28 },
      { value: '30 days', label: '30 days (1 month)', days: 30 },
      { value: '60 days', label: '60 days (2 months)', days: 60 },
      { value: '90 days', label: '90 days (3 months)', days: 90 },
      { value: 'Continuous', label: 'Continuous/Ongoing', days: 0 },
    ];
  }
}

export const prescriptionService = new PrescriptionService();
