import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ChevronLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { RootState } from '@/store';
import { updateStep3, nextStep, prevStep } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  adminTitle: z.string().min(1, 'Please select title'),
  adminFirstName: z.string().min(2),
  adminLastName: z.string().min(2),
  adminOtherNames: z.string().optional(),
  adminPosition: z.string().min(1, 'Please select position'),
  professionalLicenseNumber: z.string().optional(),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase')
    .regex(/[a-z]/, 'At least one lowercase')
    .regex(/[0-9]/, 'At least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'At least one special character'),
  confirmPassword: z.string(),
  enable2FA: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
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

const titles = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Rev.'];
const positions = ['Hospital Administrator', 'Medical Director', 'Director/Owner', 'IT Manager', 'Operations Manager', 'Other'];

const passwordRules = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[!@#$%^&*(),.?":{}|<>]/, label: 'One special character' },
];

export default function Step3AdminAccount() {
  const dispatch = useDispatch();
  const { registrationId, step1, step3 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      adminTitle: step3.adminTitle || '',
      adminFirstName: step3.adminFirstName || step1.fullName?.split(' ')[0] || '',
      adminLastName: step3.adminLastName || step1.fullName?.split(' ').slice(1).join(' ') || '',
      adminOtherNames: step3.adminOtherNames || '',
      adminPosition: step3.adminPosition || step1.userRole || '',
      professionalLicenseNumber: step3.professionalLicenseNumber || '',
      password: '',
      confirmPassword: '',
      enable2FA: step3.enable2FA ?? true,
    },
  });

  const password = watch('password');
  const adminTitle = watch('adminTitle');

  const mutation = useMutation({
    mutationFn: registrationService.saveAdminAccount,
    onSuccess: () => {
      dispatch(nextStep());
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    dispatch(updateStep3({ ...data, password: data.password }));
    mutation.mutate({ ...data, registrationId: registrationId! });
  };

  return (
    <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
          Create Administrator Account
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>This will be your main admin account with full system access</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <select {...register('adminTitle')} style={inputStyle}>
              <option value="">Select</option>
              {titles.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.adminTitle && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.adminTitle.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>Position *</label>
            <select {...register('adminPosition')} style={inputStyle}>
              <option value="">Select</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.adminPosition && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.adminPosition.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input {...register('adminFirstName')} style={inputStyle} />
            {errors.adminFirstName && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.adminFirstName.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input {...register('adminLastName')} style={inputStyle} />
            {errors.adminLastName && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.adminLastName.message}</p>}
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Other Names</label>
            <input {...register('adminOtherNames')} style={inputStyle} />
          </div>

          {(adminTitle === 'Dr.' || adminTitle === 'Prof.') && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Professional License Number</label>
              <input {...register('professionalLicenseNumber')} placeholder="Medical/Dental Council License" style={inputStyle} />
            </div>
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Email (from Step 1)</label>
            <input value={step1.email || ''} disabled style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Phone (from Step 1)</label>
            <input value={step1.phone || ''} disabled style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
          </div>

          <div>
            <label style={labelStyle}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input {...register('password')} type={showPassword ? 'text' : 'password'} style={inputStyle} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPassword ? <EyeOff style={{ width: '18px', height: '18px', color: '#6b7280' }} /> : <Eye style={{ width: '18px', height: '18px', color: '#6b7280' }} />}
              </button>
            </div>
            {errors.password && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.password.message}</p>}
          </div>
          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} style={inputStyle} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showConfirm ? <EyeOff style={{ width: '18px', height: '18px', color: '#6b7280' }} /> : <Eye style={{ width: '18px', height: '18px', color: '#6b7280' }} />}
              </button>
            </div>
            {errors.confirmPassword && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.confirmPassword.message}</p>}
          </div>

          {/* Password Strength */}
          <div style={{ gridColumn: 'span 2', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Password Requirements:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
              {passwordRules.map((rule) => {
                const passed = rule.regex.test(password || '');
                return (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: passed ? '#16a34a' : '#6b7280' }}>
                    {passed ? <Check style={{ width: '14px', height: '14px' }} /> : <X style={{ width: '14px', height: '14px' }} />}
                    {rule.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('enable2FA')} type="checkbox" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Enable Two-Factor Authentication (Recommended)</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button type="button" onClick={() => dispatch(prevStep())} style={{
            padding: '12px 24px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ChevronLeft style={{ width: '18px', height: '18px' }} /> Back
          </button>
          <button type="submit" disabled={mutation.isPending} style={{
            padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
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
