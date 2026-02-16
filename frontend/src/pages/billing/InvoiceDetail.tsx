import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billingService, Invoice } from '../../services/billing.service';
import {
  ArrowLeft, Printer, CreditCard, XCircle, FileText,
  CheckCircle, Clock, AlertTriangle, Phone
} from 'lucide-react';

export default function InvoiceDetail() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionRef: '',
    notes: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await billingService.getInvoiceById(invoiceId!);
      setInvoice(data);
      setPaymentData(prev => ({ ...prev, amount: data.balance }));
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || paymentData.amount <= 0) return;
    try {
      setProcessing(true);
      await billingService.recordPayment({
        invoiceId: invoice.id,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionRef: paymentData.transactionRef || undefined,
        notes: paymentData.notes || undefined,
      });
      setShowPayment(false);
      loadInvoice();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      await billingService.cancelInvoice(invoice.id, reason);
      loadInvoice();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING': return { color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'PARTIAL': return { color: 'bg-blue-100 text-blue-700', icon: AlertTriangle };
      case 'PAID': return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'CANCELLED': return { color: 'bg-red-100 text-red-700', icon: XCircle };
      default: return { color: 'bg-gray-100 text-gray-700', icon: FileText };
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6 text-center text-red-500">Invoice not found</div>;
  }

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4 flex items-center gap-1 no-print">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <p className="text-gray-500 mt-1">
                Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" /> {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Patient info */}
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Patient</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-medium">{invoice.patient.firstName} {invoice.patient.lastName}</p>
              <p className="text-sm text-gray-500">MRN: {invoice.patient.mrn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {invoice.patient.phonePrimary || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="p-6 border-b">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Items</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-2">#</th>
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit Price</th>
                <th className="pb-2 text-right">Discount</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 text-sm text-gray-400">{idx + 1}</td>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">GHS {item.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right">{item.discount > 0 ? `GHS ${item.discount.toFixed(2)}` : '-'}</td>
                  <td className="py-2 text-right font-medium">GHS {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-6 border-b">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span>GHS {invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-GHS {invoice.discount.toFixed(2)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax:</span>
                  <span>GHS {invoice.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>GHS {invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid:</span>
                <span className="text-green-600">GHS {invoice.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Balance:</span>
                <span className={invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                  GHS {invoice.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map(payment => (
                <div key={payment.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium">GHS {payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">
                      {payment.paymentMethod} {payment.transactionRef ? `• Ref: ${payment.transactionRef}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 flex justify-between no-print">
          <div className="flex gap-2">
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button onClick={handleCancel} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Cancel Invoice
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <Printer className="w-4 h-4" /> Print
            </button>
            {invoice.balance > 0 && invoice.status !== 'CANCELLED' && (
              <button onClick={() => setShowPayment(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                <CreditCard className="w-4 h-4" /> Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                <input
                  type="number"
                  step={0.01}
                  max={invoice.balance}
                  value={paymentData.amount}
                  onChange={e => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border rounded-lg p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Balance: GHS {invoice.balance.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={e => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="MTN_MOMO">MTN Mobile Money</option>
                  <option value="VODAFONE_CASH">Vodafone Cash</option>
                  <option value="AIRTELTIGO_MONEY">AirtelTigo Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="INSURANCE">Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentData.transactionRef}
                  onChange={e => setPaymentData(prev => ({ ...prev, transactionRef: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={e => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPayment(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handlePayment}
                disabled={processing || paymentData.amount <= 0 || paymentData.amount > invoice.balance}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Pay GHS ${paymentData.amount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
