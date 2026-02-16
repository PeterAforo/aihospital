import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingService, Invoice, AgingReport } from '../../services/billing.service';
import {
  AlertTriangle, Clock, DollarSign, Search, Phone,
  ChevronRight, TrendingUp, Calendar
} from 'lucide-react';

export default function OutstandingInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [aging, setAging] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ageBucket, setAgeBucket] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outstandingData, agingData] = await Promise.all([
        billingService.getOutstandingInvoices(),
        billingService.getAgingReport(),
      ]);
      setInvoices(outstandingData);
      setAging(agingData);
    } catch (err) {
      console.error('Failed to load outstanding invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase());

    if (ageBucket === 'all') return matchesSearch;

    const daysSince = Math.floor((Date.now() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
    switch (ageBucket) {
      case 'current': return matchesSearch && daysSince <= 30;
      case '30': return matchesSearch && daysSince > 30 && daysSince <= 60;
      case '60': return matchesSearch && daysSince > 60 && daysSince <= 90;
      case '90+': return matchesSearch && daysSince > 90;
      default: return matchesSearch;
    }
  });

  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outstanding Invoices</h1>
          <p className="text-gray-500">Track and manage unpaid invoices</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-3xl font-bold text-red-600">GHS {totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {/* Aging buckets */}
      {aging && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { key: 'all', label: 'All Outstanding', count: invoices.length, amount: aging.totalOutstanding, color: 'blue', icon: DollarSign },
            { key: 'current', label: 'Current (0-30d)', count: aging.current.count, amount: aging.current.total, color: 'green', icon: Clock },
            { key: '30', label: '31-60 Days', count: aging.days30.count, amount: aging.days30.total, color: 'yellow', icon: Calendar },
            { key: '60', label: '61-90 Days', count: aging.days60.count, amount: aging.days60.total, color: 'orange', icon: AlertTriangle },
            { key: '90+', label: '90+ Days', count: aging.days90Plus.count, amount: aging.days90Plus.total, color: 'red', icon: TrendingUp },
          ].map(bucket => (
            <div
              key={bucket.key}
              onClick={() => setAgeBucket(bucket.key)}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                ageBucket === bucket.key ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <bucket.icon className={`w-4 h-4 text-${bucket.color}-600`} />
                <span className="text-sm text-gray-500">{bucket.label}</span>
              </div>
              <p className="text-xl font-bold">{bucket.count}</p>
              <p className={`text-sm font-medium text-${bucket.color}-600`}>GHS {bucket.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice #, patient name, or MRN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="p-3">Invoice #</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Date</th>
              <th className="p-3">Age</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-gray-400">No outstanding invoices</td></tr>
            ) : (
              filteredInvoices.map(inv => {
                const daysSince = Math.floor((Date.now() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
                const ageColor = daysSince > 90 ? 'text-red-600 font-bold' : daysSince > 60 ? 'text-orange-600' : daysSince > 30 ? 'text-yellow-600' : 'text-gray-600';
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/billing/invoices/${inv.id}`)}>
                    <td className="p-3 font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="p-3">
                      <p className="font-medium">{inv.patient?.firstName} {inv.patient?.lastName}</p>
                      <p className="text-xs text-gray-500">{inv.patient?.mrn}</p>
                    </td>
                    <td className="p-3 text-sm">
                      {inv.patient?.phonePrimary && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Phone className="w-3 h-3" /> {inv.patient.phonePrimary}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className={`p-3 text-sm ${ageColor}`}>{daysSince}d</td>
                    <td className="p-3 text-right">GHS {inv.total.toFixed(2)}</td>
                    <td className="p-3 text-right text-green-600">GHS {inv.amountPaid.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-red-600">GHS {inv.balance.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
