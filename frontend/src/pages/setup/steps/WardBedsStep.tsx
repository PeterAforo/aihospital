import React, { useState } from 'react';
import { Loader2, Plus, Trash2, BedDouble } from 'lucide-react';

const WARD_TYPES = ['General', 'Male', 'Female', 'Pediatric', 'Maternity', 'ICU'];
const TEMPLATES = [
  { label: 'Small Hospital (20 beds)', wards: [{ name: 'General Ward', ward_type: 'General', beds: 15 }, { name: 'Maternity Ward', ward_type: 'Maternity', beds: 5 }] },
  { label: 'Medium Hospital (50 beds)', wards: [{ name: 'Male Ward', ward_type: 'Male', beds: 15 }, { name: 'Female Ward', ward_type: 'Female', beds: 15 }, { name: 'Pediatric Ward', ward_type: 'Pediatric', beds: 10 }, { name: 'Maternity Ward', ward_type: 'Maternity', beds: 10 }] },
];

interface Ward { name: string; ward_type: string; beds: number; }
interface Props { onSave: (data: any) => void; saving: boolean; }

const WardBedsStep: React.FC<Props> = ({ onSave, saving }) => {
  const [wards, setWards] = useState<Ward[]>([]);

  const update = (i: number, k: keyof Ward, v: any) => {
    const next = [...wards];
    next[i] = { ...next[i], [k]: k === 'beds' ? Number(v) || 0 : v };
    setWards(next);
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => setWards(t.wards.map(w => ({ ...w })));

  const totalBeds = wards.reduce((s, w) => s + w.beds, 0);

  const handleSubmit = () => onSave({ wards });

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm";

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Configure your wards and beds for inpatient management. This step is optional.</p>

      {/* Quick templates */}
      <div className="flex items-center justify-center gap-3">
        {TEMPLATES.map((t, i) => (
          <button key={i} type="button" onClick={() => applyTemplate(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition border border-gray-200">
            <BedDouble className="w-4 h-4 inline mr-1" /> {t.label}
          </button>
        ))}
      </div>

      {wards.length > 0 && (
        <div className="text-center">
          <span className="text-sm text-gray-500">{wards.length} ward(s), {totalBeds} total beds</span>
        </div>
      )}

      {wards.map((w, i) => (
        <div key={i} className="border rounded-xl p-4 bg-gray-50 relative">
          <button type="button" onClick={() => setWards(wards.filter((_, j) => j !== i))} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Ward Name</label>
              <input className={inputCls} value={w.name} onChange={e => update(i, 'name', e.target.value)} placeholder="e.g., General Ward" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Ward Type</label>
              <select className={inputCls} value={w.ward_type} onChange={e => update(i, 'ward_type', e.target.value)}>
                <option value="">Select type</option>
                {WARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Number of Beds</label>
              <input type="number" className={inputCls} value={w.beds || ''} onChange={e => update(i, 'beds', e.target.value)} min={1} placeholder="e.g., 10" />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setWards([...wards, { name: '', ward_type: '', beds: 0 }])}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2 text-sm">
        <Plus className="w-4 h-4" /> Add Ward
      </button>

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {wards.length > 0 ? 'Save & Continue' : 'Skip for Now'}
        </button>
      </div>
    </div>
  );
};

export default WardBedsStep;
