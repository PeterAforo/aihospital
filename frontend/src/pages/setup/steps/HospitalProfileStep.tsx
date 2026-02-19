import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const HOSPITAL_TYPES = ['Teaching Hospital', 'District Hospital', 'Polyclinic', 'Health Centre', 'Specialist Hospital', 'Private Clinic'];
const CATEGORIES = ['Public (Government)', 'Private', 'Mission/Faith-based', 'Quasi-government'];
const REGIONS = ['Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo', 'Bono', 'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North'];

interface Props { onSave: (data: any) => void; saving: boolean; }

const HospitalProfileStep: React.FC<Props> = ({ onSave, saving }) => {
  const [form, setForm] = useState({
    hospital_name: '', hospital_type: '', hospital_category: '', bed_capacity: '',
    address: '', region: '', phone: '', email: '', license_number: '',
    nhis_accreditation: '', nhis_provider_code: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.hospital_name || form.hospital_name.length < 3) e.hospital_name = 'Hospital name is required (min 3 chars)';
    if (!form.hospital_type) e.hospital_type = 'Select hospital type';
    if (!form.hospital_category) e.hospital_category = 'Select category';
    if (!form.bed_capacity || Number(form.bed_capacity) < 1) e.bed_capacity = 'Enter bed capacity';
    if (!form.address) e.address = 'Address is required';
    if (!form.region) e.region = 'Select region';
    if (!form.phone) e.phone = 'Phone is required';
    if (!form.email) e.email = 'Email is required';
    if (!form.nhis_accreditation) e.nhis_accreditation = 'Select NHIS status';
    if (form.nhis_accreditation === 'Yes' && !form.nhis_provider_code) e.nhis_provider_code = 'NHIS provider code required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSave(form);
  };

  const Field = ({ label, name, required, children }: { label: string; name: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center mb-4">Tell us about your hospital to get started.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Hospital Name" name="hospital_name" required>
          <input className={inputCls} value={form.hospital_name} onChange={e => set('hospital_name', e.target.value)} placeholder="e.g., Korle Bu Teaching Hospital" />
        </Field>
        <Field label="Hospital Type" name="hospital_type" required>
          <select className={inputCls} value={form.hospital_type} onChange={e => set('hospital_type', e.target.value)}>
            <option value="">Select type...</option>
            {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Category" name="hospital_category" required>
          <select className={inputCls} value={form.hospital_category} onChange={e => set('hospital_category', e.target.value)}>
            <option value="">Select category...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Total Bed Capacity" name="bed_capacity" required>
          <input type="number" className={inputCls} value={form.bed_capacity} onChange={e => set('bed_capacity', e.target.value)} placeholder="e.g., 50" min={1} max={10000} />
        </Field>
      </div>

      <Field label="Physical Address" name="address" required>
        <textarea className={inputCls} rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address, city, region" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Region" name="region" required>
          <select className={inputCls} value={form.region} onChange={e => set('region', e.target.value)}>
            <option value="">Select region...</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Phone Number" name="phone" required>
          <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+233 XX XXX XXXX" />
        </Field>
        <Field label="Official Email" name="email" required>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@hospital.com" />
        </Field>
        <Field label="Medical License Number" name="license_number">
          <input className={inputCls} value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="GHS registration number" />
        </Field>
      </div>

      <Field label="NHIS Accredited?" name="nhis_accreditation" required>
        <div className="flex gap-4">
          {['Yes', 'No'].map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="nhis" value={v} checked={form.nhis_accreditation === v} onChange={() => set('nhis_accreditation', v)} className="text-blue-600" />
              <span className="text-sm">{v}</span>
            </label>
          ))}
        </div>
      </Field>

      {form.nhis_accreditation === 'Yes' && (
        <Field label="NHIS Provider Code" name="nhis_provider_code" required>
          <input className={inputCls} value={form.nhis_provider_code} onChange={e => set('nhis_provider_code', e.target.value)} placeholder="e.g., MID-GH-ACC-001" />
        </Field>
      )}

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save & Continue
        </button>
      </div>
    </form>
  );
};

export default HospitalProfileStep;
