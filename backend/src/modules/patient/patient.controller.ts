import { Response, NextFunction } from 'express';
import { PatientService } from './patient.service.js';
import { sendSuccess, sendPaginated, sendError } from '../../common/utils/api-response.js';
import { AuthRequest } from '../../common/middleware/auth.js';
import { searchPatientSchema, checkDuplicateSchema } from './patient.schema.js';
import { getPatientDocumentUrl, deletePatientDocument } from '../../common/utils/upload.js';
import { prisma } from '../../common/utils/prisma.js';

const patientService = new PatientService();

export class PatientController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await patientService.create(req.tenantId!, req.body, req.user?.userId);
      sendSuccess(res, result, 'Patient created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patient = await patientService.getById(req.tenantId!, req.params.id);
      sendSuccess(res, patient);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patient = await patientService.update(req.tenantId!, req.params.id, req.body, req.user?.userId);
      sendSuccess(res, patient, 'Patient updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkDuplicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = checkDuplicateSchema.parse(req.body);
      const result = await patientService.checkDuplicate(req.tenantId!, data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await patientService.delete(req.tenantId!, req.params.id);
      sendSuccess(res, null, 'Patient deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const params = searchPatientSchema.parse(req.query);
      const result = await patientService.search(req.tenantId!, params);
      sendPaginated(res, result.patients, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getVisitHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const visits = await patientService.getVisitHistory(req.tenantId!, req.params.id);
      sendSuccess(res, visits);
    } catch (error) {
      next(error);
    }
  }

  async merge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { secondaryPatientId } = req.body;
      const patient = await patientService.merge(req.tenantId!, req.params.id, secondaryPatientId);
      sendSuccess(res, patient, 'Patients merged successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No photo file provided', 400, undefined, 'NO_FILE');
      }

      const photoUrl = `/uploads/patients/${req.file.filename}`;
      
      // Update patient with photo URL
      const patient = await patientService.updatePhoto(
        req.tenantId!,
        req.params.id,
        photoUrl,
        req.user?.userId
      );

      sendSuccess(res, { photoUrl, patient }, 'Photo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const documents = await prisma.patientDocument.findMany({
        where: {
          patientId: req.params.id,
          patient: { tenantId: req.tenantId },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      const formattedDocs = documents.map((doc: {
        id: string;
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
        fileUrl: string;
        documentType: string;
        uploadedAt: Date;
      }) => ({
        id: doc.id,
        name: doc.fileName,
        type: doc.mimeType,
        size: doc.fileSizeBytes,
        url: doc.fileUrl,
        category: doc.documentType,
        uploadedAt: doc.uploadedAt,
      }));

      sendSuccess(res, formattedDocs);
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No document file provided', 400, undefined, 'NO_FILE');
      }

      const documentUrl = getPatientDocumentUrl(req.file.filename);
      const category = req.body.category || 'other';

      const document = await prisma.patientDocument.create({
        data: {
          patientId: req.params.id,
          documentType: category,
          fileName: req.file.originalname,
          fileUrl: documentUrl,
          mimeType: req.file.mimetype,
          fileSizeBytes: req.file.size,
          uploadedBy: req.user?.userId,
        },
      });

      sendSuccess(res, document, 'Document uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const document = await prisma.patientDocument.findFirst({
        where: {
          id: req.params.documentId,
          patient: { tenantId: req.tenantId },
        },
      });

      if (!document) {
        return sendError(res, 'Document not found', 404, undefined, 'DOCUMENT_NOT_FOUND');
      }

      await deletePatientDocument(document.fileName);
      await prisma.patientDocument.delete({ where: { id: document.id } });

      sendSuccess(res, null, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
