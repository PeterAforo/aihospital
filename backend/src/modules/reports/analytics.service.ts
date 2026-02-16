import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class AnalyticsService {
  // ==================== EXECUTIVE DASHBOARD ====================

  async getExecutiveSummary(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    const [
      totalPatients, newPatients, prevNewPatients,
      totalAppointments, prevAppointments,
      totalEncounters, prevEncounters,
      totalInvoices, totalRevenue, prevRevenue,
      outstandingAmount,
      activeAdmissions,
    ] = await Promise.all([
      prisma.patient.count({ where: { tenantId, isActive: true } }),
      prisma.patient.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
      prisma.patient.count({ where: { tenantId, createdAt: { gte: prevStart, lte: start } } }),
      prisma.appointment.count({ where: { tenantId, appointmentDate: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { tenantId, appointmentDate: { gte: prevStart, lte: start } } }),
      prisma.encounter.count({ where: { tenantId, visitDate: { gte: start, lte: end } } }),
      prisma.encounter.count({ where: { tenantId, visitDate: { gte: prevStart, lte: start } } }),
      prisma.invoice.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
      prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: start, lte: end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { tenantId, paymentDate: { gte: prevStart, lte: start }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { tenantId, status: { in: ['PENDING', 'PARTIAL'] } }, _sum: { balance: true } }),
      prisma.admission.count({ where: { tenantId, status: 'ADMITTED' } }).catch(() => 0),
    ]);

    const revenue = totalRevenue._sum.amount || 0;
    const prevRevenueAmt = prevRevenue._sum.amount || 0;

    return {
      totalPatients,
      newPatients,
      patientGrowth: prevNewPatients > 0 ? Math.round(((newPatients - prevNewPatients) / prevNewPatients) * 100) : 0,
      totalAppointments,
      appointmentGrowth: prevAppointments > 0 ? Math.round(((totalAppointments - prevAppointments) / prevAppointments) * 100) : 0,
      totalEncounters,
      encounterGrowth: prevEncounters > 0 ? Math.round(((totalEncounters - prevEncounters) / prevEncounters) * 100) : 0,
      totalInvoices,
      revenue,
      revenueGrowth: prevRevenueAmt > 0 ? Math.round(((revenue - prevRevenueAmt) / prevRevenueAmt) * 100) : 0,
      outstandingAmount: outstandingAmount._sum.balance || 0,
      activeAdmissions,
      period: { start, end },
    };
  }

  // ==================== REVENUE ANALYTICS ====================

  async getRevenueAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Revenue by payment method
    const byPaymentMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: { tenantId, paymentDate: { gte: start, lte: end }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Revenue by service category (derive from description keywords)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: { tenantId, createdAt: { gte: start, lte: end }, status: { in: ['PAID', 'PARTIAL'] } },
      },
      select: { description: true, total: true },
    });

    const byCategory: Record<string, number> = {};
    for (const item of invoiceItems) {
      const desc = (item.description || '').toLowerCase();
      let cat = 'OTHER';
      if (desc.includes('lab') || desc.includes('test')) cat = 'LABORATORY';
      else if (desc.includes('consult') || desc.includes('visit')) cat = 'CONSULTATION';
      else if (desc.includes('pharm') || desc.includes('drug') || desc.includes('med')) cat = 'PHARMACY';
      else if (desc.includes('xray') || desc.includes('scan') || desc.includes('imaging')) cat = 'RADIOLOGY';
      else if (desc.includes('bed') || desc.includes('ward') || desc.includes('admission')) cat = 'INPATIENT';
      byCategory[cat] = (byCategory[cat] || 0) + (item.total || 0);
    }

    // Daily revenue trend
    const dailyPayments = await prisma.payment.groupBy({
      by: ['paymentDate'],
      where: { tenantId, paymentDate: { gte: start, lte: end }, status: 'COMPLETED' },
      _sum: { amount: true },
      orderBy: { paymentDate: 'asc' },
    });

    // NHIS vs Cash breakdown (by payment method)
    const nhisPayments = await prisma.payment.aggregate({
      where: { tenantId, paymentDate: { gte: start, lte: end }, status: 'COMPLETED', paymentMethod: 'NHIS' },
      _sum: { amount: true },
    });
    const cashPayments = await prisma.payment.aggregate({
      where: { tenantId, paymentDate: { gte: start, lte: end }, status: 'COMPLETED', paymentMethod: { not: 'NHIS' } },
      _sum: { amount: true },
    });

    return {
      byPaymentMethod: byPaymentMethod.map(p => ({ method: p.paymentMethod, amount: p._sum.amount || 0, count: p._count.id })),
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      dailyTrend: dailyPayments.map(d => ({ date: d.paymentDate, amount: d._sum.amount || 0 })),
      nhisVsCash: {
        nhis: nhisPayments._sum.amount || 0,
        cash: cashPayments._sum.amount || 0,
      },
      period: { start, end },
    };
  }

  // ==================== CLINICAL ANALYTICS ====================

  async getClinicalAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Top diagnoses
    const diagnoses = await prisma.diagnosis.groupBy({
      by: ['icd10Code', 'icd10Description'],
      where: { encounter: { tenantId, visitDate: { gte: start, lte: end } } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });

    // Encounters by type
    const byType = await prisma.encounter.groupBy({
      by: ['encounterType'],
      where: { tenantId, visitDate: { gte: start, lte: end } },
      _count: { id: true },
    });

    // Encounters by status
    const byStatus = await prisma.encounter.groupBy({
      by: ['status'],
      where: { tenantId, visitDate: { gte: start, lte: end } },
      _count: { id: true },
    });

    // Doctor productivity
    const doctorEncounters = await prisma.encounter.groupBy({
      by: ['doctorId'],
      where: { tenantId, visitDate: { gte: start, lte: end }, status: { in: ['COMPLETED', 'SIGNED'] } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const doctorIds = doctorEncounters.map(d => d.doctorId);
    const doctors = await prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const doctorMap = new Map(doctors.map(d => [d.id, `Dr. ${d.firstName} ${d.lastName}`]));

    // Patient demographics
    const genderDist = await prisma.patient.groupBy({
      by: ['gender'],
      where: { tenantId, isActive: true },
      _count: { id: true },
    });

    return {
      topDiagnoses: diagnoses.map(d => ({ icdCode: d.icd10Code, description: d.icd10Description, count: d._count.id })),
      encountersByType: byType.map(t => ({ type: t.encounterType, count: t._count.id })),
      encountersByStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      doctorProductivity: doctorEncounters.map(d => ({ doctorId: d.doctorId, name: doctorMap.get(d.doctorId) || 'Unknown', encounters: d._count.id })),
      genderDistribution: genderDist.map(g => ({ gender: g.gender, count: g._count.id })),
      period: { start, end },
    };
  }

  // ==================== PHARMACY ANALYTICS ====================

  async getPharmacyAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [
      totalDispensed, pendingPrescriptions,
      expiringCount,
    ] = await Promise.all([
      prisma.dispensingRecord.count({ where: { tenantId, dispensedAt: { gte: start, lte: end } } }),
      prisma.prescription.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.pharmacyStock.count({ where: { tenantId, expiryDate: { lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
    ]);

    // Low stock: items where quantity <= reorderLevel
    const lowStockCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM pharmacy_stock WHERE tenant_id = $1 AND quantity <= reorder_level`,
      tenantId
    ).then(r => Number(r[0]?.count || 0)).catch(() => 0);

    // Top dispensed medications (group by drugId, then resolve names)
    const topMedsByDrug = await prisma.dispensingRecord.groupBy({
      by: ['drugId'],
      where: { tenantId, dispensedAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { quantityDispensed: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const drugIds = topMedsByDrug.map(m => m.drugId);
    const drugs = await prisma.drug.findMany({
      where: { id: { in: drugIds } },
      select: { id: true, genericName: true, brandName: true },
    });
    const drugMap = new Map(drugs.map(d => [d.id, d.brandName || d.genericName]));

    return {
      totalDispensed,
      pendingPrescriptions,
      lowStockCount,
      expiringCount,
      topMedications: topMedsByDrug.map(m => ({ name: drugMap.get(m.drugId) || 'Unknown', count: m._count.id, quantity: m._sum.quantityDispensed || 0 })),
      period: { start, end },
    };
  }

  // ==================== LAB ANALYTICS ====================

  async getLabAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [totalOrders, completedOrders, pendingOrders] = await Promise.all([
      prisma.labOrder.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
      prisma.labOrder.count({ where: { tenantId, createdAt: { gte: start, lte: end }, status: { in: ['COMPLETED', 'VERIFIED'] } } }),
      prisma.labOrder.count({ where: { tenantId, status: { in: ['PENDING', 'SAMPLE_COLLECTED', 'PROCESSING'] } } }),
    ]);

    // Top ordered tests (group by testId, then resolve names)
    const topTestsByTestId = await prisma.labOrderItem.groupBy({
      by: ['testId'],
      where: { order: { tenantId, createdAt: { gte: start, lte: end } } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const testIds = topTestsByTestId.map(t => t.testId);
    const tests = await prisma.labTest.findMany({
      where: { id: { in: testIds } },
      select: { id: true, name: true },
    });
    const testMap = new Map(tests.map(t => [t.id, t.name]));

    // Orders by status
    const byStatus = await prisma.labOrder.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _count: { id: true },
    });

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      topTests: topTestsByTestId.map(t => ({ name: testMap.get(t.testId) || 'Unknown', count: t._count.id })),
      ordersByStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      period: { start, end },
    };
  }

  // ==================== APPOINTMENT ANALYTICS ====================

  async getAppointmentAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const byStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: { tenantId, appointmentDate: { gte: start, lte: end } },
      _count: { id: true },
    });

    const byTypeId = await prisma.appointment.groupBy({
      by: ['appointmentTypeId'],
      where: { tenantId, appointmentDate: { gte: start, lte: end } },
      _count: { id: true },
    });

    // Resolve appointment type names
    const typeIds = byTypeId.map(t => t.appointmentTypeId).filter(Boolean) as string[];
    const types = await prisma.appointmentTypeConfig.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true },
    });
    const typeMap = new Map(types.map(t => [t.id, t.name]));

    // Daily appointment volume
    const dailyVolume = await prisma.appointment.groupBy({
      by: ['appointmentDate'],
      where: { tenantId, appointmentDate: { gte: start, lte: end } },
      _count: { id: true },
      orderBy: { appointmentDate: 'asc' },
    });

    const total = byStatus.reduce((acc, s) => acc + s._count.id, 0);
    const completed = byStatus.find(s => s.status === 'COMPLETED')?._count.id || 0;
    const noShow = byStatus.find(s => s.status === 'NO_SHOW')?._count.id || 0;
    const cancelled = byStatus.find(s => s.status === 'CANCELLED')?._count.id || 0;

    return {
      total,
      completed,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      byType: byTypeId.map(t => ({ type: t.appointmentTypeId ? (typeMap.get(t.appointmentTypeId) || 'Unknown') : 'Unspecified', count: t._count.id })),
      dailyVolume: dailyVolume.map(d => ({ date: d.appointmentDate, count: d._count.id })),
      period: { start, end },
    };
  }
}

export const analyticsService = new AnalyticsService();
