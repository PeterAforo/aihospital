import bcrypt from 'bcryptjs';
import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { CreatePatientInput, UpdatePatientInput, SearchPatientInput } from './patient.schema.js';
import { duplicateDetectionService } from '../../common/services/duplicate-detection.service.js';
import { normalizeGhanaPhone, generateMRN, detectSearchType } from '../../common/utils/patient-validators.js';

export class PatientService {
  async create(tenantId: string, data: CreatePatientInput, userId?: string) {
    const normalizedPhone = normalizeGhanaPhone(data.phone);
    
    // Run duplicate detection
    const duplicateCheck = await duplicateDetectionService.checkForDuplicates(tenantId, {
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames,
      dateOfBirth: data.dateOfBirth,
      phone: normalizedPhone,
      ghanaCardNumber: data.ghanaCardNumber || undefined,
      city: data.city,
      region: data.region,
    });

    if (duplicateCheck.verdict === 'definite') {
      throw new AppError(
        'Patient with this Ghana Card already exists',
        409,
        'DUPLICATE_PATIENT'
      );
    }

    // Generate MRN
    const mrn = await this.generateMRN(tenantId);

    // Create patient with related records
    const patient = await prisma.patient.create({
      data: {
        tenantId,
        mrn,
        title: data.title,
        firstName: data.firstName,
        lastName: data.lastName,
        otherNames: data.otherNames,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        phonePrimary: normalizedPhone,
        phoneSecondary: data.phoneSecondary ? normalizeGhanaPhone(data.phoneSecondary) : undefined,
        email: data.email,
        address: data.address,
        ghanaPostGPS: data.ghanaPostGPS,
        city: data.city,
        region: data.region,
        ghanaCardNumber: data.ghanaCardNumber?.toUpperCase(),
        bloodGroup: data.bloodGroup,
        occupation: data.occupation,
        maritalStatus: data.maritalStatus,
        religion: data.religion,
        preferredLanguage: data.preferredLanguage || 'English',
        nationality: data.nationality || 'Ghanaian',
        registrationSource: data.registrationSource || 'walk-in',
        createdBy: userId,

        // Portal access
        ...(data.portalAccessEnabled && {
          portalAccessEnabled: true,
          ...(data.portalPassword && {
            portalPasswordHash: await bcrypt.hash(data.portalPassword, 12),
          }),
        }),

        // Create emergency contact if provided
        ...(data.emergencyContact && {
          contacts: {
            create: {
              name: data.emergencyContact.name,
              relationship: data.emergencyContact.relationship,
              phone: normalizeGhanaPhone(data.emergencyContact.phone),
              email: data.emergencyContact.email,
              address: data.emergencyContact.address,
              isPrimary: true,
            },
          },
        }),

        // Create NHIS info if provided
        ...(data.nhisInfo && {
          nhisInfo: {
            create: {
              nhisNumber: data.nhisInfo.nhisNumber,
              scheme: data.nhisInfo.scheme,
              expiryDate: data.nhisInfo.expiryDate ? new Date(data.nhisInfo.expiryDate) : undefined,
            },
          },
        }),

        // Create allergies if provided
        ...(data.allergies && data.allergies.length > 0 && {
          allergies: {
            create: data.allergies.map((allergy) => ({
              allergen: allergy.allergen,
              reaction: allergy.reaction,
              severity: allergy.severity,
            })),
          },
        }),

        // Create medical history if provided
        ...(data.medicalHistory && data.medicalHistory.length > 0 && {
          medicalHistory: {
            create: data.medicalHistory.map((history) => ({
              condition: history.condition,
              diagnosedDate: history.diagnosedDate ? new Date(history.diagnosedDate) : undefined,
              status: history.status,
              notes: history.notes,
            })),
          },
        }),
      },
      include: {
        contacts: true,
        nhisInfo: true,
        allergies: true,
        medicalHistory: true,
      },
    });

    // Create audit log
    await this.createAuditLog(patient.id, 'CREATE', null, patient, userId);

    return { patient, mrn, duplicateWarning: duplicateCheck.verdict !== 'unique' ? duplicateCheck : null };
  }

  async getById(tenantId: string, id: string) {
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        contacts: true,
        nhisInfo: true,
        allergies: true,
        medicalHistory: true,
        relatives: true,
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    return patient;
  }

  async update(tenantId: string, id: string, data: UpdatePatientInput, userId?: string) {
    const existingPatient = await this.getById(tenantId, id);

    // Check for duplicate Ghana Card if updating
    if (data.ghanaCardNumber) {
      const existing = await prisma.patient.findFirst({
        where: {
          tenantId,
          ghanaCardNumber: data.ghanaCardNumber.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new AppError('Another patient with this Ghana Card already exists', 409, 'DUPLICATE_GHANA_CARD');
      }
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.otherNames !== undefined && { otherNames: data.otherNames }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.gender && { gender: data.gender }),
        ...(data.phone && { phonePrimary: normalizeGhanaPhone(data.phone) }),
        ...(data.phoneSecondary !== undefined && { phoneSecondary: data.phoneSecondary ? normalizeGhanaPhone(data.phoneSecondary) : null }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address && { address: data.address }),
        ...(data.ghanaPostGPS !== undefined && { ghanaPostGPS: data.ghanaPostGPS }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.region !== undefined && { region: data.region }),
        ...(data.ghanaCardNumber !== undefined && { ghanaCardNumber: data.ghanaCardNumber?.toUpperCase() }),
        ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.maritalStatus !== undefined && { maritalStatus: data.maritalStatus }),
        ...(data.religion !== undefined && { religion: data.religion }),
        ...(data.preferredLanguage !== undefined && { preferredLanguage: data.preferredLanguage }),
        // Portal access
        ...(data.portalAccessEnabled !== undefined && { portalAccessEnabled: data.portalAccessEnabled }),
        ...(data.portalPassword && {
          portalPasswordHash: await bcrypt.hash(data.portalPassword, 12),
          portalAccessEnabled: true,
        }),
      },
      include: {
        contacts: true,
        nhisInfo: true,
        allergies: true,
        medicalHistory: true,
      },
    });

    // Create audit log
    await this.createAuditLog(patient.id, 'UPDATE', existingPatient, patient, userId);

    return patient;
  }

  async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async search(tenantId: string, params: SearchPatientInput) {
    const { q, type, ghanaCardNumber, phone, mrn, nhisNumber, gender, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      isActive: true,
      isMerged: false,
    };

    // Auto-detect search type if not specified
    const searchType = type || (q ? detectSearchType(q) : 'name');

    // Search by specific fields based on type
    if (ghanaCardNumber) {
      where.ghanaCardNumber = ghanaCardNumber.toUpperCase();
    } else if (phone) {
      const normalizedPhone = normalizeGhanaPhone(phone);
      where.OR = [
        { phonePrimary: normalizedPhone },
        { phoneSecondary: normalizedPhone },
        { phonePrimary: { contains: phone } },
      ];
    } else if (mrn) {
      where.mrn = mrn.toUpperCase();
    } else if (nhisNumber) {
      where.nhisInfo = { nhisNumber };
    } else if (q) {
      // Smart search based on detected type
      switch (searchType) {
        case 'mrn':
          where.mrn = q.toUpperCase();
          break;
        case 'ghana_card':
          where.ghanaCardNumber = q.toUpperCase();
          break;
        case 'phone':
          const normalized = normalizeGhanaPhone(q);
          where.OR = [
            { phonePrimary: normalized },
            { phoneSecondary: normalized },
            { phonePrimary: { contains: q } },
          ];
          break;
        case 'nhis':
          where.nhisInfo = { nhisNumber: { contains: q, mode: 'insensitive' } };
          break;
        default:
          where.OR = [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { otherNames: { contains: q, mode: 'insensitive' } },
            { mrn: { contains: q, mode: 'insensitive' } },
          ];
      }
    }

    if (gender) {
      where.gender = gender;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          nhisInfo: {
            select: {
              nhisNumber: true,
              expiryDate: true,
              isVerified: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      patients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVisitHistory(tenantId: string, patientId: string) {
    await this.getById(tenantId, patientId);

    const encounters = await prisma.encounter.findMany({
      where: {
        patientId,
        tenantId,
      },
      orderBy: { visitDate: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        diagnoses: true,
        vitalSigns: true,
      },
    });

    return encounters;
  }

  async merge(tenantId: string, primaryId: string, secondaryId: string) {
    // Verify both patients exist
    const primary = await this.getById(tenantId, primaryId);
    const secondary = await this.getById(tenantId, secondaryId);

    // Move all related records from secondary to primary
    await prisma.$transaction([
      // Update appointments
      prisma.appointment.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      }),
      // Update encounters
      prisma.encounter.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      }),
      // Update prescriptions
      prisma.prescription.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      }),
      // Update lab orders
      prisma.labOrder.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      }),
      // Update invoices
      prisma.invoice.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      }),
      // Deactivate secondary patient
      prisma.patient.update({
        where: { id: secondaryId },
        data: { isActive: false },
      }),
    ]);

    return this.getById(tenantId, primaryId);
  }

  private async generateMRN(tenantId: string): Promise<string> {
    // Get tenant info for hospital code
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const hospitalCode = tenant?.subdomain?.substring(0, 3).toUpperCase() || 'MRN';
    
    const year = new Date().getFullYear();
    const count = await prisma.patient.count({ 
      where: { 
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    const sequence = (count + 1).toString().padStart(5, '0');
    return `${hospitalCode}-${year}-${sequence}`;
  }

  private async createAuditLog(
    patientId: string,
    action: string,
    oldData: any,
    newData: any,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.patientAuditLog.create({
        data: {
          patientId,
          action,
          oldValues: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
          newValues: newData ? JSON.parse(JSON.stringify(newData)) : null,
          changedBy: userId,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to create audit log:', error);
    }
  }

  async checkDuplicate(tenantId: string, data: { firstName: string; lastName: string; dateOfBirth: string; phone: string; ghanaCardNumber?: string }) {
    return duplicateDetectionService.checkForDuplicates(tenantId, {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      phone: normalizeGhanaPhone(data.phone),
      ghanaCardNumber: data.ghanaCardNumber,
    });
  }

  async updatePhoto(tenantId: string, patientId: string, photoUrl: string, userId?: string) {
    const existingPatient = await this.getById(tenantId, patientId);

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        photoUrl,
        photoThumbnail: photoUrl, // TODO: Generate actual thumbnail
      },
    });

    await this.createAuditLog(patientId, 'PHOTO_UPDATE', { photoUrl: existingPatient.photoUrl }, { photoUrl }, userId);

    return patient;
  }
}
