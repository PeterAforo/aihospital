import { prisma } from '../../common/utils/prisma';

export interface CreateLabOrderDto {
  encounterId: string;
  patientId: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  notes?: string;
  tests: {
    testId: string;
    notes?: string;
  }[];
}

export class LabOrderService {
  /**
   * Search available lab tests
   */
  async searchTests(query: string, tenantId?: string, limit = 20) {
    if (!query || query.length < 2) {
      // Return common tests if no query
      return prisma.labTest.findMany({
        where: {
          isActive: true,
          OR: [
            { tenantId: null },
            { tenantId },
          ],
        },
        take: limit,
        orderBy: { name: 'asc' },
      });
    }

    return prisma.labTest.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
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
        { name: 'asc' },
      ],
    });
  }

  /**
   * Create a new lab order
   */
  async createLabOrder(tenantId: string, orderedBy: string, data: CreateLabOrderDto) {
    // Validate tests exist
    const testIds = data.tests.map(t => t.testId);
    const tests = await prisma.labTest.findMany({
      where: { id: { in: testIds }, isActive: true },
    });

    if (tests.length !== testIds.length) {
      throw new Error('One or more selected tests are invalid');
    }

    // Create order with items
    const order = await prisma.labOrder.create({
      data: {
        tenantId,
        encounterId: data.encounterId,
        patientId: data.patientId,
        orderedBy,
        priority: data.priority || 'ROUTINE',
        status: 'PENDING',
        notes: data.notes,
        items: {
          create: data.tests.map(t => ({
            testId: t.testId,
            status: 'PENDING',
            notes: t.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            test: true,
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
      },
    });

    return order;
  }

  /**
   * Get lab orders for an encounter
   */
  async getOrdersByEncounter(encounterId: string, tenantId: string) {
    return prisma.labOrder.findMany({
      where: { encounterId, tenantId },
      include: {
        items: {
          include: {
            test: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get lab order by ID
   */
  async getOrderById(orderId: string, tenantId: string) {
    return prisma.labOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            test: true,
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
          },
        },
      },
    });
  }

  /**
   * Cancel a lab order
   */
  async cancelOrder(orderId: string, tenantId: string) {
    const order = await prisma.labOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new Error('Lab order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Can only cancel pending orders');
    }

    return prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }
}

export const labOrderService = new LabOrderService();
