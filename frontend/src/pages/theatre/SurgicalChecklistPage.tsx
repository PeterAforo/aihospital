import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Scissors, ArrowLeft, CheckCircle, Circle, Clock, User,
  AlertTriangle, Shield, Play, Pause, Square,
} from 'lucide-react';

const PHASE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; description: string }> = {
  SIGN_IN: { label: 'Sign In', color: '#2563eb', bg: '#eff6ff', icon: Play, description: 'Before induction of anaesthesia' },
  TIME_OUT: { label: 'Time Out', color: '#f59e0b', bg: '#fefce8', icon: Pause, description: 'Before skin incision' },
  SIGN_OUT: { label: 'Sign Out', color: '#16a34a', bg: '#f0fdf4', icon: Square, description: 'Before patient leaves operating room' },
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function SurgicalChecklistPage() {
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activePhase, setActivePhase] = useState<string>('SIGN_IN');

  const { data: surgeryData } = useQuery({
    queryKey: ['surgery', surgeryId],
    queryFn: () => api.get(`/theatre/surgeries/${surgeryId}`).then(r => r.data),
    enabled: !!surgeryId,
  });

  const surgery = (surgeryData as any)?.data;
  const checklistItems: any[] = surgery?.checklistItems || [];

  const initMut = useMutation({
    mutationFn: () => api.post(`/theatre/surgeries/${surgeryId}/checklist/init`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surgery', surgeryId] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) =>
      api.patch(`/theatre/checklist/${itemId}`, { isChecked }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surgery', surgeryId] }),
  });

  // Group items by phase
  const phases: Record<string, any[]> = { SIGN_IN: [], TIME_OUT: [], SIGN_OUT: [] };
  for (const item of checklistItems) {
    if (phases[item.phase]) phases[item.phase].push(item);
  }

  // Calculate completion stats
  const totalItems = checklistItems.length;
  const checkedItems = checklistItems.filter(i => i.isChecked).length;
  const overallProgress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const phaseStats = Object.entries(phases).map(([phase, items]) => ({
    phase,
    total: items.length,
    checked: items.filter(i => i.isChecked).length,
    complete: items.length > 0 && items.every(i => i.isChecked),
  }));

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft style={{ width: 20, height: 20, color: '#6b7280' }} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #dc2626, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>WHO Surgical Safety Checklist</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
              {surgery?.patient ? `${surgery.patient.firstName} ${surgery.patient.lastName}` : 'Loading...'} 
              {surgery?.surgeryType?.name ? ` — ${surgery.surgeryType.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Overall Progress</h3>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: overallProgress === 100 ? '#16a34a' : '#f59e0b' }}>
              {overallProgress}%
            </span>
          </div>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ height: '100%', width: `${overallProgress}%`, background: overallProgress === 100 ? '#16a34a' : '#f59e0b', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>

          {/* Phase tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {phaseStats.map(ps => {
              const config = PHASE_CONFIG[ps.phase];
              const Icon = config.icon;
              const isActive = activePhase === ps.phase;
              return (
                <button key={ps.phase} onClick={() => setActivePhase(ps.phase)}
                  style={{
                    padding: '0.75rem', borderRadius: 10, cursor: 'pointer',
                    border: isActive ? `2px solid ${config.color}` : '2px solid #e5e7eb',
                    background: isActive ? config.bg : 'white',
                    textAlign: 'left',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Icon style={{ width: 16, height: 16, color: config.color }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: config.color }}>{config.label}</span>
                    {ps.complete && <CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} />}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{config.description}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>
                    {ps.checked}/{ps.total} items
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Initialize Checklist */}
      {totalItems === 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '3rem', textAlign: 'center' }}>
          <Scissors style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No Checklist Initialized</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            Initialize the WHO Surgical Safety Checklist for this surgery
          </p>
          <button onClick={() => initMut.mutate()} disabled={initMut.isPending}
            style={{ padding: '0.625rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            {initMut.isPending ? 'Initializing...' : 'Initialize Checklist'}
          </button>
        </div>
      )}

      {/* Checklist Items */}
      {totalItems > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {(() => {
            const config = PHASE_CONFIG[activePhase];
            const items = phases[activePhase] || [];
            const Icon = config.icon;
            return (
              <>
                <div style={{ padding: '1rem 1.25rem', background: config.bg, borderBottom: `2px solid ${config.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon style={{ width: 20, height: 20, color: config.color }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: config.color }}>{config.label}</h3>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0 0' }}>{config.description}</p>
                </div>

                {items.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                    No items in this phase
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    {items.map((item: any, idx: number) => (
                      <div key={item.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          padding: '0.75rem 1.25rem', borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onClick={() => toggleMut.mutate({ itemId: item.id, isChecked: !item.isChecked })}>
                        {/* Checkbox */}
                        <div style={{ marginTop: 2 }}>
                          {item.isChecked ? (
                            <CheckCircle style={{ width: 22, height: 22, color: '#16a34a' }} />
                          ) : (
                            <Circle style={{ width: 22, height: 22, color: '#d1d5db' }} />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <p style={{
                            margin: 0, fontSize: '0.875rem', fontWeight: 500,
                            color: item.isChecked ? '#9ca3af' : '#111827',
                            textDecoration: item.isChecked ? 'line-through' : 'none',
                          }}>
                            {item.item}
                          </p>
                          {item.isChecked && item.checkedAt && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.6875rem', color: '#9ca3af' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock style={{ width: 11, height: 11 }} />
                                {formatDateTime(item.checkedAt)}
                              </div>
                              {item.checkedByUser && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <User style={{ width: 11, height: 11 }} />
                                  {item.checkedByUser.firstName} {item.checkedByUser.lastName}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Safety Warning */}
      {totalItems > 0 && overallProgress < 100 && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#dc2626', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#991b1b' }}>
            <strong>Safety Warning:</strong> All checklist items must be completed before proceeding with surgery. Incomplete items: {totalItems - checkedItems}
          </p>
        </div>
      )}

      {totalItems > 0 && overallProgress === 100 && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle style={{ width: 18, height: 18, color: '#16a34a', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
            <strong>Checklist Complete:</strong> All WHO Surgical Safety Checklist items have been verified.
          </p>
        </div>
      )}
    </div>
  );
}
