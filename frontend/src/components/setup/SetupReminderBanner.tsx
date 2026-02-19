import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupService, SetupStatus } from '../../services/setup.service';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';

const SetupReminderBanner: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setupService.getStatus()
      .then(s => { if (!s.setupCompleted) setStatus(s); })
      .catch(() => {});
  }, []);

  if (!status || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Your setup is {status.overallPercentage}% complete.{' '}
              <span className="text-amber-600 font-normal">
                {status.missingRequiredSteps.length} required step{status.missingRequiredSteps.length !== 1 ? 's' : ''} remaining.
              </span>
            </p>
          </div>
          {/* Mini progress bar */}
          <div className="hidden sm:block w-32 h-2 bg-amber-200 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${status.overallPercentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/setup')}
            className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            Continue Setup <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-amber-400 hover:text-amber-600 transition rounded"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupReminderBanner;
