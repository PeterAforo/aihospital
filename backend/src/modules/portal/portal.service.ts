import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/utils/prisma.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/middleware/error-handler.js';

export interface PortalTokenPayload {
  patientId: string;
  tenantId: string;
  type: 'patient_portal';
}

class PortalService {
  // ==================== AUTH ====================

  async login(tenantId: string, identifier: string, password: string) {
    // Find patient by phone, email, or MRN
    const patient = await prisma.patient.findFirst({
      where: {
        tenantId,
        portalAccessEnabled: true,
        isActive: true,
        OR: [
          { phonePrimary: identifier },
          { email: identifier },
          { mrn: identifier },
        ],
      },
    });

    if (!patient || !patient.portalPasswordHash) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, patient.portalPasswordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.patient.update({
      where: { id: patient.id },
      data: { portalLastLogin: new Date() },
    });

    const payload: PortalTokenPayload = {
      patientId: patient.id,
      tenantId: patient.tenantId,
      type: 'patient_portal',
    };

    const accessToken = jwt.sign(payload as any, config.jwt.secret, {
      expiresIn: '24h' as any,
    });

    return {
      accessToken,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
        email: patient.email,
        phone: patient.phonePrimary,
        photoUrl: patient.photoUrl,
      },
    };
  }

  async registerPortalAccess(tenantId: string, mrn: string, phone: string, password: string) {
    const patient = await prisma.patient.findFirst({
      where: { tenantId, mrn, phonePrimary: phone, isActive: true },
    });

    if (!patient) {
      throw new AppError('Patient not found. Please verify your MRN and phone number.', 404, 'PATIENT_NOT_FOUND');
    }

    if (patient.portalAccessEnabled) {
      throw new AppError('Portal access already enabled. Please login.', 400, 'ALREADY_REGISTERED');
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.patient.update({
      where: { id: patient.id },
      data: { portalAccessEnabled: true, portalPasswordHash: hash },
    });

    return { success: true, message: 'Portal access enabled. You can now login.' };
  }

  async changePassword(patientId: string, currentPassword: string, newPassword: string) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || !patient.portalPasswordHash) {
      throw new AppError('Patient not found', 404);
    }

    const isValid = await bcrypt.compare(currentPassword, patient.portalPasswordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.patient.update({
      where: { id: patientId },
      data: { portalPasswordHash: hash },
    });

    return { success: true };
  }

  // ==================== PROFILE ====================

  async getProfile(patientId: string) {
    return prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true, tenantId: true, mrn: true, title: true,
        firstName: true, lastName: true, otherNames: true,
        dateOfBirth: true, gender: true, phonePrimary: true,
        phoneSecondary: true, email: true, address: true,
        city: true, region: true, bloodGroup: true,
        photoUrl: true, photoThumbnail: true,
        nhisInfo: true,
        allergies: true,
        chronicConditions: true,
        currentMedications: true,
      },
    });
  }

  async updateProfile(patientId: string, data: any) {
    const allowed = ['phoneSecondary', 'email', 'address', 'city', 'region'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    return prisma.patient.update({ where: { id: patientId }, data: updateData });
  }

  // ==================== APPOINTMENTS ====================

  async getAppointments(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) where.status = status;

    return prisma.appointment.findMany({
      where,
      include: {
        doctor: { select: { firstName: true, lastName: true, departmentId: true } },
        branch: { select: { name: true, address: true } },
      },
      orderBy: { appointmentDate: 'desc' },
      take: 50,
    });
  }

  async getUpcomingAppointments(patientId: string) {
    return prisma.appointment.findMany({
      where: {
        patientId,
        appointmentDate: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        doctor: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true, address: true, phone: true } },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 10,
    });
  }

  // ==================== LAB RESULTS ====================

  async getLabResults(patientId: string) {
    return prisma.labOrder.findMany({
      where: { patientId },
      include: {
        items: {
          include: { test: { select: { name: true, code: true, category: true } } },
        },
      },
      orderBy: { orderDate: 'desc' },
      take: 30,
    });
  }

  // ==================== PRESCRIPTIONS ====================

  async getPrescriptions(patientId: string) {
    return prisma.prescription.findMany({
      where: { patientId },
      include: {
        items: {
          include: { drug: { select: { genericName: true, brandName: true, form: true } } },
        },
        encounter: { select: { doctor: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  // ==================== BILLING ====================

  async getInvoices(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) where.status = status;

    return prisma.invoice.findMany({
      where,
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async getInvoiceDetail(patientId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, patientId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  }

  // ==================== MEDICAL RECORDS ====================

  async getEncounterSummaries(patientId: string) {
    return prisma.encounter.findMany({
      where: { patientId, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
      select: {
        id: true, encounterDate: true, chiefComplaint: true,
        clinicalImpression: true, disposition: true, status: true,
        doctor: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        diagnoses: { where: { status: 'ACTIVE' }, select: { icd10Code: true, icd10Description: true, diagnosisType: true } },
      },
      orderBy: { encounterDate: 'desc' },
      take: 30,
    });
  }

  async getVitalHistory(patientId: string) {
    return prisma.vitalSignsHistory.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: 20,
    });
  }

  // ==================== DASHBOARD ====================

  async getDashboard(patientId: string) {
    const [
      upcomingAppointments,
      pendingInvoices,
      recentLabResults,
      recentPrescriptions,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { patientId, appointmentDate: { gte: new Date() }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
      }),
      prisma.invoice.count({
        where: { patientId, status: { in: ['DRAFT', 'SENT'] } },
      }),
      prisma.labOrder.count({
        where: { patientId, status: 'COMPLETED', orderDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.prescription.count({
        where: { patientId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return { upcomingAppointments, pendingInvoices, recentLabResults, recentPrescriptions };
  }
}

export const portalService = new PortalService();
