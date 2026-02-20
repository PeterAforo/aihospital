import React, { useState, useEffect } from 'react';
import { Package, Truck, ClipboardCheck, Warehouse, ArrowRightLeft, FileText, Plus, Check, X, Send, RefreshCw } from 'lucide-react';
import * as api from '../../services/procurement.service';

type Tab = 'suppliers' | 'po' | 'grn' | 'central' | 'issues' | 'movements';
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-blue-100 text-blue-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700', FULLY_RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-200 text-gray-500', PENDING_VERIFICATION: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-green-100 text-green-700',
};
const Badge = ({ status }: { status: string }) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>{status.replace(/_/g, ' ')}</span>;

export default function ProcurementPage() {
  const [tab, setTab] = useState<Tab>('suppliers');
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'suppliers', label: 'Suppliers', icon: <Truck size={16} /> },
    { key: 'po', label: 'Purchase Orders', icon: <FileText size={16} /> },
    { key: 'grn', label: 'Goods Received', icon: <ClipboardCheck size={16} /> },
    { key: 'central', label: 'Central Store', icon: <Warehouse size={16} /> },
    { key: 'issues', label: 'Stock Issues', icon: <ArrowRightLeft size={16} /> },
    { key: 'movements', label: 'Movements', icon: <Package size={16} /> },
  ];
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Procurement & Supply Chain</h1>
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'po' && <POTab />}
      {tab === 'grn' && <GRNTab />}
      {tab === 'central' && <CentralTab />}
      {tab === 'issues' && <IssuesTab />}
      {tab === 'movements' && <MovementsTab />}
    </div>
  );
}

function SuppliersTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ supplierName: '', supplierCode: '', contactPerson: '', phone: '', email: '', supplierType: 'DRUGS' });
  const load = () => { setLoading(true); api.getSuppliers(false).then(r => setData(r.data.data || r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  const save = async () => { try { await api.createSupplier(f); setShow(false); load(); } catch (e: any) { alert(e.response?.data?.error || e.message); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-lg font-semibold">Suppliers</h2><button onClick={() => setShow(!show)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"><Plus size={16}/>Add</button></div>
      {show && <div className="bg-white border rounded-lg p-4 grid grid-cols-3 gap-3">
        <input placeholder="Name *" value={f.supplierName} onChange={e => setF({...f, supplierName: e.target.value})} className="border rounded px-3 py-2 text-sm"/>
        <input placeholder="Code *" value={f.supplierCode} onChange={e => setF({...f, supplierCode: e.target.value})} className="border rounded px-3 py-2 text-sm"/>
        <input placeholder="Contact" value={f.contactPerson} onChange={e => setF({...f, contactPerson: e.target.value})} className="border rounded px-3 py-2 text-sm"/>
        <input placeholder="Phone" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} className="border rounded px-3 py-2 text-sm"/>
        <input placeholder="Email" value={f.email} onChange={e => setF({...f, email: e.target.value})} className="border rounded px-3 py-2 text-sm"/>
        <select value={f.supplierType} onChange={e => setF({...f, supplierType: e.target.value})} className="border rounded px-3 py-2 text-sm">
          <option value="DRUGS">Drugs</option><option value="MEDICAL_SUPPLIES">Medical Supplies</option><option value="REAGENTS">Reagents</option>
        </select>
        <div className="col-span-full flex gap-2"><button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Save</button><button onClick={() => setShow(false)} className="px-4 py-2 bg-gray-200 rounded text-sm">Cancel</button></div>
      </div>}
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Contact</th><th className="text-left px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{data.map(s => <tr key={s.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{s.supplierCode}</td><td className="px-4 py-3 font-medium">{s.supplierName}</td><td className="px-4 py-3">{s.supplierType||'-'}</td><td className="px-4 py-3">{s.contactPerson||'-'}</td><td className="px-4 py-3">{s.isActive?<span className="text-green-600 text-xs">Active</span>:<span className="text-red-500 text-xs">Inactive</span>}</td></tr>)}
        {!data.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No suppliers</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}

function POTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.getPurchaseOrders().then(r => setData(r.data.data||r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  const act = async (id: string, a: string) => { try { if(a==='submit') await api.submitPurchaseOrder(id); else if(a==='approve') await api.approvePurchaseOrder(id); else if(a==='reject') await api.rejectPurchaseOrder(id); else if(a==='cancel') await api.cancelPurchaseOrder(id); load(); } catch(e:any){alert(e.response?.data?.error||e.message);} };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-lg font-semibold">Purchase Orders</h2><button onClick={load} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"><RefreshCw size={14}/>Refresh</button></div>
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">PO #</th><th className="text-left px-4 py-3">Supplier</th><th className="text-left px-4 py-3">Date</th><th className="text-right px-4 py-3">Total</th><th className="text-left px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y">{data.map(o => <tr key={o.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 font-mono text-xs">{o.poNumber}</td><td className="px-4 py-3">{o.supplier?.supplierName||'-'}</td><td className="px-4 py-3">{new Date(o.orderDate).toLocaleDateString()}</td>
          <td className="px-4 py-3 text-right">GH₵{o.totalAmount?.toFixed(2)}</td><td className="px-4 py-3"><Badge status={o.status}/></td>
          <td className="px-4 py-3 flex gap-1">{o.status==='DRAFT'&&<button onClick={()=>act(o.id,'submit')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Submit"><Send size={14}/></button>}
          {o.status==='SUBMITTED'&&<><button onClick={()=>act(o.id,'approve')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><Check size={14}/></button><button onClick={()=>act(o.id,'reject')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><X size={14}/></button></>}</td>
        </tr>)}{!data.length&&<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No purchase orders</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}

function GRNTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.getGRNs().then(r => setData(r.data.data||r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  const verify = async (id: string) => { try { await api.verifyGRN(id); load(); } catch(e:any){alert(e.response?.data?.message||e.message);} };
  const reject = async (id: string) => { try { await api.rejectGRN(id); load(); } catch(e:any){alert(e.response?.data?.message||e.message);} };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-lg font-semibold">Goods Received Notes</h2><button onClick={load} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"><RefreshCw size={14}/>Refresh</button></div>
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">GRN #</th><th className="text-left px-4 py-3">Supplier</th><th className="text-left px-4 py-3">PO</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Items</th><th className="text-left px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y">{data.map(g => <tr key={g.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 font-mono text-xs">{g.grnNumber}</td><td className="px-4 py-3">{g.supplier?.supplierName||'-'}</td><td className="px-4 py-3 text-xs">{g.purchaseOrder?.poNumber||'-'}</td>
          <td className="px-4 py-3">{new Date(g.receivedDate).toLocaleDateString()}</td><td className="px-4 py-3">{g.items?.length||0}</td><td className="px-4 py-3"><Badge status={g.status}/></td>
          <td className="px-4 py-3 flex gap-1">{g.status==='PENDING_VERIFICATION'&&<><button onClick={()=>verify(g.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Verify"><Check size={14}/></button><button onClick={()=>reject(g.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><X size={14}/></button></>}</td>
        </tr>)}{!data.length&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No GRNs</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}

function CentralTab() {
  const [data, setData] = useState<any[]>([]);
  const [val, setVal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); Promise.all([api.getCentralInventory(), api.getCentralValuation()]).then(([r1,r2]) => { setData(r1.data.data||r1.data); setVal(r2.data.data||r2.data); }).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Central Store Inventory</h2>
      {val && <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Total Items</p><p className="text-2xl font-bold">{val.totalItems}</p></div>
        <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Total Units</p><p className="text-2xl font-bold">{val.totalUnits?.toLocaleString()}</p></div>
        <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">Total Value</p><p className="text-2xl font-bold text-green-600">GH₵{val.totalValue?.toFixed(2)}</p></div>
      </div>}
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Item</th><th className="text-left px-4 py-3">Type</th><th className="text-right px-4 py-3">Qty</th><th className="text-right px-4 py-3">Avg Cost</th><th className="text-right px-4 py-3">Value</th><th className="text-left px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{data.map(i => <tr key={i.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 font-mono text-xs">{i.itemCode}</td><td className="px-4 py-3 font-medium">{i.itemName}</td><td className="px-4 py-3 text-xs">{i.itemType}</td>
          <td className="px-4 py-3 text-right">{i.quantityOnHand}</td><td className="px-4 py-3 text-right">GH₵{i.averageCost?.toFixed(2)}</td><td className="px-4 py-3 text-right font-medium">GH₵{i.totalValue?.toFixed(2)}</td>
          <td className="px-4 py-3">{i.quantityOnHand<=i.reorderLevel?<span className="text-red-600 text-xs font-medium flex items-center gap-1">Low Stock</span>:<span className="text-green-600 text-xs">OK</span>}</td>
        </tr>)}{!data.length&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No inventory items</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}

function IssuesTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.getStockIssues().then(r => setData(r.data.data||r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stock Issues (Central → Department)</h2>
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Issue #</th><th className="text-left px-4 py-3">Department</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Items</th></tr></thead>
        <tbody className="divide-y">{data.map(i => <tr key={i.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 font-mono text-xs">{i.issueNumber}</td><td className="px-4 py-3">{i.issuedToDepartment}</td>
          <td className="px-4 py-3">{new Date(i.issueDate).toLocaleDateString()}</td><td className="px-4 py-3">{i.items?.length||0}</td>
        </tr>)}{!data.length&&<tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No stock issues</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}

function MovementsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const load = () => { setLoading(true); api.getStockMovements({ movementType: filter||undefined, limit: 200 }).then(r => setData(r.data.data||r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, [filter]);
  const types = ['PURCHASE_GRN','ISSUE_TO_DEPARTMENT','TRANSFER','ADJUSTMENT','DISPENSING','EXPIRED_WRITE_OFF','DAMAGED_WRITE_OFF','RETURN_TO_STORE'];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Stock Movement Audit Trail</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Types</option>{types.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : <div className="bg-white border rounded-lg overflow-auto">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Item</th><th className="text-right px-4 py-3">Qty</th><th className="text-left px-4 py-3">From</th><th className="text-left px-4 py-3">To</th><th className="text-left px-4 py-3">Ref</th></tr></thead>
        <tbody className="divide-y">{data.map(m => <tr key={m.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-xs">{new Date(m.movementDate||m.createdAt).toLocaleString()}</td>
          <td className="px-4 py-3"><Badge status={m.movementType}/></td><td className="px-4 py-3">{m.itemName}</td>
          <td className={`px-4 py-3 text-right font-medium ${m.quantity<0?'text-red-600':'text-green-600'}`}>{m.quantity>0?'+':''}{m.quantity}</td>
          <td className="px-4 py-3 text-xs">{m.fromLocation||'-'}</td><td className="px-4 py-3 text-xs">{m.toLocation||'-'}</td>
          <td className="px-4 py-3 text-xs">{m.referenceType||'-'}</td>
        </tr>)}{!data.length&&<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No movements</td></tr>}</tbody></table>
      </div>}
    </div>
  );
}
