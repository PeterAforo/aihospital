import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicHealthService } from '../../services/public-health.service';
import {
  Shield, AlertTriangle, Syringe, Megaphone, BarChart3,
  CheckCircle, XCircle, Clock,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Surveillance', icon: BarChart3 },
  { id: 'notifications', label: 'Disease Reports', icon: AlertTriangle },
  { id: 'immunizations', label: 'Immunizations', icon: Syringe },
  { id: 'campaigns', label: 'Mass Campaigns', icon: Megaphone },
];

export default function PublicHealthPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Public Health & Disease Surveillance</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Disease tracking, immunizations, outbreak alerts, mass campaigns</p>
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
              borderBottom: active ? '2px solid #dc2626' : '2px solid transparent',
              color: active ? '#dc2626' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'immunizations' && <ImmunizationsTab />}
      {tab === 'campaigns' && <CampaignsTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

// ── Surveillance Dashboard ──
function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['ph-dashboard'],
    queryFn: () => publicHealthService.getDashboard('current'),
  });
  const { data: alertData } = useQuery({
    queryKey: ['outbreak-alerts'],
    queryFn: () => publicHealthService.getOutbreaks('current'),
  });

  const dash = (data as any)?.data;
  const alerts = (alertData as any)?.data || [];
  const alertColors: Record<string, string> = { WATCH: '#f59e0b', WARNING: '#f97316', EMERGENCY: '#dc2626' };

  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading surveillance data...</p>;

  return (
    <div>
      {/* Outbreak Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {alerts.map((a: any) => (
            <div key={a.id} style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.5rem', background: alertColors[a.alertLevel] + '15', border: `1px solid ${alertColors[a.alertLevel]}40`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle style={{ width: 20, height: 20, color: alertColors[a.alertLevel], flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: alertColors[a.alertLevel], fontSize: '0.875rem' }}>{a.alertLevel}: {a.diseaseName}</strong>
                <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '2px 0 0' }}>{a.message}</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{a.caseCount} cases</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Cases (30d)', value: dash?.totalCases30d || 0, color: '#dc2626', icon: AlertTriangle },
          { label: 'Active Alerts', value: dash?.activeAlerts || 0, color: '#f59e0b', icon: Shield },
          { label: 'Diseases Tracked', value: dash?.byDisease?.length || 0, color: '#2563eb', icon: BarChart3 },
          { label: 'Notifiable Diseases', value: dash?.notifiableDiseases?.length || 0, color: '#6b7280', icon: CheckCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 18, height: 18, color: s.color }} />
                </div>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Disease Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Cases by Disease (30 days)</h3>
          {dash?.byDisease?.length > 0 ? dash.byDisease.map((d: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.875rem' }}>{d.disease}</span>
              <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>{d.count}</span>
            </div>
          )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No cases reported</p>}
        </Card>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Cases by Severity</h3>
          {dash?.bySeverity?.length > 0 ? dash.bySeverity.map((s: any, i: number) => {
            const sevColors: Record<string, string> = { MILD: '#16a34a', MODERATE: '#f59e0b', SEVERE: '#f97316', CRITICAL: '#dc2626', FATAL: '#7f1d1d' };
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.875rem', color: sevColors[s.severity] || '#374151', fontWeight: 500 }}>{s.severity}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.count}</span>
              </div>
            );
          }) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No data</p>}
        </Card>
      </div>
    </div>
  );
}

// ── Disease Notifications Tab ──
function NotificationsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['disease-notifications'],
    queryFn: () => publicHealthService.getNotifications({ tenantId: 'current' }),
  });
  const notifications = (data as any)?.data || [];
  const stColors: Record<string, { bg: string; text: string }> = {
    REPORTED: { bg: '#fefce8', text: '#ca8a04' }, INVESTIGATING: { bg: '#eff6ff', text: '#2563eb' },
    CONFIRMED: { bg: '#fef2f2', text: '#dc2626' }, CLOSED: { bg: '#f3f4f6', text: '#6b7280' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Notifiable Disease Reports</h3>
      {isLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {['Disease', 'Patient', 'Diagnosis Date', 'Severity', 'Lab Confirmed', 'GHS Reported', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifications.map((n: any) => {
              const sc = stColors[n.status] || stColors.REPORTED;
              return (
                <tr key={n.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{n.diseaseName}</td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>{n.patient?.firstName} {n.patient?.lastName}</td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>{new Date(n.diagnosisDate).toLocaleDateString()}</td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: n.severity === 'CRITICAL' || n.severity === 'SEVERE' ? '#fef2f2' : '#f3f4f6', color: n.severity === 'CRITICAL' ? '#dc2626' : n.severity === 'SEVERE' ? '#f97316' : '#374151' }}>{n.severity}</span>
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>{n.labConfirmed ? <CheckCircle style={{ width: 16, height: 16, color: '#16a34a' }} /> : <XCircle style={{ width: 16, height: 16, color: '#d1d5db' }} />}</td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>{n.ghsReported ? <CheckCircle style={{ width: 16, height: 16, color: '#16a34a' }} /> : <Clock style={{ width: 16, height: 16, color: '#f59e0b' }} />}</td>
                  <td style={{ padding: '0.625rem 0.75rem' }}><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{n.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isLoading && notifications.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No disease notifications</p>}
    </div>
  );
}

// ── Immunizations Tab ──
function ImmunizationsTab() {
  const { data: defData } = useQuery({
    queryKey: ['immunization-defaulters'],
    queryFn: () => publicHealthService.getDefaulters('current'),
  });
  const defaulters = (defData as any)?.data || [];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
        <Syringe style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Immunization Registry
      </h3>

      {defaulters.length > 0 && (
        <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem', color: '#f59e0b' }}>
            <AlertTriangle style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} /> Defaulters ({defaulters.length})
          </h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {defaulters.slice(0, 10).map((d: any) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                <div>
                  <strong>{d.patient?.firstName} {d.patient?.lastName}</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>DOB: {d.patient?.dateOfBirth ? new Date(d.patient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 500 }}>{d.vaccineName} (Dose {d.doseNumber})</span>
                  <span style={{ marginLeft: 8, color: '#dc2626', fontSize: '0.75rem' }}>Due: {d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Ghana EPI Schedule</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Vaccine</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Age</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Doses</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Route</th>
            </tr>
          </thead>
          <tbody>
            {[
              { vaccine: 'BCG', age: 'At birth', doses: '1', route: 'Intradermal' },
              { vaccine: 'OPV 0', age: 'At birth', doses: '1', route: 'Oral' },
              { vaccine: 'OPV 1, 2, 3', age: '6, 10, 14 weeks', doses: '3', route: 'Oral' },
              { vaccine: 'Pentavalent 1, 2, 3', age: '6, 10, 14 weeks', doses: '3', route: 'IM' },
              { vaccine: 'PCV 1, 2, 3', age: '6, 10, 14 weeks', doses: '3', route: 'IM' },
              { vaccine: 'Rotavirus 1, 2', age: '6, 10 weeks', doses: '2', route: 'Oral' },
              { vaccine: 'Measles-Rubella 1', age: '9 months', doses: '1', route: 'SC' },
              { vaccine: 'Yellow Fever', age: '9 months', doses: '1', route: 'SC' },
              { vaccine: 'Measles-Rubella 2', age: '18 months', doses: '1', route: 'SC' },
              { vaccine: 'Meningitis A', age: '18 months', doses: '1', route: 'IM' },
            ].map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem', fontWeight: 500 }}>{v.vaccine}</td>
                <td style={{ padding: '0.5rem', color: '#6b7280' }}>{v.age}</td>
                <td style={{ padding: '0.5rem' }}>{v.doses}</td>
                <td style={{ padding: '0.5rem', color: '#6b7280' }}>{v.route}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Mass Campaigns Tab ──
function CampaignsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['mass-campaigns'],
    queryFn: () => publicHealthService.getCampaigns('current'),
  });
  const campaigns = (data as any)?.data || [];
  const campStatusColors: Record<string, { bg: string; text: string }> = {
    PLANNED: { bg: '#eff6ff', text: '#2563eb' }, ACTIVE: { bg: '#f0fdf4', text: '#16a34a' },
    COMPLETED: { bg: '#f3f4f6', text: '#6b7280' }, CANCELLED: { bg: '#fef2f2', text: '#dc2626' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
        <Megaphone style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Mass Campaigns
      </h3>
      {isLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {campaigns.map((c: any) => {
          const sc = campStatusColors[c.status] || campStatusColors.PLANNED;
          const progress = c.targetCount ? Math.round((c.reachedCount / c.targetCount) * 100) : 0;
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{c.campaignName}</strong>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{c.status}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    {c.campaignType} · {c.targetPopulation || 'General'} · {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                  </p>
                </div>
                {c.targetCount && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: progress >= 80 ? '#16a34a' : '#f59e0b' }}>{progress}%</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{c.reachedCount}/{c.targetCount}</p>
                  </div>
                )}
              </div>
              {c.targetCount && (
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 80 ? '#16a34a' : '#f59e0b', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              )}
            </Card>
          );
        })}
        {!isLoading && campaigns.length === 0 && (
          <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No mass campaigns found</p></Card>
        )}
      </div>
    </div>
  );
}
