import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiService } from '../../services/ai.service';
import {
  Brain, Search, Shield, Activity, MessageSquare,
  Stethoscope, FlaskConical, Sparkles, CheckCircle, XCircle,
} from 'lucide-react';
import TriageScoringTab from './tabs/TriageScoringTab';
import ICD10Tab from './tabs/ICD10Tab';
import ChatTab from './tabs/ChatTab';
import LabInterpretTab from './tabs/LabInterpretTab';

const TABS = [
  { id: 'overview', label: 'AI Overview', icon: Brain },
  { id: 'duplicates', label: 'Duplicate Check', icon: Search },
  { id: 'drugs', label: 'Drug Interactions', icon: Shield },
  { id: 'triage', label: 'Triage Scoring', icon: Activity },
  { id: 'icd10', label: 'ICD-10 Coding', icon: Stethoscope },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
  { id: 'lab', label: 'Lab Interpret', icon: FlaskConical },
];

export default function AIDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>SmartMed AI</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>AI-Powered Clinical Intelligence</p>
        </div>
        <span style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles style={{ width: 12, height: 12 }} /> AI Active
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1rem',
              border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
              color: active ? '#6366f1' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2, transition: 'all 0.15s',
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'duplicates' && <DuplicateCheckTab />}
      {activeTab === 'drugs' && <DrugInteractionTab />}
      {activeTab === 'triage' && <TriageScoringTab />}
      {activeTab === 'icd10' && <ICD10Tab />}
      {activeTab === 'chat' && <ChatTab />}
      {activeTab === 'lab' && <LabInterpretTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

// ── Overview Tab ──
function OverviewTab() {
  const { data } = useQuery({ queryKey: ['ai-health'], queryFn: () => aiService.getHealth() });
  const services = (data as any)?.data?.services || {};

  const features = [
    { key: 'duplicateDetection', title: 'Duplicate Patient Detection', desc: 'Fuzzy matching on name, DOB, phone, Ghana Card', icon: Search, color: '#3b82f6' },
    { key: 'drugInteractions', title: 'Drug Interaction Checker', desc: 'Drug-drug interactions and allergy cross-reactivity', icon: Shield, color: '#ef4444' },
    { key: 'triageScoring', title: 'AI Triage Scoring', desc: 'NEWS2-based early warning score with priority', icon: Activity, color: '#f59e0b' },
    { key: 'icd10Coding', title: 'ICD-10 Coding Assistant', desc: 'NLP search for ICD-10 codes from symptoms', icon: Stethoscope, color: '#10b981' },
    { key: 'chatbot', title: 'SmartMed AI Assistant', desc: 'Intelligent chatbot for patient and staff queries', icon: MessageSquare, color: '#8b5cf6' },
    { key: 'clinicalDecision', title: 'Clinical Decision Support', desc: 'AI differential diagnosis and investigations', icon: Brain, color: '#6366f1' },
    { key: 'labInterpretation', title: 'Lab Result Interpretation', desc: 'Automated flagging and interpretation of results', icon: FlaskConical, color: '#06b6d4' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
      {features.map(f => {
        const svc = services[f.key];
        const Icon = f.icon;
        return (
          <Card key={f.key}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 20, height: 20, color: f.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>{f.title}</h3>
                  {svc && (
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: svc.status === 'active' ? '#f0fdf4' : '#fef2f2', color: svc.status === 'active' ? '#16a34a' : '#dc2626' }}>
                      {svc.status === 'active' ? 'Active' : 'Needs Key'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                {svc && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0' }}>Engine: {svc.type}</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Duplicate Check Tab ──
function DuplicateCheckTab() {
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', phone: '', ghanaCardNumber: '' });
  const mutation = useMutation({ mutationFn: (d: any) => aiService.checkDuplicates({ tenantId: 'current', ...d }) });
  const handleCheck = () => { if (form.firstName && form.lastName) mutation.mutate(form); };
  const result = (mutation.data as any)?.data;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          <Search style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Check for Duplicates
        </h3>
        {(['firstName', 'lastName', 'dateOfBirth', 'phone', 'ghanaCardNumber'] as const).map(field => (
          <div key={field} style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4, color: '#374151' }}>
              {field === 'firstName' ? 'First Name *' : field === 'lastName' ? 'Last Name *' : field === 'dateOfBirth' ? 'Date of Birth' : field === 'phone' ? 'Phone Number' : 'Ghana Card Number'}
            </label>
            <input type={field === 'dateOfBirth' ? 'date' : 'text'} value={(form as any)[field]}
              onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
        ))}
        <button onClick={handleCheck} disabled={mutation.isPending || !form.firstName || !form.lastName}
          style={{ width: '100%', padding: '0.625rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}>
          {mutation.isPending ? 'Checking...' : 'Check for Duplicates'}
        </button>
      </Card>
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Results</h3>
        {!result && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Enter patient details and click check</p>}
        {result && !result.hasPotentialDuplicates && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle style={{ width: 48, height: 48, color: '#16a34a', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#16a34a' }}>No duplicates found</p>
          </div>
        )}
        {result?.duplicates?.map((d: any, i: number) => (
          <div key={i} style={{ padding: '0.75rem', border: '1px solid #fecaca', borderRadius: 8, marginBottom: '0.5rem', background: '#fef2f2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ fontSize: '0.875rem' }}>{d.firstName} {d.lastName}</strong>
              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: d.similarityScore >= 90 ? '#dc2626' : '#f59e0b', color: 'white' }}>{d.similarityScore}% match</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>MRN: {d.mrn}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {d.matchReasons.map((r: string, j: number) => (
                <span key={j} style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#fee2e2', color: '#991b1b' }}>{r}</span>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Drug Interaction Tab ──
function DrugInteractionTab() {
  const [drugs, setDrugs] = useState('');
  const [allergies, setAllergies] = useState('');
  const mutation = useMutation({ mutationFn: (d: { drugs: string[]; allergies: string[] }) => aiService.checkDrugInteractions(d.drugs, d.allergies) });
  const handleCheck = () => {
    const dl = drugs.split(',').map(d => d.trim()).filter(Boolean);
    const al = allergies.split(',').map(a => a.trim()).filter(Boolean);
    if (dl.length >= 1) mutation.mutate({ drugs: dl, allergies: al });
  };
  const result = (mutation.data as any)?.data;
  const sevC: Record<string, { bg: string; text: string }> = {
    contraindicated: { bg: '#7f1d1d', text: '#fff' }, major: { bg: '#dc2626', text: '#fff' },
    moderate: { bg: '#f59e0b', text: '#fff' }, minor: { bg: '#3b82f6', text: '#fff' },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          <Shield style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Drug Interaction Checker
        </h3>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Medications (comma-separated) *</label>
          <textarea value={drugs} onChange={e => setDrugs(e.target.value)} placeholder="e.g. Warfarin, Ciprofloxacin, Metformin"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 4 }}>Known Allergies (comma-separated)</label>
          <input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Sulfonamide"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleCheck} disabled={mutation.isPending}
          style={{ width: '100%', padding: '0.625rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          {mutation.isPending ? 'Checking...' : 'Check Interactions'}
        </button>
      </Card>
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Results</h3>
        {!result && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Enter medications to check</p>}
        {result && result.interactions?.length === 0 && result.allergyAlerts?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle style={{ width: 48, height: 48, color: '#16a34a', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#16a34a' }}>No interactions detected</p>
          </div>
        )}
        {result?.allergyAlerts?.map((a: any, i: number) => (
          <div key={`a-${i}`} style={{ padding: '0.75rem', border: '1px solid #7f1d1d', borderRadius: 8, marginBottom: '0.5rem', background: '#450a0a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <XCircle style={{ width: 16, height: 16, color: '#fca5a5' }} />
              <strong style={{ color: '#fca5a5', fontSize: '0.875rem' }}>ALLERGY: {a.drug}</strong>
            </div>
            <p style={{ color: '#fecaca', fontSize: '0.8125rem', margin: '4px 0' }}>{a.description}</p>
            <p style={{ color: '#fca5a5', fontSize: '0.8125rem', margin: 0, fontWeight: 600 }}>{a.recommendation}</p>
          </div>
        ))}
        {result?.interactions?.map((ix: any, i: number) => {
          const sc = sevC[ix.severity] || sevC.minor;
          return (
            <div key={`ix-${i}`} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ fontSize: '0.875rem' }}>{ix.drug1} + {ix.drug2}</strong>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 700, background: sc.bg, color: sc.text, textTransform: 'uppercase' }}>{ix.severity}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>{ix.description}</p>
              <p style={{ fontSize: '0.8125rem', color: '#374151', margin: 0 }}><strong>Rec:</strong> {ix.recommendation}</p>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
