import { Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { RootState } from "@/store";

export default function AuthLayout() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflow: "auto",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: "420px" }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{ textAlign: "center", marginBottom: "2rem" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              backgroundColor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              marginBottom: "1rem",
            }}
          >
            <Stethoscope style={{ width: "36px", height: "36px", color: "white" }} />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
            SmartMed
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem" }}>
            AI-Powered Hospital Management
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <Outlet />
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: "center", fontSize: "0.875rem", marginTop: "2rem", color: "rgba(255,255,255,0.7)" }}
        >
          © 2025 SmartMed. Healthcare Made Intelligent.
        </motion.p>
      </motion.div>
    </div>
  );
}
