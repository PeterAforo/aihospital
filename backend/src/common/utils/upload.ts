import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
const patientPhotosDir = path.join(uploadsDir, 'patients');
const patientDocumentsDir = path.join(uploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(patientPhotosDir)) {
  fs.mkdirSync(patientPhotosDir, { recursive: true });
}

if (!fs.existsSync(patientDocumentsDir)) {
  fs.mkdirSync(patientDocumentsDir, { recursive: true });
}

// Configure storage for patient photos
const patientPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, patientPhotosDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Patient photo upload middleware
export const uploadPatientPhoto = multer({
  storage: patientPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Configure storage for patient documents
const patientDocumentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, patientDocumentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for documents
const documentFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: PDF, Word, Excel, Images'));
  }
};

// Patient document upload middleware
export const uploadPatientDocument = multer({
  storage: patientDocumentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Get the URL path for a patient photo
export function getPatientPhotoUrl(filename: string): string {
  return `/uploads/patients/${filename}`;
}

// Get the URL path for a patient document
export function getPatientDocumentUrl(filename: string): string {
  return `/uploads/documents/${filename}`;
}

// Delete a patient photo file
export async function deletePatientPhoto(filename: string): Promise<void> {
  const filePath = path.join(patientPhotosDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Delete a patient document file
export async function deletePatientDocument(filename: string): Promise<void> {
  const filePath = path.join(patientDocumentsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
