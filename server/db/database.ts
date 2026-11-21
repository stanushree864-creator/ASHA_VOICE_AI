import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GUIDELINE_VERSIONS } from '../../src/shared/dangerSigns';
import { SYNTHETIC_BENEFICIARIES } from '../../src/shared/clinicalEngine';
import { computeNextSequentialId } from '../../src/shared/connectivityEngine';

const CUSTOM_DB_PATH = process.env.ASHA_DB_PATH
  ? path.resolve(process.env.ASHA_DB_PATH)
  : null;
const DATA_DIR = CUSTOM_DB_PATH ? path.dirname(CUSTOM_DB_PATH) : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = CUSTOM_DB_PATH ?? path.join(DATA_DIR, 'asha_register.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasscode(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ASHA_WORKER', 'SUPERVISOR', 'ADMIN', 'PATIENT')),
      preferred_language TEXT NOT NULL DEFAULT 'en',
      account_status TEXT NOT NULL DEFAULT 'ACTIVE',
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      worker_code TEXT UNIQUE NOT NULL,
      assigned_area TEXT NOT NULL,
      supervisor_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      household_code TEXT UNIQUE NOT NULL,
      locality TEXT NOT NULL,
      synthetic_address TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      beneficiary_code TEXT UNIQUE NOT NULL,
      household_id TEXT NOT NULL REFERENCES households(id),
      display_name TEXT NOT NULL,
      beneficiary_type TEXT NOT NULL CHECK(beneficiary_type IN ('PREGNANT_WOMAN', 'NEWBORN', 'CHILD')),
      date_of_birth TEXT,
      mother_beneficiary_code TEXT,
      synthetic_data_flag INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      language TEXT NOT NULL,
      provider TEXT NOT NULL,
      session_status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      time_to_first_audio_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      voice_session_id TEXT REFERENCES voice_sessions(id),
      raw_transcript TEXT NOT NULL,
      language TEXT NOT NULL,
      processing_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      client_request_id TEXT UNIQUE NOT NULL,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
      worker_id TEXT NOT NULL REFERENCES workers(id),
      visit_type TEXT NOT NULL CHECK(visit_type IN ('ANC', 'NEWBORN', 'IMMUNISATION')),
      visit_date TEXT NOT NULL,
      language TEXT NOT NULL,
      transcript_id TEXT REFERENCES transcripts(id),
      record_status TEXT NOT NULL,
      confirmation_status TEXT NOT NULL,
      danger_sign_status TEXT NOT NULL,
      referral_status TEXT NOT NULL,
      next_visit_date TEXT,
      structured_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pregnancy_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      gestational_age_weeks INTEGER,
      weight_kg REAL,
      blood_pressure TEXT,
      anc_status TEXT,
      ifa_status TEXT,
      td_status TEXT,
      reported_observations TEXT
    );

    CREATE TABLE IF NOT EXISTS newborn_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      birth_date TEXT,
      age_days INTEGER,
      birth_weight_kg REAL,
      current_weight_kg REAL,
      reported_temperature TEXT,
      feeding_observations TEXT
    );

    CREATE TABLE IF NOT EXISTS immunisation_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      vaccine_code TEXT NOT NULL,
      vaccination_status TEXT NOT NULL,
      vaccination_date TEXT,
      next_due_date TEXT,
      schedule_version TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guideline_versions (
      id TEXT PRIMARY KEY,
      guideline_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      page_or_section TEXT NOT NULL,
      version TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      reviewed_by TEXT NOT NULL,
      reviewed_at TEXT NOT NULL,
      active_status INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS danger_sign_events (
      id TEXT PRIMARY KEY,
      visit_id TEXT REFERENCES visits(id) ON DELETE CASCADE,
      beneficiary_code TEXT,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      danger_sign_code TEXT NOT NULL,
      danger_sign_title TEXT NOT NULL,
      source_guideline_id TEXT NOT NULL REFERENCES guideline_versions(id),
      matched_phrase TEXT NOT NULL,
      detection_method TEXT NOT NULL,
      confidence REAL NOT NULL,
      confirmation_status TEXT NOT NULL,
      severity_category TEXT NOT NULL,
      detected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      visit_id TEXT REFERENCES visits(id) ON DELETE CASCADE,
      danger_event_id TEXT NOT NULL REFERENCES danger_sign_events(id),
      beneficiary_code TEXT,
      beneficiary_name TEXT,
      worker_id TEXT NOT NULL REFERENCES workers(id),
      referral_destination_type TEXT NOT NULL DEFAULT 'PHC',
      referral_status TEXT NOT NULL,
      referral_timestamp TEXT NOT NULL,
      acknowledgement_status TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
      worker_id TEXT NOT NULL REFERENCES workers(id),
      task_description TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT,
      task_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      previous_value TEXT,
      corrected_value TEXT,
      correction_source TEXT NOT NULL,
      corrected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      correlation_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retention_config (
      id TEXT PRIMARY KEY,
      audio_retention_hours INTEGER NOT NULL DEFAULT 0,
      transcript_retention_days INTEGER NOT NULL DEFAULT 30,
      external_provider_disclosure TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      voice_speed REAL NOT NULL DEFAULT 1.0,
      high_contrast INTEGER NOT NULL DEFAULT 0,
      large_text INTEGER NOT NULL DEFAULT 0,
      offline_auto_sync INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_read_states (
      alert_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 1,
      read_at TEXT NOT NULL,
      PRIMARY KEY (alert_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_visits_worker ON visits(worker_id, visit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_visits_ben ON visits(beneficiary_id);
    CREATE INDEX IF NOT EXISTS idx_followups_worker ON followups(worker_id, task_status);
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(referral_status, referral_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);
  `);

  // Safe migration if existing DB's users table had old role CHECK constraint without PATIENT
  const usersTableDef = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
    .get() as { sql?: string } | undefined;
  if (usersTableDef?.sql && !usersTableDef.sql.includes("'PATIENT'")) {
    db.pragma('foreign_keys = OFF');
    const migrateUsers = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('ASHA_WORKER', 'SUPERVISOR', 'ADMIN', 'PATIENT')),
          preferred_language TEXT NOT NULL DEFAULT 'en',
          account_status TEXT NOT NULL DEFAULT 'ACTIVE',
          avatar_url TEXT,
          created_at TEXT NOT NULL
        );
        INSERT INTO users_migrated SELECT id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
      `);
    });
    migrateUsers();
    db.pragma('foreign_keys = ON');
  }

  // Safe additive migration for workers.asha_unique_id
  const workerCols = db.prepare(`PRAGMA table_info(workers)`).all() as Array<{ name: string }>;
  if (!workerCols.some((c) => c.name === 'asha_unique_id')) {
    db.exec(`ALTER TABLE workers ADD COLUMN asha_unique_id TEXT`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_asha_unique_id ON workers(asha_unique_id)`);

  // Safe additive migration for followups.remarks on existing databases
  const fuCols = db.prepare(`PRAGMA table_info(followups)`).all() as Array<{ name: string }>;
  if (!fuCols.some((c) => c.name === 'remarks')) {
    db.exec(`ALTER TABLE followups ADD COLUMN remarks TEXT`);
  }

  // Connectivity & Healthcare Mode Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS patient_profiles (
      id TEXT PRIMARY KEY,
      patient_unique_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      beneficiary_id TEXT REFERENCES beneficiaries(id),
      full_name TEXT NOT NULL,
      age INTEGER,
      phone TEXT,
      locality TEXT,
      assigned_mode TEXT NOT NULL CHECK(assigned_mode IN ('PREGNANCY', 'NEWBORN_CARE', 'VACCINATION')),
      consent_status TEXT NOT NULL DEFAULT 'GRANTED' CHECK(consent_status IN ('GRANTED', 'PENDING', 'WITHDRAWN')),
      consent_updated_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asha_patient_connections (
      id TEXT PRIMARY KEY,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      asha_unique_id TEXT NOT NULL,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      patient_unique_id TEXT NOT NULL,
      assigned_mode TEXT NOT NULL CHECK(assigned_mode IN ('PREGNANCY', 'NEWBORN_CARE', 'VACCINATION')),
      initiated_by TEXT NOT NULL CHECK(initiated_by IN ('ASHA_WORKER', 'PATIENT')),
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'CONNECTED', 'REJECTED')),
      notes TEXT,
      requested_at TEXT NOT NULL,
      responded_at TEXT,
      UNIQUE(asha_worker_id, patient_id)
    );

    CREATE TABLE IF NOT EXISTS care_pregnancy_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT UNIQUE NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      pregnancy_stage TEXT NOT NULL,
      gestational_weeks INTEGER,
      expected_delivery_date TEXT,
      blood_pressure TEXT,
      weight_kg REAL,
      hemoglobin_g_dl REAL,
      anc_visits_completed INTEGER NOT NULL DEFAULT 0,
      ifa_tablets_status TEXT,
      risk_level TEXT NOT NULL DEFAULT 'NORMAL' CHECK(risk_level IN ('NORMAL', 'MONITOR', 'HIGH_RISK')),
      visit_notes TEXT,
      last_checkup_date TEXT,
      next_checkup_date TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS care_newborn_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT UNIQUE NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      baby_name TEXT NOT NULL,
      mother_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_weight_kg REAL,
      current_weight_kg REAL,
      length_cm REAL,
      temperature TEXT,
      feeding_status TEXT,
      hbnc_visits_completed INTEGER NOT NULL DEFAULT 0,
      health_notes TEXT,
      next_checkup_date TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS care_vaccination_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      vaccine_name TEXT NOT NULL,
      dose_label TEXT NOT NULL,
      due_date TEXT NOT NULL,
      administered_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'COMPLETED', 'SCHEDULED', 'OVERDUE')),
      notes TEXT,
      reminder_sent_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS care_appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      healthcare_mode TEXT NOT NULL CHECK(healthcare_mode IN ('PREGNANCY', 'NEWBORN_CARE', 'VACCINATION')),
      title TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
      reminder_sent INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistance_requests (
      id TEXT PRIMARY KEY,
      connection_id TEXT REFERENCES asha_patient_connections(id),
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      healthcare_mode TEXT NOT NULL CHECK(healthcare_mode IN ('PREGNANCY', 'NEWBORN_CARE', 'VACCINATION')),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK(urgency IN ('NORMAL', 'URGENT')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'RESPONDED', 'RESOLVED')),
      asha_response TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS care_notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conn_asha ON asha_patient_connections(asha_worker_id, status);
    CREATE INDEX IF NOT EXISTS idx_conn_patient ON asha_patient_connections(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_vacc_patient ON care_vaccination_records(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_appt_worker ON care_appointments(asha_worker_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_assist_worker ON assistance_requests(asha_worker_id, status);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON care_notifications(recipient_user_id, is_read, created_at DESC);

    -- Enhancement Feature Tables (Backward-Compatible Additive)
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      worker_id TEXT PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
      worker_phone TEXT NOT NULL,
      backup_phone TEXT NOT NULL,
      phc_name TEXT NOT NULL,
      phc_phone TEXT NOT NULL,
      ambulance_number TEXT NOT NULL DEFAULT '108',
      supervisor_name TEXT NOT NULL,
      supervisor_phone TEXT NOT NULL,
      district_helpline TEXT NOT NULL DEFAULT '104',
      emergency_instructions TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pregnancy_risk_assessments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      patient_unique_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      asha_worker_id TEXT NOT NULL REFERENCES workers(id),
      gestational_weeks INTEGER,
      blood_pressure TEXT,
      hemoglobin_g_dl REAL,
      weight_kg REAL,
      anc_visits_completed INTEGER NOT NULL DEFAULT 0,
      risk_score INTEGER NOT NULL,
      risk_tier TEXT NOT NULL CHECK(risk_tier IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
      phc_referral_required INTEGER NOT NULL DEFAULT 0,
      factors_json TEXT NOT NULL,
      recommendations_json TEXT NOT NULL,
      ai_summary TEXT,
      ai_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
      assessed_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_preg_risk_patient ON pregnancy_risk_assessments(patient_id, created_at DESC);
  `);

  // Safe additive emergency contact columns on patient_profiles
  const patCols = db.prepare(`PRAGMA table_info(patient_profiles)`).all() as Array<{ name: string }>;
  if (!patCols.some((c) => c.name === 'emergency_contact_name')) {
    db.exec(`ALTER TABLE patient_profiles ADD COLUMN emergency_contact_name TEXT`);
  }
  if (!patCols.some((c) => c.name === 'emergency_contact_relation')) {
    db.exec(`ALTER TABLE patient_profiles ADD COLUMN emergency_contact_relation TEXT`);
  }
  if (!patCols.some((c) => c.name === 'emergency_contact_phone')) {
    db.exec(`ALTER TABLE patient_profiles ADD COLUMN emergency_contact_phone TEXT`);
  }

  const now = new Date().toISOString();
  const defaultAudioHours = Math.max(0, Number(process.env.AUDIO_RETENTION_HOURS ?? 0) || 0);
  const defaultTranscriptDays = Math.max(1, Number(process.env.TRANSCRIPT_RETENTION_DAYS ?? 30) || 30);

  db.prepare(`
    INSERT OR IGNORE INTO retention_config (id, audio_retention_hours, transcript_retention_days, external_provider_disclosure, updated_by, updated_at)
    VALUES ('default', ?, ?, ?, 'System Default', ?)
  `).run(
    defaultAudioHours,
    defaultTranscriptDays,
    'Audio is streamed only to the server-side speech gateway for visit transcription and read-back; raw audio is not persisted by default (0h retention).',
    now,
  );

  seedInitialData();
  seedConnectivityData();
  seedEnhancementData();
}

export function generateNextAshaUniqueId(): string {
  const rows = db
    .prepare(`SELECT asha_unique_id FROM workers WHERE asha_unique_id IS NOT NULL`)
    .all() as Array<{ asha_unique_id: string }>;
  return computeNextSequentialId('ASHA', rows.map((r) => r.asha_unique_id), 2026);
}

export function generateNextPatientUniqueId(): string {
  const rows = db
    .prepare(`SELECT patient_unique_id FROM patient_profiles WHERE patient_unique_id IS NOT NULL`)
    .all() as Array<{ patient_unique_id: string }>;
  return computeNextSequentialId('PAT', rows.map((r) => r.patient_unique_id), 2026);
}

function seedInitialData(): void {
  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt > 0) return;

  const now = new Date().toISOString();
  const demoPassHash = hashPasscode('asha-demo-2026');

  const insertUser = db.prepare(`
    INSERT INTO users (id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  insertUser.run(
    'user-sup-01',
    'Dr. Kavitha Rao',
    'supervisor01',
    demoPassHash,
    'SUPERVISOR',
    'en',
    '/src/assets/images/supervisor_doctor_portrait_1795246324320.jpg',
    now,
  );
  insertUser.run(
    'user-asha-01',
    'Savitha Gowda',
    'worker01',
    demoPassHash,
    'ASHA_WORKER',
    'kn',
    '/src/assets/images/asha_worker_portrait_1795246317288.jpg',
    now,
  );
  insertUser.run(
    'user-admin-01',
    'District Health Admin',
    'admin01',
    demoPassHash,
    'ADMIN',
    'en',
    '/src/assets/images/supervisor_doctor_portrait_1795246324320.jpg',
    now,
  );

  db.prepare(`
    INSERT INTO workers (id, user_id, worker_code, assigned_area, supervisor_id)
    VALUES (?, ?, ?, ?, ?)
  `).run('WORKER001', 'user-asha-01', 'ASHA-DEV-04', 'Devanahalli Block · Wards 4-6', 'user-sup-01');

  db.prepare(`
    INSERT INTO workers (id, user_id, worker_code, assigned_area, supervisor_id)
    VALUES (?, ?, ?, ?, ?)
  `).run('SUPERVISOR001', 'user-sup-01', 'SUP-DEV-01', 'Devanahalli PHC Cluster', 'user-sup-01');

  const insertHousehold = db.prepare(`
    INSERT OR IGNORE INTO households (id, household_code, locality, synthetic_address, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertBeneficiary = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries (id, beneficiary_code, household_id, display_name, beneficiary_type, date_of_birth, mother_beneficiary_code, synthetic_data_flag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const ben of SYNTHETIC_BENEFICIARIES) {
    insertHousehold.run(ben.householdId, ben.householdCode, ben.locality, ben.syntheticAddress, now);
    insertBeneficiary.run(
      ben.id,
      ben.beneficiaryCode,
      ben.householdId,
      ben.displayName,
      ben.beneficiaryType,
      ben.dateOfBirth,
      ben.motherBeneficiaryCode ?? null,
      now,
    );
  }

  const insertGuideline = db.prepare(`
    INSERT OR IGNORE INTO guideline_versions (id, guideline_name, source_url, page_or_section, version, effective_date, reviewed_by, reviewed_at, active_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of GUIDELINE_VERSIONS) {
    insertGuideline.run(
      g.id,
      g.guidelineName,
      g.sourceUrl,
      g.pageOrSection,
      g.version,
      g.effectiveDate,
      g.reviewedBy,
      g.reviewedAt,
      g.activeStatus ? 1 : 0,
    );
  }

  // Seed one synthetic completed ANC visit for Lakshmi (ASHA00126) so history is populated realistically
  const sampleVisitId = 'visit-seed-001';
  const sampleTranscriptId = 'tr-seed-001';
  const sampleSessionId = 'vs-seed-001';
  const sampleTranscript =
    'Today visited ASHA00126 Lakshmi. ANC checkup completed. Weight 55 kg. IFA tablets taking regularly. Next visit on 30 November.';

  db.prepare(`
    INSERT INTO voice_sessions (id, worker_id, language, provider, session_status, started_at, ended_at, time_to_first_audio_ms)
    VALUES (?, 'WORKER001', 'kn', 'gemini-3.5-transcribe-live', 'COMPLETED', ?, ?, 940)
  `).run(sampleSessionId, now, now);

  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES (?, ?, ?, 'kn', 'EXTRACTED', ?)
  `).run(sampleTranscriptId, sampleSessionId, sampleTranscript, now);

  const sampleStructured = {
    clientRequestId: 'seed-req-001',
    beneficiaryId: 'ASHA00126',
    beneficiaryName: 'Lakshmi',
    householdId: 'HH-102',
    workerId: 'WORKER001',
    visitType: 'ANC',
    visitDate: '2026-11-20',
    language: 'kn',
    detectedLanguages: ['Kannada', 'English'],
    observations: sampleTranscript,
    pregnancyDetails: {
      gestationalAgeWeeks: 28,
      ancStatus: 'completed',
      weightKg: 55,
      bloodPressure: '116/76',
      ifaStatus: 'reported_taking',
      vaccinationStatus: 'reported_completed',
      tdDose: 'Td-2',
      reportedSymptoms: null,
    },
    newbornDetails: null,
    immunisationDetails: null,
    nextVisitDate: '2026-11-30',
    dangerSignStatus: 'none_detected',
    dangerAnalysis: {
      status: 'none_detected',
      matches: [],
      negatedMatches: [],
      uncertainMatches: [],
      analyzedAt: now,
    },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: sampleTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, weightKg: 0.96, nextVisitDate: 0.95 },
    originalUtterances: { fullTranscript: sampleTranscript },
    correctionHistory: [],
  };

  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES (?, 'seed-req-001', 'ben-002', 'WORKER001', 'ANC', '2026-11-20', 'kn', ?, 'SAVED', 'confirmed', 'none_detected', 'not_required', '2026-11-30', ?, ?, ?)
  `).run(sampleVisitId, sampleTranscriptId, JSON.stringify(sampleStructured), now, now);

  db.prepare(`
    INSERT INTO pregnancy_records (id, visit_id, gestational_age_weeks, weight_kg, blood_pressure, anc_status, ifa_status, td_status, reported_observations)
    VALUES ('preg-seed-001', ?, 28, 55, '116/76', 'completed', 'reported_taking', 'reported_completed', ?)
  `).run(sampleVisitId, sampleTranscript);

  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-001', ?, 'ben-002', 'WORKER001', 'Scheduled ANC follow-up visit with Lakshmi (ASHA00126)', 'SCHEDULED_VISIT', '2026-11-30', 'PENDING', ?)
  `).run(sampleVisitId, now);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, timestamp, correlation_id)
    VALUES ('audit-seed-001', 'user-asha-01', 'VISIT', ?, 'SEED_SYNTHETIC_RECORD', ?, 'corr-seed-001')
  `).run(sampleVisitId, now);

  // Additional realistic synthetic visits (Newborn + Immunisation) dated relative to today for charts & register
  const dayIso = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const nbVisitDate = dayIso(-2);
  const nbTranscript =
    'Baby of Rekha ASHA00127 newborn checkup. Baby weight 2.9 kilo, feeding properly, vaccination record checked.';
  const nbStructured = {
    clientRequestId: 'seed-req-002',
    beneficiaryId: 'ASHA00127',
    beneficiaryName: 'Baby of Rekha',
    householdId: 'HH-103',
    workerId: 'WORKER001',
    visitType: 'NEWBORN',
    visitDate: nbVisitDate,
    language: 'en',
    detectedLanguages: ['English'],
    observations: nbTranscript,
    pregnancyDetails: null,
    newbornDetails: {
      newbornId: 'ASHA00127',
      motherBeneficiaryId: 'ASHA00120',
      birthDate: '2026-11-12',
      ageDays: 9,
      birthWeightKg: 2.8,
      currentWeightKg: 2.9,
      feedingObservations: 'Feeding properly',
      reportedTemperature: '98.2 F',
      immunisationChecked: true,
    },
    immunisationDetails: null,
    nextVisitDate: dayIso(5),
    dangerSignStatus: 'none_detected',
    dangerAnalysis: { status: 'none_detected', matches: [], negatedMatches: [], uncertainMatches: [], analyzedAt: now },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: nbTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, currentWeightKg: 0.95, feedingObservations: 0.94 },
    originalUtterances: { fullTranscript: nbTranscript },
    correctionHistory: [],
  };
  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES ('tr-seed-002', ?, ?, 'en', 'CONFIRMED', ?)
  `).run(sampleSessionId, nbTranscript, now);
  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES ('visit-seed-002', 'seed-req-002', 'ben-003', 'WORKER001', 'NEWBORN', ?, 'en', 'tr-seed-002', 'SAVED', 'confirmed', 'none_detected', 'not_required', ?, ?, ?, ?)
  `).run(nbVisitDate, dayIso(5), JSON.stringify(nbStructured), now, now);
  db.prepare(`
    INSERT INTO newborn_records (id, visit_id, birth_date, age_days, birth_weight_kg, current_weight_kg, reported_temperature, feeding_observations)
    VALUES ('nb-seed-002', 'visit-seed-002', '2026-11-12', 9, 2.8, 2.9, '98.2 F', 'Feeding properly')
  `).run();
  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-002', 'visit-seed-002', 'ben-003', 'WORKER001', 'HBNC Day-14 weight progression & feeding check for Baby of Rekha (ASHA00127)', 'ROUTINE_FOLLOWUP', ?, 'PENDING', ?)
  `).run(dayIso(5), now);

  const immVisitDate = dayIso(-1);
  const immTranscript =
    'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.';
  const immStructured = {
    clientRequestId: 'seed-req-003',
    beneficiaryId: 'ASHA00128',
    beneficiaryName: 'Aarav',
    householdId: 'HH-104',
    workerId: 'WORKER001',
    visitType: 'IMMUNISATION',
    visitDate: immVisitDate,
    language: 'en',
    detectedLanguages: ['English'],
    observations: immTranscript,
    pregnancyDetails: null,
    newbornDetails: null,
    immunisationDetails: {
      childAgeLabel: '6 Weeks',
      vaccinesGiven: ['OPV-1', 'Pentavalent-1'],
      vaccinesDue: ['PCV-1'],
      missedVaccines: [],
      previousVaccineHistory: 'BCG, OPV-0',
      scheduleVersion: 'NIS-2026.03',
    },
    nextVisitDate: dayIso(12),
    dangerSignStatus: 'none_detected',
    dangerAnalysis: { status: 'none_detected', matches: [], negatedMatches: [], uncertainMatches: [], analyzedAt: now },
    referralStatus: 'not_required',
    confirmationStatus: 'confirmed',
    sourceTranscript: immTranscript,
    extractionSource: 'GEMINI_STRUCTURED_AI',
    fieldConfidence: { beneficiaryId: 0.99, vaccinesGiven: 0.96, vaccinesDue: 0.94 },
    originalUtterances: { fullTranscript: immTranscript },
    correctionHistory: [],
  };
  db.prepare(`
    INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
    VALUES ('tr-seed-003', ?, ?, 'en', 'CONFIRMED', ?)
  `).run(sampleSessionId, immTranscript, now);
  db.prepare(`
    INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
    VALUES ('visit-seed-003', 'seed-req-003', 'ben-004', 'WORKER001', 'IMMUNISATION', ?, 'en', 'tr-seed-003', 'SAVED', 'confirmed', 'none_detected', 'not_required', ?, ?, ?, ?)
  `).run(immVisitDate, dayIso(12), JSON.stringify(immStructured), now, now);
  db.prepare(`
    INSERT INTO immunisation_records (id, visit_id, vaccine_code, vaccination_status, vaccination_date, next_due_date, schedule_version)
    VALUES ('imm-seed-003a', 'visit-seed-003', 'OPV-1', 'GIVEN', ?, ?, 'NIS-2026.03'),
           ('imm-seed-003b', 'visit-seed-003', 'Pentavalent-1', 'GIVEN', ?, ?, 'NIS-2026.03'),
           ('imm-seed-003c', 'visit-seed-003', 'PCV-1', 'DUE', NULL, ?, 'NIS-2026.03')
  `).run(immVisitDate, dayIso(12), immVisitDate, dayIso(12), dayIso(12));
  db.prepare(`
    INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
    VALUES ('fu-seed-003', 'visit-seed-003', 'ben-004', 'WORKER001', 'Administer due PCV-1 vaccine for Aarav (ASHA00128)', 'SCHEDULED_VISIT', ?, 'PENDING', ?)
  `).run(dayIso(12), now);

  // Default accessibility & voice settings
  db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, preferred_language, voice_speed, high_contrast, large_text, offline_auto_sync, notifications_enabled, updated_at)
    VALUES ('user-asha-01', 'kn', 1.0, 0, 0, 1, 1, ?),
           ('user-sup-01', 'en', 1.0, 0, 0, 1, 1, ?),
           ('user-admin-01', 'en', 1.0, 0, 0, 1, 1, ?)
  `).run(now, now, now);
}

function seedConnectivityData(): void {
  const now = new Date().toISOString();
  const dayOffset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  // Ensure existing seeded ASHA worker has permanent unique ID ASHA-2026-0001
  db.prepare(
    `UPDATE workers SET asha_unique_id = 'ASHA-2026-0001' WHERE id = 'WORKER001' AND (asha_unique_id IS NULL OR asha_unique_id = '')`,
  ).run();

  const existingPatients = db
    .prepare(`SELECT COUNT(*) as cnt FROM patient_profiles`)
    .get() as { cnt: number };
  if (existingPatients.cnt > 0) return;

  const demoPassHash = hashPasscode('asha-demo-2026');
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, full_name, username, password_hash, role, preferred_language, account_status, avatar_url, created_at)
    VALUES (?, ?, ?, ?, 'PATIENT', ?, 'ACTIVE', NULL, ?)
  `);

  insertUser.run('user-pat-01', 'Lakshmi', 'patient01', demoPassHash, 'en', now);
  insertUser.run('user-pat-02', 'Rekha (Mother of Baby)', 'patient02', demoPassHash, 'en', now);
  insertUser.run('user-pat-03', 'Aarav (Parent: Meera)', 'patient03', demoPassHash, 'en', now);
  insertUser.run('user-pat-04', 'Kavya', 'patient04', demoPassHash, 'en', now);

  const insertPatient = db.prepare(`
    INSERT INTO patient_profiles (id, patient_unique_id, user_id, beneficiary_id, full_name, age, phone, locality, assigned_mode, consent_status, consent_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'GRANTED', ?, ?)
  `);

  insertPatient.run(
    'pat-001',
    'PAT-2026-0001',
    'user-pat-01',
    'ben-002',
    'Lakshmi',
    25,
    '+91 98450 11223',
    'Devanahalli Ward 4',
    'PREGNANCY',
    now,
    now,
  );
  insertPatient.run(
    'pat-002',
    'PAT-2026-0002',
    'user-pat-02',
    'ben-003',
    'Baby of Rekha',
    0,
    '+91 98450 22334',
    'Devanahalli Ward 4',
    'NEWBORN_CARE',
    now,
    now,
  );
  insertPatient.run(
    'pat-003',
    'PAT-2026-0003',
    'user-pat-03',
    'ben-004',
    'Aarav',
    1,
    '+91 98450 33445',
    'Devanahalli Ward 5',
    'VACCINATION',
    now,
    now,
  );
  insertPatient.run(
    'pat-004',
    'PAT-2026-0004',
    'user-pat-04',
    'ben-005',
    'Kavya',
    28,
    '+91 98450 44556',
    'Devanahalli Ward 5',
    'PREGNANCY',
    now,
    now,
  );

  // Connections: 3 Connected, 1 Pending request from Kavya
  const insertConn = db.prepare(`
    INSERT INTO asha_patient_connections (id, asha_worker_id, asha_unique_id, patient_id, patient_unique_id, assigned_mode, initiated_by, status, notes, requested_at, responded_at)
    VALUES (?, 'WORKER001', 'ASHA-2026-0001', ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertConn.run('conn-001', 'pat-001', 'PAT-2026-0001', 'PREGNANCY', 'ASHA_WORKER', 'CONNECTED', 'Registered during Ward 4 ANC home visit', now, now);
  insertConn.run('conn-002', 'pat-002', 'PAT-2026-0002', 'NEWBORN_CARE', 'ASHA_WORKER', 'CONNECTED', 'HBNC newborn follow-up connection', now, now);
  insertConn.run('conn-003', 'pat-003', 'PAT-2026-0003', 'VACCINATION', 'ASHA_WORKER', 'CONNECTED', 'Childhood immunisation schedule tracking', now, now);
  insertConn.run('conn-004', 'pat-004', 'PAT-2026-0004', 'PREGNANCY', 'PATIENT', 'PENDING', 'Requesting antenatal follow-up connection with Savitha Gowda', now, null);

  // Pregnancy records
  db.prepare(`
    INSERT INTO care_pregnancy_records (id, patient_id, asha_worker_id, pregnancy_stage, gestational_weeks, expected_delivery_date, blood_pressure, weight_kg, hemoglobin_g_dl, anc_visits_completed, ifa_tablets_status, risk_level, visit_notes, last_checkup_date, next_checkup_date, updated_at)
    VALUES (?, 'pat-001', 'WORKER001', 'Third Trimester', 28, ?, '116/76', 55.0, 11.4, 3, 'Taking daily', 'NORMAL', 'Fetal movements normal; advised iron-rich diet and rest.', ?, ?, ?)
  `).run('cpreg-001', dayOffset(84), dayOffset(-2), dayOffset(9), now);

  db.prepare(`
    INSERT INTO care_pregnancy_records (id, patient_id, asha_worker_id, pregnancy_stage, gestational_weeks, expected_delivery_date, blood_pressure, weight_kg, hemoglobin_g_dl, anc_visits_completed, ifa_tablets_status, risk_level, visit_notes, last_checkup_date, next_checkup_date, updated_at)
    VALUES (?, 'pat-004', 'WORKER001', 'Second Trimester', 20, ?, '118/78', 58.2, 10.8, 2, 'Supplied 30 tablets', 'MONITOR', 'Mild fatigue reported; repeat Hb test planned.', ?, ?, ?)
  `).run('cpreg-002', dayOffset(140), dayOffset(-5), dayOffset(7), now);

  // Newborn record
  db.prepare(`
    INSERT INTO care_newborn_records (id, patient_id, asha_worker_id, baby_name, mother_name, birth_date, birth_weight_kg, current_weight_kg, length_cm, temperature, feeding_status, hbnc_visits_completed, health_notes, next_checkup_date, updated_at)
    VALUES ('cnb-001', 'pat-002', 'WORKER001', 'Baby of Rekha', 'Rekha', ?, 2.8, 2.95, 49.5, '98.2 F', 'Exclusive breastfeeding well', 3, 'Active cry, cord stump clean and dry.', ?, ?)
  `).run(dayOffset(-9), dayOffset(5), now);

  // Vaccination records for Aarav & Baby of Rekha
  const insertVacc = db.prepare(`
    INSERT INTO care_vaccination_records (id, patient_id, asha_worker_id, vaccine_name, dose_label, due_date, administered_date, status, notes, reminder_sent_at, updated_at)
    VALUES (?, ?, 'WORKER001', ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertVacc.run('cvacc-001', 'pat-003', 'BCG & OPV-0', 'Birth Dose', dayOffset(-90), dayOffset(-90), 'COMPLETED', 'Given at PHC Devanahalli', null, now);
  insertVacc.run('cvacc-002', 'pat-003', 'OPV-1 & Pentavalent-1', '6 Weeks', dayOffset(-45), dayOffset(-45), 'COMPLETED', 'No adverse reaction', null, now);
  insertVacc.run('cvacc-003', 'pat-003', 'PCV-1 & RVV-1', '6 Weeks Catch-up', dayOffset(3), null, 'PENDING', 'Scheduled at Ward 5 Anganwadi session', now, now);
  insertVacc.run('cvacc-004', 'pat-003', 'Pentavalent-2 & OPV-2', '10 Weeks', dayOffset(14), null, 'SCHEDULED', 'Upcoming 10-week session', null, now);
  insertVacc.run('cvacc-005', 'pat-002', 'BCG, OPV-0 & Hep-B', 'Birth Dose', dayOffset(-9), dayOffset(-9), 'COMPLETED', 'Administered at birth', null, now);
  insertVacc.run('cvacc-006', 'pat-002', 'OPV-1 & Pentavalent-1', '6 Weeks', dayOffset(33), null, 'SCHEDULED', 'Upcoming 6-week primary dose', null, now);

  // Scheduled Appointments & Reminders
  const insertAppt = db.prepare(`
    INSERT INTO care_appointments (id, patient_id, asha_worker_id, healthcare_mode, title, scheduled_date, scheduled_time, location, status, reminder_sent, notes, created_at)
    VALUES (?, ?, 'WORKER001', ?, ?, ?, ?, ?, 'SCHEDULED', 1, ?, ?)
  `);
  insertAppt.run('appt-001', 'pat-001', 'PREGNANCY', '3rd Trimester ANC Checkup & Hb Review', dayOffset(9), '10:00 AM', 'Devanahalli PHC', 'Bring MCP card and IFA strip', now);
  insertAppt.run('appt-002', 'pat-002', 'NEWBORN_CARE', 'HBNC Day-14 Growth & Weight Check', dayOffset(5), '11:30 AM', 'Home Visit · Ward 4', 'Weight & exclusive breastfeeding assessment', now);
  insertAppt.run('appt-003', 'pat-003', 'VACCINATION', 'PCV-1 & RVV-1 Immunisation Session', dayOffset(3), '09:30 AM', 'Ward 5 Anganwadi Center', 'Bring vaccination card', now);

  // Two-way Assistance Request
  db.prepare(`
    INSERT INTO assistance_requests (id, connection_id, patient_id, asha_worker_id, healthcare_mode, subject, message, urgency, status, asha_response, responded_at, created_at)
    VALUES ('assist-001', 'conn-001', 'pat-001', 'WORKER001', 'PREGNANCY', 'IFA tablet refill & mild leg swelling', 'Namaskara Savitha akka, my IFA tablets will finish in 3 days and I notice slight ankle swelling in the evening.', 'NORMAL', 'OPEN', NULL, NULL, ?)
  `).run(now);

  // Notifications for ASHA Worker & Patient
  const insertNotif = db.prepare(`
    INSERT INTO care_notifications (id, recipient_user_id, sender_name, notification_type, title, message, related_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);
  insertNotif.run('notif-001', 'user-asha-01', 'Kavya (PAT-2026-0004)', 'CONNECTION_REQUEST', 'New Patient Connection Request', 'Kavya (PAT-2026-0004) requested to connect with you for Pregnancy Mode.', 'conn-004', now);
  insertNotif.run('notif-002', 'user-asha-01', 'Lakshmi (PAT-2026-0001)', 'ASSISTANCE_REQUEST', 'Patient Assistance Request', 'Lakshmi asked about IFA tablet refill & mild leg swelling.', 'assist-001', now);
  insertNotif.run('notif-003', 'user-pat-01', 'Savitha Gowda (ASHA-2026-0001)', 'ANC_REMINDER', 'Upcoming Antenatal Checkup Reminder', `Your 3rd Trimester ANC Checkup is scheduled on ${dayOffset(9)} at 10:00 AM.`, 'appt-001', now);
  insertNotif.run('notif-004', 'user-pat-03', 'Savitha Gowda (ASHA-2026-0001)', 'VACCINATION_REMINDER', 'Upcoming Vaccination Due: PCV-1 & RVV-1', `PCV-1 & RVV-1 due on ${dayOffset(3)} at Ward 5 Anganwadi Center.`, 'cvacc-003', now);
}

function seedEnhancementData(): void {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR IGNORE INTO emergency_contacts (
      worker_id, worker_phone, backup_phone, phc_name, phc_phone,
      ambulance_number, supervisor_name, supervisor_phone, district_helpline,
      emergency_instructions, updated_at
    ) VALUES (
      'WORKER001', '+91 98450 77881', '+91 98450 77882',
      'Devanahalli Block Primary Health Centre (PHC)', '+91 80 2768 2108',
      '108', 'Dr. Kavitha Rao (PHC Medical Officer)', '+91 98450 90108', '104',
      'In case of obstetric bleeding, convulsions, BP >= 140/90, or newborn fast breathing, call 108 Ambulance and alert Devanahalli PHC immediately.',
      ?
    )
  `).run(now);

  // Set sample family emergency contacts on seeded patients if missing
  db.prepare(`
    UPDATE patient_profiles
    SET emergency_contact_name = COALESCE(emergency_contact_name, 'Ramesh (Spouse)'),
        emergency_contact_relation = COALESCE(emergency_contact_relation, 'Spouse'),
        emergency_contact_phone = COALESCE(emergency_contact_phone, '+91 98450 55110')
    WHERE id = 'pat-001'
  `).run();

  db.prepare(`
    UPDATE patient_profiles
    SET emergency_contact_name = COALESCE(emergency_contact_name, 'Suresh (Father)'),
        emergency_contact_relation = COALESCE(emergency_contact_relation, 'Father'),
        emergency_contact_phone = COALESCE(emergency_contact_phone, '+91 98450 55220')
    WHERE id IN ('pat-002', 'pat-003', 'pat-004')
  `).run();
}


