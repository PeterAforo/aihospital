import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FlaskConical, Users, Clock, Beaker, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { laboratoryService, LabWorklistItem } from "@/services/laboratory.service";
import { Badge } from "@/components/ui/badge";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white", borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "1.5rem",
};

export default function LabTechDashboard() {
  const navigate = useNavigate();
  const [worklist, setWorklist] = useState<LabWorklistItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, sampleCollected: 0, processing: 0, completedToday: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [worklistResult, statsResult] = await Promise.allSettled([
        laboratoryService.getWorklist(),
        laboratoryService.getWorklistStats(),
      ]);
      if (worklistResult.status === "fulfilled") setWorklist(worklistResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
    } catch {
      // silently fail — cards will show 0
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: FlaskConical, label: "Lab Worklist", path: "/lab/worklist", color: "#06b6d4" },
    { icon: FileText, label: "Enter Results", path: "/lab/results", color: "#8b5cf6" },
    { icon: Beaker, label: "Sample Collection", path: "/lab/collection", color: "#10b981" },
    { icon: Users, label: "Search Patient", path: "/patients", color: "#3b82f6" },
  ];

  const statCards = [
    { label: "Pending Orders", value: stats.pending, icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", path: "/lab/worklist?status=PENDING" },
    { label: "Samples Collected", value: stats.sampleCollected, icon: Beaker, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", path: "/lab/worklist?status=SAMPLE_COLLECTED" },
    { label: "Processing", value: stats.processing, icon: FlaskConical, color: "#06b6d4", bg: "rgba(6,182,212,0.1)", path: "/lab/worklist?status=PROCESSING" },
    { label: "Completed Today", value: stats.completedToday, icon: CheckCircle, color: "#10b981", bg: "rgba(16,185,129,0.1)", path: "/lab/worklist" },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "STAT": return "bg-red-500 text-white";
      case "URGENT": return "bg-orange-500 text-white";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "SAMPLE_COLLECTED": return "bg-blue-100 text-blue-800";
      case "PROCESSING": return "bg-cyan-100 text-cyan-800";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>Laboratory Workspace</h1>
        <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ ...cardStyle, cursor: "pointer" }}
            onClick={() => navigate(card.path)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b7280" }}>{card.label}</span>
              <div style={{ padding: "0.4rem", borderRadius: "8px", backgroundColor: card.bg }}>
                <card.icon style={{ width: 18, height: 18, color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937" }}>
              {isLoading ? "—" : card.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Recent Lab Orders */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Lab Queue</h2>
            <button
              onClick={() => navigate("/lab/worklist")}
              style={{ fontSize: "0.75rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
            >
              View All →
            </button>
          </div>
          {isLoading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Loading...</p>
          ) : worklist.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <FlaskConical style={{ width: 40, height: 40, color: "#d1d5db", margin: "0 auto 0.5rem" }} />
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>No pending lab orders</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {worklist.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/lab/order/${order.id}`)}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "white"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Badge className={getPriorityColor(order.priority)} style={{ fontSize: "0.65rem" }}>
                          {order.priority}
                        </Badge>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1f2937" }}>
                          {order.patient.firstName} {order.patient.lastName}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
                        MRN: {order.patient.mrn} • {order.items.length} test(s)
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)} style={{ fontSize: "0.65rem" }}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} style={{
                        fontSize: "0.65rem", padding: "0.15rem 0.4rem",
                        backgroundColor: "#f3f4f6", borderRadius: "4px", color: "#4b5563",
                      }}>
                        {item.test.code || item.test.name}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>+{order.items.length - 3} more</span>
                    )}
                  </div>
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
                padding: "1rem", backgroundColor: "white", border: "1px solid #e5e7eb",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                <a.icon style={{ width: 20, height: 20, color: a.color }} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
