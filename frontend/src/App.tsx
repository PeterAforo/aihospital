import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Contexts
import { NotificationProvider } from './contexts/NotificationContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Patient Pages
import PatientListPage from './pages/patients/PatientListPage';
import PatientCreatePage from './pages/patients/PatientCreatePage';
import PatientProfile from './pages/patients/PatientProfile';

// Appointment Pages
import AppointmentListPage from './pages/appointments/AppointmentListPage';
import AppointmentCalendarPage from './pages/appointments/AppointmentCalendarPage';
import AppointmentBookingPage from './pages/appointments/AppointmentBookingPage';
import AppointmentDetailPage from './pages/appointments/AppointmentDetailPage';
import QueueDisplayPage from './pages/appointments/QueueDisplayPage';

// Triage Pages
import TriageStation from './pages/triage/TriageStation';
import TriageHistoryPage from './pages/triage/TriageHistoryPage';

// EMR Pages
import EncounterWorkspace from './pages/emr/EncounterWorkspace';
import EMRDashboard from './pages/emr/EMRDashboard';
import LabResultsDashboard from './pages/emr/LabResultsDashboard';

// Walk-in
import WalkInRegistration from './pages/walkin/WalkInRegistration';

// Settings
import UserManagement from './pages/settings/UserManagement';
import SettingsPage from './pages/settings/SettingsPage';

// Pharmacy
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import DispensingQueue from './pages/pharmacy/DispensingQueue';
import StockManagement from './pages/pharmacy/StockManagement';
import DispenseDetail from './pages/pharmacy/DispenseDetail';
import PurchaseOrderManagement from './pages/pharmacy/PurchaseOrderManagement';
import SupplierManagement from './pages/pharmacy/SupplierManagement';

// Laboratory
import LabDashboard from './pages/laboratory/LabDashboard';
import LabWorklist from './pages/laboratory/LabWorklist';
import LabOrderDetail from './pages/laboratory/LabOrderDetail';
import LabVerificationQueue from './pages/laboratory/LabVerificationQueue';
import LabReport from './pages/laboratory/LabReport';

// Billing
import BillingDashboard from './pages/billing/BillingDashboard';
import InvoiceList from './pages/billing/InvoiceList';
import InvoiceDetail from './pages/billing/InvoiceDetail';
import NewInvoice from './pages/billing/NewInvoice';
import OutstandingInvoices from './pages/billing/OutstandingInvoices';
import NHISClaimsManager from './pages/billing/NHISClaimsManager';

// Finance
import FinancePricingPage from './pages/finance/FinancePricingPage';
import ProfitabilityDashboard from './pages/finance/ProfitabilityDashboard';

// Reports & Analytics
import AnalyticsDashboard from './pages/reports/AnalyticsDashboard';

// Radiology
import RadiologyWorklist from './pages/radiology/RadiologyWorklist';
import RadiologyOrderDetail from './pages/radiology/RadiologyOrderDetail';

// Theatre
import TheatreSchedule from './pages/theatre/TheatreSchedule';

// Maternity
import MaternityDashboard from './pages/maternity/MaternityDashboard';

// Emergency
import EmergencyBoard from './pages/emergency/EmergencyBoard';

// Inventory
import InventoryDashboard from './pages/inventory/InventoryDashboard';

// Equipment
import EquipmentDashboard from './pages/equipment/EquipmentDashboard';

// HR
import HRDashboard from './pages/hr/HRDashboard';

// Inpatient
import WardBedManagement from './pages/inpatient/WardBedManagement';

// Portal
import PortalRedirect from './pages/portal/PortalRedirect';
import AdmissionsPage from './pages/inpatient/AdmissionsPage';
import AdmissionDetailPage from './pages/inpatient/AdmissionDetail';
import NewAdmission from './pages/inpatient/NewAdmission';

// Registration
import RegistrationWizard from './pages/registration/RegistrationWizard';

// Setup Wizard
import SetupWizard from './pages/setup/SetupWizard';

// Procurement
import ProcurementPage from './pages/procurement/ProcurementPage';

// AI Dashboard
import AIDashboardPage from './pages/ai/AIDashboardPage';

// Telemedicine
import TelemedicinePage from './pages/telemedicine/TelemedicinePage';

// Public Health
import PublicHealthPage from './pages/public-health/PublicHealthPage';

// API Settings
import ApiSettingsPage from './pages/settings/ApiSettingsPage';

// CRM
import CRMPage from './pages/crm/CRMPage';

// Community Health
import CommunityHealthPage from './pages/community-health/CommunityHealthPage';

// Research
import ResearchPage from './pages/research/ResearchPage';

// White Label & SaaS
import WhiteLabelPage from './pages/white-label/WhiteLabelPage';

// Admin
import AuditLogsPage from './pages/admin/AuditLogsPage';

// Nursing Notes & Surgical Checklist
import NursingNotesTimeline from './pages/inpatient/NursingNotesTimeline';
import SurgicalChecklistPage from './pages/theatre/SurgicalChecklistPage';

// Finance
import BudgetVariancePage from './pages/finance/BudgetVariancePage';

// HR Shift Scheduling
import ShiftSchedulingPage from './pages/hr/ShiftSchedulingPage';

// Pharmacy Stock Transfer
import StockTransferPage from './pages/pharmacy/StockTransferPage';

// NHIS Batch Processing
import NHISBatchPage from './pages/billing/NHISBatchPage';

// Custom Report Builder
import CustomReportBuilder from './pages/reports/CustomReportBuilder';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Registration Wizard */}
      <Route path="/register" element={<RegistrationWizard />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <NotificationProvider>
              <MainLayout />
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Patients */}
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/patients/new" element={<PatientCreatePage />} />
        <Route path="/patients/:id" element={<PatientProfile />} />
        
        {/* Appointments */}
        <Route path="/appointments" element={<AppointmentListPage />} />
        <Route path="/appointments/new" element={<AppointmentBookingPage />} />
        <Route path="/appointments/calendar" element={<AppointmentCalendarPage />} />
        <Route path="/appointments/queue" element={<QueueDisplayPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        
        {/* Triage */}
        <Route path="/triage" element={<TriageStation />} />
        
        {/* EMR / Encounters */}
        <Route path="/emr" element={<EMRDashboard />} />
        <Route path="/encounters/:encounterId" element={<EncounterWorkspace />} />
        <Route path="/emr/lab-results" element={<LabResultsDashboard />} />
        
        {/* OPD */}
        <Route path="/opd" element={<WalkInRegistration />} />
        
        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/users" element={<UserManagement />} />
        
        {/* Pharmacy */}
        <Route path="/pharmacy" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/queue" element={<DispensingQueue />} />
        <Route path="/pharmacy/stock" element={<StockManagement />} />
        <Route path="/pharmacy/dispense/:prescriptionId" element={<DispenseDetail />} />
        <Route path="/pharmacy/purchase-orders" element={<PurchaseOrderManagement />} />
        <Route path="/pharmacy/suppliers" element={<SupplierManagement />} />
        
        {/* Laboratory */}
        <Route path="/lab" element={<LabDashboard />} />
        <Route path="/lab/worklist" element={<LabWorklist />} />
        <Route path="/lab/verification" element={<LabVerificationQueue />} />
        <Route path="/lab/order/:orderId" element={<LabOrderDetail />} />
        <Route path="/lab/report/:orderId" element={<LabReport />} />
        
        {/* Billing */}
        <Route path="/billing" element={<BillingDashboard />} />
        <Route path="/billing/invoices" element={<InvoiceList />} />
        <Route path="/billing/invoices/new" element={<NewInvoice />} />
        <Route path="/billing/invoices/:invoiceId" element={<InvoiceDetail />} />
        <Route path="/billing/outstanding" element={<OutstandingInvoices />} />
        <Route path="/billing/nhis" element={<NHISClaimsManager />} />
        
        {/* Finance & Pricing */}
        <Route path="/finance/pricing" element={<FinancePricingPage />} />
        <Route path="/finance/profitability" element={<ProfitabilityDashboard />} />
        
        {/* Reports & Analytics */}
        <Route path="/reports/analytics" element={<AnalyticsDashboard />} />
        
        {/* Radiology */}
        <Route path="/radiology" element={<RadiologyWorklist />} />
        <Route path="/radiology/orders/:orderId" element={<RadiologyOrderDetail />} />

        {/* Theatre */}
        <Route path="/theatre" element={<TheatreSchedule />} />

        {/* Maternity */}
        <Route path="/maternity" element={<MaternityDashboard />} />

        {/* Emergency */}
        <Route path="/emergency" element={<EmergencyBoard />} />

        {/* Inventory */}
        <Route path="/inventory" element={<InventoryDashboard />} />

        {/* Equipment */}
        <Route path="/equipment" element={<EquipmentDashboard />} />

        {/* HR & Payroll */}
        <Route path="/hr" element={<HRDashboard />} />

        {/* Procurement & Supply Chain */}
        <Route path="/procurement" element={<ProcurementPage />} />

        {/* AI Dashboard */}
        <Route path="/ai" element={<AIDashboardPage />} />

        {/* Telemedicine */}
        <Route path="/telemedicine" element={<TelemedicinePage />} />

        {/* Public Health */}
        <Route path="/public-health" element={<PublicHealthPage />} />

        {/* API Settings */}
        <Route path="/api-settings" element={<ApiSettingsPage />} />

        {/* CRM */}
        <Route path="/crm" element={<CRMPage />} />

        {/* Community Health */}
        <Route path="/community-health" element={<CommunityHealthPage />} />

        {/* Research */}
        <Route path="/research" element={<ResearchPage />} />

        {/* White Label & SaaS */}
        <Route path="/white-label" element={<WhiteLabelPage />} />

        {/* Triage History */}
        <Route path="/triage/patient/:patientId/history" element={<TriageHistoryPage />} />

        {/* Nursing Notes Timeline */}
        <Route path="/inpatient/admissions/:admissionId/nursing-notes" element={<NursingNotesTimeline />} />

        {/* Surgical Checklist */}
        <Route path="/theatre/surgeries/:surgeryId/checklist" element={<SurgicalChecklistPage />} />

        {/* Finance */}
        <Route path="/finance/budget-variance" element={<BudgetVariancePage />} />

        {/* HR Shift Scheduling */}
        <Route path="/hr/shifts" element={<ShiftSchedulingPage />} />

        {/* Stock Transfers */}
        <Route path="/pharmacy/transfers" element={<StockTransferPage />} />

        {/* NHIS Batch Processing */}
        <Route path="/billing/nhis/batch" element={<NHISBatchPage />} />

        {/* Custom Report Builder */}
        <Route path="/reports/builder" element={<CustomReportBuilder />} />

        {/* Admin */}
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />

        {/* Patient Portal */}
        <Route path="/portal" element={<PortalRedirect />} />

        {/* Inpatient */}
        <Route path="/inpatient/wards" element={<WardBedManagement />} />
        <Route path="/inpatient/admissions" element={<AdmissionsPage />} />
        <Route path="/inpatient/admissions/:admissionId" element={<AdmissionDetailPage />} />
        <Route path="/inpatient/admit" element={<NewAdmission />} />

        {/* Setup Wizard */}
        <Route path="/setup" element={<SetupWizard isModal={false} />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
