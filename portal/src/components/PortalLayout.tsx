import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FlaskConical, Pill, Receipt,
  FileText, User, LogOut, Menu, X, Heart
} from 'lucide-react';

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  photoUrl?: string;
}

interface PortalLayoutProps {
  patient: PatientInfo;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/lab-results', label: 'Lab Results', icon: FlaskConical },
  { path: '/prescriptions', label: 'Prescriptions', icon: Pill },
  { path: '/invoices', label: 'Bills & Payments', icon: Receipt },
  { path: '/medical-records', label: 'Medical Records', icon: FileText },
  { path: '/profile', label: 'My Profile', icon: User },
];

const PortalLayout: React.FC<PortalLayoutProps> = ({ patient, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <Heart className="text-primary-600" size={24} />
              <span className="font-bold text-lg text-gray-800">Patient Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{patient.firstName} {patient.lastName}</p>
              <p className="text-xs text-gray-500">MRN: {patient.mrn}</p>
            </div>
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 text-sm font-medium">
                  {patient.firstName[0]}{patient.lastName[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out pt-16 lg:pt-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
            <hr className="my-3" />
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
