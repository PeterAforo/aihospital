import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Users, Loader2, Eye } from "lucide-react";
import { patientService } from "@/services/patient.service";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 10px 10px 40px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};

export default function PatientListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", searchQuery],
    queryFn: () => patientService.search({ q: searchQuery, limit: 20 }),
  });

  const patients = data?.data || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.25rem" }}>
            Patients
          </h1>
          <p style={{ color: "#6b7280" }}>Manage patient records</p>
        </div>
        <button style={buttonStyle} onClick={() => navigate("/patients/new")}>
          <Plus style={{ width: "18px", height: "18px" }} />
          New Patient
        </button>
      </div>

      {/* Search & Table Card */}
      <div style={cardStyle}>
        {/* Search Header */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ position: "relative", maxWidth: "320px" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af", pointerEvents: "none" }} />
            <input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "0" }}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
              <Loader2 style={{ width: "32px", height: "32px", color: "#2563eb", animation: "spin 1s linear infinite" }} />
            </div>
          ) : patients.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", textAlign: "center" }}>
              <Users style={{ width: "48px", height: "48px", color: "#9ca3af", marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 500, color: "#1f2937" }}>No patients found</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Get started by registering a new patient</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>MRN</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Phone</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Gender</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>NHIS</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient: any, index: number) => (
                    <motion.tr
                      key={patient.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontFamily: "monospace", color: "#374151" }}>{patient.mrn}</td>
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#1f2937", fontWeight: 500 }}>
                        {patient.firstName} {patient.lastName}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#6b7280" }}>{patient.phone}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "4px 10px",
                          borderRadius: "9999px",
                          backgroundColor: patient.gender === "MALE" ? "#dbeafe" : "#fce7f3",
                          color: patient.gender === "MALE" ? "#1e40af" : "#be185d",
                        }}>
                          {patient.gender}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "4px 10px",
                          borderRadius: "9999px",
                          backgroundColor: patient.nhisInfo ? "#dcfce7" : "#f3f4f6",
                          color: patient.nhisInfo ? "#166534" : "#6b7280",
                        }}>
                          {patient.nhisInfo ? "Active" : "None"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => navigate(`/patients/${patient.id}`)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            backgroundColor: "transparent",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          <Eye style={{ width: "14px", height: "14px" }} />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
