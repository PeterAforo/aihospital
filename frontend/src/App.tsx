import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

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

// Walk-in
import WalkInRegistration from './pages/walkin/WalkInRegistration';

// Settings
import UserManagement from './pages/settings/UserManagement';

// Registration
import RegistrationWizard from './pages/registration/RegistrationWizard';

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
            <MainLayout />
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
        
        {/* OPD */}
        <Route path="/opd" element={<WalkInRegistration />} />
        
        {/* Settings */}
        <Route path="/settings/users" element={<UserManagement />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
