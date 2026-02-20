import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communityHealthService } from '../../services/community-health.service';
import { Users, MapPin, Home, ClipboardList, BarChart3 } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'workers', label: 'CHW Team', icon: Users },
  { id: 'visits', label: 'Visits', icon: ClipboardList },
  { id: 'households', label: 'Households', icon: Home },
];

export default function CommunityHealthPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Community Health & Outreach</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>CHW management, home visits, household mapping</p>
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
              borderBottom: active ? '2px solid #16a34a' : '2px solid transparent',
              color: active ? '#16a34a' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'workers' && <WorkersTab />}
      {tab === 'visits' && <VisitsTab />}
      {tab === 'households' && <HouseholdsTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['ch-dashboard'],
    queryFn: () => communityHealthService.getDashboard('current'),
  });
  const d = (data as any)?.data;
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active CHWs', value: d?.activeWorkers || 0, color: '#16a34a' },
          { label: 'Visits (30d)', value: d?.visits30d || 0, color: '#2563eb' },
          { label: 'Households', value: d?.totalHouseholds || 0, color: '#8b5cf6' },
          { label: 'Referrals (30d)', value: d?.referrals30d || 0, color: '#f59e0b' },
        ].map((s, i) => (
          <Card key={i}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0' }}>{s.label}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Visits by Type (30 days)</h3>
        {d?.visitsByType?.length > 0 ? d.visitsByType.map((v: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
            <span>{v.type.replace(/_/g, ' ')}</span>
            <span style={{ fontWeight: 600 }}>{v.count}</span>
          </div>
        )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No visits recorded</p>}
      </Card>
    </div>
  );
}

function WorkersTab() {
  const { data } = useQuery({
    queryKey: ['ch-workers'],
    queryFn: () => communityHealthService.getWorkers('current'),
  });
  const workers = (data as any)?.data || [];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Community Health Workers</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {workers.map((w: any) => (
          <Card key={w.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users style={{ width: 18, height: 18, color: '#16a34a' }} />
              </div>
              <div>
                <strong style={{ fontSize: '0.9375rem' }}>{w.firstName} {w.lastName}</strong>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{w.phone}</p>
              </div>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {w.community && <p style={{ margin: '2px 0' }}><MapPin style={{ width: 12, height: 12, display: 'inline' }} /> {w.community}, {w.district}</p>}
              <p style={{ margin: '2px 0' }}>Households: {w.assignedHouseholds}</p>
            </div>
          </Card>
        ))}
        {workers.length === 0 && <Card><p style={{ color: '#9ca3af', margin: 0 }}>No CHWs registered</p></Card>}
      </div>
    </div>
  );
}

function VisitsTab() {
  const { data } = useQuery({
    queryKey: ['ch-visits'],
    queryFn: () => communityHealthService.getVisits({ tenantId: 'current' }),
  });
  const visits = (data as any)?.data || [];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Community Visits</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {visits.map((v: any) => (
          <Card key={v.id} style={{ borderLeft: v.referralNeeded ? '4px solid #f59e0b' : '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.875rem' }}>{v.visitType.replace(/_/g, ' ')}</strong>
                  {v.referralNeeded && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: '#fefce8', color: '#ca8a04' }}>Referral Needed</span>}
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                  CHW: {v.worker?.firstName} {v.worker?.lastName} · {new Date(v.visitDate).toLocaleDateString()}
                </p>
                {v.notes && <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '4px 0' }}>{v.notes}</p>}
              </div>
            </div>
          </Card>
        ))}
        {visits.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No visits recorded</p></Card>}
      </div>
    </div>
  );
}

function HouseholdsTab() {
  const { data } = useQuery({
    queryKey: ['ch-households'],
    queryFn: () => communityHealthService.getHouseholds('current'),
  });
  const households = (data as any)?.data || [];
  const riskColors: Record<string, { bg: string; text: string }> = {
    LOW: { bg: '#f0fdf4', text: '#16a34a' }, MEDIUM: { bg: '#fefce8', text: '#ca8a04' }, HIGH: { bg: '#fef2f2', text: '#dc2626' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Household Registry</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {households.map((h: any) => {
          const rc = riskColors[h.riskLevel] || riskColors.LOW;
          return (
            <Card key={h.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Home style={{ width: 16, height: 16, color: '#6b7280' }} />
                    <strong style={{ fontSize: '0.875rem' }}>{h.headOfHousehold || 'Unknown'}</strong>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: rc.bg, color: rc.text }}>{h.riskLevel} Risk</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    {h.community}, {h.district} · {h.memberCount} members
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {h.hasPregnantWoman && <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#fce7f3', color: '#be185d' }}>Pregnant</span>}
                    {h.hasChildUnder5 && <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#eff6ff', color: '#2563eb' }}>Child &lt;5</span>}
                    {h.hasElderly && <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#f3f4f6', color: '#6b7280' }}>Elderly</span>}
                    {h.hasChronicIllness && <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#fef2f2', color: '#dc2626' }}>Chronic</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {households.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No households registered</p></Card>}
      </div>
    </div>
  );
}
