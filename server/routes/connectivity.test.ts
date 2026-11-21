import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asha-conn-test-'));
process.env.ASHA_DB_PATH = path.join(tempDir, 'test_conn.db');

let server: http.Server;
let baseUrl = '';

async function reqJson<T>(
  method: string,
  route: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

test.before(async () => {
  const [{ createExpressApp }, { initDatabase }] = await Promise.all([
    import('../app'),
    import('../db/database'),
  ]);
  initDatabase();
  const app = createExpressApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Unique ID generation & duplicate prevention on ASHA Worker and Patient registration', async () => {
  const ashaReg = await reqJson<{
    user: { ashaUniqueId: string; role: string };
    uniqueId: string;
    token: string;
  }>('POST', '/api/auth/register', {
    fullName: 'Anitha Kumari',
    username: 'asha_anitha',
    passcode: 'pass1234',
    role: 'ASHA_WORKER',
    assignedArea: 'Devanahalli Ward 7',
  });
  assert.equal(ashaReg.status, 201);
  assert.match(ashaReg.data.uniqueId, /^ASHA-2026-\d{4}$/);
  assert.equal(ashaReg.data.user.ashaUniqueId, ashaReg.data.uniqueId);
  assert.notEqual(ashaReg.data.uniqueId, 'ASHA-2026-0001');

  const dupAsha = await reqJson('POST', '/api/auth/register', {
    fullName: 'Anitha Duplicate',
    username: 'asha_anitha',
    passcode: 'pass1234',
    role: 'ASHA_WORKER',
  });
  assert.equal(dupAsha.status, 409);

  const patReg = await reqJson<{
    user: { patientUniqueId: string; role: string; patientProfileId: string };
    uniqueId: string;
    token: string;
  }>('POST', '/api/auth/register', {
    fullName: 'Priya Sharma',
    username: 'priya_pat',
    passcode: 'pass1234',
    role: 'PATIENT',
    assignedMode: 'PREGNANCY',
    age: 26,
    locality: 'Ward 7',
  });
  assert.equal(patReg.status, 201);
  assert.match(patReg.data.uniqueId, /^PAT-2026-\d{4}$/);
  assert.equal(patReg.data.user.patientUniqueId, patReg.data.uniqueId);
});

test('Two-way connection request, approval, consent enforcement, and RBAC isolation', async () => {
  // Seeded worker01 has ASHA-2026-0001
  const ashaAuth = await reqJson<{ token: string; user: { ashaUniqueId: string } }>(
    'POST',
    '/api/auth/demo',
    { role: 'ASHA_WORKER' },
  );
  assert.equal(ashaAuth.data.user.ashaUniqueId, 'ASHA-2026-0001');

  // Register a brand new patient who is NOT yet connected
  const patReg = await reqJson<{
    user: { patientUniqueId: string; patientProfileId: string };
    token: string;
  }>('POST', '/api/auth/register', {
    fullName: 'Sunita Devi',
    username: 'sunita_pat',
    passcode: 'pass1234',
    role: 'PATIENT',
    assignedMode: 'PREGNANCY',
    age: 24,
  });
  assert.equal(patReg.status, 201);

  // Before connection is approved, ASHA cannot modify Sunita's pregnancy record (403)
  const blockedUpdate = await reqJson(
    'POST',
    `/api/connectivity/modes/pregnancy/${patReg.data.user.patientProfileId}/record`,
    { pregnancyStage: 'Second Trimester', gestationalWeeks: 18 },
    ashaAuth.data.token,
  );
  assert.equal(blockedUpdate.status, 403);

  // Patient requests connection using ASHA-2026-0001
  const connReq = await reqJson<{ connection: { id: string; status: string } }>(
    'POST',
    '/api/connectivity/connections/request',
    { ashaUniqueId: 'ASHA-2026-0001', notes: 'Please connect for my ANC checkups' },
    patReg.data.token,
  );
  assert.equal(connReq.status, 201);
  assert.equal(connReq.data.connection.status, 'PENDING');

  // Duplicate request while pending must be rejected with 409
  const dupConnReq = await reqJson(
    'POST',
    '/api/connectivity/connections/request',
    { ashaUniqueId: 'ASHA-2026-0001' },
    patReg.data.token,
  );
  assert.equal(dupConnReq.status, 409);

  // Patient cannot approve their own request (403)
  const selfApprove = await reqJson(
    'PATCH',
    `/api/connectivity/connections/${connReq.data.connection.id}/respond`,
    { decision: 'APPROVE' },
    patReg.data.token,
  );
  assert.equal(selfApprove.status, 403);

  // ASHA worker approves connection
  const approveRes = await reqJson<{ connection: { status: string } }>(
    'PATCH',
    `/api/connectivity/connections/${connReq.data.connection.id}/respond`,
    { decision: 'APPROVE' },
    ashaAuth.data.token,
  );
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.connection.status, 'CONNECTED');

  // Now ASHA worker can update Sunita's pregnancy record & schedule ANC appointment
  const pregUpdate = await reqJson<{ record: { gestationalWeeks: number; pregnancyStage: string } }>(
    'POST',
    `/api/connectivity/modes/pregnancy/${patReg.data.user.patientProfileId}/record`,
    {
      pregnancyStage: 'Second Trimester',
      gestationalWeeks: 20,
      expectedDeliveryDate: '2027-04-10',
      bloodPressure: '114/74',
      weightKg: 54,
      sendReminder: true,
    },
    ashaAuth.data.token,
  );
  assert.equal(pregUpdate.status, 200);
  assert.equal(pregUpdate.data.record.gestationalWeeks, 20);

  const apptCreate = await reqJson<{ appointment: { id: string; title: string } }>(
    'POST',
    `/api/connectivity/modes/pregnancy/${patReg.data.user.patientProfileId}/appointments`,
    {
      title: 'ANC 20-Week Ultrasound & Checkup',
      scheduledDate: '2026-12-02',
      scheduledTime: '10:30 AM',
      location: 'Devanahalli PHC',
      healthcareMode: 'PREGNANCY',
    },
    ashaAuth.data.token,
  );
  assert.equal(apptCreate.status, 201);

  // Patient withdraws consent -> Pregnancy mode masks detailed notes for ASHA
  const withdrawRes = await reqJson<{ consentStatus: string }>(
    'PATCH',
    '/api/connectivity/patient/consent',
    { consentStatus: 'WITHDRAWN' },
    patReg.data.token,
  );
  assert.equal(withdrawRes.status, 200);
  assert.equal(withdrawRes.data.consentStatus, 'WITHDRAWN');

  const pregList = await reqJson<{
    patients: Array<{ patient: { id: string }; consentGranted: boolean; record: { bloodPressure: string | null } }>;
  }>('GET', '/api/connectivity/modes/pregnancy', undefined, ashaAuth.data.token);
  const sunitaItem = pregList.data.patients.find((p) => p.patient.id === patReg.data.user.patientProfileId);
  assert.ok(sunitaItem);
  assert.equal(sunitaItem.consentGranted, false);
  assert.equal(sunitaItem.record.bloodPressure, null);

  // Patient sends assistance request -> ASHA worker responds -> Patient sees reply
  const assistRes = await reqJson<{ request: { id: string; status: string } }>(
    'POST',
    '/api/connectivity/assistance',
    {
      subject: 'Need folic acid tablets',
      message: 'Please bring IFA tablets during next visit.',
      urgency: 'NORMAL',
    },
    patReg.data.token,
  );
  assert.equal(assistRes.status, 201);
  assert.equal(assistRes.data.request.status, 'OPEN');

  const replyRes = await reqJson<{ request: { status: string; ashaResponse: string } }>(
    'PATCH',
    `/api/connectivity/assistance/${assistRes.data.request.id}/respond`,
    { ashaResponse: 'I will bring 30 tablets tomorrow morning at 10 AM.', status: 'RESPONDED' },
    ashaAuth.data.token,
  );
  assert.equal(replyRes.status, 200);
  assert.equal(replyRes.data.request.status, 'RESPONDED');

  // Patient dashboard shows connected ASHA worker, pregnancy record, appointment, assistance response, and notifications
  const patPortal = await reqJson<{
    patient: { patientUniqueId: string };
    connectedWorker: { ashaUniqueId: string; status: string };
    pregnancyRecord: { gestationalWeeks: number };
    appointments: Array<{ title: string }>;
    assistanceRequests: Array<{ ashaResponse: string }>;
    notifications: Array<{ title: string }>;
  }>('GET', '/api/connectivity/patient/dashboard', undefined, patReg.data.token);
  assert.equal(patPortal.status, 200);
  assert.equal(patPortal.data.connectedWorker.ashaUniqueId, 'ASHA-2026-0001');
  assert.equal(patPortal.data.pregnancyRecord.gestationalWeeks, 20);
  assert.ok(patPortal.data.appointments.some((a) => a.title.includes('20-Week')));
  assert.ok(patPortal.data.assistanceRequests[0].ashaResponse.includes('30 tablets'));
  assert.ok(patPortal.data.notifications.length >= 2);
});

test('Newborn Care Mode, Vaccination Mode, and ASHA direct patient registration', async () => {
  const ashaAuth = await reqJson<{ token: string }>('POST', '/api/auth/demo', {
    role: 'ASHA_WORKER',
  });

  // ASHA registers a new Vaccination patient directly
  const regImm = await reqJson<{ patient: { id: string; patientUniqueId: string } }>(
    'POST',
    '/api/connectivity/asha/register-patient',
    {
      fullName: 'Rohan Child',
      age: 1,
      assignedMode: 'VACCINATION',
      initialVaccineName: 'MR-1 & Vitamin A',
      initialVaccineDueDate: '2026-11-28',
    },
    ashaAuth.data.token,
  );
  assert.equal(regImm.status, 201);
  assert.match(regImm.data.patient.patientUniqueId, /^PAT-2026-\d{4}$/);

  const vaccList = await reqJson<{
    patients: Array<{ patient: { id: string }; vaccines: Array<{ id: string; status: string }> }>;
  }>('GET', '/api/connectivity/modes/vaccination', undefined, ashaAuth.data.token);
  assert.equal(vaccList.status, 200);
  const rohan = vaccList.data.patients.find((p) => p.patient.id === regImm.data.patient.id);
  assert.ok(rohan);
  assert.equal(rohan.vaccines[0].status, 'PENDING');

  // Update vaccine status to COMPLETED
  const markDone = await reqJson<{ vaccine: { status: string } }>(
    'PATCH',
    `/api/connectivity/modes/vaccination/records/${rohan.vaccines[0].id}`,
    { status: 'COMPLETED', sendReminder: true },
    ashaAuth.data.token,
  );
  assert.equal(markDone.status, 200);
  assert.equal(markDone.data.vaccine.status, 'COMPLETED');

  // Newborn Care mode check & update
  const nbList = await reqJson<{
    patients: Array<{ patient: { id: string }; record: { currentWeightKg: number } }>;
  }>('GET', '/api/connectivity/modes/newborn', undefined, ashaAuth.data.token);
  assert.equal(nbList.status, 200);
  assert.ok(nbList.data.patients.length >= 1);

  const nbUpdate = await reqJson<{ record: { currentWeightKg: number; hbncVisitsCompleted: number } }>(
    'POST',
    `/api/connectivity/modes/newborn/${nbList.data.patients[0].patient.id}/record`,
    { currentWeightKg: 3.1, hbncVisitsCompleted: 4, sendReminder: true },
    ashaAuth.data.token,
  );
  assert.equal(nbUpdate.status, 200);
  assert.equal(nbUpdate.data.record.currentWeightKg, 3.1);
  assert.equal(nbUpdate.data.record.hbncVisitsCompleted, 4);
});
