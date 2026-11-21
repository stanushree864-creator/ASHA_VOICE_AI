import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asha-enh-test-'));
process.env.ASHA_DB_PATH = path.join(tempDir, 'test_enh.db');

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

test('QR Patient Identity resolves patient card and enforces Patient RBAC isolation', async () => {
  const ashaDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'ASHA_WORKER' });
  const patDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'PATIENT' });

  const qrRes = await reqJson<{
    patient: { patientUniqueId: string; fullName: string };
    qrString: string;
    connectionStatus: string;
  }>('GET', '/api/enhancements/qr/patient/PAT-2026-0001', undefined, ashaDemo.data.token);

  assert.equal(qrRes.status, 200);
  assert.equal(qrRes.data.patient.patientUniqueId, 'PAT-2026-0001');
  assert.equal(qrRes.data.patient.fullName, 'Lakshmi');

  const scanRes = await reqJson<{ patient: { patientUniqueId: string } }>(
    'POST',
    '/api/enhancements/qr/resolve',
    { qrInput: qrRes.data.qrString },
    ashaDemo.data.token,
  );
  assert.equal(scanRes.status, 200);
  assert.equal(scanRes.data.patient.patientUniqueId, 'PAT-2026-0001');

  // Patient 01 can view own card, cannot scan another patient's card
  const ownCard = await reqJson('GET', '/api/enhancements/qr/patient/PAT-2026-0001', undefined, patDemo.data.token);
  assert.equal(ownCard.status, 200);

  const otherCard = await reqJson('GET', '/api/enhancements/qr/patient/PAT-2026-0002', undefined, patDemo.data.token);
  assert.equal(otherCard.status, 403);
});

test('Smart Follow-Up System computes actionable buckets and auto-generates milestones', async () => {
  const ashaDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'ASHA_WORKER' });

  const initial = await reqJson<{
    counts: { totalActionable: number };
    items: Array<{ id: string; source: string }>;
  }>('GET', '/api/enhancements/smart-followups', undefined, ashaDemo.data.token);

  assert.equal(initial.status, 200);
  assert.ok(initial.data.counts.totalActionable >= 3);

  const gen = await reqJson<{ createdCount: number; summary: { items: unknown[] } }>(
    'POST',
    '/api/enhancements/smart-followups/auto-generate',
    {},
    ashaDemo.data.token,
  );
  assert.equal(gen.status, 200);
  assert.ok(gen.data.summary.items.length >= 3);
});

test('Pregnancy Risk Alert System persists clinical risk stratification & creates notifications', async () => {
  const ashaDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'ASHA_WORKER' });

  const assess = await reqJson<{
    assessment: {
      riskTier: string;
      riskScore: number;
      phcReferralRequired: boolean;
      factors: Array<{ code: string }>;
    };
  }>(
    'POST',
    '/api/enhancements/risk/pregnancy/assess',
    {
      patientId: 'pat-001',
      bloodPressure: '154/98',
      hemoglobinGDl: 8.2,
      gestationalWeeks: 32,
      weightKg: 54,
      ancVisitsCompleted: 3,
      symptomsOrNotes: 'Swelling in feet and headache',
      includeAiAnalysis: false,
    },
    ashaDemo.data.token,
  );

  assert.equal(assess.status, 201);
  assert.equal(assess.data.assessment.riskTier, 'CRITICAL');
  assert.equal(assess.data.assessment.phcReferralRequired, true);
  assert.ok(assess.data.assessment.riskScore >= 65);

  const list = await reqJson<{ assessments: Array<{ patientId: string; riskTier: string }> }>(
    'GET',
    '/api/enhancements/risk/pregnancy',
    undefined,
    ashaDemo.data.token,
  );
  assert.equal(list.status, 200);
  const pat1 = list.data.assessments.find((a) => a.patientId === 'pat-001');
  assert.equal(pat1?.riskTier, 'CRITICAL');
});

test('Emergency Contact directory loads and allows role-scoped updates', async () => {
  const ashaDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'ASHA_WORKER' });
  const patDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'PATIENT' });

  const getWorkerDir = await reqJson<{
    directory: { ambulanceNumber: string; phcPhone: string; workerPhone: string };
  }>('GET', '/api/enhancements/emergency-contacts', undefined, ashaDemo.data.token);
  assert.equal(getWorkerDir.status, 200);
  assert.equal(getWorkerDir.data.directory.ambulanceNumber, '108');

  const updateWorker = await reqJson<{ directory: { workerPhone: string } }>(
    'PUT',
    '/api/enhancements/emergency-contacts',
    { workerPhone: '+91 98450 99999' },
    ashaDemo.data.token,
  );
  assert.equal(updateWorker.status, 200);
  assert.equal(updateWorker.data.directory.workerPhone, '+91 98450 99999');

  // Patient sees connected ASHA emergency phone & can update their own personal emergency contact
  const updatePat = await reqJson<{
    directory: { workerPhone: string; patientEmergencyContactName: string; patientEmergencyContactPhone: string };
  }>(
    'PUT',
    '/api/enhancements/emergency-contacts',
    {
      patientEmergencyContactName: 'Mohan Gowda',
      patientEmergencyContactRelation: 'Brother',
      patientEmergencyContactPhone: '+91 98450 12345',
    },
    patDemo.data.token,
  );
  assert.equal(updatePat.status, 200);
  assert.equal(updatePat.data.directory.workerPhone, '+91 98450 99999');
  assert.equal(updatePat.data.directory.patientEmergencyContactName, 'Mohan Gowda');
});

test('Multilingual AI Assistant returns honest 503 error when GEMINI_API_KEY is absent', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const ashaDemo = await reqJson<{ token: string }>('POST', '/api/auth/demo', { role: 'ASHA_WORKER' });
  const res = await reqJson<{ code: string; error: string }>(
    'POST',
    '/api/enhancements/assistant/ask',
    { question: 'What are ANC danger signs?', language: 'kn' },
    ashaDemo.data.token,
  );

  assert.equal(res.status, 503);
  assert.equal(res.data.code, 'GEMINI_UNCONFIGURED');

  if (prevKey !== undefined) {
    process.env.GEMINI_API_KEY = prevKey;
  }
});
