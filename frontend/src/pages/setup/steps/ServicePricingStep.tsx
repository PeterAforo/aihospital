import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const PRESET_SERVICES = [
  { category: 'Clinical Services', services: [
    { service: 'Consultation - General Doctor', code: 'CONS-GEN', cash: 50, nhis: 30, unit: 'per visit' },
    { service: 'Consultation - Specialist', code: 'CONS-SPEC', cash: 100, nhis: 60, unit: 'per visit' },
    { service: 'Triage', code: 'TRIAGE', cash: 10, nhis: 10, unit: 'per patient' },
    { service: 'Emergency Consultation', code: 'CONS-EMER', cash: 150, nhis: 100, unit: 'per visit' },
  ]},
  { category: 'Laboratory', services: [
    { service: 'Complete Blood Count (CBC)', code: 'LAB-CBC', cash: 40, nhis: 35, unit: 'per test' },
    { service: 'Malaria Rapid Test', code: 'LAB-MAL-RDT', cash: 15, nhis: 12, unit: 'per test' },
    { service: 'Blood Sugar (Fasting)', code: 'LAB-BS-F', cash: 20, nhis: 18, unit: 'per test' },
    { service: 'Urinalysis', code: 'LAB-URINE', cash: 15, nhis: 12, unit: 'per test' },
  ]},
  { category: 'Radiology', services: [
    { service: 'X-Ray - Chest', code: 'RAD-XRAY-CHEST', cash: 80, nhis: 60, unit: 'per exam' },
    { service: 'Ultrasound - Abdominal', code: 'RAD-US-ABD', cash: 120, nhis: 100, unit: 'per exam' },
  ]},
  { category: 'Inpatient', services: [
    { service: 'Bed - General Ward', code: 'BED-GEN', cash: 100, nhis: 80, unit: 'per night' },
    { service: 'Bed - Private Room', code: 'BED-PRIV', cash: 250, nhis: 0, unit: 'per night' },
  ]},
];

interface PriceRow { service: string; code: string; cash_price: number; nhis_price: number; category: string; }

interface Props { onSave: (data: any) => void; saving: boolean; }

const ServicePricingStep: React.FC<Props> = ({ onSave, saving }) => {
  const [rows, setRows] = useState<PriceRow[]>(
    PRESET_SERVICES.flatMap(cat => cat.services.map(s => ({
      service: s.service, code: s.code, cash_price: s.cash, nhis_price: s.nhis, category: cat.category,
    })))
  );
  const [strategy, setStrategy] = useState<'suggested' | 'custom'>('suggested');

  const updatePrice = (i: number, field: 'cash_price' | 'nhis_price', val: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: Number(val) || 0 };
    setRows(next);
  };

  const applyBulkAdjust = (pct: number) => {
    setRows(rows.map(r => ({
      ...r,
      cash_price: Math.round(r.cash_price * (1 + pct / 100)),
      nhis_price: Math.round(r.nhis_price * (1 + pct / 100)),
    })));
  };

  const handleSubmit = () => {
    onSave({ services: rows });
  };

  const categories = [...new Set(rows.map(r => r.category))];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Set prices for your hospital services. All prices in GHS.</p>

      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => setStrategy('suggested')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${strategy === 'suggested' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-500'}`}>
          Use Suggested Prices
        </button>
        <button type="button" onClick={() => setStrategy('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${strategy === 'custom' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-500'}`}>
          Set Custom Prices
        </button>
      </div>

      {strategy === 'custom' && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-500">Bulk adjust:</span>
          {[5, 10, 15, -5, -10].map(p => (
            <button key={p} type="button" onClick={() => applyBulkAdjust(p)}
              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs">
              {p > 0 ? '+' : ''}{p}%
            </button>
          ))}
        </div>
      )}

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4">{cat}</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Service</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">Code</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 w-28">Cash (GHS)</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 w-28">NHIS (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(r => r.category === cat).map((r, _ri) => {
                  const i = rows.indexOf(r);
                  return (
                    <tr key={r.code} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{r.service}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{r.code}</td>
                      <td className="px-4 py-2 text-right">
                        {strategy === 'custom' ? (
                          <input type="number" className="w-20 px-2 py-1 border rounded text-right text-sm" value={r.cash_price} onChange={e => updatePrice(i, 'cash_price', e.target.value)} />
                        ) : (
                          <span className="text-gray-700">{r.cash_price.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {strategy === 'custom' ? (
                          <input type="number" className="w-20 px-2 py-1 border rounded text-right text-sm" value={r.nhis_price} onChange={e => updatePrice(i, 'nhis_price', e.target.value)} />
                        ) : (
                          <span className="text-gray-700">{r.nhis_price.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="pt-2 flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </div>
  );
};

export default ServicePricingStep;
