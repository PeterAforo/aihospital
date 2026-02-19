import { api } from './api';

export interface SetupStep {
  step: number;
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
}

export interface SetupStatus {
  setupCompleted: boolean;
  setupCompletedAt: string | null;
  overallPercentage: number;
  steps: SetupStep[];
  missingRequiredSteps: number[];
  showWizard: boolean;
}

export const setupService = {
  getStatus: async (): Promise<SetupStatus> => {
    const res = await api.get('/setup/status');
    return res.data.data;
  },

  saveStep: async (stepId: string, data: any) => {
    const res = await api.post(`/setup/steps/${stepId}`, data);
    return res.data.data;
  },

  skipStep: async (stepId: string) => {
    const res = await api.post(`/setup/steps/${stepId}/skip`);
    return res.data.data;
  },

  completeSetup: async () => {
    const res = await api.post('/setup/complete');
    return res.data.data;
  },
};
