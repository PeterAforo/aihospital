import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const PW = 'Test123!';
const ctx: Record<string, any> = {};

async function login(req: APIRequestContext, email: string) {
  const r = await req.post(`${API}/auth/login`, { data: { email, password: PW } });
  const b = await r.json();
  expect(r.ok(), `Login ${email}: ${r.status()}`).toBeTruthy();
  const token = b.data.tokens.accessToken;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { token, userId: payload.userId, tenantId: payload.tenantId, branchId: payload.branchId };
}

function h(token: string) { return { Authorization: `Bearer ${token}` }; }

test.describe.serial('Advanced Modules E2E', () => {

  test('0. Login admin user', async ({ request }) => {
    const admin = await login(request, 'admin@hospital.com');
    ctx.token = admin.token;
    ctx.tenantId = admin.tenantId;
    ctx.userId = admin.userId;
    console.log('Admin logged in, tenant:', ctx.tenantId);
  });

  // ── SaaS Plans ──
  test('1.1 GET /saas/plans', async ({ request }) => {
    const r = await request.get(`${API}/saas/plans`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    console.log('Plans:', Array.isArray(b) ? b.length : 'not array');
  });

  test('1.2 GET /saas/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/saas/dashboard`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('totalTenants');
  });

  // ── CRM ──
  test('2.1 GET /crm/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/crm/dashboard?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('totalPatients');
  });

  test('2.2 GET /crm/segments', async ({ request }) => {
    const r = await request.get(`${API}/crm/segments?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('2.3 POST /crm/segments (upsert)', async ({ request }) => {
    const r = await request.post(`${API}/crm/segments`, {
      headers: h(ctx.token),
      data: { tenantId: ctx.tenantId, name: 'E2E Test Segment', description: 'Created by E2E test', criteria: { type: 'active' } },
    });
    expect(r.ok()).toBeTruthy();
  });

  test('2.4 GET /crm/campaigns', async ({ request }) => {
    const r = await request.get(`${API}/crm/campaigns?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('2.5 POST /crm/campaigns', async ({ request }) => {
    const r = await request.post(`${API}/crm/campaigns`, {
      headers: h(ctx.token),
      data: {
        tenantId: ctx.tenantId, name: 'E2E Test Campaign', campaignType: 'HEALTH_AWARENESS',
        channel: 'SMS', messageTemplate: 'Hello {name}, reminder for your checkup!', createdBy: ctx.userId,
      },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    ctx.campaignId = b.id;
  });

  test('2.6 GET /crm/feedback', async ({ request }) => {
    const r = await request.get(`${API}/crm/feedback?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('2.7 GET /crm/feedback/summary', async ({ request }) => {
    const r = await request.get(`${API}/crm/feedback/summary?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('total');
  });

  // ── Telemedicine ──
  test('3.1 GET /telemedicine/sessions', async ({ request }) => {
    const r = await request.get(`${API}/telemedicine/sessions?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('3.2 GET /telemedicine/readings', async ({ request }) => {
    const r = await request.get(`${API}/telemedicine/readings?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  // ── Public Health ──
  test('4.1 GET /public-health/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/public-health/dashboard?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('4.2 GET /public-health/notifications', async ({ request }) => {
    const r = await request.get(`${API}/public-health/notifications?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('4.3 GET /public-health/immunizations', async ({ request }) => {
    const r = await request.get(`${API}/public-health/immunizations?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  // ── Community Health ──
  test('5.1 GET /community-health/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/community-health/dashboard?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('activeWorkers');
  });

  test('5.2 POST /community-health/workers', async ({ request }) => {
    const r = await request.post(`${API}/community-health/workers`, {
      headers: h(ctx.token),
      data: { tenantId: ctx.tenantId, firstName: 'Ama', lastName: 'TestCHW', phone: '0201234567', community: 'Tema', district: 'Tema Metro' },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    ctx.workerId = b.id;
  });

  test('5.3 GET /community-health/workers', async ({ request }) => {
    const r = await request.get(`${API}/community-health/workers?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(Array.isArray(b)).toBeTruthy();
  });

  test('5.4 POST /community-health/visits', async ({ request }) => {
    const r = await request.post(`${API}/community-health/visits`, {
      headers: h(ctx.token),
      data: { tenantId: ctx.tenantId, workerId: ctx.workerId, visitType: 'HOME_VISIT', notes: 'E2E test visit' },
    });
    expect(r.ok()).toBeTruthy();
  });

  test('5.5 POST /community-health/households', async ({ request }) => {
    const r = await request.post(`${API}/community-health/households`, {
      headers: h(ctx.token),
      data: { tenantId: ctx.tenantId, headOfHousehold: 'Kofi Test', community: 'Tema', district: 'Tema Metro', memberCount: 4, hasChildUnder5: true },
    });
    expect(r.ok()).toBeTruthy();
  });

  // ── Research ──
  test('6.1 GET /research/dashboard', async ({ request }) => {
    const r = await request.get(`${API}/research/dashboard?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('totalTrials');
  });

  test('6.2 POST /research/trials', async ({ request }) => {
    const r = await request.post(`${API}/research/trials`, {
      headers: h(ctx.token),
      data: {
        tenantId: ctx.tenantId, trialCode: `E2E-${Date.now()}`, title: 'E2E Test Trial',
        principalInvestigator: 'Dr. Test', phase: 'Phase II', targetEnrollment: 50,
      },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    ctx.trialId = b.id;
  });

  test('6.3 GET /research/trials', async ({ request }) => {
    const r = await request.get(`${API}/research/trials?tenantId=${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(Array.isArray(b)).toBeTruthy();
  });

  // ── White Label ──
  test('7.1 GET /white-label/config/:tenantId', async ({ request }) => {
    const r = await request.get(`${API}/white-label/config/${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('7.2 POST /white-label/config/:tenantId', async ({ request }) => {
    const r = await request.post(`${API}/white-label/config/${ctx.tenantId}`, {
      headers: h(ctx.token),
      data: { brandName: 'E2E Test Hospital', primaryColor: '#2563eb', supportEmail: 'test@e2e.com' },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.brandName).toBe('E2E Test Hospital');
  });

  test('7.3 GET /white-label/resellers', async ({ request }) => {
    const r = await request.get(`${API}/white-label/resellers`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  // ── API Config ──
  test('8.1 GET /api-config/resolve', async ({ request }) => {
    const r = await request.get(`${API}/api-config/resolve?tenantId=${ctx.tenantId}&apiType=payment`, { headers: h(ctx.token) });
    // May return 404 if no config exists, that's OK
    expect([200, 404].includes(r.status())).toBeTruthy();
  });

  // ── Usage Metering ──
  test('9.1 POST /saas/usage/record', async ({ request }) => {
    const r = await request.post(`${API}/saas/usage/record`, {
      headers: h(ctx.token),
      data: { tenantId: ctx.tenantId, metricType: 'api_calls', increment: 1 },
    });
    expect(r.ok()).toBeTruthy();
  });

  test('9.2 GET /saas/usage/:tenantId', async ({ request }) => {
    const r = await request.get(`${API}/saas/usage/${ctx.tenantId}`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
  });

  test('9.3 GET /saas/usage/:tenantId/check/api_calls', async ({ request }) => {
    const r = await request.get(`${API}/saas/usage/${ctx.tenantId}/check/api_calls`, { headers: h(ctx.token) });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b).toHaveProperty('allowed');
    expect(b).toHaveProperty('current');
  });
});
