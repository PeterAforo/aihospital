import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiConfigService } from '../../services/api-config.service';
import {
  Settings, CreditCard, MessageSquare, Mail, Plug, CheckCircle,
  XCircle, TestTube, Save, Shield,
} from 'lucide-react';

const API_TYPES = [
  { value: 'PAYMENT', label: 'Payment Gateway', icon: CreditCard, color: '#16a34a' },
  { value: 'SMS', label: 'SMS Gateway', icon: MessageSquare, color: '#2563eb' },
  { value: 'EMAIL', label: 'Email Provider', icon: Mail, color: '#8b5cf6' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: '#16a34a' },
];

const PROVIDERS: Record<string, { name: string; fields: string[] }[]> = {
  PAYMENT: [
    { name: 'Paystack', fields: ['publicKey', 'secretKey', 'webhookSecret'] },
    { name: 'MTN Mobile Money', fields: ['merchantId', 'apiKey', 'callbackUrl'] },
    { name: 'Vodafone Cash', fields: ['merchantId', 'apiKey'] },
    { name: 'Flutterwave', fields: ['publicKey', 'secretKey'] },
    { name: 'Stripe', fields: ['publishableKey', 'secretKey', 'webhookSecret'] },
  ],
  SMS: [
    { name: 'Hubtel', fields: ['clientId', 'clientSecret', 'senderId'] },
    { name: 'Twilio', fields: ['accountSid', 'authToken', 'fromNumber'] },
    { name: 'mNotify', fields: ['apiKey', 'senderId'] },
    { name: "Africa's Talking", fields: ['username', 'apiKey', 'senderId'] },
  ],
  EMAIL: [
    { name: 'SendGrid', fields: ['apiKey', 'fromEmail', 'fromName'] },
    { name: 'Mailgun', fields: ['apiKey', 'domain', 'fromEmail'] },
    { name: 'AWS SES', fields: ['accessKeyId', 'secretAccessKey', 'region', 'fromEmail'] },
    { name: 'SMTP', fields: ['host', 'port', 'username', 'password', 'fromEmail'] },
  ],
  WHATSAPP: [
    { name: 'Twilio', fields: ['accountSid', 'authToken', 'fromNumber'] },
    { name: '360dialog', fields: ['apiKey', 'channelId'] },
  ],
};

export default function ApiSettingsPage() {
  const [tab, setTab] = useState<'super_admin' | 'tenant'>('super_admin');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plug style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>API & Integration Settings</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Configure payment gateways, SMS, email, and third-party integrations</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { id: 'super_admin' as const, label: 'Super Admin Defaults', icon: Shield },
          { id: 'tenant' as const, label: 'Tenant Settings', icon: Settings },
        ].map(t => {
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

      {tab === 'super_admin' && <SuperAdminTab />}
      {tab === 'tenant' && <TenantTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

// ── Super Admin Tab ──
function SuperAdminTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-api-configs'],
    queryFn: () => apiConfigService.getSuperAdminConfigs(),
  });
  const { data: usageData } = useQuery({
    queryKey: ['api-usage'],
    queryFn: () => apiConfigService.getUsageSummary(),
  });

  const configs = (data as any)?.data || [];
  const usage = (usageData as any)?.data || [];
  const [editing, setEditing] = useState<string | null>(null);
  void isLoading;

  return (
    <div>
      <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
        Configure default API providers for all tenants. Tenants can override these if allowed.
      </p>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        {API_TYPES.map(at => {
          const Icon = at.icon;
          const config = configs.find((c: any) => c.apiType === at.value);
          const isEditing = editing === at.value;

          return (
            <Card key={at.value}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: at.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 18, height: 18, color: at.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>{at.label}</h3>
                    {config ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: '0.8125rem', color: '#374151' }}>Provider: <strong>{config.provider}</strong></span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: config.isActive ? '#f0fdf4' : '#fef2f2', color: config.isActive ? '#16a34a' : '#dc2626' }}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Override: {config.allowOverride ? 'Allowed' : 'Blocked'}
                        </span>
                        {config.commissionRate && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Commission: {(config.commissionRate * 100).toFixed(1)}%</span>}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '4px 0 0' }}>Not configured</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditing(isEditing ? null : at.value)}
                  style={{ padding: '6px 14px', background: isEditing ? '#f3f4f6' : '#f59e0b', color: isEditing ? '#374151' : 'white', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  {isEditing ? 'Cancel' : config ? 'Edit' : 'Configure'}
                </button>
              </div>
              {isEditing && <ConfigForm apiType={at.value} level="super_admin" existing={config} onDone={() => setEditing(null)} />}
            </Card>
          );
        })}
      </div>

      {/* Usage Summary */}
      {usage.length > 0 && (
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>API Usage Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Provider</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Action</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Count</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Cost (GHS)</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Commission</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>{u.apiType}</td>
                  <td style={{ padding: '0.5rem' }}>{u.provider}</td>
                  <td style={{ padding: '0.5rem' }}>{u.action}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.count}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.totalCost?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{u.totalCommission?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── Tenant Tab ──
function TenantTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-api-configs'],
    queryFn: () => apiConfigService.getTenantConfigs('current'),
  });

  const tenantConfigs = (data as any)?.data?.tenantConfigs || [];
  const defaults = (data as any)?.data?.superAdminDefaults || [];
  const [editing, setEditing] = useState<string | null>(null);
  void isLoading;

  return (
    <div>
      <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
        Choose to use SmartMed defaults or configure your own API credentials.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {API_TYPES.map(at => {
          const Icon = at.icon;
          const ownConfig = tenantConfigs.find((c: any) => c.apiType === at.value);
          const defaultConfig = defaults.find((c: any) => c.apiType === at.value);
          const isEditing = editing === at.value;
          const usingOwn = !!ownConfig;

          return (
            <Card key={at.value}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: at.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 18, height: 18, color: at.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>{at.label}</h3>
                    {usingOwn ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: '#eff6ff', color: '#2563eb' }}>Own Config</span>
                        <span style={{ fontSize: '0.8125rem' }}>Provider: <strong>{ownConfig.provider}</strong></span>
                      </div>
                    ) : defaultConfig ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: '#f0fdf4', color: '#16a34a' }}>Using SmartMed Default</span>
                        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{defaultConfig.provider}</span>
                        {defaultConfig.commissionRate && <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{(defaultConfig.commissionRate * 100).toFixed(1)}% commission</span>}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '4px 0 0' }}>Not available</p>
                    )}
                  </div>
                </div>
                {(defaultConfig?.allowOverride || usingOwn) && (
                  <button onClick={() => setEditing(isEditing ? null : at.value)}
                    style={{ padding: '6px 14px', background: isEditing ? '#f3f4f6' : '#2563eb', color: isEditing ? '#374151' : 'white', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    {isEditing ? 'Cancel' : usingOwn ? 'Edit' : 'Use Own'}
                  </button>
                )}
              </div>
              {isEditing && <ConfigForm apiType={at.value} level="tenant" existing={ownConfig} onDone={() => setEditing(null)} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Config Form ──
function ConfigForm({ apiType, level, existing, onDone }: { apiType: string; level: string; existing?: any; onDone: () => void }) {
  const providers = PROVIDERS[apiType] || [];
  const [provider, setProvider] = useState(existing?.provider || providers[0]?.name || '');
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [allowOverride, setAllowOverride] = useState(existing?.allowOverride ?? true);
  const [commissionRate, setCommissionRate] = useState(existing?.commissionRate ? String(existing.commissionRate * 100) : '');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const qc = useQueryClient();
  const saveMut = useMutation({
    mutationFn: (data: any) => level === 'super_admin' ? apiConfigService.upsertSuperAdminConfig(data) : apiConfigService.upsertTenantConfig('current', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [level === 'super_admin' ? 'sa-api-configs' : 'tenant-api-configs'] }); onDone(); },
  });
  const testMut = useMutation({
    mutationFn: (data: any) => apiConfigService.testConnection(data),
    onSuccess: (data: any) => setTestResult((data as any)?.data),
  });

  const selectedProvider = providers.find(p => p.name === provider);
  const fields = selectedProvider?.fields || [];

  const handleSave = () => {
    const data: any = { apiType, provider, credentials: creds };
    if (level === 'super_admin') { data.allowOverride = allowOverride; data.commissionRate = commissionRate ? parseFloat(commissionRate) / 100 : undefined; }
    saveMut.mutate(data);
  };

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Provider</label>
        <select value={provider} onChange={e => { setProvider(e.target.value); setCreds({}); setTestResult(null); }}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }}>
          {providers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {fields.map(f => (
          <div key={f}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>{f}</label>
            <input type={f.toLowerCase().includes('secret') || f.toLowerCase().includes('password') || f.toLowerCase().includes('key') ? 'password' : 'text'}
              value={creds[f] || ''} onChange={e => setCreds(p => ({ ...p, [f]: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>

      {level === 'super_admin' && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
            <input type="checkbox" checked={allowOverride} onChange={e => setAllowOverride(e.target.checked)} /> Allow tenant override
          </label>
          <div>
            <label style={{ fontSize: '0.8125rem', marginRight: 6 }}>Commission %:</label>
            <input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} placeholder="e.g. 2"
              style={{ width: 80, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8125rem' }} />
          </div>
        </div>
      )}

      {testResult && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: testResult.success ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
          {testResult.success ? <CheckCircle style={{ width: 16, height: 16, color: '#16a34a' }} /> : <XCircle style={{ width: 16, height: 16, color: '#dc2626' }} />}
          <span style={{ color: testResult.success ? '#16a34a' : '#dc2626' }}>{testResult.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={() => testMut.mutate({ apiType, provider, credentials: creds })} disabled={testMut.isPending}
          style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <TestTube style={{ width: 14, height: 14 }} /> Test Connection
        </button>
        <button onClick={handleSave} disabled={saveMut.isPending}
          style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Save style={{ width: 14, height: 14 }} /> {saveMut.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
