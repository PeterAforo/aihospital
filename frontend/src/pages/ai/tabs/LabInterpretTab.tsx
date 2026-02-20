import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../../../services/ai.service';
import { FlaskConical, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function LabInterpretTab() {
  const [form, setForm] = useState({ testName: '', value: '', unit: '', referenceRange: '', patientAge: '', patientGender: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => aiService.interpretLabResult(d),
  });

  const handleInterpret = () => {
    if (!form.testName || !form.value || !form.unit) return;
    const payload: any = { testName: form.testName, value: parseFloat(form.value), unit: form.unit };
    if (form.referenceRange) payload.referenceRange = form.referenceRange;
    if (form.patientAge) payload.patientAge = parseInt(form.patientAge);
    if (form.patientGender) payload.patientGender = form.patientGender;
    mutation.mutate(payload);
  };

  const result = (mutation.data as any)?.data;
  const statusIcons: Record<string, any> = {
    normal: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
    low: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
    high: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
    critical: { icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
  };

  const commonTests = [
    { name: 'Hemoglobin (Hb)', unit: 'g/dL' },
    { name: 'Fasting Blood Sugar', unit: 'mmol/L' },
    { name: 'Random Blood Sugar', unit: 'mmol/L' },
    { name: 'Creatinine', unit: 'µmol/L' },
    { name: 'WBC Count', unit: '×10⁹/L' },
    { name: 'Malaria Parasite Density', unit: '/µL' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          <FlaskConical style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Lab Result Interpretation
        </h3>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Quick Select</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {commonTests.map(t => (
              <button key={t.name} onClick={() => setForm(p => ({ ...p, testName: t.name, unit: t.unit }))}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: form.testName === t.name ? '#6366f1' : 'white', color: form.testName === t.name ? 'white' : '#374151', fontSize: '0.75rem', cursor: 'pointer' }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Test Name *</label>
          <input value={form.testName} onChange={e => setForm(p => ({ ...p, testName: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Value *</label>
            <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Unit *</label>
            <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Patient Age</label>
            <input type="number" value={form.patientAge} onChange={e => setForm(p => ({ ...p, patientAge: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Gender</label>
            <select value={form.patientGender} onChange={e => setForm(p => ({ ...p, patientGender: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }}>
              <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>
        </div>
        <button onClick={handleInterpret} disabled={mutation.isPending || !form.testName || !form.value || !form.unit}
          style={{ width: '100%', padding: '0.625rem', background: '#06b6d4', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          {mutation.isPending ? 'Interpreting...' : 'Interpret Result'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Interpretation</h3>
        {!result && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Enter a lab result to get AI interpretation</p>}
        {result && (() => {
          const si = statusIcons[result.status] || statusIcons.normal;
          const Icon = si.icon;
          return (
            <div>
              <div style={{ textAlign: 'center', padding: '1rem', borderRadius: 12, background: si.bg, marginBottom: '1rem' }}>
                <Icon style={{ width: 40, height: 40, color: si.color, margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 700, fontSize: '1.125rem', color: si.color, margin: 0, textTransform: 'uppercase' }}>{result.status}</p>
                {result.urgency && (
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: result.urgency === 'immediate' ? '#dc2626' : result.urgency === 'urgent' ? '#f59e0b' : '#6b7280', color: 'white' }}>
                    Urgency: {result.urgency}
                  </span>
                )}
              </div>
              {result.interpretation && (
                <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#374151', marginBottom: '0.75rem' }}>{result.interpretation}</p>
              )}
              {result.possibleCauses?.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Possible Causes:</p>
                  {result.possibleCauses.map((c: string, i: number) => (
                    <span key={i} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', background: '#f3f4f6', color: '#374151' }}>{c}</span>
                  ))}
                </div>
              )}
              {result.suggestedFollowUp?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Suggested Follow-up:</p>
                  {result.suggestedFollowUp.map((s: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#374151', marginBottom: 4 }}>
                      <CheckCircle style={{ width: 14, height: 14, color: '#06b6d4', flexShrink: 0 }} /> {s}
                    </div>
                  ))}
                </div>
              )}
              {!result.aiPowered && (
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', marginBottom: 0, fontStyle: 'italic' }}>
                  Rule-based interpretation. Set OPENAI_API_KEY for AI-powered analysis.
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
