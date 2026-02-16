import { useSelector } from "react-redux";
import { RootState } from "@/store";
import AdminDashboard from "./dashboards/AdminDashboard";
import DoctorDashboard from "./dashboards/DoctorDashboard";
import NurseDashboard from "./dashboards/NurseDashboard";
import PharmacistDashboard from "./dashboards/PharmacistDashboard";
import LabTechDashboard from "./dashboards/LabTechDashboard";
import ReceptionistDashboard from "./dashboards/ReceptionistDashboard";
import BillingOfficerDashboard from "./dashboards/BillingDashboard";

export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const role = user?.role || "";

  switch (role) {
    case "SUPER_ADMIN":
    case "HOSPITAL_ADMIN":
    case "MEDICAL_DIRECTOR":
      return <AdminDashboard />;

    case "DOCTOR":
      return <DoctorDashboard />;

    case "NURSE":
    case "HEAD_NURSE":
      return <NurseDashboard />;

    case "PHARMACIST":
      return <PharmacistDashboard />;

    case "LAB_TECHNICIAN":
      return <LabTechDashboard />;

    case "RECEPTIONIST":
      return <ReceptionistDashboard />;

    case "BILLING_OFFICER":
    case "ACCOUNTANT":
      return <BillingOfficerDashboard />;

    default:
      return <AdminDashboard />;
  }
}
