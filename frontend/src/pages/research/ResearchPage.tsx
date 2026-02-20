import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { researchService } from '../../services/research.service';
import { FlaskConical, Users, BarChart3, Clock, CheckCircle } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'trials', label: 'Clinical Trials', icon: FlaskConical },
];

export default function ResearchPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlaskConical style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Research & Clinical Trials</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Trial management, participant enrollment, compliance tracking</p>
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
              borderBottom: active ? '2px solid #0ea5e9' : '2px solid transparent',
              color: active ? '#0ea5e9' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'trials' && <TrialsTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['research-dashboard'],
    queryFn: () => researchService.getDashboard('current'),
  });
  const d = (data as any)?.data;
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Trials', value: d?.totalTrials || 0, color: '#0ea5e9' },
          { label: 'Active Trials', value: d?.activeTrials || 0, color: '#16a34a' },
          { label: 'Total Participants', value: d?.totalParticipants || 0, color: '#8b5cf6' },
        ].map((s, i) => (
          <Card key={i}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0' }}>{s.label}</p>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>By Phase</h3>
          {d?.byPhase?.length > 0 ? d.byPhase.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
              <span>{p.phase}</span><span style={{ fontWeight: 600 }}>{p.count}</span>
            </div>
          )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No trials</p>}
        </Card>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>By Status</h3>
          {d?.byStatus?.length > 0 ? d.byStatus.map((s: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
              <span>{s.status}</span><span style={{ fontWeight: 600 }}>{s.count}</span>
            </div>
          )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No trials</p>}
        </Card>
      </div>
    </div>
  );
}

function TrialsTab() {
  const { data } = useQuery({
    queryKey: ['research-trials'],
    queryFn: () => researchService.getTrials('current'),
  });
  const trials = (data as any)?.data || [];
  const stColors: Record<string, { bg: string; text: string }> = {
    PLANNING: { bg: '#f3f4f6', text: '#6b7280' }, RECRUITING: { bg: '#eff6ff', text: '#2563eb' },
    ACTIVE: { bg: '#f0fdf4', text: '#16a34a' }, COMPLETED: { bg: '#e0e7ff', text: '#4338ca' },
    SUSPENDED: { bg: '#fefce8', text: '#ca8a04' }, TERMINATED: { bg: '#fef2f2', text: '#dc2626' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Clinical Trials</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {trials.map((t: any) => {
          const sc = stColors[t.status] || stColors.PLANNING;
          const enrolled = t._count?.participants || t.currentEnrollment || 0;
          const progress = t.targetEnrollment ? Math.round((enrolled / t.targetEnrollment) * 100) : 0;
          return (
            <Card key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{t.title}</strong>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{t.status}</span>
                    {t.phase && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.phase}</span>}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    Code: {t.trialCode} · PI: {t.principalInvestigator} {t.sponsor ? `· Sponsor: ${t.sponsor}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                    {t.startDate && <span><Clock style={{ width: 12, height: 12, display: 'inline' }} /> {new Date(t.startDate).toLocaleDateString()}</span>}
                    <span><Users style={{ width: 12, height: 12, display: 'inline' }} /> {enrolled}/{t.targetEnrollment || '?'} enrolled</span>
                    {t.irbApprovalNumber && <span><CheckCircle style={{ width: 12, height: 12, display: 'inline', color: '#16a34a' }} /> IRB: {t.irbApprovalNumber}</span>}
                  </div>
                </div>
                {t.targetEnrollment && (
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: progress >= 80 ? '#16a34a' : '#f59e0b' }}>{progress}%</p>
                    <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: 0 }}>enrolled</p>
                  </div>
                )}
              </div>
              {t.targetEnrollment && (
                <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 80 ? '#16a34a' : '#f59e0b', borderRadius: 2 }} />
                </div>
              )}
            </Card>
          );
        })}
        {trials.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No clinical trials registered</p></Card>}
      </div>
    </div>
  );
}
