import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, DollarSign, Stethoscope, Building2,
  UserPlus, ClipboardList, FlaskConical, Pill, Settings,
  RefreshCw, BarChart3, Shield,
} from "lucide-react";
import api from "@/services/api";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  padding: "1.5rem",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [patientsRes, usersRes, appointmentsRes] = await Promise.allSettled([
        api.get("/patients/search", { params: { limit: 1 } }),
        api.get("/users", { params: { limit: 1 } }),
        api.get("/appointments", { params: { date: new Date().toISOString().split("T")[0], limit: 100 } }),
      ]);

      const totalPatients = patientsRes.status === "fulfilled" ? (patientsRes.value.data.meta?.total ?? 0) : 0;
      const totalStaff = usersRes.status === "fulfilled" ? (usersRes.value.data.meta?.total ?? 0) : 0;
      const appts = appointmentsRes.status === "fulfilled" ? (appointmentsRes.value.data.data || []) : [];

      setStats({
        totalPatients,
        totalStaff,
        todayAppointments: appts.length,
        activeEncounters: appts.filter((a: any) => a.status === "IN_PROGRESS" || a.status === "TRIAGED").length,
      });
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const statCards = stats ? [
    { title: "Total Patients", value: stats.totalPatients.toLocaleString(), icon: Users, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { title: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    { title: "Active Encounters", value: stats.activeEncounters, icon: Stethoscope, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { title: "Total Staff", value: stats.totalStaff, icon: Building2, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  ] : [];

  const quickActions = [
    { icon: UserPlus, label: "Register Patient", path: "/registration", color: "#3b82f6" },
    { icon: Calendar, label: "Appointments", path: "/appointments", color: "#22c55e" },
    { icon: ClipboardList, label: "Triage Station", path: "/triage", color: "#f59e0b" },
    { icon: Stethoscope, label: "EMR / Consultations", path: "/emr", color: "#8b5cf6" },
    { icon: FlaskConical, label: "Laboratory", path: "/lab", color: "#06b6d4" },
    { icon: Pill, label: "Pharmacy", path: "/pharmacy", color: "#ec4899" },
    { icon: DollarSign, label: "Finance & Pricing", path: "/finance/pricing", color: "#10b981" },
    { icon: BarChart3, label: "Profitability", path: "/finance/profitability", color: "#14b8a6" },
    { icon: DollarSign, label: "Billing", path: "/billing", color: "#f97316" },
    { icon: Shield, label: "User Management", path: "/settings/users", color: "#6366f1" },
    { icon: Settings, label: "Settings", path: "/settings", color: "#64748b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>
            Hospital Management Dashboard
          </h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={loadData} disabled={isLoading} style={{
          padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
          backgroundColor: "white", fontSize: "0.875rem", color: "#374151",
        }}>
          <RefreshCw style={{ width: 16, height: 16, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {statCards.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b7280" }}>{s.title}</span>
              <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: s.bg }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937" }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937", marginBottom: "1rem" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
          {quickActions.map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem", backgroundColor: "white", border: "1px solid #e5e7eb",
              borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, color: "#374151",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.backgroundColor = "#f9fafb"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.backgroundColor = "white"; }}
            >
              <a.icon style={{ width: 18, height: 18, color: a.color, flexShrink: 0 }} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
