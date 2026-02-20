import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const PW = 'Test123!';
const ctx: Record<string, any> = {};

function decodeJwt(token: string) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

async function login(req: APIRequestContext, email: string) {
  const r = await req.post(`${API}/auth/login`, { data: { email, password: PW } });
  const b = await r.json();
  expect(r.ok(), `Login ${email}: ${r.status()} ${JSON.stringify(b).slice(0, 300)}`).toBeTruthy();
  const token = b.data.tokens.accessToken;
  const jwt = decodeJwt(token);
  return { token, userId: jwt.userId, branchId: jwt.branchId, tenantId: jwt.tenantId };
}

function h(token: string) { return { Authorization: `Bearer ${token}` }; }

test.describe.serial('Pharmacy Workflow', () => {

  test('0. Login pharmacy & admin users', async ({ request }) => {
    const pharm = await login(request, 'pharmacist@hospital.com');
    ctx.pharmToken = pharm.token;
    ctx.branchId = pharm.branchId;
    ctx.tenantId = pharm.tenantId;

    const admin = await login(request, 'receptionist@hospital.com');
    ctx.adminToken = admin.token;
  });

  // ==================== STOCK MANAGEMENT ====================

  test('1.1 Get pharmacy stock', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Stock: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data).toBeDefined();
  });

  test('1.2 Get low stock alerts', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock/low`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Low stock: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.3 Get expiring stock', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock/expiring?days=90`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Expiring: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.4 Get expired stock', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock/expired`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Expired: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.5 Get stock valuation', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock/valuation`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Valuation: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.6 Get stock movements', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/stock/movements`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Movements: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== DISPENSING ====================

  test('2.1 Get prescription queue', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/queue`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Queue: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('2.2 Get dispensing history', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/dispensing-history`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `History: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== SUPPLIERS ====================

  test('3.1 Get suppliers', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/suppliers`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Suppliers: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('3.2 Create supplier', async ({ request }) => {
    const r = await request.post(`${API}/pharmacy/suppliers`, {
      headers: h(ctx.pharmToken),
      data: {
        supplierName: `E2E Supplier ${Date.now()}`,
        supplierCode: `SUP-E2E-${Date.now().toString().slice(-6)}`,
        contactPerson: 'John Test',
        phone: '0244000111',
        email: 'supplier@test.com',
        address: 'Accra, Ghana',
        supplierType: 'LOCAL',
        paymentTerms: 'NET_30',
      },
    });
    const b = await r.json();
    expect(r.ok(), `Create supplier: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    ctx.supplierId = b.data?.id;
  });

  // ==================== PURCHASE ORDERS ====================

  test('4.1 Get purchase orders', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/purchase-orders`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `POs: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== STOCK TRANSFERS ====================

  test('5.1 Get stock transfers', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/transfers`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Transfers: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== EXPIRY DASHBOARD ====================

  test('6.1 Get expiry summary', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/expiry/summary`, { headers: h(ctx.pharmToken) });
    const b = await r.json();
    expect(r.ok(), `Expiry summary: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });
});
