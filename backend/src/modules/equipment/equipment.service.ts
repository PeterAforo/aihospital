import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class EquipmentService {
  async getEquipment(tenantId: string, filters?: {
    status?: string; category?: string; search?: string;
    page?: number; limit?: number;
  }) {
    const where: any = { tenantId, isActive: true };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { assetTag: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 30;

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: { maintenanceLogs: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, completedDate: true, nextDueDate: true, type: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    return { equipment, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEquipmentById(id: string) {
    return prisma.equipment.findUnique({
      where: { id },
      include: { maintenanceLogs: { orderBy: { scheduledDate: 'desc' } } },
    });
  }

  async createEquipment(tenantId: string, data: any) {
    return prisma.equipment.create({
      data: {
        tenantId, branchId: data.branchId, name: data.name,
        assetTag: data.assetTag, serialNumber: data.serialNumber,
        manufacturer: data.manufacturer, model: data.model,
        category: data.category, department: data.department,
        location: data.location, status: data.status || 'OPERATIONAL',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchasePrice: data.purchasePrice, warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        expectedLifeYears: data.expectedLifeYears, depreciationRate: data.depreciationRate,
        currentValue: data.currentValue, supplier: data.supplier, notes: data.notes,
      },
    });
  }

  async updateEquipment(id: string, data: any) {
    return prisma.equipment.update({ where: { id }, data });
  }

  async createMaintenanceLog(equipmentId: string, tenantId: string, data: any) {
    return prisma.maintenanceLog.create({
      data: {
        equipmentId, tenantId, type: data.type, description: data.description,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
        performedBy: data.performedBy, vendor: data.vendor, cost: data.cost,
        partsUsed: data.partsUsed, status: data.status || 'SCHEDULED',
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
        findings: data.findings, notes: data.notes,
      },
    });
  }

  async updateMaintenanceLog(id: string, data: any) {
    return prisma.maintenanceLog.update({ where: { id }, data });
  }

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, operational, underMaintenance, outOfService, maintenanceDue, warrantyExpiring] = await Promise.all([
      prisma.equipment.count({ where: { tenantId, isActive: true } }),
      prisma.equipment.count({ where: { tenantId, isActive: true, status: 'OPERATIONAL' } }),
      prisma.equipment.count({ where: { tenantId, isActive: true, status: 'UNDER_MAINTENANCE' } }),
      prisma.equipment.count({ where: { tenantId, isActive: true, status: 'OUT_OF_SERVICE' } }),
      prisma.maintenanceLog.count({ where: { tenantId, status: 'SCHEDULED', scheduledDate: { lte: thirtyDays } } }),
      prisma.equipment.count({ where: { tenantId, isActive: true, warrantyExpiry: { gte: now, lte: thirtyDays } } }),
    ]);

    return { total, operational, underMaintenance, outOfService, maintenanceDue, warrantyExpiring };
  }
}

export const equipmentService = new EquipmentService();
