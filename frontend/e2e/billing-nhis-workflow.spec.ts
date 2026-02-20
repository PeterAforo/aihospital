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

test.describe.serial('Billing & NHIS Workflow', () => {

  test('0. Login billing user', async ({ request }) => {
    const bill = await login(request, 'billing@hospital.com');
    ctx.billToken = bill.token;
    ctx.tenantId = bill.tenantId;
  });

  // ==================== INVOICES ====================

  test('1.1 Get invoices list', async ({ request }) => {
    const r = await request.get(`${API}/billing/invoices`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `Invoices: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.2 Get daily summary', async ({ request }) => {
    const r = await request.get(`${API}/billing/reports/daily-summary`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `Daily summary: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.3 Get outstanding invoices', async ({ request }) => {
    const r = await request.get(`${API}/billing/invoices?status=PENDING`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `Outstanding: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== NHIS CLAIMS ====================

  test('2.1 Get NHIS claims', async ({ request }) => {
    const r = await request.get(`${API}/billing/nhis/claims`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `NHIS claims: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('2.2 Get NHIS claims summary', async ({ request }) => {
    const r = await request.get(`${API}/billing/nhis/claims/summary`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `NHIS summary: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('2.3 Get NHIS tariffs', async ({ request }) => {
    const r = await request.get(`${API}/billing/nhis/tariffs`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `NHIS tariffs: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('2.4 Filter NHIS claims by status', async ({ request }) => {
    for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID']) {
      const r = await request.get(`${API}/billing/nhis/claims?status=${status}`, { headers: h(ctx.billToken) });
      expect(r.ok(), `NHIS ${status}: ${r.status()}`).toBeTruthy();
    }
  });

  // ==================== RECEIPTS ====================

  test('3.1 Get receipts', async ({ request }) => {
    const r = await request.get(`${API}/billing/receipts`, { headers: h(ctx.billToken) });
    const b = await r.json();
    expect(r.ok(), `Receipts: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });
});
