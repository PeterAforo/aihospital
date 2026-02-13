import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Mail, Phone, Building2, User } from 'lucide-react';
import { RootState } from '@/store';
import { setRegistrationId, updateStep1, nextStep } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^(\+233|0)[2-5][0-9]{8}$/, 'Invalid Ghana phone number'),
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
  userRole: z.string().min(1, 'Please select your role'),
  userRoleOther: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 12px 12px 44px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.5rem',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 24px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

const roles = [
  'Owner/Director',
  'Hospital Administrator',
  'IT Manager',
  'Medical Director',
  'Other',
];

export default function Step1PreQualification() {
  const dispatch = useDispatch();
  const { step1 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();
  const [showOtherRole, setShowOtherRole] = useState(step1.userRole === 'Other');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: step1.fullName || '',
      email: step1.email || '',
      phone: step1.phone || '',
      hospitalName: step1.hospitalName || '',
      userRole: step1.userRole || '',
      userRoleOther: step1.userRoleOther || '',
    },
  });

  const userRole = watch('userRole');

  const mutation = useMutation({
    mutationFn: registrationService.preQualify,
    onSuccess: (response) => {
      dispatch(setRegistrationId(response.data.registrationId));
      dispatch(nextStep());
      if (response.data.resumed) {
        toast({ title: 'Welcome back!', description: 'Your previous progress has been restored.' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    dispatch(updateStep1(data));
    mutation.mutate(data);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
          Get Started with MediCare Ghana
        </h2>
        <p style={{ color: '#6b7280' }}>
          Join hundreds of hospitals transforming healthcare delivery
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Full Name */}
        <div>
          <label style={labelStyle}>Full Name *</label>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input {...register('fullName')} placeholder="e.g., Dr. Kwame Mensah" style={inputStyle} />
          </div>
          {errors.fullName && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email Address *</label>
          <div style={{ position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input {...register('email')} type="email" placeholder="your.email@hospital.com" style={inputStyle} />
          </div>
          {errors.email && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone Number *</label>
          <div style={{ position: 'relative' }}>
            <Phone style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input {...register('phone')} placeholder="+233 XX XXX XXXX" style={inputStyle} />
          </div>
          {errors.phone && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.phone.message}</p>}
        </div>

        {/* Hospital Name */}
        <div>
          <label style={labelStyle}>Hospital Name *</label>
          <div style={{ position: 'relative' }}>
            <Building2 style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input {...register('hospitalName')} placeholder="e.g., Ridge Hospital" style={inputStyle} />
          </div>
          {errors.hospitalName && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.hospitalName.message}</p>}
        </div>

        {/* User Role */}
        <div>
          <label style={labelStyle}>I am *</label>
          <select
            {...register('userRole')}
            onChange={(e) => {
              setShowOtherRole(e.target.value === 'Other');
            }}
            style={{ ...inputStyle, paddingLeft: '12px' }}
          >
            <option value="">Select your role</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.userRole && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.userRole.message}</p>}
        </div>

        {/* Other Role */}
        {(showOtherRole || userRole === 'Other') && (
          <div>
            <label style={labelStyle}>Please specify your role *</label>
            <input {...register('userRoleOther')} placeholder="Your role" style={{ ...inputStyle, paddingLeft: '12px' }} />
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={mutation.isPending} style={{ ...buttonStyle, opacity: mutation.isPending ? 0.7 : 1 }}>
          {mutation.isPending ? (
            <><Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> Processing...</>
          ) : (
            'Continue to Registration'
          )}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
        Estimated time: 30 seconds
      </p>
    </div>
  );
}
