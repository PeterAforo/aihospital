import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Activity, FileText, Pill, ClipboardList,
  LogOut, ArrowRightLeft, Plus, Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { inpatientService, AdmissionDetail as AdmissionDetailType } from '@/services/inpatient.service';

type TabType = 'overview' | 'vitals' | 'nursing' | 'rounds' | 'medications' | 'care-plans';

const AdmissionDetailPage: React.FC = () => {
  const { admissionId } = useParams<{ admissionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admission, setAdmission] = useState<AdmissionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({ dischargeSummary: '', dischargeNotes: '', dischargeMedications: '', followUpDate: '', followUpInstructions: '', dischargeType: 'NORMAL' });
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: '', noteType: 'progress', painLevel: '', isHandover: false, shift: '' });
  const [showAddRound, setShowAddRound] = useState(false);
  const [roundForm, setRoundForm] = useState({ findings: '', instructions: '', planChanges: '', dietChanges: '', medicationChanges: '' });
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({ bloodPressureSystolic: '', bloodPressureDiastolic: '', temperature: '', pulse: '', respiratoryRate: '', oxygenSaturation: '', painLevel: '', notes: '' });
  const [showAddMed, setShowAddMed] = useState(false);
  const [medForm, setMedForm] = useState({ medicationName: '', dosage: '', route: 'oral', frequency: '', scheduledTime: '' });

  const load = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const data = await inpatientService.getAdmission(admissionId);
      setAdmission(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [admissionId]);

  const handleDischarge = async () => {
    if (!admissionId) return;
    try {
      await inpatientService.dischargePatient(admissionId, {
        ...dischargeForm,
        followUpDate: dischargeForm.followUpDate || undefined,
      });
      toast({ title: 'Success', description: 'Patient discharged successfully' });
      setShowDischarge(false);
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddNote = async () => {
    if (!admissionId || !noteForm.content) return;
    try {
      await inpatientService.addNursingNote(admissionId, {
        content: noteForm.content, noteType: noteForm.noteType,
        painLevel: noteForm.painLevel ? parseInt(noteForm.painLevel) : undefined,
        isHandover: noteForm.isHandover, shift: noteForm.shift || undefined,
      });
      toast({ title: 'Success', description: 'Nursing note added' });
      setShowAddNote(false);
      setNoteForm({ content: '', noteType: 'progress', painLevel: '', isHandover: false, shift: '' });
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddRound = async () => {
    if (!admissionId || !roundForm.findings) return;
    try {
      await inpatientService.addWardRound(admissionId, roundForm);
      toast({ title: 'Success', description: 'Ward round recorded' });
      setShowAddRound(false);
      setRoundForm({ findings: '', instructions: '', planChanges: '', dietChanges: '', medicationChanges: '' });
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddVitals = async () => {
    if (!admissionId) return;
    try {
      const data: any = {};
      if (vitalsForm.bloodPressureSystolic) data.bloodPressureSystolic = parseInt(vitalsForm.bloodPressureSystolic);
      if (vitalsForm.bloodPressureDiastolic) data.bloodPressureDiastolic = parseInt(vitalsForm.bloodPressureDiastolic);
      if (vitalsForm.temperature) data.temperature = parseFloat(vitalsForm.temperature);
      if (vitalsForm.pulse) data.pulse = parseInt(vitalsForm.pulse);
      if (vitalsForm.respiratoryRate) data.respiratoryRate = parseInt(vitalsForm.respiratoryRate);
      if (vitalsForm.oxygenSaturation) data.oxygenSaturation = parseFloat(vitalsForm.oxygenSaturation);
      if (vitalsForm.painLevel) data.painLevel = parseInt(vitalsForm.painLevel);
      if (vitalsForm.notes) data.notes = vitalsForm.notes;
      await inpatientService.recordVitals(admissionId, data);
      toast({ title: 'Success', description: 'Vitals recorded' });
      setShowAddVitals(false);
      setVitalsForm({ bloodPressureSystolic: '', bloodPressureDiastolic: '', temperature: '', pulse: '', respiratoryRate: '', oxygenSaturation: '', painLevel: '', notes: '' });
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddMed = async () => {
    if (!admissionId || !medForm.medicationName || !medForm.dosage || !medForm.frequency || !medForm.scheduledTime) return;
    try {
      await inpatientService.addMedication(admissionId, medForm);
      toast({ title: 'Success', description: 'Medication scheduled' });
      setShowAddMed(false);
      setMedForm({ medicationName: '', dosage: '', route: 'oral', frequency: '', scheduledTime: '' });
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAdministerMed = async (medId: string) => {
    try {
      await inpatientService.administerMedication(medId);
      toast({ title: 'Success', description: 'Medication administered' });
      load();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading admission details...</div>;
  if (!admission) return <div className="p-6 text-center text-gray-400">Admission not found</div>;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const daysSince = Math.ceil((Date.now() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24));

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'vitals', label: 'Vitals', icon: <Activity className="w-4 h-4" />, count: admission.vitalCharts?.length },
    { key: 'nursing', label: 'Nursing Notes', icon: <FileText className="w-4 h-4" />, count: admission.nursingNotes?.length },
    { key: 'rounds', label: 'Ward Rounds', icon: <ClipboardList className="w-4 h-4" />, count: admission.wardRounds?.length },
    { key: 'medications', label: 'Medications', icon: <Pill className="w-4 h-4" />, count: admission.medicationAdministrations?.length },
    { key: 'care-plans', label: 'Care Plans', icon: <Heart className="w-4 h-4" />, count: admission.carePlans?.length },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/inpatient/admissions')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{admission.patient.firstName} {admission.patient.lastName}</h1>
            <Badge className={admission.status === 'ADMITTED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>{admission.status}</Badge>
            <span className="text-sm text-gray-400 font-mono">{admission.admissionNumber}</span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            MRN: {admission.patient.mrn} • {admission.ward.name} / Bed {admission.bed.bedNumber} • Day {daysSince}
          </div>
        </div>
        {admission.status === 'ADMITTED' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/inpatient/admissions/${admissionId}/transfer`)}>
              <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer
            </Button>
            <Button size="sm" onClick={() => setShowDischarge(true)} className="bg-orange-600 hover:bg-orange-700">
              <LogOut className="w-4 h-4 mr-1" /> Discharge
            </Button>
          </div>
        )}
      </div>

      {/* Patient Info Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
        <div><span className="text-gray-400 block text-xs">Diagnosis</span><span className="font-medium">{admission.primaryDiagnosis || '—'}</span></div>
        <div><span className="text-gray-400 block text-xs">Admitted</span><span className="font-medium">{formatDate(admission.admissionDate)}</span></div>
        <div><span className="text-gray-400 block text-xs">Source</span><span className="font-medium">{admission.admissionSource}</span></div>
        <div><span className="text-gray-400 block text-xs">Admitting Dr.</span><span className="font-medium">Dr. {admission.admittingDoctor.lastName}</span></div>
        <div><span className="text-gray-400 block text-xs">Diet</span><span className="font-medium">{admission.dietOrders || 'Regular'}</span></div>
        <div><span className="text-gray-400 block text-xs">Activity</span><span className="font-medium">{admission.activityLevel || 'As tolerated'}</span></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white dark:bg-gray-700 text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab.icon} {tab.label} {tab.count !== undefined && tab.count > 0 && <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Admission Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-600">{admission.admissionNotes || 'No admission notes'}</p></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-sm">Precautions & Allergies</CardTitle></CardHeader>
            <CardContent>
              {admission.precautions?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{admission.precautions.map((p, i) => <Badge key={i} variant="destructive" className="text-xs">{p}</Badge>)}</div>}
              {(admission.patient as any).allergies?.length > 0 && <div className="flex flex-wrap gap-1">{(admission.patient as any).allergies.map((a: any) => <Badge key={a.id} className="bg-red-100 text-red-700 text-xs">{a.allergen}</Badge>)}</div>}
              {(!admission.precautions?.length && !(admission.patient as any).allergies?.length) && <p className="text-sm text-gray-400">None recorded</p>}
            </CardContent>
          </Card>
          {/* Latest Vitals */}
          {admission.vitalCharts?.[0] && (
            <Card className="md:col-span-2"><CardHeader><CardTitle className="text-sm">Latest Vitals</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 text-center text-sm">
                  {[
                    { label: 'BP', value: admission.vitalCharts[0].bloodPressureSystolic ? `${admission.vitalCharts[0].bloodPressureSystolic}/${admission.vitalCharts[0].bloodPressureDiastolic}` : '—', unit: 'mmHg' },
                    { label: 'Temp', value: admission.vitalCharts[0].temperature ?? '—', unit: '°C' },
                    { label: 'Pulse', value: admission.vitalCharts[0].pulse ?? '—', unit: 'bpm' },
                    { label: 'RR', value: admission.vitalCharts[0].respiratoryRate ?? '—', unit: '/min' },
                    { label: 'SpO2', value: admission.vitalCharts[0].oxygenSaturation ?? '—', unit: '%' },
                    { label: 'Pain', value: admission.vitalCharts[0].painLevel ?? '—', unit: '/10' },
                  ].map(v => (
                    <div key={v.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <div className="text-xs text-gray-400">{v.label}</div>
                      <div className="font-bold text-lg">{v.value}</div>
                      <div className="text-[10px] text-gray-400">{v.unit}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'vitals' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddVitals(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Record Vitals</Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">Time</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">BP</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Temp</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Pulse</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">RR</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">SpO2</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Pain</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admission.vitalCharts?.map((v: any) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 text-xs">{formatDate(v.recordedAt)}</td>
                    <td className="px-3 py-2 text-center">{v.bloodPressureSystolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '—'}</td>
                    <td className="px-3 py-2 text-center">{v.temperature ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{v.pulse ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{v.respiratoryRate ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{v.oxygenSaturation ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{v.painLevel ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{v.notes || ''}</td>
                  </tr>
                ))}
                {(!admission.vitalCharts || admission.vitalCharts.length === 0) && (
                  <tr><td colSpan={8} className="text-center py-6 text-gray-400">No vitals recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'nursing' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddNote(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add Note</Button>
          </div>
          <div className="space-y-3">
            {admission.nursingNotes?.map((note: any) => (
              <div key={note.id} className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${note.isHandover ? 'border-l-4 border-l-orange-400' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">{note.noteType}</Badge>
                    {note.isHandover && <Badge className="bg-orange-100 text-orange-700 text-xs">Handover</Badge>}
                    {note.shift && <span className="text-xs text-gray-400">Shift: {note.shift}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(note.createdAt)} • {note.nurse?.firstName} {note.nurse?.lastName}</span>
                </div>
                <p className="text-sm">{note.content}</p>
                {note.painLevel !== null && <div className="text-xs text-gray-500 mt-1">Pain: {note.painLevel}/10</div>}
              </div>
            ))}
            {(!admission.nursingNotes || admission.nursingNotes.length === 0) && (
              <div className="text-center py-8 text-gray-400">No nursing notes yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rounds' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddRound(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Record Round</Button>
          </div>
          <div className="space-y-3">
            {admission.wardRounds?.map((round: any) => (
              <div key={round.id} className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Dr. {round.doctor?.firstName} {round.doctor?.lastName}</span>
                  <span className="text-xs text-gray-400">{formatDate(round.roundDate)}</span>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-500 font-medium">Findings:</span> {round.findings}</div>
                  {round.instructions && <div><span className="text-gray-500 font-medium">Instructions:</span> {round.instructions}</div>}
                  {round.planChanges && <div><span className="text-gray-500 font-medium">Plan Changes:</span> {round.planChanges}</div>}
                  {round.dietChanges && <div><span className="text-gray-500 font-medium">Diet:</span> {round.dietChanges}</div>}
                  {round.medicationChanges && <div><span className="text-gray-500 font-medium">Medications:</span> {round.medicationChanges}</div>}
                </div>
              </div>
            ))}
            {(!admission.wardRounds || admission.wardRounds.length === 0) && (
              <div className="text-center py-8 text-gray-400">No ward rounds recorded yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddMed(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add Medication</Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Medication</th>
                  <th className="px-4 py-2 text-left font-medium">Dosage</th>
                  <th className="px-4 py-2 text-left font-medium">Route</th>
                  <th className="px-4 py-2 text-left font-medium">Frequency</th>
                  <th className="px-4 py-2 text-left font-medium">Scheduled</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admission.medicationAdministrations?.map((med: any) => (
                  <tr key={med.id}>
                    <td className="px-4 py-2 font-medium">{med.medicationName}</td>
                    <td className="px-4 py-2">{med.dosage}</td>
                    <td className="px-4 py-2">{med.route}</td>
                    <td className="px-4 py-2">{med.frequency}</td>
                    <td className="px-4 py-2 text-xs">{formatDate(med.scheduledTime)}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge className={med.status === 'administered' ? 'bg-green-100 text-green-700' : med.status === 'refused' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{med.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {med.status === 'scheduled' && (
                        <Button size="sm" variant="outline" onClick={() => handleAdministerMed(med.id)}>Administer</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!admission.medicationAdministrations || admission.medicationAdministrations.length === 0) && (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">No medications scheduled</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'care-plans' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add Care Plan</Button>
          </div>
          <div className="space-y-3">
            {admission.carePlans?.map((plan: any) => (
              <Card key={plan.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium text-gray-500">Problem:</span> {plan.problem}</div>
                      <div><span className="font-medium text-gray-500">Goal:</span> {plan.goal}</div>
                      <div><span className="font-medium text-gray-500">Interventions:</span> {plan.interventions}</div>
                      {plan.evaluation && <div><span className="font-medium text-gray-500">Evaluation:</span> {plan.evaluation}</div>}
                    </div>
                    <Badge className={plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{plan.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!admission.carePlans || admission.carePlans.length === 0) && (
              <div className="text-center py-8 text-gray-400">No care plans yet</div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Discharge Modal */}
      {showDischarge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDischarge(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><LogOut className="w-5 h-5 text-orange-600" /> Discharge Patient</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Discharge Type</label>
                <select value={dischargeForm.dischargeType} onChange={e => setDischargeForm(f => ({ ...f, dischargeType: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="NORMAL">Normal</option><option value="AGAINST_MEDICAL_ADVICE">Against Medical Advice</option><option value="TRANSFERRED">Transferred</option><option value="DECEASED">Deceased</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Discharge Summary *</label>
                <textarea value={dischargeForm.dischargeSummary} onChange={e => setDischargeForm(f => ({ ...f, dischargeSummary: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm h-20" placeholder="Summary of hospital stay..." />
              </div>
              <div><label className="text-sm font-medium block mb-1">Discharge Medications</label>
                <textarea value={dischargeForm.dischargeMedications} onChange={e => setDischargeForm(f => ({ ...f, dischargeMedications: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm h-16" placeholder="Medications to continue at home..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Follow-up Date</label><Input type="date" value={dischargeForm.followUpDate} onChange={e => setDischargeForm(f => ({ ...f, followUpDate: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Follow-up Instructions</label><Input value={dischargeForm.followUpInstructions} onChange={e => setDischargeForm(f => ({ ...f, followUpInstructions: e.target.value }))} placeholder="e.g. Review in 2 weeks" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowDischarge(false)}>Cancel</Button>
                <Button onClick={handleDischarge} disabled={!dischargeForm.dischargeSummary} className="bg-orange-600 hover:bg-orange-700">Discharge Patient</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Nursing Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddNote(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Nursing Note</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Type</label>
                  <select value={noteForm.noteType} onChange={e => setNoteForm(f => ({ ...f, noteType: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="progress">Progress</option><option value="assessment">Assessment</option><option value="intervention">Intervention</option><option value="observation">Observation</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium block mb-1">Pain Level (0-10)</label>
                  <Input type="number" min="0" max="10" value={noteForm.painLevel} onChange={e => setNoteForm(f => ({ ...f, painLevel: e.target.value }))} />
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Note *</label>
                <textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm h-24" placeholder="Enter nursing note..." />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noteForm.isHandover} onChange={e => setNoteForm(f => ({ ...f, isHandover: e.target.checked }))} /> Handover Note</label>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
                <Button onClick={handleAddNote} disabled={!noteForm.content} className="bg-blue-600 hover:bg-blue-700">Add Note</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Ward Round Modal */}
      {showAddRound && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddRound(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Record Ward Round</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Findings *</label>
                <textarea value={roundForm.findings} onChange={e => setRoundForm(f => ({ ...f, findings: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm h-20" placeholder="Clinical findings..." />
              </div>
              <div><label className="text-sm font-medium block mb-1">Instructions</label>
                <Input value={roundForm.instructions} onChange={e => setRoundForm(f => ({ ...f, instructions: e.target.value }))} placeholder="New instructions..." />
              </div>
              <div><label className="text-sm font-medium block mb-1">Plan Changes</label>
                <Input value={roundForm.planChanges} onChange={e => setRoundForm(f => ({ ...f, planChanges: e.target.value }))} placeholder="Changes to treatment plan..." />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddRound(false)}>Cancel</Button>
                <Button onClick={handleAddRound} disabled={!roundForm.findings} className="bg-blue-600 hover:bg-blue-700">Save Round</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vitals Modal */}
      {showAddVitals && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddVitals(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Record Vitals</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">BP Systolic</label><Input type="number" value={vitalsForm.bloodPressureSystolic} onChange={e => setVitalsForm(f => ({ ...f, bloodPressureSystolic: e.target.value }))} placeholder="120" /></div>
                <div><label className="text-sm font-medium block mb-1">BP Diastolic</label><Input type="number" value={vitalsForm.bloodPressureDiastolic} onChange={e => setVitalsForm(f => ({ ...f, bloodPressureDiastolic: e.target.value }))} placeholder="80" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium block mb-1">Temp (°C)</label><Input type="number" step="0.1" value={vitalsForm.temperature} onChange={e => setVitalsForm(f => ({ ...f, temperature: e.target.value }))} placeholder="36.5" /></div>
                <div><label className="text-sm font-medium block mb-1">Pulse</label><Input type="number" value={vitalsForm.pulse} onChange={e => setVitalsForm(f => ({ ...f, pulse: e.target.value }))} placeholder="72" /></div>
                <div><label className="text-sm font-medium block mb-1">RR</label><Input type="number" value={vitalsForm.respiratoryRate} onChange={e => setVitalsForm(f => ({ ...f, respiratoryRate: e.target.value }))} placeholder="18" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">SpO2 (%)</label><Input type="number" step="0.1" value={vitalsForm.oxygenSaturation} onChange={e => setVitalsForm(f => ({ ...f, oxygenSaturation: e.target.value }))} placeholder="98" /></div>
                <div><label className="text-sm font-medium block mb-1">Pain (0-10)</label><Input type="number" min="0" max="10" value={vitalsForm.painLevel} onChange={e => setVitalsForm(f => ({ ...f, painLevel: e.target.value }))} placeholder="0" /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Notes</label><Input value={vitalsForm.notes} onChange={e => setVitalsForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddVitals(false)}>Cancel</Button>
                <Button onClick={handleAddVitals} className="bg-blue-600 hover:bg-blue-700">Save Vitals</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMed(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Schedule Medication</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Medication *</label><Input value={medForm.medicationName} onChange={e => setMedForm(f => ({ ...f, medicationName: e.target.value }))} placeholder="e.g. Amoxicillin" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Dosage *</label><Input value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" /></div>
                <div><label className="text-sm font-medium block mb-1">Route</label>
                  <select value={medForm.route} onChange={e => setMedForm(f => ({ ...f, route: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="oral">Oral</option><option value="iv">IV</option><option value="im">IM</option><option value="sc">SC</option><option value="topical">Topical</option><option value="rectal">Rectal</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Frequency *</label><Input value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. TDS, BD, STAT" /></div>
                <div><label className="text-sm font-medium block mb-1">Scheduled Time *</label><Input type="datetime-local" value={medForm.scheduledTime} onChange={e => setMedForm(f => ({ ...f, scheduledTime: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddMed(false)}>Cancel</Button>
                <Button onClick={handleAddMed} disabled={!medForm.medicationName || !medForm.dosage || !medForm.frequency || !medForm.scheduledTime} className="bg-blue-600 hover:bg-blue-700">Schedule</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionDetailPage;
