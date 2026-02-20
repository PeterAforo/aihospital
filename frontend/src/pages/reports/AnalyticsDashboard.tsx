import React, { useState, useEffect } from 'react';
import {
  BarChart3, Users, Calendar, DollarSign, TrendingUp,
  Activity, Pill, FlaskConical, Bed, CreditCard, ArrowUpRight, ArrowDownRight,
  Download, FileSpreadsheet, Printer,
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPrintPDF, dataToHtmlTable } from '@/lib/export-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  analyticsApiService,
  ExecutiveSummary, RevenueAnalytics, ClinicalAnalytics,
  PharmacyAnalytics, LabAnalytics, AppointmentAnalytics,
} from '@/services/analytics.service';

type TabType = 'executive' | 'revenue' | 'clinical' | 'pharmacy' | 'lab' | 'appointments';

const PERIODS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'This Year', days: 365 },
];

const formatCurrency = (n: number) => `₵${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNum = (n: number) => n.toLocaleString();

const GrowthBadge: React.FC<{ value: number }> = ({ value }) => {
  if (value === 0) return <span className="text-xs text-gray-400">—</span>;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value)}%
    </span>
  );
};

const SimpleBar: React.FC<{ items: { label: string; value: number; color?: string }[]; maxValue?: number }> = ({ items, maxValue }) => {
  const max = maxValue || Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32 truncate text-right">{item.label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <div className={`h-full rounded-full ${item.color || 'bg-blue-500'}`} style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }} />
          </div>
          <span className="text-xs font-medium w-12 text-right">{formatNum(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [clinical, setClinical] = useState<ClinicalAnalytics | null>(null);
  const [pharmacy, setPharmacy] = useState<PharmacyAnalytics | null>(null);
  const [lab, setLab] = useState<LabAnalytics | null>(null);
  const [appointments, setAppointments] = useState<AppointmentAnalytics | null>(null);

  const getDateRange = () => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    return { start, end };
  };

  const loadData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    try {
      switch (activeTab) {
        case 'executive':
          setExecutive(await analyticsApiService.getExecutiveSummary(start, end));
          break;
        case 'revenue':
          setRevenue(await analyticsApiService.getRevenueAnalytics(start, end));
          break;
        case 'clinical':
          setClinical(await analyticsApiService.getClinicalAnalytics(start, end));
          break;
        case 'pharmacy':
          setPharmacy(await analyticsApiService.getPharmacyAnalytics(start, end));
          break;
        case 'lab':
          setLab(await analyticsApiService.getLabAnalytics(start, end));
          break;
        case 'appointments':
          setAppointments(await analyticsApiService.getAppointmentAnalytics(start, end));
          break;
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeTab, periodDays]);

  const getExportData = (): { rows: Record<string, any>[]; title: string } => {
    const { start, end } = getDateRange();
    const period = `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
    switch (activeTab) {
      case 'executive': return { title: `Executive Summary (${period})`, rows: executive ? [{
        'Total Patients': executive.totalPatients, 'New Patients': executive.newPatients,
        'Patient Growth %': executive.patientGrowth, 'Appointments': executive.totalAppointments,
        'Consultations': executive.totalEncounters, 'Revenue (GHS)': executive.revenue,
        'Revenue Growth %': executive.revenueGrowth, 'Outstanding (GHS)': executive.outstandingAmount,
        'Active Admissions': executive.activeAdmissions,
      }] : [] };
      case 'revenue': return { title: `Revenue Analytics (${period})`, rows: revenue?.byCategory.map(c => ({ Category: c.category, 'Amount (GHS)': c.amount })) || [] };
      case 'clinical': return { title: `Clinical Analytics (${period})`, rows: clinical?.topDiagnoses.map(d => ({ 'ICD Code': d.icdCode, Description: d.description, Count: d.count })) || [] };
      case 'pharmacy': return { title: `Pharmacy Analytics (${period})`, rows: pharmacy?.topMedications.map(m => ({ Medication: m.name, 'Dispense Count': m.count, 'Total Qty': m.quantity })) || [] };
      case 'lab': return { title: `Laboratory Analytics (${period})`, rows: lab?.topTests.map(t => ({ Test: t.name, Count: t.count })) || [] };
      case 'appointments': return { title: `Appointment Analytics (${period})`, rows: appointments?.byStatus.map(s => ({ Status: s.status, Count: s.count })) || [] };
      default: return { rows: [], title: 'Report' };
    }
  };

  const handleExportExcel = () => {
    const { rows, title } = getExportData();
    if (!rows.length) return toast({ title: 'No data', description: 'Load data first', variant: 'destructive' });
    exportToExcel(rows, `analytics-${activeTab}-${periodDays}d`, title);
  };

  const handleExportCSV = () => {
    const { rows } = getExportData();
    if (!rows.length) return toast({ title: 'No data', description: 'Load data first', variant: 'destructive' });
    exportToCSV(rows, `analytics-${activeTab}-${periodDays}d`);
  };

  const handleExportPDF = () => {
    const { rows, title } = getExportData();
    if (!rows.length) return toast({ title: 'No data', description: 'Load data first', variant: 'destructive' });
    const cols = Object.keys(rows[0]).map(k => ({ key: k, label: k }));
    const html = `<h1>${title}</h1><h2>MediCare Ghana Hospital Management System</h2>` + dataToHtmlTable(rows, cols);
    exportToPrintPDF(title, html);
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'executive', label: 'Executive', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'clinical', label: 'Clinical', icon: <Activity className="w-4 h-4" /> },
    { key: 'pharmacy', label: 'Pharmacy', icon: <Pill className="w-4 h-4" /> },
    { key: 'lab', label: 'Laboratory', icon: <FlaskConical className="w-4 h-4" /> },
    { key: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Data-driven insights across all departments</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <Button key={p.days} variant={periodDays === p.days ? 'default' : 'outline'} size="sm" onClick={() => setPeriodDays(p.days)}>
              {p.label}
            </Button>
          ))}
          <div className="border-l pl-2 ml-1 flex gap-1">
            <Button variant="outline" size="sm" onClick={handleExportExcel} title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} title="Export CSV">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} title="Print / PDF">
              <Printer className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white dark:bg-gray-700 text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* ==================== EXECUTIVE TAB ==================== */}
          {activeTab === 'executive' && executive && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Patients</p>
                      <p className="text-2xl font-bold mt-1">{formatNum(executive.totalPatients)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{executive.newPatients} new</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl"><Users className="w-6 h-6 text-blue-600" /></div>
                  </div>
                  <div className="mt-2"><GrowthBadge value={executive.patientGrowth} /></div>
                </CardContent></Card>

                <Card><CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(executive.revenue)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{executive.totalInvoices} invoices</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-xl"><DollarSign className="w-6 h-6 text-green-600" /></div>
                  </div>
                  <div className="mt-2"><GrowthBadge value={executive.revenueGrowth} /></div>
                </CardContent></Card>

                <Card><CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Appointments</p>
                      <p className="text-2xl font-bold mt-1">{formatNum(executive.totalAppointments)}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-xl"><Calendar className="w-6 h-6 text-purple-600" /></div>
                  </div>
                  <div className="mt-2"><GrowthBadge value={executive.appointmentGrowth} /></div>
                </CardContent></Card>

                <Card><CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Consultations</p>
                      <p className="text-2xl font-bold mt-1">{formatNum(executive.totalEncounters)}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-xl"><Activity className="w-6 h-6 text-orange-600" /></div>
                  </div>
                  <div className="mt-2"><GrowthBadge value={executive.encounterGrowth} /></div>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-5 text-center">
                  <CreditCard className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(executive.outstandingAmount)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <Bed className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-xs text-gray-500">Active Admissions</p>
                  <p className="text-xl font-bold text-blue-600">{executive.activeAdmissions}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-xs text-gray-500">Avg Revenue/Day</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(executive.revenue / Math.max(periodDays, 1))}</p>
                </CardContent></Card>
              </div>
            </div>
          )}

          {/* ==================== REVENUE TAB ==================== */}
          {activeTab === 'revenue' && revenue && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">NHIS vs Cash Revenue</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">NHIS</span>
                          <span className="font-semibold text-blue-600">{formatCurrency(revenue.nhisVsCash.nhis)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${(revenue.nhisVsCash.nhis / Math.max(revenue.nhisVsCash.nhis + revenue.nhisVsCash.cash, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">Cash/Other</span>
                          <span className="font-semibold text-green-600">{formatCurrency(revenue.nhisVsCash.cash)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div className="bg-green-500 h-4 rounded-full" style={{ width: `${(revenue.nhisVsCash.cash / Math.max(revenue.nhisVsCash.nhis + revenue.nhisVsCash.cash, 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
                  <CardContent>
                    <SimpleBar items={revenue.byPaymentMethod.map(p => ({ label: p.method, value: p.amount, color: 'bg-indigo-500' }))} />
                  </CardContent>
                </Card>
              </div>

              <Card><CardHeader><CardTitle className="text-sm">Revenue by Service Category</CardTitle></CardHeader>
                <CardContent>
                  <SimpleBar items={revenue.byCategory.slice(0, 8).map(c => ({ label: c.category.replace('_', ' '), value: c.amount, color: 'bg-emerald-500' }))} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== CLINICAL TAB ==================== */}
          {activeTab === 'clinical' && clinical && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">Top 10 Diagnoses</CardTitle></CardHeader>
                  <CardContent>
                    {clinical.topDiagnoses.length > 0 ? (
                      <SimpleBar items={clinical.topDiagnoses.slice(0, 10).map(d => ({ label: `${d.icdCode} ${d.description}`.substring(0, 30), value: d.count, color: 'bg-rose-500' }))} />
                    ) : <p className="text-sm text-gray-400 text-center py-4">No diagnosis data</p>}
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">Doctor Productivity</CardTitle></CardHeader>
                  <CardContent>
                    {clinical.doctorProductivity.length > 0 ? (
                      <SimpleBar items={clinical.doctorProductivity.map(d => ({ label: d.name, value: d.encounters, color: 'bg-blue-500' }))} />
                    ) : <p className="text-sm text-gray-400 text-center py-4">No encounter data</p>}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">Encounters by Type</CardTitle></CardHeader>
                  <CardContent>
                    {clinical.encountersByType.map(t => (
                      <div key={t.type} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                        <span className="text-sm">{t.type.replace('_', ' ')}</span>
                        <span className="text-sm font-semibold">{t.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">Encounter Status</CardTitle></CardHeader>
                  <CardContent>
                    {clinical.encountersByStatus.map(s => (
                      <div key={s.status} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                        <span className="text-sm">{s.status}</span>
                        <span className="text-sm font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">Patient Gender Distribution</CardTitle></CardHeader>
                  <CardContent>
                    {clinical.genderDistribution.map(g => (
                      <div key={g.gender} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                        <span className="text-sm">{g.gender}</span>
                        <span className="text-sm font-semibold">{formatNum(g.count)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ==================== PHARMACY TAB ==================== */}
          {activeTab === 'pharmacy' && pharmacy && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Total Dispensed</p>
                  <p className="text-2xl font-bold text-green-600">{formatNum(pharmacy.totalDispensed)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Pending Rx</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNum(pharmacy.pendingPrescriptions)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">{formatNum(pharmacy.lowStockCount)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Expiring (90d)</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatNum(pharmacy.expiringCount)}</p>
                </CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle className="text-sm">Top Dispensed Medications</CardTitle></CardHeader>
                <CardContent>
                  {pharmacy.topMedications.length > 0 ? (
                    <SimpleBar items={pharmacy.topMedications.map(m => ({ label: m.name, value: m.quantity, color: 'bg-green-500' }))} />
                  ) : <p className="text-sm text-gray-400 text-center py-4">No dispensing data</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== LAB TAB ==================== */}
          {activeTab === 'lab' && lab && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{formatNum(lab.totalOrders)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{formatNum(lab.completedOrders)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNum(lab.pendingOrders)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Completion Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{lab.completionRate}%</p>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">Top Ordered Tests</CardTitle></CardHeader>
                  <CardContent>
                    {lab.topTests.length > 0 ? (
                      <SimpleBar items={lab.topTests.map(t => ({ label: t.name, value: t.count, color: 'bg-purple-500' }))} />
                    ) : <p className="text-sm text-gray-400 text-center py-4">No lab data</p>}
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">Orders by Status</CardTitle></CardHeader>
                  <CardContent>
                    {lab.ordersByStatus.map(s => (
                      <div key={s.status} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                        <span className="text-sm">{s.status.replace('_', ' ')}</span>
                        <span className="text-sm font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ==================== APPOINTMENTS TAB ==================== */}
          {activeTab === 'appointments' && appointments && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold">{formatNum(appointments.total)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{formatNum(appointments.completed)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">No-Show Rate</p>
                  <p className="text-2xl font-bold text-red-600">{appointments.noShowRate}%</p>
                </CardContent></Card>
                <Card><CardContent className="pt-5 text-center">
                  <p className="text-xs text-gray-500">Cancellation Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{appointments.cancellationRate}%</p>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
                  <CardContent>
                    <SimpleBar items={appointments.byStatus.map(s => ({ label: s.status, value: s.count, color: 'bg-blue-500' }))} />
                  </CardContent>
                </Card>

                <Card><CardHeader><CardTitle className="text-sm">By Type</CardTitle></CardHeader>
                  <CardContent>
                    <SimpleBar items={appointments.byType.map(t => ({ label: t.type, value: t.count, color: 'bg-teal-500' }))} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
