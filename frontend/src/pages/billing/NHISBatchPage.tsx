import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Shield, FileText, Download, CheckCircle, XCircle, Clock,
  Send, DollarSign, AlertTriangle,
  Upload,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT: { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  SUBMITTED: { bg: '#eff6ff', color: '#2563eb', label: 'Submitted' },
  APPROVED: { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
  PAID: { bg: '#ecfdf5', color: '#059669', label: 'Paid' },
  PARTIALLY_PAID: { bg: '#fefce8', color: '#ca8a04', label: 'Partial' },
};

function fmtGHS(n: number) {
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NHISBatchPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'claims' | 'batch' | 'reconcile'>('claims');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [reconcileItems, setReconcileItems] = useState<{ claimId: string; paidAmount: number }[]>([]);

  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['nhis-claims', statusFilter],
    queryFn: () => api.get(`/billing/nhis/claims${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['nhis-summary'],
    queryFn: () => api.get('/billing/nhis/claims/summary').then(r => r.data),
  });

  const claims: any[] = (claimsData as any)?.data || [];
  const summary = (summaryData as any)?.data || {};

  const submitMut = useMutation({
    mutationFn: (id: string) => api.post(`/billing/nhis/claims/${id}/submit`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nhis-claims'] }),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/billing/nhis/claims/${id}/approve`, { approvedAmount: amount }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nhis-claims'] }); qc.invalidateQueries({ queryKey: ['nhis-summary'] }); },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/billing/nhis/claims/${id}/reject`, { reason }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nhis-claims'] }),
  });

  const reconcileMut = useMutation({
    mutationFn: (items: { claimId: string; paidAmount: number }[]) =>
      api.post('/billing/nhis/reconcile', { items }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nhis-claims'] });
      qc.invalidateQueries({ queryKey: ['nhis-summary'] });
      setReconcileItems([]);
      setTab('claims');
    },
  });

  const handleBatchXMLDownload = async () => {
    if (selectedClaims.length === 0) return;
    try {
      const res = await api.post('/billing/nhis/claims/batch-xml', { claimIds: selectedClaims }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhis-batch-${new Date().toISOString().split('T')[0]}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download batch XML:', e);
    }
  };

  const handleSingleXMLDownload = async (claimId: string) => {
    try {
      const res = await api.get(`/billing/nhis/claims/${claimId}/xml`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhis-claim-${claimId.slice(0, 8)}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download XML:', e);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedClaims(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedClaims.length === claims.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(claims.map(c => c.id));
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>NHIS Claims & Reconciliation</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Batch processing, submission, and payment reconciliation</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryCard label="Total Claims" value={summary.totalClaims || claims.length} icon={FileText} color="#2563eb" />
        <SummaryCard label="Submitted" value={fmtGHS(summary.submittedAmount || 0)} icon={Send} color="#8b5cf6" isText />
        <SummaryCard label="Approved" value={fmtGHS(summary.approvedAmount || 0)} icon={CheckCircle} color="#16a34a" isText />
        <SummaryCard label="Paid" value={fmtGHS(summary.paidAmount || 0)} icon={DollarSign} color="#059669" isText />
        <SummaryCard label="Pending" value={fmtGHS(summary.pendingAmount || 0)} icon={Clock} color="#f59e0b" isText />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1rem' }}>
        {([
          { id: 'claims' as const, label: 'Claims List', icon: FileText },
          { id: 'batch' as const, label: 'Batch Processing', icon: Upload },
          { id: 'reconcile' as const, label: 'Reconciliation', icon: DollarSign },
        ]).map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1rem',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: active ? '2px solid #059669' : '2px solid transparent',
              color: active ? '#059669' : '#6b7280', fontWeight: active ? 600 : 400,
              fontSize: '0.875rem', marginBottom: -2,
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Claims Tab */}
      {tab === 'claims' && (
        <>
          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
            {[{ value: '', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  border: statusFilter === f.value ? 'none' : '1px solid #d1d5db',
                  background: statusFilter === f.value ? '#059669' : 'white',
                  color: statusFilter === f.value ? 'white' : '#374151',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Claims Table */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading claims...</div>
            ) : claims.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <FileText style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
                <p>No NHIS claims found</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', width: 40 }}>
                      <input type="checkbox" checked={selectedClaims.length === claims.length && claims.length > 0}
                        onChange={toggleSelectAll} />
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Claim #</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Patient</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>NHIS #</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Amount</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Approved</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim: any) => {
                    const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={claim.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedClaims.includes(claim.id)}
                            onChange={() => toggleSelect(claim.id)} />
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                          {claim.claimNumber || claim.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          {claim.patient ? `${claim.patient.firstName} ${claim.patient.lastName}` : claim.patientId?.slice(0, 8) || '-'}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#6b7280' }}>
                          {claim.nhisNumber || claim.patient?.nhisNumber || '-'}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#6b7280' }}>
                          {formatDate(claim.claimDate || claim.createdAt)}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                          {fmtGHS(claim.claimedAmount || 0)}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          {claim.approvedAmount ? fmtGHS(claim.approvedAmount) : '-'}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            {claim.status === 'DRAFT' && (
                              <button onClick={() => submitMut.mutate(claim.id)} title="Submit"
                                style={{ width: 24, height: 24, borderRadius: 4, background: '#2563eb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send style={{ width: 12, height: 12, color: 'white' }} />
                              </button>
                            )}
                            {claim.status === 'SUBMITTED' && (
                              <>
                                <button onClick={() => approveMut.mutate({ id: claim.id, amount: claim.claimedAmount })} title="Approve"
                                  style={{ width: 24, height: 24, borderRadius: 4, background: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CheckCircle style={{ width: 12, height: 12, color: 'white' }} />
                                </button>
                                <button onClick={() => rejectMut.mutate({ id: claim.id, reason: 'Rejected by admin' })} title="Reject"
                                  style={{ width: 24, height: 24, borderRadius: 4, background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <XCircle style={{ width: 12, height: 12, color: 'white' }} />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleSingleXMLDownload(claim.id)} title="Download XML"
                              style={{ width: 24, height: 24, borderRadius: 4, background: '#f3f4f6', border: '1px solid #d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Download style={{ width: 12, height: 12, color: '#374151' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Batch Processing Tab */}
      {tab === 'batch' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }}>Batch XML Generation</h3>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
            Select claims from the Claims List tab, then generate a batch XML file for NHIS submission.
          </p>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
              <FileText style={{ width: 18, height: 18, color: '#059669' }} />
              <span style={{ fontWeight: 600 }}>{selectedClaims.length} claims selected</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
              Go to the Claims List tab and use the checkboxes to select claims for batch processing.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleBatchXMLDownload} disabled={selectedClaims.length === 0}
              style={{
                padding: '0.625rem 1.5rem', background: selectedClaims.length > 0 ? '#059669' : '#d1d5db',
                color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                cursor: selectedClaims.length > 0 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Download style={{ width: 16, height: 16 }} /> Download Batch XML
            </button>
            <button onClick={() => { setTab('claims'); }}
              style={{ padding: '0.625rem 1.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              Select Claims
            </button>
          </div>

          {selectedClaims.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
                <strong>Ready:</strong> {selectedClaims.length} claims will be included in the batch XML file.
                Total amount: {fmtGHS(claims.filter(c => selectedClaims.includes(c.id)).reduce((s: number, c: any) => s + (c.claimedAmount || 0), 0))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Tab */}
      {tab === 'reconcile' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Payment Reconciliation</h3>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
            Match NHIS payments received against submitted claims. Enter the actual paid amounts.
          </p>

          {/* Approved claims ready for reconciliation */}
          {(() => {
            const approvedClaims = claims.filter(c => c.status === 'APPROVED' || c.status === 'SUBMITTED');
            if (approvedClaims.length === 0) {
              return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  <AlertTriangle style={{ width: 36, height: 36, color: '#d1d5db', margin: '0 auto 0.5rem' }} />
                  <p>No approved claims pending reconciliation</p>
                </div>
              );
            }

            return (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Claim #</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Patient</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Claimed</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Approved</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Paid Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedClaims.map((claim: any) => {
                      const existing = reconcileItems.find(r => r.claimId === claim.id);
                      return (
                        <tr key={claim.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                            {claim.claimNumber || claim.id.slice(0, 8)}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            {claim.patient ? `${claim.patient.firstName} ${claim.patient.lastName}` : '-'}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                            {fmtGHS(claim.claimedAmount || 0)}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: '#16a34a' }}>
                            {fmtGHS(claim.approvedAmount || 0)}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                            <input type="number" step="0.01" min="0"
                              value={existing?.paidAmount ?? ''}
                              placeholder="0.00"
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setReconcileItems(prev => {
                                  const filtered = prev.filter(r => r.claimId !== claim.id);
                                  if (val > 0) filtered.push({ claimId: claim.id, paidAmount: val });
                                  return filtered;
                                });
                              }}
                              style={{ width: 100, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8125rem', textAlign: 'right' }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {reconcileItems.length > 0 && (
                  <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#1e40af' }}>
                      <strong>{reconcileItems.length}</strong> claims to reconcile.
                      Total: <strong>{fmtGHS(reconcileItems.reduce((s, r) => s + r.paidAmount, 0))}</strong>
                    </span>
                    <button onClick={() => reconcileMut.mutate(reconcileItems)} disabled={reconcileMut.isPending}
                      style={{ padding: '0.5rem 1.25rem', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle style={{ width: 14, height: 14 }} /> {reconcileMut.isPending ? 'Processing...' : 'Reconcile Payments'}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, isText }: { label: string; value: any; icon: any; color: string; isText?: boolean }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
          <p style={{ fontSize: isText ? '0.875rem' : '1.25rem', fontWeight: 700, margin: 0 }}>{value}</p>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
      </div>
    </div>
  );
}
