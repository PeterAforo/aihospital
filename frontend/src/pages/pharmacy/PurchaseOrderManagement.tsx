import { useState, useEffect } from 'react';
import { pharmacyService, PurchaseOrder, Supplier } from '../../services/pharmacy.service';
import {
  Plus, CheckCircle, XCircle, Search, Filter,
  DollarSign, ClipboardList
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'detail';

export default function PurchaseOrderManagement() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create form state
  const [newOrder, setNewOrder] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ drugId: '', drugName: '', quantityOrdered: 0, unitCost: 0 }],
  });
  const [drugs, setDrugs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadSuppliers();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await pharmacyService.getPurchaseOrders({
        status: statusFilter || undefined,
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await pharmacyService.getSuppliers(true);
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const loadDrugs = async () => {
    try {
      const data = await pharmacyService.getStock();
      const uniqueDrugs = Array.from(
        new Map(data.map(s => [s.drugId, s.drug])).values()
      );
      setDrugs(uniqueDrugs);
    } catch (err) {
      console.error('Failed to load drugs:', err);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplierId || newOrder.items.length === 0) return;
    const validItems = newOrder.items.filter(i => i.drugId && i.quantityOrdered > 0 && i.unitCost > 0);
    if (validItems.length === 0) return;

    try {
      setSubmitting(true);
      await pharmacyService.createPurchaseOrder({
        supplierId: newOrder.supplierId,
        expectedDate: newOrder.expectedDate || undefined,
        notes: newOrder.notes || undefined,
        items: validItems.map(i => ({
          drugId: i.drugId,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
        })),
      });
      setViewMode('list');
      setNewOrder({ supplierId: '', expectedDate: '', notes: '', items: [{ drugId: '', drugName: '', quantityOrdered: 0, unitCost: 0 }] });
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOrder = async (id: string) => {
    try {
      await pharmacyService.submitPurchaseOrder(id);
      loadOrders();
      if (selectedOrder?.id === id) {
        const updated = await pharmacyService.getPurchaseOrderById(id);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      await pharmacyService.approvePurchaseOrder(id);
      loadOrders();
      if (selectedOrder?.id === id) {
        const updated = await pharmacyService.getPurchaseOrderById(id);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!confirm('Cancel this purchase order?')) return;
    try {
      await pharmacyService.cancelPurchaseOrder(id);
      loadOrders();
      if (selectedOrder?.id === id) setViewMode('list');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const addItemRow = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { drugId: '', drugName: '', quantityOrdered: 0, unitCost: 0 }],
    }));
  };

  const removeItemRow = (idx: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'RECEIVED': return 'bg-purple-100 text-purple-700';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = orders.filter(o =>
    !searchTerm ||
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Detail view
  if (viewMode === 'detail' && selectedOrder) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setViewMode('list')} className="text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to Purchase Orders
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">{selectedOrder.orderNumber}</h2>
              <p className="text-gray-500">Supplier: {selectedOrder.supplier?.name}</p>
              <p className="text-gray-500">Order Date: {new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
              {selectedOrder.expectedDate && (
                <p className="text-gray-500">Expected: {new Date(selectedOrder.expectedDate).toLocaleDateString()}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
              {selectedOrder.status === 'DRAFT' && (
                <>
                  <button onClick={() => handleSubmitOrder(selectedOrder.id)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Submit</button>
                  <button onClick={() => handleCancelOrder(selectedOrder.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">Cancel</button>
                </>
              )}
              {selectedOrder.status === 'SUBMITTED' && (
                <button onClick={() => handleApproveOrder(selectedOrder.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Approve</button>
              )}
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="p-3">Drug</th>
                <th className="p-3">Qty Ordered</th>
                <th className="p-3">Qty Received</th>
                <th className="p-3">Unit Cost</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items?.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.drug?.genericName} {item.drug?.strength}</td>
                  <td className="p-3">{item.quantityOrdered}</td>
                  <td className="p-3">{item.quantityReceived}</td>
                  <td className="p-3">GHS {item.unitCost.toFixed(2)}</td>
                  <td className="p-3 font-medium">GHS {item.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td colSpan={4} className="p-3 text-right">Total:</td>
                <td className="p-3">GHS {selectedOrder.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // Create view
  if (viewMode === 'create') {
    if (drugs.length === 0) loadDrugs();
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setViewMode('list')} className="text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to Purchase Orders
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Create Purchase Order</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select
                value={newOrder.supplierId}
                onChange={e => setNewOrder(prev => ({ ...prev, supplierId: e.target.value }))}
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={newOrder.expectedDate}
                onChange={e => setNewOrder(prev => ({ ...prev, expectedDate: e.target.value }))}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={newOrder.notes}
                onChange={e => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border rounded-lg p-2"
                rows={2}
              />
            </div>
          </div>

          <h3 className="font-semibold mb-3">Order Items</h3>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="p-2">Drug</th>
                <th className="p-2 w-28">Quantity</th>
                <th className="p-2 w-32">Unit Cost (GHS)</th>
                <th className="p-2 w-32">Total</th>
                <th className="p-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {newOrder.items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <select
                      value={item.drugId}
                      onChange={e => {
                        const drug = drugs.find(d => d.id === e.target.value);
                        updateItem(idx, 'drugId', e.target.value);
                        if (drug) updateItem(idx, 'drugName', drug.genericName);
                      }}
                      className="w-full border rounded p-1.5 text-sm"
                    >
                      <option value="">Select drug...</option>
                      {drugs.map(d => (
                        <option key={d.id} value={d.id}>{d.genericName} {d.strength} ({d.form})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantityOrdered || ''}
                      onChange={e => updateItem(idx, 'quantityOrdered', parseInt(e.target.value) || 0)}
                      className="w-full border rounded p-1.5 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitCost || ''}
                      onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded p-1.5 text-sm"
                    />
                  </td>
                  <td className="p-2 text-sm font-medium">
                    GHS {(item.quantityOrdered * item.unitCost).toFixed(2)}
                  </td>
                  <td className="p-2">
                    {newOrder.items.length > 1 && (
                      <button onClick={() => removeItemRow(idx)} className="text-red-500 hover:text-red-700">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center">
            <button onClick={addItemRow} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <div className="text-right">
              <p className="text-lg font-bold">
                Total: GHS {newOrder.items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost, 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setViewMode('list')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleCreateOrder}
              disabled={submitting || !newOrder.supplierId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500">Manage drug procurement and purchase orders</p>
        </div>
        <button
          onClick={() => { setViewMode('create'); loadDrugs(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number or supplier..."
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
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: orders.length, icon: ClipboardList, color: 'blue' },
          { label: 'Pending Approval', value: orders.filter(o => o.status === 'SUBMITTED').length, icon: Filter, color: 'yellow' },
          { label: 'Approved', value: orders.filter(o => o.status === 'APPROVED').length, icon: CheckCircle, color: 'green' },
          { label: 'Total Value', value: `GHS ${orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(0)}`, icon: DollarSign, color: 'purple' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${card.color}-100`}>
                <card.icon className={`w-5 h-5 text-${card.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="p-3">Order #</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Date</th>
              <th className="p-3">Expected</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">No purchase orders found</td></tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedOrder(order); setViewMode('detail'); }}>
                  <td className="p-3 font-medium text-blue-600">{order.orderNumber}</td>
                  <td className="p-3">{order.supplier?.name}</td>
                  <td className="p-3 text-sm">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="p-3 text-sm">{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3">{order.items?.length || 0}</td>
                  <td className="p-3 font-medium">GHS {order.totalAmount.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {order.status === 'DRAFT' && (
                        <button onClick={() => handleSubmitOrder(order.id)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border rounded">Submit</button>
                      )}
                      {order.status === 'SUBMITTED' && (
                        <button onClick={() => handleApproveOrder(order.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border rounded">Approve</button>
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
