import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingService } from '../../services/billing.service';
import { patientService } from '../../services/patient.service';
import { ArrowLeft, Plus, Trash2, Search, Receipt } from 'lucide-react';

interface LineItem {
  serviceType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface PatientResult {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phonePrimary?: string;
}

const SERVICE_TYPES = [
  'CONSULTATION', 'TRIAGE', 'DRUG', 'LAB_TEST', 'NURSING',
  'RADIOLOGY', 'SURGERY', 'WARD', 'MATERNITY', 'REGISTRATION', 'OTHER',
];

export default function NewInvoice() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientResult | null>(null);
  const [items, setItems] = useState<LineItem[]>([
    { serviceType: 'CONSULTATION', description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchPatients = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await patientService.search({ q: query });
      setResults(r.data || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const addItem = () => setItems([...items, { serviceType: 'OTHER', description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: keyof LineItem, v: string | number) => setItems(items.map((item, idx) => idx === i ? { ...item, [f]: v } : item));
  const itemTotal = (it: LineItem) => it.quantity * it.unitPrice - it.discount;
  const subtotal = items.reduce((s, it) => s + itemTotal(it), 0);

  const submit = async () => {
    if (!patient) return setError('Select a patient');
    const valid = items.filter(i => i.description.trim() && i.unitPrice > 0);
    if (!valid.length) return setError('Add at least one item with description and price');
    setSubmitting(true); setError('');
    try {
      const inv = await billingService.createInvoice({ patientId: patient.id, items: valid, notes: notes || undefined });
      navigate(`/billing/invoices/${inv.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Receipt className="w-6 h-6" /> New Invoice</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">{error}</div>}

      {/* Patient Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Patient</h2>
        {patient ? (
          <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3">
            <div>
              <p className="font-medium">{patient.firstName} {patient.lastName}</p>
              <p className="text-sm text-gray-500">MRN: {patient.mrn} {patient.phonePrimary ? `• ${patient.phonePrimary}` : ''}</p>
            </div>
            <button onClick={() => setPatient(null)} className="text-sm text-red-500 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchPatients()}
                placeholder="Search by name, MRN, or phone..." className="flex-1 border rounded-lg p-2" />
              <button onClick={searchPatients} disabled={searching} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                <Search className="w-4 h-4" /> {searching ? '...' : 'Search'}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {results.map(p => (
                  <button key={p.id} onClick={() => { setPatient(p); setResults([]); setQuery(''); }}
                    className="w-full text-left p-3 hover:bg-gray-50">
                    <p className="font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-sm text-gray-500">MRN: {p.mrn}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Items</h2>
          <button onClick={addItem} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Add Item</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 w-32">Type</th>
              <th className="pb-2">Description</th>
              <th className="pb-2 w-16 text-right">Qty</th>
              <th className="pb-2 w-24 text-right">Price</th>
              <th className="pb-2 w-24 text-right">Disc.</th>
              <th className="pb-2 w-24 text-right">Total</th>
              <th className="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <select value={item.serviceType} onChange={e => updateItem(i, 'serviceType', e.target.value)} className="w-full border rounded p-1 text-xs">
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full border rounded p-1" placeholder="Description" />
                </td>
                <td className="py-2 pr-2">
                  <input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-full border rounded p-1 text-right" />
                </td>
                <td className="py-2 pr-2">
                  <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full border rounded p-1 text-right" />
                </td>
                <td className="py-2 pr-2">
                  <input type="number" min={0} step={0.01} value={item.discount} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} className="w-full border rounded p-1 text-right" />
                </td>
                <td className="py-2 text-right font-medium">GHS {itemTotal(item).toFixed(2)}</td>
                <td className="py-2 text-center">
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600" disabled={items.length <= 1}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4 pt-3 border-t">
          <div className="text-right">
            <span className="text-gray-500 mr-4">Subtotal:</span>
            <span className="text-xl font-bold">GHS {subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-2">Notes (optional)</h2>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded-lg p-2" placeholder="Additional notes..." />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={submitting || !patient} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
          {submitting ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}
