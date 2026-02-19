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
  return { token, userId: jwt.userId, branchId: jwt.branchId, tenantId: jwt.tenantId, role: jwt.role };
}

function h(token: string) { return { Authorization: `Bearer ${token}` }; }

test.describe.serial('Complete Patient Journey', () => {

  // Login all users once upfront to avoid rate limiting (7 logins total)
  test('0. Login all test users', async ({ request }) => {
    const rec = await login(request, 'receptionist@hospital.com');
    ctx.recToken = rec.token;
    ctx.branchId = rec.branchId;

    const doc = await login(request, 'doctor@hospital.com');
    ctx.docToken = doc.token;
    ctx.docId = doc.userId;
    if (!ctx.branchId) ctx.branchId = doc.branchId;

    const nurse = await login(request, 'nurse.triage@hospital.com');
    ctx.nurseToken = nurse.token;

    const lab = await login(request, 'lab.tech@hospital.com');
    ctx.labToken = lab.token;

    const pharm = await login(request, 'pharmacist@hospital.com');
    ctx.pharmToken = pharm.token;

    const bill = await login(request, 'billing@hospital.com');
    ctx.billToken = bill.token;

    const ipd = await login(request, 'nurse.ipd@hospital.com');
    ctx.ipdToken = ipd.token;

    console.log('All 7 users logged in. Branch:', ctx.branchId);
  });

  // STEP 1: Registration
  test('1.1 Register patient', async ({ request }) => {
    const r = await request.post(`${API}/patients`, {
      headers: h(ctx.recToken),
      data: { firstName: 'Kwame', lastName: 'TestE2E', dateOfBirth: '1985-05-15', gender: 'MALE', phone: '0244123456', address: '123 Accra Road, Tema', ghanaCardNumber: `GHA-${String(Date.now()).slice(-9)}-${Math.floor(Math.random()*10)}` },
    });
    const b = await r.json();
    console.log('Register patient response:', r.status(), JSON.stringify(b).slice(0, 500));
    expect(r.ok(), `Register patient: ${r.status()} ${JSON.stringify(b)}`).toBeTruthy();
    ctx.patientId = b.data?.patient?.id || b.data?.id;
    ctx.mrn = b.data?.patient?.mrn || b.data?.mrn;
    expect(ctx.patientId, `No patient ID in response: ${JSON.stringify(b).slice(0, 300)}`).toBeTruthy();
  });

  test('1.2 Create appointment', async ({ request }) => {
    const r = await request.post(`${API}/appointments`, {
      headers: h(ctx.recToken),
      data: { patientId: ctx.patientId, doctorId: ctx.docId, branchId: ctx.branchId, appointmentDate: new Date().toISOString().split('T')[0], appointmentTime: `${String(8 + Math.floor(Math.random() * 9)).padStart(2, '0')}:${String(Math.floor(Math.random() * 4) * 15).padStart(2, '0')}`, type: 'CONSULTATION', reason: 'Fever', isWalkIn: true },
    });
    const ab = await r.json();
    expect(r.ok(), `Create appointment: ${r.status()} ${JSON.stringify(ab).slice(0, 500)}`).toBeTruthy();
    ctx.apptId = ab.data?.id;
  });

  test('1.3 Check-in patient', async ({ request }) => {
    const r = await request.post(`${API}/appointments/${ctx.apptId}/check-in`, { headers: h(ctx.recToken) });
    expect(r.ok()).toBeTruthy();
  });

  // STEP 2: Triage
  test('2.1 Record triage', async ({ request }) => {
    const r = await request.post(`${API}/triage`, {
      headers: h(ctx.nurseToken),
      data: {
        patientId: ctx.patientId,
        appointmentId: ctx.apptId,
        triageLevel: 2,
        assessment: { chiefComplaint: 'Fever 3 days', symptomDuration: '3 days', symptomSeverity: 'moderate' },
        vitalSigns: { temperature: 37.2, bpSystolic: 120, bpDiastolic: 80, pulseRate: 78, respiratoryRate: 18, spo2: 98, weight: 75, height: 175 },
      },
    });
    const tb = await r.json();
    expect(r.ok(), `Triage: ${r.status()} ${JSON.stringify(tb).slice(0, 500)}`).toBeTruthy();
    ctx.triageId = tb.data?.id;
  });

  // STEP 3: Consultation
  test('3.1 Start encounter', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters`, {
      headers: h(ctx.docToken),
      data: { patientId: ctx.patientId, appointmentId: ctx.apptId, encounterType: 'OUTPATIENT' },
    });
    const eb = await r.json();
    console.log('Start encounter:', r.status(), JSON.stringify(eb).slice(0, 500));
    expect(r.ok(), `Start encounter: ${r.status()} ${JSON.stringify(eb).slice(0, 500)}`).toBeTruthy();
    ctx.encId = eb.data?.id || eb.data?.encounter?.id;
    console.log('Encounter ID:', ctx.encId);
    expect(ctx.encId, `No encounter ID: ${JSON.stringify(eb).slice(0, 300)}`).toBeTruthy();
  });

  test('3.2 Document SOAP notes', async ({ request }) => {
    const r = await request.put(`${API}/emr/encounters/${ctx.encId}`, {
      headers: h(ctx.docToken),
      data: { chiefComplaint: 'Fever 3 days', historyOfPresentIllness: 'Fever 38.5C, body pains', physicalExamination: 'Alert, febrile', assessment: 'Suspected dengue', plan: 'Admit, IV fluids, paracetamol' },
    });
    const sb = await r.json();
    expect(r.ok(), `SOAP: ${r.status()} ${JSON.stringify(sb).slice(0, 500)}`).toBeTruthy();
  });

  test('3.3 Add diagnosis', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters/${ctx.encId}/diagnoses`, {
      headers: h(ctx.docToken),
      data: { icd10Code: 'A90', icd10Description: 'Dengue fever', diagnosisType: 'PRIMARY' },
    });
    const db = await r.json();
    expect(r.ok(), `Diagnosis: ${r.status()} ${JSON.stringify(db).slice(0, 500)}`).toBeTruthy();
  });

  test('3.4 Complete encounter', async ({ request }) => {
    const r = await request.post(`${API}/emr/encounters/${ctx.encId}/complete`, { headers: h(ctx.docToken) });
    const cb = await r.json();
    expect(r.ok(), `Complete: ${r.status()} ${JSON.stringify(cb).slice(0, 500)}`).toBeTruthy();
  });

  // STEP 4: Lab Tech
  test('4.1 Lab worklist', async ({ request }) => {
    const r = await request.get(`${API}/lab/worklist`, { headers: h(ctx.labToken) });
    const lb = await r.json();
    expect(r.ok(), `Lab: ${r.status()} ${JSON.stringify(lb).slice(0, 500)}`).toBeTruthy();
  });

  // STEP 5: Pharmacist
  test('5.1 Pharmacy queue', async ({ request }) => {
    const r = await request.get(`${API}/pharmacy/queue`, { headers: h(ctx.pharmToken) });
    const pb = await r.json();
    expect(r.ok(), `Pharmacy: ${r.status()} ${JSON.stringify(pb).slice(0, 500)}`).toBeTruthy();
  });

  // STEP 6: Billing
  test('6.1 Invoices list', async ({ request }) => {
    const r = await request.get(`${API}/billing/invoices`, { headers: h(ctx.billToken) });
    const ib = await r.json();
    expect(r.ok(), `Invoices: ${r.status()} ${JSON.stringify(ib).slice(0, 500)}`).toBeTruthy();
  });

  test('6.2 Daily summary', async ({ request }) => {
    const r = await request.get(`${API}/billing/reports/daily-summary`, { headers: h(ctx.billToken) });
    const ds = await r.json();
    expect(r.ok(), `Summary: ${r.status()} ${JSON.stringify(ds).slice(0, 500)}`).toBeTruthy();
  });

  // STEP 7: IPD Nurse
  test('7.1 IPD dashboard', async ({ request }) => {
    const r = await request.get(`${API}/inpatient/dashboard`, { headers: h(ctx.ipdToken) });
    const ipb = await r.json();
    expect(r.ok(), `IPD: ${r.status()} ${JSON.stringify(ipb).slice(0, 500)}`).toBeTruthy();
  });
});
