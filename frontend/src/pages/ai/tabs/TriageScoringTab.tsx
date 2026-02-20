import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../../../services/ai.service';
import { Activity, CheckCircle } from 'lucide-react';

export default function TriageScoringTab() {
  const [vitals, setVitals] = useState({
    temperature: '', systolicBP: '', diastolicBP: '', heartRate: '',
    respiratoryRate: '', oxygenSaturation: '', consciousnessLevel: 'ALERT', symptoms: '',
  });
  const mutation = useMutation({
    mutationFn: (d: any) => aiService.calculateTriageScore(d),
  });

  const handleScore = () => {
    const p: any = { consciousnessLevel: vitals.consciousnessLevel };
    if (vitals.temperature) p.temperature = parseFloat(vitals.temperature);
    if (vitals.systolicBP) p.systolicBP = parseFloat(vitals.systolicBP);
    if (vitals.heartRate) p.heartRate = parseFloat(vitals.heartRate);
    if (vitals.respiratoryRate) p.respiratoryRate = parseFloat(vitals.respiratoryRate);
    if (vitals.oxygenSaturation) p.oxygenSaturation = parseFloat(vitals.oxygenSaturation);
    if (vitals.symptoms) p.symptoms = vitals.symptoms;
    mutation.mutate(p);
  };

  const result = (mutation.data as any)?.data;
  const pColors: Record<string, string> = { red: '#dc2626', orange: '#f59e0b', yellow: '#eab308', green: '#16a34a' };

  const fields = [
    { key: 'temperature', label: 'Temperature (°C)', ph: '36.5' },
    { key: 'systolicBP', label: 'Systolic BP (mmHg)', ph: '120' },
    { key: 'heartRate', label: 'Heart Rate (bpm)', ph: '72' },
    { key: 'respiratoryRate', label: 'Respiratory Rate', ph: '16' },
    { key: 'oxygenSaturation', label: 'SpO2 (%)', ph: '98' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          <Activity style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Vital Signs
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>{f.label}</label>
              <input type="number" placeholder={f.ph} value={(vitals as any)[f.key]}
                onChange={e => setVitals(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Consciousness</label>
            <select value={vitals.consciousnessLevel} onChange={e => setVitals(p => ({ ...p, consciousnessLevel: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }}>
              <option value="ALERT">Alert</option><option value="VOICE">Voice responsive</option>
              <option value="PAIN">Pain responsive</option><option value="UNRESPONSIVE">Unresponsive</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Symptoms</label>
          <textarea value={vitals.symptoms} onChange={e => setVitals(p => ({ ...p, symptoms: e.target.value }))}
            placeholder="e.g. chest pain, difficulty breathing"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', minHeight: 60, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <button onClick={handleScore} disabled={mutation.isPending}
          style={{ width: '100%', marginTop: '0.75rem', padding: '0.625rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          {mutation.isPending ? 'Calculating...' : 'Calculate Triage Score'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Triage Result</h3>
        {!result && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Enter vitals to calculate triage score</p>}
        {result && (
          <div>
            <div style={{ textAlign: 'center', padding: '1rem', borderRadius: 12, background: (pColors[result.color] || '#6b7280') + '15', marginBottom: '1rem' }}>
              <p style={{ fontSize: '3rem', fontWeight: 800, color: pColors[result.color], margin: 0 }}>{result.earlyWarningScore}</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>/ {result.maxScore} NEWS2 Score</p>
              <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.875rem', background: pColors[result.color], color: 'white' }}>
                {result.priority}
              </span>
            </div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 8 }}>{result.action}</p>
            {result.flags?.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>⚠️ Flags:</p>
                {result.flags.map((f: string, i: number) => (
                  <span key={i} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', background: '#fef2f2', color: '#991b1b' }}>{f}</span>
                ))}
              </div>
            )}
            {result.recommendations?.map((r: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#374151', marginBottom: 4 }}>
                <CheckCircle style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0 }} /> {r}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
