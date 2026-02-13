import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patientService } from '@/services/patient.service';
import { useToast } from '@/hooks/use-toast';

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
  'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

const editPatientSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherNames: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phonePrimary: z.string().min(9, 'Phone number is required'),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().optional(),
  region: z.string().optional(),
  ghanaCardNumber: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  religion: z.string().optional(),
});

type EditPatientFormData = z.infer<typeof editPatientSchema>;

interface PatientEditModalProps {
  patient: {
    id: string;
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
    city?: string;
    region?: string;
    ghanaCardNumber?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    occupation?: string;
    religion?: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: '4px',
};

export default function PatientEditModal({ patient, onClose, onSaved }: PatientEditModalProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      title: patient.title || '',
      firstName: patient.firstName,
      lastName: patient.lastName,
      otherNames: patient.otherNames || '',
      dateOfBirth: patient.dateOfBirth.split('T')[0],
      gender: patient.gender as 'MALE' | 'FEMALE' | 'OTHER',
      phonePrimary: patient.phonePrimary,
      phoneSecondary: patient.phoneSecondary || '',
      email: patient.email || '',
      address: patient.address,
      city: patient.city || '',
      region: patient.region || 'Greater Accra',
      ghanaCardNumber: patient.ghanaCardNumber || '',
      bloodGroup: patient.bloodGroup || '',
      maritalStatus: patient.maritalStatus || '',
      occupation: patient.occupation || '',
      religion: patient.religion || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditPatientFormData) => {
      return patientService.update(patient.id, {
        title: data.title,
        firstName: data.firstName,
        lastName: data.lastName,
        otherNames: data.otherNames,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phone: data.phonePrimary,
        phoneSecondary: data.phoneSecondary,
        email: data.email || undefined,
        address: data.address,
        city: data.city,
        region: data.region,
        ghanaCardNumber: data.ghanaCardNumber,
        bloodGroup: data.bloodGroup as any,
        maritalStatus: data.maritalStatus as any,
        occupation: data.occupation,
        religion: data.religion,
      });
    },
    onSuccess: () => {
      onSaved();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update patient',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditPatientFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Edit Patient Information</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-4">
              {/* Title */}
              <div>
                <label style={labelStyle}>Title</label>
                <select {...register('title')} style={inputStyle}>
                  <option value="">-</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>

              {/* First Name */}
              <div>
                <label style={labelStyle}>First Name *</label>
                <input {...register('firstName')} style={inputStyle} />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input {...register('lastName')} style={inputStyle} />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>

              {/* Other Names */}
              <div className="col-span-3">
                <label style={labelStyle}>Other Names</label>
                <input {...register('otherNames')} style={inputStyle} />
              </div>

              {/* Date of Birth */}
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input type="date" {...register('dateOfBirth')} style={inputStyle} />
                {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              {/* Gender */}
              <div>
                <label style={labelStyle}>Gender *</label>
                <select {...register('gender')} style={inputStyle}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Blood Group */}
              <div>
                <label style={labelStyle}>Blood Group</label>
                <select {...register('bloodGroup')} style={inputStyle}>
                  <option value="">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Phone Primary */}
              <div>
                <label style={labelStyle}>Primary Phone *</label>
                <input {...register('phonePrimary')} style={inputStyle} />
                {errors.phonePrimary && <p className="text-xs text-red-600 mt-1">{errors.phonePrimary.message}</p>}
              </div>

              {/* Phone Secondary */}
              <div>
                <label style={labelStyle}>Secondary Phone</label>
                <input {...register('phoneSecondary')} style={inputStyle} />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" {...register('email')} style={inputStyle} />
              </div>

              {/* Address */}
              <div className="col-span-3">
                <label style={labelStyle}>Address *</label>
                <input {...register('address')} style={inputStyle} />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
              </div>

              {/* City */}
              <div>
                <label style={labelStyle}>City</label>
                <input {...register('city')} style={inputStyle} />
              </div>

              {/* Region */}
              <div>
                <label style={labelStyle}>Region</label>
                <select {...register('region')} style={inputStyle}>
                  {GHANA_REGIONS.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Ghana Card */}
              <div>
                <label style={labelStyle}>Ghana Card Number</label>
                <input {...register('ghanaCardNumber')} style={inputStyle} placeholder="GHA-XXXXXXXXX-X" />
              </div>

              {/* Marital Status */}
              <div>
                <label style={labelStyle}>Marital Status</label>
                <select {...register('maritalStatus')} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label style={labelStyle}>Occupation</label>
                <input {...register('occupation')} style={inputStyle} />
              </div>

              {/* Religion */}
              <div>
                <label style={labelStyle}>Religion</label>
                <select {...register('religion')} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Christianity">Christianity</option>
                  <option value="Islam">Islam</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
