import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, Pill, TrendingUp, Clock } from "lucide-react";

const stats = [
  { title: "Total Patients", value: "1,234", change: "+12%", icon: Users, color: "#3b82f6", bgColor: "rgba(59,130,246,0.1)" },
  { title: "Today's Appointments", value: "45", change: "+5%", icon: Calendar, color: "#22c55e", bgColor: "rgba(34,197,94,0.1)" },
  { title: "Revenue Today", value: "₵5,680", change: "+18%", icon: DollarSign, color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
  { title: "Pending Prescriptions", value: "12", change: "-3%", icon: Pill, color: "#ef4444", bgColor: "rgba(239,68,68,0.1)" },
];

const recentAppointments = [
  { patient: "Kwame Asante", time: "09:00 AM", type: "Consultation", status: "Completed" },
  { patient: "Ama Mensah", time: "10:30 AM", type: "Follow-up", status: "In Progress" },
  { patient: "Kofi Boateng", time: "11:00 AM", type: "Check-up", status: "Waiting" },
  { patient: "Akua Owusu", time: "02:00 PM", type: "Consultation", status: "Scheduled" },
];

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  padding: "1.5rem",
  transition: "box-shadow 0.2s",
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, { bg: string; color: string }> = {
    Completed: { bg: "#dcfce7", color: "#166534" },
    "In Progress": { bg: "#dbeafe", color: "#1e40af" },
    Waiting: { bg: "#fef3c7", color: "#92400e" },
    Scheduled: { bg: "#f3f4f6", color: "#374151" },
  };
  return styles[status] || styles.Scheduled;
};

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.25rem" }}>
          Dashboard
        </h1>
        <p style={{ color: "#6b7280" }}>Overview of your hospital's performance</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={cardStyle}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280" }}>{stat.title}</span>
              <div style={{ padding: "0.5rem", borderRadius: "8px", backgroundColor: stat.bgColor }}>
                <stat.icon style={{ width: "20px", height: "20px", color: stat.color }} />
              </div>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1f2937" }}>{stat.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "0.5rem", fontSize: "0.75rem" }}>
              <TrendingUp style={{ width: "14px", height: "14px", color: "#22c55e" }} />
              <span style={{ color: "#22c55e", fontWeight: 500 }}>{stat.change}</span>
              <span style={{ color: "#9ca3af" }}>from last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Recent Appointments */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          style={{ ...cardStyle, gridColumn: "span 1" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Clock style={{ width: "20px", height: "20px", color: "#6b7280" }} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937" }}>Recent Appointments</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentAppointments.map((apt, index) => {
              const statusStyle = getStatusStyle(apt.status);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(37,99,235,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Users style={{ width: "20px", height: "20px", color: "#2563eb" }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, color: "#1f2937" }}>{apt.patient}</p>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{apt.type}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>{apt.time}</p>
                    <span style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                    }}>
                      {apt.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={cardStyle}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937", marginBottom: "1rem" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { icon: Users, label: "Register New Patient" },
              { icon: Calendar, label: "Schedule Appointment" },
              { icon: Pill, label: "New Prescription" },
              { icon: DollarSign, label: "Create Invoice" },
            ].map((action, index) => (
              <button
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <action.icon style={{ width: "18px", height: "18px", color: "#6b7280" }} />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
