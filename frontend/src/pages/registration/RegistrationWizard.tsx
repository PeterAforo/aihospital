import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { RootState } from '@/store';
import { loadFromStorage } from '@/store/slices/registrationSlice';
import Step1PreQualification from './steps/Step1PreQualification';
import Step2HospitalDetails from './steps/Step2HospitalDetails';
import Step3AdminAccount from './steps/Step3AdminAccount';
import Step4PlanSelection from './steps/Step4PlanSelection';
import Step5SetupPreferences from './steps/Step5SetupPreferences';
import Step6Verification from './steps/Step6Verification';
import Step7Welcome from './steps/Step7Welcome';

const steps = [
  { id: 1, title: 'Get Started', description: 'Basic information' },
  { id: 2, title: 'Hospital Details', description: 'Institution info' },
  { id: 3, title: 'Admin Account', description: 'Create login' },
  { id: 4, title: 'Choose Plan', description: 'Select subscription' },
  { id: 5, title: 'Preferences', description: 'Setup options' },
  { id: 6, title: 'Verify', description: 'Phone verification' },
  { id: 7, title: 'Welcome', description: 'Get started' },
];

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '2rem 1rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  width: '100%',
  maxWidth: '800px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '2rem',
};

export default function RegistrationWizard() {
  const dispatch = useDispatch();
  const { currentStep, registrationId } = useSelector((state: RootState) => state.registration);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('smartmed_registration_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.registrationId && Date.now() < parsed.expiresAt) {
          dispatch(loadFromStorage(parsed));
        } else {
          localStorage.removeItem('smartmed_registration_draft');
        }
      } catch (e) {
        localStorage.removeItem('smartmed_registration_draft');
      }
    }
  }, [dispatch]);

  // Auto-save to localStorage
  useEffect(() => {
    if (registrationId) {
      const state = {
        registrationId,
        currentStep,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      localStorage.setItem('smartmed_registration_draft', JSON.stringify(state));
    }
  }, [registrationId, currentStep]);

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1PreQualification />;
      case 2: return <Step2HospitalDetails />;
      case 3: return <Step3AdminAccount />;
      case 4: return <Step4PlanSelection />;
      case 5: return <Step5SetupPreferences />;
      case 6: return <Step6Verification />;
      case 7: return <Step7Welcome />;
      default: return <Step1PreQualification />;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Logo */}
      <div style={headerStyle}>
        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          SmartMed
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
          AI-Powered Hospital Management
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'white', fontSize: '0.875rem' }}>
            Step {currentStep} of {steps.length}
          </span>
          <span style={{ color: 'white', fontSize: '0.875rem' }}>
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%', backgroundColor: 'white', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {steps.map((step) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              backgroundColor: step.id <= currentStep ? 'white' : 'rgba(255,255,255,0.2)',
              color: step.id <= currentStep ? '#1e40af' : 'rgba(255,255,255,0.7)',
              fontSize: '0.75rem',
              fontWeight: step.id === currentStep ? 600 : 400,
              transition: 'all 0.3s',
            }}
          >
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: step.id < currentStep ? '#22c55e' : step.id === currentStep ? '#1e40af' : 'transparent',
              color: step.id <= currentStep ? 'white' : 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              border: step.id > currentStep ? '1px solid rgba(255,255,255,0.5)' : 'none',
            }}>
              {step.id < currentStep ? '✓' : step.id}
            </span>
            <span style={{ display: currentStep >= step.id - 1 && currentStep <= step.id + 1 ? 'inline' : 'none' }}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={cardStyle}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <div style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
        <p>Already have an account? <a href="/login" style={{ color: 'white', textDecoration: 'underline' }}>Sign in</a></p>
      </div>
    </div>
  );
}
