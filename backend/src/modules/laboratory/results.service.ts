import { PrismaClient } from '@prisma/client';
import { invoiceService } from '../billing/invoice.service';
import { notificationService } from '../notifications/notification.service';

const prisma = new PrismaClient();

interface ResultEntryDto {
  orderItemId: string;
  result?: string;
  resultValue?: number;
  unit?: string;
  notes?: string;
}

interface ReferenceRange {
  lowValue?: number;
  highValue?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

class ResultsService {
  async enterResult(
    tenantId: string,
    userId: string,
    data: ResultEntryDto
  ) {
    const orderItem = await prisma.labOrderItem.findUnique({
      where: { id: data.orderItemId },
      include: {
        test: {
          include: { referenceRanges: true },
        },
        order: {
          include: { patient: true },
        },
      },
    });

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    // Get reference range for patient
    const patient = orderItem.order.patient;
    const ageInDays = patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const referenceRange = this.findApplicableRange(
      orderItem.test.referenceRanges,
      patient.gender,
      ageInDays
    );

    // Determine if abnormal or critical
    let isAbnormal = false;
    let isCritical = false;

    if (data.resultValue !== undefined && referenceRange) {
      if (referenceRange.lowValue != null && data.resultValue < referenceRange.lowValue) {
        isAbnormal = true;
      }
      if (referenceRange.highValue != null && data.resultValue > referenceRange.highValue) {
        isAbnormal = true;
      }
      if (referenceRange.criticalLow != null && data.resultValue < referenceRange.criticalLow) {
        isCritical = true;
      }
      if (referenceRange.criticalHigh != null && data.resultValue > referenceRange.criticalHigh) {
        isCritical = true;
      }
    }

    // Update order item with result
    const updatedItem = await prisma.labOrderItem.update({
      where: { id: data.orderItemId },
      data: {
        result: data.result,
        resultValue: data.resultValue,
        unit: data.unit || orderItem.test.unit,
        normalRange: referenceRange
          ? `${referenceRange.lowValue || ''}-${referenceRange.highValue || ''}`
          : orderItem.test.normalRange,
        isAbnormal,
        isCritical,
        performedBy: userId,
        performedAt: new Date(),
        notes: data.notes,
        status: 'RESULTED',
      },
    });

    // Create critical value alert if needed
    if (isCritical) {
      await this.createCriticalAlert(tenantId, orderItem, data.resultValue!);
    }

    return updatedItem;
  }

  private findApplicableRange(
    ranges: any[],
    gender: string | null,
    ageInDays: number | null
  ): ReferenceRange | null {
    if (!ranges || ranges.length === 0) return null;

    // Find most specific match
    for (const range of ranges) {
      const genderMatch = !range.gender || range.gender === 'ALL' || range.gender === gender;
      const ageMatch = ageInDays === null || (
        (range.ageMinDays === null || ageInDays >= range.ageMinDays) &&
        (range.ageMaxDays === null || ageInDays <= range.ageMaxDays)
      );

      if (genderMatch && ageMatch) {
        return range;
      }
    }

    // Return first range as fallback
    return ranges[0];
  }

  private async createCriticalAlert(
    tenantId: string,
    orderItem: any,
    resultValue: number
  ) {
    const criticalType = resultValue > (orderItem.test.referenceRanges[0]?.criticalHigh || Infinity)
      ? 'HIGH'
      : 'LOW';

    const alert = await prisma.criticalValueAlert.create({
      data: {
        tenantId,
        orderItemId: orderItem.id,
        patientId: orderItem.order.patientId,
        testName: orderItem.test.name,
        resultValue,
        criticalType,
        notifiedTo: orderItem.order.orderedBy,
      },
    });

    // Auto-notify ordering doctor via in-app notification
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: orderItem.order.patientId },
        select: { firstName: true, lastName: true },
      });
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';

      await notificationService.notifyCriticalLabValue({
        doctorId: orderItem.order.orderedBy,
        patientName,
        testName: orderItem.test.name,
        resultValue,
        criticalType,
        orderId: orderItem.order.id,
        alertId: alert.id,
      });
    } catch (err) {
      // Don't fail the alert creation if notification fails
      console.error('Failed to send critical value notification:', err);
    }
  }

  async verifyResult(
    orderItemId: string,
    userId: string
  ) {
    const orderItem = await prisma.labOrderItem.findUnique({
      where: { id: orderItemId },
      include: { 
        order: true,
        test: true
      },
    });

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    if (orderItem.status !== 'RESULTED') {
      throw new Error('Result must be entered before verification');
    }

    await prisma.labOrderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'VERIFIED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Check if all items are verified
    const order = await prisma.labOrder.findUnique({
      where: { id: orderItem.orderId },
      include: { 
        items: true,
        encounter: {
          include: { patient: true }
        }
      },
    });

    const allVerified = order?.items.every(i => i.status === 'VERIFIED');

    if (allVerified) {
      await prisma.labOrder.update({
        where: { id: orderItem.orderId },
        data: { status: 'COMPLETED' },
      });
      
      // Notify doctor that lab results are verified
      if (order?.encounter?.doctorId && orderItem?.test) {
        await notificationService.notifyLabResultVerified(
          order.encounter.doctorId,
          `${order.encounter.patient.firstName} ${order.encounter.patient.lastName}`,
          orderItem.test.name,
          orderItem.orderId
        );
      }
    }

    return { success: true };
  }

  async batchEnterResults(
    tenantId: string,
    userId: string,
    results: ResultEntryDto[]
  ) {
    const entered = [];
    const errors = [];
    const orderIds = new Set<string>();

    for (const result of results) {
      try {
        const item = await this.enterResult(tenantId, userId, result);
        entered.push(item);
        
        // Track order IDs for status update
        const orderItem = await prisma.labOrderItem.findUnique({
          where: { id: result.orderItemId },
          select: { orderId: true },
        });
        if (orderItem) {
          orderIds.add(orderItem.orderId);
        }
      } catch (error: any) {
        errors.push({ orderItemId: result.orderItemId, error: error.message });
      }
    }

    // Update order status for each affected order
    for (const orderId of orderIds) {
      await this.updateOrderStatus(orderId);
      
      // Auto-generate invoice if all lab results are entered
      try {
        const labOrder = await prisma.labOrder.findUnique({
          where: { id: orderId },
          include: { 
            encounter: {
              include: { patient: true }
            }
          },
        });
        
        if (labOrder?.encounterId) {
          console.log(`[INVOICE_GENERATION] Generating invoice for lab order ${orderId}`);
          const invoice = await invoiceService.generateFromEncounter(
            tenantId,
            '', // branchId not available here, will use primary branch
            userId,
            labOrder.encounterId
          );
          console.log(`[INVOICE_GENERATION] Invoice generated: ${invoice.invoiceNumber}`);
          
          // Notify doctor that lab results are ready
          if (labOrder.encounter?.doctorId) {
            await notificationService.notifyLabResultReady(
              labOrder.encounter.doctorId,
              `${labOrder.encounter.patient?.firstName} ${labOrder.encounter.patient?.lastName}`,
              (labOrder as any).items?.[0]?.test?.name || 'Lab Test',
              orderId
            );
          }
        }
      } catch (error: any) {
        console.warn(`[INVOICE_GENERATION] Failed to generate invoice for lab order ${orderId}:`, error.message);
        // Don't fail the result entry if invoice generation fails
      }
    }

    return { entered: entered.length, errors };
  }

  private async updateOrderStatus(orderId: string) {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    const allResulted = order.items.every(i => 
      i.status === 'RESULTED' || i.status === 'VERIFIED' || i.status === 'COMPLETED'
    );
    const allVerified = order.items.every(i => i.status === 'VERIFIED');
    const anyResulted = order.items.some(i => 
      i.status === 'RESULTED' || i.status === 'VERIFIED' || i.status === 'COMPLETED'
    );

    let newStatus = order.status;
    
    if (allVerified) {
      newStatus = 'COMPLETED';
    } else if (allResulted) {
      newStatus = 'RESULTED';
    } else if (anyResulted) {
      newStatus = 'PROCESSING';
    }

    if (newStatus !== order.status) {
      await prisma.labOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
    }
  }

  async getCriticalAlerts(tenantId: string, unacknowledgedOnly = true) {
    const where: any = { tenantId };
    
    if (unacknowledgedOnly) {
      where.acknowledgedAt = null;
    }

    return prisma.criticalValueAlert.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItem: {
          include: {
            test: true,
            order: true,
          },
        },
        notifiedToUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { notifiedAt: 'desc' },
    });
  }

  async acknowledgeCriticalAlert(alertId: string, userId: string, notes?: string) {
    const alert = await prisma.criticalValueAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.acknowledgedAt) {
      throw new Error('Alert already acknowledged');
    }

    return prisma.criticalValueAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        notes,
      },
    });
  }

  async getPatientLabHistory(patientId: string, limit = 20) {
    return prisma.labOrder.findMany({
      where: { patientId },
      include: {
        items: {
          include: { test: true },
        },
      },
      orderBy: { orderDate: 'desc' },
      take: limit,
    });
  }

  async getOrderResults(orderId: string) {
    return prisma.labOrder.findUnique({
      where: { id: orderId },
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
          include: {
            doctor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        items: {
          include: {
            test: {
              include: {
                parameters: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
            subResults: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async enterPanelResults(
    tenantId: string,
    userId: string,
    orderItemId: string,
    subResults: Array<{
      parameterName: string;
      parameterCode?: string;
      result?: string;
      resultValue?: number;
      unit?: string;
      normalRange?: string;
    }>
  ) {
    const orderItem = await prisma.labOrderItem.findUnique({
      where: { id: orderItemId },
      include: {
        test: { include: { parameters: true } },
        order: { include: { patient: true } },
      },
    });

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    // Delete existing sub-results
    await prisma.labOrderItemResult.deleteMany({
      where: { orderItemId },
    });

    // Create new sub-results
    const createdResults = [];
    let hasAbnormal = false;
    let hasCritical = false;

    for (let i = 0; i < subResults.length; i++) {
      const sr = subResults[i];
      
      // Find matching parameter for reference range
      const param = orderItem.test.parameters.find(
        p => p.code === sr.parameterCode || p.name === sr.parameterName
      );

      // Check if abnormal based on normal range
      let isAbnormal = false;
      let isCritical = false;

      if (sr.resultValue !== undefined && sr.normalRange) {
        const rangeMatch = sr.normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
          const low = parseFloat(rangeMatch[1]);
          const high = parseFloat(rangeMatch[2]);
          if (sr.resultValue < low || sr.resultValue > high) {
            isAbnormal = true;
            hasAbnormal = true;
          }
        }
      }

      const result = await prisma.labOrderItemResult.create({
        data: {
          orderItemId,
          parameterName: sr.parameterName,
          parameterCode: sr.parameterCode,
          result: sr.result,
          resultValue: sr.resultValue,
          unit: sr.unit || param?.unit,
          normalRange: sr.normalRange || param?.normalRange,
          isAbnormal,
          isCritical,
          sortOrder: i,
        },
      });

      createdResults.push(result);
    }

    // Update the order item status
    await prisma.labOrderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'RESULTED',
        isAbnormal: hasAbnormal,
        isCritical: hasCritical,
        performedBy: userId,
        performedAt: new Date(),
      },
    });

    // Update the parent order status
    await this.updateOrderStatus(orderItem.orderId);

    return createdResults;
  }
}

export const resultsService = new ResultsService();
