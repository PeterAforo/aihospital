import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupService, SetupStatus } from '../../services/setup.service';
import { Check, ChevronLeft, ChevronRight, Loader2, X, Building2, GitBranch, LayoutGrid, Users, DollarSign, Pill, FlaskConical, BedDouble, Plug, ClipboardCheck } from 'lucide-react';
import HospitalProfileStep from './steps/HospitalProfileStep';
import BranchesStep from './steps/BranchesStep';
import DepartmentsStep from './steps/DepartmentsStep';
import StaffUsersStep from './steps/StaffUsersStep';
import ServicePricingStep from './steps/ServicePricingStep';
import DrugFormularyStep from './steps/DrugFormularyStep';
import LabTestsStep from './steps/LabTestsStep';
import WardBedsStep from './steps/WardBedsStep';
import IntegrationsStep from './steps/IntegrationsStep';
import ReviewStep from './steps/ReviewStep';

const STEP_ICONS = [Building2, GitBranch, LayoutGrid, Users, DollarSign, Pill, FlaskConical, BedDouble, Plug, ClipboardCheck];
const STEP_IDS = ['hospital_profile', 'branches_setup', 'departments_setup', 'staff_users', 'service_pricing', 'drug_formulary', 'lab_test_catalog', 'wards_beds', 'integrations', 'review_complete'];

interface Props {
  onComplete?: () => void;
  isModal?: boolean;
}

const SetupWizard: React.FC<Props> = ({ onComplete, isModal = true }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await setupService.getStatus();
      setStatus(s);
      if (s.setupCompleted) {
        onComplete?.();
        return;
      }
      const firstIncomplete = s.steps.find(st => !st.completed);
      if (firstIncomplete) setCurrentStep(firstIncomplete.step);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, [onComplete]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSaveStep = async (data: any) => {
    setSaving(true);
    setError(null);
    try {
      const stepId = STEP_IDS[currentStep - 1];
      await setupService.saveStep(stepId, data);
      await loadStatus();
      if (currentStep < 10) setCurrentStep(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save step');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipStep = async () => {
    setSaving(true);
    setError(null);
    try {
      const stepId = STEP_IDS[currentStep - 1];
      await setupService.skipStep(stepId);
      await loadStatus();
      if (currentStep < 10) setCurrentStep(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cannot skip this step');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      await setupService.completeSetup();
      onComplete?.();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading setup wizard...</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const stepDef = status.steps.find(s => s.step === currentStep);
  const isOptional = stepDef && !stepDef.required;
  const StepIcon = STEP_ICONS[currentStep - 1];

  const renderStep = () => {
    const props = { onSave: handleSaveStep, saving };
    switch (currentStep) {
      case 1: return <HospitalProfileStep {...props} />;
      case 2: return <BranchesStep {...props} />;
      case 3: return <DepartmentsStep {...props} />;
      case 4: return <StaffUsersStep {...props} />;
      case 5: return <ServicePricingStep {...props} />;
      case 6: return <DrugFormularyStep {...props} />;
      case 7: return <LabTestsStep {...props} />;
      case 8: return <WardBedsStep {...props} />;
      case 9: return <IntegrationsStep {...props} />;
      case 10: return <ReviewStep status={status} onComplete={handleComplete} saving={saving} />;
      default: return null;
    }
  };

  return (
    <div className={isModal ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' : ''}>
      <div className={`bg-white ${isModal ? 'rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col' : 'min-h-screen'}`}>
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
          <div>
            <h1 className="text-xl font-bold">Hospital Setup Wizard</h1>
            <p className="text-blue-100 text-sm">Step {currentStep} of 10 &middot; {status.overallPercentage}% complete</p>
          </div>
          {!isModal && (
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-1">
            {status.steps.map((s) => {
              const Icon = STEP_ICONS[s.step - 1];
              const isCurrent = s.step === currentStep;
              const isDone = s.completed;
              return (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition text-xs
                    ${isCurrent ? 'bg-blue-100 text-blue-700 font-semibold' : isDone ? 'text-green-600' : 'text-gray-400'}
                    hover:bg-gray-100`}
                  title={s.title}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="hidden lg:block truncate max-w-[80px]">{s.title}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${status.overallPercentage}%` }} />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mb-3">
              <StepIcon className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{stepDef?.title}</h2>
            {isOptional && <span className="inline-block mt-1 px-3 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Optional</span>}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {renderStep()}
        </div>

        {/* Footer navigation */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-3">
            {isOptional && currentStep !== 10 && (
              <button
                onClick={handleSkipStep}
                disabled={saving}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition"
              >
                Skip for now
              </button>
            )}
            {currentStep < 10 && !stepDef?.completed && (
              <button
                onClick={() => setCurrentStep(prev => Math.min(10, prev + 1))}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition"
              >
                Next without saving
              </button>
            )}
            {currentStep < 10 && stepDef?.completed && (
              <button
                onClick={() => setCurrentStep(prev => Math.min(10, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
