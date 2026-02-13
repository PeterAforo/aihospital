import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ChevronLeft, Building, MapPin } from 'lucide-react';
import { RootState } from '@/store';
import { updateStep2, nextStep, prevStep } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  officialHospitalName: z.string().min(3),
  hospitalType: z.string().min(1, 'Please select hospital type'),
  numberOfBeds: z.string().min(1, 'Please select number of beds'),
  hospitalLicenseNumber: z.string().min(1, 'License number is required'),
  ghsRegistrationNumber: z.string().optional(),
  hospitalPhone: z.string().regex(/^(\+233|0)[2-5][0-9]{8}$/, 'Invalid phone'),
  hospitalEmail: z.string().email(),
  hospitalWebsite: z.string().optional(),
  streetAddress: z.string().min(5),
  ghanaPostGPS: z.string().optional(),
  region: z.string().min(1, 'Please select region'),
  city: z.string().min(1),
  landmark: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.25rem',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
};

const hospitalTypes = [
  { value: 'general_hospital', label: 'General Hospital' },
  { value: 'maternity_home', label: 'Maternity Home' },
  { value: 'polyclinic', label: 'Polyclinic' },
  { value: 'diagnostic_center', label: 'Diagnostic Center' },
  { value: 'specialist_hospital', label: 'Specialist Hospital' },
  { value: 'dental_clinic', label: 'Dental Clinic' },
  { value: 'eye_clinic', label: 'Eye Clinic' },
  { value: 'other', label: 'Other' },
];

const bedOptions = ['1-10 beds', '11-20 beds', '21-50 beds', '51-100 beds', '101-200 beds', '200+ beds', 'N/A (Outpatient only)'];

const regions = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern',
  'Upper East', 'Upper West', 'Volta', 'Bono', 'Bono East', 'Ahafo',
  'Oti', 'Savannah', 'North East', 'Western North',
];

export default function Step2HospitalDetails() {
  const dispatch = useDispatch();
  const { registrationId, step1, step2 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      officialHospitalName: step2.officialHospitalName || step1.hospitalName || '',
      hospitalType: step2.hospitalType || '',
      numberOfBeds: step2.numberOfBeds || '',
      hospitalLicenseNumber: step2.hospitalLicenseNumber || '',
      ghsRegistrationNumber: step2.ghsRegistrationNumber || '',
      hospitalPhone: step2.hospitalPhone || step1.phone || '',
      hospitalEmail: step2.hospitalEmail || step1.email || '',
      hospitalWebsite: step2.hospitalWebsite || '',
      streetAddress: step2.streetAddress || '',
      ghanaPostGPS: step2.ghanaPostGPS || '',
      region: step2.region || '',
      city: step2.city || '',
      landmark: step2.landmark || '',
    },
  });

  const mutation = useMutation({
    mutationFn: registrationService.saveHospitalDetails,
    onSuccess: () => {
      dispatch(nextStep());
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    dispatch(updateStep2(data));
    mutation.mutate({ ...data, registrationId: registrationId! });
  };

  return (
    <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
          Hospital Details
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Help us verify your institution</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Hospital Information */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building style={{ width: '18px', height: '18px' }} /> Hospital Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Official Hospital Name *</label>
              <input {...register('officialHospitalName')} style={inputStyle} />
              {errors.officialHospitalName && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.officialHospitalName.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Hospital Type *</label>
              <select {...register('hospitalType')} style={inputStyle}>
                <option value="">Select type</option>
                {hospitalTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.hospitalType && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.hospitalType.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Number of Beds *</label>
              <select {...register('numberOfBeds')} style={inputStyle}>
                <option value="">Select</option>
                {bedOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.numberOfBeds && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.numberOfBeds.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Hospital License Number *</label>
              <input {...register('hospitalLicenseNumber')} placeholder="GHS/HF/12345/2024" style={inputStyle} />
              {errors.hospitalLicenseNumber && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.hospitalLicenseNumber.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>GHS Registration Number</label>
              <input {...register('ghsRegistrationNumber')} placeholder="Optional" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Contact Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Hospital Phone *</label>
              <input {...register('hospitalPhone')} style={inputStyle} />
              {errors.hospitalPhone && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.hospitalPhone.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Hospital Email *</label>
              <input {...register('hospitalEmail')} type="email" style={inputStyle} />
              {errors.hospitalEmail && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.hospitalEmail.message}</p>}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Website (Optional)</label>
              <input {...register('hospitalWebsite')} placeholder="https://www.yourhospital.com" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin style={{ width: '18px', height: '18px' }} /> Physical Address
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Street Address *</label>
              <input {...register('streetAddress')} style={inputStyle} />
              {errors.streetAddress && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.streetAddress.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Ghana Post GPS</label>
              <input {...register('ghanaPostGPS')} placeholder="GA-123-4567" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Region *</label>
              <select {...register('region')} style={inputStyle}>
                <option value="">Select region</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.region && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.region.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>City/Town *</label>
              <input {...register('city')} style={inputStyle} />
              {errors.city && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.city.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Landmark</label>
              <input {...register('landmark')} placeholder="Near..." style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button type="button" onClick={() => dispatch(prevStep())} style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ChevronLeft style={{ width: '18px', height: '18px' }} /> Back
          </button>
          <button type="submit" disabled={mutation.isPending} style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: mutation.isPending ? 0.7 : 1,
          }}>
            {mutation.isPending ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : null}
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
