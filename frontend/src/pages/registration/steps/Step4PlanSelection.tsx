import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ChevronLeft, Check, Star } from 'lucide-react';
import { RootState } from '@/store';
import { updateStep4, nextStep, prevStep } from '@/store/slices/registrationSlice';
import { registrationService } from '@/services/registration.service';
import { useToast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500,
    features: ['Up to 20 beds', 'Core modules', '2 branches', 'Basic reporting', 'Email support', 'Mobile apps'],
    recommended: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 1500,
    badge: 'Most Popular',
    features: ['Up to 50 beds', 'All modules + NHIS', '5 branches', 'AI features', 'Advanced analytics', 'Phone & email support', 'Onboarding assistance', '500 SMS/month'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    badge: 'Custom',
    features: ['Unlimited beds', 'All features', 'Unlimited branches', 'Dedicated manager', 'Custom integrations', '24/7 priority support', 'API access', 'White-label'],
    recommended: false,
    contactSales: true,
  },
];

export default function Step4PlanSelection() {
  const dispatch = useDispatch();
  const { registrationId, step4 } = useSelector((state: RootState) => state.registration);
  const { toast } = useToast();

  const selectedPlan = step4.selectedPlan || 'professional';
  const billingCycle = step4.billingCycle || 'monthly';

  const mutation = useMutation({
    mutationFn: registrationService.selectPlan,
    onSuccess: () => {
      dispatch(nextStep());
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save', variant: 'destructive' });
    },
  });

  const handleSelectPlan = (planId: string) => {
    dispatch(updateStep4({ selectedPlan: planId as any }));
  };

  const handleBillingCycle = (cycle: 'monthly' | 'annual') => {
    dispatch(updateStep4({ billingCycle: cycle }));
  };

  const handleContinue = () => {
    if (selectedPlan === 'enterprise') {
      toast({ title: 'Contact Sales', description: 'Our team will reach out to you shortly.' });
    }
    mutation.mutate({ registrationId: registrationId!, selectedPlan: selectedPlan as any, billingCycle });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
          Choose Your Plan
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Start with a 30-day free trial. No credit card required.
        </p>
      </div>

      {/* Billing Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
          <button
            onClick={() => handleBillingCycle('monthly')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: billingCycle === 'monthly' ? 'white' : 'transparent',
              color: billingCycle === 'monthly' ? '#1f2937' : '#6b7280',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => handleBillingCycle('annual')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: billingCycle === 'annual' ? 'white' : 'transparent',
              color: billingCycle === 'annual' ? '#1f2937' : '#6b7280',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: billingCycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Annual <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>Save 15%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const annualPrice = plan.price ? Math.round(plan.price * 12 * 0.85) : null;
          const displayPrice = billingCycle === 'annual' && annualPrice ? annualPrice : plan.price;

          return (
            <div
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              style={{
                border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: plan.recommended ? '#2563eb' : '#6b7280',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {plan.recommended && <Star style={{ width: '12px', height: '12px' }} />}
                  {plan.badge}
                </div>
              )}

              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                {plan.name}
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                {displayPrice ? (
                  <>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937' }}>GHS {displayPrice.toLocaleString()}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>Contact Sales</span>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#374151', marginBottom: '0.35rem' }}>
                    <Check style={{ width: '14px', height: '14px', color: '#16a34a', flexShrink: 0 }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check style={{ width: '14px', height: '14px', color: 'white' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
        All plans include 30-day free trial • No credit card required • Upgrade anytime
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" onClick={() => dispatch(prevStep())} style={{
          padding: '12px 24px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db',
          borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <ChevronLeft style={{ width: '18px', height: '18px' }} /> Back
        </button>
        <button onClick={handleContinue} disabled={mutation.isPending} style={{
          padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none',
          borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          opacity: mutation.isPending ? 0.7 : 1,
        }}>
          {mutation.isPending ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : null}
          Continue
        </button>
      </div>
    </div>
  );
}
