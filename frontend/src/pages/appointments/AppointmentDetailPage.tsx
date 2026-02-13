import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Calendar, Clock, User, Stethoscope, MapPin, 
  Phone, FileText, CheckCircle, XCircle, UserCheck, Loader2,
  AlertTriangle
} from "lucide-react";
import { appointmentService, AppointmentStatus } from "@/services/appointment.service";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  SCHEDULED: { bg: "#dbeafe", color: "#1e40af", label: "Scheduled" },
  CONFIRMED: { bg: "#e0e7ff", color: "#3730a3", label: "Confirmed" },
  CHECKED_IN: { bg: "#dcfce7", color: "#166534", label: "Checked In" },
  IN_PROGRESS: { bg: "#fef3c7", color: "#92400e", label: "In Progress" },
  COMPLETED: { bg: "#f3f4f6", color: "#374151", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
  NO_SHOW: { bg: "#fecaca", color: "#dc2626", label: "No Show" },
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
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

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getById(id!),
    enabled: !!id,
  });

  const checkInMutation = useMutation({
    mutationFn: () => appointmentService.checkIn(id!),
    onSuccess: () => {
      toast({ title: "Success", description: "Patient checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to check in patient", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => appointmentService.complete(id!),
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment completed" });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete appointment", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentService.cancel(id!),
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment cancelled" });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel appointment", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem" }}>
        <Loader2 style={{ width: "48px", height: "48px", color: "#2563eb", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <AlertTriangle style={{ width: "48px", height: "48px", color: "#f59e0b", margin: "0 auto" }} />
        <h2 style={{ marginTop: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>Appointment Not Found</h2>
        <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>The appointment you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/appointments')} style={{ ...buttonStyle, marginTop: "1.5rem" }}>
          Back to Appointments
        </button>
      </div>
    );
  }

  const status = statusConfig[appointment.status];
  const canCheckIn = appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED';
  const canComplete = appointment.status === 'CHECKED_IN' || appointment.status === 'IN_PROGRESS';
  const canCancel = appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED';

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={() => navigate('/appointments')} style={{ ...outlineButtonStyle, padding: "8px 12px", marginBottom: "1rem" }}>
          <ArrowLeft style={{ width: "16px", height: "16px" }} /> Back
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937" }}>Appointment Details</h1>
            <p style={{ color: "#6b7280" }}>
              {new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })} at {appointment.appointmentTime}
            </p>
          </div>
          <span style={{
            padding: "8px 16px",
            borderRadius: "9999px",
            backgroundColor: status.bg,
            color: status.color,
            fontWeight: 600,
            fontSize: "0.875rem",
          }}>
            {status.label}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Main Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Patient Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Patient Information</h2>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}>
                  {appointment.patient?.firstName?.[0]}{appointment.patient?.lastName?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937" }}>
                    {appointment.patient?.firstName} {appointment.patient?.lastName}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>MRN: {appointment.patient?.mrn}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <Phone style={{ width: "14px", height: "14px", color: "#6b7280" }} />
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{appointment.patient?.phonePrimary}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/patients/${appointment.patientId}`)}
                style={{ ...outlineButtonStyle, padding: "8px 16px", marginTop: "1rem", width: "100%" }}
              >
                View Patient Profile
              </button>
            </div>
          </motion.div>

          {/* Doctor Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Stethoscope style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Doctor</h2>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937" }}>
                Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
              </p>
              {appointment.branch && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <MapPin style={{ width: "14px", height: "14px", color: "#6b7280" }} />
                  <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{appointment.branch.name}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Notes Card */}
          {(appointment.chiefComplaint || appointment.specialInstructions) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={cardStyle}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText style={{ width: "20px", height: "20px", color: "#6b7280" }} />
                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Notes</h2>
              </div>
              <div style={{ padding: "1.5rem" }}>
                {appointment.chiefComplaint && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", marginBottom: "0.25rem" }}>Reason for Visit</p>
                    <p style={{ color: "#1f2937" }}>{appointment.chiefComplaint}</p>
                  </div>
                )}
                {appointment.specialInstructions && (
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", marginBottom: "0.25rem" }}>Additional Notes</p>
                    <p style={{ color: "#1f2937" }}>{appointment.specialInstructions}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Appointment Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={cardStyle}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Details</h2>
            </div>
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Calendar style={{ width: "18px", height: "18px", color: "#6b7280" }} />
                <div>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Date</p>
                  <p style={{ fontWeight: 500 }}>
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Clock style={{ width: "18px", height: "18px", color: "#6b7280" }} />
                <div>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Time</p>
                  <p style={{ fontWeight: 500 }}>{appointment.appointmentTime} - {appointment.endTime || '—'}</p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Type</p>
                <p style={{ fontWeight: 500 }}>{appointment.type?.replace('_', ' ') || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Duration</p>
                <p style={{ fontWeight: 500 }}>{appointment.duration} minutes</p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Actions</h2>
            </div>
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {canCheckIn && (
                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  style={{ ...buttonStyle, backgroundColor: "#16a34a", width: "100%", justifyContent: "center" }}
                >
                  {checkInMutation.isPending ? (
                    <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <UserCheck style={{ width: "16px", height: "16px" }} />
                  )}
                  Check In Patient
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  style={{ ...buttonStyle, width: "100%", justifyContent: "center" }}
                >
                  {completeMutation.isPending ? (
                    <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle style={{ width: "16px", height: "16px" }} />
                  )}
                  Complete Appointment
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  style={{ ...outlineButtonStyle, borderColor: "#dc2626", color: "#dc2626", width: "100%", justifyContent: "center" }}
                >
                  {cancelMutation.isPending ? (
                    <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <XCircle style={{ width: "16px", height: "16px" }} />
                  )}
                  Cancel Appointment
                </button>
              )}
              {!canCheckIn && !canComplete && !canCancel && (
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
                  No actions available for this appointment
                </p>
              )}
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={cardStyle}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>Timeline</h2>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <TimelineItem 
                  label="Created" 
                  time={appointment.createdAt} 
                  active={true} 
                />
                {appointment.checkedInAt && (
                  <TimelineItem 
                    label="Checked In" 
                    time={appointment.checkedInAt} 
                    active={true} 
                  />
                )}
                {appointment.completedAt && (
                  <TimelineItem 
                    label="Completed" 
                    time={appointment.completedAt} 
                    active={true} 
                  />
                )}
                {appointment.cancelledAt && (
                  <TimelineItem 
                    label="Cancelled" 
                    time={appointment.cancelledAt} 
                    active={true}
                    isError={true}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, time, active, isError }: { label: string; time: string; active: boolean; isError?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: isError ? "#dc2626" : active ? "#16a34a" : "#d1d5db",
      }} />
      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: isError ? "#dc2626" : "#1f2937" }}>{label}</p>
        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          {new Date(time).toLocaleString('en-GB', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
}
