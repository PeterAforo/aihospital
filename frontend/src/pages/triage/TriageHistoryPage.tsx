import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  HeartPulse, ArrowLeft, Thermometer, Activity, Wind, Droplets,
  Clock, User, AlertTriangle, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const ESI_COLORS: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: '#fef2f2', color: '#dc2626', label: 'Resuscitation' },
  2: { bg: '#fff7ed', color: '#ea580c', label: 'Emergent' },
  3: { bg: '#fefce8', color: '#ca8a04', label: 'Urgent' },
  4: { bg: '#f0fdf4', color: '#16a34a', label: 'Less Urgent' },
  5: { bg: '#eff6ff', color: '#2563eb', label: 'Non-Urgent' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatChartDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function TriageHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [chartType, setChartType] = useState<'bp' | 'temp' | 'pulse' | 'spo2' | 'weight'>('bp');

  const { data, isLoading } = useQuery({
    queryKey: ['triage-history', patientId],
    queryFn: () => api.get(`/triage/patient/${patientId}/history?limit=20`).then(r => r.data),
    enabled: !!patientId,
  });

  const records = (data as any)?.data?.triageRecords || [];
  const trends = (data as any)?.data?.vitalSignsTrend || {};

  const chartData: Record<string, any[]> = {
    bp: (trends.bloodPressure || []).reverse().map((v: any) => ({ date: formatChartDate(v.date), Systolic: v.systolic, Diastolic: v.diastolic })),
    temp: (trends.temperature || []).reverse().map((v: any) => ({ date: formatChartDate(v.date), 'Temp (°C)': v.value })),
    pulse: (trends.pulseRate || []).reverse().map((v: any) => ({ date: formatChartDate(v.date), 'Pulse (bpm)': v.value })),
    spo2: (trends.spo2 || []).reverse().map((v: any) => ({ date: formatChartDate(v.date), 'SpO2 (%)': v.value })),
    weight: (trends.weight || []).reverse().map((v: any) => ({ date: formatChartDate(v.date), 'Weight (kg)': v.value })),
  };

  const chartConfigs: Record<string, { lines: { key: string; color: string }[]; domain?: [number, number] }> = {
    bp: { lines: [{ key: 'Systolic', color: '#dc2626' }, { key: 'Diastolic', color: '#2563eb' }] },
    temp: { lines: [{ key: 'Temp (°C)', color: '#ea580c' }], domain: [35, 42] },
    pulse: { lines: [{ key: 'Pulse (bpm)', color: '#8b5cf6' }] },
    spo2: { lines: [{ key: 'SpO2 (%)', color: '#0891b2' }], domain: [85, 100] },
    weight: { lines: [{ key: 'Weight (kg)', color: '#16a34a' }] },
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft style={{ width: 20, height: 20, color: '#6b7280' }} />
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeartPulse style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Triage History</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>{records.length} triage records</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading triage history...</div>
      ) : (
        <>
          {/* Vitals Trend Charts */}
          {(chartData[chartType]?.length || 0) > 1 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp style={{ width: 18, height: 18, color: '#f59e0b' }} /> Vitals Trend
                </h2>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {([
                    { id: 'bp' as const, label: 'BP', icon: Activity },
                    { id: 'temp' as const, label: 'Temp', icon: Thermometer },
                    { id: 'pulse' as const, label: 'Pulse', icon: HeartPulse },
                    { id: 'spo2' as const, label: 'SpO2', icon: Droplets },
                    { id: 'weight' as const, label: 'Weight', icon: Wind },
                  ]).map(t => (
                    <button key={t.id} onClick={() => setChartType(t.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        border: chartType === t.id ? 'none' : '1px solid #d1d5db',
                        background: chartType === t.id ? '#f59e0b' : 'white',
                        color: chartType === t.id ? 'white' : '#374151',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData[chartType]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={chartConfigs[chartType]?.domain || ['auto', 'auto']} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chartConfigs[chartType].lines.map(l => (
                    <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Timeline */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }} />

            {records.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No triage records found</div>
            ) : records.map((rec: any, idx: number) => {
              const esi = ESI_COLORS[rec.triageLevel] || ESI_COLORS[3];
              const vitals = rec.vitalSigns || {};
              return (
                <div key={rec.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: 42, minWidth: 42, height: 42, borderRadius: '50%', background: esi.bg, border: `3px solid ${esi.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: '0.875rem', fontWeight: 700, color: esi.color,
                  }}>
                    {rec.triageLevel}
                  </div>

                  {/* Card */}
                  <div style={{ flex: 1, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem', borderLeft: `4px solid ${esi.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700, background: esi.bg, color: esi.color }}>
                            ESI {rec.triageLevel} - {esi.label}
                          </span>
                          {idx === 0 && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: '#eff6ff', color: '#2563eb' }}>Latest</span>}
                        </div>
                        {rec.assessment?.chiefComplaint && (
                          <p style={{ margin: '6px 0 0', fontSize: '0.875rem', fontWeight: 500 }}>
                            <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b', display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            {rec.assessment.chiefComplaint}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <Clock style={{ width: 12, height: 12 }} />
                          {formatDate(rec.triageDate)} {formatTime(rec.triageDate)}
                        </div>
                        {rec.nurse && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                            <User style={{ width: 12, height: 12 }} />
                            {rec.nurse.firstName} {rec.nurse.lastName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vital Signs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                      {vitals.bpSystolic && vitals.bpDiastolic && (
                        <VitalBadge label="BP" value={`${vitals.bpSystolic}/${vitals.bpDiastolic}`} unit="mmHg"
                          warn={vitals.bpSystolic > 140 || vitals.bpSystolic < 90 || vitals.bpDiastolic > 90} />
                      )}
                      {vitals.temperature && (
                        <VitalBadge label="Temp" value={vitals.temperature} unit="°C"
                          warn={vitals.temperature > 38 || vitals.temperature < 36} />
                      )}
                      {vitals.pulseRate && (
                        <VitalBadge label="Pulse" value={vitals.pulseRate} unit="bpm"
                          warn={vitals.pulseRate > 100 || vitals.pulseRate < 60} />
                      )}
                      {vitals.respiratoryRate && (
                        <VitalBadge label="RR" value={vitals.respiratoryRate} unit="/min"
                          warn={vitals.respiratoryRate > 20 || vitals.respiratoryRate < 12} />
                      )}
                      {vitals.spo2 && (
                        <VitalBadge label="SpO2" value={vitals.spo2} unit="%"
                          warn={vitals.spo2 < 95} />
                      )}
                      {vitals.weight && (
                        <VitalBadge label="Weight" value={vitals.weight} unit="kg" />
                      )}
                      {vitals.height && (
                        <VitalBadge label="Height" value={vitals.height} unit="cm" />
                      )}
                    </div>

                    {rec.assessment?.symptomDuration && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Duration: {rec.assessment.symptomDuration} | Severity: {rec.assessment.symptomSeverity || '-'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function VitalBadge({ label, value, unit, warn }: { label: string; value: any; unit?: string; warn?: boolean }) {
  return (
    <div style={{
      padding: '0.375rem 0.5rem', borderRadius: 8, fontSize: '0.75rem',
      background: warn ? '#fef2f2' : '#f9fafb', border: `1px solid ${warn ? '#fecaca' : '#e5e7eb'}`,
    }}>
      <div style={{ color: '#6b7280', fontSize: '0.625rem', fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 700, color: warn ? '#dc2626' : '#111827' }}>
        {value} <span style={{ fontWeight: 400, fontSize: '0.625rem', color: '#9ca3af' }}>{unit}</span>
      </div>
    </div>
  );
}
