import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmService } from '../../services/crm.service';
import {
  Users, Megaphone, MessageSquare, Star, Gift, Share2,
  BarChart3, TrendingUp, TrendingDown, Award,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'CRM Overview', icon: BarChart3 },
  { id: 'segments', label: 'Segments', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'loyalty', label: 'Loyalty', icon: Gift },
];

export default function CRMPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Marketing, CRM & Patient Engagement</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Segments, campaigns, feedback, loyalty, referrals</p>
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
              borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
              color: active ? '#8b5cf6' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'segments' && <SegmentsTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'loyalty' && <LoyaltyTab />}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', ...style }}>{children}</div>;
}

// ── Dashboard Tab ──
function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: () => crmService.getDashboard('current'),
  });
  const dash = (data as any)?.data;

  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading CRM data...</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Patients', value: dash?.totalPatients || 0, icon: Users, color: '#8b5cf6' },
          { label: 'Active (6mo)', value: dash?.activePatients || 0, icon: TrendingUp, color: '#16a34a' },
          { label: 'Churn Rate', value: `${dash?.churnRate || 0}%`, icon: TrendingDown, color: '#dc2626' },
          { label: 'Avg Rating', value: dash?.feedbackSummary?.avgRating?.toFixed(1) || 'N/A', icon: Star, color: '#f59e0b' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Patient Segments</h3>
          {dash?.segments?.length > 0 ? dash.segments.map((s: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.875rem' }}>{s.name}</span>
              <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: '#f3f4f6' }}>{s.patientCount}</span>
            </div>
          )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No segments configured</p>}
        </Card>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Feedback Sentiment (30d)</h3>
          {dash?.feedbackSummary?.bySentiment?.length > 0 ? dash.feedbackSummary.bySentiment.map((s: any, i: number) => {
            const sentColors: Record<string, string> = { POSITIVE: '#16a34a', NEUTRAL: '#f59e0b', NEGATIVE: '#dc2626' };
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.875rem', color: sentColors[s.sentiment] || '#374151', fontWeight: 500 }}>{s.sentiment}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.count}</span>
              </div>
            );
          }) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No feedback yet</p>}
        </Card>
      </div>
    </div>
  );
}

// ── Segments Tab ──
function SegmentsTab() {
  const { data } = useQuery({
    queryKey: ['crm-segments'],
    queryFn: () => crmService.getSegments('current'),
  });
  const segments = (data as any)?.data || [];
  const segColors: Record<string, string> = {
    New: '#16a34a', Active: '#2563eb', 'At-Risk': '#f59e0b', Inactive: '#dc2626',
    'High-Value': '#8b5cf6', Chronic: '#f97316', Pregnant: '#ec4899',
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Patient Segments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {segments.map((s: any) => (
          <Card key={s.id} style={{ borderTop: `3px solid ${segColors[s.name] || '#6b7280'}` }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 4px', color: segColors[s.name] || '#374151' }}>{s.name}</h4>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{s.patientCount}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{s.description || 'Auto-calculated segment'}</p>
            {s.lastCalculated && <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: '4px 0 0' }}>Updated: {new Date(s.lastCalculated).toLocaleDateString()}</p>}
          </Card>
        ))}
        {segments.length === 0 && <Card><p style={{ color: '#9ca3af', margin: 0 }}>No segments configured. Create segments to categorize patients.</p></Card>}
      </div>
    </div>
  );
}

// ── Campaigns Tab ──
function CampaignsTab() {
  const { data } = useQuery({
    queryKey: ['crm-campaigns'],
    queryFn: () => crmService.getCampaigns('current'),
  });
  const campaigns = (data as any)?.data || [];
  const campStatusColors: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: '#f3f4f6', text: '#6b7280' }, SCHEDULED: { bg: '#eff6ff', text: '#2563eb' },
    SENDING: { bg: '#fefce8', text: '#ca8a04' }, SENT: { bg: '#f0fdf4', text: '#16a34a' },
    CANCELLED: { bg: '#fef2f2', text: '#dc2626' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>Marketing Campaigns</h3>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {campaigns.map((c: any) => {
          const sc = campStatusColors[c.status] || campStatusColors.DRAFT;
          const deliveryRate = c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0;
          const openRate = c.deliveredCount > 0 ? Math.round((c.openedCount / c.deliveredCount) * 100) : 0;
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{c.name}</strong>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{c.status}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '4px 0' }}>
                    {c.campaignType} · {c.channel} · {c.targetSegment || 'All patients'}
                  </p>
                </div>
                {c.status === 'SENT' && (
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', textAlign: 'center' }}>
                    <div><p style={{ fontWeight: 700, margin: 0, color: '#2563eb' }}>{c.sentCount}</p><p style={{ color: '#6b7280', margin: 0 }}>Sent</p></div>
                    <div><p style={{ fontWeight: 700, margin: 0, color: '#16a34a' }}>{deliveryRate}%</p><p style={{ color: '#6b7280', margin: 0 }}>Delivered</p></div>
                    <div><p style={{ fontWeight: 700, margin: 0, color: '#f59e0b' }}>{openRate}%</p><p style={{ color: '#6b7280', margin: 0 }}>Opened</p></div>
                    <div><p style={{ fontWeight: 700, margin: 0, color: '#8b5cf6' }}>{c.convertedCount}</p><p style={{ color: '#6b7280', margin: 0 }}>Converted</p></div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {campaigns.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No campaigns yet</p></Card>}
      </div>
    </div>
  );
}

// ── Feedback Tab ──
function FeedbackTab() {
  const { data: summaryData } = useQuery({
    queryKey: ['crm-feedback-summary'],
    queryFn: () => crmService.getFeedbackSummary('current'),
  });
  const { data: feedbackData } = useQuery({
    queryKey: ['crm-feedback'],
    queryFn: () => crmService.getFeedback({ tenantId: 'current' }),
  });
  const summary = (summaryData as any)?.data;
  const feedbacks = (feedbackData as any)?.data || [];
  const sentColors: Record<string, { bg: string; text: string }> = {
    POSITIVE: { bg: '#f0fdf4', text: '#16a34a' }, NEUTRAL: { bg: '#fefce8', text: '#ca8a04' },
    NEGATIVE: { bg: '#fef2f2', text: '#dc2626' },
  };

  return (
    <div>
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <Card>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Total (30d)</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0', color: '#8b5cf6' }}>{summary.total}</p>
          </Card>
          <Card>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Avg Rating</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0', color: '#f59e0b' }}>
              {summary.avgRating ? `${summary.avgRating.toFixed(1)} / 5` : 'N/A'}
            </p>
          </Card>
          <Card>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Avg NPS</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0', color: '#2563eb' }}>
              {summary.avgNPS ? summary.avgNPS.toFixed(0) : 'N/A'}
            </p>
          </Card>
          <Card>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Positive %</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0', color: '#16a34a' }}>
              {summary.total > 0 ? Math.round(((summary.bySentiment?.find((s: any) => s.sentiment === 'POSITIVE')?.count || 0) / summary.total) * 100) : 0}%
            </p>
          </Card>
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {feedbacks.map((f: any) => {
          const sc = sentColors[f.sentiment] || sentColors.NEUTRAL;
          return (
            <Card key={f.id} style={{ borderLeft: `4px solid ${sc.text}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.875rem' }}>{f.patient?.firstName} {f.patient?.lastName}</strong>
                    {f.rating && <span style={{ color: '#f59e0b' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>}
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: sc.bg, color: sc.text }}>{f.sentiment}</span>
                  </div>
                  {f.comment && <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '4px 0' }}>{f.comment}</p>}
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0' }}>{f.feedbackType} · {new Date(f.createdAt).toLocaleDateString()}</p>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600, background: f.status === 'RESOLVED' ? '#f0fdf4' : '#fefce8', color: f.status === 'RESOLVED' ? '#16a34a' : '#ca8a04' }}>{f.status}</span>
              </div>
            </Card>
          );
        })}
        {feedbacks.length === 0 && <Card><p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>No feedback received yet</p></Card>}
      </div>
    </div>
  );
}

// ── Loyalty Tab ──
function LoyaltyTab() {
  const tierColors: Record<string, { bg: string; text: string; icon: string }> = {
    BRONZE: { bg: '#fef3c7', text: '#92400e', icon: '🥉' },
    SILVER: { bg: '#f3f4f6', text: '#374151', icon: '🥈' },
    GOLD: { bg: '#fef9c3', text: '#854d0e', icon: '🥇' },
    PLATINUM: { bg: '#ede9fe', text: '#5b21b6', icon: '💎' },
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
        <Award style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> Loyalty Program
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(tierColors).map(([tier, tc]) => (
          <Card key={tier} style={{ background: tc.bg, borderColor: tc.text + '30' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>{tc.icon}</span>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0.25rem 0', color: tc.text }}>{tier}</h4>
              <p style={{ fontSize: '0.75rem', color: tc.text + 'cc', margin: 0 }}>
                {tier === 'BRONZE' ? '0-1,999 pts' : tier === 'SILVER' ? '2,000-4,999 pts' : tier === 'GOLD' ? '5,000-9,999 pts' : '10,000+ pts'}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>How Patients Earn Points</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Action</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {[
              { action: 'Registration bonus', points: 100 },
              { action: 'Each visit / consultation', points: 50 },
              { action: 'Complete feedback survey', points: 25 },
              { action: 'Refer a friend (after registration)', points: 200 },
              { action: 'Annual health checkup', points: 100 },
              { action: 'On-time appointment arrival', points: 10 },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem' }}>{r.action}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>+{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: '1rem' }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>
          <Share2 style={{ width: 14, height: 14, display: 'inline', marginRight: 6 }} /> Referral Program
        </h4>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
          Patients can generate a unique referral code (SM-XXXXXXXX). When a referred patient registers and completes their first visit, both the referrer and the new patient earn 200 loyalty points.
        </p>
      </Card>
    </div>
  );
}
