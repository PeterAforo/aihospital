import api from './api';

export interface InventoryCategory {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  tenantId: string;
  categoryId?: string;
  name: string;
  code?: string;
  description?: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost?: number;
  location?: string;
  supplier?: string;
  isActive: boolean;
  lastRestocked?: string;
  expiryDate?: string;
  category?: { id: string; name: string };
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  reference?: string;
  reason?: string;
  performedBy: string;
  createdAt: string;
  item?: { id: string; name: string; code?: string; unit?: string };
}

export interface InventoryDashboardStats {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

class InventoryApiService {
  async getCategories(): Promise<InventoryCategory[]> {
    const res = await api.get('/inventory/categories');
    return res.data.data;
  }

  async createCategory(data: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const res = await api.post('/inventory/categories', data);
    return res.data.data;
  }

  async getItems(filters?: Record<string, any>): Promise<{ items: InventoryItem[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/inventory/items?${params.toString()}`);
    return res.data;
  }

  async getItemById(id: string): Promise<InventoryItem> {
    const res = await api.get(`/inventory/items/${id}`);
    return res.data.data;
  }

  async createItem(data: any): Promise<InventoryItem> {
    const res = await api.post('/inventory/items', data);
    return res.data.data;
  }

  async updateItem(id: string, data: any): Promise<InventoryItem> {
    const res = await api.put(`/inventory/items/${id}`, data);
    return res.data.data;
  }

  async recordTransaction(data: any): Promise<InventoryTransaction> {
    const res = await api.post('/inventory/transactions', data);
    return res.data.data;
  }

  async getTransactions(filters?: Record<string, any>): Promise<{ transactions: InventoryTransaction[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const res = await api.get(`/inventory/transactions?${params.toString()}`);
    return res.data;
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const res = await api.get('/inventory/items/low-stock');
    return res.data.data;
  }

  async getDashboardStats(): Promise<InventoryDashboardStats> {
    const res = await api.get('/inventory/dashboard');
    return res.data.data;
  }
}

export const inventoryApiService = new InventoryApiService();
