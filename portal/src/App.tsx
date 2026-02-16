import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import LabResults from './pages/LabResults';
import Prescriptions from './pages/Prescriptions';
import Invoices from './pages/Invoices';
import MedicalRecords from './pages/MedicalRecords';
import Profile from './pages/Profile';
import PortalLayout from './components/PortalLayout';

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

function App() {
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    const stored = localStorage.getItem('portal_patient');
    if (token && stored) {
      try { setPatient(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (patientData: PatientInfo, token: string) => {
    localStorage.setItem('portal_token', token);
    localStorage.setItem('portal_patient', JSON.stringify(patientData));
    setPatient(patientData);
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_patient');
    setPatient(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <PortalLayout patient={patient} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/lab-results" element={<LabResults />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/medical-records" element={<MedicalRecords />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalLayout>
  );
}

export default App;
