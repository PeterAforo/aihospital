import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Shield, Download, Filter, Clock, User, Activity,
  ChevronLeft, ChevronRight, Eye, FileText,
} from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#16a34a',
  UPDATE: '#2563eb',
  DELETE: '#dc2626',
  LOGIN: '#8b5cf6',
  LOGOUT: '#6b7280',
  VIEW: '#0891b2',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.toUpperCase().includes(key)) return color;
  }
  return '#6b7280';
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const limit = 30;

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  if (filters.action) queryParams.set('action', filters.action);
  if (filters.resourceType) queryParams.set('resourceType', filters.resourceType);
  if (filters.userId) queryParams.set('userId', filters.userId);
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => api.get(`/reports/audit-logs?${queryParams.toString()}`).then(r => r.data),
  });

  const logs = (data as any)?.data?.logs || [];
  const total = (data as any)?.data?.total || 0;
  const totalPages = (data as any)?.data?.totalPages || 1;

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Method', 'Path', 'IP Address', 'Status'].join(','),
      ...logs.map((l: any) => [
        formatDate(l.createdAt),
        `${l.user?.firstName || ''} ${l.user?.lastName || ''}`.trim() || l.userId || '-',
        l.action,
        l.resourceType || '-',
        l.resourceId || '-',
        l.requestMethod || '-',
        l.requestPath || '-',
        l.ipAddress || '-',
        l.responseStatus || '-',
      ].map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Audit Logs</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
              {total.toLocaleString()} total events
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ padding: '0.5rem 1rem', background: showFilters ? '#ede9fe' : '#f3f4f6', color: showFilters ? '#7c3aed' : '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter style={{ width: 14, height: 14 }} /> Filters
          </button>
          <button onClick={handleExport}
            style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download style={{ width: 14, height: 14 }} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Action</label>
              <input value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
                placeholder="e.g. CREATE, LOGIN"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Resource Type</label>
              <input value={filters.resourceType} onChange={e => { setFilters(f => ({ ...f, resourceType: e.target.value })); setPage(1); }}
                placeholder="e.g. patients, encounters"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>User ID</label>
              <input value={filters.userId} onChange={e => { setFilters(f => ({ ...f, userId: e.target.value })); setPage(1); }}
                placeholder="User UUID"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Start Date</label>
              <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>End Date</label>
              <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setFilters({ action: '', resourceType: '', userId: '', startDate: '', endDate: '' }); setPage(1); }}
              style={{ padding: '0.375rem 0.75rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <FileText style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
            <p>No audit logs found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 14, height: 14 }} /> Timestamp</div>
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User style={{ width: 14, height: 14 }} /> User</div>
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity style={{ width: 14, height: 14 }} /> Action</div>
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Resource</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Branch</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Method</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600, color: '#374151' }}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => {
                const color = getActionColor(log.action);
                const isExpanded = expandedRow === log.id;
                return (
                  <>
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}>
                      <td style={{ padding: '0.625rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <div style={{ fontWeight: 500 }}>
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId?.slice(0, 8) || '-'}
                        </div>
                        {log.user?.email && <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{log.user.email}</div>}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600,
                          background: color + '15', color,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        {log.resourceType && (
                          <div>
                            <span style={{ fontWeight: 500 }}>{log.resourceType}</span>
                            {log.resourceId && <span style={{ color: '#9ca3af', fontSize: '0.6875rem', marginLeft: 4 }}>#{log.resourceId.slice(0, 8)}</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: '#6b7280' }}>
                        {log.branch?.name || '-'}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        {log.requestMethod && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 4, fontSize: '0.625rem', fontWeight: 700,
                            background: log.requestMethod === 'DELETE' ? '#fef2f2' : log.requestMethod === 'POST' ? '#f0fdf4' : '#eff6ff',
                            color: log.requestMethod === 'DELETE' ? '#dc2626' : log.requestMethod === 'POST' ? '#16a34a' : '#2563eb',
                          }}>
                            {log.requestMethod}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        {log.responseStatus && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600,
                            color: log.responseStatus < 300 ? '#16a34a' : log.responseStatus < 400 ? '#f59e0b' : '#dc2626',
                          }}>
                            {log.responseStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        <Eye style={{ width: 14, height: 14, color: '#9ca3af' }} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-detail`} style={{ background: '#f9fafb' }}>
                        <td colSpan={8} style={{ padding: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8125rem' }}>
                            <div>
                              <strong>Request Path:</strong> <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 4, fontSize: '0.75rem' }}>{log.requestPath || '-'}</code>
                            </div>
                            <div>
                              <strong>IP Address:</strong> {log.ipAddress || '-'}
                            </div>
                            <div>
                              <strong>Department:</strong> {log.department?.name || '-'}
                            </div>
                            <div>
                              <strong>User Agent:</strong> <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{log.userAgent?.substring(0, 80) || '-'}</span>
                            </div>
                            {log.newData && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <strong>Data:</strong>
                                <pre style={{ background: '#1f2937', color: '#e5e7eb', padding: '0.75rem', borderRadius: 8, fontSize: '0.6875rem', overflow: 'auto', maxHeight: 200, marginTop: 4 }}>
                                  {JSON.stringify(typeof log.newData === 'string' ? JSON.parse(log.newData) : log.newData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              Page {page} of {totalPages} ({total.toLocaleString()} entries)
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                Next <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
