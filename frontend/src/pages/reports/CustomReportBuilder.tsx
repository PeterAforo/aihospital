import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  BarChart3, Download, Filter, Play, Table, PieChart,
  Calendar, FileText, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from 'recharts';

const REPORT_TYPES = [
  { id: 'appointments', label: 'Appointments', icon: Calendar, endpoint: '/reports/analytics/appointments' },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, endpoint: '/reports/analytics/revenue' },
  { id: 'patients', label: 'Patient Demographics', icon: FileText, endpoint: '/reports/analytics/patients' },
  { id: 'diagnoses', label: 'Top Diagnoses', icon: PieChart, endpoint: '/reports/analytics/diagnoses' },
  { id: 'pharmacy', label: 'Pharmacy / Drug Usage', icon: BarChart3, endpoint: '/reports/analytics/pharmacy' },
  { id: 'lab', label: 'Laboratory Tests', icon: Table, endpoint: '/reports/analytics/lab' },
];

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

type ChartType = 'bar' | 'pie' | 'table';

export default function CustomReportBuilder() {
  const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['custom-report', selectedReport.id, dateRange],
    queryFn: () =>
      api.get(selectedReport.endpoint, {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      }).then(r => r.data),
    enabled: false,
  });

  const results: any[] = (reportData as any)?.data || (reportData as any)?.results || [];

  const handleRunReport = () => {
    refetch();
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(','),
      ...results.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport.id}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const chartData = results.slice(0, 20).map((item: any) => ({
    name: item.name || item.label || item.category || item.date || item.month || Object.values(item)[0],
    value: item.value || item.count || item.total || item.amount || Number(Object.values(item)[1]) || 0,
  }));

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Custom Report Builder</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Build and visualize custom reports</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem' }}>
        {/* Left Panel - Report Selection */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Filter style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} /> Report Type
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.25rem' }}>
            {REPORT_TYPES.map(rt => {
              const Icon = rt.icon;
              const active = selectedReport.id === rt.id;
              return (
                <button key={rt.id} onClick={() => setSelectedReport(rt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem',
                    borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#374151',
                    fontWeight: active ? 600 : 400, fontSize: '0.8125rem',
                  }}>
                  <Icon style={{ width: 16, height: 16 }} /> {rt.label}
                </button>
              );
            })}
          </div>

          {/* Date Range */}
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Calendar style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} /> Date Range
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>From</label>
            <input type="date" value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8125rem' }} />
            <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>To</label>
            <input type="date" value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8125rem' }} />
          </div>

          {/* Chart Type */}
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Visualization
          </h3>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
            {([
              { type: 'bar' as ChartType, label: 'Bar', icon: BarChart3 },
              { type: 'pie' as ChartType, label: 'Pie', icon: PieChart },
              { type: 'table' as ChartType, label: 'Table', icon: Table },
            ]).map(ct => {
              const Icon = ct.icon;
              return (
                <button key={ct.type} onClick={() => setChartType(ct.type)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '0.5rem', borderRadius: 6, border: chartType === ct.type ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: chartType === ct.type ? '#eff6ff' : 'white', cursor: 'pointer',
                    fontSize: '0.6875rem', color: chartType === ct.type ? '#2563eb' : '#6b7280',
                  }}>
                  <Icon style={{ width: 16, height: 16 }} /> {ct.label}
                </button>
              );
            })}
          </div>

          {/* Run Button */}
          <button onClick={handleRunReport} disabled={isLoading}
            style={{
              width: '100%', padding: '0.625rem', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Play style={{ width: 16, height: 16 }} /> {isLoading ? 'Running...' : 'Run Report'}
          </button>
        </div>

        {/* Right Panel - Results */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {selectedReport.label} Report
            </h3>
            {results.length > 0 && (
              <button onClick={handleExportCSV}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '0.375rem 0.75rem',
                  background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
                }}>
                <Download style={{ width: 14, height: 14 }} /> Export CSV
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              Generating report...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
              <BarChart3 style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>Select a report type and click "Run Report" to generate results</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8125rem', color: '#374151' }}>
                <strong>{results.length}</strong> records found for {dateRange.startDate} to {dateRange.endDate}
              </div>

              {/* Chart View */}
              {chartType === 'bar' && chartData.length > 0 && (
                <div style={{ height: 350, marginBottom: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={80} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === 'pie' && chartData.length > 0 && (
                <div style={{ height: 350, marginBottom: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                        {chartData.map((_: any, idx: number) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table View (always shown for table type, or below chart) */}
              {(chartType === 'table' || results.length > 0) && (
                <div style={{ overflowX: 'auto', maxHeight: chartType === 'table' ? 500 : 300 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        {Object.keys(results[0]).slice(0, 8).map(key => (
                          <th key={key} style={{ textAlign: 'left', padding: '0.5rem 0.625rem', fontWeight: 600, textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 50).map((row: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          {Object.keys(results[0]).slice(0, 8).map(key => (
                            <td key={key} style={{ padding: '0.375rem 0.625rem', color: '#374151' }}>
                              {typeof row[key] === 'number'
                                ? row[key].toLocaleString()
                                : typeof row[key] === 'object'
                                  ? JSON.stringify(row[key]).slice(0, 50)
                                  : String(row[key] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
