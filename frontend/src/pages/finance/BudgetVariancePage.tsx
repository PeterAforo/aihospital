import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

function fmtGHS(n: number) {
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BudgetVariancePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ['budget-vs-actual', year],
    queryFn: () => api.get(`/finance/gl/budget-vs-actual?fiscalYear=${year}`).then(r => r.data),
  });

  const { data: cashFlowData } = useQuery({
    queryKey: ['cash-flow', year],
    queryFn: () => api.get(`/finance/gl/cash-flow?startDate=${year}-01-01&endDate=${year}-12-31`).then(r => r.data),
  });

  const budgetData = (data as any)?.data || {};
  const categories = budgetData.categories || [];
  const summary = budgetData.summary || {};
  const cashFlow = (cashFlowData as any)?.data || {};

  const chartData = categories.map((c: any) => ({
    name: c.category?.substring(0, 12) || 'Other',
    Budget: c.budgeted || 0,
    Actual: c.actual || 0,
    variance: (c.actual || 0) - (c.budgeted || 0),
  }));

  const totalBudget = summary.totalBudget || categories.reduce((s: number, c: any) => s + (c.budgeted || 0), 0);
  const totalActual = summary.totalActual || categories.reduce((s: number, c: any) => s + (c.actual || 0), 0);
  const totalVariance = totalActual - totalBudget;
  const variancePct = totalBudget > 0 ? ((totalVariance / totalBudget) * 100).toFixed(1) : '0';
  const overBudget = totalVariance > 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Budget vs Actual</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Financial variance analysis</p>
          </div>
        </div>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem' }}>
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading budget data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <SummaryCard label="Total Budget" value={fmtGHS(totalBudget)} icon={DollarSign} color="#2563eb" />
            <SummaryCard label="Total Actual" value={fmtGHS(totalActual)} icon={DollarSign} color="#16a34a" />
            <SummaryCard label="Variance" value={fmtGHS(Math.abs(totalVariance))}
              subtitle={`${overBudget ? '+' : '-'}${Math.abs(parseFloat(variancePct))}%`}
              icon={overBudget ? TrendingUp : TrendingDown}
              color={overBudget ? '#dc2626' : '#16a34a'} />
            <SummaryCard label="Net Cash Flow" value={fmtGHS(cashFlow.netCashFlow || 0)}
              icon={DollarSign} color={cashFlow.netCashFlow >= 0 ? '#16a34a' : '#dc2626'} />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }}>Budget vs Actual by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmtGHS(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Budget" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.variance > 0 ? '#fca5a5' : '#86efac'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail Table */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Budget</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Variance</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Variance %</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any, idx: number) => {
                  const v = (cat.actual || 0) - (cat.budgeted || 0);
                  const vPct = cat.budgeted > 0 ? ((v / cat.budgeted) * 100).toFixed(1) : '0';
                  const isOver = v > 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>{cat.category || cat.name || '-'}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>{fmtGHS(cat.budgeted || 0)}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>{fmtGHS(cat.actual || 0)}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: isOver ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {isOver ? '+' : ''}{fmtGHS(v)}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: isOver ? '#dc2626' : '#16a34a' }}>
                        {isOver ? '+' : ''}{vPct}%
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        {Math.abs(parseFloat(vPct)) > 10 ? (
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <AlertTriangle style={{ width: 10, height: 10 }} /> Alert
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: '#f0fdf4', color: '#16a34a' }}>
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                  <td style={{ padding: '0.75rem' }}>TOTAL</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{fmtGHS(totalBudget)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{fmtGHS(totalActual)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: overBudget ? '#dc2626' : '#16a34a' }}>
                    {overBudget ? '+' : ''}{fmtGHS(totalVariance)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: overBudget ? '#dc2626' : '#16a34a' }}>
                    {overBudget ? '+' : ''}{variancePct}%
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, subtitle, icon: Icon, color }: { label: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#111827' }}>{value}</p>
          {subtitle && <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '2px 0 0', color }}>{subtitle}</p>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 18, height: 18, color }} />
        </div>
      </div>
    </div>
  );
}
