import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { portalService, PortalInvoice } from '../services/portal.service';
import { format } from 'date-fns';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    setIsLoading(true);
    const status = filter === 'pending' ? 'SENT' : filter === 'paid' ? 'PAID' : undefined;
    portalService.getInvoices(status).then(setInvoices).catch(console.error).finally(() => setIsLoading(false));
  }, [filter]);

  const statusIcon = (status: string) => {
    if (status === 'PAID') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'OVERDUE') return <AlertCircle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-amber-500" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bills & Payments</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'pending', 'paid'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Receipt className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(inv.status)}
                    <span className="font-medium text-gray-800">{inv.invoiceNumber}</span>
                  </div>
                  <p className="text-xs text-gray-400">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">GH₵ {inv.totalAmount.toFixed(2)}</p>
                  {inv.balanceDue > 0 && (
                    <p className="text-sm text-amber-600">Balance: GH₵ {inv.balanceDue.toFixed(2)}</p>
                  )}
                  {inv.balanceDue <= 0 && inv.status === 'PAID' && (
                    <p className="text-sm text-green-600">Fully Paid</p>
                  )}
                </div>
              </div>
              {inv.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="space-y-1">
                    {inv.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.description}</span>
                        <span className="text-gray-800">GH₵ {item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                    {inv.items.length > 3 && <p className="text-xs text-gray-400">+{inv.items.length - 3} more items</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoices;
