import React, { useState } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';

const PACKAGES = [
  {
    name: 'Basic Lab Package',
    recommended: true,
    tests: ['Complete Blood Count (CBC)', 'Malaria Rapid Test', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)', 'Urinalysis', 'Stool Examination', 'Blood Group & Rh', 'Pregnancy Test (Urine)'],
  },
  {
    name: 'Advanced Lab Package',
    recommended: false,
    tests: ['Liver Function Test (LFT)', 'Renal Function Test (RFT)', 'Lipid Profile', 'Electrolytes', 'HIV Test', 'Hepatitis B Surface Antigen', 'Blood Culture', 'Sputum for AFB (TB test)'],
  },
];

interface Props { onSave: (data: any) => void; saving: boolean; }

const LabTestsStep: React.FC<Props> = ({ onSave, saving }) => {
  const basicTests = new Set(PACKAGES[0].tests);
  const [selected, setSelected] = useState<Set<string>>(new Set(basicTests));

  const toggle = (test: string) => {
    const next = new Set(selected);
    if (next.has(test)) next.delete(test); else next.add(test);
    setSelected(next);
  };

  const selectPackage = (pkg: typeof PACKAGES[0]) => {
    const next = new Set(selected);
    const allIn = pkg.tests.every(t => next.has(t));
    pkg.tests.forEach(t => allIn ? next.delete(t) : next.add(t));
    setSelected(next);
  };

  const handleSubmit = () => {
    if (selected.size < 5) return;
    onSave({ tests: Array.from(selected) });
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Select lab tests your facility offers. Minimum 5 tests required.</p>

      <div className="flex items-center justify-center">
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${selected.size >= 5 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {selected.size} tests selected (min 5)
        </span>
      </div>

      {PACKAGES.map(pkg => {
        const allIn = pkg.tests.every(t => selected.has(t));
        const someIn = pkg.tests.some(t => selected.has(t));
        return (
          <div key={pkg.name} className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-sm text-gray-800">{pkg.name}</p>
                  <p className="text-xs text-gray-400">{pkg.tests.length} tests</p>
                </div>
                {pkg.recommended && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Recommended</span>}
              </div>
              <button type="button" onClick={() => selectPackage(pkg)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${allIn ? 'bg-green-100 text-green-700' : someIn ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {allIn ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {pkg.tests.map(t => (
                <button key={t} type="button" onClick={() => toggle(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    selected.has(t) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving || selected.size < 5}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </div>
  );
};

export default LabTestsStep;
