import { PrismaClient } from '@prisma/client';
import { invoiceService } from '../billing/invoice.service';
import { cdsService } from '../emr/cds.service';

const prisma = new PrismaClient();

interface DispenseItemDto {
  prescriptionItemId: string;
  quantityToDispense: number;
  batchNumber?: string;
}

interface DispenseDto {
  prescriptionId: string;
  items: DispenseItemDto[];
  counselingNotes?: string;
}

class DispensingService {
  async getPrescriptionQueue(tenantId: string, branchId?: string, status?: string) {
    const where: any = {
      tenantId,
      status: status || { in: ['PENDING', 'PARTIAL'] },
    };

    const prescriptions = await prisma.prescription.findMany({
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
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        encounter: {
          select: {
            id: true,
            encounterDate: true,
            branchId: true,
          },
        },
        items: {
          include: {
            drug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter by branch if specified
    if (branchId) {
      return prescriptions.filter(p => p.encounter?.branchId === branchId);
    }

    return prescriptions;
  }

  async getPrescriptionDetails(prescriptionId: string) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          include: {
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        encounter: true,
        items: {
          include: {
            drug: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    // Get stock availability for each item
    const itemsWithStock = await Promise.all(
      prescription.items.map(async (item) => {
        const stock = await this.getStockForDrug(
          prescription.tenantId,
          prescription.encounter?.branchId || '',
          item.drugId
        );
        return {
          ...item,
          stockAvailable: stock.totalQuantity,
          batches: stock.batches,
        };
      })
    );

    return {
      ...prescription,
      items: itemsWithStock,
    };
  }

  async getStockForDrug(tenantId: string, branchId: string, drugId: string) {
    const where: any = {
      tenantId,
      drugId,
      quantity: { gt: 0 },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: new Date() } },
      ],
    };
    
    // Only filter by branchId if provided
    if (branchId) {
      where.branchId = branchId;
    }
    
    const stocks = await prisma.pharmacyStock.findMany({
      where,
      orderBy: { expiryDate: 'asc' }, // FEFO - First Expiry First Out
    });

    return {
      totalQuantity: stocks.reduce((sum, s) => sum + s.quantity, 0),
      batches: stocks.map(s => ({
        id: s.id,
        batchNumber: s.batchNumber,
        expiryDate: s.expiryDate,
        quantity: s.quantity,
        sellingPrice: s.sellingPrice,
      })),
    };
  }

  async dispensePrescription(
    tenantId: string,
    branchId: string,
    userId: string,
    data: DispenseDto & { overrideCdsAlerts?: boolean; overrideReason?: string }
  ) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: data.prescriptionId },
      include: {
        items: {
          include: { drug: true },
        },
        encounter: true,
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    if (prescription.status === 'DISPENSED' || prescription.status === 'CANCELLED') {
      throw new Error(`Prescription is already ${prescription.status.toLowerCase()}`);
    }

    // Run CDS safety check at dispensing time
    const cdsResult = await cdsService.validateDispensing(data.prescriptionId, tenantId);

    if (cdsResult.alerts.length > 0) {
      // Log all alerts
      try {
        await cdsService.logAlerts(
          tenantId,
          prescription.patientId,
          cdsResult.alerts,
          'DISPENSING',
          prescription.encounterId,
          data.prescriptionId
        );
      } catch (e) {
        console.warn('[CDS] Failed to log dispensing alerts:', e);
      }

      // Block if critical alerts and no override
      if (!cdsResult.safe && !data.overrideCdsAlerts) {
        return {
          success: false,
          blocked: true,
          reason: 'Dispensing blocked by clinical decision support',
          cdsAlerts: cdsResult.alerts,
          criticalCount: cdsResult.criticalCount,
          warningCount: cdsResult.warningCount,
        };
      }
    }

    const dispensingRecords = [];
    const stockMovements = [];

    for (const dispenseItem of data.items) {
      const prescriptionItem = prescription.items.find(
        i => i.id === dispenseItem.prescriptionItemId
      );

      if (!prescriptionItem) {
        throw new Error(`Prescription item ${dispenseItem.prescriptionItemId} not found`);
      }

      const remainingQty = prescriptionItem.quantity - prescriptionItem.dispensedQty;
      if (dispenseItem.quantityToDispense > remainingQty) {
        throw new Error(
          `Cannot dispense ${dispenseItem.quantityToDispense} of ${prescriptionItem.drug.genericName}. Only ${remainingQty} remaining.`
        );
      }

      // Get stock using FEFO
      const stock = await this.getStockForDrug(tenantId, branchId, prescriptionItem.drugId);
      
      if (stock.totalQuantity < dispenseItem.quantityToDispense) {
        throw new Error(
          `Insufficient stock for ${prescriptionItem.drug.genericName}. Available: ${stock.totalQuantity}`
        );
      }

      // Deduct from stock (FEFO)
      let qtyToDeduct = dispenseItem.quantityToDispense;
      for (const batch of stock.batches) {
        if (qtyToDeduct <= 0) break;

        const deductFromBatch = Math.min(qtyToDeduct, batch.quantity);
        
        // Update stock
        await prisma.pharmacyStock.update({
          where: { id: batch.id },
          data: { quantity: { decrement: deductFromBatch } },
        });

        // Record stock movement
        stockMovements.push({
          tenantId,
          branchId,
          drugId: prescriptionItem.drugId,
          batchNumber: batch.batchNumber,
          movementType: 'DISPENSE',
          quantity: -deductFromBatch,
          balanceBefore: batch.quantity,
          balanceAfter: batch.quantity - deductFromBatch,
          referenceType: 'PRESCRIPTION',
          referenceId: data.prescriptionId,
          performedBy: userId,
        });

        qtyToDeduct -= deductFromBatch;
      }

      // Create dispensing record
      dispensingRecords.push({
        tenantId,
        branchId,
        prescriptionId: data.prescriptionId,
        prescriptionItemId: dispenseItem.prescriptionItemId,
        patientId: prescription.patientId,
        drugId: prescriptionItem.drugId,
        batchNumber: dispenseItem.batchNumber || stock.batches[0]?.batchNumber,
        quantityDispensed: dispenseItem.quantityToDispense,
        dispensedBy: userId,
        counselingNotes: data.counselingNotes,
      });

      // Update prescription item
      await prisma.prescriptionItem.update({
        where: { id: dispenseItem.prescriptionItemId },
        data: {
          dispensedQty: { increment: dispenseItem.quantityToDispense },
          status: prescriptionItem.dispensedQty + dispenseItem.quantityToDispense >= prescriptionItem.quantity
            ? 'DISPENSED'
            : 'PARTIAL',
        },
      });
    }

    // Create dispensing records
    await prisma.dispensingRecord.createMany({ data: dispensingRecords });

    // Create stock movements
    await prisma.stockMovement.createMany({ data: stockMovements });

    // Update prescription status
    const updatedPrescription = await prisma.prescription.findUnique({
      where: { id: data.prescriptionId },
      include: { items: true },
    });

    const allDispensed = updatedPrescription?.items.every(i => i.status === 'DISPENSED');
    const anyDispensed = updatedPrescription?.items.some(i => i.dispensedQty > 0);

    await prisma.prescription.update({
      where: { id: data.prescriptionId },
      data: {
        status: allDispensed ? 'DISPENSED' : anyDispensed ? 'PARTIAL' : 'PENDING',
      },
    });

    // Auto-generate invoice if prescription is fully dispensed and has an encounter
    if (allDispensed && prescription.encounterId) {
      try {
        console.log(`[INVOICE_GENERATION] Generating invoice for prescription ${data.prescriptionId}`);
        const invoice = await invoiceService.generateFromEncounter(
          tenantId,
          branchId,
          userId,
          prescription.encounterId
        );
        console.log(`[INVOICE_GENERATION] Invoice generated: ${invoice.invoiceNumber}`);
      } catch (error: any) {
        console.warn(`[INVOICE_GENERATION] Failed to generate invoice for prescription ${data.prescriptionId}:`, error.message);
        // Don't fail the dispensing if invoice generation fails
      }
    }

    return {
      success: true,
      dispensingRecords: dispensingRecords.length,
      prescriptionStatus: allDispensed ? 'DISPENSED' : 'PARTIAL',
    };
  }

  async getDispensingHistory(
    tenantId: string,
    branchId?: string,
    patientId?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ) {
    const where: any = { tenantId };
    
    if (branchId) where.branchId = branchId;
    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.dispensedAt = {};
      if (startDate) where.dispensedAt.gte = startDate;
      if (endDate) where.dispensedAt.lte = endDate;
    }

    return prisma.dispensingRecord.findMany({
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
        drug: true,
        dispensedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { dispensedAt: 'desc' },
      take: limit,
    });
  }
}

export const dispensingService = new DispensingService();
