import React, { useState, useEffect } from 'react';
import { Pill, User } from 'lucide-react';
import { portalService, PortalPrescription } from '../services/portal.service';
import { format } from 'date-fns';

const Prescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PortalPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    portalService.getPrescriptions().then(setPrescriptions).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Prescriptions</h1>
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Pill className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No prescriptions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rx.status === 'DISPENSED' ? 'bg-green-100 text-green-700' :
                    rx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{rx.status}</span>
                  <span className="text-xs text-gray-400">{format(new Date(rx.createdAt), 'MMM dd, yyyy')}</span>
                </div>
                {rx.encounter?.doctor && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <User size={14} /> Dr. {rx.encounter.doctor.firstName} {rx.encounter.doctor.lastName}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {rx.items.map((item) => (
                  <div key={item.id} className="py-2 px-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">{item.drug.genericName}</p>
                      <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.dosage} &bull; {item.frequency} &bull; {item.duration}
                    </p>
                    {item.instructions && <p className="text-xs text-gray-400 mt-1 italic">{item.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
