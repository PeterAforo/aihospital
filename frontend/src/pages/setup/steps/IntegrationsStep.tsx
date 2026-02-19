import React, { useState } from 'react';
import { Loader2, CreditCard, MessageSquare, Mail, Shield } from 'lucide-react';

interface IntegrationConfig {
  nhis: { enabled: boolean; provider_code: string; api_key: string };
  payment: { enabled: boolean; provider: string; public_key: string; secret_key: string };
  sms: { enabled: boolean; client_id: string; client_secret: string; sender_id: string };
  email: { enabled: boolean; provider: string; api_key: string };
}

interface Props { onSave: (data: any) => void; saving: boolean; }

const IntegrationsStep: React.FC<Props> = ({ onSave, saving }) => {
  const [config, setConfig] = useState<IntegrationConfig>({
    nhis: { enabled: false, provider_code: '', api_key: '' },
    payment: { enabled: false, provider: 'Paystack', public_key: '', secret_key: '' },
    sms: { enabled: false, client_id: '', client_secret: '', sender_id: '' },
    email: { enabled: false, provider: 'SendGrid', api_key: '' },
  });

  const toggle = (key: keyof IntegrationConfig) => {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const update = (section: keyof IntegrationConfig, field: string, value: string) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSubmit = () => onSave(config);

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm";

  const IntegrationCard = ({ icon: Icon, title, desc, sectionKey, children }: {
    icon: React.ElementType; title: string; desc: string; sectionKey: keyof IntegrationConfig; children: React.ReactNode;
  }) => {
    const enabled = config[sectionKey].enabled;
    return (
      <div className={`border-2 rounded-xl overflow-hidden transition ${enabled ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
        <button type="button" onClick={() => toggle(sectionKey)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-sm text-gray-800">{title}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
          <div className={`w-10 h-6 rounded-full transition ${enabled ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${enabled ? 'left-5' : 'left-1'}`} />
          </div>
        </button>
        {enabled && <div className="px-4 pb-4 pt-2 space-y-3 border-t">{children}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Connect external services. You can set these up later in Settings.</p>

      <IntegrationCard icon={Shield} title="NHIS Claims Portal" desc="Submit claims electronically to NHIA" sectionKey="nhis">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Provider Code</label>
            <input className={inputCls} value={config.nhis.provider_code} onChange={e => update('nhis', 'provider_code', e.target.value)} placeholder="MID-GH-ACC-001" />
          </div>
          <div>
            <label className="text-xs text-gray-500">API Key</label>
            <input type="password" className={inputCls} value={config.nhis.api_key} onChange={e => update('nhis', 'api_key', e.target.value)} placeholder="Obtain from NHIA" />
          </div>
        </div>
      </IntegrationCard>

      <IntegrationCard icon={CreditCard} title="Mobile Money / Payment Gateway" desc="Accept mobile money and card payments" sectionKey="payment">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Provider</label>
            <select className={inputCls} value={config.payment.provider} onChange={e => update('payment', 'provider', e.target.value)}>
              <option value="Paystack">Paystack</option>
              <option value="Flutterwave">Flutterwave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Public Key</label>
              <input className={inputCls} value={config.payment.public_key} onChange={e => update('payment', 'public_key', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Secret Key</label>
              <input type="password" className={inputCls} value={config.payment.secret_key} onChange={e => update('payment', 'secret_key', e.target.value)} />
            </div>
          </div>
        </div>
      </IntegrationCard>

      <IntegrationCard icon={MessageSquare} title="SMS Gateway (Hubtel)" desc="Send appointment reminders and notifications" sectionKey="sms">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500">Client ID</label>
            <input className={inputCls} value={config.sms.client_id} onChange={e => update('sms', 'client_id', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Client Secret</label>
            <input type="password" className={inputCls} value={config.sms.client_secret} onChange={e => update('sms', 'client_secret', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Sender ID</label>
            <input className={inputCls} value={config.sms.sender_id} onChange={e => update('sms', 'sender_id', e.target.value)} placeholder="Max 11 chars" maxLength={11} />
          </div>
        </div>
      </IntegrationCard>

      <IntegrationCard icon={Mail} title="Email Service" desc="Send email notifications" sectionKey="email">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Provider</label>
            <select className={inputCls} value={config.email.provider} onChange={e => update('email', 'provider', e.target.value)}>
              <option value="SendGrid">SendGrid</option>
              <option value="Mailgun">Mailgun</option>
              <option value="Custom SMTP">Custom SMTP</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">API Key</label>
            <input type="password" className={inputCls} value={config.email.api_key} onChange={e => update('email', 'api_key', e.target.value)} />
          </div>
        </div>
      </IntegrationCard>

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </div>
  );
};

export default IntegrationsStep;
