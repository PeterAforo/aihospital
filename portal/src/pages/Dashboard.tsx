import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FlaskConical, Pill, Receipt, Activity, ArrowRight } from 'lucide-react';
import { portalService, DashboardStats } from '../services/portal.service';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    portalService.getDashboard().then(setStats).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const cards = [
    { label: 'Upcoming Appointments', value: stats?.upcomingAppointments ?? 0, icon: Calendar, color: 'bg-blue-500', path: '/appointments' },
    { label: 'Pending Bills', value: stats?.pendingInvoices ?? 0, icon: Receipt, color: 'bg-amber-500', path: '/invoices' },
    { label: 'Recent Lab Results', value: stats?.recentLabResults ?? 0, icon: FlaskConical, color: 'bg-green-500', path: '/lab-results' },
    { label: 'Recent Prescriptions', value: stats?.recentPrescriptions ?? 0, icon: Pill, color: 'bg-purple-500', path: '/prescriptions' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-500 mt-1">Here's an overview of your health information</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => navigate(card.path)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-primary-600" size={20} />
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'View upcoming appointments', path: '/appointments' },
              { label: 'Check lab results', path: '/lab-results' },
              { label: 'View prescriptions', path: '/prescriptions' },
              { label: 'Pay outstanding bills', path: '/invoices' },
              { label: 'View medical records', path: '/medical-records' },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                {action.label}
                <ArrowRight size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Health Tips</h2>
          <div className="space-y-3">
            {[
              'Remember to take your medications as prescribed.',
              'Stay hydrated — drink at least 8 glasses of water daily.',
              'Regular exercise helps maintain good health.',
              'Keep your follow-up appointments to monitor your progress.',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="w-5 h-5 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
