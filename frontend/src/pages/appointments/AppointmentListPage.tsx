import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Calendar, Clock, Eye, UserCheck, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { appointmentService, Appointment, AppointmentStatus } from "@/services/appointment.service";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  SCHEDULED: { bg: "#dbeafe", color: "#1e40af", label: "Scheduled" },
  CONFIRMED: { bg: "#e0e7ff", color: "#3730a3", label: "Confirmed" },
  CHECKED_IN: { bg: "#dcfce7", color: "#166534", label: "Checked In" },
  IN_PROGRESS: { bg: "#fef3c7", color: "#92400e", label: "In Progress" },
  COMPLETED: { bg: "#f3f4f6", color: "#374151", label: "Completed" },
  TRIAGED: { bg: "#e0f2fe", color: "#0369a1", label: "Triaged" },
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

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 10px",
  backgroundColor: "transparent",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  fontSize: "0.75rem",
  color: "#374151",
  cursor: "pointer",
  marginRight: "4px",
};

export default function AppointmentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getErrorMessage = (err: any, fallback: string) => {
    return err?.response?.data?.message || err?.message || fallback;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => appointmentService.list({ date: selectedDate, limit: 50 }),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => appointmentService.checkIn(id),
    onSuccess: () => {
      toast({ title: "Success", description: "Patient checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: getErrorMessage(err, 'Failed to check in patient'),
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => appointmentService.complete(id),
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment completed" });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete appointment", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentService.cancel(id),
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment cancelled" });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel appointment", variant: "destructive" });
    },
  });

  const appointments = data?.appointments || [];

  const getStatusStyle = (status: AppointmentStatus) => {
    return statusStyles[status] || statusStyles.SCHEDULED;
  };

  const canCheckIn = (apt: Appointment) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED';
  const canComplete = (apt: Appointment) => apt.status === 'CHECKED_IN' || apt.status === 'IN_PROGRESS';
  const canCancel = (apt: Appointment) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED';

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.25rem" }}>
            Appointments
          </h1>
          <p style={{ color: "#6b7280" }}>Manage patient appointments</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={outlineButtonStyle} onClick={() => navigate("/appointments/calendar")}>
            <Calendar style={{ width: "18px", height: "18px" }} /> Calendar
          </button>
          <button style={buttonStyle} onClick={() => navigate("/appointments/new")}>
            <Plus style={{ width: "18px", height: "18px" }} /> New Appointment
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        />
        <button onClick={() => refetch()} style={{ ...outlineButtonStyle, padding: "8px 12px" }}>
          <RefreshCw style={{ width: "16px", height: "16px" }} /> Refresh
        </button>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>
            {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} Appointments
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <Loader2 style={{ width: "32px", height: "32px", color: "#2563eb", animation: "spin 1s linear infinite", margin: "0 auto" }} />
              <p style={{ marginTop: "1rem", color: "#6b7280" }}>Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <Calendar style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
              <p style={{ marginTop: "1rem", color: "#6b7280" }}>No appointments for this date</p>
              <button style={{ ...buttonStyle, marginTop: "1rem" }} onClick={() => navigate("/appointments/new")}>
                <Plus style={{ width: "16px", height: "16px" }} /> Book Appointment
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Time</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Patient</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Doctor</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt: Appointment, index: number) => {
                  const status = getStatusStyle(apt.status);
                  return (
                    <motion.tr
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 500, color: "#1f2937" }}>
                        {apt.appointmentTime}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>
                          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1f2937" }}>
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{apt.patient?.mrn}</p>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#6b7280" }}>
                        Dr. {apt.doctor?.lastName}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#6b7280" }}>
                        {apt.type?.replace('_', ' ') || 'General'}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "9999px", backgroundColor: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button style={actionButtonStyle} onClick={() => navigate(`/appointments/${apt.id}`)}>
                          <Eye style={{ width: "14px", height: "14px" }} /> View
                        </button>
                        {canCheckIn(apt) && (
                          <button
                            style={{ ...actionButtonStyle, borderColor: "#16a34a", color: "#16a34a" }}
                            onClick={() => checkInMutation.mutate(apt.id)}
                            disabled={checkInMutation.isPending}
                          >
                            <UserCheck style={{ width: "14px", height: "14px" }} /> Check In
                          </button>
                        )}
                        {canComplete(apt) && (
                          <button
                            style={{ ...actionButtonStyle, borderColor: "#2563eb", color: "#2563eb" }}
                            onClick={() => completeMutation.mutate(apt.id)}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle style={{ width: "14px", height: "14px" }} /> Complete
                          </button>
                        )}
                        {canCancel(apt) && (
                          <button
                            style={{ ...actionButtonStyle, borderColor: "#dc2626", color: "#dc2626" }}
                            onClick={() => cancelMutation.mutate(apt.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle style={{ width: "14px", height: "14px" }} /> Cancel
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
