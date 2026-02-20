import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Stethoscope } from "lucide-react";
import { RootState } from "@/store";
import { usePermissions } from "@/hooks/usePermissions";
import { SIDEBAR_CONFIG, DEFAULT_SIDEBAR, type SidebarSection } from "@/config/sidebar.config";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const { hasPermission, role } = usePermissions();

  const sections: SidebarSection[] = SIDEBAR_CONFIG[role] || DEFAULT_SIDEBAR;

  const roleBadge = role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
                SmartMed
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

        {/* User Info */}
        {!collapsed && user && (
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
              {user.firstName} {user.lastName}
            </p>
            <span style={{
              display: "inline-block",
              marginTop: "4px",
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {roleBadge}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
          {sections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section} style={{ marginBottom: "0.25rem" }}>
                {!collapsed && (
                  <p style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "0.5rem 0.75rem 0.25rem",
                    margin: 0,
                  }}>
                    {section.section}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        textDecoration: "none",
                        transition: "all 0.2s",
                        backgroundColor: isActive ? "#2563eb" : "transparent",
                        color: isActive ? "white" : "#6b7280",
                        boxShadow: isActive ? "0 4px 6px -1px rgba(37, 99, 235, 0.3)" : "none",
                      }}
                    >
                      <item.icon style={{ width: "18px", height: "18px", flexShrink: 0 }} />
                      {!collapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                          {item.label}
                        </motion.span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e5e7eb" }}>
          {!collapsed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: "0.7rem", color: "#9ca3af", margin: 0 }}>
              SmartMed v2.0 · AI-Powered
            </motion.p>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
