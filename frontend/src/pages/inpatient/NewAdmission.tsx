import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { inpatientService, Ward, BedItem } from '@/services/inpatient.service';
import api from '@/services/api';

const NewAdmission: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<BedItem[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    patientId: '', patientName: '', wardId: '', bedId: '', branchId: '',
    admissionReason: '', admissionSource: 'OPD', priority: 'routine',
    primaryDiagnosis: '', admissionNotes: '', dietOrders: '', activityLevel: '',
    estimatedStay: '', attendingDoctorId: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [wardsData, branchRes] = await Promise.all([
          inpatientService.listWards(),
          api.get('/tenants/branches'),
        ]);
        setWards(wardsData);
        if (branchRes.data.data?.[0]) {
          setForm(f => ({ ...f, branchId: branchRes.data.data[0].id }));
        }
        // Load doctors
        try {
          const usersRes = await api.get('/users?role=DOCTOR&limit=100');
          setDoctors(usersRes.data.data?.users || usersRes.data.data || []);
        } catch { /* ignore */ }
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (form.wardId) {
      inpatientService.listBeds(form.wardId, 'AVAILABLE').then(setBeds).catch(() => setBeds([]));
    } else {
      setBeds([]);
    }
  }, [form.wardId]);

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (query.length < 2) { setPatientResults([]); return; }
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}&limit=8`);
      setPatientResults(res.data.data?.patients || res.data.data || []);
    } catch { setPatientResults([]); }
  };

  const selectPatient = (p: any) => {
    setForm(f => ({ ...f, patientId: p.id, patientName: `${p.firstName} ${p.lastName} (${p.mrn})` }));
    setPatientSearch(`${p.firstName} ${p.lastName} (${p.mrn})`);
    setPatientResults([]);
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.wardId || !form.bedId || !form.admissionReason) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const admission = await inpatientService.admitPatient({
        branchId: form.branchId,
        patientId: form.patientId,
        wardId: form.wardId,
        bedId: form.bedId,
        admissionReason: form.admissionReason,
        admissionSource: form.admissionSource,
        priority: form.priority,
        primaryDiagnosis: form.primaryDiagnosis || undefined,
        admissionNotes: form.admissionNotes || undefined,
        dietOrders: form.dietOrders || undefined,
        estimatedStay: form.estimatedStay ? parseInt(form.estimatedStay) : undefined,
        attendingDoctorId: form.attendingDoctorId || undefined,
      });
      toast({ title: 'Success', description: `Patient admitted: ${admission.admissionNumber}` });
      navigate(`/inpatient/admissions/${admission.id}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/inpatient/admissions')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserPlus className="w-6 h-6 text-blue-600" /> New Admission</h1>
          <p className="text-sm text-gray-500">Admit a patient to a ward</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Patient Search */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Patient</CardTitle></CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search patient by name or MRN..."
                value={patientSearch}
                onChange={e => searchPatients(e.target.value)}
                className="pl-10"
              />
              {patientResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {patientResults.map((p: any) => (
                    <button key={p.id} onClick={() => selectPatient(p)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0 text-sm">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">{p.mrn}</span>
                      <span className="text-gray-400 ml-2 text-xs">{p.gender} • {p.phonePrimary}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.patientId && <p className="text-xs text-green-600 mt-1">Selected: {form.patientName}</p>}
          </CardContent>
        </Card>

        {/* Ward & Bed */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Ward & Bed Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Ward *</label>
                <select value={form.wardId} onChange={e => setForm(f => ({ ...f, wardId: e.target.value, bedId: '' }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  <option value="">Select Ward</option>
                  {wards.filter(w => w.isActive && w.availableBeds > 0).map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.wardType.replace('_', ' ')}) — {w.availableBeds} beds free</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Bed *</label>
                <select value={form.bedId} onChange={e => setForm(f => ({ ...f, bedId: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800" disabled={!form.wardId}>
                  <option value="">Select Bed</option>
                  {beds.map(b => (
                    <option key={b.id} value={b.id}>{b.bedNumber} ({b.bedType}){b.dailyRate ? ` — ₵${b.dailyRate}/day` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admission Details */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Admission Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Reason for Admission *</label>
              <Input value={form.admissionReason} onChange={e => setForm(f => ({ ...f, admissionReason: e.target.value }))} placeholder="e.g. Acute abdominal pain, Pneumonia" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Primary Diagnosis</label>
              <Input value={form.primaryDiagnosis} onChange={e => setForm(f => ({ ...f, primaryDiagnosis: e.target.value }))} placeholder="e.g. Acute appendicitis (K35.9)" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Source</label>
                <select value={form.admissionSource} onChange={e => setForm(f => ({ ...f, admissionSource: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  <option value="OPD">OPD</option><option value="Emergency">Emergency</option><option value="Referral">Referral</option><option value="Transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Est. Stay (days)</label>
                <Input type="number" min="1" value={form.estimatedStay} onChange={e => setForm(f => ({ ...f, estimatedStay: e.target.value }))} placeholder="e.g. 3" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Attending Doctor</label>
              <select value={form.attendingDoctorId} onChange={e => setForm(f => ({ ...f, attendingDoctorId: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                <option value="">Same as admitting doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Admission Notes</label>
              <textarea value={form.admissionNotes} onChange={e => setForm(f => ({ ...f, admissionNotes: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm h-20" placeholder="Additional notes..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Diet Orders</label>
                <Input value={form.dietOrders} onChange={e => setForm(f => ({ ...f, dietOrders: e.target.value }))} placeholder="e.g. Regular, NPO, Soft diet" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Activity Level</label>
                <Input value={form.activityLevel} onChange={e => setForm(f => ({ ...f, activityLevel: e.target.value }))} placeholder="e.g. Bed rest, Ambulate" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/inpatient/admissions')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.patientId || !form.wardId || !form.bedId || !form.admissionReason} className="bg-blue-600 hover:bg-blue-700">
            {submitting ? 'Admitting...' : 'Admit Patient'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewAdmission;
