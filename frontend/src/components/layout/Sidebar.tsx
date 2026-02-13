import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  FlaskConical,
  CreditCard,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  UserPlus,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/patients", icon: Users, label: "Patients" },
  { path: "/appointments", icon: Calendar, label: "Appointments" },
  { path: "/opd", icon: UserPlus, label: "OPD" },
  { path: "/triage", icon: HeartPulse, label: "Triage Station" },
  { path: "/pharmacy", icon: Pill, label: "Pharmacy" },
  { path: "/laboratory", icon: FlaskConical, label: "Laboratory" },
  { path: "/billing", icon: CreditCard, label: "Billing" },
  { path: "/hr", icon: UserCog, label: "HR & Payroll" },
  { path: "/settings/users", icon: Users, label: "User Management" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        height: "100vh",
        backgroundColor: "white",
        borderRight: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo */}
        <div style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          borderBottom: "1px solid #e5e7eb",
        }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Stethoscope style={{ width: "24px", height: "24px", color: "white" }} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2563eb" }}
              >
                MediCare
              </motion.span>
            )}
          </Link>
          <button
            onClick={onToggle}
            style={{
              width: "32px",
              height: "32px",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {collapsed ? (
              <ChevronRight style={{ width: "18px", height: "18px", color: "#6b7280" }} />
            ) : (
              <ChevronLeft style={{ width: "18px", height: "18px", color: "#6b7280" }} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "4px" }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.2s",
                  backgroundColor: isActive ? "#2563eb" : "transparent",
                  color: isActive ? "white" : "#6b7280",
                  boxShadow: isActive ? "0 4px 6px -1px rgba(37, 99, 235, 0.3)" : "none",
                }}
              >
                <item.icon style={{ width: "20px", height: "20px", flexShrink: 0 }} />
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "1rem", borderTop: "1px solid #e5e7eb" }}>
          {!collapsed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              MediCare Ghana v1.0
            </motion.p>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
