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

test.describe.serial('Inpatient & Clinical Workflow', () => {

  test('0. Login clinical users', async ({ request }) => {
    const nurse = await login(request, 'nurse.ipd@hospital.com');
    ctx.nurseToken = nurse.token;
    ctx.branchId = nurse.branchId;

    const doc = await login(request, 'doctor@hospital.com');
    ctx.docToken = doc.token;

    const lab = await login(request, 'lab.tech@hospital.com');
    ctx.labToken = lab.token;
  });

  // ==================== INPATIENT ====================

  test('1.1 Get IPD dashboard', async ({ request }) => {
    const r = await request.get(`${API}/inpatient/dashboard`, { headers: h(ctx.nurseToken) });
    const b = await r.json();
    expect(r.ok(), `IPD dashboard: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.2 Get wards', async ({ request }) => {
    const r = await request.get(`${API}/inpatient/wards`, { headers: h(ctx.nurseToken) });
    const b = await r.json();
    expect(r.ok(), `Wards: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('1.3 Get admissions', async ({ request }) => {
    const r = await request.get(`${API}/inpatient/admissions`, { headers: h(ctx.nurseToken) });
    const b = await r.json();
    expect(r.ok(), `Admissions: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== LABORATORY ====================

  test('2.1 Get lab worklist', async ({ request }) => {
    const r = await request.get(`${API}/lab/worklist`, { headers: h(ctx.labToken) });
    const b = await r.json();
    expect(r.ok(), `Lab worklist: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  test('2.2 Get lab test catalog', async ({ request }) => {
    const r = await request.get(`${API}/lab/tests`, { headers: h(ctx.labToken) });
    const b = await r.json();
    expect(r.ok(), `Lab tests: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== TRIAGE ====================

  test('3.1 Get triage queue', async ({ request }) => {
    const triageNurse = await login(request, 'nurse.triage@hospital.com');
    const r = await request.get(`${API}/triage/queue`, { headers: h(triageNurse.token) });
    const b = await r.json();
    expect(r.ok(), `Triage queue: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== RADIOLOGY ====================

  test('4.1 Get radiology worklist', async ({ request }) => {
    const r = await request.get(`${API}/radiology/worklist`, { headers: h(ctx.docToken) });
    const b = await r.json();
    expect(r.ok(), `Radiology: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== EMERGENCY ====================

  test('5.1 Get ER board', async ({ request }) => {
    const r = await request.get(`${API}/emergency/board`, { headers: h(ctx.docToken) });
    const b = await r.json();
    expect(r.ok(), `ER board: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== THEATRE ====================

  test('6.1 Get theatre schedule', async ({ request }) => {
    const r = await request.get(`${API}/theatre/schedule`, { headers: h(ctx.docToken) });
    const b = await r.json();
    expect(r.ok(), `Theatre: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });

  // ==================== MATERNITY ====================

  test('7.1 Get maternity records', async ({ request }) => {
    const r = await request.get(`${API}/maternity/records`, { headers: h(ctx.docToken) });
    const b = await r.json();
    expect(r.ok(), `Maternity: ${r.status()} ${JSON.stringify(b).slice(0, 500)}`).toBeTruthy();
  });
});
