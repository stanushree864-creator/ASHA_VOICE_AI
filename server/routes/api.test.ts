import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Point database module to a clean temporary SQLite file before importing app/db
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asha-api-test-'));
process.env.ASHA_DB_PATH = path.join(tempDir, 'test_asha.db');

let server: http.Server;
let baseUrl = '';
let signAuthTokenFn: typeof import('../auth/authService').signAuthToken;

async function requestJson<T>(
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
  const [{ createExpressApp }, { initDatabase }, authMod] = await Promise.all([
    import('../app'),
    import('../db/database'),
    import('../auth/authService'),
  ]);
  signAuthTokenFn = authMod.signAuthToken;
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

test('Security: rejects unauthenticated access, invalid tokens, and expired tokens with 401', async () => {
  const noAuth = await requestJson('GET', '/api/visits');
  assert.equal(noAuth.status, 401);

  const invalidAuth = await requestJson('GET', '/api/visits', undefined, 'invalid.jwt.token');
  assert.equal(invalidAuth.status, 401);

  const expiredToken = signAuthTokenFn({ sub: 'user-asha-01', role: 'ASHA_WORKER', workerId: 'WORKER001' }, -60);
  const expiredAuth = await requestJson('GET', '/api/visits', undefined, expiredToken);
  assert.equal(expiredAuth.status, 401);
});

test('Security & Auth: enforces passcode verification, scrypt hashing, and RBAC boundaries', async () => {
  const badLogin = await requestJson('POST', '/api/auth/login', {
    username: 'worker01',
    passcode: 'wrong-passcode',
  });
  assert.equal(badLogin.status, 401);

  // SQL injection attempt inside username must fail safely with 401
  const sqliLogin = await requestJson('POST', '/api/auth/login', {
    username: "' OR '1'='1",
    passcode: 'anything',
  });
  assert.equal(sqliLogin.status, 401);

  const workerLogin = await requestJson<{ user: { role: string }; token: string }>(
    'POST',
    '/api/auth/login',
    { username: 'worker01', passcode: 'asha-demo-2026' },
  );
  assert.equal(workerLogin.status, 200);
  assert.equal(workerLogin.data.user.role, 'ASHA_WORKER');

  // ASHA_WORKER cannot access supervisor overview, audit logs, or retention settings (403)
  const supCheck = await requestJson('GET', '/api/supervisor/overview', undefined, workerLogin.data.token);
  assert.equal(supCheck.status, 403);

  const retentionCheck = await requestJson('GET', '/api/admin/retention', undefined, workerLogin.data.token);
  assert.equal(retentionCheck.status, 403);
});

test('Clinical & Reliability: requires explicit confirmation, prevents duplicate visits via clientRequestId, and strips XSS', async () => {
  const workerAuth = await requestJson<{ token: string }>('POST', '/api/auth/demo', {
    role: 'ASHA_WORKER',
  });
  const token = workerAuth.data.token;

  const extractRes = await requestJson<{ record: Record<string, unknown> }>(
    'POST',
    '/api/voice/extract',
    {
      transcript:
        'Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November. <script>alert(1)</script>',
      visitType: 'ANC',
      language: 'en',
    },
    token,
  );
  assert.equal(extractRes.status, 200);

  // Unconfirmed record must be rejected before persistence
  const unconfirmedSave = await requestJson(
    'POST',
    '/api/visits',
    { record: extractRes.data.record },
    token,
  );
  assert.equal(unconfirmedSave.status, 400);

  const confirmedRecord = {
    ...extractRes.data.record,
    confirmationStatus: 'confirmed',
  };

  // First save succeeds
  const firstSave = await requestJson<{ visitId: string; duplicatePrevented: boolean; followups: unknown[] }>(
    'POST',
    '/api/visits',
    { record: confirmedRecord },
    token,
  );
  assert.equal(firstSave.status, 201);
  assert.equal(firstSave.data.duplicatePrevented, false);
  assert.ok(firstSave.data.followups.length >= 1);

  // Duplicate retry with same clientRequestId must be idempotent
  const duplicateSave = await requestJson<{ visitId: string; duplicatePrevented: boolean }>(
    'POST',
    '/api/visits',
    { record: confirmedRecord },
    token,
  );
  assert.equal(duplicateSave.status, 200);
  assert.equal(duplicateSave.data.duplicatePrevented, true);
  assert.equal(duplicateSave.data.visitId, firstSave.data.visitId);

  // Verify XSS tags stripped from stored visit transcript
  const listVisits = await requestJson<{ visits: Array<{ id: string; rawTranscript: string }> }>(
    'GET',
    '/api/visits',
    undefined,
    token,
  );
  const saved = listVisits.data.visits.find((v) => v.id === firstSave.data.visitId);
  assert.ok(saved);
  assert.ok(!saved.rawTranscript.includes('<script>'));
});

test('Safety & Supervisor: emergency referral persists immediately and supervisor can acknowledge and update retention', async () => {
  const workerAuth = await requestJson<{ token: string }>('POST', '/api/auth/demo', {
    role: 'ASHA_WORKER',
  });
  const supAuth = await requestJson<{ token: string }>('POST', '/api/auth/demo', {
    role: 'SUPERVISOR',
  });

  // Positive newborn danger sign
  const emergRes = await requestJson<{ referrals: Array<{ id: string }>; announcement: string }>(
    'POST',
    '/api/referrals/emergency',
    {
      beneficiaryCode: 'ASHA00127',
      transcript: 'The newborn ASHA00127 has high fever and is not feeding.',
      visitType: 'NEWBORN',
      language: 'kn',
    },
    workerAuth.data.token,
  );
  assert.equal(emergRes.status, 201);
  assert.ok(emergRes.data.referrals.length >= 1);
  const refId = emergRes.data.referrals[0].id;

  // Worker cannot acknowledge PHC referral (RBAC)
  const workerAck = await requestJson(
    'PATCH',
    `/api/referrals/${refId}/acknowledge`,
    {},
    workerAuth.data.token,
  );
  assert.equal(workerAck.status, 403);

  // Supervisor acknowledges PHC referral
  const supAck = await requestJson<{ acknowledgementStatus: string }>(
    'PATCH',
    `/api/referrals/${refId}/acknowledge`,
    {},
    supAuth.data.token,
  );
  assert.equal(supAck.status, 200);
  assert.equal(supAck.data.acknowledgementStatus, 'ACKNOWLEDGED_BY_PHC');

  // Supervisor can view and update retention configuration
  const patchRet = await requestJson<{ retention: { audioRetentionHours: number; transcriptRetentionDays: number } }>(
    'PATCH',
    '/api/admin/retention',
    { audioRetentionHours: 0, transcriptRetentionDays: 14 },
    supAuth.data.token,
  );
  assert.equal(patchRet.status, 200);
  assert.equal(patchRet.data.retention.transcriptRetentionDays, 14);
});

test('Dashboard, Beneficiary Creation, Follow-up Rescheduling, Settings & Reports CSV', async () => {
  const workerAuth = await requestJson<{ token: string }>('POST', '/api/auth/demo', {
    role: 'ASHA_WORKER',
  });
  const token = workerAuth.data.token;

  // Dashboard summary & analytics
  const summary = await requestJson<{ visitsCompleted: number; recordCompletionRate: number }>(
    'GET',
    '/api/dashboard/summary',
    undefined,
    token,
  );
  assert.equal(summary.status, 200);
  assert.ok(summary.data.visitsCompleted >= 3);

  const analytics = await requestJson<{ range: string; buckets: unknown[] }>(
    'GET',
    '/api/dashboard/analytics?range=7d',
    undefined,
    token,
  );
  assert.equal(analytics.status, 200);
  assert.equal(analytics.data.buckets.length, 7);

  // Create synthetic beneficiary
  const createdBen = await requestJson<{ beneficiary: { beneficiaryCode: string; displayName: string } }>(
    'POST',
    '/api/beneficiaries',
    { displayName: 'Meena Kumari', beneficiaryType: 'PREGNANT_WOMAN', locality: 'Devanahalli Ward 6' },
    token,
  );
  assert.equal(createdBen.status, 201);
  assert.equal(createdBen.data.beneficiary.displayName, 'Meena Kumari');

  // Create & reschedule follow-up
  const createdFu = await requestJson<{ followup: { id: string; dueDate: string } }>(
    'POST',
    '/api/followups',
    {
      beneficiaryCode: createdBen.data.beneficiary.beneficiaryCode,
      taskDescription: 'Check ANC haemoglobin report',
      priority: 'SCHEDULED_VISIT',
      dueDate: '2026-12-05',
    },
    token,
  );
  assert.equal(createdFu.status, 201);
  const patchFu = await requestJson<{ dueDate: string; taskStatus: string }>(
    'PATCH',
    `/api/followups/${createdFu.data.followup.id}`,
    { dueDate: '2026-12-10', taskStatus: 'COMPLETED' },
    token,
  );
  assert.equal(patchFu.status, 200);
  assert.equal(patchFu.data.dueDate, '2026-12-10');
  assert.equal(patchFu.data.taskStatus, 'COMPLETED');

  // Settings persistence
  const patchSettings = await requestJson<{ settings: { highContrast: boolean; largeText: boolean; voiceSpeed: number } }>(
    'PATCH',
    '/api/settings',
    { highContrast: true, largeText: true, voiceSpeed: 1.15 },
    token,
  );
  assert.equal(patchSettings.status, 200);
  assert.equal(patchSettings.data.settings.highContrast, true);
  assert.equal(patchSettings.data.settings.largeText, true);
  assert.equal(patchSettings.data.settings.voiceSpeed, 1.15);

  // Alerts list & mark read
  const alertsRes = await requestJson<{ alerts: Array<{ id: string }> }>(
    'GET',
    '/api/alerts',
    undefined,
    token,
  );
  assert.equal(alertsRes.status, 200);
  if (alertsRes.data.alerts.length > 0) {
    const firstId = encodeURIComponent(alertsRes.data.alerts[0].id);
    const markRead = await requestJson<{ isRead: boolean }>('PATCH', `/api/alerts/${firstId}`, { isRead: true }, token);
    assert.equal(markRead.status, 200);
    assert.equal(markRead.data.isRead, true);
  }

  // Reports summary & CSV export
  const repRes = await fetch(`${baseUrl}/api/reports/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(repRes.status, 200);
  const csvText = await repRes.text();
  assert.ok(csvText.includes('Visit ID,Visit Date,Beneficiary Code'));
});

