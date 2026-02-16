import { useState, useEffect } from 'react';
import { billingService } from '../../services/billing.service';
import {
  FileText, Send, CheckCircle, XCircle, DollarSign,
  Search, Download, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';

interface NHISClaim {
  id: string;
  claimNumber: string;
  nhisNumber: string;
  patientId: string;
  claimDate: string;
  totalAmount: number;
  approvedAmount: number | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    quantity: number;
    amount: number;
    approvedAmount: number | null;
    status: string;
    tariff: { code: string; description: string; price: number };
  }>;
}

interface ClaimsSummary {
  draft: { count: number; amount: number };
  submitted: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number; amount: number };
  paid: { count: number; amount: number };
}

export default function NHISClaimsManager() {
  const [claims, setClaims] = useState<NHISClaim[]>([]);
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<NHISClaim | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadClaims();
    loadSummary();
  }, [statusFilter]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await billingService.getNHISClaims({ status: statusFilter || undefined });
      setClaims(data);
    } catch (err) {
      console.error('Failed to load NHIS claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await billingService.getNHISClaimsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const handleSubmitClaim = async (claimId: string) => {
    try {
      await billingService.submitNHISClaim(claimId);
      loadClaims();
      loadSummary();
      if (selectedClaim?.id === claimId) {
        const updated = await billingService.getNHISClaimById(claimId);
        setSelectedClaim(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDownloadXML = async (claimId: string) => {
    try {
      const xml = await billingService.getNHISClaimXML(claimId);
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhis-claim-${claimId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleBatchXML = async () => {
    const submittedClaims = claims.filter(c => c.status === 'SUBMITTED');
    if (submittedClaims.length === 0) {
      alert('No submitted claims to export');
      return;
    }
    try {
      const xml = await billingService.getNHISBatchXML(submittedClaims.map(c => c.id));
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nhis-batch-claims.xml';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'PAID': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="w-4 h-4" />;
      case 'SUBMITTED': return <Send className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      case 'PAID': return <DollarSign className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredClaims = claims.filter(c =>
    !searchTerm ||
    c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nhisNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Detail view
  if (showDetail && selectedClaim) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setShowDetail(false)} className="text-blue-600 hover:underline mb-4">
          ← Back to Claims
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">{selectedClaim.claimNumber}</h2>
              <p className="text-gray-500">NHIS #: {selectedClaim.nhisNumber}</p>
              <p className="text-gray-500">Date: {new Date(selectedClaim.claimDate).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(selectedClaim.status)}`}>
                {getStatusIcon(selectedClaim.status)} {selectedClaim.status}
              </span>
              {selectedClaim.status === 'DRAFT' && (
                <button onClick={() => handleSubmitClaim(selectedClaim.id)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1">
                  <Send className="w-3 h-3" /> Submit
                </button>
              )}
              {selectedClaim.status === 'SUBMITTED' && (
                <button onClick={() => handleDownloadXML(selectedClaim.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download XML
                </button>
              )}
            </div>
          </div>

          {selectedClaim.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Rejection Reason</p>
                <p className="text-red-600 text-sm">{selectedClaim.rejectionReason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Claimed Amount</p>
              <p className="text-xl font-bold">GHS {selectedClaim.totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Approved Amount</p>
              <p className="text-xl font-bold text-green-600">
                {selectedClaim.approvedAmount !== null ? `GHS ${selectedClaim.approvedAmount.toFixed(2)}` : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-xl font-bold">
                {selectedClaim.submittedAt ? new Date(selectedClaim.submittedAt).toLocaleDateString() : 'Not yet'}
              </p>
            </div>
          </div>

          <h3 className="font-semibold mb-3">Claim Items</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="p-3">Tariff Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Approved</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedClaim.items?.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-mono text-sm">{item.tariff.code}</td>
                  <td className="p-3">{item.tariff.description}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">GHS {item.amount.toFixed(2)}</td>
                  <td className="p-3">{item.approvedAmount !== null ? `GHS ${item.approvedAmount.toFixed(2)}` : '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.status)}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NHIS Claims Management</h1>
          <p className="text-gray-500">Manage and submit NHIS insurance claims</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBatchXML}
            className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
          >
            <Download className="w-4 h-4" /> Export Batch XML
          </button>
          <button
            onClick={() => { loadClaims(); loadSummary(); }}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Draft', ...summary.draft, color: 'gray', icon: FileText },
            { label: 'Submitted', ...summary.submitted, color: 'blue', icon: Send },
            { label: 'Approved', ...summary.approved, color: 'green', icon: CheckCircle },
            { label: 'Rejected', ...summary.rejected, color: 'red', icon: XCircle },
            { label: 'Paid', ...summary.paid, color: 'purple', icon: DollarSign },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-blue-200"
              onClick={() => setStatusFilter(card.label.toUpperCase())}>
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 text-${card.color}-600`} />
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.count}</p>
              <p className="text-sm text-gray-500">GHS {card.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by claim or NHIS number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {/* Claims table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="p-3">Claim #</th>
              <th className="p-3">NHIS #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Items</th>
              <th className="p-3">Claimed</th>
              <th className="p-3">Approved</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredClaims.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">No claims found</td></tr>
            ) : (
              filteredClaims.map(claim => (
                <tr key={claim.id} className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedClaim(claim); setShowDetail(true); }}>
                  <td className="p-3 font-medium text-blue-600">{claim.claimNumber}</td>
                  <td className="p-3 font-mono text-sm">{claim.nhisNumber}</td>
                  <td className="p-3 text-sm">{new Date(claim.claimDate).toLocaleDateString()}</td>
                  <td className="p-3">{claim.items?.length || 0}</td>
                  <td className="p-3 font-medium">GHS {claim.totalAmount.toFixed(2)}</td>
                  <td className="p-3">
                    {claim.approvedAmount !== null ? `GHS ${claim.approvedAmount.toFixed(2)}` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(claim.status)}`}>
                      {getStatusIcon(claim.status)} {claim.status}
                    </span>
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {claim.status === 'DRAFT' && (
                        <button onClick={() => handleSubmitClaim(claim.id)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border rounded">
                          Submit
                        </button>
                      )}
                      {claim.status === 'SUBMITTED' && (
                        <button onClick={() => handleDownloadXML(claim.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border rounded">
                          XML
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
