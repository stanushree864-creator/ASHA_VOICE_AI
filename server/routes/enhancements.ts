import crypto from 'node:crypto';
import express from 'express';
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../auth/authService';
import { db } from '../db/database';
import {
  buildPatientQrPayload,
  computeSmartFollowups,
  encodePatientQrPayload,
  evaluatePregnancyRiskDeterministic,
  parsePatientQrInput,
} from '../../src/shared/enhancementEngine';
import { SUPPORTED_LANGUAGES } from '../../src/shared/languages';
import type {
  CareAppointment,
  ConnectionStatus,
  EmergencyContactDirectory,
  FollowupTask,
  HealthcareMode,
  LanguageCode,
  NewbornCareRecord,
  PatientProfileRecord,
  PregnancyCareRecord,
  PregnancyRiskAssessment,
  QrResolvedPatientResponse,
  VaccinationCareRecord,
} from '../../src/shared/types';
import {
  analyzePregnancyRiskWithGemini,
  askMultilingualAssistantWithGemini,
  isEnhancementGeminiReady,
} from '../speech/enhancementAi';

export const enhancementsRouter = express.Router();

function sanitize(input: string | null | undefined, maxLen = 1000): string {
  if (!input) return '';
  return input
    .replace(/<\s*\/?\s*(?:script|iframe|object|embed|style)[^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

function recordEnhancementAudit(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
): void {
  db.prepare(
    `INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, timestamp, correlation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    `aud-${crypto.randomUUID()}`,
    userId,
    entityType,
    entityId,
    action,
    new Date().toISOString(),
    `corr-${crypto.randomBytes(6).toString('hex')}`,
  );
}

function mapPatientRow(r: {
  id: string;
  patient_unique_id: string;
  user_id: string | null;
  beneficiary_id: string | null;
  full_name: string;
  age: number | null;
  phone: string | null;
  locality: string | null;
  assigned_mode: HealthcareMode;
  consent_status: 'GRANTED' | 'PENDING' | 'WITHDRAWN';
  consent_updated_at: string | null;
  created_at: string;
}): PatientProfileRecord {
  return {
    id: r.id,
    patientUniqueId: r.patient_unique_id,
    userId: r.user_id,
    beneficiaryId: r.beneficiary_id,
    fullName: r.full_name,
    age: r.age,
    phone: r.phone,
    locality: r.locality,
    assignedMode: r.assigned_mode,
    consentStatus: r.consent_status,
    consentUpdatedAt: r.consent_updated_at,
    createdAt: r.created_at,
  };
}

function resolveQrForAuthorizedUser(
  rawIdentifier: string,
  req: AuthenticatedRequest,
): { status: number; body: Record<string, unknown> | QrResolvedPatientResponse } {
  const parsed = parsePatientQrInput(rawIdentifier);
  if (!parsed.valid || !parsed.patientUniqueId) {
    return { status: 400, body: { error: parsed.error || 'Invalid QR or Patient ID' } };
  }

  const code = parsed.patientUniqueId;

  // Match either patient_profiles.patient_unique_id OR linked beneficiaries.beneficiary_code
  const row = db
    .prepare(
      `SELECT pp.*
       FROM patient_profiles pp
       LEFT JOIN beneficiaries b ON pp.beneficiary_id = b.id
       WHERE UPPER(pp.patient_unique_id) = ? OR UPPER(b.beneficiary_code) = ?
       LIMIT 1`,
    )
    .get(code, code) as
    | {
        id: string;
        patient_unique_id: string;
        user_id: string | null;
        beneficiary_id: string | null;
        full_name: string;
        age: number | null;
        phone: string | null;
        locality: string | null;
        assigned_mode: HealthcareMode;
        consent_status: 'GRANTED' | 'PENDING' | 'WITHDRAWN';
        consent_updated_at: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return { status: 404, body: { error: `No registered patient found for QR ID "${code}"` } };
  }

  const role = req.authUser!.role;
  // Patients may only inspect their own QR card
  if (role === 'PATIENT' && row.user_id !== req.authUser!.id) {
    return { status: 403, body: { error: 'Patients can only view their own QR Health ID card.' } };
  }

  const workerId = req.workerId ?? 'WORKER001';
  const conn = db
    .prepare(
      `SELECT c.status, c.asha_unique_id as ashaUniqueId, u.full_name as ashaWorkerName
       FROM asha_patient_connections c
       JOIN workers w ON c.asha_worker_id = w.id
       JOIN users u ON w.user_id = u.id
       WHERE c.patient_id = ? AND (? = 'SUPERVISOR' OR ? = 'ADMIN' OR c.asha_worker_id = ? OR c.status = 'CONNECTED')
       ORDER BY CASE WHEN c.status = 'CONNECTED' THEN 0 ELSE 1 END, c.requested_at DESC
       LIMIT 1`,
    )
    .get(row.id, role, role, workerId) as
    | {
        status: ConnectionStatus;
        ashaUniqueId: string;
        ashaWorkerName: string;
      }
    | undefined;

  const patient = mapPatientRow(row);
  const consentGranted = patient.consentStatus === 'GRANTED';
  const canViewClinicalSummary =
    role === 'SUPERVISOR' ||
    role === 'ADMIN' ||
    (role === 'PATIENT' && row.user_id === req.authUser!.id) ||
    (conn?.status === 'CONNECTED' && consentGranted);

  const summary: QrResolvedPatientResponse['summary'] = {};
  if (canViewClinicalSummary) {
    const preg = db
      .prepare(
        `SELECT pregnancy_stage, gestational_weeks, expected_delivery_date, risk_level
         FROM care_pregnancy_records WHERE patient_id = ? LIMIT 1`,
      )
      .get(patient.id) as
      | {
          pregnancy_stage: string;
          gestational_weeks: number | null;
          expected_delivery_date: string | null;
          risk_level: string;
        }
      | undefined;
    if (preg) {
      summary.pregnancyStage = preg.pregnancy_stage;
      summary.gestationalWeeks = preg.gestational_weeks;
      summary.expectedDeliveryDate = preg.expected_delivery_date;
      summary.riskLevel = preg.risk_level;
    }

    const nb = db
      .prepare(
        `SELECT baby_name, birth_weight_kg, current_weight_kg
         FROM care_newborn_records WHERE patient_id = ? LIMIT 1`,
      )
      .get(patient.id) as
      | {
          baby_name: string;
          birth_weight_kg: number | null;
          current_weight_kg: number | null;
        }
      | undefined;
    if (nb) {
      summary.babyName = nb.baby_name;
      summary.birthWeightKg = nb.birth_weight_kg;
      summary.currentWeightKg = nb.current_weight_kg;
    }

    const vaccCount = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM care_vaccination_records
         WHERE patient_id = ? AND status IN ('PENDING', 'SCHEDULED', 'OVERDUE')`,
      )
      .get(patient.id) as { cnt: number };
    summary.pendingVaccinesCount = vaccCount.cnt;

    const nextAppt = db
      .prepare(
        `SELECT scheduled_date FROM care_appointments
         WHERE patient_id = ? AND status = 'SCHEDULED'
         ORDER BY scheduled_date ASC LIMIT 1`,
      )
      .get(patient.id) as { scheduled_date: string } | undefined;
    summary.upcomingAppointmentDate = nextAppt?.scheduled_date ?? null;
  }

  const qrPayload = buildPatientQrPayload(patient);
  const qrString = encodePatientQrPayload(qrPayload);

  return {
    status: 200,
    body: {
      patient: consentGranted || role === 'PATIENT' ? patient : { ...patient, phone: null },
      qrPayload,
      qrString,
      consentGranted,
      connectionStatus: conn?.status ?? 'NOT_CONNECTED',
      connectedWorkerName: conn?.ashaWorkerName ?? null,
      connectedWorkerUniqueId: conn?.ashaUniqueId ?? null,
      summary,
    },
  };
}

// -----------------------------------------------------------------------------
// FEATURE 2: QR-BASED PATIENT IDENTITY ENDPOINTS
// -----------------------------------------------------------------------------

enhancementsRouter.get('/enhancements/qr/patient/:identifier', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = resolveQrForAuthorizedUser(req.params.identifier, req);
  res.status(result.status).json(result.body);
});

enhancementsRouter.post('/enhancements/qr/resolve', requireAuth, (req: AuthenticatedRequest, res) => {
  const { qrInput } = req.body as { qrInput?: string };
  if (!qrInput || typeof qrInput !== 'string') {
    res.status(400).json({ error: 'qrInput is required' });
    return;
  }
  const result = resolveQrForAuthorizedUser(qrInput, req);
  if (result.status === 200) {
    const resolved = result.body as QrResolvedPatientResponse;
    recordEnhancementAudit(req.authUser!.id, 'QR_IDENTITY', resolved.patient.patientUniqueId, 'QR_SCANNED_RESOLVED');
  }
  res.status(result.status).json(result.body);
});

// -----------------------------------------------------------------------------
// FEATURE 3: SMART FOLLOW-UP SYSTEM ENDPOINTS
// -----------------------------------------------------------------------------

function gatherSmartFollowupsForUser(req: AuthenticatedRequest) {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const workerId = req.workerId ?? 'WORKER001';

  const followups = db
    .prepare(
      `SELECT f.id, f.visit_id as visitId, f.beneficiary_id as beneficiaryId,
              b.display_name as beneficiaryName, b.beneficiary_code as beneficiaryCode,
              f.task_description as taskDescription, f.priority, f.due_date as dueDate,
              f.task_status as taskStatus, f.created_at as createdAt
       FROM followups f
       JOIN beneficiaries b ON f.beneficiary_id = b.id
       ${isWorker ? 'WHERE f.worker_id = ?' : ''}
       ORDER BY f.created_at DESC`,
    )
    .all(...(isWorker ? [workerId] : [])) as FollowupTask[];

  const appointments = db
    .prepare(
      `SELECT ca.id, ca.patient_id as patientId, pp.full_name as patientName,
              pp.patient_unique_id as patientUniqueId, ca.asha_worker_id as ashaWorkerId,
              ca.healthcare_mode as healthcareMode, ca.title, ca.scheduled_date as scheduledDate,
              ca.scheduled_time as scheduledTime, ca.location, ca.status,
              ca.reminder_sent as reminderSent, ca.notes, ca.created_at as createdAt
       FROM care_appointments ca
       JOIN patient_profiles pp ON ca.patient_id = pp.id
       ${isWorker ? 'WHERE ca.asha_worker_id = ?' : ''}
       ORDER BY ca.scheduled_date ASC`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<
    CareAppointment & { patientName: string; patientUniqueId: string }
  >;

  const pregRows = db
    .prepare(
      `SELECT pp.*, cpr.id as rec_id, cpr.pregnancy_stage, cpr.gestational_weeks,
              cpr.expected_delivery_date, cpr.blood_pressure, cpr.weight_kg,
              cpr.hemoglobin_g_dl, cpr.anc_visits_completed, cpr.ifa_tablets_status,
              cpr.risk_level, cpr.visit_notes, cpr.last_checkup_date, cpr.next_checkup_date,
              cpr.updated_at as rec_updated_at, cpr.asha_worker_id
       FROM care_pregnancy_records cpr
       JOIN patient_profiles pp ON cpr.patient_id = pp.id
       ${isWorker ? 'WHERE cpr.asha_worker_id = ?' : ''}`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    patient_unique_id: string;
    user_id: string | null;
    beneficiary_id: string | null;
    full_name: string;
    age: number | null;
    phone: string | null;
    locality: string | null;
    assigned_mode: HealthcareMode;
    consent_status: 'GRANTED' | 'PENDING' | 'WITHDRAWN';
    consent_updated_at: string | null;
    created_at: string;
    rec_id: string;
    asha_worker_id: string;
    pregnancy_stage: string;
    gestational_weeks: number | null;
    expected_delivery_date: string | null;
    blood_pressure: string | null;
    weight_kg: number | null;
    hemoglobin_g_dl: number | null;
    anc_visits_completed: number;
    ifa_tablets_status: string | null;
    risk_level: 'NORMAL' | 'MONITOR' | 'HIGH_RISK';
    visit_notes: string | null;
    last_checkup_date: string | null;
    next_checkup_date: string | null;
    rec_updated_at: string;
  }>;

  const pregnancies = pregRows.map((r) => ({
    patient: mapPatientRow(r),
    record: {
      id: r.rec_id,
      patientId: r.id,
      ashaWorkerId: r.asha_worker_id,
      pregnancyStage: r.pregnancy_stage,
      gestationalWeeks: r.gestational_weeks,
      expectedDeliveryDate: r.expected_delivery_date,
      bloodPressure: r.blood_pressure,
      weightKg: r.weight_kg,
      hemoglobinGDl: r.hemoglobin_g_dl,
      ancVisitsCompleted: r.anc_visits_completed,
      ifaTabletsStatus: r.ifa_tablets_status,
      riskLevel: r.risk_level,
      visitNotes: r.visit_notes,
      lastCheckupDate: r.last_checkup_date,
      nextCheckupDate: r.next_checkup_date,
      updatedAt: r.rec_updated_at,
    } satisfies PregnancyCareRecord,
  }));

  const nbRows = db
    .prepare(
      `SELECT pp.*, cnr.id as rec_id, cnr.asha_worker_id, cnr.baby_name, cnr.mother_name,
              cnr.birth_date, cnr.birth_weight_kg, cnr.current_weight_kg, cnr.length_cm,
              cnr.temperature, cnr.feeding_status, cnr.hbnc_visits_completed,
              cnr.health_notes, cnr.next_checkup_date, cnr.updated_at as rec_updated_at
       FROM care_newborn_records cnr
       JOIN patient_profiles pp ON cnr.patient_id = pp.id
       ${isWorker ? 'WHERE cnr.asha_worker_id = ?' : ''}`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    patient_unique_id: string;
    user_id: string | null;
    beneficiary_id: string | null;
    full_name: string;
    age: number | null;
    phone: string | null;
    locality: string | null;
    assigned_mode: HealthcareMode;
    consent_status: 'GRANTED' | 'PENDING' | 'WITHDRAWN';
    consent_updated_at: string | null;
    created_at: string;
    rec_id: string;
    asha_worker_id: string;
    baby_name: string;
    mother_name: string;
    birth_date: string;
    birth_weight_kg: number | null;
    current_weight_kg: number | null;
    length_cm: number | null;
    temperature: string | null;
    feeding_status: string | null;
    hbnc_visits_completed: number;
    health_notes: string | null;
    next_checkup_date: string | null;
    rec_updated_at: string;
  }>;

  const newborns = nbRows.map((r) => ({
    patient: mapPatientRow(r),
    record: {
      id: r.rec_id,
      patientId: r.id,
      ashaWorkerId: r.asha_worker_id,
      babyName: r.baby_name,
      motherName: r.mother_name,
      birthDate: r.birth_date,
      birthWeightKg: r.birth_weight_kg,
      currentWeightKg: r.current_weight_kg,
      lengthCm: r.length_cm,
      temperature: r.temperature,
      feedingStatus: r.feeding_status,
      hbncVisitsCompleted: r.hbnc_visits_completed,
      healthNotes: r.health_notes,
      nextCheckupDate: r.next_checkup_date,
      updatedAt: r.rec_updated_at,
    } satisfies NewbornCareRecord,
  }));

  const vaccRows = db
    .prepare(
      `SELECT pp.*, cvr.id as rec_id, cvr.asha_worker_id, cvr.vaccine_name, cvr.dose_label,
              cvr.due_date, cvr.administered_date, cvr.status, cvr.notes, cvr.reminder_sent_at,
              cvr.updated_at as rec_updated_at
       FROM care_vaccination_records cvr
       JOIN patient_profiles pp ON cvr.patient_id = pp.id
       ${isWorker ? 'WHERE cvr.asha_worker_id = ?' : ''}`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    patient_unique_id: string;
    user_id: string | null;
    beneficiary_id: string | null;
    full_name: string;
    age: number | null;
    phone: string | null;
    locality: string | null;
    assigned_mode: HealthcareMode;
    consent_status: 'GRANTED' | 'PENDING' | 'WITHDRAWN';
    consent_updated_at: string | null;
    created_at: string;
    rec_id: string;
    asha_worker_id: string;
    vaccine_name: string;
    dose_label: string;
    due_date: string;
    administered_date: string | null;
    status: VaccinationCareRecord['status'];
    notes: string | null;
    reminder_sent_at: string | null;
    rec_updated_at: string;
  }>;

  const vaccinations = vaccRows.map((r) => ({
    patient: mapPatientRow(r),
    record: {
      id: r.rec_id,
      patientId: r.id,
      ashaWorkerId: r.asha_worker_id,
      vaccineName: r.vaccine_name,
      doseLabel: r.dose_label,
      dueDate: r.due_date,
      administeredDate: r.administered_date,
      status: r.status,
      notes: r.notes,
      reminderSentAt: r.reminder_sent_at,
      updatedAt: r.rec_updated_at,
    } satisfies VaccinationCareRecord,
  }));

  return computeSmartFollowups({
    followups,
    appointments,
    pregnancies,
    newborns,
    vaccinations,
  });
}

enhancementsRouter.get(
  '/enhancements/smart-followups',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const summary = gatherSmartFollowupsForUser(req);
    res.json(summary);
  },
);

enhancementsRouter.post(
  '/enhancements/smart-followups/auto-generate',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const summary = gatherSmartFollowupsForUser(req);
    const workerId = req.workerId ?? 'WORKER001';
    const recommendations = summary.items.filter((i) => i.canAutoCreate);

    const anyVisit = db
      .prepare(`SELECT id FROM visits ORDER BY created_at DESC LIMIT 1`)
      .get() as { id: string } | undefined;
    const fallbackBen = db
      .prepare(`SELECT id FROM beneficiaries ORDER BY created_at ASC LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!anyVisit) {
      res.status(400).json({ error: 'At least one baseline visit record is required to anchor follow-ups.' });
      return;
    }

    const createdIds: string[] = [];
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    for (const item of recommendations) {
      const targetBenId = item.beneficiaryId || fallbackBen?.id;
      if (!targetBenId) continue;
      const newId = `fu-smart-${crypto.randomUUID().slice(0, 8)}`;
      insertStmt.run(
        newId,
        anyVisit.id,
        targetBenId,
        workerId,
        item.title,
        item.suggestedPriority ?? 'SCHEDULED_VISIT',
        item.dueDate,
        now,
      );
      createdIds.push(newId);
    }

    if (createdIds.length > 0) {
      recordEnhancementAudit(
        req.authUser!.id,
        'SMART_FOLLOWUP',
        workerId,
        `AUTO_GENERATED_${createdIds.length}_TASKS`,
      );
    }

    const updatedSummary = gatherSmartFollowupsForUser(req);
    res.json({
      createdCount: createdIds.length,
      summary: updatedSummary,
    });
  },
);

// -----------------------------------------------------------------------------
// FEATURE 4: MULTILINGUAL AI VOICE ASSISTANT (GEMINI SERVER-SIDE)
// -----------------------------------------------------------------------------

enhancementsRouter.post(
  '/enhancements/assistant/ask',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const { question, language, contextSummary } = req.body as {
      question?: string;
      language?: LanguageCode;
      contextSummary?: string;
    };

    const cleanQuestion = sanitize(question, 1000);
    if (!cleanQuestion) {
      res.status(400).json({ error: 'Please provide a question or speak your prompt.' });
      return;
    }

    const validLang: LanguageCode = SUPPORTED_LANGUAGES.some((l) => l.code === language)
      ? (language as LanguageCode)
      : 'en';

    if (!isEnhancementGeminiReady()) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Use Offline NHM Protocol Reference cards or configure GEMINI_API_KEY in server environment.',
        code: 'GEMINI_UNCONFIGURED',
      });
      return;
    }

    try {
      const result = await askMultilingualAssistantWithGemini({
        question: cleanQuestion,
        language: validLang,
        contextSummary: sanitize(contextSummary, 600) || undefined,
      });

      recordEnhancementAudit(
        req.authUser!.id,
        'AI_ASSISTANT',
        validLang,
        `ASSISTANT_QUERY_${result.modelUsed}`,
      );

      res.json({
        reply: result.reply,
        suggestedQuestions: result.suggestedQuestions,
        language: validLang,
        modelUsed: result.modelUsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini assistant request failed';
      res.status(502).json({
        error: `AI Assistant error: ${message}`,
        code: 'GEMINI_UPSTREAM_ERROR',
      });
    }
  },
);

// -----------------------------------------------------------------------------
// FEATURE 5: AI-BASED PREGNANCY RISK ALERT SYSTEM
// -----------------------------------------------------------------------------

function mapAssessmentRow(r: {
  id: string;
  patient_id: string;
  patient_unique_id: string;
  patient_name: string;
  gestational_weeks: number | null;
  blood_pressure: string | null;
  hemoglobin_g_dl: number | null;
  weight_kg: number | null;
  anc_visits_completed: number;
  risk_score: number;
  risk_tier: PregnancyRiskAssessment['riskTier'];
  phc_referral_required: number;
  factors_json: string;
  recommendations_json: string;
  ai_summary: string | null;
  ai_status: PregnancyRiskAssessment['aiStatus'];
  assessed_by: string;
  created_at: string;
}): PregnancyRiskAssessment {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientUniqueId: r.patient_unique_id,
    patientName: r.patient_name,
    gestationalWeeks: r.gestational_weeks,
    bloodPressure: r.blood_pressure,
    hemoglobinGDl: r.hemoglobin_g_dl,
    weightKg: r.weight_kg,
    ancVisitsCompleted: r.anc_visits_completed,
    riskScore: r.risk_score,
    riskTier: r.risk_tier,
    phcReferralRequired: r.phc_referral_required === 1,
    factors: JSON.parse(r.factors_json),
    recommendations: JSON.parse(r.recommendations_json),
    aiSummary: r.ai_summary,
    aiStatus: r.ai_status,
    assessedBy: r.assessed_by,
    createdAt: r.created_at,
  };
}

enhancementsRouter.get(
  '/enhancements/risk/pregnancy',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const isWorker = req.authUser!.role === 'ASHA_WORKER';
    const workerId = req.workerId ?? 'WORKER001';

    const pregRows = db
      .prepare(
        `SELECT pp.id as patientId, pp.patient_unique_id as patientUniqueId, pp.full_name as patientName,
                pp.age, cpr.asha_worker_id as ashaWorkerId, cpr.gestational_weeks as gestationalWeeks,
                cpr.blood_pressure as bloodPressure, cpr.hemoglobin_g_dl as hemoglobinGDl,
                cpr.weight_kg as weightKg, cpr.anc_visits_completed as ancVisitsCompleted,
                cpr.ifa_tablets_status as ifaTabletsStatus, cpr.visit_notes as visitNotes,
                cpr.risk_level as storedRiskLevel
         FROM care_pregnancy_records cpr
         JOIN patient_profiles pp ON cpr.patient_id = pp.id
         ${isWorker ? 'WHERE cpr.asha_worker_id = ?' : ''}
         ORDER BY pp.patient_unique_id ASC`,
      )
      .all(...(isWorker ? [workerId] : [])) as Array<{
      patientId: string;
      patientUniqueId: string;
      patientName: string;
      age: number | null;
      ashaWorkerId: string;
      gestationalWeeks: number | null;
      bloodPressure: string | null;
      hemoglobinGDl: number | null;
      weightKg: number | null;
      ancVisitsCompleted: number;
      ifaTabletsStatus: string | null;
      visitNotes: string | null;
      storedRiskLevel: string;
    }>;

    // Fetch latest persisted AI/clinical assessment per patient if present
    const persistedRows = db
      .prepare(
        `SELECT * FROM pregnancy_risk_assessments
         ${isWorker ? 'WHERE asha_worker_id = ?' : ''}
         ORDER BY created_at DESC`,
      )
      .all(...(isWorker ? [workerId] : [])) as Parameters<typeof mapAssessmentRow>[0][];

    const latestByPatient = new Map<string, PregnancyRiskAssessment>();
    for (const r of persistedRows) {
      if (!latestByPatient.has(r.patient_id)) {
        latestByPatient.set(r.patient_id, mapAssessmentRow(r));
      }
    }

    const assessments: PregnancyRiskAssessment[] = pregRows.map((p) => {
      const existing = latestByPatient.get(p.patientId);
      const liveEval = evaluatePregnancyRiskDeterministic({
        bloodPressure: p.bloodPressure,
        hemoglobinGDl: p.hemoglobinGDl,
        gestationalWeeks: p.gestationalWeeks,
        weightKg: p.weightKg,
        age: p.age,
        ancVisitsCompleted: p.ancVisitsCompleted,
        ifaTabletsStatus: p.ifaTabletsStatus,
        symptomsOrNotes: p.visitNotes,
      });

      if (existing) {
        return existing;
      }

      return {
        id: `live-risk-${p.patientId}`,
        patientId: p.patientId,
        patientUniqueId: p.patientUniqueId,
        patientName: p.patientName,
        gestationalWeeks: p.gestationalWeeks,
        bloodPressure: p.bloodPressure,
        hemoglobinGDl: p.hemoglobinGDl,
        weightKg: p.weightKg,
        ancVisitsCompleted: p.ancVisitsCompleted,
        riskScore: liveEval.riskScore,
        riskTier: liveEval.riskTier,
        phcReferralRequired: liveEval.phcReferralRequired,
        factors: liveEval.factors,
        recommendations: liveEval.recommendations,
        aiSummary: null,
        aiStatus: 'NOT_REQUESTED',
        assessedBy: 'NHM Deterministic Triage',
        createdAt: new Date().toISOString(),
      };
    });

    assessments.sort((a, b) => b.riskScore - a.riskScore);
    res.json({
      geminiConfigured: isEnhancementGeminiReady(),
      assessments,
    });
  },
);

enhancementsRouter.post(
  '/enhancements/risk/pregnancy/assess',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      patientId?: string;
      bloodPressure?: string | null;
      hemoglobinGDl?: number | null;
      gestationalWeeks?: number | null;
      weightKg?: number | null;
      age?: number | null;
      ancVisitsCompleted?: number;
      ifaTabletsStatus?: string | null;
      symptomsOrNotes?: string | null;
      includeAiAnalysis?: boolean;
      notifyOnHighRisk?: boolean;
    };

    if (!body.patientId) {
      res.status(400).json({ error: 'patientId is required' });
      return;
    }

    const pat = db
      .prepare(
        `SELECT pp.id, pp.patient_unique_id as patientUniqueId, pp.full_name as patientName, pp.user_id as userId, pp.age,
                cpr.asha_worker_id as ashaWorkerId, cpr.gestational_weeks as gestationalWeeks,
                cpr.blood_pressure as bloodPressure, cpr.hemoglobin_g_dl as hemoglobinGDl,
                cpr.weight_kg as weightKg, cpr.anc_visits_completed as ancVisitsCompleted,
                cpr.ifa_tablets_status as ifaTabletsStatus, cpr.visit_notes as visitNotes
         FROM patient_profiles pp
         LEFT JOIN care_pregnancy_records cpr ON cpr.patient_id = pp.id
         WHERE pp.id = ? OR pp.patient_unique_id = ?
         LIMIT 1`,
      )
      .get(body.patientId, body.patientId) as
      | {
          id: string;
          patientUniqueId: string;
          patientName: string;
          userId: string | null;
          age: number | null;
          ashaWorkerId: string | null;
          gestationalWeeks: number | null;
          bloodPressure: string | null;
          hemoglobinGDl: number | null;
          weightKg: number | null;
          ancVisitsCompleted: number | null;
          ifaTabletsStatus: string | null;
          visitNotes: string | null;
        }
      | undefined;

    if (!pat) {
      res.status(404).json({ error: 'Pregnant patient profile not found' });
      return;
    }

    const bp = body.bloodPressure !== undefined ? sanitize(body.bloodPressure, 30) || null : pat.bloodPressure;
    const hb = body.hemoglobinGDl !== undefined ? body.hemoglobinGDl : pat.hemoglobinGDl;
    const weeks = body.gestationalWeeks !== undefined ? body.gestationalWeeks : pat.gestationalWeeks;
    const weight = body.weightKg !== undefined ? body.weightKg : pat.weightKg;
    const age = body.age !== undefined ? body.age : pat.age;
    const ancVisits =
      body.ancVisitsCompleted !== undefined ? body.ancVisitsCompleted : pat.ancVisitsCompleted ?? 0;
    const ifa =
      body.ifaTabletsStatus !== undefined ? sanitize(body.ifaTabletsStatus, 120) : pat.ifaTabletsStatus;
    const notes =
      body.symptomsOrNotes !== undefined ? sanitize(body.symptomsOrNotes, 600) : pat.visitNotes;

    const evalResult = evaluatePregnancyRiskDeterministic({
      bloodPressure: bp,
      hemoglobinGDl: hb,
      gestationalWeeks: weeks,
      weightKg: weight,
      age,
      ancVisitsCompleted: ancVisits,
      ifaTabletsStatus: ifa,
      symptomsOrNotes: notes,
    });

    let aiSummary: string | null = null;
    let aiStatus: PregnancyRiskAssessment['aiStatus'] = 'NOT_REQUESTED';

    if (body.includeAiAnalysis) {
      if (!isEnhancementGeminiReady()) {
        aiStatus = 'GEMINI_UNCONFIGURED';
      } else {
        try {
          const aiRes = await analyzePregnancyRiskWithGemini({
            patientName: pat.patientName,
            gestationalWeeks: weeks,
            bloodPressure: bp,
            hemoglobinGDl: hb,
            weightKg: weight,
            ancVisitsCompleted: ancVisits,
            symptomsOrNotes: notes,
            deterministicTier: evalResult.riskTier,
            deterministicScore: evalResult.riskScore,
            factors: evalResult.factors,
          });
          aiSummary = aiRes.summary;
          aiStatus = 'GEMINI_VERIFIED';
        } catch {
          aiStatus = 'GEMINI_ERROR';
        }
      }
    }

    const now = new Date().toISOString();
    const id = `prisk-${crypto.randomUUID().slice(0, 8)}`;
    const workerId = pat.ashaWorkerId ?? req.workerId ?? 'WORKER001';

    db.prepare(`
      INSERT INTO pregnancy_risk_assessments (
        id, patient_id, patient_unique_id, patient_name, asha_worker_id,
        gestational_weeks, blood_pressure, hemoglobin_g_dl, weight_kg, anc_visits_completed,
        risk_score, risk_tier, phc_referral_required, factors_json, recommendations_json,
        ai_summary, ai_status, assessed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pat.id,
      pat.patientUniqueId,
      pat.patientName,
      workerId,
      weeks,
      bp,
      hb,
      weight,
      ancVisits,
      evalResult.riskScore,
      evalResult.riskTier,
      evalResult.phcReferralRequired ? 1 : 0,
      JSON.stringify(evalResult.factors),
      JSON.stringify(evalResult.recommendations),
      aiSummary,
      aiStatus,
      req.authUser!.fullName,
      now,
    );

    // Sync risk_level back onto care_pregnancy_records if row exists (preserving rest of record)
    const mappedCareLevel =
      evalResult.riskTier === 'CRITICAL' || evalResult.riskTier === 'HIGH'
        ? 'HIGH_RISK'
        : evalResult.riskTier === 'MODERATE'
          ? 'MONITOR'
          : 'NORMAL';
    db.prepare(`UPDATE care_pregnancy_records SET risk_level = ?, updated_at = ? WHERE patient_id = ?`).run(
      mappedCareLevel,
      now,
      pat.id,
    );

    if (body.notifyOnHighRisk !== false && evalResult.phcReferralRequired && pat.userId) {
      db.prepare(`
        INSERT INTO care_notifications (id, recipient_user_id, sender_name, notification_type, title, message, related_id, is_read, created_at)
        VALUES (?, ?, ?, 'ANC_REMINDER', ?, ?, ?, 0, ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        pat.userId,
        `${req.authUser!.fullName} (ASHA)`,
        `Urgent Antenatal Risk Alert (${evalResult.riskTier})`,
        `${evalResult.recommendations[0] ?? 'Please visit Devanahalli PHC promptly for maternal evaluation.'}`,
        id,
        now,
      );
    }

    recordEnhancementAudit(
      req.authUser!.id,
      'PREGNANCY_RISK',
      pat.patientUniqueId,
      `ASSESSED_${evalResult.riskTier}_SCORE_${evalResult.riskScore}`,
    );

    res.status(201).json({
      assessment: {
        id,
        patientId: pat.id,
        patientUniqueId: pat.patientUniqueId,
        patientName: pat.patientName,
        gestationalWeeks: weeks,
        bloodPressure: bp,
        hemoglobinGDl: hb,
        weightKg: weight,
        ancVisitsCompleted: ancVisits,
        riskScore: evalResult.riskScore,
        riskTier: evalResult.riskTier,
        phcReferralRequired: evalResult.phcReferralRequired,
        factors: evalResult.factors,
        recommendations: evalResult.recommendations,
        aiSummary,
        aiStatus,
        assessedBy: req.authUser!.fullName,
        createdAt: now,
      } satisfies PregnancyRiskAssessment,
    });
  },
);

// -----------------------------------------------------------------------------
// FEATURE 6: ASHA WORKER EMERGENCY CONTACT INFORMATION
// -----------------------------------------------------------------------------

function resolveEmergencyDirectoryForRequest(req: AuthenticatedRequest): EmergencyContactDirectory | null {
  let targetWorkerId = req.workerId ?? 'WORKER001';
  let patientExtra: {
    patientEmergencyContactName: string | null;
    patientEmergencyContactRelation: string | null;
    patientEmergencyContactPhone: string | null;
  } = {
    patientEmergencyContactName: null,
    patientEmergencyContactRelation: null,
    patientEmergencyContactPhone: null,
  };

  if (req.authUser!.role === 'PATIENT') {
    const pat = db
      .prepare(
        `SELECT pp.id, pp.emergency_contact_name, pp.emergency_contact_relation, pp.emergency_contact_phone,
                c.asha_worker_id
         FROM patient_profiles pp
         LEFT JOIN asha_patient_connections c ON c.patient_id = pp.id AND c.status = 'CONNECTED'
         WHERE pp.user_id = ?
         LIMIT 1`,
      )
      .get(req.authUser!.id) as
      | {
          id: string;
          emergency_contact_name: string | null;
          emergency_contact_relation: string | null;
          emergency_contact_phone: string | null;
          asha_worker_id: string | null;
        }
      | undefined;
    if (pat) {
      targetWorkerId = pat.asha_worker_id ?? 'WORKER001';
      patientExtra = {
        patientEmergencyContactName: pat.emergency_contact_name,
        patientEmergencyContactRelation: pat.emergency_contact_relation,
        patientEmergencyContactPhone: pat.emergency_contact_phone,
      };
    }
  }

  const row = db
    .prepare(
      `SELECT w.id as workerId, COALESCE(w.asha_unique_id, w.worker_code) as ashaUniqueId,
              u.full_name as workerName, w.assigned_area as assignedArea,
              ec.worker_phone, ec.backup_phone, ec.phc_name, ec.phc_phone,
              ec.ambulance_number, ec.supervisor_name, ec.supervisor_phone,
              ec.district_helpline, ec.emergency_instructions, ec.updated_at
       FROM workers w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN emergency_contacts ec ON ec.worker_id = w.id
       WHERE w.id = ?
       LIMIT 1`,
    )
    .get(targetWorkerId) as
    | {
        workerId: string;
        ashaUniqueId: string;
        workerName: string;
        assignedArea: string;
        worker_phone: string | null;
        backup_phone: string | null;
        phc_name: string | null;
        phc_phone: string | null;
        ambulance_number: string | null;
        supervisor_name: string | null;
        supervisor_phone: string | null;
        district_helpline: string | null;
        emergency_instructions: string | null;
        updated_at: string | null;
      }
    | undefined;

  if (!row) return null;

  return {
    workerId: row.workerId,
    ashaUniqueId: row.ashaUniqueId,
    workerName: row.workerName,
    assignedArea: row.assignedArea,
    workerPhone: row.worker_phone ?? '+91 98450 77881',
    backupPhone: row.backup_phone ?? '+91 98450 77882',
    phcName: row.phc_name ?? 'Devanahalli Block Primary Health Centre (PHC)',
    phcPhone: row.phc_phone ?? '+91 80 2768 2108',
    ambulanceNumber: row.ambulance_number ?? '108',
    supervisorName: row.supervisor_name ?? 'Dr. Kavitha Rao (PHC Medical Officer)',
    supervisorPhone: row.supervisor_phone ?? '+91 98450 90108',
    districtHelpline: row.district_helpline ?? '104',
    emergencyInstructions:
      row.emergency_instructions ??
      'Call 108 Ambulance and alert Devanahalli PHC immediately for any obstetric or newborn danger signs.',
    ...patientExtra,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

enhancementsRouter.get('/enhancements/emergency-contacts', requireAuth, (req: AuthenticatedRequest, res) => {
  const directory = resolveEmergencyDirectoryForRequest(req);
  if (!directory) {
    res.status(404).json({ error: 'Emergency contact directory not found' });
    return;
  }
  res.json({ directory });
});

enhancementsRouter.put('/enhancements/emergency-contacts', requireAuth, (req: AuthenticatedRequest, res) => {
  const now = new Date().toISOString();
  const body = req.body as Partial<EmergencyContactDirectory>;

  if (req.authUser!.role === 'PATIENT') {
    const info = db
      .prepare(
        `UPDATE patient_profiles
         SET emergency_contact_name = ?,
             emergency_contact_relation = ?,
             emergency_contact_phone = ?
         WHERE user_id = ?`,
      )
      .run(
        sanitize(body.patientEmergencyContactName, 120) || null,
        sanitize(body.patientEmergencyContactRelation, 80) || null,
        sanitize(body.patientEmergencyContactPhone, 40) || null,
        req.authUser!.id,
      );
    if (info.changes === 0) {
      res.status(404).json({ error: 'Patient profile not found' });
      return;
    }
    recordEnhancementAudit(req.authUser!.id, 'EMERGENCY_CONTACT', req.authUser!.id, 'PATIENT_EMERGENCY_UPDATED');
    res.json({ directory: resolveEmergencyDirectoryForRequest(req) });
    return;
  }

  const workerId = req.workerId ?? 'WORKER001';
  const current = resolveEmergencyDirectoryForRequest(req);
  if (!current) {
    res.status(404).json({ error: 'Worker profile not found' });
    return;
  }

  db.prepare(`
    INSERT INTO emergency_contacts (
      worker_id, worker_phone, backup_phone, phc_name, phc_phone,
      ambulance_number, supervisor_name, supervisor_phone, district_helpline,
      emergency_instructions, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(worker_id) DO UPDATE SET
      worker_phone = excluded.worker_phone,
      backup_phone = excluded.backup_phone,
      phc_name = excluded.phc_name,
      phc_phone = excluded.phc_phone,
      ambulance_number = excluded.ambulance_number,
      supervisor_name = excluded.supervisor_name,
      supervisor_phone = excluded.supervisor_phone,
      district_helpline = excluded.district_helpline,
      emergency_instructions = excluded.emergency_instructions,
      updated_at = excluded.updated_at
  `).run(
    workerId,
    sanitize(body.workerPhone, 40) || current.workerPhone,
    sanitize(body.backupPhone, 40) || current.backupPhone,
    sanitize(body.phcName, 160) || current.phcName,
    sanitize(body.phcPhone, 40) || current.phcPhone,
    sanitize(body.ambulanceNumber, 20) || current.ambulanceNumber,
    sanitize(body.supervisorName, 120) || current.supervisorName,
    sanitize(body.supervisorPhone, 40) || current.supervisorPhone,
    sanitize(body.districtHelpline, 20) || current.districtHelpline,
    sanitize(body.emergencyInstructions, 500) || current.emergencyInstructions,
    now,
  );

  recordEnhancementAudit(req.authUser!.id, 'EMERGENCY_CONTACT', workerId, 'WORKER_EMERGENCY_UPDATED');
  res.json({ directory: resolveEmergencyDirectoryForRequest(req) });
});
