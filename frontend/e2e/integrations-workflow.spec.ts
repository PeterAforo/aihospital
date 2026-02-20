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

test.describe.serial('Integrations & DHIMS2', () => {

  test('0. Login admin user', async ({ request }) => {
    const admin = await login(request, 'receptionist@hospital.com');
    ctx.adminToken = admin.token;
    ctx.tenantId = admin.tenantId;
  });

  // ==================== NHIA ====================

  test('1.1 NHIA status', async ({ request }) => {
    const r = await request.get(`${API}/integrations/nhia/status`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `NHIA: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== DHIMS2 ====================

  test('2.1 DHIMS2 OPD report', async ({ request }) => {
    const now = new Date();
    const r = await request.get(`${API}/integrations/dhims2/opd?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `DHIMS2 OPD: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data?.reportType).toBe('OPD_ATTENDANCE');
  });

  test('2.2 DHIMS2 IPD report', async ({ request }) => {
    const now = new Date();
    const r = await request.get(`${API}/integrations/dhims2/ipd?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `DHIMS2 IPD: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data?.reportType).toBe('IPD_REPORT');
  });

  test('2.3 DHIMS2 Maternal report', async ({ request }) => {
    const now = new Date();
    const r = await request.get(`${API}/integrations/dhims2/maternal?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `DHIMS2 Maternal: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data?.reportType).toBe('MATERNAL_HEALTH');
  });

  test('2.4 DHIMS2 Lab report', async ({ request }) => {
    const now = new Date();
    const r = await request.get(`${API}/integrations/dhims2/lab?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `DHIMS2 Lab: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data?.reportType).toBe('LABORATORY');
  });

  test('2.5 DHIMS2 Monthly bundle', async ({ request }) => {
    const now = new Date();
    const r = await request.get(`${API}/integrations/dhims2/bundle?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `DHIMS2 Bundle: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
    expect(b.data?.reportBundle).toBe('DHIMS2_MONTHLY');
    expect(b.data?.reports?.opd).toBeDefined();
    expect(b.data?.reports?.ipd).toBeDefined();
    expect(b.data?.reports?.maternal).toBeDefined();
    expect(b.data?.reports?.lab).toBeDefined();
  });

  // ==================== INTEGRATION STATUS ====================

  test('3.1 Integration status overview', async ({ request }) => {
    const r = await request.get(`${API}/integrations/status`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `Status: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== PAYMENT PROVIDERS ====================

  test('4.1 Get supported payment providers', async ({ request }) => {
    const r = await request.get(`${API}/integrations/payments/providers`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `Providers: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== SMS PROVIDERS ====================

  test('5.1 Get supported SMS providers', async ({ request }) => {
    const r = await request.get(`${API}/integrations/sms/providers`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `SMS providers: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== WEBHOOK LOGS ====================

  test('6.1 Get webhook logs', async ({ request }) => {
    const r = await request.get(`${API}/integrations/webhooks/logs`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `Webhook logs: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('6.2 Get webhook stats', async ({ request }) => {
    const r = await request.get(`${API}/integrations/webhooks/stats`, { headers: h(ctx.adminToken) });
    const b = await r.json();
    expect(r.ok(), `Webhook stats: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });
});
