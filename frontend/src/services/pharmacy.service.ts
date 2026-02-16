import api from './api';

export interface PrescriptionQueueItem {
  id: string;
  patientId: string;
  status: string;
  createdAt: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    allergies: Array<{ allergen: string; severity: string }>;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: string;
    drugId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    dispensedQty: number;
    status: string;
    drug: {
      id: string;
      genericName: string;
      brandName: string;
      strength: string;
      form: string;
    };
    stockAvailable?: number;
    batches?: Array<{
      id: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
    }>;
  }>;
}

export interface StockItem {
  id: string;
  drugId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  drug: {
    id: string;
    genericName: string;
    brandName: string;
    strength: string;
    form: string;
    category: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: number;
  supplier: Supplier;
  items: Array<{
    id: string;
    drugId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    totalCost: number;
    drug: {
      genericName: string;
      brandName: string;
      strength: string;
    };
  }>;
}

class PharmacyService {
  // Dispensing
  async getPrescriptionQueue(status?: string): Promise<PrescriptionQueueItem[]> {
    const params = status ? { status } : {};
    const response = await api.get('/pharmacy/queue', { params });
    return response.data.data;
  }

  async getPrescriptionDetails(prescriptionId: string): Promise<PrescriptionQueueItem> {
    const response = await api.get(`/pharmacy/queue/${prescriptionId}`);
    return response.data.data;
  }

  async dispensePrescription(data: {
    prescriptionId: string;
    items: Array<{ prescriptionItemId: string; quantityToDispense: number; batchNumber?: string }>;
    counselingNotes?: string;
  }): Promise<any> {
    const response = await api.post('/pharmacy/dispense', data);
    return response.data.data;
  }

  async getDispensingHistory(params?: {
    patientId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get('/pharmacy/dispensing-history', { params });
    return response.data.data;
  }

  // Stock Management
  async getStock(params?: {
    drugId?: string;
    category?: string;
    lowStockOnly?: boolean;
    expiringDays?: number;
  }): Promise<StockItem[]> {
    const response = await api.get('/pharmacy/stock', { params });
    return response.data.data;
  }

  async getLowStockAlerts(): Promise<any[]> {
    const response = await api.get('/pharmacy/stock/low');
    return response.data.data;
  }

  async getExpiringStock(days?: number): Promise<StockItem[]> {
    const response = await api.get('/pharmacy/stock/expiring', { params: { days } });
    return response.data.data;
  }

  async adjustStock(data: {
    drugId: string;
    batchNumber?: string;
    adjustmentType: 'ADD' | 'REMOVE' | 'SET';
    quantity: number;
    reason: string;
    expiryDate?: string;
    costPrice?: number;
    sellingPrice?: number;
  }): Promise<any> {
    const response = await api.post('/pharmacy/stock/adjust', data);
    return response.data.data;
  }

  async receiveStock(data: {
    drugId: string;
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
    costPrice?: number;
    sellingPrice?: number;
  }): Promise<any> {
    const response = await api.post('/pharmacy/stock/receive', data);
    return response.data.data;
  }

  async getStockMovements(params?: {
    drugId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get('/pharmacy/stock/movements', { params });
    return response.data.data;
  }

  async getStockValuation(): Promise<any> {
    const response = await api.get('/pharmacy/stock/valuation');
    return response.data.data;
  }

  // Suppliers
  async getSuppliers(activeOnly?: boolean): Promise<Supplier[]> {
    const response = await api.get('/pharmacy/suppliers', { params: { activeOnly } });
    return response.data.data;
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.post('/pharmacy/suppliers', data);
    return response.data.data;
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.put(`/pharmacy/suppliers/${id}`, data);
    return response.data.data;
  }

  // Purchase Orders
  async getPurchaseOrders(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrder[]> {
    const response = await api.get('/pharmacy/purchase-orders', { params });
    return response.data.data;
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
    const response = await api.get(`/pharmacy/purchase-orders/${id}`);
    return response.data.data;
  }

  async createPurchaseOrder(data: {
    supplierId: string;
    expectedDate?: string;
    notes?: string;
    items: Array<{ drugId: string; quantityOrdered: number; unitCost: number }>;
  }): Promise<PurchaseOrder> {
    const response = await api.post('/pharmacy/purchase-orders', data);
    return response.data.data;
  }

  async submitPurchaseOrder(id: string): Promise<any> {
    const response = await api.post(`/pharmacy/purchase-orders/${id}/submit`);
    return response.data.data;
  }

  async approvePurchaseOrder(id: string): Promise<any> {
    const response = await api.post(`/pharmacy/purchase-orders/${id}/approve`);
    return response.data.data;
  }

  async receiveGoods(id: string, items: Array<{
    itemId: string;
    quantityReceived: number;
    batchNumber: string;
    expiryDate?: string;
  }>): Promise<any> {
    const response = await api.post(`/pharmacy/purchase-orders/${id}/receive`, { items });
    return response.data.data;
  }

  async cancelPurchaseOrder(id: string): Promise<any> {
    const response = await api.post(`/pharmacy/purchase-orders/${id}/cancel`);
    return response.data.data;
  }
}

export const pharmacyService = new PharmacyService();
