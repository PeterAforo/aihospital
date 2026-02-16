import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Building2, ChevronDown, Check } from "lucide-react";
import { RootState } from "@/store";
import { setBranches, setCurrentBranch } from "@/store/slices/authSlice";
import api from "@/services/api";

export function BranchSelector() {
  const dispatch = useDispatch();
  const { branches, currentBranchId } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (branches.length === 0) {
      loadBranches();
    }
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.get("/tenants/branches");
      const data = res.data.data || res.data.branches || [];
      dispatch(setBranches(data));
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const displayName = currentBranch?.name || "Select Branch";

  if (branches.length <= 1) {
    // Single branch — show label only, no dropdown
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          fontSize: "0.8125rem",
          color: "#166534",
          fontWeight: 500,
        }}
      >
        <Building2 style={{ width: "14px", height: "14px" }} />
        {displayName}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          fontSize: "0.8125rem",
          color: "#166534",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <Building2 style={{ width: "14px", height: "14px" }} />
        {displayName}
        <ChevronDown
          style={{
            width: "14px",
            height: "14px",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: "220px",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Switch Branch
            </div>
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  dispatch(setCurrentBranch(branch.id));
                  setOpen(false);
                  window.location.reload();
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  backgroundColor:
                    branch.id === currentBranchId ? "#f0fdf4" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  color: branch.id === currentBranchId ? "#166534" : "#374151",
                  fontWeight: branch.id === currentBranchId ? 600 : 400,
                  textAlign: "left",
                }}
              >
                <Building2 style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  {branch.name}
                  {branch.isMainBranch && (
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "0.625rem",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        fontWeight: 500,
                      }}
                    >
                      Main
                    </span>
                  )}
                </span>
                {branch.id === currentBranchId && (
                  <Check style={{ width: "14px", height: "14px", color: "#16a34a" }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
