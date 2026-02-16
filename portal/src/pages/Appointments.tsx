import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { portalService, PortalAppointment } from '../services/portal.service';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  CHECKED_IN: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-600',
  TRIAGED: 'bg-sky-100 text-sky-700',
};

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'completed'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const load = filter === 'upcoming'
      ? portalService.getUpcomingAppointments()
      : portalService.getAppointments(filter === 'completed' ? 'COMPLETED' : undefined);
    load.then(setAppointments).catch(console.error).finally(() => setIsLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['upcoming', 'all', 'completed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                    {apt.chiefComplaint && <span className="text-sm text-gray-500">{apt.chiefComplaint}</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {format(new Date(apt.appointmentDate), 'MMM dd, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      {apt.appointmentTime}
                    </span>
                    {apt.doctor && (
                      <span className="flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                      </span>
                    )}
                    {apt.branch && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400" />
                        {apt.branch.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
