import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Bell, RefreshCw, Volume2 } from "lucide-react";
import { appointmentService, QueueEntry } from "@/services/appointment.service";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

export default function QueueDisplayPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [branchId] = useState("default-branch"); // TODO: Get from context or URL

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch queue with auto-refresh every 10 seconds
  const { data: queue = [], refetch } = useQuery({
    queryKey: ['queue', branchId],
    queryFn: () => appointmentService.getCurrentQueue(branchId),
    refetchInterval: 10000,
  });

  // Get current and next patients
  const waitingQueue = queue.filter((q: QueueEntry) => q.status === 'WAITING');
  const currentPatient = waitingQueue[0];
  const nextPatients = waitingQueue.slice(1, 6);

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#0f172a", 
      padding: "2rem",
      color: "white",
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "2rem",
      }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>Patient Queue</h1>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>Welcome to SmartMed</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "3rem", fontWeight: 700, fontFamily: "monospace" }}>
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ color: "#94a3b8" }}>
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Now Serving */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            padding: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <Bell style={{ width: "28px", height: "28px" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Now Serving</h2>
          </div>

          <AnimatePresence mode="wait">
            {currentPatient ? (
              <motion.div
                key={currentPatient.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                style={{ textAlign: "center" }}
              >
                <div style={{
                  fontSize: "8rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  marginBottom: "1rem",
                }}>
                  {String(currentPatient.queueNumber).padStart(3, '0')}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <Volume2 style={{ width: "24px", height: "24px" }} />
                  <span style={{ fontSize: "1.25rem" }}>Please proceed to consultation room</span>
                </div>
              </motion.div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <Clock style={{ width: "64px", height: "64px", opacity: 0.5, margin: "0 auto" }} />
                <p style={{ marginTop: "1rem", fontSize: "1.25rem", opacity: 0.7 }}>No patients in queue</p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Waiting List */}
        <div style={{ ...cardStyle, backgroundColor: "#1e293b" }}>
          <div style={{ 
            padding: "1.5rem", 
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Users style={{ width: "24px", height: "24px", color: "#60a5fa" }} />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Waiting</h2>
            </div>
            <span style={{ 
              backgroundColor: "#3b82f6", 
              padding: "0.25rem 0.75rem", 
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}>
              {waitingQueue.length} patient{waitingQueue.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ padding: "1rem" }}>
            {nextPatients.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {nextPatients.map((entry: QueueEntry, index: number) => (
                  <motion.div
                    key={entry.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem 1.25rem",
                      backgroundColor: "#334155",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#60a5fa",
                        minWidth: "60px",
                      }}>
                        {String(entry.queueNumber).padStart(3, '0')}
                      </span>
                      <div>
                        <p style={{ fontWeight: 500 }}>Queue #{entry.queueNumber}</p>
                        <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
                          Checked in at {new Date(entry.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {entry.priority > 0 && (
                      <span style={{
                        backgroundColor: "#dc2626",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}>
                        PRIORITY
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                <p>No patients waiting</p>
              </div>
            )}

            {waitingQueue.length > 6 && (
              <p style={{ textAlign: "center", marginTop: "1rem", color: "#64748b" }}>
                +{waitingQueue.length - 6} more in queue
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: "2rem", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        color: "#64748b",
      }}>
        <p>Please wait for your number to be called</p>
        <button
          onClick={() => refetch()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#334155",
            border: "none",
            borderRadius: "8px",
            color: "#94a3b8",
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: "16px", height: "16px" }} />
          Refresh
        </button>
      </div>
    </div>
  );
}
