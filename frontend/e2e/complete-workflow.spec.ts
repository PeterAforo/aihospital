import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const PW = 'Test123!';
const ctx: Record<string, any> = {};

async function login(req: APIRequestContext, email: string) {
  const r = await req.post(`${API}/auth/login`, { data: { email, password: PW } });
  expect(r.ok(), `Login ${email}: ${r.status()}`).toBeTruthy();
  const b = await r.json();
  return b.data.tokens.accessToken;
}

function h(token: string) { return { Authorization: `Bearer ${token}` }; }

test.describe.serial('Complete Patient Journey', () => {

  // STEP 1: Registration
  test('1.1 Receptionist login', async ({ request }) => {
    ctx.recToken = await login(request, 'receptionist@hospital.com');
  });

  test('1.2 Register patient', async ({ request }) => {
    const r = await request.post(`${API}/patients`, {
      headers: h(ctx.recToken),
      data: { firstName: 'Kwame', lastName: 'TestE2E', dateOfBirth: '1985-05-15', gender: 'MALE', phonePrimary: '+233244123456', ghanaCardNumber: `GHA-E2E-${Date.now()}` },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    ctx.patientId = b.data?.id;
    ctx.mrn = b.data?.mrn;
    expect(ctx.patientId).toBeTruthy();
  });

  test('1.3 Create appointment', async ({ request }) => {
    ctx.docToken = await login(request, 'doctor@hospital.com');
    const me = await request.get(`${API}/auth/me`, { headers: h(ctx.docToken) });
    if (me.ok()) { const b = await me.json(); ctx.docId = b.data?.user?.id; }
    const r = await request.post(`${API}/appointments`, {
      headers: h(ctx.recToken),
      data: { patientId: ctx.patientId, appointmentType: 'CONSULTATION', appointmentDate: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '10:30', doctorId: ctx.docId, reason: 'Fever' },
    });
    expect(r.ok()).toBeTruthy();
    ctx.apptId = (await r.json()).data?.id;
  });

  test('1.4 Check-in patient', async ({ request }) => {
    const r = await request.post(`${API}/appointments/${ctx.apptId}/check-in`, { headers: h(ctx.recToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 2: Triage
  test('2.1 Nurse login', async ({ request }) => {
    ctx.nurseToken = await login(request, 'nurse.triage@hospital.com');
  });

  test('2.2 Record triage', async ({ request }) => {
    const r = await request.post(`${API}/triage`, {
      headers: h(ctx.nurseToken),
      data: { patientId: ctx.patientId, appointmentId: ctx.apptId, chiefComplaint: 'Fever 3 days', triageCategory: 'URGENT', vitalSigns: { temperature: 37.2, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, heartRate: 78, respiratoryRate: 18, oxygenSaturation: 98, weight: 75, height: 175 } },
    });
    expect(r.ok()).toBeTruthy();
    ctx.triageId = (await r.json()).data?.id;
  });

  // STEP 3: Consultation
  test('3.1 Start encounter', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters`, {
      headers: h(ctx.docToken),
      data: { patientId: ctx.patientId, appointmentId: ctx.apptId, encounterType: 'OUTPATIENT' },
    });
    expect(r.ok()).toBeTruthy();
    ctx.encId = (await r.json()).data?.id;
  });

  test('3.2 Document SOAP notes', async ({ request }) => {
    const r = await request.put(`${API}/emr/encounters/${ctx.encId}`, {
      headers: h(ctx.docToken),
      data: { chiefComplaint: 'Fever 3 days', historyOfPresentIllness: 'Fever 38.5C, body pains', physicalExamination: 'Alert, febrile', assessment: 'Suspected dengue', plan: 'Admit, IV fluids, paracetamol' },
    });
    expect(r.ok()).toBeTruthy();
  });

  test('3.3 Add diagnosis', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters/${ctx.encId}/diagnoses`, {
      headers: h(ctx.docToken),
      data: { code: 'A90', description: 'Dengue fever', type: 'PRIMARY' },
    });
    expect(r.ok()).toBeTruthy();
  });

  test('3.4 Complete encounter', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters/${ctx.encId}/complete`, { headers: h(ctx.docToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 4: Lab Tech
  test('4.1 Lab tech login + worklist', async ({ request }) => {
    ctx.labToken = await login(request, 'lab.tech@hospital.com');
    const r = await request.get(`${API}/lab/worklist`, { headers: h(ctx.labToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 5: Pharmacist
  test('5.1 Pharmacist login + queue', async ({ request }) => {
    ctx.pharmToken = await login(request, 'pharmacist@hospital.com');
    const r = await request.get(`${API}/pharmacy/queue`, { headers: h(ctx.pharmToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 6: Billing
  test('6.1 Billing login + invoices', async ({ request }) => {
    ctx.billToken = await login(request, 'billing@hospital.com');
    const r = await request.get(`${API}/billing/invoices`, { headers: h(ctx.billToken) });
    expect(r.ok()).toBeTruthy();
  });

  test('6.2 Daily summary', async ({ request }) => {
    const r = await request.get(`${API}/billing/reports/daily-summary`, { headers: h(ctx.billToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 7: IPD Nurse
  test('7.1 IPD nurse login + dashboard', async ({ request }) => {
    ctx.ipdToken = await login(request, 'nurse.ipd@hospital.com');
    const r = await request.get(`${API}/inpatient/dashboard`, { headers: h(ctx.ipdToken) });
    expect(r.ok()).toBeTruthy();
  });
});
