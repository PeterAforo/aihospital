import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ChevronLeft } from 'lucide-react';
import { RootState } from '@/store';
import { updateStep5, nextStep, prevStep, setVerificationPhone } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  primaryLanguage: z.string(),
  dateFormat: z.string(),
  applyVAT: z.boolean(),
  applyNHIL: z.boolean(),
  applyGETFund: z.boolean(),
  branchName: z.string().min(3),
  sameAsHospitalAddress: z.boolean(),
  branchAddress: z.string().optional(),
  referralSource: z.string().optional(),
  specificNeeds: z.string().optional(),
  agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the Terms of Service' }) }),
  agreeToDataProcessing: z.literal(true, { errorMap: () => ({ message: 'You must consent to data processing' }) }),
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

const languages = [
  { value: 'english', label: 'English' },
  { value: 'twi', label: 'Twi' },
  { value: 'ga', label: 'Ga' },
  { value: 'ewe', label: 'Ewe' },
];

const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const referralSources = [
  'Google Search', 'Social Media', 'Referral from another hospital',
  'Healthcare conference', 'Industry publication', 'Sales representative', 'Other',
];

export default function Step5SetupPreferences() {
  const dispatch = useDispatch();
  const { registrationId, step1, step2, step5 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryLanguage: step5.primaryLanguage || 'english',
      dateFormat: step5.dateFormat || 'DD/MM/YYYY',
      applyVAT: step5.applyVAT ?? true,
      applyNHIL: step5.applyNHIL ?? true,
      applyGETFund: step5.applyGETFund ?? true,
      branchName: step5.branchName || `${step2.officialHospitalName || step1.hospitalName} - Main Branch`,
      sameAsHospitalAddress: step5.sameAsHospitalAddress ?? true,
      branchAddress: step5.branchAddress || '',
      referralSource: step5.referralSource || '',
      specificNeeds: step5.specificNeeds || '',
      agreeToTerms: step5.agreeToTerms as true || undefined,
      agreeToDataProcessing: step5.agreeToDataProcessing as true || undefined,
    },
  });

  const sameAsHospitalAddress = watch('sameAsHospitalAddress');

  const mutation = useMutation({
    mutationFn: registrationService.complete,
    onSuccess: (response) => {
      dispatch(setVerificationPhone(response.data.phone));
      dispatch(nextStep());
      toast({ title: 'Success', description: 'Verification code sent to your phone!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to complete registration', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    dispatch(updateStep5(data));
    mutation.mutate({ ...data, registrationId: registrationId! } as any);
  };

  return (
    <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
          Setup Preferences
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>A few quick settings to personalize your experience</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Business Configuration */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Business Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Primary Language</label>
              <select {...register('primaryLanguage')} style={inputStyle}>
                {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date Format</label>
              <select {...register('dateFormat')} style={inputStyle}>
                {dateFormats.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Financial Settings</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('applyVAT')} type="checkbox" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>Apply VAT (12.5%)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('applyNHIL')} type="checkbox" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>Apply NHIL (2.5%)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('applyGETFund')} type="checkbox" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>Apply GETFund (2.5%)</span>
            </label>
          </div>
        </div>

        {/* Branch Setup */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>First Branch Setup</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Branch Name *</label>
              <input {...register('branchName')} style={inputStyle} />
              {errors.branchName && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{errors.branchName.message}</p>}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('sameAsHospitalAddress')} type="checkbox" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>Same as hospital address</span>
            </label>
            {!sameAsHospitalAddress && (
              <div>
                <label style={labelStyle}>Branch Address *</label>
                <input {...register('branchAddress')} style={inputStyle} />
              </div>
            )}
          </div>
        </div>

        {/* Optional */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Optional Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>How did you hear about us?</label>
              <select {...register('referralSource')} style={inputStyle}>
                <option value="">Select</option>
                {referralSources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Any specific requirements?</label>
              <textarea {...register('specificNeeds')} rows={3} placeholder="Tell us about your specific needs..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Legal */}
        <div style={{ marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('agreeToTerms')} type="checkbox" style={{ width: '18px', height: '18px', marginTop: '2px' }} />
              <span style={{ fontSize: '0.875rem' }}>
                I agree to the <a href="/terms" target="_blank" style={{ color: '#2563eb' }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: '#2563eb' }}>Privacy Policy</a> *
              </span>
            </label>
            {errors.agreeToTerms && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginLeft: '26px' }}>{errors.agreeToTerms.message}</p>}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input {...register('agreeToDataProcessing')} type="checkbox" style={{ width: '18px', height: '18px', marginTop: '2px' }} />
              <span style={{ fontSize: '0.875rem' }}>
                I consent to the processing of my data (Ghana Data Protection Act, 2012) *
              </span>
            </label>
            {errors.agreeToDataProcessing && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginLeft: '26px' }}>{errors.agreeToDataProcessing.message}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => dispatch(prevStep())} style={{
            padding: '12px 24px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ChevronLeft style={{ width: '18px', height: '18px' }} /> Back
          </button>
          <button type="submit" disabled={mutation.isPending} style={{
            padding: '12px 24px', backgroundColor: '#16a34a', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            opacity: mutation.isPending ? 0.7 : 1,
          }}>
            {mutation.isPending ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : null}
            Create My Account
          </button>
        </div>
      </form>
    </div>
  );
}
