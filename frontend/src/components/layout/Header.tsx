import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { LogOut, User, Settings, Bell, Moon, Sun } from "lucide-react";
import { RootState } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { useState } from "react";

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isDark, setIsDark] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`
    : "U";

  const iconButtonStyle = {
    width: "40px",
    height: "40px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  };

  return (
    <motion.header
      initial={false}
      animate={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderBottom: "1px solid #e5e7eb",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937" }}>
          Welcome back, {user?.firstName || "User"}
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Notifications */}
        <button style={iconButtonStyle}>
          <Bell style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          <span style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>3</span>
        </button>

        {/* Theme Toggle */}
        <button style={iconButtonStyle} onClick={toggleTheme}>
          {isDark ? (
            <Sun style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          ) : (
            <Moon style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          )}
        </button>

        {/* User Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {initials}
          </button>

          {showMenu && (
            <div style={{
              position: "absolute",
              top: "48px",
              right: 0,
              width: "220px",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              zIndex: 50,
            }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
                <p style={{ fontWeight: 500, color: "#1f2937" }}>{user?.firstName} {user?.lastName}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate("/profile"); setShowMenu(false); }}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#374151",
                }}
              >
                <User style={{ width: "16px", height: "16px" }} /> Profile
              </button>
              <button
                onClick={() => { navigate("/settings"); setShowMenu(false); }}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#374151",
                }}
              >
                <Settings style={{ width: "16px", height: "16px" }} /> Settings
              </button>
              <div style={{ borderTop: "1px solid #e5e7eb" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "#dc2626",
                  }}
                >
                  <LogOut style={{ width: "16px", height: "16px" }} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
