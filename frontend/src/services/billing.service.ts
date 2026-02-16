import api from './api';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  notes?: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phonePrimary: string;
  };
  items: InvoiceItem[];
  payments: Payment[];
}

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDate: string;
  status: string;
  notes?: string;
}

export interface DailySummary {
  date: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  byPaymentMethod: Record<string, number>;
}

export interface AgingReport {
  current: { count: number; total: number; invoices: Invoice[] };
  days30: { count: number; total: number; invoices: Invoice[] };
  days60: { count: number; total: number; invoices: Invoice[] };
  days90Plus: { count: number; total: number; invoices: Invoice[] };
  totalOutstanding: number;
}

export interface NHISClaim {
  id: string;
  claimNumber: string;
  nhisNumber: string;
  patientId: string;
  claimDate: string;
  totalAmount: number;
  approvedAmount: number | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    quantity: number;
    amount: number;
    approvedAmount: number | null;
    status: string;
    tariff: { code: string; description: string; price: number };
  }>;
}

export interface NHISClaimsSummary {
  draft: { count: number; amount: number };
  submitted: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number; amount: number };
  paid: { count: number; amount: number };
}

class BillingService {
  // Invoices
  async getInvoices(params?: {
    status?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Invoice[]> {
    const response = await api.get('/billing/invoices', { params });
    return response.data.data;
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    const response = await api.get(`/billing/invoices/${id}`);
    return response.data.data;
  }

  async createInvoice(data: {
    patientId: string;
    encounterId?: string;
    items: Array<{
      serviceType: string;
      serviceId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    paymentMethod?: string;
    notes?: string;
  }): Promise<Invoice> {
    const response = await api.post('/billing/invoices', data);
    return response.data.data;
  }

  async generateFromEncounter(encounterId: string): Promise<Invoice> {
    const response = await api.post(`/billing/invoices/from-encounter/${encounterId}`);
    return response.data.data;
  }

  async addInvoiceItem(invoiceId: string, item: {
    serviceType: string;
    serviceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }): Promise<Invoice> {
    const response = await api.post(`/billing/invoices/${invoiceId}/items`, item);
    return response.data.data;
  }

  async removeInvoiceItem(invoiceId: string, itemId: string): Promise<Invoice> {
    const response = await api.delete(`/billing/invoices/${invoiceId}/items/${itemId}`);
    return response.data.data;
  }

  async applyDiscount(invoiceId: string, discount: number, reason: string): Promise<Invoice> {
    const response = await api.post(`/billing/invoices/${invoiceId}/discount`, { discount, reason });
    return response.data.data;
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    const response = await api.post(`/billing/invoices/${invoiceId}/cancel`, { reason });
    return response.data.data;
  }

  // Payments
  async getPayments(params?: {
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    limit?: number;
  }): Promise<Payment[]> {
    const response = await api.get('/billing/payments', { params });
    return response.data.data;
  }

  async getPaymentById(id: string): Promise<Payment> {
    const response = await api.get(`/billing/payments/${id}`);
    return response.data.data;
  }

  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    notes?: string;
  }): Promise<{ payment: Payment; receiptNumber: string; invoiceStatus: string; remainingBalance: number }> {
    const response = await api.post('/billing/payments', data);
    return response.data.data;
  }

  async processRefund(paymentId: string, amount: number, reason: string): Promise<any> {
    const response = await api.post(`/billing/payments/${paymentId}/refund`, { amount, reason });
    return response.data.data;
  }

  // Mobile Money
  async initiateMobileMoneyPayment(data: {
    invoiceId: string;
    phone: string;
    network: string;
    amount: number;
  }): Promise<{ transactionId: string; status: string; message: string }> {
    const response = await api.post('/billing/payments/mobile-money/initiate', data);
    return response.data.data;
  }

  // Reports
  async getDailySummary(date?: string): Promise<DailySummary> {
    const response = await api.get('/billing/reports/daily-summary', { params: { date } });
    return response.data.data;
  }

  async getOutstandingInvoices(patientId?: string): Promise<Invoice[]> {
    const response = await api.get('/billing/reports/outstanding', { params: { patientId } });
    return response.data.data;
  }

  async getAgingReport(): Promise<AgingReport> {
    const response = await api.get('/billing/reports/aging');
    return response.data.data;
  }

  // NHIS Claims
  async getNHISClaims(params?: { status?: string; startDate?: string; endDate?: string; limit?: number }): Promise<NHISClaim[]> {
    const response = await api.get('/billing/nhis/claims', { params });
    return response.data.data;
  }

  async getNHISClaimById(id: string): Promise<NHISClaim> {
    const response = await api.get(`/billing/nhis/claims/${id}`);
    return response.data.data;
  }

  async getNHISClaimsSummary(): Promise<NHISClaimsSummary> {
    const response = await api.get('/billing/nhis/claims/summary');
    return response.data.data;
  }

  async createNHISClaim(data: {
    patientId: string;
    encounterId?: string;
    nhisNumber: string;
    items: Array<{ tariffCode: string; quantity: number; amount: number }>;
    notes?: string;
  }): Promise<NHISClaim> {
    const response = await api.post('/billing/nhis/claims', data);
    return response.data.data;
  }

  async createNHISClaimFromInvoice(invoiceId: string): Promise<NHISClaim> {
    const response = await api.post(`/billing/nhis/claims/from-invoice/${invoiceId}`);
    return response.data.data;
  }

  async submitNHISClaim(claimId: string): Promise<NHISClaim> {
    const response = await api.post(`/billing/nhis/claims/${claimId}/submit`);
    return response.data.data;
  }

  async getNHISClaimXML(claimId: string): Promise<string> {
    const response = await api.get(`/billing/nhis/claims/${claimId}/xml`, { responseType: 'text' });
    return response.data;
  }

  async getNHISBatchXML(claimIds: string[]): Promise<string> {
    const response = await api.post('/billing/nhis/claims/batch-xml', { claimIds }, { responseType: 'text' });
    return response.data;
  }

  async getNHISTariffs(category?: string): Promise<any[]> {
    const response = await api.get('/billing/nhis/tariffs', { params: { category } });
    return response.data.data;
  }

  async reconcileNHISClaims(items: Array<{
    claimNumber: string;
    status: 'APPROVED' | 'REJECTED' | 'PAID';
    approvedAmount?: number;
    rejectionReason?: string;
  }>): Promise<any[]> {
    const response = await api.post('/billing/nhis/reconcile', { items });
    return response.data.data;
  }
}

export const billingService = new BillingService();
