export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: ValidationError[];
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ValidationError {
  field?: string;
  message: string;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'RECEPTIONIST'
  | 'BILLING_OFFICER'
  | 'HR_MANAGER'
  | 'ACCOUNTANT'
  | 'PATIENT';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type AppointmentType =
  | 'CONSULTATION'
  | 'FOLLOW_UP'
  | 'PROCEDURE'
  | 'CHECKUP'
  | 'EMERGENCY';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MTN_MOMO'
  | 'VODAFONE_CASH'
  | 'AIRTELTIGO_MONEY'
  | 'BANK_TRANSFER'
  | 'NHIS'
  | 'INSURANCE';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
}

export interface Patient {
  id: string;
  mrn: string;
  ghanaCardNo?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  region?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  branchId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
}
