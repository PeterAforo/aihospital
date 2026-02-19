import React, { useState } from 'react';
import { Loader2, Package } from 'lucide-react';

const DRUG_CATEGORIES = [
  { name: 'Analgesics (Pain relievers)', drugs: ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Diclofenac 50mg', 'Tramadol 50mg', 'Morphine 10mg'] },
  { name: 'Antibiotics', drugs: ['Amoxicillin 500mg', 'Metronidazole 400mg', 'Ciprofloxacin 500mg', 'Azithromycin 250mg', 'Ceftriaxone 1g'] },
  { name: 'Antimalarials', drugs: ['Artemether-Lumefantrine', 'Artesunate 60mg', 'Quinine 300mg'] },
  { name: 'Antihypertensives', drugs: ['Amlodipine 5mg', 'Lisinopril 10mg', 'Losartan 50mg', 'Hydrochlorothiazide 25mg', 'Atenolol 50mg'] },
  { name: 'Antidiabetics', drugs: ['Metformin 500mg', 'Glibenclamide 5mg', 'Insulin (Regular)', 'Insulin (NPH)'] },
  { name: 'IV Fluids', drugs: ['Normal Saline 0.9%', 'Ringers Lactate', 'Dextrose 5%', 'Dextrose Saline'] },
  { name: 'Vitamins & Supplements', drugs: ['Folic Acid 5mg', 'Ferrous Sulphate 200mg', 'Vitamin B Complex', 'Vitamin C 100mg', 'Multivitamins'] },
];

const PRESETS = [
  { label: 'Ghana National Formulary (Recommended)', desc: '~300 essential medicines', count: 300 },
  { label: 'WHO Essential Medicines', desc: '~400 WHO-recommended medicines', count: 400 },
  { label: 'Select Manually', desc: 'Choose specific drugs', count: 0 },
];

interface Props { onSave: (data: any) => void; saving: boolean; }

const DrugFormularyStep: React.FC<Props> = ({ onSave, saving }) => {
  const [mode, setMode] = useState<'preset' | 'manual' | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedDrugs, setSelectedDrugs] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const toggleDrug = (drug: string) => {
    const next = new Set(selectedDrugs);
    if (next.has(drug)) next.delete(drug); else next.add(drug);
    setSelectedDrugs(next);
  };

  const selectAll = (cat: string) => {
    const drugs = DRUG_CATEGORIES.find(c => c.name === cat)?.drugs || [];
    const next = new Set(selectedDrugs);
    const allSelected = drugs.every(d => next.has(d));
    drugs.forEach(d => allSelected ? next.delete(d) : next.add(d));
    setSelectedDrugs(next);
  };

  const handleSubmit = () => {
    if (mode === 'preset' && selectedPreset !== null) {
      onSave({ preset: PRESETS[selectedPreset].label, count: PRESETS[selectedPreset].count });
    } else {
      onSave({ drugs: Array.from(selectedDrugs) });
    }
  };

  const canSubmit = (mode === 'preset' && selectedPreset !== null && selectedPreset < 2) || selectedDrugs.size >= 20;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Select common drugs your pharmacy stocks. Minimum 20 drugs required.</p>

      {/* Preset options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESETS.map((p, i) => (
          <button key={i} type="button"
            onClick={() => { setSelectedPreset(i); setMode(i < 2 ? 'preset' : 'manual'); }}
            className={`p-4 rounded-xl border-2 text-left transition ${
              selectedPreset === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
            <Package className={`w-6 h-6 mb-2 ${selectedPreset === i ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className="font-medium text-sm text-gray-800">{p.label}</p>
            <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Manual selection */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Select drugs by category</p>
            <span className={`text-xs px-2 py-1 rounded-full ${selectedDrugs.size >= 20 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {selectedDrugs.size} / 20 minimum
            </span>
          </div>

          {DRUG_CATEGORIES.map(cat => {
            const expanded = expandedCat === cat.name;
            const catCount = cat.drugs.filter(d => selectedDrugs.has(d)).length;
            return (
              <div key={cat.name} className="border rounded-xl overflow-hidden">
                <button type="button" onClick={() => setExpandedCat(expanded ? null : cat.name)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                  <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{catCount}/{cat.drugs.length}</span>
                    <span className="text-gray-400">{expanded ? '−' : '+'}</span>
                  </div>
                </button>
                {expanded && (
                  <div className="p-3 space-y-1 border-t">
                    <button type="button" onClick={() => selectAll(cat.name)} className="text-xs text-blue-600 hover:underline mb-2">
                      {cat.drugs.every(d => selectedDrugs.has(d)) ? 'Deselect all' : 'Select all'}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {cat.drugs.map(d => (
                        <button key={d} type="button" onClick={() => toggleDrug(d)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                            selectedDrugs.has(d) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode === 'preset' && selectedPreset !== null && selectedPreset < 2 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-green-700 font-medium">{PRESETS[selectedPreset].count} drugs will be imported</p>
          <p className="text-green-600 text-sm mt-1">You can customize the list later in Pharmacy settings.</p>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving || !canSubmit}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </div>
  );
};

export default DrugFormularyStep;
