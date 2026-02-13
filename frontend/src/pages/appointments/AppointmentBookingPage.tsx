import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, Stethoscope, Check, Loader2, AlertCircle } from "lucide-react";
import { appointmentService, Doctor, TimeSlot, AppointmentType } from "@/services/appointment.service";
import { patientService } from "@/services/patient.service";
import { useToast } from "@/hooks/use-toast";

const APPOINTMENT_TYPES: { value: AppointmentType; label: string; duration: number }[] = [
  { value: 'CONSULTATION', label: 'Consultation', duration: 30 },
  { value: 'FOLLOW_UP', label: 'Follow-up', duration: 20 },
  { value: 'CHECKUP', label: 'Check-up', duration: 45 },
  { value: 'PROCEDURE', label: 'Procedure', duration: 60 },
  { value: 'EMERGENCY', label: 'Emergency', duration: 30 },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "0.5rem",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
};

export default function AppointmentBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const preselectedPatientId = searchParams.get('patientId');

  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('CONSULTATION');
  const [reason, setReason] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);

  // Fetch branch (use first available branch)
  useEffect(() => {
    fetch('/api/tenants/branches', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          setBranchId(data.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch doctors
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => appointmentService.getDoctors(),
  });

  // Search patients
  const { data: patientResults } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: () => patientService.search({ q: patientSearch, limit: 5 }),
    enabled: patientSearch.length >= 2,
  });

  // Fetch availability when doctor and date are selected
  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', selectedDoctor?.id, selectedDate],
    queryFn: () => appointmentService.getDoctorAvailability(selectedDoctor!.id, selectedDate),
    enabled: !!selectedDoctor && !!selectedDate,
  });

  // Preselect patient if ID provided
  useEffect(() => {
    if (preselectedPatientId) {
      patientService.getById(preselectedPatientId).then((res) => {
        setSelectedPatient(res.data);
        setStep(2);
      });
    }
  }, [preselectedPatientId]);

  const createMutation = useMutation({
    mutationFn: () => appointmentService.create({
      branchId: branchId!,
      patientId: selectedPatient.id,
      doctorId: selectedDoctor!.id,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime!,
      duration: APPOINTMENT_TYPES.find(t => t.value === appointmentType)?.duration || 30,
      type: appointmentType,
      reason,
    }),
    onSuccess: (data) => {
      toast({ title: "Success", description: "Appointment booked successfully" });
      navigate(`/appointments/${data.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to book appointment", 
        variant: "destructive" 
      });
    },
  });

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedPatient;
      case 2: return !!selectedDoctor;
      case 3: return !!selectedTime;
      case 4: return !!branchId;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else createMutation.mutate();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/appointments');
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={handleBack} style={{ ...outlineButtonStyle, padding: "8px 12px", marginBottom: "1rem" }}>
          <ArrowLeft style={{ width: "16px", height: "16px" }} /> Back
        </button>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937" }}>Book Appointment</h1>
        <p style={{ color: "#6b7280" }}>Schedule a new patient appointment</p>
      </div>

      {/* Progress Steps */}
      <div style={{ display: "flex", marginBottom: "2rem" }}>
        {[
          { num: 1, label: "Patient", icon: User },
          { num: 2, label: "Doctor", icon: Stethoscope },
          { num: 3, label: "Date & Time", icon: Calendar },
          { num: 4, label: "Confirm", icon: Check },
        ].map((s, i) => (
          <div key={s.num} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: step >= s.num ? "#2563eb" : "#e5e7eb",
              color: step >= s.num ? "white" : "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {step > s.num ? <Check style={{ width: "20px", height: "20px" }} /> : <s.icon style={{ width: "20px", height: "20px" }} />}
            </div>
            <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: step >= s.num ? "#1f2937" : "#6b7280" }}>
              {s.label}
            </span>
            {i < 3 && <div style={{ flex: 1, height: "2px", backgroundColor: step > s.num ? "#2563eb" : "#e5e7eb", margin: "0 1rem" }} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={cardStyle}
      >
        <div style={{ padding: "1.5rem" }}>
          {/* Step 1: Select Patient */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Select Patient</h2>
              
              {selectedPatient ? (
                <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#166534" }}>{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      <p style={{ fontSize: "0.875rem", color: "#15803d" }}>MRN: {selectedPatient.mrn} | Phone: {selectedPatient.phone || selectedPatient.phonePrimary}</p>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} style={{ ...outlineButtonStyle, padding: "6px 12px", fontSize: "0.75rem" }}>
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search by name, MRN, or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={inputStyle}
                  />
                  {patientResults?.data && patientResults.data.length > 0 && (
                    <div style={{ marginTop: "0.5rem", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                      {patientResults.data.map((patient: any) => (
                        <div
                          key={patient.id}
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientSearch("");
                          }}
                          style={{
                            padding: "0.75rem 1rem",
                            cursor: "pointer",
                            borderBottom: "1px solid #e5e7eb",
                            backgroundColor: "white",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                          <p style={{ fontWeight: 500 }}>{patient.firstName} {patient.lastName}</p>
                          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>MRN: {patient.mrn}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Select Doctor */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Select Doctor</h2>
              
              {loadingDoctors ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <Loader2 style={{ width: "32px", height: "32px", color: "#2563eb", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                  {doctors.map((doctor: Doctor) => (
                    <div
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      style={{
                        padding: "1rem",
                        border: "2px solid",
                        borderColor: selectedDoctor?.id === doctor.id ? "#2563eb" : "#e5e7eb",
                        borderRadius: "8px",
                        cursor: "pointer",
                        backgroundColor: selectedDoctor?.id === doctor.id ? "#eff6ff" : "white",
                      }}
                    >
                      <p style={{ fontWeight: 600, color: "#1f2937" }}>Dr. {doctor.firstName} {doctor.lastName}</p>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{doctor.specialization || "General Practice"}</p>
                      {doctor.schedules && doctor.schedules.length > 0 && (
                        <p style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.5rem" }}>
                          {doctor.schedules.length} day(s) available
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {doctors.length === 0 && !loadingDoctors && (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  <AlertCircle style={{ width: "48px", height: "48px", margin: "0 auto", color: "#d1d5db" }} />
                  <p style={{ marginTop: "1rem" }}>No doctors available. Please contact admin.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Date & Time */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Select Date & Time</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime(null);
                    }}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Appointment Type</label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                    style={inputStyle}
                  >
                    {APPOINTMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} ({type.duration} min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label style={labelStyle}>Available Time Slots</label>
              {loadingSlots ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <Loader2 style={{ width: "24px", height: "24px", color: "#2563eb", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>Loading slots...</p>
                </div>
              ) : availability?.available ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
                  {availability.slots.map((slot: TimeSlot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      style={{
                        padding: "0.5rem",
                        border: "1px solid",
                        borderColor: selectedTime === slot.time ? "#2563eb" : slot.available ? "#d1d5db" : "#f3f4f6",
                        borderRadius: "6px",
                        backgroundColor: selectedTime === slot.time ? "#2563eb" : slot.available ? "white" : "#f9fafb",
                        color: selectedTime === slot.time ? "white" : slot.available ? "#1f2937" : "#9ca3af",
                        fontSize: "0.875rem",
                        cursor: slot.available ? "pointer" : "not-allowed",
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", backgroundColor: "#fef3c7", borderRadius: "8px" }}>
                  <AlertCircle style={{ width: "32px", height: "32px", color: "#f59e0b", margin: "0 auto" }} />
                  <p style={{ marginTop: "0.5rem", color: "#92400e" }}>Doctor is not available on this date</p>
                </div>
              )}

              <div style={{ marginTop: "1.5rem" }}>
                <label style={labelStyle}>Reason for Visit (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief description of the reason for this appointment..."
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Confirm Appointment</h2>
              
              <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", padding: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Patient</p>
                    <p style={{ fontWeight: 600 }}>{selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>MRN: {selectedPatient?.mrn}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Doctor</p>
                    <p style={{ fontWeight: 600 }}>Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</p>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{selectedDoctor?.specialization || "General Practice"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Date & Time</p>
                    <p style={{ fontWeight: 600 }}>{new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{selectedTime}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Type</p>
                    <p style={{ fontWeight: 600 }}>{APPOINTMENT_TYPES.find(t => t.value === appointmentType)?.label}</p>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{APPOINTMENT_TYPES.find(t => t.value === appointmentType)?.duration} minutes</p>
                  </div>
                </div>
                {reason && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Reason</p>
                    <p style={{ fontSize: "0.875rem" }}>{reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
          <button onClick={handleBack} style={outlineButtonStyle}>
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed() || createMutation.isPending}
            style={{
              ...buttonStyle,
              opacity: canProceed() && !createMutation.isPending ? 1 : 0.5,
              cursor: canProceed() && !createMutation.isPending ? "pointer" : "not-allowed",
            }}
          >
            {createMutation.isPending ? (
              <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Booking...</>
            ) : step === 4 ? (
              <><Check style={{ width: "16px", height: "16px" }} /> Confirm Booking</>
            ) : (
              <>Next</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
