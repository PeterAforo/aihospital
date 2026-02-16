import { prisma } from '../../common/utils/prisma';

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

    return prescription;
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
      { value: 'OD', label: 'Once daily (OD)' },
      { value: 'BD', label: 'Twice daily (BD)' },
      { value: 'TDS', label: 'Three times daily (TDS)' },
      { value: 'QDS', label: 'Four times daily (QDS)' },
      { value: 'PRN', label: 'As needed (PRN)' },
      { value: 'STAT', label: 'Immediately (STAT)' },
      { value: 'NOCTE', label: 'At night (NOCTE)' },
      { value: 'MANE', label: 'In the morning (MANE)' },
      { value: 'Q4H', label: 'Every 4 hours' },
      { value: 'Q6H', label: 'Every 6 hours' },
      { value: 'Q8H', label: 'Every 8 hours' },
      { value: 'Q12H', label: 'Every 12 hours' },
      { value: 'WEEKLY', label: 'Once weekly' },
    ];
  }

  /**
   * Get common duration options
   */
  getDurationOptions() {
    return [
      { value: '3 days', label: '3 days' },
      { value: '5 days', label: '5 days' },
      { value: '7 days', label: '7 days (1 week)' },
      { value: '10 days', label: '10 days' },
      { value: '14 days', label: '14 days (2 weeks)' },
      { value: '21 days', label: '21 days (3 weeks)' },
      { value: '28 days', label: '28 days (4 weeks)' },
      { value: '30 days', label: '30 days (1 month)' },
      { value: '60 days', label: '60 days (2 months)' },
      { value: '90 days', label: '90 days (3 months)' },
      { value: 'Continuous', label: 'Continuous/Ongoing' },
    ];
  }
}

export const prescriptionService = new PrescriptionService();
