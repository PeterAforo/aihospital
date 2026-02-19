import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const SERVICES = ['Outpatient', 'Inpatient', 'Emergency', 'Laboratory', 'Radiology', 'Pharmacy', 'Maternity', 'Surgery', 'Dental'];

interface Branch {
  branch_name: string;
  branch_code: string;
  is_primary: boolean;
  address: string;
  phone: string;
  services_offered: string[];
}

interface Props { onSave: (data: any) => void; saving: boolean; }

const empty = (): Branch => ({ branch_name: '', branch_code: '', is_primary: false, address: '', phone: '', services_offered: [] });

const BranchesStep: React.FC<Props> = ({ onSave, saving }) => {
  const [branches, setBranches] = useState<Branch[]>([{ ...empty(), is_primary: true }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (i: number, k: keyof Branch, v: any) => {
    const next = [...branches];
    (next[i] as any)[k] = v;
    if (k === 'is_primary' && v) next.forEach((b, j) => { if (j !== i) b.is_primary = false; });
    setBranches(next);
  };

  const toggleService = (i: number, svc: string) => {
    const next = [...branches];
    const s = next[i].services_offered;
    next[i].services_offered = s.includes(svc) ? s.filter(x => x !== svc) : [...s, svc];
    setBranches(next);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    branches.forEach((b, i) => {
      if (!b.branch_name) e[`${i}_name`] = 'Name required';
      if (!b.branch_code || b.branch_code.length < 2 || b.branch_code.length > 5) e[`${i}_code`] = '2-5 chars';
      if (!b.address) e[`${i}_addr`] = 'Address required';
    });
    if (!branches.some(b => b.is_primary)) e.primary = 'At least one branch must be primary';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSave({ branches });
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Add your hospital branches or locations. At least one is required.</p>

      {errors.primary && <p className="text-red-500 text-sm text-center">{errors.primary}</p>}

      {branches.map((b, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Branch {i + 1}</h3>
            {branches.length > 1 && (
              <button type="button" onClick={() => setBranches(branches.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <input className={inputCls} placeholder="Branch Name" value={b.branch_name} onChange={e => update(i, 'branch_name', e.target.value)} />
              {errors[`${i}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_name`]}</p>}
            </div>
            <div>
              <input className={inputCls} placeholder="Code (2-5 chars)" value={b.branch_code} onChange={e => update(i, 'branch_code', e.target.value.toUpperCase())} maxLength={5} />
              {errors[`${i}_code`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_code`]}</p>}
            </div>
            <div>
              <input type="tel" className={inputCls} placeholder="Phone" value={b.phone} onChange={e => update(i, 'phone', e.target.value)} />
            </div>
          </div>
          <div>
            <input className={inputCls} placeholder="Branch Address" value={b.address} onChange={e => update(i, 'address', e.target.value)} />
            {errors[`${i}_addr`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_addr`]}</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={b.is_primary} onChange={e => update(i, 'is_primary', e.target.checked)} className="rounded text-blue-600" />
            <span className="text-sm text-gray-700">Primary Branch</span>
          </label>
          <div>
            <p className="text-xs text-gray-500 mb-1">Services Offered</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(svc => (
                <button key={svc} type="button" onClick={() => toggleService(i, svc)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${b.services_offered.includes(svc) ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}>
                  {svc}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setBranches([...branches, empty()])} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2 text-sm">
        <Plus className="w-4 h-4" /> Add Another Branch
      </button>

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </form>
  );
};

export default BranchesStep;
