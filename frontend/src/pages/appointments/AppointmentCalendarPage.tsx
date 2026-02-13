import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const iconButtonStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "white",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  cursor: "pointer",
};

export default function AppointmentCalendarPage() {
  const today = new Date();
  const monthName = today.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.25rem" }}>
          Calendar
        </h1>
        <p style={{ color: "#6b7280" }}>View and manage appointments</p>
      </div>

      <div style={cardStyle}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar style={{ width: "20px", height: "20px", color: "#6b7280" }} />
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>{monthName}</h2>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button style={iconButtonStyle}>
              <ChevronLeft style={{ width: "18px", height: "18px", color: "#374151" }} />
            </button>
            <button style={iconButtonStyle}>
              <ChevronRight style={{ width: "18px", height: "18px", color: "#374151" }} />
            </button>
          </div>
        </div>
        <div style={{ padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "0.875rem" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} style={{ padding: "0.5rem", fontWeight: 500, color: "#6b7280" }}>
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const dayNum = i - 3;
              const isToday = dayNum === today.getDate();
              const hasAppointments = [5, 8, 12, 15, 22].includes(dayNum);
              const isValid = dayNum > 0 && dayNum <= 31;
              
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    padding: "0.5rem",
                    height: "80px",
                    border: "1px solid",
                    borderColor: isToday ? "#2563eb" : "#e5e7eb",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: isToday ? "rgba(37,99,235,0.1)" : "white",
                    opacity: isValid ? 1 : 0.3,
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: isToday ? 700 : 400, color: isToday ? "#2563eb" : "#374151" }}>
                    {isValid ? dayNum : ""}
                  </span>
                  {hasAppointments && isValid && (
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ fontSize: "0.7rem", backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        9:00 Consult
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
