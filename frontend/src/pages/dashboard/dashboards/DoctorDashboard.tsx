import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar, Stethoscope, FlaskConical, Users, ClipboardList,
  RefreshCw, Clock,
} from "lucide-react";
import api from "@/services/api";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white", borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "1.5rem",
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/appointments", {
        params: { date: new Date().toISOString().split("T")[0], limit: 100 },
      });
      const appts = res.data.data || [];
      setAppointments(appts.slice(0, 8));
      setStats({
        todayAppointments: appts.length,
        completed: appts.filter((a: any) => a.status === "COMPLETED").length,
        inProgress: appts.filter((a: any) => a.status === "IN_PROGRESS").length,
        waiting: appts.filter((a: any) => a.status === "CHECKED_IN" || a.status === "TRIAGED").length,
      });
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const statCards = stats ? [
    { title: "Today's Patients", value: stats.todayAppointments, icon: Calendar, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { title: "Completed", value: stats.completed, icon: Stethoscope, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    { title: "In Progress", value: stats.inProgress, icon: ClipboardList, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { title: "Waiting", value: stats.waiting, icon: Clock, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  ] : [];

  const quickActions = [
    { icon: Stethoscope, label: "Start Consultation", path: "/emr", color: "#3b82f6" },
    { icon: Users, label: "Search Patient", path: "/patients", color: "#8b5cf6" },
    { icon: Calendar, label: "My Schedule", path: "/appointments", color: "#22c55e" },
    { icon: FlaskConical, label: "Lab Results", path: "/lab", color: "#06b6d4" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>My Clinical Workspace</h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={loadData} disabled={isLoading} style={{
          padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
          backgroundColor: "white", fontSize: "0.875rem", color: "#374151",
        }}>
          <RefreshCw style={{ width: 16, height: 16, animation: isLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {statCards.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b7280" }}>{s.title}</span>
              <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937" }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Patient Queue */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Patient Queue</h2>
          {appointments.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0" }}>No patients today</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {appointments.map((a: any) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "#f9fafb" }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: "0.85rem", margin: 0 }}>
                      {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Unknown"}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "#6b7280", margin: 0 }}>{a.chiefComplaint || "—"}</p>
                  </div>
                  <span style={{
                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600,
                    backgroundColor: a.status === "COMPLETED" ? "#dcfce7" : a.status === "IN_PROGRESS" ? "#dbeafe" : "#fef3c7",
                    color: a.status === "COMPLETED" ? "#166534" : a.status === "IN_PROGRESS" ? "#1e40af" : "#92400e",
                  }}>
                    {a.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {quickActions.map((a, i) => (
              <button key={i} onClick={() => navigate(a.path)} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem", backgroundColor: "white", border: "1px solid #e5e7eb",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, color: "#374151",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                <a.icon style={{ width: 18, height: 18, color: a.color }} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
