import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, UserPlus, ArrowRight, CheckCircle, AlertCircle, Loader2, RotateCcw, Stethoscope, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { patientService } from '@/services/patient.service';
import { appointmentService, ReviewCheckResult, VisitType } from '@/services/appointment.service';
import api from '@/services/api';

type Step = 'search' | 'register' | 'confirm';

interface PatientResult {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phonePrimary?: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code?: string;
}

interface QuickRegisterForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  address: string;
  chiefComplaint: string;
}

const initialForm: QuickRegisterForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'MALE',
  phone: '',
  address: '',
  chiefComplaint: '',
};

export default function WalkInRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [form, setForm] = useState<QuickRegisterForm>(initialForm);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('WALK_IN');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [reviewData, setReviewData] = useState<ReviewCheckResult | null>(null);
  const [checkingReview, setCheckingReview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: any, fallback: string) => {
    return err?.response?.data?.message || err?.message || fallback;
  };

  // Fetch branch for appointment
  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/tenants/branches');
      return res.data.data;
    },
  });

  // Fetch departments for specialist selector
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/rbac/departments');
      return (res.data.data || []) as DepartmentOption[];
    },
  });

  // Search patients - live search with debounce
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['patient-search', debouncedQuery],
    queryFn: () => patientService.search({ q: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.trim().length >= 2,
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (data: typeof form) => patientService.create({
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      registrationSource: 'walk-in',
    }),
  });

  // Check review status when patient is selected
  const checkReviewStatus = async (patientId: string) => {
    setCheckingReview(true);
    try {
      const result = await appointmentService.checkReviewStatus(patientId);
      setReviewData(result);
    } catch {
      setReviewData(null);
    } finally {
      setCheckingReview(false);
    }
  };

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setReviewData(null);
    setVisitType('WALK_IN');
    setSelectedDepartment('');
    setChiefComplaint('');
    setStep('confirm');
    checkReviewStatus(patient.id);
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setReviewData(null);
    setVisitType('WALK_IN');
    setStep('register');
  };

  // Quick review check-in: auto-fill complaint and skip billing
  const handleReviewCheckIn = async () => {
    if (!selectedPatient || !reviewData?.encounter) return;
    setIsProcessing(true);
    setError(null);

    try {
      const complaint = `Follow-up / Review — Previous: ${reviewData.encounter.chiefComplaint || 'consultation'}`;
      await processWalkIn(selectedPatient.id, complaint, 'REVIEW', false);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to check in patient for review'));
      setIsProcessing(false);
    }
  };

  const handleRegisterAndCheckIn = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const patientResponse = await createPatientMutation.mutateAsync(form);
      const newPatient = patientResponse.data;
      await processWalkIn(newPatient.id, form.chiefComplaint, visitType, true);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to register patient'));
      setIsProcessing(false);
    }
  };

  const handleExistingPatientCheckIn = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    setError(null);

    try {
      const isBillable = visitType !== 'REVIEW';
      await processWalkIn(selectedPatient.id, chiefComplaint, visitType, isBillable);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to check in patient'));
      setIsProcessing(false);
    }
  };

  const processWalkIn = async (
    patientId: string,
    complaint: string,
    vType: VisitType = 'WALK_IN',
    isBillable = true
  ) => {
    const branchId = branchData?.[0]?.id;
    if (!branchId) {
      throw new Error('No branch available');
    }

    // For review visits, prefer the original doctor
    let doctorId: string | undefined;

    if (vType === 'REVIEW' && reviewData?.encounter?.doctorId) {
      doctorId = reviewData.encounter.doctorId;
    }

    if (!doctorId) {
      const doctorsRes = await api.get('/appointments/doctors/available', {
        params: { branchId, date: new Date().toISOString().split('T')[0] },
      });
      doctorId = doctorsRes.data.data?.[0]?.id;
    }

    if (!doctorId) {
      const fallbackDoctorsRes = await api.get('/appointments/schedules/doctors');
      doctorId = fallbackDoctorsRes.data.data?.[0]?.id;
    }

    if (!doctorId) {
      throw new Error('No doctors available for walk-in');
    }

    const now = new Date();
    const appointmentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const appointment = await appointmentService.create({
      branchId,
      patientId,
      doctorId,
      appointmentDate: now.toISOString().split('T')[0],
      appointmentTime,
      duration: 30,
      type: vType === 'REVIEW' ? 'FOLLOW_UP' : 'CONSULTATION',
      visitType: vType,
      departmentId: vType === 'SPECIALIST' && selectedDepartment ? selectedDepartment : undefined,
      reason: complaint,
      isWalkIn: true,
      isBillable,
    });

    await appointmentService.checkIn(appointment.id);

    const msg = vType === 'REVIEW'
      ? 'Review patient checked in (no consultation charge). Ready for triage.'
      : vType === 'SPECIALIST'
        ? 'Specialist visit checked in. Ready for triage.'
        : 'Walk-in patient checked in successfully. Ready for triage.';

    navigate('/triage', { state: { message: msg, patientId } });
  };

  const patients = searchResults?.data || [];

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">OPD Registration</h1>
        <p className="text-gray-500 mt-1">Quick registration and check-in for outpatient visits</p>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-2 mb-6">
        {['Search Patient', 'Register/Select', 'Check In'].map((label, idx) => {
          const stepMap: Step[] = ['search', 'register', 'confirm'];
          const isActive = stepMap.indexOf(step) >= idx;
          return (
            <div
              key={label}
              className={`flex-1 py-3 rounded-lg text-center text-sm font-medium ${
                isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search size={20} />
              Search Existing Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Start typing to search by name, phone, MRN, or Ghana Card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searching && (
                  <Loader2 className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {patients.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Found {patients.length} patient(s)</p>
                <div className="flex flex-col gap-2">
                  {patients.map((patient: PatientResult) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="p-3 border rounded-lg cursor-pointer flex justify-between items-center hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          MRN: {patient.mrn} &bull; {patient.phonePrimary || 'No phone'}
                        </p>
                      </div>
                      <ArrowRight size={20} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults && patients.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No patients found. Register as new patient below.
              </p>
            )}

            <div className="border-t pt-4 mt-4">
              <Button onClick={handleNewPatient} variant="outline" className="w-full">
                <UserPlus size={16} className="mr-2" />
                Register New Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Quick Registration */}
      {step === 'register' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={20} />
              Quick Registration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0XX XXX XXXX" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
              </div>
              <div className="col-span-2">
                <Label>Chief Complaint / Reason for Visit *</Label>
                <Textarea value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="Why is the patient visiting today?" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('search')}>Back</Button>
              <Button
                onClick={handleRegisterAndCheckIn}
                disabled={isProcessing || !form.firstName || !form.lastName || !form.dateOfBirth || !form.phone || !form.chiefComplaint}
                className="flex-1"
              >
                {isProcessing ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Processing...</> : <><CheckCircle size={16} className="mr-2" />Register &amp; Check In</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm Existing Patient */}
      {step === 'confirm' && selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} />
              Confirm Check-In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Patient summary */}
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="font-semibold text-lg text-green-800">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-green-700 text-sm">
                MRN: {selectedPatient.mrn} &bull; DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
              </p>
            </div>

            {/* Review badge */}
            {checkingReview && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="animate-spin w-4 h-4" /> Checking follow-up status...
              </div>
            )}

            {reviewData?.isReview && reviewData.encounter && (
              <div
                className="p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={handleReviewCheckIn}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-amber-500 text-white">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Review Patient
                  </Badge>
                  <span className="text-xs text-amber-700">Click to check-in as review (no consultation charge)</span>
                </div>
                <p className="text-sm text-amber-800">
                  Follow-up due by <strong>{new Date(reviewData.encounter.followUpDate).toLocaleDateString()}</strong>
                  {reviewData.encounter.doctorName && <> with <strong>{reviewData.encounter.doctorName}</strong></>}
                </p>
                {reviewData.encounter.followUpPlan && (
                  <p className="text-xs text-amber-700 mt-1">Plan: {reviewData.encounter.followUpPlan}</p>
                )}
                {reviewData.encounter.chiefComplaint && (
                  <p className="text-xs text-amber-600 mt-0.5">Previous complaint: {reviewData.encounter.chiefComplaint}</p>
                )}
              </div>
            )}

            {/* Visit Type Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Visit Type *</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'WALK_IN' as VisitType, label: 'Walk-In', icon: <UserPlus className="w-5 h-5" />, desc: 'General consultation' },
                  { value: 'REVIEW' as VisitType, label: 'Review', icon: <RotateCcw className="w-5 h-5" />, desc: 'Follow-up visit' },
                  { value: 'SPECIALIST' as VisitType, label: 'Specialist', icon: <Stethoscope className="w-5 h-5" />, desc: 'See a specialist' },
                ]).map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      setVisitType(opt.value);
                      if (opt.value !== 'SPECIALIST') setSelectedDepartment('');
                    }}
                    className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                      visitType === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="flex justify-center mb-1">{opt.icon}</div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs opacity-70">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialist department selector */}
            {visitType === 'SPECIALIST' && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  Specialist Service / Department *
                </Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments || []).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} {dept.code && `(${dept.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chief complaint */}
            <div>
              <Label>Chief Complaint / Reason for Visit *</Label>
              <Textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder={
                  visitType === 'REVIEW'
                    ? 'Follow-up / Review...'
                    : visitType === 'SPECIALIST'
                      ? 'Reason for specialist referral...'
                      : 'Why is the patient visiting today?'
                }
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep('search'); setReviewData(null); }}>
                Back
              </Button>
              <Button
                onClick={handleExistingPatientCheckIn}
                disabled={
                  isProcessing ||
                  !chiefComplaint ||
                  (visitType === 'SPECIALIST' && !selectedDepartment)
                }
                className="flex-1"
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" />Processing...</>
                ) : (
                  <><CheckCircle size={16} className="mr-2" />Check In Patient</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
