import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { whiteLabelService } from '../../services/white-label.service';
import { saasService } from '../../services/saas.service';
import { Palette, Users, BarChart3, Building2, CreditCard, Gauge } from 'lucide-react';

const TABS = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'resellers', label: 'Resellers', icon: Users },
  { id: 'saas', label: 'SaaS Dashboard', icon: BarChart3 },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'usage', label: 'Usage & Limits', icon: Gauge },
];

export default function WhiteLabelPage() {
  const [tab, setTab] = useState('branding');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Palette style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>White Label & SaaS Management</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Branding, resellers, plans, subscriptions, usage metering</p>
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
              borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
              color: active ? '#f59e0b' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'branding' && <BrandingTab />}
      {tab === 'resellers' && <ResellersTab />}
      {tab === 'saas' && <SaasDashboardTab />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'usage' && <UsageTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

// ── Branding Tab ──
function BrandingTab() {
  const { data } = useQuery({
    queryKey: ['wl-config'],
    queryFn: () => whiteLabelService.getConfig('current'),
  });
  const config = (data as any)?.data;

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Brand Configuration</h3>
      {config?.brandName ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Card>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Identity</h4>
            <div style={{ fontSize: '0.8125rem', display: 'grid', gap: 8 }}>
              <div><span style={{ color: '#6b7280' }}>Brand Name:</span> <strong>{config.brandName}</strong></div>
              {config.customDomain && <div><span style={{ color: '#6b7280' }}>Custom Domain:</span> <strong>{config.customDomain}</strong></div>}
              {config.supportEmail && <div><span style={{ color: '#6b7280' }}>Support Email:</span> {config.supportEmail}</div>}
              {config.supportPhone && <div><span style={{ color: '#6b7280' }}>Support Phone:</span> {config.supportPhone}</div>}
              {config.footerText && <div><span style={{ color: '#6b7280' }}>Footer:</span> {config.footerText}</div>}
            </div>
          </Card>
          <Card>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Theme Colors</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { label: 'Primary', color: config.primaryColor },
                { label: 'Secondary', color: config.secondaryColor },
                { label: 'Accent', color: config.accentColor },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: c.color, border: '1px solid #e5e7eb' }} />
                  <span style={{ color: '#6b7280' }}>{c.label}:</span>
                  <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{c.color}</code>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No white-label configuration set. Configure branding to customize the platform appearance for your organization.</p>
        </Card>
      )}
    </div>
  );
}

// ── Resellers Tab ──
function ResellersTab() {
  const { data } = useQuery({
    queryKey: ['wl-resellers'],
    queryFn: () => whiteLabelService.getResellers(),
  });
  const resellers = (data as any)?.data || [];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Reseller Partners</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {resellers.map((r: any) => {
          const tierColors: Record<string, string> = { STANDARD: '#6b7280', PREMIUM: '#f59e0b', ENTERPRISE: '#8b5cf6' };
          return (
            <Card key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Building2 style={{ width: 16, height: 16, color: '#6b7280' }} />
                    <strong style={{ fontSize: '0.9375rem' }}>{r.name}</strong>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, color: tierColors[r.tier] || '#6b7280', background: (tierColors[r.tier] || '#6b7280') + '15' }}>{r.tier}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, color: r.status === 'ACTIVE' ? '#16a34a' : '#dc2626', background: r.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2' }}>{r.status}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    {r.contactName} · {r.email} · Commission: {(r.commissionRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16, textAlign: 'center', fontSize: '0.75rem' }}>
                  <div><p style={{ fontWeight: 700, margin: 0, color: '#2563eb' }}>{r.tenantCount}</p><p style={{ color: '#6b7280', margin: 0 }}>Tenants</p></div>
                  <div><p style={{ fontWeight: 700, margin: 0, color: '#16a34a' }}>GHS {r.totalRevenue?.toLocaleString()}</p><p style={{ color: '#6b7280', margin: 0 }}>Revenue</p></div>
                  <div><p style={{ fontWeight: 700, margin: 0, color: '#f59e0b' }}>GHS {r.totalCommission?.toLocaleString()}</p><p style={{ color: '#6b7280', margin: 0 }}>Commission</p></div>
                </div>
              </div>
            </Card>
          );
        })}
        {resellers.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No reseller partners configured</p></Card>}
      </div>
    </div>
  );
}

// ── SaaS Dashboard Tab ──
function SaasDashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['saas-dashboard'],
    queryFn: () => saasService.getDashboard(),
  });
  const d = (data as any)?.data;
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading SaaS data...</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Tenants', value: d?.totalTenants || 0, color: '#2563eb' },
          { label: 'Active Subscriptions', value: d?.activeSubscriptions || 0, color: '#16a34a' },
          { label: 'Plans Available', value: d?.plans?.length || 0, color: '#8b5cf6' },
        ].map((s, i) => (
          <Card key={i}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {d?.expiringSoon?.length > 0 && (
        <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem', color: '#f59e0b' }}>Expiring Soon (7 days)</h4>
          {d.expiringSoon.map((s: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
              <span>{s.tenant?.name} ({s.tenant?.subdomain})</span>
              <span style={{ color: '#6b7280' }}>{s.plan?.displayName} · Expires {new Date(s.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Subscriptions by Plan</h4>
        {d?.subscriptionsByPlan?.length > 0 ? d.subscriptionsByPlan.map((s: any, i: number) => {
          const plan = d.plans?.find((p: any) => p.id === s.planId);
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
              <span>{plan?.displayName || s.planId}</span>
              <span style={{ fontWeight: 600 }}>{s.count}</span>
            </div>
          );
        }) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No subscriptions yet</p>}
      </Card>
    </div>
  );
}

// ── Plans Tab ──
function PlansTab() {
  const { data } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => saasService.getPlans(),
  });
  const plans = (data as any)?.data || [];
  const planColors = ['#2563eb', '#8b5cf6', '#f59e0b', '#16a34a'];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>SaaS Plans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length || 1, 4)}, 1fr)`, gap: '1rem' }}>
        {plans.map((p: any, i: number) => {
          const color = planColors[i % planColors.length];
          let features: string[] = [];
          try { features = JSON.parse(p.features); } catch { features = []; }
          return (
            <Card key={p.id} style={{ borderTop: `3px solid ${color}` }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', color }}>{p.displayName}</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                {p.currency} {p.price.toLocaleString()}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>
              </p>
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                {p.maxUsers && <p style={{ margin: '2px 0' }}>Users: {p.maxUsers}</p>}
                {p.maxBranches && <p style={{ margin: '2px 0' }}>Branches: {p.maxBranches}</p>}
                {p.maxPatients && <p style={{ margin: '2px 0' }}>Patients: {p.maxPatients?.toLocaleString()}</p>}
                {p.storageGB && <p style={{ margin: '2px 0' }}>Storage: {p.storageGB} GB</p>}
                {p.smsPerMonth && <p style={{ margin: '2px 0' }}>SMS/mo: {p.smsPerMonth?.toLocaleString()}</p>}
              </div>
              {features.length > 0 && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
                  {features.slice(0, 6).map((f, fi) => (
                    <p key={fi} style={{ fontSize: '0.75rem', color: '#374151', margin: '2px 0' }}>✓ {f}</p>
                  ))}
                  {features.length > 6 && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0' }}>+{features.length - 6} more</p>}
                </div>
              )}
            </Card>
          );
        })}
        {plans.length === 0 && <Card><p style={{ color: '#9ca3af', margin: 0 }}>No plans configured. Create SaaS plans to manage tenant subscriptions.</p></Card>}
      </div>
    </div>
  );
}

// ── Usage Tab ──
function UsageTab() {
  const { data } = useQuery({
    queryKey: ['saas-usage'],
    queryFn: () => saasService.getUsage('current'),
  });
  const meters = (data as any)?.data || [];
  const metricLabels: Record<string, string> = {
    users: 'Active Users', patients: 'Patients', sms: 'SMS Sent',
    storage_gb: 'Storage (GB)', api_calls: 'API Calls', telemedicine_minutes: 'Telemedicine (min)',
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Current Period Usage</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {meters.map((m: any) => {
          const pct = m.limitValue ? Math.round((m.currentValue / m.limitValue) * 100) : 0;
          const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#16a34a';
          return (
            <Card key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{metricLabels[m.metricType] || m.metricType}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: barColor }}>
                  {m.currentValue}{m.limitValue ? ` / ${m.limitValue}` : ''}
                </span>
              </div>
              {m.limitValue && (
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              )}
              {!m.limitValue && <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: '4px 0 0' }}>Unlimited</p>}
            </Card>
          );
        })}
        {meters.length === 0 && <Card><p style={{ color: '#9ca3af', margin: 0 }}>No usage data for current period</p></Card>}
      </div>
    </div>
  );
}
