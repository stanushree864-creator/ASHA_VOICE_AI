import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPatientQrPayload,
  classifyDueBucket,
  computeSmartFollowups,
  encodePatientQrPayload,
  evaluatePregnancyRiskDeterministic,
  getOfflineProtocolReferences,
  parseBpReading,
  parsePatientQrInput,
} from './enhancementEngine';

test('QR Patient Identity codec round-trips structured JSON, direct IDs, and URLs safely', () => {
  const payload = buildPatientQrPayload(
    {
      patientUniqueId: 'pat-2026-0001',
      fullName: 'Lakshmi',
      assignedMode: 'PREGNANCY',
      locality: 'Devanahalli Ward 4',
    },
    '2026-11-20',
  );
  assert.equal(payload.patientUniqueId, 'PAT-2026-0001');

  const encoded = encodePatientQrPayload(payload);
  const decodedJson = parsePatientQrInput(encoded);
  assert.equal(decodedJson.valid, true);
  assert.equal(decodedJson.patientUniqueId, 'PAT-2026-0001');
  assert.equal(decodedJson.payload?.fullName, 'Lakshmi');

  const decodedDirect = parsePatientQrInput('pat-2026-0004');
  assert.equal(decodedDirect.valid, true);
  assert.equal(decodedDirect.patientUniqueId, 'PAT-2026-0004');

  const decodedUrl = parsePatientQrInput('https://asha.local/scan?patientId=PAT-2026-0002');
  assert.equal(decodedUrl.valid, true);
  assert.equal(decodedUrl.patientUniqueId, 'PAT-2026-0002');

  const invalid = parsePatientQrInput('random-garbage-text');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.patientUniqueId, null);
});

test('Smart Follow-Up engine buckets overdue, due-today, upcoming, and generates milestones', () => {
  const today = '2026-11-20';
  assert.equal(classifyDueBucket('2026-11-18', today), 'OVERDUE');
  assert.equal(classifyDueBucket('2026-11-20', today), 'DUE_TODAY');
  assert.equal(classifyDueBucket('2026-11-25', today), 'UPCOMING_7_DAYS');
  assert.equal(classifyDueBucket('2026-12-15', today), 'FUTURE');
  assert.equal(classifyDueBucket(null, today), 'UNSCHEDULED');

  const summary = computeSmartFollowups({
    todayIso: today,
    followups: [
      {
        id: 'fu-1',
        visitId: 'v-1',
        beneficiaryId: 'ben-1',
        beneficiaryName: 'Lakshmi',
        beneficiaryCode: 'ASHA00126',
        taskDescription: 'Check BP & IFA refill',
        priority: 'SCHEDULED_VISIT',
        dueDate: '2026-11-18',
        taskStatus: 'PENDING',
        createdAt: today,
      },
    ],
    appointments: [
      {
        id: 'appt-1',
        patientId: 'pat-001',
        patientName: 'Lakshmi',
        patientUniqueId: 'PAT-2026-0001',
        ashaWorkerId: 'WORKER001',
        healthcareMode: 'PREGNANCY',
        title: 'ANC Hb Review',
        scheduledDate: '2026-11-20',
        scheduledTime: '10:00 AM',
        location: 'Devanahalli PHC',
        status: 'SCHEDULED',
        reminderSent: true,
        notes: null,
        createdAt: today,
      },
    ],
    pregnancies: [
      {
        patient: {
          id: 'pat-004',
          patientUniqueId: 'PAT-2026-0004',
          userId: 'user-pat-04',
          beneficiaryId: 'ben-005',
          fullName: 'Kavya',
          age: 28,
          phone: null,
          locality: 'Ward 5',
          assignedMode: 'PREGNANCY',
          consentStatus: 'GRANTED',
          consentUpdatedAt: today,
          createdAt: today,
        },
        record: {
          id: 'cpreg-002',
          patientId: 'pat-004',
          ashaWorkerId: 'WORKER001',
          pregnancyStage: 'Third Trimester',
          gestationalWeeks: 30,
          expectedDeliveryDate: '2027-01-20',
          bloodPressure: '144/94',
          weightKg: 58,
          hemoglobinGDl: 9.2,
          ancVisitsCompleted: 1,
          ifaTabletsStatus: 'Irregular',
          riskLevel: 'HIGH_RISK',
          visitNotes: 'Mild swelling',
          lastCheckupDate: '2026-11-01',
          nextCheckupDate: null,
          updatedAt: today,
        },
      },
    ],
    newborns: [],
    vaccinations: [
      {
        patient: {
          id: 'pat-003',
          patientUniqueId: 'PAT-2026-0003',
          userId: 'user-pat-03',
          beneficiaryId: 'ben-004',
          fullName: 'Aarav',
          age: 1,
          phone: null,
          locality: 'Ward 5',
          assignedMode: 'VACCINATION',
          consentStatus: 'GRANTED',
          consentUpdatedAt: today,
          createdAt: today,
        },
        record: {
          id: 'cvacc-003',
          patientId: 'pat-003',
          ashaWorkerId: 'WORKER001',
          vaccineName: 'PCV-1 & RVV-1',
          doseLabel: '6 Weeks',
          dueDate: '2026-11-23',
          administeredDate: null,
          status: 'PENDING',
          notes: null,
          reminderSentAt: null,
          updatedAt: today,
        },
      },
    ],
  });

  assert.equal(summary.counts.overdue, 1);
  assert.equal(summary.counts.dueToday, 1);
  assert.equal(summary.counts.upcoming7Days, 2);
  assert.equal(summary.counts.recommendedMilestones, 1);
  assert.equal(summary.items[0].source, 'RECOMMENDED_MILESTONE');
  assert.equal(summary.items[0].urgency, 'CRITICAL');
});

test('Pregnancy Risk Alert engine stratifies LOW, MODERATE, HIGH, and CRITICAL risks accurately', () => {
  assert.deepEqual(parseBpReading('148/96 mmHg'), { systolic: 148, diastolic: 96 });
  assert.equal(parseBpReading('invalid'), null);

  const low = evaluatePregnancyRiskDeterministic({
    bloodPressure: '116/76',
    hemoglobinGDl: 11.8,
    gestationalWeeks: 24,
    weightKg: 55,
    age: 25,
    ancVisitsCompleted: 3,
    ifaTabletsStatus: 'Taking daily',
    symptomsOrNotes: 'Feeling healthy and active',
  });
  assert.equal(low.riskTier, 'LOW');
  assert.equal(low.phcReferralRequired, false);

  const moderate = evaluatePregnancyRiskDeterministic({
    bloodPressure: '120/80',
    hemoglobinGDl: 10.4,
    gestationalWeeks: 28,
    weightKg: 50,
    age: 26,
    ancVisitsCompleted: 2,
    ifaTabletsStatus: 'Stopped last week',
  });
  assert.equal(moderate.riskTier, 'MODERATE');
  assert.equal(moderate.phcReferralRequired, false);

  const high = evaluatePregnancyRiskDeterministic({
    bloodPressure: '142/92',
    hemoglobinGDl: 10.5,
    gestationalWeeks: 28,
    weightKg: 52,
    age: 26,
    ancVisitsCompleted: 2,
  });
  assert.equal(high.riskTier, 'HIGH');
  assert.equal(high.phcReferralRequired, true);

  const critical = evaluatePregnancyRiskDeterministic({
    bloodPressure: '164/112',
    hemoglobinGDl: 6.5,
    gestationalWeeks: 34,
    weightKg: 48,
    age: 29,
    ancVisitsCompleted: 2,
    symptomsOrNotes: 'Severe headache, blurred vision and mild bleeding today',
  });
  assert.equal(critical.riskTier, 'CRITICAL');
  assert.equal(critical.phcReferralRequired, true);
  assert.ok(critical.riskScore >= 65);
  assert.ok(critical.factors.some((f) => f.code === 'SEVERE_HYPERTENSION'));
  assert.ok(critical.factors.some((f) => f.code === 'SEVERE_ANEMIA'));
});

test('Offline protocol handbook returns all 3 care mode checklists', () => {
  const cards = getOfflineProtocolReferences('en');
  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map((c) => c.mode),
    ['PREGNANCY', 'NEWBORN_CARE', 'VACCINATION'],
  );
});
