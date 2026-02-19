import React from 'react';
import { Loader2, Check, X, PartyPopper, BookOpen, Video, MessageCircle } from 'lucide-react';
import { SetupStatus } from '../../../services/setup.service';

interface Props {
  status: SetupStatus;
  onComplete: () => void;
  saving: boolean;
}

const ReviewStep: React.FC<Props> = ({ status, onComplete, saving }) => {
  const allRequiredDone = status.missingRequiredSteps.length === 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {allRequiredDone ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-3">
            <PartyPopper className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">You're all set!</h3>
          <p className="text-gray-500 mt-1">All required steps are complete. Review your setup below and finish.</p>
        </div>
      ) : (
        <div className="text-center py-4">
          <h3 className="text-xl font-bold text-gray-900">Almost there!</h3>
          <p className="text-gray-500 mt-1">Complete the remaining required steps to finish setup.</p>
        </div>
      )}

      {/* Completion progress */}
      <div className="flex items-center justify-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={allRequiredDone ? '#10b981' : '#3b82f6'} strokeWidth="3"
              strokeDasharray={`${status.overallPercentage}, 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800">{status.overallPercentage}%</span>
          </div>
        </div>
        <div className="text-left">
          <p className="text-sm text-gray-600">{status.steps.filter(s => s.completed).length} of {status.steps.length} steps completed</p>
          {status.missingRequiredSteps.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">{status.missingRequiredSteps.length} required step(s) remaining</p>
          )}
        </div>
      </div>

      {/* Step summary */}
      <div className="border rounded-xl overflow-hidden divide-y">
        {status.steps.map(s => (
          <div key={s.step} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s.completed ? 'bg-green-100 text-green-600' : s.required ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'
              }`}>
                {s.completed ? <Check className="w-4 h-4" /> : <X className="w-3 h-3" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${s.completed ? 'text-gray-800' : 'text-gray-500'}`}>{s.title}</p>
                <p className="text-xs text-gray-400">
                  Step {s.step} {!s.required && '(Optional)'}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              s.completed ? 'bg-green-100 text-green-700' : s.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {s.completed ? 'Complete' : s.required ? 'Required' : 'Skipped'}
            </span>
          </div>
        ))}
      </div>

      {/* Complete button */}
      {allRequiredDone && (
        <>
          <div className="pt-2 flex justify-center">
            <button type="button" onClick={onComplete} disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition font-bold text-lg shadow-lg shadow-green-200">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <PartyPopper className="w-5 h-5" />}
              Complete Setup
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 space-y-2 pt-2">
            <p>After completing setup, you can start:</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Registering patients</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Scheduling appointments</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Clinical consultations</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-gray-400">
            <a href="#" className="flex items-center gap-1 hover:text-blue-600 transition"><BookOpen className="w-3 h-3" /> User Guide</a>
            <a href="#" className="flex items-center gap-1 hover:text-blue-600 transition"><Video className="w-3 h-3" /> Video Tutorials</a>
            <a href="#" className="flex items-center gap-1 hover:text-blue-600 transition"><MessageCircle className="w-3 h-3" /> Contact Support</a>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewStep;
