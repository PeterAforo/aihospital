import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telemedicineService } from '../../services/telemedicine.service';
import {
  Video, Phone, MessageSquare, Activity, Clock, CheckCircle,
  Play, Users, AlertTriangle,
} from 'lucide-react';

const TABS = [
  { id: 'sessions', label: 'Video Sessions', icon: Video },
  { id: 'monitoring', label: 'Remote Monitoring', icon: Activity },
  { id: 'econsult', label: 'E-Consultations', icon: MessageSquare },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: '#eff6ff', text: '#2563eb' },
  WAITING: { bg: '#fefce8', text: '#ca8a04' },
  IN_PROGRESS: { bg: '#f0fdf4', text: '#16a34a' },
  COMPLETED: { bg: '#f3f4f6', text: '#6b7280' },
  CANCELLED: { bg: '#fef2f2', text: '#dc2626' },
  NO_SHOW: { bg: '#fef2f2', text: '#dc2626' },
};

export default function TelemedicinePage() {
  const [tab, setTab] = useState('sessions');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Video style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Telemedicine & Virtual Care</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Video consultations, remote monitoring, e-consultations</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1rem',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: active ? '2px solid #06b6d4' : '2px solid transparent',
              color: active ? '#06b6d4' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'sessions' && <SessionsTab />}
      {tab === 'monitoring' && <MonitoringTab />}
      {tab === 'econsult' && <EConsultTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

function Badge({ status }: { status: string }) {
  const c = statusColors[status] || statusColors.SCHEDULED;
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.text }}>{status}</span>;
}

// ── Sessions Tab ──
function SessionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['teleconsult-sessions'],
    queryFn: () => telemedicineService.getSessions({ tenantId: 'current' }),
  });
  const qc = useQueryClient();
  const startMut = useMutation({ mutationFn: (id: string) => telemedicineService.startSession(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['teleconsult-sessions'] }) });
  const cancelMut = useMutation({ mutationFn: (id: string) => telemedicineService.cancelSession(id, 'Cancelled by staff'), onSuccess: () => qc.invalidateQueries({ queryKey: ['teleconsult-sessions'] }) });

  const sessions = (data as any)?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Video Consultation Sessions</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED'].map(s => {
            const count = sessions.filter((ss: any) => ss.status === s).length;
            return count > 0 ? <Badge key={s} status={`${s} (${count})`} /> : null;
          })}
        </div>
      </div>

      {isLoading && <p style={{ color: '#6b7280' }}>Loading sessions...</p>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {sessions.map((s: any) => (
          <Card key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.9375rem' }}>{s.patient?.firstName} {s.patient?.lastName}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>MRN: {s.patient?.mrn}</span>
                  <Badge status={s.status} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', color: '#6b7280' }}>
                  <span><Clock style={{ width: 12, height: 12, display: 'inline' }} /> {new Date(s.scheduledAt).toLocaleString()}</span>
                  <span><Users style={{ width: 12, height: 12, display: 'inline' }} /> Dr. {s.doctor?.lastName}</span>
                  <span>{s.sessionType === 'VIDEO' ? <Video style={{ width: 12, height: 12, display: 'inline' }} /> : <Phone style={{ width: 12, height: 12, display: 'inline' }} />} {s.sessionType}</span>
                  {s.duration && <span>Duration: {s.duration} min</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {s.status === 'SCHEDULED' && (
                  <button onClick={() => startMut.mutate(s.id)} style={{ padding: '6px 12px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Play style={{ width: 12, height: 12 }} /> Start
                  </button>
                )}
                {s.status === 'WAITING' && (
                  <button onClick={() => startMut.mutate(s.id)} style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Video style={{ width: 12, height: 12 }} /> Join Call
                  </button>
                )}
                {['SCHEDULED', 'WAITING'].includes(s.status) && (
                  <button onClick={() => cancelMut.mutate(s.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!isLoading && sessions.length === 0 && (
          <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No teleconsult sessions found</p></Card>
        )}
      </div>
    </div>
  );
}

// ── Remote Monitoring Tab ──
function MonitoringTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['abnormal-readings'],
    queryFn: () => telemedicineService.getAbnormalReadings('current'),
  });
  const readings = (data as any)?.data || [];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
        <AlertTriangle style={{ width: 16, height: 16, display: 'inline', marginRight: 6, color: '#f59e0b' }} />
        Abnormal Readings Requiring Review
      </h3>
      {isLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {readings.map((r: any) => (
          <Card key={r.id} style={{ borderLeft: `4px solid ${r.isAbnormal ? '#dc2626' : '#16a34a'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>{r.patient?.firstName} {r.patient?.lastName}</strong>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#6b7280' }}>MRN: {r.patient?.mrn}</span>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600 }}>{r.readingType}: {r.value}{r.value2 ? `/${r.value2}` : ''} {r.unit}</span>
                  <span style={{ color: '#6b7280' }}>{new Date(r.readingDate).toLocaleString()}</span>
                </div>
              </div>
              {r.isAbnormal && !r.reviewedBy && (
                <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>Needs Review</span>
              )}
              {r.reviewedBy && (
                <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: '#f0fdf4', color: '#16a34a' }}>Reviewed</span>
              )}
            </div>
          </Card>
        ))}
        {!isLoading && readings.length === 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <CheckCircle style={{ width: 48, height: 48, color: '#16a34a', margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600, color: '#16a34a', margin: 0 }}>No abnormal readings pending review</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── E-Consultation Tab ──
function EConsultTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['e-consults'],
    queryFn: () => telemedicineService.getEConsults({ tenantId: 'current' }),
  });
  const consults = (data as any)?.data || [];
  const ecStatusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#fefce8', text: '#ca8a04' },
    ASSIGNED: { bg: '#eff6ff', text: '#2563eb' },
    RESPONDED: { bg: '#f0fdf4', text: '#16a34a' },
    CLOSED: { bg: '#f3f4f6', text: '#6b7280' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
        <MessageSquare style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> E-Consultations (Async)
      </h3>
      {isLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {consults.map((c: any) => {
          const sc = ecStatusColors[c.status] || ecStatusColors.PENDING;
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{c.subject}</strong>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{c.status}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    Patient: {c.patient?.firstName} {c.patient?.lastName} (MRN: {c.patient?.mrn})
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '4px 0' }}>{c.symptoms}</p>
                  {c.doctorResponse && (
                    <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: 8, fontSize: '0.8125rem' }}>
                      <strong style={{ color: '#16a34a' }}>Doctor Response:</strong> {c.doctorResponse}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          );
        })}
        {!isLoading && consults.length === 0 && (
          <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No e-consultations found</p></Card>
        )}
      </div>
    </div>
  );
}
