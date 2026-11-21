import crypto from 'node:crypto';
import express from 'express';
import {
  lookupUserById,
  requireAuth,
  requireRole,
  signAuthToken,
  type AuthenticatedRequest,
} from '../auth/authService';
import {
  db,
  generateNextAshaUniqueId,
  generateNextPatientUniqueId,
  hashPasscode,
} from '../db/database';
import { canTransitionConnection } from '../../src/shared/connectivityEngine';
import type {
  AshaPatientConnection,
  AssistanceRequest,
  CareAppointment,
  CareNotification,
  ConnectionStatus,
  ConsentStatus,
  HealthcareMode,
  LanguageCode,
  NewbornCareRecord,
  PatientProfileRecord,
  PregnancyCareRecord,
  VaccinationCareRecord,
  VaccinationStatus,
} from '../../src/shared/types';
import { SUPPORTED_LANGUAGES } from '../../src/shared/languages';

export const connectivityRouter = express.Router();

const ALLOWED_MODES: HealthcareMode[] = ['PREGNANCY', 'NEWBORN_CARE', 'VACCINATION'];

function sanitize(input: string | null | undefined, maxLen = 1000): string {
  if (!input) return '';
  return input
    .replace(/<\s*\/?\s*(?:script|iframe|object|embed|style)[^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

function recordConnectivityAudit(
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

function createNotification(params: {
  recipientUserId: string | null | undefined;
  senderName: string;
  notificationType: CareNotification['notificationType'];
  title: string;
  message: string;
  relatedId?: string | null;
}): void {
  if (!params.recipientUserId) return;
  db.prepare(
    `INSERT INTO care_notifications (id, recipient_user_id, sender_name, notification_type, title, message, related_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    `notif-${crypto.randomUUID()}`,
    params.recipientUserId,
    sanitize(params.senderName, 120),
    params.notificationType,
    sanitize(params.title, 180),
    sanitize(params.message, 600),
    params.relatedId ?? null,
    new Date().toISOString(),
  );
}

function getWorkerProfile(workerId: string): {
  workerId: string;
  userId: string;
  ashaUniqueId: string;
  fullName: string;
  assignedArea: string;
} | null {
  const row = db
    .prepare(
      `SELECT w.id as workerId, w.user_id as userId, COALESCE(w.asha_unique_id, w.worker_code) as ashaUniqueId,
              u.full_name as fullName, w.assigned_area as assignedArea
       FROM workers w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = ?`,
    )
    .get(workerId) as
    | {
        workerId: string;
        userId: string;
        ashaUniqueId: string;
        fullName: string;
        assignedArea: string;
      }
    | undefined;
  return row ?? null;
}

function mapConnectionRow(row: {
  id: string;
  asha_worker_id: string;
  asha_unique_id: string;
  asha_worker_name: string;
  asha_assigned_area: string;
  patient_id: string;
  patient_unique_id: string;
  patient_name: string;
  patient_locality: string | null;
  patient_age: number | null;
  patient_phone: string | null;
  assigned_mode: HealthcareMode;
  consent_status: ConsentStatus;
  initiated_by: 'ASHA_WORKER' | 'PATIENT';
  status: ConnectionStatus;
  notes: string | null;
  requested_at: string;
  responded_at: string | null;
}): AshaPatientConnection {
  return {
    id: row.id,
    ashaWorkerId: row.asha_worker_id,
    ashaUniqueId: row.asha_unique_id,
    ashaWorkerName: row.asha_worker_name,
    ashaAssignedArea: row.asha_assigned_area,
    patientId: row.patient_id,
    patientUniqueId: row.patient_unique_id,
    patientName: row.patient_name,
    patientLocality: row.patient_locality,
    patientAge: row.patient_age,
    patientPhone: row.patient_phone,
    assignedMode: row.assigned_mode,
    consentStatus: row.consent_status,
    initiatedBy: row.initiated_by,
    status: row.status,
    notes: row.notes,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
  };
}

function queryConnectionsForWorker(workerId: string): AshaPatientConnection[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.full_name as asha_worker_name, w.assigned_area as asha_assigned_area,
              p.full_name as patient_name, p.locality as patient_locality, p.age as patient_age,
              p.phone as patient_phone, p.consent_status as consent_status
       FROM asha_patient_connections c
       JOIN workers w ON c.asha_worker_id = w.id
       JOIN users u ON w.user_id = u.id
       JOIN patient_profiles p ON c.patient_id = p.id
       WHERE c.asha_worker_id = ?
       ORDER BY c.requested_at DESC`,
    )
    .all(workerId) as Parameters<typeof mapConnectionRow>[0][];
  return rows.map(mapConnectionRow);
}

function queryConnectionsForPatient(patientId: string): AshaPatientConnection[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.full_name as asha_worker_name, w.assigned_area as asha_assigned_area,
              p.full_name as patient_name, p.locality as patient_locality, p.age as patient_age,
              p.phone as patient_phone, p.consent_status as consent_status
       FROM asha_patient_connections c
       JOIN workers w ON c.asha_worker_id = w.id
       JOIN users u ON w.user_id = u.id
       JOIN patient_profiles p ON c.patient_id = p.id
       WHERE c.patient_id = ?
       ORDER BY c.requested_at DESC`,
    )
    .all(patientId) as Parameters<typeof mapConnectionRow>[0][];
  return rows.map(mapConnectionRow);
}

function mapPatientRow(row: {
  id: string;
  patient_unique_id: string;
  user_id: string | null;
  beneficiary_id: string | null;
  full_name: string;
  age: number | null;
  phone: string | null;
  locality: string | null;
  assigned_mode: HealthcareMode;
  consent_status: ConsentStatus;
  consent_updated_at: string | null;
  created_at: string;
}): PatientProfileRecord {
  return {
    id: row.id,
    patientUniqueId: row.patient_unique_id,
    userId: row.user_id,
    beneficiaryId: row.beneficiary_id,
    fullName: row.full_name,
    age: row.age,
    phone: row.phone,
    locality: row.locality,
    assignedMode: row.assigned_mode,
    consentStatus: row.consent_status,
    consentUpdatedAt: row.consent_updated_at,
    createdAt: row.created_at,
  };
}

function verifyWorkerConnectedToPatient(
  workerId: string,
  patientId: string,
  userRole: string,
): { ok: true; consentGranted: boolean } | { ok: false; status: number; error: string } {
  const patient = db
    .prepare(`SELECT id, consent_status FROM patient_profiles WHERE id = ?`)
    .get(patientId) as { id: string; consent_status: ConsentStatus } | undefined;
  if (!patient) {
    return { ok: false, status: 404, error: 'Patient profile not found' };
  }

  if (userRole === 'SUPERVISOR' || userRole === 'ADMIN') {
    return { ok: true, consentGranted: patient.consent_status === 'GRANTED' };
  }

  const conn = db
    .prepare(
      `SELECT status FROM asha_patient_connections WHERE asha_worker_id = ? AND patient_id = ?`,
    )
    .get(workerId, patientId) as { status: ConnectionStatus } | undefined;

  if (!conn || conn.status !== 'CONNECTED') {
    return {
      ok: false,
      status: 403,
      error: 'An approved connection with this patient is required before accessing or modifying records.',
    };
  }

  return { ok: true, consentGranted: patient.consent_status === 'GRANTED' };
}

function mapPregnancyRow(row: {
  id: string;
  patient_id: string;
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
  updated_at: string;
}): PregnancyCareRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    ashaWorkerId: row.asha_worker_id,
    pregnancyStage: row.pregnancy_stage,
    gestationalWeeks: row.gestational_weeks,
    expectedDeliveryDate: row.expected_delivery_date,
    bloodPressure: row.blood_pressure,
    weightKg: row.weight_kg,
    hemoglobinGDl: row.hemoglobin_g_dl,
    ancVisitsCompleted: row.anc_visits_completed,
    ifaTabletsStatus: row.ifa_tablets_status,
    riskLevel: row.risk_level,
    visitNotes: row.visit_notes,
    lastCheckupDate: row.last_checkup_date,
    nextCheckupDate: row.next_checkup_date,
    updatedAt: row.updated_at,
  };
}

function mapNewbornRow(row: {
  id: string;
  patient_id: string;
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
  updated_at: string;
}): NewbornCareRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    ashaWorkerId: row.asha_worker_id,
    babyName: row.baby_name,
    motherName: row.mother_name,
    birthDate: row.birth_date,
    birthWeightKg: row.birth_weight_kg,
    currentWeightKg: row.current_weight_kg,
    lengthCm: row.length_cm,
    temperature: row.temperature,
    feedingStatus: row.feeding_status,
    hbncVisitsCompleted: row.hbnc_visits_completed,
    healthNotes: row.health_notes,
    nextCheckupDate: row.next_checkup_date,
    updatedAt: row.updated_at,
  };
}

function mapVaccinationRow(row: {
  id: string;
  patient_id: string;
  asha_worker_id: string;
  vaccine_name: string;
  dose_label: string;
  due_date: string;
  administered_date: string | null;
  status: VaccinationStatus;
  notes: string | null;
  reminder_sent_at: string | null;
  updated_at: string;
}): VaccinationCareRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    ashaWorkerId: row.asha_worker_id,
    vaccineName: row.vaccine_name,
    doseLabel: row.dose_label,
    dueDate: row.due_date,
    administeredDate: row.administered_date,
    status: row.status,
    notes: row.notes,
    reminderSentAt: row.reminder_sent_at,
    updatedAt: row.updated_at,
  };
}

function mapAppointmentRow(row: {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_unique_id?: string;
  asha_worker_id: string;
  asha_worker_name?: string;
  healthcare_mode: HealthcareMode;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  location: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  reminder_sent: number;
  notes: string | null;
  created_at: string;
}): CareAppointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientUniqueId: row.patient_unique_id,
    ashaWorkerId: row.asha_worker_id,
    ashaWorkerName: row.asha_worker_name,
    healthcareMode: row.healthcare_mode,
    title: row.title,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    location: row.location,
    status: row.status,
    reminderSent: row.reminder_sent === 1,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function queryNotificationsForUser(userId: string): CareNotification[] {
  const rows = db
    .prepare(
      `SELECT id, recipient_user_id as recipientUserId, sender_name as senderName,
              notification_type as notificationType, title, message, related_id as relatedId,
              is_read as isRead, created_at as createdAt
       FROM care_notifications
       WHERE recipient_user_id = ?
       ORDER BY created_at DESC
       LIMIT 40`,
    )
    .all(userId) as Array<Omit<CareNotification, 'isRead'> & { isRead: number }>;
  return rows.map((r) => ({ ...r, isRead: r.isRead === 1 }));
}

function queryAssistanceRequests(filter: { workerId?: string; patientId?: string }): AssistanceRequest[] {
  const whereClause = filter.workerId
    ? 'WHERE ar.asha_worker_id = ?'
    : filter.patientId
      ? 'WHERE ar.patient_id = ?'
      : '';
  const arg = filter.workerId ?? filter.patientId;
  const rows = db
    .prepare(
      `SELECT ar.id, ar.connection_id as connectionId, ar.patient_id as patientId,
              p.patient_unique_id as patientUniqueId, p.full_name as patientName,
              ar.asha_worker_id as ashaWorkerId, COALESCE(w.asha_unique_id, w.worker_code) as ashaUniqueId,
              u.full_name as ashaWorkerName, ar.healthcare_mode as healthcareMode,
              ar.subject, ar.message, ar.urgency, ar.status, ar.asha_response as ashaResponse,
              ar.responded_at as respondedAt, ar.created_at as createdAt
       FROM assistance_requests ar
       JOIN patient_profiles p ON ar.patient_id = p.id
       JOIN workers w ON ar.asha_worker_id = w.id
       JOIN users u ON w.user_id = u.id
       ${whereClause}
       ORDER BY ar.created_at DESC`,
    )
    .all(...(arg ? [arg] : [])) as AssistanceRequest[];
  return rows;
}

/**
 * Public Registration Endpoint for ASHA Workers & Patients
 * Automatically generates permanent unique ASHA-2026-XXXX or PAT-2026-XXXX IDs
 */
connectivityRouter.post('/auth/register', (req, res) => {
  const {
    fullName,
    username,
    passcode,
    role,
    assignedArea,
    preferredLanguage,
    assignedMode,
    age,
    phone,
    locality,
    consentGranted,
  } = req.body as {
    fullName?: string;
    username?: string;
    passcode?: string;
    role?: 'ASHA_WORKER' | 'PATIENT';
    assignedArea?: string;
    preferredLanguage?: LanguageCode;
    assignedMode?: HealthcareMode;
    age?: number | null;
    phone?: string;
    locality?: string;
    consentGranted?: boolean;
  };

  const cleanName = sanitize(fullName, 100);
  const cleanUsername = sanitize(username, 60).toLowerCase();
  if (!cleanName || !cleanUsername || !passcode || passcode.length < 4) {
    res.status(400).json({
      error: 'Full name, username, and a passcode (minimum 4 characters) are required.',
    });
    return;
  }

  const targetRole = role === 'PATIENT' ? 'PATIENT' : 'ASHA_WORKER';
  const lang =
    preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === preferredLanguage)
      ? preferredLanguage
      : 'en';

  const existingUser = db
    .prepare(`SELECT id FROM users WHERE username = ?`)
    .get(cleanUsername) as { id: string } | undefined;
  if (existingUser) {
    res.status(409).json({ error: 'Username already registered. Please sign in or choose another username.' });
    return;
  }

  const userId = `user-${crypto.randomUUID()}`;
  const passHash = hashPasscode(passcode);
  const now = new Date().toISOString();

  let generatedUniqueId = '';
  let workerId: string | undefined;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', NULL, ?)`,
    ).run(userId, cleanName, cleanUsername, passHash, targetRole, lang, now);

    db.prepare(
      `INSERT OR IGNORE INTO user_settings (user_id, preferred_language, voice_speed, high_contrast, large_text, offline_auto_sync, notifications_enabled, updated_at)
       VALUES (?, ?, 1.0, 0, 0, 1, 1, ?)`,
    ).run(userId, lang, now);

    if (targetRole === 'ASHA_WORKER') {
      workerId = `WRK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      generatedUniqueId = generateNextAshaUniqueId();
      const area = sanitize(assignedArea, 120) || 'Devanahalli Block';
      db.prepare(
        `INSERT INTO workers (id, user_id, worker_code, asha_unique_id, assigned_area, supervisor_id)
         VALUES (?, ?, ?, ?, ?, 'user-sup-01')`,
      ).run(workerId, userId, generatedUniqueId, generatedUniqueId, area);
      recordConnectivityAudit(userId, 'WORKER', workerId, `REGISTER_ASHA_${generatedUniqueId}`);
    } else {
      const mode: HealthcareMode = ALLOWED_MODES.includes(assignedMode as HealthcareMode)
        ? (assignedMode as HealthcareMode)
        : 'PREGNANCY';
      const patientId = `pat-${crypto.randomUUID().slice(0, 8)}`;
      generatedUniqueId = generateNextPatientUniqueId();
      const consent: ConsentStatus = consentGranted === false ? 'PENDING' : 'GRANTED';

      const hhId = `hh-${crypto.randomUUID().slice(0, 8)}`;
      const benId = `ben-${crypto.randomUUID().slice(0, 8)}`;
      const benCode = generatedUniqueId;
      const cleanLocality = sanitize(locality, 100) || 'Devanahalli Block';
      const benType =
        mode === 'PREGNANCY' ? 'PREGNANT_WOMAN' : mode === 'NEWBORN_CARE' ? 'NEWBORN' : 'CHILD';

      db.prepare(
        `INSERT INTO households (id, household_code, locality, synthetic_address, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(hhId, `HH-${generatedUniqueId.slice(-4)}`, cleanLocality, `Registered Home · ${cleanLocality}`, now);

      db.prepare(
        `INSERT INTO beneficiaries (id, beneficiary_code, household_id, display_name, beneficiary_type, date_of_birth, mother_beneficiary_code, synthetic_data_flag, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, ?)`,
      ).run(benId, benCode, hhId, cleanName, benType, now);

      db.prepare(
        `INSERT INTO patient_profiles (id, patient_unique_id, user_id, beneficiary_id, full_name, age, phone, locality, assigned_mode, consent_status, consent_updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        patientId,
        generatedUniqueId,
        userId,
        benId,
        cleanName,
        typeof age === 'number' && Number.isFinite(age) ? age : null,
        sanitize(phone, 30) || null,
        cleanLocality,
        mode,
        consent,
        now,
        now,
      );
      recordConnectivityAudit(userId, 'PATIENT', patientId, `REGISTER_PATIENT_${generatedUniqueId}`);
    }
  });

  tx();

  const createdUser = lookupUserById(userId)!;
  const token = signAuthToken({
    sub: createdUser.id,
    role: createdUser.role,
    workerId: createdUser.workerId,
  });

  res.status(201).json({
    user: createdUser,
    token,
    uniqueId: generatedUniqueId,
  });
});

/**
 * ASHA Worker Connectivity & Healthcare Modes Summary Dashboard
 */
connectivityRouter.get(
  '/connectivity/asha/dashboard',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const worker = getWorkerProfile(workerId) ?? getWorkerProfile('WORKER001');
    if (!worker) {
      res.status(404).json({ error: 'ASHA worker profile not found' });
      return;
    }

    const allConnections = queryConnectionsForWorker(worker.workerId);
    const connectedPatients = allConnections.filter((c) => c.status === 'CONNECTED');
    const pendingRequests = allConnections.filter((c) => c.status === 'PENDING');

    const modeCounts = {
      PREGNANCY: connectedPatients.filter((p) => p.assignedMode === 'PREGNANCY').length,
      NEWBORN_CARE: connectedPatients.filter((p) => p.assignedMode === 'NEWBORN_CARE').length,
      VACCINATION: connectedPatients.filter((p) => p.assignedMode === 'VACCINATION').length,
    };

    const upcomingCheckupsCount = (
      db
        .prepare(
          `SELECT COUNT(*) as cnt FROM care_appointments WHERE asha_worker_id = ? AND status = 'SCHEDULED'`,
        )
        .get(worker.workerId) as { cnt: number }
    ).cnt;

    const assistanceRequests = queryAssistanceRequests({ workerId: worker.workerId });
    const notifications = queryNotificationsForUser(req.authUser!.id);

    res.json({
      worker: {
        workerId: worker.workerId,
        ashaUniqueId: worker.ashaUniqueId,
        fullName: worker.fullName,
        assignedArea: worker.assignedArea,
      },
      modeCounts,
      upcomingCheckupsCount,
      connectedPatients,
      pendingRequests,
      allConnections,
      assistanceRequests,
      notifications,
      unreadNotificationsCount: notifications.filter((n) => !n.isRead).length,
    });
  },
);

/**
 * ASHA Worker Registers & Connects a New Patient Directly (in any Healthcare Mode)
 */
connectivityRouter.post(
  '/connectivity/asha/register-patient',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const worker = getWorkerProfile(workerId);
    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const {
      fullName,
      username,
      passcode,
      age,
      phone,
      locality,
      assignedMode,
      consentGranted,
      pregnancyStage,
      gestationalWeeks,
      expectedDeliveryDate,
      babyName,
      motherName,
      birthDate,
      birthWeightKg,
      initialVaccineName,
      initialVaccineDueDate,
    } = req.body as {
      fullName?: string;
      username?: string;
      passcode?: string;
      age?: number | null;
      phone?: string;
      locality?: string;
      assignedMode?: HealthcareMode;
      consentGranted?: boolean;
      pregnancyStage?: string;
      gestationalWeeks?: number | null;
      expectedDeliveryDate?: string | null;
      babyName?: string;
      motherName?: string;
      birthDate?: string;
      birthWeightKg?: number | null;
      initialVaccineName?: string;
      initialVaccineDueDate?: string;
    };

    const cleanName = sanitize(fullName, 100);
    if (!cleanName) {
      res.status(400).json({ error: 'Patient full name is required.' });
      return;
    }

    const mode: HealthcareMode = ALLOWED_MODES.includes(assignedMode as HealthcareMode)
      ? (assignedMode as HealthcareMode)
      : 'PREGNANCY';

    const cleanUsername = sanitize(username, 50).toLowerCase() ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'patient'}${crypto.randomInt(100, 999)}`;

    const existingUser = db
      .prepare(`SELECT id FROM users WHERE username = ?`)
      .get(cleanUsername) as { id: string } | undefined;
    if (existingUser) {
      res.status(409).json({ error: `Username '${cleanUsername}' is already registered.` });
      return;
    }

    const now = new Date().toISOString();
    const todayIso = now.slice(0, 10);
    const patientUserId = `user-${crypto.randomUUID()}`;
    const patientId = `pat-${crypto.randomUUID().slice(0, 8)}`;
    const patientUniqueId = generateNextPatientUniqueId();
    const passHash = hashPasscode(passcode && passcode.length >= 4 ? passcode : 'asha-demo-2026');
    const consent: ConsentStatus = consentGranted === false ? 'PENDING' : 'GRANTED';
    const cleanLocality = sanitize(locality, 100) || worker.assignedArea;

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at)
         VALUES (?, ?, ?, ?, 'PATIENT', 'en', 'ACTIVE', NULL, ?)`,
      ).run(patientUserId, cleanName, cleanUsername, passHash, now);

      db.prepare(
        `INSERT OR IGNORE INTO user_settings (user_id, preferred_language, voice_speed, high_contrast, large_text, offline_auto_sync, notifications_enabled, updated_at)
         VALUES (?, 'en', 1.0, 0, 0, 1, 1, ?)`,
      ).run(patientUserId, now);

      const hhId = `hh-${crypto.randomUUID().slice(0, 8)}`;
      const benId = `ben-${crypto.randomUUID().slice(0, 8)}`;
      const benType =
        mode === 'PREGNANCY' ? 'PREGNANT_WOMAN' : mode === 'NEWBORN_CARE' ? 'NEWBORN' : 'CHILD';

      db.prepare(
        `INSERT INTO households (id, household_code, locality, synthetic_address, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(hhId, `HH-${patientUniqueId.slice(-4)}`, cleanLocality, `Registered · ${cleanLocality}`, now);

      db.prepare(
        `INSERT INTO beneficiaries (id, beneficiary_code, household_id, display_name, beneficiary_type, date_of_birth, mother_beneficiary_code, synthetic_data_flag, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?)`,
      ).run(benId, patientUniqueId, hhId, cleanName, benType, birthDate || null, now);

      db.prepare(
        `INSERT INTO patient_profiles (id, patient_unique_id, user_id, beneficiary_id, full_name, age, phone, locality, assigned_mode, consent_status, consent_updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        patientId,
        patientUniqueId,
        patientUserId,
        benId,
        cleanName,
        typeof age === 'number' && Number.isFinite(age) ? age : null,
        sanitize(phone, 30) || null,
        cleanLocality,
        mode,
        consent,
        now,
        now,
      );

      db.prepare(
        `INSERT INTO asha_patient_connections (id, asha_worker_id, asha_unique_id, patient_id, patient_unique_id, assigned_mode, initiated_by, status, notes, requested_at, responded_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ASHA_WORKER', 'CONNECTED', 'Registered and connected by ASHA worker', ?, ?)`,
      ).run(`conn-${crypto.randomUUID().slice(0, 8)}`, worker.workerId, worker.ashaUniqueId, patientId, patientUniqueId, mode, now, now);

      if (mode === 'PREGNANCY') {
        db.prepare(
          `INSERT INTO care_pregnancy_records (id, patient_id, asha_worker_id, pregnancy_stage, gestational_weeks, expected_delivery_date, anc_visits_completed, risk_level, last_checkup_date, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'NORMAL', ?, ?)`,
        ).run(
          `cpreg-${crypto.randomUUID().slice(0, 8)}`,
          patientId,
          worker.workerId,
          sanitize(pregnancyStage, 60) || 'First Trimester',
          typeof gestationalWeeks === 'number' ? gestationalWeeks : 12,
          expectedDeliveryDate || null,
          todayIso,
          now,
        );
      } else if (mode === 'NEWBORN_CARE') {
        db.prepare(
          `INSERT INTO care_newborn_records (id, patient_id, asha_worker_id, baby_name, mother_name, birth_date, birth_weight_kg, current_weight_kg, feeding_status, hbnc_visits_completed, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Exclusive breastfeeding', 0, ?)`,
        ).run(
          `cnb-${crypto.randomUUID().slice(0, 8)}`,
          patientId,
          worker.workerId,
          sanitize(babyName, 100) || cleanName,
          sanitize(motherName, 100) || 'Mother',
          birthDate || todayIso,
          typeof birthWeightKg === 'number' ? birthWeightKg : 2.8,
          typeof birthWeightKg === 'number' ? birthWeightKg : 2.8,
          now,
        );
      } else if (mode === 'VACCINATION') {
        db.prepare(
          `INSERT INTO care_vaccination_records (id, patient_id, asha_worker_id, vaccine_name, dose_label, due_date, administered_date, status, notes, updated_at)
           VALUES (?, ?, ?, ?, 'Scheduled Dose', ?, NULL, 'PENDING', 'Registered in Vaccination Mode', ?)`,
        ).run(
          `cvacc-${crypto.randomUUID().slice(0, 8)}`,
          patientId,
          worker.workerId,
          sanitize(initialVaccineName, 120) || 'OPV-1 & Pentavalent-1',
          initialVaccineDueDate || todayIso,
          now,
        );
      }

      createNotification({
        recipientUserId: patientUserId,
        senderName: `${worker.fullName} (${worker.ashaUniqueId})`,
        notificationType: 'CONNECTION_APPROVED',
        title: 'Connected with your ASHA Worker',
        message: `You have been registered under ${mode.replace('_', ' ')} Mode with Patient ID ${patientUniqueId}.`,
        relatedId: patientId,
      });

      recordConnectivityAudit(
        req.authUser!.id,
        'PATIENT',
        patientId,
        `ASHA_REGISTER_CONNECT_${patientUniqueId}`,
      );
    });

    tx();

    const patientRow = db
      .prepare(`SELECT * FROM patient_profiles WHERE id = ?`)
      .get(patientId) as Parameters<typeof mapPatientRow>[0];

    res.status(201).json({
      patient: mapPatientRow(patientRow),
      username: cleanUsername,
      patientUniqueId,
    });
  },
);

/**
 * Pregnancy Mode Endpoint
 */
connectivityRouter.get(
  '/connectivity/modes/pregnancy',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const isSup = req.authUser!.role === 'SUPERVISOR' || req.authUser!.role === 'ADMIN';

    const rows = db
      .prepare(
        `SELECT p.*, c.status as connection_status
         FROM patient_profiles p
         JOIN asha_patient_connections c ON c.patient_id = p.id
         WHERE ${isSup ? '1=1' : 'c.asha_worker_id = ?'}
           AND c.status = 'CONNECTED'
           AND p.assigned_mode = 'PREGNANCY'
         ORDER BY p.created_at DESC`,
      )
      .all(...(isSup ? [] : [workerId])) as Array<
      Parameters<typeof mapPatientRow>[0] & { connection_status: ConnectionStatus }
    >;

    const items = rows.map((r) => {
      const patient = mapPatientRow(r);
      const consentGranted = patient.consentStatus === 'GRANTED';
      const pregRow = db
        .prepare(`SELECT * FROM care_pregnancy_records WHERE patient_id = ?`)
        .get(patient.id) as Parameters<typeof mapPregnancyRow>[0] | undefined;

      const appts = db
        .prepare(
          `SELECT a.*, u.full_name as asha_worker_name
           FROM care_appointments a
           JOIN workers w ON a.asha_worker_id = w.id
           JOIN users u ON w.user_id = u.id
           WHERE a.patient_id = ? AND a.healthcare_mode = 'PREGNANCY'
           ORDER BY a.scheduled_date ASC`,
        )
        .all(patient.id) as Parameters<typeof mapAppointmentRow>[0][];

      return {
        patient,
        connectionStatus: r.connection_status,
        consentGranted,
        record: pregRow
          ? consentGranted
            ? mapPregnancyRow(pregRow)
            : {
                ...mapPregnancyRow(pregRow),
                bloodPressure: null,
                weightKg: null,
                hemoglobinGDl: null,
                visitNotes: 'Patient consent required to view detailed clinical notes.',
              }
          : null,
        appointments: appts.map(mapAppointmentRow),
      };
    });

    res.json({ patients: items });
  },
);

connectivityRouter.post(
  '/connectivity/modes/pregnancy/:patientId/record',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { patientId } = req.params;
    const access = verifyWorkerConnectedToPatient(workerId, patientId, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const {
      pregnancyStage,
      gestationalWeeks,
      expectedDeliveryDate,
      bloodPressure,
      weightKg,
      hemoglobinGDl,
      ancVisitsCompleted,
      ifaTabletsStatus,
      riskLevel,
      visitNotes,
      lastCheckupDate,
      nextCheckupDate,
      sendReminder,
    } = req.body as Partial<PregnancyCareRecord> & { sendReminder?: boolean };

    const now = new Date().toISOString();
    const existing = db
      .prepare(`SELECT * FROM care_pregnancy_records WHERE patient_id = ?`)
      .get(patientId) as Parameters<typeof mapPregnancyRow>[0] | undefined;

    const cleanStage = sanitize(pregnancyStage, 60) || existing?.pregnancy_stage || 'Second Trimester';
    const cleanBp = bloodPressure !== undefined ? sanitize(bloodPressure, 30) || null : existing?.blood_pressure ?? null;
    const cleanIfa = ifaTabletsStatus !== undefined ? sanitize(ifaTabletsStatus, 80) || null : existing?.ifa_tablets_status ?? null;
    const cleanNotes = visitNotes !== undefined ? sanitize(visitNotes, 1000) || null : existing?.visit_notes ?? null;
    const resolvedRisk =
      riskLevel === 'HIGH_RISK' || riskLevel === 'MONITOR' || riskLevel === 'NORMAL'
        ? riskLevel
        : existing?.risk_level ?? 'NORMAL';

    if (existing) {
      db.prepare(
        `UPDATE care_pregnancy_records
         SET pregnancy_stage = ?, gestational_weeks = ?, expected_delivery_date = ?, blood_pressure = ?,
             weight_kg = ?, hemoglobin_g_dl = ?, anc_visits_completed = ?, ifa_tablets_status = ?,
             risk_level = ?, visit_notes = ?, last_checkup_date = ?, next_checkup_date = ?, updated_at = ?
         WHERE patient_id = ?`,
      ).run(
        cleanStage,
        gestationalWeeks ?? existing.gestational_weeks,
        expectedDeliveryDate !== undefined ? expectedDeliveryDate : existing.expected_delivery_date,
        cleanBp,
        weightKg ?? existing.weight_kg,
        hemoglobinGDl ?? existing.hemoglobin_g_dl,
        ancVisitsCompleted ?? existing.anc_visits_completed,
        cleanIfa,
        resolvedRisk,
        cleanNotes,
        lastCheckupDate ?? now.slice(0, 10),
        nextCheckupDate !== undefined ? nextCheckupDate : existing.next_checkup_date,
        now,
        patientId,
      );
    } else {
      db.prepare(
        `INSERT INTO care_pregnancy_records (id, patient_id, asha_worker_id, pregnancy_stage, gestational_weeks, expected_delivery_date, blood_pressure, weight_kg, hemoglobin_g_dl, anc_visits_completed, ifa_tablets_status, risk_level, visit_notes, last_checkup_date, next_checkup_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `cpreg-${crypto.randomUUID().slice(0, 8)}`,
        patientId,
        workerId,
        cleanStage,
        gestationalWeeks ?? null,
        expectedDeliveryDate ?? null,
        cleanBp,
        weightKg ?? null,
        hemoglobinGDl ?? null,
        ancVisitsCompleted ?? 1,
        cleanIfa,
        resolvedRisk,
        cleanNotes,
        lastCheckupDate ?? now.slice(0, 10),
        nextCheckupDate ?? null,
        now,
      );
    }

    if (sendReminder || nextCheckupDate) {
      const pat = db
        .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
        .get(patientId) as { user_id: string | null } | undefined;
      const worker = getWorkerProfile(workerId);
      createNotification({
        recipientUserId: pat?.user_id,
        senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
        notificationType: 'ANC_REMINDER',
        title: 'Pregnancy Record Updated',
        message: nextCheckupDate
          ? `Your antenatal visit record was updated. Next checkup scheduled for ${nextCheckupDate}.`
          : 'Your antenatal visit record has been updated by your ASHA worker.',
        relatedId: patientId,
      });
    }

    recordConnectivityAudit(req.authUser!.id, 'PREGNANCY_RECORD', patientId, 'UPDATE_PREGNANCY_RECORD');
    const updated = db
      .prepare(`SELECT * FROM care_pregnancy_records WHERE patient_id = ?`)
      .get(patientId) as Parameters<typeof mapPregnancyRow>[0];
    res.json({ record: mapPregnancyRow(updated) });
  },
);

connectivityRouter.post(
  '/connectivity/modes/pregnancy/:patientId/appointments',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { patientId } = req.params;
    const access = verifyWorkerConnectedToPatient(workerId, patientId, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { title, scheduledDate, scheduledTime, location, notes, sendReminder, healthcareMode } =
      req.body as {
        title?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        location?: string;
        notes?: string;
        sendReminder?: boolean;
        healthcareMode?: HealthcareMode;
      };

    const cleanTitle = sanitize(title, 140);
    if (!cleanTitle || !scheduledDate) {
      res.status(400).json({ error: 'Appointment title and scheduled date are required.' });
      return;
    }

    const mode: HealthcareMode = ALLOWED_MODES.includes(healthcareMode as HealthcareMode)
      ? (healthcareMode as HealthcareMode)
      : 'PREGNANCY';

    const id = `appt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const reminderFlag = sendReminder === false ? 0 : 1;

    db.prepare(
      `INSERT INTO care_appointments (id, patient_id, asha_worker_id, healthcare_mode, title, scheduled_date, scheduled_time, location, status, reminder_sent, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?)`,
    ).run(
      id,
      patientId,
      workerId,
      mode,
      cleanTitle,
      sanitize(scheduledDate, 20),
      sanitize(scheduledTime, 30) || '10:00 AM',
      sanitize(location, 120) || 'Devanahalli PHC',
      reminderFlag,
      sanitize(notes, 400) || null,
      now,
    );

    if (mode === 'PREGNANCY') {
      db.prepare(`UPDATE care_pregnancy_records SET next_checkup_date = ?, updated_at = ? WHERE patient_id = ?`).run(
        sanitize(scheduledDate, 20),
        now,
        patientId,
      );
    } else if (mode === 'NEWBORN_CARE') {
      db.prepare(`UPDATE care_newborn_records SET next_checkup_date = ?, updated_at = ? WHERE patient_id = ?`).run(
        sanitize(scheduledDate, 20),
        now,
        patientId,
      );
    }

    const pat = db
      .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
      .get(patientId) as { user_id: string | null } | undefined;
    const worker = getWorkerProfile(workerId);
    if (reminderFlag === 1) {
      createNotification({
        recipientUserId: pat?.user_id,
        senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
        notificationType:
          mode === 'PREGNANCY'
            ? 'ANC_REMINDER'
            : mode === 'NEWBORN_CARE'
              ? 'NEWBORN_REMINDER'
              : 'VACCINATION_REMINDER',
        title: `Checkup Reminder: ${cleanTitle}`,
        message: `Scheduled on ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ''} (${sanitize(location, 120) || 'PHC / Home Visit'}).`,
        relatedId: id,
      });
    }

    const created = db
      .prepare(
        `SELECT a.*, u.full_name as asha_worker_name
         FROM care_appointments a
         JOIN workers w ON a.asha_worker_id = w.id
         JOIN users u ON w.user_id = u.id
         WHERE a.id = ?`,
      )
      .get(id) as Parameters<typeof mapAppointmentRow>[0];

    res.status(201).json({ appointment: mapAppointmentRow(created) });
  },
);

/**
 * Newborn Care Mode Endpoint
 */
connectivityRouter.get(
  '/connectivity/modes/newborn',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const isSup = req.authUser!.role === 'SUPERVISOR' || req.authUser!.role === 'ADMIN';

    const rows = db
      .prepare(
        `SELECT p.*, c.status as connection_status
         FROM patient_profiles p
         JOIN asha_patient_connections c ON c.patient_id = p.id
         WHERE ${isSup ? '1=1' : 'c.asha_worker_id = ?'}
           AND c.status = 'CONNECTED'
           AND p.assigned_mode = 'NEWBORN_CARE'
         ORDER BY p.created_at DESC`,
      )
      .all(...(isSup ? [] : [workerId])) as Array<
      Parameters<typeof mapPatientRow>[0] & { connection_status: ConnectionStatus }
    >;

    const items = rows.map((r) => {
      const patient = mapPatientRow(r);
      const consentGranted = patient.consentStatus === 'GRANTED';
      const nbRow = db
        .prepare(`SELECT * FROM care_newborn_records WHERE patient_id = ?`)
        .get(patient.id) as Parameters<typeof mapNewbornRow>[0] | undefined;

      const appts = db
        .prepare(
          `SELECT a.*, u.full_name as asha_worker_name
           FROM care_appointments a
           JOIN workers w ON a.asha_worker_id = w.id
           JOIN users u ON w.user_id = u.id
           WHERE a.patient_id = ? AND a.healthcare_mode = 'NEWBORN_CARE'
           ORDER BY a.scheduled_date ASC`,
        )
        .all(patient.id) as Parameters<typeof mapAppointmentRow>[0][];

      return {
        patient,
        connectionStatus: r.connection_status,
        consentGranted,
        record: nbRow
          ? consentGranted
            ? mapNewbornRow(nbRow)
            : {
                ...mapNewbornRow(nbRow),
                healthNotes: 'Patient/guardian consent required to view clinical notes.',
              }
          : null,
        appointments: appts.map(mapAppointmentRow),
      };
    });

    res.json({ patients: items });
  },
);

connectivityRouter.post(
  '/connectivity/modes/newborn/:patientId/record',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { patientId } = req.params;
    const access = verifyWorkerConnectedToPatient(workerId, patientId, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const {
      babyName,
      motherName,
      birthDate,
      birthWeightKg,
      currentWeightKg,
      lengthCm,
      temperature,
      feedingStatus,
      hbncVisitsCompleted,
      healthNotes,
      nextCheckupDate,
      sendReminder,
    } = req.body as Partial<NewbornCareRecord> & { sendReminder?: boolean };

    const now = new Date().toISOString();
    const existing = db
      .prepare(`SELECT * FROM care_newborn_records WHERE patient_id = ?`)
      .get(patientId) as Parameters<typeof mapNewbornRow>[0] | undefined;

    const cleanBabyName = sanitize(babyName, 100) || existing?.baby_name || 'Newborn';
    const cleanMotherName = sanitize(motherName, 100) || existing?.mother_name || 'Mother';
    const cleanFeeding =
      feedingStatus !== undefined ? sanitize(feedingStatus, 140) || null : existing?.feeding_status ?? null;
    const cleanNotes =
      healthNotes !== undefined ? sanitize(healthNotes, 1000) || null : existing?.health_notes ?? null;

    if (existing) {
      db.prepare(
        `UPDATE care_newborn_records
         SET baby_name = ?, mother_name = ?, birth_date = ?, birth_weight_kg = ?, current_weight_kg = ?,
             length_cm = ?, temperature = ?, feeding_status = ?, hbnc_visits_completed = ?, health_notes = ?,
             next_checkup_date = ?, updated_at = ?
         WHERE patient_id = ?`,
      ).run(
        cleanBabyName,
        cleanMotherName,
        birthDate ?? existing.birth_date,
        birthWeightKg ?? existing.birth_weight_kg,
        currentWeightKg ?? existing.current_weight_kg,
        lengthCm ?? existing.length_cm,
        temperature !== undefined ? sanitize(temperature, 30) || null : existing.temperature,
        cleanFeeding,
        hbncVisitsCompleted ?? existing.hbnc_visits_completed,
        cleanNotes,
        nextCheckupDate !== undefined ? nextCheckupDate : existing.next_checkup_date,
        now,
        patientId,
      );
    } else {
      db.prepare(
        `INSERT INTO care_newborn_records (id, patient_id, asha_worker_id, baby_name, mother_name, birth_date, birth_weight_kg, current_weight_kg, length_cm, temperature, feeding_status, hbnc_visits_completed, health_notes, next_checkup_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `cnb-${crypto.randomUUID().slice(0, 8)}`,
        patientId,
        workerId,
        cleanBabyName,
        cleanMotherName,
        birthDate ?? now.slice(0, 10),
        birthWeightKg ?? null,
        currentWeightKg ?? null,
        lengthCm ?? null,
        temperature ? sanitize(temperature, 30) : null,
        cleanFeeding,
        hbncVisitsCompleted ?? 1,
        cleanNotes,
        nextCheckupDate ?? null,
        now,
      );
    }

    if (sendReminder || nextCheckupDate) {
      const pat = db
        .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
        .get(patientId) as { user_id: string | null } | undefined;
      const worker = getWorkerProfile(workerId);
      createNotification({
        recipientUserId: pat?.user_id,
        senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
        notificationType: 'NEWBORN_REMINDER',
        title: 'Newborn Care Checkup Update',
        message: nextCheckupDate
          ? `Newborn growth check updated. Next HBNC visit on ${nextCheckupDate}.`
          : 'Newborn growth and feeding record updated.',
        relatedId: patientId,
      });
    }

    recordConnectivityAudit(req.authUser!.id, 'NEWBORN_RECORD', patientId, 'UPDATE_NEWBORN_RECORD');
    const updated = db
      .prepare(`SELECT * FROM care_newborn_records WHERE patient_id = ?`)
      .get(patientId) as Parameters<typeof mapNewbornRow>[0];
    res.json({ record: mapNewbornRow(updated) });
  },
);

/**
 * Vaccination Mode Endpoint
 */
connectivityRouter.get(
  '/connectivity/modes/vaccination',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const isSup = req.authUser!.role === 'SUPERVISOR' || req.authUser!.role === 'ADMIN';

    // Patients in VACCINATION mode OR NEWBORN_CARE mode are eligible for vaccination tracking
    const rows = db
      .prepare(
        `SELECT p.*, c.status as connection_status
         FROM patient_profiles p
         JOIN asha_patient_connections c ON c.patient_id = p.id
         WHERE ${isSup ? '1=1' : 'c.asha_worker_id = ?'}
           AND c.status = 'CONNECTED'
           AND p.assigned_mode IN ('VACCINATION', 'NEWBORN_CARE')
         ORDER BY CASE WHEN p.assigned_mode = 'VACCINATION' THEN 0 ELSE 1 END, p.created_at DESC`,
      )
      .all(...(isSup ? [] : [workerId])) as Array<
      Parameters<typeof mapPatientRow>[0] & { connection_status: ConnectionStatus }
    >;

    const items = rows.map((r) => {
      const patient = mapPatientRow(r);
      const consentGranted = patient.consentStatus === 'GRANTED';
      const vaccRows = db
        .prepare(`SELECT * FROM care_vaccination_records WHERE patient_id = ? ORDER BY due_date ASC`)
        .all(patient.id) as Parameters<typeof mapVaccinationRow>[0][];

      const appts = db
        .prepare(
          `SELECT a.*, u.full_name as asha_worker_name
           FROM care_appointments a
           JOIN workers w ON a.asha_worker_id = w.id
           JOIN users u ON w.user_id = u.id
           WHERE a.patient_id = ? AND a.healthcare_mode = 'VACCINATION'
           ORDER BY a.scheduled_date ASC`,
        )
        .all(patient.id) as Parameters<typeof mapAppointmentRow>[0][];

      return {
        patient,
        connectionStatus: r.connection_status,
        consentGranted,
        vaccines: vaccRows.map(mapVaccinationRow),
        appointments: appts.map(mapAppointmentRow),
      };
    });

    res.json({ patients: items });
  },
);

connectivityRouter.post(
  '/connectivity/modes/vaccination/:patientId/vaccines',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { patientId } = req.params;
    const access = verifyWorkerConnectedToPatient(workerId, patientId, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { vaccineName, doseLabel, dueDate, administeredDate, status, notes, sendReminder } =
      req.body as {
        vaccineName?: string;
        doseLabel?: string;
        dueDate?: string;
        administeredDate?: string | null;
        status?: VaccinationStatus;
        notes?: string;
        sendReminder?: boolean;
      };

    const cleanVaccine = sanitize(vaccineName, 120);
    if (!cleanVaccine || !dueDate) {
      res.status(400).json({ error: 'Vaccine name and due date are required.' });
      return;
    }

    const validStatuses: VaccinationStatus[] = ['PENDING', 'COMPLETED', 'SCHEDULED', 'OVERDUE'];
    const resolvedStatus: VaccinationStatus = validStatuses.includes(status as VaccinationStatus)
      ? (status as VaccinationStatus)
      : 'SCHEDULED';

    const id = `cvacc-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const reminderSentAt = sendReminder ? now : null;

    db.prepare(
      `INSERT INTO care_vaccination_records (id, patient_id, asha_worker_id, vaccine_name, dose_label, due_date, administered_date, status, notes, reminder_sent_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      patientId,
      workerId,
      cleanVaccine,
      sanitize(doseLabel, 60) || 'Scheduled Dose',
      sanitize(dueDate, 20),
      resolvedStatus === 'COMPLETED' ? administeredDate || now.slice(0, 10) : administeredDate || null,
      resolvedStatus,
      sanitize(notes, 400) || null,
      reminderSentAt,
      now,
    );

    if (sendReminder) {
      const pat = db
        .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
        .get(patientId) as { user_id: string | null } | undefined;
      const worker = getWorkerProfile(workerId);
      createNotification({
        recipientUserId: pat?.user_id,
        senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
        notificationType: 'VACCINATION_REMINDER',
        title: `Vaccination Scheduled: ${cleanVaccine}`,
        message: `${cleanVaccine} (${sanitize(doseLabel, 60) || 'Scheduled Dose'}) is due on ${dueDate}.`,
        relatedId: id,
      });
    }

    const row = db
      .prepare(`SELECT * FROM care_vaccination_records WHERE id = ?`)
      .get(id) as Parameters<typeof mapVaccinationRow>[0];
    res.status(201).json({ vaccine: mapVaccinationRow(row) });
  },
);

connectivityRouter.patch(
  '/connectivity/modes/vaccination/records/:recordId',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { recordId } = req.params;
    const existing = db
      .prepare(`SELECT * FROM care_vaccination_records WHERE id = ?`)
      .get(recordId) as Parameters<typeof mapVaccinationRow>[0] | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Vaccination record not found' });
      return;
    }

    const access = verifyWorkerConnectedToPatient(workerId, existing.patient_id, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { status, administeredDate, notes, sendReminder } = req.body as {
      status?: VaccinationStatus;
      administeredDate?: string | null;
      notes?: string;
      sendReminder?: boolean;
    };

    const validStatuses: VaccinationStatus[] = ['PENDING', 'COMPLETED', 'SCHEDULED', 'OVERDUE'];
    const nextStatus: VaccinationStatus = validStatuses.includes(status as VaccinationStatus)
      ? (status as VaccinationStatus)
      : existing.status;

    const now = new Date().toISOString();
    const nextAdminDate =
      nextStatus === 'COMPLETED'
        ? administeredDate || existing.administered_date || now.slice(0, 10)
        : administeredDate !== undefined
          ? administeredDate
          : existing.administered_date;

    const nextReminderAt = sendReminder ? now : existing.reminder_sent_at;

    db.prepare(
      `UPDATE care_vaccination_records
       SET status = ?, administered_date = ?, notes = ?, reminder_sent_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      nextStatus,
      nextAdminDate,
      notes !== undefined ? sanitize(notes, 400) || null : existing.notes,
      nextReminderAt,
      now,
      recordId,
    );

    if (sendReminder) {
      const pat = db
        .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
        .get(existing.patient_id) as { user_id: string | null } | undefined;
      const worker = getWorkerProfile(workerId);
      createNotification({
        recipientUserId: pat?.user_id,
        senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
        notificationType: 'VACCINATION_REMINDER',
        title: `Vaccination Reminder: ${existing.vaccine_name}`,
        message: `Reminder for ${existing.vaccine_name} (${existing.dose_label}) due on ${existing.due_date}.`,
        relatedId: recordId,
      });
    }

    recordConnectivityAudit(req.authUser!.id, 'VACCINATION_RECORD', recordId, `STATUS_${nextStatus}`);
    const updated = db
      .prepare(`SELECT * FROM care_vaccination_records WHERE id = ?`)
      .get(recordId) as Parameters<typeof mapVaccinationRow>[0];
    res.json({ vaccine: mapVaccinationRow(updated) });
  },
);

/**
 * Two-Way Connection Request & Approval System
 */
connectivityRouter.get('/connectivity/connections', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.authUser!.role === 'PATIENT') {
    if (!req.patientProfileId) {
      res.status(404).json({ error: 'Patient profile not found' });
      return;
    }
    res.json({ connections: queryConnectionsForPatient(req.patientProfileId) });
    return;
  }

  const workerId = req.workerId ?? 'WORKER001';
  res.json({ connections: queryConnectionsForWorker(workerId) });
});

connectivityRouter.post('/connectivity/connections/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const { ashaUniqueId, patientUniqueId, assignedMode, notes } = req.body as {
    ashaUniqueId?: string;
    patientUniqueId?: string;
    assignedMode?: HealthcareMode;
    notes?: string;
  };

  const now = new Date().toISOString();
  const cleanNotes = sanitize(notes, 300) || null;

  if (req.authUser!.role === 'PATIENT') {
    if (!req.patientProfileId) {
      res.status(404).json({ error: 'Patient profile not found' });
      return;
    }
    const targetCode = sanitize(ashaUniqueId, 40).toUpperCase();
    if (!targetCode) {
      res.status(400).json({ error: 'Please enter a valid ASHA Worker ID (e.g., ASHA-2026-0001).' });
      return;
    }

    const worker = db
      .prepare(
        `SELECT w.id as workerId, w.user_id as userId, COALESCE(w.asha_unique_id, w.worker_code) as ashaUniqueId, u.full_name as fullName
         FROM workers w
         JOIN users u ON w.user_id = u.id
         WHERE UPPER(COALESCE(w.asha_unique_id, w.worker_code)) = ? OR UPPER(w.worker_code) = ?`,
      )
      .get(targetCode, targetCode) as
      | { workerId: string; userId: string; ashaUniqueId: string; fullName: string }
      | undefined;

    if (!worker) {
      res.status(404).json({ error: `No ASHA worker found with ID '${targetCode}'.` });
      return;
    }

    const patient = db
      .prepare(`SELECT * FROM patient_profiles WHERE id = ?`)
      .get(req.patientProfileId) as Parameters<typeof mapPatientRow>[0];

    const existing = db
      .prepare(
        `SELECT id, status FROM asha_patient_connections WHERE asha_worker_id = ? AND patient_id = ?`,
      )
      .get(worker.workerId, patient.id) as { id: string; status: ConnectionStatus } | undefined;

    const transition = canTransitionConnection(existing?.status ?? null, 'REQUEST');
    if (!transition.allowed) {
      res.status(409).json({ error: transition.reason });
      return;
    }

    const mode: HealthcareMode = ALLOWED_MODES.includes(assignedMode as HealthcareMode)
      ? (assignedMode as HealthcareMode)
      : patient.assigned_mode;

    const connId = existing?.id ?? `conn-${crypto.randomUUID().slice(0, 8)}`;
    if (existing) {
      db.prepare(
        `UPDATE asha_patient_connections
         SET assigned_mode = ?, initiated_by = 'PATIENT', status = 'PENDING', notes = ?, requested_at = ?, responded_at = NULL
         WHERE id = ?`,
      ).run(mode, cleanNotes, now, connId);
    } else {
      db.prepare(
        `INSERT INTO asha_patient_connections (id, asha_worker_id, asha_unique_id, patient_id, patient_unique_id, assigned_mode, initiated_by, status, notes, requested_at, responded_at)
         VALUES (?, ?, ?, ?, ?, ?, 'PATIENT', 'PENDING', ?, ?, NULL)`,
      ).run(connId, worker.workerId, worker.ashaUniqueId, patient.id, patient.patient_unique_id, mode, cleanNotes, now);
    }

    createNotification({
      recipientUserId: worker.userId,
      senderName: `${patient.full_name} (${patient.patient_unique_id})`,
      notificationType: 'CONNECTION_REQUEST',
      title: 'New Patient Connection Request',
      message: `${patient.full_name} (${patient.patient_unique_id}) requested to connect in ${mode.replace('_', ' ')} Mode.`,
      relatedId: connId,
    });

    recordConnectivityAudit(req.authUser!.id, 'CONNECTION', connId, 'PATIENT_REQUESTED_CONNECTION');
    const created = queryConnectionsForPatient(patient.id).find((c) => c.id === connId);
    res.status(201).json({ connection: created });
    return;
  }

  // ASHA_WORKER initiating connection by Patient Unique ID
  const workerId = req.workerId ?? 'WORKER001';
  const worker = getWorkerProfile(workerId);
  if (!worker) {
    res.status(404).json({ error: 'Worker profile not found' });
    return;
  }

  const targetPatCode = sanitize(patientUniqueId, 40).toUpperCase();
  if (!targetPatCode) {
    res.status(400).json({ error: 'Please enter a valid Patient ID (e.g., PAT-2026-0001).' });
    return;
  }

  const patient = db
    .prepare(`SELECT * FROM patient_profiles WHERE UPPER(patient_unique_id) = ?`)
    .get(targetPatCode) as Parameters<typeof mapPatientRow>[0] | undefined;

  if (!patient) {
    res.status(404).json({ error: `No patient found with ID '${targetPatCode}'.` });
    return;
  }

  const existing = db
    .prepare(`SELECT id, status FROM asha_patient_connections WHERE asha_worker_id = ? AND patient_id = ?`)
    .get(worker.workerId, patient.id) as { id: string; status: ConnectionStatus } | undefined;

  const transition = canTransitionConnection(existing?.status ?? null, 'REQUEST');
  if (!transition.allowed) {
    res.status(409).json({ error: transition.reason });
    return;
  }

  const mode: HealthcareMode = ALLOWED_MODES.includes(assignedMode as HealthcareMode)
    ? (assignedMode as HealthcareMode)
    : patient.assigned_mode;

  const connId = existing?.id ?? `conn-${crypto.randomUUID().slice(0, 8)}`;
  if (existing) {
    db.prepare(
      `UPDATE asha_patient_connections
       SET assigned_mode = ?, initiated_by = 'ASHA_WORKER', status = 'PENDING', notes = ?, requested_at = ?, responded_at = NULL
       WHERE id = ?`,
    ).run(mode, cleanNotes, now, connId);
  } else {
    db.prepare(
      `INSERT INTO asha_patient_connections (id, asha_worker_id, asha_unique_id, patient_id, patient_unique_id, assigned_mode, initiated_by, status, notes, requested_at, responded_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ASHA_WORKER', 'PENDING', ?, ?, NULL)`,
    ).run(connId, worker.workerId, worker.ashaUniqueId, patient.id, patient.patient_unique_id, mode, cleanNotes, now);
  }

  createNotification({
    recipientUserId: patient.user_id,
    senderName: `${worker.fullName} (${worker.ashaUniqueId})`,
    notificationType: 'CONNECTION_REQUEST',
    title: 'ASHA Worker Connection Request',
    message: `ASHA worker ${worker.fullName} (${worker.ashaUniqueId}) invited you to connect for ${mode.replace('_', ' ')} Mode.`,
    relatedId: connId,
  });

  recordConnectivityAudit(req.authUser!.id, 'CONNECTION', connId, 'ASHA_REQUESTED_CONNECTION');
  const created = queryConnectionsForWorker(worker.workerId).find((c) => c.id === connId);
  res.status(201).json({ connection: created });
});

connectivityRouter.patch(
  '/connectivity/connections/:connectionId/respond',
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const { decision } = req.body as { decision?: 'APPROVE' | 'REJECT' };

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      res.status(400).json({ error: 'Decision must be APPROVE or REJECT.' });
      return;
    }

    const row = db
      .prepare(`SELECT * FROM asha_patient_connections WHERE id = ?`)
      .get(connectionId) as
      | {
          id: string;
          asha_worker_id: string;
          asha_unique_id: string;
          patient_id: string;
          patient_unique_id: string;
          assigned_mode: HealthcareMode;
          initiated_by: 'ASHA_WORKER' | 'PATIENT';
          status: ConnectionStatus;
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Connection request not found.' });
      return;
    }

    // Verify authorization: only the receiving party (or supervisor/admin) can approve/reject
    const role = req.authUser!.role;
    if (role === 'PATIENT') {
      if (row.patient_id !== req.patientProfileId || row.initiated_by !== 'ASHA_WORKER') {
        res.status(403).json({ error: 'You are not authorized to respond to this connection request.' });
        return;
      }
    } else if (role === 'ASHA_WORKER') {
      if (row.asha_worker_id !== req.workerId || row.initiated_by !== 'PATIENT') {
        res.status(403).json({ error: 'You are not authorized to respond to this connection request.' });
        return;
      }
    }

    const transition = canTransitionConnection(row.status, decision);
    if (!transition.allowed || !transition.nextStatus) {
      res.status(409).json({ error: transition.reason ?? 'Invalid connection transition.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE asha_patient_connections SET status = ?, responded_at = ? WHERE id = ?`,
    ).run(transition.nextStatus, now, connectionId);

    const worker = getWorkerProfile(row.asha_worker_id);
    const patient = db
      .prepare(`SELECT user_id, full_name FROM patient_profiles WHERE id = ?`)
      .get(row.patient_id) as { user_id: string | null; full_name: string } | undefined;

    if (row.initiated_by === 'PATIENT' && patient?.user_id) {
      createNotification({
        recipientUserId: patient.user_id,
        senderName: `${worker?.fullName ?? 'ASHA Worker'} (${row.asha_unique_id})`,
        notificationType: decision === 'APPROVE' ? 'CONNECTION_APPROVED' : 'CONNECTION_REJECTED',
        title: decision === 'APPROVE' ? 'Connection Approved' : 'Connection Request Declined',
        message:
          decision === 'APPROVE'
            ? `${worker?.fullName ?? 'ASHA Worker'} approved your connection request.`
            : `${worker?.fullName ?? 'ASHA Worker'} declined the connection request.`,
        relatedId: connectionId,
      });
    } else if (row.initiated_by === 'ASHA_WORKER' && worker?.userId) {
      createNotification({
        recipientUserId: worker.userId,
        senderName: `${patient?.full_name ?? 'Patient'} (${row.patient_unique_id})`,
        notificationType: decision === 'APPROVE' ? 'CONNECTION_APPROVED' : 'CONNECTION_REJECTED',
        title: decision === 'APPROVE' ? 'Patient Approved Connection' : 'Patient Declined Connection',
        message:
          decision === 'APPROVE'
            ? `${patient?.full_name ?? 'Patient'} (${row.patient_unique_id}) accepted your connection request.`
            : `${patient?.full_name ?? 'Patient'} (${row.patient_unique_id}) declined your connection request.`,
        relatedId: connectionId,
      });
    }

    recordConnectivityAudit(req.authUser!.id, 'CONNECTION', connectionId, `CONNECTION_${transition.nextStatus}`);
    const updatedList =
      role === 'PATIENT'
        ? queryConnectionsForPatient(row.patient_id)
        : queryConnectionsForWorker(row.asha_worker_id);
    res.json({ connection: updatedList.find((c) => c.id === connectionId) });
  },
);

/**
 * Patient Self-Portal Dashboard & Consent Management (Strictly RBAC-isolated to own records)
 */
connectivityRouter.get(
  '/connectivity/patient/dashboard',
  requireAuth,
  requireRole('PATIENT'),
  (req: AuthenticatedRequest, res) => {
    if (!req.patientProfileId) {
      res.status(404).json({ error: 'Patient profile not found for this account.' });
      return;
    }

    const patientRow = db
      .prepare(`SELECT * FROM patient_profiles WHERE id = ?`)
      .get(req.patientProfileId) as Parameters<typeof mapPatientRow>[0] | undefined;

    if (!patientRow) {
      res.status(404).json({ error: 'Patient profile not found.' });
      return;
    }

    const patient = mapPatientRow(patientRow);
    const connections = queryConnectionsForPatient(patient.id);
    const connectedWorker = connections.find((c) => c.status === 'CONNECTED') ?? null;

    const pregRow = db
      .prepare(`SELECT * FROM care_pregnancy_records WHERE patient_id = ?`)
      .get(patient.id) as Parameters<typeof mapPregnancyRow>[0] | undefined;

    const nbRow = db
      .prepare(`SELECT * FROM care_newborn_records WHERE patient_id = ?`)
      .get(patient.id) as Parameters<typeof mapNewbornRow>[0] | undefined;

    const vaccRows = db
      .prepare(`SELECT * FROM care_vaccination_records WHERE patient_id = ? ORDER BY due_date ASC`)
      .all(patient.id) as Parameters<typeof mapVaccinationRow>[0][];

    const apptRows = db
      .prepare(
        `SELECT a.*, u.full_name as asha_worker_name
         FROM care_appointments a
         JOIN workers w ON a.asha_worker_id = w.id
         JOIN users u ON w.user_id = u.id
         WHERE a.patient_id = ?
         ORDER BY a.scheduled_date ASC`,
      )
      .all(patient.id) as Parameters<typeof mapAppointmentRow>[0][];

    const assistanceRequests = queryAssistanceRequests({ patientId: patient.id });
    const notifications = queryNotificationsForUser(req.authUser!.id);

    res.json({
      patient,
      connections,
      connectedWorker,
      pregnancyRecord: pregRow ? mapPregnancyRow(pregRow) : null,
      newbornRecord: nbRow ? mapNewbornRow(nbRow) : null,
      vaccinationRecords: vaccRows.map(mapVaccinationRow),
      appointments: apptRows.map(mapAppointmentRow),
      assistanceRequests,
      notifications,
      unreadNotificationsCount: notifications.filter((n) => !n.isRead).length,
    });
  },
);

connectivityRouter.patch(
  '/connectivity/patient/consent',
  requireAuth,
  requireRole('PATIENT'),
  (req: AuthenticatedRequest, res) => {
    if (!req.patientProfileId) {
      res.status(404).json({ error: 'Patient profile not found.' });
      return;
    }
    const { consentStatus } = req.body as { consentStatus?: ConsentStatus };
    if (consentStatus !== 'GRANTED' && consentStatus !== 'WITHDRAWN') {
      res.status(400).json({ error: 'consentStatus must be GRANTED or WITHDRAWN.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE patient_profiles SET consent_status = ?, consent_updated_at = ? WHERE id = ?`,
    ).run(consentStatus, now, req.patientProfileId);

    recordConnectivityAudit(req.authUser!.id, 'PATIENT_CONSENT', req.patientProfileId, `CONSENT_${consentStatus}`);
    res.json({ consentStatus, consentUpdatedAt: now });
  },
);

/**
 * Two-Way Communication: Patient Assistance Requests & ASHA Responses + Reminders
 */
connectivityRouter.post(
  '/connectivity/assistance',
  requireAuth,
  requireRole('PATIENT'),
  (req: AuthenticatedRequest, res) => {
    if (!req.patientProfileId) {
      res.status(404).json({ error: 'Patient profile not found.' });
      return;
    }

    const { subject, message, urgency } = req.body as {
      subject?: string;
      message?: string;
      urgency?: 'NORMAL' | 'URGENT';
    };

    const cleanSubject = sanitize(subject, 160);
    const cleanMessage = sanitize(message, 1200);
    if (!cleanSubject || !cleanMessage) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }

    const conn = db
      .prepare(
        `SELECT id, asha_worker_id, assigned_mode FROM asha_patient_connections
         WHERE patient_id = ? AND status = 'CONNECTED'
         ORDER BY responded_at DESC LIMIT 1`,
      )
      .get(req.patientProfileId) as
      | { id: string; asha_worker_id: string; assigned_mode: HealthcareMode }
      | undefined;

    if (!conn) {
      res.status(403).json({
        error: 'You need an approved connection with an ASHA worker before sending assistance requests.',
      });
      return;
    }

    const id = `assist-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const resolvedUrgency = urgency === 'URGENT' ? 'URGENT' : 'NORMAL';

    db.prepare(
      `INSERT INTO assistance_requests (id, connection_id, patient_id, asha_worker_id, healthcare_mode, subject, message, urgency, status, asha_response, responded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NULL, NULL, ?)`,
    ).run(
      id,
      conn.id,
      req.patientProfileId,
      conn.asha_worker_id,
      conn.assigned_mode,
      cleanSubject,
      cleanMessage,
      resolvedUrgency,
      now,
    );

    const worker = getWorkerProfile(conn.asha_worker_id);
    createNotification({
      recipientUserId: worker?.userId,
      senderName: `${req.authUser!.fullName} (${req.authUser!.patientUniqueId ?? 'Patient'})`,
      notificationType: 'ASSISTANCE_REQUEST',
      title: resolvedUrgency === 'URGENT' ? `URGENT Request: ${cleanSubject}` : `Assistance Request: ${cleanSubject}`,
      message: cleanMessage,
      relatedId: id,
    });

    recordConnectivityAudit(req.authUser!.id, 'ASSISTANCE_REQUEST', id, 'PATIENT_SENT_REQUEST');
    const created = queryAssistanceRequests({ patientId: req.patientProfileId }).find((a) => a.id === id);
    res.status(201).json({ request: created });
  },
);

connectivityRouter.patch(
  '/connectivity/assistance/:id/respond',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { ashaResponse, status } = req.body as {
      ashaResponse?: string;
      status?: 'RESPONDED' | 'RESOLVED';
    };

    const cleanResponse = sanitize(ashaResponse, 1200);
    if (!cleanResponse) {
      res.status(400).json({ error: 'Response message is required.' });
      return;
    }

    const row = db
      .prepare(`SELECT * FROM assistance_requests WHERE id = ?`)
      .get(id) as { id: string; patient_id: string; asha_worker_id: string; subject: string } | undefined;

    if (!row) {
      res.status(404).json({ error: 'Assistance request not found.' });
      return;
    }

    if (req.authUser!.role === 'ASHA_WORKER' && row.asha_worker_id !== req.workerId) {
      res.status(403).json({ error: 'You are not assigned to this patient request.' });
      return;
    }

    const nextStatus = status === 'RESOLVED' ? 'RESOLVED' : 'RESPONDED';
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE assistance_requests SET asha_response = ?, status = ?, responded_at = ? WHERE id = ?`,
    ).run(cleanResponse, nextStatus, now, id);

    const pat = db
      .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
      .get(row.patient_id) as { user_id: string | null } | undefined;
    const worker = getWorkerProfile(row.asha_worker_id);

    createNotification({
      recipientUserId: pat?.user_id,
      senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
      notificationType: 'ASSISTANCE_REPLY',
      title: `ASHA Response: ${row.subject}`,
      message: cleanResponse,
      relatedId: id,
    });

    recordConnectivityAudit(req.authUser!.id, 'ASSISTANCE_REQUEST', id, `ASHA_${nextStatus}`);
    const updated = queryAssistanceRequests({ workerId: row.asha_worker_id }).find((a) => a.id === id);
    res.json({ request: updated });
  },
);

connectivityRouter.post(
  '/connectivity/reminders',
  requireAuth,
  requireRole('ASHA_WORKER', 'SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const workerId = req.workerId ?? 'WORKER001';
    const { patientId, notificationType, title, message } = req.body as {
      patientId?: string;
      notificationType?: CareNotification['notificationType'];
      title?: string;
      message?: string;
    };

    if (!patientId || !title || !message) {
      res.status(400).json({ error: 'patientId, title, and message are required.' });
      return;
    }

    const access = verifyWorkerConnectedToPatient(workerId, patientId, req.authUser!.role);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const pat = db
      .prepare(`SELECT user_id FROM patient_profiles WHERE id = ?`)
      .get(patientId) as { user_id: string | null } | undefined;
    const worker = getWorkerProfile(workerId);

    createNotification({
      recipientUserId: pat?.user_id,
      senderName: `${worker?.fullName ?? req.authUser!.fullName} (${worker?.ashaUniqueId ?? 'ASHA'})`,
      notificationType: notificationType ?? 'APPOINTMENT_REMINDER',
      title,
      message,
      relatedId: patientId,
    });

    res.status(201).json({ sent: true });
  },
);

connectivityRouter.get('/connectivity/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications = queryNotificationsForUser(req.authUser!.id);
  res.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  });
});

connectivityRouter.patch(
  '/connectivity/notifications/:id/read',
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const info = db
      .prepare(`UPDATE care_notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?`)
      .run(id, req.authUser!.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ id, isRead: true });
  },
);
