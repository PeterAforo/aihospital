import api from './api';

export interface LabWorklistItem {
  id: string;
  patientId: string;
  orderedBy: string;
  orderDate: string;
  priority: string;
  status: string;
  notes: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  encounter?: {
    id: string;
    branchId: string;
    doctor: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  items: Array<{
    id: string;
    testId: string;
    status: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    normalRange?: string;
    isAbnormal: boolean;
    isCritical: boolean;
    test: {
      id: string;
      name: string;
      code: string;
      category: string;
      sampleType: string;
    };
    samples?: Array<{
      id: string;
      sampleNumber: string;
      status: string;
    }>;
  }>;
  samples?: Array<{
    id: string;
    sampleNumber: string;
    sampleType: string;
    status: string;
    collectedAt: string;
  }>;
}

export interface LabSample {
  id: string;
  sampleNumber: string;
  sampleType: string;
  status: string;
  collectedAt: string;
  collectionSite?: string;
  volume?: number;
  condition: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  orderItem: {
    id: string;
    test: {
      name: string;
      code: string;
    };
  };
}

export interface CriticalAlert {
  id: string;
  testName: string;
  resultValue: number;
  criticalType: string;
  notifiedAt: string;
  acknowledgedAt?: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  orderItem: {
    test: {
      name: string;
      unit: string;
    };
  };
}

class LaboratoryService {
  // Worklist
  async getWorklist(params?: {
    status?: string;
    priority?: string;
  }): Promise<LabWorklistItem[]> {
    const response = await api.get('/lab/worklist', { params });
    return response.data.data;
  }

  async getWorklistStats(): Promise<{
    pending: number;
    sampleCollected: number;
    processing: number;
    completedToday: number;
  }> {
    const response = await api.get('/lab/worklist/stats');
    return response.data.data;
  }

  // Sample Collection
  async collectSample(data: {
    orderId: string;
    orderItemId: string;
    patientId: string;
    sampleType: string;
    collectionSite?: string;
    volume?: number;
    notes?: string;
  }): Promise<LabSample> {
    const response = await api.post('/lab/samples/collect', data);
    return response.data.data;
  }

  async getSampleByNumber(sampleNumber: string): Promise<LabSample> {
    const response = await api.get(`/lab/samples/${sampleNumber}`);
    return response.data.data;
  }

  async receiveSample(sampleId: string, condition?: string): Promise<any> {
    const response = await api.post(`/lab/samples/${sampleId}/receive`, { condition });
    return response.data.data;
  }

  async rejectSample(sampleId: string, rejectionReason: string): Promise<any> {
    const response = await api.post(`/lab/samples/${sampleId}/reject`, { rejectionReason });
    return response.data.data;
  }

  // Results
  async enterResult(data: {
    orderItemId: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    notes?: string;
  }): Promise<any> {
    const response = await api.post('/lab/results', data);
    return response.data.data;
  }

  async batchEnterResults(results: Array<{
    orderItemId: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    notes?: string;
  }>): Promise<any> {
    const response = await api.post('/lab/results/batch', { results });
    return response.data.data;
  }

  async enterPanelResults(orderItemId: string, subResults: Array<{
    parameterName: string;
    parameterCode?: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    normalRange?: string;
  }>): Promise<any> {
    const response = await api.post('/lab/results/panel', { orderItemId, subResults });
    return response.data.data;
  }

  async verifyResult(orderItemId: string): Promise<any> {
    const response = await api.post(`/lab/results/${orderItemId}/verify`);
    return response.data.data;
  }

  async getOrderResults(orderId: string): Promise<LabWorklistItem> {
    const response = await api.get(`/lab/orders/${orderId}/results`);
    return response.data.data;
  }

  // Critical Values
  async getCriticalAlerts(all?: boolean): Promise<CriticalAlert[]> {
    const response = await api.get('/lab/critical-values', { params: { all } });
    return response.data.data;
  }

  async acknowledgeCriticalAlert(alertId: string, notes?: string): Promise<any> {
    const response = await api.post(`/lab/critical-values/${alertId}/acknowledge`, { notes });
    return response.data.data;
  }

  // Patient History
  async getPatientLabHistory(patientId: string, limit?: number): Promise<LabWorklistItem[]> {
    const response = await api.get(`/lab/patient/${patientId}/history`, { params: { limit } });
    return response.data.data;
  }
}

export const laboratoryService = new LaboratoryService();
