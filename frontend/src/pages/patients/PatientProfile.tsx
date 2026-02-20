import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, CreditCard, FileText,
  Heart, Clock, AlertTriangle, Edit, Printer,
  Activity, Stethoscope, ClipboardList, Receipt, Shield
} from 'lucide-react';
import { patientService } from '@/services/patient.service';
import { calculateAge, formatPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import PatientPhotoUpload from '@/components/patients/PatientPhotoUpload';
import PatientEditModal from '@/components/patients/PatientEditModal';
import PatientDocuments from '@/components/patients/PatientDocuments';

interface PatientData {
  id: string;
  mrn: string;
  title?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth: string;
  gender: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  address: string;
  ghanaPostGPS?: string;
  city?: string;
  region?: string;
  ghanaCardNumber?: string;
  photoUrl?: string;
  bloodGroup?: string;
  occupation?: string;
  maritalStatus?: string;
  religion?: string;
  preferredLanguage?: string;
  nationality?: string;
  isActive: boolean;
  createdAt: string;
  contacts?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimary: boolean;
  }>;
  nhisInfo?: {
    nhisNumber: string;
    scheme?: string;
    expiryDate?: string;
    status?: string;
    isVerified: boolean;
  };
  allergies?: Array<{
    id: string;
    allergen: string;
    reaction?: string;
    severity?: string;
  }>;
  medicalHistory?: Array<{
    id: string;
    condition: string;
    diagnosedDate?: string;
    status?: string;
    notes?: string;
  }>;
}

function PatientHeader({ patient, onEdit, onPhotoClick }: { patient: PatientData; onEdit: () => void; onPhotoClick: () => void }) {
  const navigate = useNavigate();
  const age = calculateAge(patient.dateOfBirth);

  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Patient Card - ${patient.mrn}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .card { border: 2px solid #2563eb; border-radius: 12px; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
            .avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }
            .name { font-size: 18px; font-weight: bold; color: #1f2937; }
            .mrn { font-family: monospace; color: #2563eb; font-size: 14px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
            .label { color: #6b7280; }
            .value { font-weight: 500; color: #1f2937; }
            .logo { text-align: center; margin-bottom: 16px; font-size: 20px; font-weight: bold; color: #2563eb; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SmartMed</div>
            <div class="header">
              <div class="avatar">${patient.firstName[0]}${patient.lastName[0]}</div>
              <div>
                <div class="name">${patient.title || ''} ${patient.firstName} ${patient.lastName}</div>
                <div class="mrn">${patient.mrn}</div>
              </div>
            </div>
            <div class="info">
              <div><span class="label">DOB:</span></div>
              <div class="value">${new Date(patient.dateOfBirth).toLocaleDateString()}</div>
              <div><span class="label">Gender:</span></div>
              <div class="value">${patient.gender}</div>
              <div><span class="label">Blood Group:</span></div>
              <div class="value">${patient.bloodGroup || 'Unknown'}</div>
              <div><span class="label">Phone:</span></div>
              <div class="value">${patient.phonePrimary}</div>
              <div><span class="label">NHIS:</span></div>
              <div class="value">${patient.nhisInfo?.nhisNumber || 'N/A'}</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleBookAppointment = () => {
    navigate(`/appointments/new?patientId=${patient.id}&patientName=${encodeURIComponent(`${patient.firstName} ${patient.lastName}`)}`);
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>

        <div className="flex items-start gap-6">
          {/* Photo - clickable to upload */}
          <button
            onClick={onPhotoClick}
            className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity cursor-pointer relative group"
            title="Click to change photo"
          >
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {patient.firstName[0]}{patient.lastName[0]}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Edit className="w-6 h-6 text-white" />
            </div>
          </button>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.title} {patient.firstName} {patient.otherNames} {patient.lastName}
              </h1>
              {patient.isActive ? (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
              ) : (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="font-mono text-blue-600 font-medium">{patient.mrn}</span>
              <span>•</span>
              <span>{age} years old</span>
              <span>•</span>
              <span>{patient.gender}</span>
              {patient.bloodGroup && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    {patient.bloodGroup}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {formatPhone(patient.phonePrimary)}
              </span>
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {patient.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {patient.city}, {patient.region}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintCard}>
              <Printer className="w-4 h-4 mr-2" />
              Print Card
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button size="sm" onClick={handleBookAppointment}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <QuickStat
            icon={<Stethoscope className="w-5 h-5 text-blue-500" />}
            label="Last Visit"
            value="15 Jan 2024"
          />
          <QuickStat
            icon={<ClipboardList className="w-5 h-5 text-green-500" />}
            label="Total Visits"
            value="12"
          />
          <QuickStat
            icon={<Receipt className="w-5 h-5 text-orange-500" />}
            label="Outstanding"
            value="GH₵ 0.00"
          />
          <QuickStat
            icon={<Shield className="w-5 h-5 text-purple-500" />}
            label="NHIS Status"
            value={patient.nhisInfo?.isVerified ? 'Verified' : 'Not Verified'}
            badge={patient.nhisInfo?.nhisNumber ? 'Active' : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{value}</p>
          {badge && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">{badge}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ patient }: { patient: PatientData }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Personal Information */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-blue-500" />
          Personal Information
        </h3>
        <dl className="space-y-3 text-sm">
          <InfoRow label="Full Name" value={`${patient.title || ''} ${patient.firstName} ${patient.otherNames || ''} ${patient.lastName}`} />
          <InfoRow label="Date of Birth" value={new Date(patient.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          <InfoRow label="Gender" value={patient.gender} />
          <InfoRow label="Marital Status" value={patient.maritalStatus || 'Not specified'} />
          <InfoRow label="Occupation" value={patient.occupation || 'Not specified'} />
          <InfoRow label="Religion" value={patient.religion || 'Not specified'} />
          <InfoRow label="Nationality" value={patient.nationality || 'Ghanaian'} />
          <InfoRow label="Preferred Language" value={patient.preferredLanguage || 'English'} />
        </dl>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-green-500" />
          Contact Information
        </h3>
        <dl className="space-y-3 text-sm">
          <InfoRow label="Primary Phone" value={formatPhone(patient.phonePrimary)} />
          <InfoRow label="Secondary Phone" value={patient.phoneSecondary ? formatPhone(patient.phoneSecondary) : 'Not provided'} />
          <InfoRow label="Email" value={patient.email || 'Not provided'} />
          <InfoRow label="Address" value={patient.address} />
          <InfoRow label="City" value={patient.city || 'Not specified'} />
          <InfoRow label="Region" value={patient.region || 'Not specified'} />
          <InfoRow label="Ghana Post GPS" value={patient.ghanaPostGPS || 'Not provided'} />
        </dl>
      </div>

      {/* Identification & Insurance */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-purple-500" />
            Identification
          </h3>
          <dl className="space-y-3 text-sm">
            <InfoRow label="MRN" value={patient.mrn} highlight />
            <InfoRow label="Ghana Card" value={patient.ghanaCardNumber || 'Not provided'} />
          </dl>
        </div>

        {patient.nhisInfo && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-blue-500" />
              NHIS Information
            </h3>
            <dl className="space-y-3 text-sm">
              <InfoRow label="NHIS Number" value={patient.nhisInfo.nhisNumber} />
              <InfoRow label="Scheme" value={patient.nhisInfo.scheme || 'Standard'} />
              <InfoRow label="Expiry Date" value={patient.nhisInfo.expiryDate ? new Date(patient.nhisInfo.expiryDate).toLocaleDateString() : 'Not specified'} />
              <InfoRow 
                label="Status" 
                value={patient.nhisInfo.isVerified ? 'Verified' : 'Pending Verification'}
                badge={patient.nhisInfo.isVerified ? 'success' : 'warning'}
              />
            </dl>
          </div>
        )}

        {/* Emergency Contact */}
        {patient.contacts && patient.contacts.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Emergency Contact
            </h3>
            {patient.contacts.filter(c => c.isPrimary).map(contact => (
              <dl key={contact.id} className="space-y-3 text-sm">
                <InfoRow label="Name" value={contact.name} />
                <InfoRow label="Relationship" value={contact.relationship} />
                <InfoRow label="Phone" value={formatPhone(contact.phone)} />
                {contact.email && <InfoRow label="Email" value={contact.email} />}
              </dl>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight, badge }: { label: string; value: string; highlight?: boolean; badge?: 'success' | 'warning' | 'error' }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-medium ${highlight ? 'text-blue-600 font-mono' : 'text-gray-900'}`}>
        {badge ? (
          <span className={`px-2 py-0.5 rounded text-xs ${
            badge === 'success' ? 'bg-green-100 text-green-700' :
            badge === 'warning' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {value}
          </span>
        ) : value}
      </dd>
    </div>
  );
}

function MedicalTab({ patient }: { patient: PatientData }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Allergies */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Allergies
          {patient.allergies && patient.allergies.length > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
              {patient.allergies.length} recorded
            </span>
          )}
        </h3>
        {patient.allergies && patient.allergies.length > 0 ? (
          <div className="space-y-3">
            {patient.allergies.map(allergy => (
              <div key={allergy.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">{allergy.allergen}</span>
                  {allergy.severity && (
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      allergy.severity === 'Life-threatening' ? 'bg-red-200 text-red-800' :
                      allergy.severity === 'Severe' ? 'bg-orange-200 text-orange-800' :
                      'bg-yellow-200 text-yellow-800'
                    }`}>
                      {allergy.severity}
                    </span>
                  )}
                </div>
                {allergy.reaction && (
                  <p className="text-sm text-red-600 mt-1">Reaction: {allergy.reaction}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No known allergies recorded</p>
        )}
      </div>

      {/* Medical History */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-blue-500" />
          Medical History
        </h3>
        {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
          <div className="space-y-3">
            {patient.medicalHistory.map(history => (
              <div key={history.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{history.condition}</span>
                  {history.status && (
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      history.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                      history.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {history.status}
                    </span>
                  )}
                </div>
                {history.diagnosedDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Diagnosed: {new Date(history.diagnosedDate).toLocaleDateString()}
                  </p>
                )}
                {history.notes && (
                  <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No medical history recorded</p>
        )}
      </div>
    </div>
  );
}

function VisitsTab({ patientId }: { patientId: string }) {
  const { data: visits, isLoading } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => patientService.getVisitHistory(patientId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const visitList = visits?.data || [];

  return (
    <div className="bg-white rounded-xl border">
      {visitList.length > 0 ? (
        <div className="divide-y">
          {visitList.map((visit: any) => (
            <div key={visit.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{visit.type || 'General Consultation'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(visit.visitDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Dr. {visit.doctor?.firstName} {visit.doctor?.lastName}
                  </p>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    visit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    visit.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {visit.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No visit history found</p>
        </div>
      )}
    </div>
  );
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getById(id!),
    enabled: !!id,
  });

  const handlePhotoUploaded = () => {
    queryClient.invalidateQueries({ queryKey: ['patient', id] });
    setShowPhotoUpload(false);
    toast({ title: 'Success', description: 'Photo updated successfully' });
  };

  const handlePatientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['patient', id] });
    setShowEditModal(false);
    toast({ title: 'Success', description: 'Patient information updated' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Patient Not Found</h2>
        <p className="text-gray-500 mt-2">The patient you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const patient: PatientData = data.data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50"
    >
      <PatientHeader 
        patient={patient} 
        onEdit={() => setShowEditModal(true)}
        onPhotoClick={() => setShowPhotoUpload(true)}
      />

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <PatientPhotoUpload
          patientId={patient.id}
          currentPhotoUrl={patient.photoUrl}
          onClose={() => setShowPhotoUpload(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <PatientEditModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
          onSaved={handlePatientUpdated}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab patient={patient} />
          </TabsContent>

          <TabsContent value="medical">
            <MedicalTab patient={patient} />
          </TabsContent>

          <TabsContent value="visits">
            <VisitsTab patientId={patient.id} />
          </TabsContent>

          <TabsContent value="billing">
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Billing history coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <PatientDocuments patientId={patient.id} />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
