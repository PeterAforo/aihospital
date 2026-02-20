import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Phone, Mail, RefreshCw, ChevronLeft } from 'lucide-react';
import { RootState } from '@/store';
import { nextStep, prevStep, resetRegistration } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

type VerificationMethod = 'phone' | 'email';

export default function Step6Verification() {
  const dispatch = useDispatch();
  const { registrationId, step1 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();
  
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (codeSent) {
      inputRefs.current[0]?.focus();
    }
  }, [codeSent]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCodeMutation = useMutation({
    mutationFn: registrationService.sendCode,
    onSuccess: (response) => {
      setCodeSent(true);
      setCountdown(60);
      toast({ title: 'Code Sent', description: response.message || `Verification code sent to your ${method}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to send code', variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: registrationService.verifyCode,
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Your account has been verified.' });
      dispatch(resetRegistration());
      localStorage.removeItem('smartmed_registration_draft');
      dispatch(nextStep());
    },
    onError: (error: any) => {
      setAttempts((prev) => prev + 1);
      toast({ title: 'Error', description: error.response?.data?.message || 'Invalid code', variant: 'destructive' });
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => registrationService.resendCode(registrationId!, method!),
    onSuccess: () => {
      setCountdown(60);
      toast({ title: 'Code Sent', description: 'A new verification code has been sent.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to resend', variant: 'destructive' });
    },
  });

  const handleSelectMethod = (selectedMethod: VerificationMethod) => {
    setMethod(selectedMethod);
    sendCodeMutation.mutate({ registrationId: registrationId!, method: selectedMethod });
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== '') && newCode.join('').length === 6) {
      verifyMutation.mutate({ registrationId: registrationId!, code: newCode.join(''), method: method! });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyMutation.mutate({ registrationId: registrationId!, code: pasted, method: method! });
    }
  };

  const handleResend = () => {
    if (countdown === 0 && method) {
      resendMutation.mutate();
    }
  };

  const handleChangeMethod = () => {
    setCodeSent(false);
    setMethod(null);
    setCode(['', '', '', '', '', '']);
    setCountdown(0);
  };

  const getMaskedDestination = () => {
    if (method === 'phone') {
      return `****${step1.phone?.slice(-4) || '****'}`;
    }
    const email = step1.email || '';
    const [local, domain] = email.split('@');
    return `${local.slice(0, 3)}***@${domain || '***'}`;
  };

  // Method Selection Screen
  if (!codeSent) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
          Verify Your Account
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Choose how you'd like to receive your verification code
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
          {/* Phone Option */}
          <button
            onClick={() => handleSelectMethod('phone')}
            disabled={sendCodeMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Phone style={{ width: '24px', height: '24px', color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>SMS to Phone</p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Send code to ****{step1.phone?.slice(-4) || '****'}
              </p>
            </div>
          </button>

          {/* Email Option */}
          <button
            onClick={() => handleSelectMethod('email')}
            disabled={sendCodeMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Mail style={{ width: '24px', height: '24px', color: '#d97706' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>Email</p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Send code to {step1.email?.slice(0, 3)}***@{step1.email?.split('@')[1] || '***'}
              </p>
            </div>
          </button>
        </div>

        {sendCodeMutation.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite', color: '#2563eb' }} />
            <span style={{ color: '#6b7280' }}>Sending code...</span>
          </div>
        )}

        <button
          onClick={() => dispatch(prevStep())}
          style={{
            marginTop: '2rem',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back
        </button>
      </div>
    );
  }

  // OTP Entry Screen
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: method === 'phone' ? '#dbeafe' : '#fef3c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        {method === 'phone' ? (
          <Phone style={{ width: '40px', height: '40px', color: '#2563eb' }} />
        ) : (
          <Mail style={{ width: '40px', height: '40px', color: '#d97706' }} />
        )}
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
        Enter Verification Code
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
        We've sent a 6-digit code to
      </p>
      <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2rem' }}>
        {getMaskedDestination()}
      </p>

      {/* OTP Input */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={verifyMutation.isPending}
            style={{
              width: '50px',
              height: '60px',
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        ))}
      </div>

      {verifyMutation.isPending && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite', color: '#2563eb' }} />
          <span style={{ color: '#6b7280' }}>Verifying...</span>
        </div>
      )}

      {attempts >= 3 && (
        <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>
            Maximum attempts exceeded. Please contact support at <strong>support@smartmed.com.gh</strong>
          </p>
        </div>
      )}

      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Code expires in 10 minutes
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleResend}
          disabled={countdown > 0 || resendMutation.isPending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: countdown > 0 ? '#9ca3af' : '#2563eb',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: countdown > 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw style={{ width: '16px', height: '16px' }} />
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>

        <button
          onClick={handleChangeMethod}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try different method
        </button>
      </div>
    </div>
  );
}
