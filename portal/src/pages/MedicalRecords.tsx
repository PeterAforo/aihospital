import React, { useState, useEffect } from 'react';
import { FileText, Stethoscope, Activity } from 'lucide-react';
import { portalService, EncounterSummary } from '../services/portal.service';
import { format } from 'date-fns';

const MedicalRecords: React.FC = () => {
  const [encounters, setEncounters] = useState<EncounterSummary[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [tab, setTab] = useState<'encounters' | 'vitals'>('encounters');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([portalService.getEncounters(), portalService.getVitals()])
      .then(([enc, vit]) => { setEncounters(enc); setVitals(vit); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Medical Records</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button onClick={() => setTab('encounters')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'encounters' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          Visit History
        </button>
        <button onClick={() => setTab('vitals')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'vitals' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          Vital Signs
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : tab === 'encounters' ? (
        encounters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FileText className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No visit records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {encounters.map((enc) => (
              <div key={enc.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stethoscope size={16} className="text-primary-600" />
                      <span className="font-medium text-gray-800">
                        {enc.chiefComplaint || 'Medical Visit'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(enc.encounterDate), 'MMMM dd, yyyy')}
                      {enc.doctor && ` • Dr. ${enc.doctor.firstName} ${enc.doctor.lastName}`}
                      {enc.branch && ` • ${enc.branch.name}`}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    enc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{enc.status}</span>
                </div>
                {enc.clinicalImpression && (
                  <p className="text-sm text-gray-600 mt-2">{enc.clinicalImpression}</p>
                )}
                {enc.diagnoses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {enc.diagnoses.map((d, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded text-xs ${d.isPrimary ? 'bg-primary-50 text-primary-700 font-medium' : 'bg-gray-100 text-gray-600'}`}>
                        {d.icdCode}: {d.icdDescription}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        vitals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Activity className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No vital signs recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">BP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pulse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Temp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SpO2</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vitals.map((v: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{format(new Date(v.recordedAt), 'MMM dd, yyyy')}</td>
                    <td className="px-4 py-3">{v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : '—'}</td>
                    <td className="px-4 py-3">{v.pulseRate ?? '—'}</td>
                    <td className="px-4 py-3">{v.temperature ? `${v.temperature}°C` : '—'}</td>
                    <td className="px-4 py-3">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : '—'}</td>
                    <td className="px-4 py-3">{v.weight ? `${v.weight} kg` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default MedicalRecords;
