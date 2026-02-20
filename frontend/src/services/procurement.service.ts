import api from './api';

// ── Suppliers ──
export const getSuppliers = (activeOnly = true) => api.get('/pharmacy/suppliers', { params: { activeOnly } });
export const createSupplier = (data: any) => api.post('/pharmacy/suppliers', data);
export const updateSupplier = (id: string, data: any) => api.put(`/pharmacy/suppliers/${id}`, data);

// ── Purchase Orders ──
export const getPurchaseOrders = (params?: any) => api.get('/pharmacy/purchase-orders', { params });
export const getPurchaseOrderById = (id: string) => api.get(`/pharmacy/purchase-orders/${id}`);
export const createPurchaseOrder = (data: any) => api.post('/pharmacy/purchase-orders', data);
export const submitPurchaseOrder = (id: string) => api.post(`/pharmacy/purchase-orders/${id}/submit`);
export const approvePurchaseOrder = (id: string) => api.post(`/pharmacy/purchase-orders/${id}/approve`);
export const rejectPurchaseOrder = (id: string, notes?: string) => api.post(`/pharmacy/purchase-orders/${id}/reject`, { notes });
export const cancelPurchaseOrder = (id: string) => api.post(`/pharmacy/purchase-orders/${id}/cancel`);

// ── GRN ──
export const getGRNs = (status?: string) => api.get('/procurement/grn', { params: { status } });
export const getGRNById = (id: string) => api.get(`/procurement/grn/${id}`);
export const createGRN = (data: any) => api.post('/procurement/grn', data);
export const verifyGRN = (id: string) => api.post(`/procurement/grn/${id}/verify`);
export const rejectGRN = (id: string, notes?: string) => api.post(`/procurement/grn/${id}/reject`, { notes });

// ── Central Inventory ──
export const getCentralInventory = (params?: any) => api.get('/procurement/central', { params });
export const getCentralInventoryById = (id: string) => api.get(`/procurement/central/${id}`);
export const getCentralValuation = () => api.get('/procurement/central/valuation');
export const getCentralLowStock = () => api.get('/procurement/central/low-stock');

// ── Stock Issues ──
export const getStockIssues = (department?: string) => api.get('/procurement/stock-issues', { params: { department } });
export const getStockIssueById = (id: string) => api.get(`/procurement/stock-issues/${id}`);
export const createStockIssue = (data: any) => api.post('/procurement/stock-issues', data);

// ── Department Stock ──
export const getDepartmentStock = (department: string) => api.get(`/procurement/department/${department}`);

// ── Stock Movements ──
export const getStockMovements = (params?: any) => api.get('/procurement/movements', { params });
export const getAuditTrail = (itemId: string) => api.get(`/procurement/movements/audit-trail/${itemId}`);
