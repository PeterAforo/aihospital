import React, { useState } from 'react';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';

const ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING_OFFICER', 'RECORDS_OFFICER'];
const REQUIRED_ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'];

interface StaffUser {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  license_number: string;
}

interface Props { onSave: (data: any) => void; saving: boolean; }

const empty = (): StaffUser => ({ first_name: '', last_name: '', email: '', phone: '', role: '', license_number: '' });

const StaffUsersStep: React.FC<Props> = ({ onSave, saving }) => {
  const [users, setUsers] = useState<StaffUser[]>([empty()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (i: number, k: keyof StaffUser, v: string) => {
    const next = [...users];
    next[i] = { ...next[i], [k]: v };
    setUsers(next);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    users.forEach((u, i) => {
      if (!u.first_name) e[`${i}_fn`] = 'Required';
      if (!u.last_name) e[`${i}_ln`] = 'Required';
      if (!u.email) e[`${i}_em`] = 'Required';
      if (!u.phone) e[`${i}_ph`] = 'Required';
      if (!u.role) e[`${i}_rl`] = 'Required';
    });
    const addedRoles = new Set(users.map(u => u.role));
    const missing = REQUIRED_ROLES.filter(r => !addedRoles.has(r));
    if (missing.length > 0) e.roles = `Missing required roles: ${missing.join(', ')}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSave({ users });
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm";
  const showLicense = (role: string) => ['DOCTOR', 'NURSE', 'PHARMACIST'].includes(role);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
      <p className="text-gray-500 text-sm text-center">Add at least one user for each key role. Default password: <code className="bg-gray-100 px-1 rounded">Welcome123!</code></p>

      {errors.roles && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.roles}
        </div>
      )}

      <div className="text-xs text-gray-400 flex gap-2 flex-wrap">
        Required roles: {REQUIRED_ROLES.map(r => {
          const has = users.some(u => u.role === r);
          return <span key={r} className={`px-2 py-0.5 rounded-full ${has ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.replace('_', ' ')}</span>;
        })}
      </div>

      {users.map((u, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Staff Member {i + 1}</h3>
            {users.length > 1 && (
              <button type="button" onClick={() => setUsers(users.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input className={inputCls} placeholder="First Name *" value={u.first_name} onChange={e => update(i, 'first_name', e.target.value)} />
              {errors[`${i}_fn`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_fn`]}</p>}
            </div>
            <div>
              <input className={inputCls} placeholder="Last Name *" value={u.last_name} onChange={e => update(i, 'last_name', e.target.value)} />
              {errors[`${i}_ln`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_ln`]}</p>}
            </div>
            <div>
              <input type="email" className={inputCls} placeholder="Email *" value={u.email} onChange={e => update(i, 'email', e.target.value)} />
              {errors[`${i}_em`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_em`]}</p>}
            </div>
            <div>
              <input type="tel" className={inputCls} placeholder="Phone *" value={u.phone} onChange={e => update(i, 'phone', e.target.value)} />
              {errors[`${i}_ph`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_ph`]}</p>}
            </div>
            <div>
              <select className={inputCls} value={u.role} onChange={e => update(i, 'role', e.target.value)}>
                <option value="">Select Role *</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
              {errors[`${i}_rl`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}_rl`]}</p>}
            </div>
            {showLicense(u.role) && (
              <div>
                <input className={inputCls} placeholder="License Number" value={u.license_number} onChange={e => update(i, 'license_number', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setUsers([...users, empty()])} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2 text-sm">
        <Plus className="w-4 h-4" /> Add Another Staff Member
      </button>

      <div className="pt-2 flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save & Continue
        </button>
      </div>
    </form>
  );
};

export default StaffUsersStep;
