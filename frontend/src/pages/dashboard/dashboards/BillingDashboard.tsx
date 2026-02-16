import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, DollarSign, BarChart3, Users } from "lucide-react";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white", borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "1.5rem",
};

export default function BillingOfficerDashboard() {
  const navigate = useNavigate();

  const quickActions = [
    { icon: CreditCard, label: "Billing", path: "/billing", color: "#f97316" },
    { icon: DollarSign, label: "Finance & Pricing", path: "/finance/pricing", color: "#10b981" },
    { icon: BarChart3, label: "Profitability", path: "/finance/profitability", color: "#14b8a6" },
    { icon: Users, label: "Search Patient", path: "/patients", color: "#3b82f6" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>Billing & Revenue</h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b7280" }}>Billing</span>
            <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: "rgba(249,115,22,0.1)" }}>
              <CreditCard style={{ width: 18, height: 18, color: "#f97316" }} />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937" }}>—</div>
          <p style={{ fontSize: "0.7rem", color: "#9ca3af", margin: "0.25rem 0 0" }}>Visit Billing page for details</p>
        </motion.div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
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
  );
}
