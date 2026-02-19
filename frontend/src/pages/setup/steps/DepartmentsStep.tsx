import React, { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

const PRESET_DEPTS = [
  { name: 'Outpatient Department (OPD)', code: 'OPD', category: 'Clinical', default: true },
  { name: 'Emergency Department', code: 'ER', category: 'Clinical', default: true },
  { name: 'Inpatient Department (IPD)', code: 'IPD', category: 'Clinical', default: true },
  { name: 'Pharmacy', code: 'PHARM', category: 'Support Services', default: true },
  { name: 'Laboratory', code: 'LAB', category: 'Diagnostics', default: true },
  { name: 'Radiology', code: 'RAD', category: 'Diagnostics', default: false },
  { name: 'Maternity/Obstetrics', code: 'MAT', category: 'Clinical', default: false },
  { name: 'Surgery/Theatre', code: 'SURG', category: 'Clinical', default: false },
  { name: 'Nursing', code: 'NURS', category: 'Clinical', default: true },
  { name: 'Administration', code: 'ADMIN', category: 'Administrative', default: true },
  { name: 'Finance/Billing', code: 'FIN', category: 'Administrative', default: true },
  { name: 'Records/Medical Records', code: 'MR', category: 'Support Services', default: false },
];

interface Props { onSave: (data: any) => void; saving: boolean; }

const DepartmentsStep: React.FC<Props> = ({ onSave, saving }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(PRESET_DEPTS.filter(d => d.default).map(d => d.code)));
  const [customDepts, setCustomDepts] = useState<{ name: string; code: string; category: string }[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState('');

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelected(next);
  };

  const addCustom = () => {
    if (!customName || !customCode) return;
    setCustomDepts([...customDepts, { name: customName, code: customCode.toUpperCase(), category: 'Custom' }]);
    setCustomName(''); setCustomCode(''); setShowCustom(false);
  };

  const handleSubmit = () => {
    const mandatory = ['OPD', 'PHARM', 'LAB'];
    const missing = mandatory.filter(c => !selected.has(c));
    if (missing.length > 0) { setError(`Required departments: ${missing.join(', ')}`); return; }
    if (selected.size + customDepts.length < 3) { setError('Select at least 3 departments'); return; }
    setError('');
    const departments = [
      ...PRESET_DEPTS.filter(d => selected.has(d.code)).map(d => ({ name: d.name, code: d.code, category: d.category })),
      ...customDepts,
    ];
    onSave({ departments });
  };

  const catColors: Record<string, string> = {
    Clinical: 'bg-blue-50 border-blue-200 text-blue-700',
    Diagnostics: 'bg-purple-50 border-purple-200 text-purple-700',
    'Support Services': 'bg-green-50 border-green-200 text-green-700',
    Administrative: 'bg-amber-50 border-amber-200 text-amber-700',
    Custom: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Select the departments your hospital has. OPD, Pharmacy, and Laboratory are required.</p>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PRESET_DEPTS.map(d => {
          const active = selected.has(d.code);
          const mandatory = ['OPD', 'PHARM', 'LAB'].includes(d.code);
          return (
            <button key={d.code} type="button" onClick={() => !mandatory && toggle(d.code)}
              className={`p-3 rounded-xl border-2 text-left transition ${active ? catColors[d.category] || 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'} ${mandatory ? 'cursor-default' : 'cursor-pointer'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${active ? '' : 'text-gray-500'}`}>{d.name}</span>
                {active && <span className="text-xs">✓</span>}
              </div>
              <span className="text-xs opacity-60">{d.code} &middot; {d.category}</span>
              {mandatory && <span className="block text-xs text-red-400 mt-1">Required</span>}
            </button>
          );
        })}

        {customDepts.map((d, i) => (
          <div key={`c-${i}`} className="p-3 rounded-xl border-2 bg-gray-50 border-gray-300 text-left relative">
            <button type="button" onClick={() => setCustomDepts(customDepts.filter((_, j) => j !== i))} className="absolute top-1 right-1 text-gray-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-gray-700">{d.name}</span>
            <span className="block text-xs text-gray-400">{d.code} &middot; Custom</span>
          </div>
        ))}
      </div>

      {showCustom ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Name</label>
            <input className="w-full px-3 py-2 border rounded-lg text-sm" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Department name" />
          </div>
          <div className="w-24">
            <label className="text-xs text-gray-500">Code</label>
            <input className="w-full px-3 py-2 border rounded-lg text-sm" value={customCode} onChange={e => setCustomCode(e.target.value)} placeholder="CODE" maxLength={5} />
          </div>
          <button type="button" onClick={addCustom} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add</button>
          <button type="button" onClick={() => setShowCustom(false)} className="px-3 py-2 text-gray-500 text-sm">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowCustom(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Custom Department
        </button>
      )}

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </div>
  );
};

export default DepartmentsStep;
