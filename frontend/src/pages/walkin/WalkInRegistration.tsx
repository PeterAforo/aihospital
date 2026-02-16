import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, UserPlus, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { patientService } from '@/services/patient.service';
import { appointmentService } from '@/services/appointment.service';
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

  // Search patients - live search with debounce
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce search query
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

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setStep('confirm');
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setStep('register');
  };

  const handleRegisterAndCheckIn = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Create patient
      const patientResponse = await createPatientMutation.mutateAsync(form);
      const newPatient = patientResponse.data;

      // Step 2: Create walk-in appointment and check-in
      await processWalkIn(newPatient.id, form.chiefComplaint);
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
      await processWalkIn(selectedPatient.id, chiefComplaint);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to check in patient'));
      setIsProcessing(false);
    }
  };

  const processWalkIn = async (patientId: string, complaint: string) => {
    const branchId = branchData?.[0]?.id;
    if (!branchId) {
      throw new Error('No branch available');
    }

    // Get first available doctor for today
    const doctorsRes = await api.get('/appointments/doctors/available', {
      params: {
        branchId,
        date: new Date().toISOString().split('T')[0],
      },
    });

    let doctorId = doctorsRes.data.data?.[0]?.id;

    // Fallback to any configured doctor if none are currently available
    if (!doctorId) {
      const fallbackDoctorsRes = await api.get('/appointments/schedules/doctors');
      doctorId = fallbackDoctorsRes.data.data?.[0]?.id;
    }

    if (!doctorId) {
      throw new Error('No doctors available for walk-in');
    }

    // Create walk-in appointment
    const now = new Date();
    const appointmentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const appointment = await appointmentService.create({
      branchId,
      patientId,
      doctorId,
      appointmentDate: now.toISOString().split('T')[0],
      appointmentTime,
      duration: 30,
      type: 'CONSULTATION',
      reason: complaint,
      isWalkIn: true,
    });

    // Check-in the appointment
    await appointmentService.checkIn(appointment.id);

    // Navigate to triage
    navigate('/triage', { 
      state: { 
        message: 'Walk-in patient checked in successfully. Ready for triage.',
        patientId,
      } 
    });
  };

  const patients = searchResults?.data || [];

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
          OPD Registration
        </h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>
          Quick registration and check-in for outpatient visits
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['Search Patient', 'Register/Select', 'Check In'].map((label, idx) => {
          const stepMap: Step[] = ['search', 'register', 'confirm'];
          const isActive = stepMap.indexOf(step) >= idx;
          return (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isActive ? '#2563eb' : '#e5e7eb',
                color: isActive ? 'white' : '#6b7280',
                textAlign: 'center',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#dc2626',
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={20} />
              Search Existing Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Input
                  placeholder="Start typing to search by name, phone, MRN, or Ghana Card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                {searching && (
                  <Loader2 
                    className="animate-spin" 
                    size={16} 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} 
                  />
                )}
              </div>
            </div>

            {/* Search Results */}
            {patients.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
                  Found {patients.length} patient(s)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {patients.map((patient: PatientResult) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 600, color: '#111827' }}>
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          MRN: {patient.mrn} • {patient.phonePrimary || 'No phone'}
                        </p>
                      </div>
                      <ArrowRight size={20} style={{ color: '#6b7280' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults && patients.length === 0 && (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>
                No patients found. Register as new patient below.
              </p>
            )}

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
              <Button onClick={handleNewPatient} variant="outline" style={{ width: '100%' }}>
                <UserPlus size={16} />
                <span style={{ marginLeft: '8px' }}>Register New Patient</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Quick Registration */}
      {step === 'register' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} />
              Quick Registration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label>First Name *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0XX XXX XXXX"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Chief Complaint / Reason for Visit *</Label>
                <Textarea
                  value={form.chiefComplaint}
                  onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                  placeholder="Why is the patient visiting today?"
                  rows={3}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button variant="outline" onClick={() => setStep('search')}>
                Back
              </Button>
              <Button
                onClick={handleRegisterAndCheckIn}
                disabled={isProcessing || !form.firstName || !form.lastName || !form.dateOfBirth || !form.phone || !form.chiefComplaint}
                style={{ flex: 1 }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span style={{ marginLeft: '8px' }}>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span style={{ marginLeft: '8px' }}>Register & Check In</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm Existing Patient */}
      {step === 'confirm' && selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} />
              Confirm Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <p style={{ fontWeight: 600, fontSize: '1.125rem', color: '#166534' }}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p style={{ color: '#15803d', fontSize: '0.875rem' }}>
                MRN: {selectedPatient.mrn} • DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Chief Complaint / Reason for Visit *</Label>
              <Textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Why is the patient visiting today?"
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="outline" onClick={() => setStep('search')}>
                Back
              </Button>
              <Button
                onClick={handleExistingPatientCheckIn}
                disabled={isProcessing || !chiefComplaint}
                style={{ flex: 1 }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span style={{ marginLeft: '8px' }}>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span style={{ marginLeft: '8px' }}>Check In Patient</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
