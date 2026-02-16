import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CollectSampleDto {
  orderId: string;
  orderItemId: string;
  patientId: string;
  sampleType: string;
  collectionSite?: string;
  volume?: number;
  notes?: string;
}

class SampleService {
  private async generateSampleNumber(tenantId: string): Promise<string> {
    const count = await prisma.labSample.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `LAB-S-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  async getLabWorklist(
    tenantId: string,
    branchId?: string,
    status?: string,
    priority?: string,
    date?: Date
  ) {
    const where: any = { tenantId };
    
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['PENDING', 'SAMPLE_COLLECTED', 'PROCESSING'] };
    }

    const orders = await prisma.labOrder.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        encounter: {
          select: {
            id: true,
            branchId: true,
            doctor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        items: {
          include: {
            test: true,
            samples: true,
          },
        },
        samples: true,
      },
      orderBy: [
        { priority: 'desc' },
        { orderDate: 'asc' },
      ],
    });

    // Filter by branch if specified
    let result = orders;
    if (branchId) {
      result = orders.filter(o => o.encounter?.branchId === branchId);
    }

    // Filter by priority
    if (priority) {
      result = result.filter(o => o.priority === priority);
    }

    return result;
  }

  async getWorklistStats(tenantId: string, branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseWhere: any = { tenantId };

    const [pending, sampleCollected, processing, completed] = await Promise.all([
      prisma.labOrder.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.labOrder.count({ where: { ...baseWhere, status: 'SAMPLE_COLLECTED' } }),
      prisma.labOrder.count({ where: { ...baseWhere, status: 'PROCESSING' } }),
      prisma.labOrder.count({ 
        where: { 
          ...baseWhere, 
          status: 'COMPLETED',
          updatedAt: { gte: today },
        } 
      }),
    ]);

    return { pending, sampleCollected, processing, completedToday: completed };
  }

  async collectSample(
    tenantId: string,
    branchId: string,
    userId: string,
    data: CollectSampleDto
  ) {
    const orderItem = await prisma.labOrderItem.findUnique({
      where: { id: data.orderItemId },
      include: { order: true, test: true },
    });

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    // Check if sample already collected
    const existingSample = await prisma.labSample.findFirst({
      where: { orderItemId: data.orderItemId },
    });

    if (existingSample) {
      throw new Error('Sample already collected for this test');
    }

    const sampleNumber = await this.generateSampleNumber(tenantId);

    const sample = await prisma.labSample.create({
      data: {
        tenantId,
        branchId,
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        patientId: data.patientId,
        sampleNumber,
        sampleType: data.sampleType || orderItem.test.sampleType || 'Blood',
        collectedBy: userId,
        collectionSite: data.collectionSite,
        volume: data.volume,
        notes: data.notes,
        status: 'COLLECTED',
      },
    });

    // Update order item status
    await prisma.labOrderItem.update({
      where: { id: data.orderItemId },
      data: { status: 'SAMPLE_COLLECTED' },
    });

    // Check if all items have samples collected
    const order = await prisma.labOrder.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });

    const allCollected = order?.items.every(
      i => i.status !== 'PENDING'
    );

    if (allCollected) {
      await prisma.labOrder.update({
        where: { id: data.orderId },
        data: { status: 'SAMPLE_COLLECTED' },
      });
    }

    return sample;
  }

  async getSampleByNumber(sampleNumber: string) {
    return prisma.labSample.findUnique({
      where: { sampleNumber },
      include: {
        order: true,
        orderItem: {
          include: { test: true },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        collectedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async receiveSample(
    sampleId: string,
    userId: string,
    condition: string = 'ADEQUATE'
  ) {
    const sample = await prisma.labSample.findUnique({
      where: { id: sampleId },
    });

    if (!sample) {
      throw new Error('Sample not found');
    }

    if (sample.status !== 'COLLECTED') {
      throw new Error(`Sample is already ${sample.status.toLowerCase()}`);
    }

    await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        status: 'RECEIVED',
        receivedBy: userId,
        receivedAt: new Date(),
        condition,
      },
    });

    // Update order item status
    await prisma.labOrderItem.update({
      where: { id: sample.orderItemId },
      data: { status: 'PROCESSING' },
    });

    // Update order status
    await prisma.labOrder.update({
      where: { id: sample.orderId },
      data: { status: 'PROCESSING' },
    });

    return { success: true };
  }

  async rejectSample(
    sampleId: string,
    userId: string,
    rejectionReason: string
  ) {
    const sample = await prisma.labSample.findUnique({
      where: { id: sampleId },
    });

    if (!sample) {
      throw new Error('Sample not found');
    }

    await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        status: 'REJECTED',
        receivedBy: userId,
        receivedAt: new Date(),
        rejectionReason,
        condition: 'REJECTED',
      },
    });

    // Update order item status back to pending for recollection
    await prisma.labOrderItem.update({
      where: { id: sample.orderItemId },
      data: { status: 'PENDING' },
    });

    return { success: true, message: 'Sample rejected. Recollection required.' };
  }
}

export const sampleService = new SampleService();
