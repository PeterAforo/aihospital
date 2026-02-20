import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Truck, Plus, CheckCircle, Clock, Package, ArrowRight,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: '#fefce8', color: '#ca8a04', label: 'Pending' },
  APPROVED: { bg: '#eff6ff', color: '#2563eb', label: 'Approved' },
  IN_TRANSIT: { bg: '#faf5ff', color: '#7c3aed', label: 'In Transit' },
  COMPLETED: { bg: '#f0fdf4', color: '#16a34a', label: 'Completed' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StockTransferPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ toBranchId: '', notes: '', items: [{ drugId: '', quantity: 1 }] });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: () => api.get(`/pharmacy/transfers${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  });

  const { data: drugData } = useQuery({
    queryKey: ['drugs-list'],
    queryFn: () => api.get('/pharmacy/drugs?limit=200').then(r => r.data),
    enabled: showForm,
  });

  const transfers: any[] = (data as any)?.data || [];
  const branches: any[] = (branchData as any)?.data || [];
  const drugs: any[] = (drugData as any)?.data || (drugData as any)?.drugs || [];

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/pharmacy/transfers', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); setShowForm(false); setFormData({ toBranchId: '', notes: '', items: [{ drugId: '', quantity: 1 }] }); },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/pharmacy/transfers/${id}/approve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-transfers'] }),
  });

  const receiveMut = useMutation({
    mutationFn: (id: string) => api.post(`/pharmacy/transfers/${id}/receive`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-transfers'] }),
  });

  const addItem = () => setFormData(f => ({ ...f, items: [...f.items, { drugId: '', quantity: 1 }] }));
  const removeItem = (idx: number) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => {
    setFormData(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0891b2, #0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Inter-Branch Stock Transfers</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>{transfers.length} transfers</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: showForm ? '#f3f4f6' : '#0891b2', color: showForm ? '#374151' : 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus style={{ width: 14, height: 14 }} /> {showForm ? 'Cancel' : 'New Transfer'}
        </button>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
        {[{ value: '', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))].map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              border: statusFilter === f.value ? 'none' : '1px solid #d1d5db',
              background: statusFilter === f.value ? '#0891b2' : 'white',
              color: statusFilter === f.value ? 'white' : '#374151',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Create Transfer Form */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.75rem' }}>New Stock Transfer Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Destination Branch</label>
              <select value={formData.toBranchId} onChange={e => setFormData(f => ({ ...f, toBranchId: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                <option value="">Select branch...</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Notes</label>
              <input value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Transfer reason..."
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Items</label>
          {formData.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <select value={item.drugId} onChange={e => updateItem(idx, 'drugId', e.target.value)}
                style={{ flex: 2, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem' }}>
                <option value="">Select drug...</option>
                {drugs.map((d: any) => <option key={d.id} value={d.id}>{d.genericName || d.brandName || d.name}</option>)}
              </select>
              <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                style={{ flex: 0.5, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', textAlign: 'center' }} />
              {formData.items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ width: 28, height: 28, borderRadius: 6, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle style={{ width: 14, height: 14, color: '#dc2626' }} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addItem} style={{ fontSize: '0.75rem', color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: '0.75rem' }}>
            + Add Item
          </button>

          <div>
            <button onClick={() => {
              if (!formData.toBranchId || !formData.items.some(i => i.drugId)) return;
              createMut.mutate({
                toBranchId: formData.toBranchId,
                notes: formData.notes,
                items: formData.items.filter(i => i.drugId).map(i => ({ drugId: i.drugId, quantityRequested: i.quantity })),
              });
            }} disabled={createMut.isPending}
              style={{ padding: '0.5rem 1.25rem', background: '#0891b2', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
              {createMut.isPending ? 'Submitting...' : 'Submit Transfer Request'}
            </button>
          </div>
        </div>
      )}

      {/* Transfer List */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading transfers...</div>
      ) : transfers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Package style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
          <p>No stock transfers found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {transfers.map((t: any) => {
            const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck style={{ width: 18, height: 18, color: '#0891b2' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.transferNumber || t.id.slice(0, 8)}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                          <span>{t.fromBranch?.name || 'Source'}</span>
                          <ArrowRight style={{ width: 12, height: 12 }} />
                          <span>{t.toBranch?.name || 'Destination'}</span>
                          <span style={{ marginLeft: 8 }}>{t.items?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {formatDate(t.requestedAt || t.createdAt)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: 4, justifyContent: 'flex-end' }}>
                        {t.status === 'PENDING' && (
                          <button onClick={e => { e.stopPropagation(); approveMut.mutate(t.id); }}
                            style={{ padding: '3px 8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.625rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle style={{ width: 10, height: 10 }} /> Approve
                          </button>
                        )}
                        {t.status === 'APPROVED' && (
                          <button onClick={e => { e.stopPropagation(); receiveMut.mutate(t.id); }}
                            style={{ padding: '3px 8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.625rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Package style={{ width: 10, height: 10 }} /> Receive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && t.items?.length > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.75rem 1rem', background: '#f9fafb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '0.375rem' }}>Drug</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem' }}>Requested</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem' }}>Transferred</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem' }}>Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.items.map((item: any) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem', fontWeight: 500 }}>{item.drug?.genericName || item.drug?.brandName || item.drugId?.slice(0, 8)}</td>
                            <td style={{ padding: '0.375rem', textAlign: 'right' }}>{item.quantityRequested}</td>
                            <td style={{ padding: '0.375rem', textAlign: 'right', fontWeight: 600, color: item.quantityTransferred ? '#16a34a' : '#9ca3af' }}>
                              {item.quantityTransferred || '-'}
                            </td>
                            <td style={{ padding: '0.375rem', color: '#6b7280' }}>{item.batchNumber || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.notes && <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Notes: {t.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
