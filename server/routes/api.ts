import crypto from 'node:crypto';
import express from 'express';
import {
  authenticateCredentials,
  lookupUserByUsername,
  requireAuth,
  requireRole,
  signAuthToken,
  type AuthenticatedRequest,
} from '../auth/authService';
import { db } from '../db/database';
import {
  extractStructuredVisitWithAI,
  isGeminiConfigured,
  processVoiceCorrectionWithAI,
  synthesizeSpeechWithGemini,
  transcribeAudioWithGemini,
} from '../speech/geminiClient';
import {
  isGnaniConfigured,
  synthesizeSpeechWithGnani,
  transcribeAudioWithGnani,
} from '../speech/gnaniClient';
import { generateFollowUpsFromRecord } from '../../src/shared/clinicalEngine';
import { detectDangerSigns } from '../../src/shared/dangerSigns';
import { getLanguageConfig, SUPPORTED_LANGUAGES } from '../../src/shared/languages';
import type {
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  VisitType,
} from '../../src/shared/types';
import { connectivityRouter } from './connectivity';
import { enhancementsRouter } from './enhancements';

export const apiRouter = express.Router();

// Sliding-window in-memory API rate limiter
function createRateLimiter(maxRequests: number, windowMs: number, bucketName: string) {
  const hits = new Map<string, number[]>();
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const key = `${bucketName}:${req.ip || 'local'}`;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({ error: 'Rate limit exceeded. Please wait briefly before retrying.' });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - recent.length)));
    next();
  };
}

function sanitizeText(input: string | null | undefined, maxLen = 2000): string {
  if (!input) return '';
  return input
    .replace(/<\s*\/?\s*(?:script|iframe|object|embed|style)[^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

apiRouter.use(createRateLimiter(240, 60_000, 'api-global'));
apiRouter.use('/auth/login', createRateLimiter(30, 60_000, 'auth-login'));
apiRouter.use('/auth/register', createRateLimiter(30, 60_000, 'auth-register'));
apiRouter.use('/voice', createRateLimiter(90, 60_000, 'voice-gateway'));
apiRouter.use(connectivityRouter);
apiRouter.use(enhancementsRouter);

function getBeneficiariesFromDb(): Beneficiary[] {
  const rows = db
    .prepare(
      `SELECT b.id, b.beneficiary_code, b.household_id, h.household_code, h.locality, h.synthetic_address,
              b.display_name, b.beneficiary_type, b.date_of_birth, b.mother_beneficiary_code, b.synthetic_data_flag
       FROM beneficiaries b
       JOIN households h ON b.household_id = h.id
       ORDER BY b.beneficiary_code ASC`,
    )
    .all() as Array<{
    id: string;
    beneficiary_code: string;
    household_id: string;
    household_code: string;
    locality: string;
    synthetic_address: string;
    display_name: string;
    beneficiary_type: Beneficiary['beneficiaryType'];
    date_of_birth: string | null;
    mother_beneficiary_code: string | null;
    synthetic_data_flag: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    beneficiaryCode: r.beneficiary_code,
    householdId: r.household_id,
    householdCode: r.household_code,
    locality: r.locality,
    syntheticAddress: r.synthetic_address,
    displayName: r.display_name,
    beneficiaryType: r.beneficiary_type,
    dateOfBirth: r.date_of_birth,
    motherBeneficiaryCode: r.mother_beneficiary_code,
    syntheticDataFlag: r.synthetic_data_flag === 1,
  }));
}

function recordAudit(userId: string, entityType: string, entityId: string, action: string): void {
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

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: isGeminiConfigured(),
    gnaniConfigured: isGnaniConfigured(),
    languagesSupported: SUPPORTED_LANGUAGES.length,
    timestamp: new Date().toISOString(),
  });
});

// Authentication endpoints
apiRouter.post('/auth/login', (req, res) => {
  const { username, passcode } = req.body as { username?: string; passcode?: string };
  if (!username || !passcode) {
    res.status(400).json({ error: 'Username and passcode are required' });
    return;
  }
  const result = authenticateCredentials(username, passcode);
  if (!result) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  recordAudit(result.user.id, 'USER', result.user.id, 'LOGIN');
  res.json(result);
});

apiRouter.post('/auth/demo', (req, res) => {
  const { role } = req.body as { role?: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT' };
  const usernameMap = {
    ASHA_WORKER: 'worker01',
    SUPERVISOR: 'supervisor01',
    ADMIN: 'admin01',
    PATIENT: 'patient01',
  };
  const targetUsername = usernameMap[role ?? 'ASHA_WORKER'] ?? 'worker01';
  const found = lookupUserByUsername(targetUsername);
  if (!found) {
    res.status(404).json({ error: 'Demo user account not found' });
    return;
  }
  const { passwordHash: _ignored, ...safeUser } = found;
  const token = signAuthToken({
    sub: safeUser.id,
    role: safeUser.role,
    workerId: safeUser.workerId,
  });
  recordAudit(safeUser.id, 'USER', safeUser.id, 'DEMO_MODE_SIGN_IN');
  res.json({ user: safeUser, token });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.authUser });
});

apiRouter.patch('/auth/language', requireAuth, (req: AuthenticatedRequest, res) => {
  const { language } = req.body as { language?: LanguageCode };
  if (!language || !SUPPORTED_LANGUAGES.some((l) => l.code === language)) {
    res.status(400).json({ error: 'Unsupported language code' });
    return;
  }
  db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(language, req.authUser!.id);
  res.json({ preferredLanguage: language });
});

// Authorised synthetic beneficiaries dataset
apiRouter.get('/beneficiaries', requireAuth, (_req, res) => {
  res.json({ beneficiaries: getBeneficiariesFromDb() });
});

// Voice session lifecycle
apiRouter.post('/voice/session/start', requireAuth, (req: AuthenticatedRequest, res) => {
  const { language } = req.body as { language?: LanguageCode };
  const sessionId = `vs-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const provider = isGnaniConfigured()
    ? 'gnani-vachana'
    : isGeminiConfigured()
      ? 'gemini-3.5-transcribe-live'
      : 'offline-rule-engine';
  db.prepare(
    `INSERT INTO voice_sessions (id, worker_id, language, provider, session_status, started_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
  ).run(sessionId, req.workerId ?? 'WORKER001', language ?? 'en', provider, now);
  res.json({
    sessionId,
    startedAt: now,
    geminiConfigured: isGeminiConfigured(),
    gnaniConfigured: isGnaniConfigured(),
  });
});

// Speech-to-Text endpoint (Gnani Vachana primary, Gemini fallback)
apiRouter.post('/voice/transcribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { base64Audio, mimeType, language, sessionId } = req.body as {
    base64Audio?: string;
    mimeType?: string;
    language?: LanguageCode;
    sessionId?: string;
  };
  if (!base64Audio || typeof base64Audio !== 'string') {
    res.status(400).json({ error: 'Audio payload is required' });
    return;
  }

  const targetLang = language ?? 'en';
  const targetMime = mimeType ?? 'audio/wav';
  const errors: string[] = [];

  if (isGnaniConfigured()) {
    try {
      const gnaniResult = await transcribeAudioWithGnani({
        base64Audio,
        mimeType: targetMime,
        language: targetLang,
      });
      if (gnaniResult.transcript) {
        if (sessionId) {
          db.prepare(`UPDATE voice_sessions SET session_status = 'TRANSCRIBED', provider = 'gnani-vachana' WHERE id = ?`).run(sessionId);
        }
        res.json(gnaniResult);
        return;
      }
      errors.push('Gnani STT returned empty transcript');
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gnani STT failed');
    }
  }

  if (isGeminiConfigured()) {
    try {
      const result = await transcribeAudioWithGemini({
        base64Audio,
        mimeType: targetMime,
        language: targetLang,
      });
      if (sessionId) {
        db.prepare(`UPDATE voice_sessions SET session_status = 'TRANSCRIBED' WHERE id = ?`).run(sessionId);
      }
      res.json(result);
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gemini STT failed');
    }
  }

  res.status(503).json({
    error: errors.join('; ') || 'No server speech transcription provider configured.',
  });
});

// Text-to-Speech endpoint (Gnani Vachana primary, Gemini fallback, browser SpeechSynthesis client fallback)
apiRouter.post('/voice/tts', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { text, language, urgent, speed, sessionId } = req.body as {
    text?: string;
    language?: LanguageCode;
    urgent?: boolean;
    speed?: number;
    sessionId?: string;
  };
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text is required for speech synthesis' });
    return;
  }

  const targetLang = language ?? 'en';
  const targetText = text.slice(0, 1200);
  const errors: string[] = [];

  if (isGnaniConfigured()) {
    try {
      const gnaniTts = await synthesizeSpeechWithGnani({
        text: targetText,
        language: targetLang,
        speed: urgent ? Math.max(1.0, Number(speed ?? 1.0)) : speed,
      });
      if (sessionId) {
        db.prepare(`UPDATE voice_sessions SET time_to_first_audio_ms = ? WHERE id = ?`).run(
          gnaniTts.latencyMs,
          sessionId,
        );
      }
      res.json({ available: true, ...gnaniTts });
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gnani TTS failed');
    }
  }

  if (isGeminiConfigured()) {
    try {
      const result = await synthesizeSpeechWithGemini({
        text: targetText,
        language: targetLang,
        urgent: Boolean(urgent),
      });
      if (sessionId) {
        db.prepare(`UPDATE voice_sessions SET time_to_first_audio_ms = ? WHERE id = ?`).run(
          result.latencyMs,
          sessionId,
        );
      }
      res.json({ available: true, ...result });
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gemini TTS failed');
    }
  }

  res.json({
    available: false,
    base64Wav: null,
    mimeType: null,
    latencyMs: 0,
    reason: errors.join('; ') || 'Server speech API key not configured; client browser SpeechSynthesis active.',
  });
});

// Structured extraction + parallel danger-sign detection
apiRouter.post('/voice/extract', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { transcript, visitType, language, selectedBeneficiaryCode, sessionId } = req.body as {
    transcript?: string;
    visitType?: VisitType | null;
    language?: LanguageCode;
    selectedBeneficiaryCode?: string | null;
    sessionId?: string;
  };

  if (!transcript || !transcript.trim()) {
    res.status(400).json({ error: 'Transcript is required' });
    return;
  }

  const beneficiaries = getBeneficiariesFromDb();
  const selectedBeneficiary = selectedBeneficiaryCode
    ? beneficiaries.find((b) => b.beneficiaryCode === selectedBeneficiaryCode) ?? null
    : null;

  const outcome = await extractStructuredVisitWithAI({
    transcript: transcript.trim(),
    visitType: visitType ?? null,
    language: language ?? 'en',
    workerId: req.workerId ?? 'WORKER001',
    beneficiaries,
    selectedBeneficiary,
  });

  if (sessionId) {
    db.prepare(`UPDATE voice_sessions SET ended_at = ?, session_status = 'EXTRACTED' WHERE id = ?`).run(
      new Date().toISOString(),
      sessionId,
    );
  }

  res.json(outcome);
});

// Voice correction endpoint
apiRouter.post('/voice/correct', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { record, correctionText } = req.body as {
    record?: StructuredVisitRecord;
    correctionText?: string;
  };
  if (!record || !correctionText) {
    res.status(400).json({ error: 'Record and correction text are required' });
    return;
  }
  const beneficiaries = getBeneficiariesFromDb();
  const outcome = await processVoiceCorrectionWithAI({
    record,
    correctionText,
    beneficiaries,
  });
  res.json(outcome);
});

// Immediate emergency danger-sign referral persistence (never blocked by form confirmation)
apiRouter.post('/referrals/emergency', requireAuth, (req: AuthenticatedRequest, res) => {
  const { beneficiaryCode, transcript, visitType, language } = req.body as {
    beneficiaryCode?: string | null;
    transcript?: string;
    visitType?: VisitType;
    language?: LanguageCode;
  };

  if (!transcript || !transcript.trim()) {
    res.status(400).json({ error: 'Triggering transcript is required' });
    return;
  }

  const analysis = detectDangerSigns(transcript, visitType ?? 'ANC');
  if (analysis.status !== 'positive_detected' || analysis.matches.length === 0) {
    res.status(400).json({ error: 'No approved positive danger sign detected in transcript' });
    return;
  }

  const beneficiaries = getBeneficiariesFromDb();
  const matchedBen = beneficiaryCode
    ? beneficiaries.find((b) => b.beneficiaryCode === beneficiaryCode)
    : undefined;

  const now = new Date().toISOString();
  const workerId = req.workerId ?? 'WORKER001';
  const createdReferrals: Array<{ id: string; dangerSignTitle: string; referralTimestamp: string }> = [];

  const tx = db.transaction(() => {
    for (const match of analysis.matches) {
      const eventId = `dse-${crypto.randomUUID()}`;
      const referralId = `ref-${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO danger_sign_events (id, visit_id, beneficiary_code, worker_id, danger_sign_code, danger_sign_title, source_guideline_id, matched_phrase, detection_method, confidence, confirmation_status, severity_category, detected_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED_EMERGENCY', ?, ?)`,
      ).run(
        eventId,
        matchedBen?.beneficiaryCode ?? beneficiaryCode ?? 'UNSPECIFIED',
        workerId,
        match.code,
        match.title,
        match.guidelineId,
        match.matchedPhrase,
        match.detectionMethod,
        match.confidence,
        match.severityCategory,
        now,
      );

      db.prepare(
        `INSERT INTO referrals (id, visit_id, danger_event_id, beneficiary_code, beneficiary_name, worker_id, referral_destination_type, referral_status, referral_timestamp, acknowledgement_status)
         VALUES (?, NULL, ?, ?, ?, ?, 'PHC', 'IMMEDIATE_ACTION_REQUIRED', ?, 'PENDING')`,
      ).run(
        referralId,
        eventId,
        matchedBen?.beneficiaryCode ?? beneficiaryCode ?? 'UNSPECIFIED',
        matchedBen?.displayName ?? 'Unidentified Beneficiary',
        workerId,
        now,
      );

      recordAudit(req.authUser!.id, 'REFERRAL', referralId, 'IMMEDIATE_PHC_ESCALATION');
      createdReferrals.push({
        id: referralId,
        dangerSignTitle: match.title,
        referralTimestamp: now,
      });
    }
  });

  tx();
  const langCfg = getLanguageConfig(language ?? 'en');
  res.status(201).json({
    referrals: createdReferrals,
    announcement: langCfg.emergencyAnnouncement,
    analysis,
  });
});

// Save explicitly confirmed visit record (with idempotency key to prevent duplicate submissions)
apiRouter.post('/visits', requireAuth, (req: AuthenticatedRequest, res) => {
  const { record, syncedFromOffline, ttfaMs } = req.body as {
    record?: StructuredVisitRecord;
    syncedFromOffline?: boolean;
    ttfaMs?: number | null;
  };

  if (!record || !record.clientRequestId) {
    res.status(400).json({ error: 'Valid structured visit record with clientRequestId is required' });
    return;
  }

  if (!['ANC', 'NEWBORN', 'IMMUNISATION'].includes(record.visitType)) {
    res.status(400).json({ error: 'Invalid visitType' });
    return;
  }

  if (!SUPPORTED_LANGUAGES.some((l) => l.code === record.language)) {
    res.status(400).json({ error: 'Unsupported language code' });
    return;
  }

  const sanitizedTranscript = sanitizeText(record.sourceTranscript, 4000);
  const sanitizedObservations = record.observations ? sanitizeText(record.observations, 2000) : null;
  const sanitizedPrecautions = record.precautions ? sanitizeText(record.precautions, 1000) : null;
  const sanitizedCondition = record.patientCondition ? sanitizeText(record.patientCondition, 500) : null;
  const normalizedRecord: StructuredVisitRecord = {
    ...record,
    ashaWorkerName: record.ashaWorkerName || req.authUser?.fullName || null,
    visitTime:
      record.visitTime ||
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    patientCondition: sanitizedCondition,
    precautions: sanitizedPrecautions,
    sourceTranscript: sanitizedTranscript,
    observations: sanitizedObservations,
  };

  if (
    normalizedRecord.confirmationStatus !== 'confirmed' &&
    normalizedRecord.confirmationStatus !== 'emergency_unconfirmed'
  ) {
    res.status(400).json({ error: 'Explicit worker confirmation is required before saving.' });
    return;
  }

  // Idempotency check
  const existing = db
    .prepare('SELECT id, structured_json FROM visits WHERE client_request_id = ?')
    .get(record.clientRequestId) as { id: string; structured_json: string } | undefined;

  if (existing) {
    res.status(200).json({
      visitId: existing.id,
      duplicatePrevented: true,
      followups: db.prepare('SELECT * FROM followups WHERE visit_id = ?').all(existing.id),
    });
    return;
  }

  const beneficiaries = getBeneficiariesFromDb();
  const ben = beneficiaries.find((b) => b.beneficiaryCode === record.beneficiaryId);
  if (!ben) {
    res.status(400).json({ error: 'Valid authorised beneficiary ID is required before saving.' });
    return;
  }

  const visitId = `visit-${crypto.randomUUID()}`;
  const sessionId = `vs-${crypto.randomUUID()}`;
  const transcriptId = `tr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const workerId = req.workerId ?? 'WORKER001';

  const generatedFollowups = generateFollowUpsFromRecord(visitId, record);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO voice_sessions (id, worker_id, language, provider, session_status, started_at, ended_at, time_to_first_audio_ms)
       VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, ?)`,
    ).run(
      sessionId,
      workerId,
      record.language,
      record.extractionSource === 'GEMINI_STRUCTURED_AI'
        ? 'gemini-3.5-transcribe-live'
        : 'offline-rule-engine',
      now,
      now,
      ttfaMs ?? null,
    );

    db.prepare(
      `INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
       VALUES (?, ?, ?, ?, 'CONFIRMED', ?)`,
    ).run(transcriptId, sessionId, normalizedRecord.sourceTranscript, normalizedRecord.language, now);

    const recordStatus =
      normalizedRecord.dangerSignStatus === 'positive_detected'
        ? 'EMERGENCY_REFERRAL'
        : syncedFromOffline
          ? 'SYNCED_FROM_OFFLINE'
          : 'SAVED';

    db.prepare(
      `INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      visitId,
      normalizedRecord.clientRequestId,
      ben.id,
      workerId,
      normalizedRecord.visitType,
      normalizedRecord.visitDate,
      normalizedRecord.language,
      transcriptId,
      recordStatus,
      normalizedRecord.confirmationStatus,
      normalizedRecord.dangerSignStatus,
      normalizedRecord.referralStatus,
      normalizedRecord.nextVisitDate,
      JSON.stringify(normalizedRecord),
      now,
      now,
    );

    if (record.visitType === 'ANC' && record.pregnancyDetails) {
      db.prepare(
        `INSERT INTO pregnancy_records (id, visit_id, gestational_age_weeks, weight_kg, blood_pressure, anc_status, ifa_status, td_status, reported_observations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `preg-${crypto.randomUUID()}`,
        visitId,
        record.pregnancyDetails.gestationalAgeWeeks,
        record.pregnancyDetails.weightKg,
        record.pregnancyDetails.bloodPressure,
        record.pregnancyDetails.ancStatus,
        record.pregnancyDetails.ifaStatus,
        record.pregnancyDetails.vaccinationStatus,
        record.observations,
      );
    } else if (record.visitType === 'NEWBORN' && record.newbornDetails) {
      db.prepare(
        `INSERT INTO newborn_records (id, visit_id, birth_date, age_days, birth_weight_kg, current_weight_kg, reported_temperature, feeding_observations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `nb-${crypto.randomUUID()}`,
        visitId,
        record.newbornDetails.birthDate,
        record.newbornDetails.ageDays,
        record.newbornDetails.birthWeightKg,
        record.newbornDetails.currentWeightKg,
        record.newbornDetails.reportedTemperature,
        record.newbornDetails.feedingObservations,
      );
    } else if (record.visitType === 'IMMUNISATION' && record.immunisationDetails) {
      const insertImm = db.prepare(
        `INSERT INTO immunisation_records (id, visit_id, vaccine_code, vaccination_status, vaccination_date, next_due_date, schedule_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const v of record.immunisationDetails.vaccinesGiven) {
        insertImm.run(
          `imm-${crypto.randomUUID()}`,
          visitId,
          v,
          'GIVEN',
          record.visitDate,
          record.nextVisitDate,
          record.immunisationDetails.scheduleVersion,
        );
      }
      for (const v of record.immunisationDetails.vaccinesDue) {
        insertImm.run(
          `imm-${crypto.randomUUID()}`,
          visitId,
          v,
          'DUE',
          null,
          record.nextVisitDate,
          record.immunisationDetails.scheduleVersion,
        );
      }
    }

    for (const corr of record.correctionHistory) {
      db.prepare(
        `INSERT INTO corrections (id, visit_id, field_name, previous_value, corrected_value, correction_source, corrected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `corr-${crypto.randomUUID()}`,
        visitId,
        corr.fieldName,
        corr.previousValue,
        corr.correctedValue,
        corr.correctionSource,
        corr.correctedAt,
      );
    }

    for (const match of record.dangerAnalysis.matches) {
      const eventId = `dse-${crypto.randomUUID()}`;
      db.prepare(
        `INSERT INTO danger_sign_events (id, visit_id, beneficiary_code, worker_id, danger_sign_code, danger_sign_title, source_guideline_id, matched_phrase, detection_method, confidence, confirmation_status, severity_category, detected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
      ).run(
        eventId,
        visitId,
        ben.beneficiaryCode,
        workerId,
        match.code,
        match.title,
        match.guidelineId,
        match.matchedPhrase,
        match.detectionMethod,
        match.confidence,
        match.severityCategory,
        match.detectedAt,
      );

      db.prepare(
        `INSERT INTO referrals (id, visit_id, danger_event_id, beneficiary_code, beneficiary_name, worker_id, referral_destination_type, referral_status, referral_timestamp, acknowledgement_status)
         VALUES (?, ?, ?, ?, ?, ?, 'PHC', 'IMMEDIATE_ACTION_REQUIRED', ?, 'PENDING')`,
      ).run(
        `ref-${crypto.randomUUID()}`,
        visitId,
        eventId,
        ben.beneficiaryCode,
        ben.displayName,
        workerId,
        now,
      );
    }

    const insertFu = db.prepare(
      `INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const fu of generatedFollowups) {
      insertFu.run(
        `fu-${crypto.randomUUID()}`,
        visitId,
        ben.id,
        workerId,
        fu.taskDescription,
        fu.priority,
        fu.dueDate,
        fu.taskStatus,
        now,
      );
    }

    recordAudit(req.authUser!.id, 'VISIT', visitId, 'SAVE_CONFIRMED_VISIT');
  });

  tx();

  const savedFollowups = db
    .prepare(
      `SELECT f.id, f.visit_id as visitId, f.beneficiary_id as beneficiaryId, b.display_name as beneficiaryName, b.beneficiary_code as beneficiaryCode,
              f.task_description as taskDescription, f.priority, f.due_date as dueDate, f.task_status as taskStatus, f.created_at as createdAt
       FROM followups f
       JOIN beneficiaries b ON f.beneficiary_id = b.id
       WHERE f.visit_id = ?`,
    )
    .all(visitId);

  res.status(201).json({
    visitId,
    duplicatePrevented: false,
    followups: savedFollowups,
  });
});

// Visits history (RBAC scoped)
apiRouter.get('/visits', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const rows = db
    .prepare(
      `SELECT v.id, v.beneficiary_id, b.beneficiary_code, b.display_name as beneficiary_name,
              h.household_code, h.locality,
              v.worker_id, u.full_name as worker_name, v.visit_type, v.visit_date, v.language,
              v.record_status, v.confirmation_status, v.danger_sign_status, v.referral_status,
              v.next_visit_date, v.structured_json, t.raw_transcript, v.created_at
       FROM visits v
       JOIN beneficiaries b ON v.beneficiary_id = b.id
       JOIN households h ON b.household_id = h.id
       JOIN workers w ON v.worker_id = w.id
       JOIN users u ON w.user_id = u.id
       LEFT JOIN transcripts t ON v.transcript_id = t.id
       ${isWorker ? 'WHERE v.worker_id = ?' : ''}
       ORDER BY v.created_at DESC`,
    )
    .all(...(isWorker ? [req.workerId ?? 'WORKER001'] : [])) as Array<{
    id: string;
    beneficiary_id: string;
    beneficiary_code: string;
    beneficiary_name: string;
    household_code: string;
    locality: string;
    worker_id: string;
    worker_name: string;
    visit_type: VisitType;
    visit_date: string;
    language: LanguageCode;
    record_status: string;
    confirmation_status: string;
    danger_sign_status: string;
    referral_status: string;
    next_visit_date: string | null;
    structured_json: string;
    raw_transcript: string | null;
    created_at: string;
  }>;

  const visits = rows.map((r) => ({
    id: r.id,
    beneficiaryId: r.beneficiary_id,
    beneficiaryCode: r.beneficiary_code,
    beneficiaryName: r.beneficiary_name,
    householdCode: r.household_code,
    locality: r.locality,
    workerId: r.worker_id,
    workerName: r.worker_name,
    visitType: r.visit_type,
    visitDate: r.visit_date,
    language: r.language,
    recordStatus: r.record_status,
    confirmationStatus: r.confirmation_status,
    dangerSignStatus: r.danger_sign_status,
    referralStatus: r.referral_status,
    nextVisitDate: r.next_visit_date,
    structuredPayload: JSON.parse(r.structured_json),
    rawTranscript: r.raw_transcript ?? '',
    createdAt: r.created_at,
  }));

  res.json({ visits });
});

// Follow-ups
apiRouter.get('/followups', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const rows = db
    .prepare(
      `SELECT f.id, f.visit_id as visitId, f.beneficiary_id as beneficiaryId,
              b.display_name as beneficiaryName, b.beneficiary_code as beneficiaryCode,
              f.task_description as taskDescription, f.priority, f.due_date as dueDate,
              f.task_status as taskStatus, f.created_at as createdAt
       FROM followups f
       JOIN beneficiaries b ON f.beneficiary_id = b.id
       ${isWorker ? 'WHERE f.worker_id = ?' : ''}
       ORDER BY
         CASE f.priority
           WHEN 'IMMEDIATE_REFERRAL' THEN 1
           WHEN 'HIGH_PRIORITY_REFERRAL' THEN 2
           WHEN 'SCHEDULED_VISIT' THEN 3
           WHEN 'PENDING_INFORMATION' THEN 4
           ELSE 5
         END,
         f.created_at DESC`,
    )
    .all(...(isWorker ? [req.workerId ?? 'WORKER001'] : []));

  res.json({ followups: rows });
});

apiRouter.patch('/followups/:id/complete', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const info = db
    .prepare(`UPDATE followups SET task_status = 'COMPLETED' WHERE id = ?`)
    .run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Follow-up task not found' });
    return;
  }
  recordAudit(req.authUser!.id, 'FOLLOWUP', id, 'MARK_COMPLETED');
  res.json({ id, taskStatus: 'COMPLETED' });
});

// Referrals
apiRouter.get('/referrals', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const rows = db
    .prepare(
      `SELECT r.id, r.visit_id as visitId, r.beneficiary_code as beneficiaryCode, r.beneficiary_name as beneficiaryName,
              u.full_name as workerName, d.danger_sign_code as dangerSignCode, d.danger_sign_title as dangerSignTitle,
              d.matched_phrase as matchedPhrase, d.source_guideline_id as sourceGuidelineId,
              r.referral_destination_type as referralDestinationType, r.referral_status as referralStatus,
              r.acknowledgement_status as acknowledgementStatus, r.referral_timestamp as referralTimestamp
       FROM referrals r
       JOIN danger_sign_events d ON r.danger_event_id = d.id
       JOIN workers w ON r.worker_id = w.id
       JOIN users u ON w.user_id = u.id
       ${isWorker ? 'WHERE r.worker_id = ?' : ''}
       ORDER BY r.referral_timestamp DESC`,
    )
    .all(...(isWorker ? [req.workerId ?? 'WORKER001'] : []));

  res.json({ referrals: rows });
});

apiRouter.patch(
  '/referrals/:id/acknowledge',
  requireAuth,
  requireRole('SUPERVISOR', 'ADMIN'),
  (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const info = db
      .prepare(
        `UPDATE referrals SET referral_status = 'ACKNOWLEDGED', acknowledgement_status = 'ACKNOWLEDGED_BY_PHC' WHERE id = ?`,
      )
      .run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Referral not found' });
      return;
    }
    recordAudit(req.authUser!.id, 'REFERRAL', id, 'PHC_SUPERVISOR_ACKNOWLEDGED');
    res.json({ id, acknowledgementStatus: 'ACKNOWLEDGED_BY_PHC' });
  },
);

// Supervisor overview
apiRouter.get(
  '/supervisor/overview',
  requireAuth,
  requireRole('SUPERVISOR', 'ADMIN'),
  (_req, res) => {
    const counts = db
      .prepare(
        `SELECT
           COUNT(*) as totalVisits,
           SUM(CASE WHEN visit_type = 'ANC' THEN 1 ELSE 0 END) as ancVisits,
           SUM(CASE WHEN visit_type = 'NEWBORN' THEN 1 ELSE 0 END) as newbornVisits,
           SUM(CASE WHEN visit_type = 'IMMUNISATION' THEN 1 ELSE 0 END) as immunisationVisits
         FROM visits`,
      )
      .get() as {
      totalVisits: number;
      ancVisits: number | null;
      newbornVisits: number | null;
      immunisationVisits: number | null;
    };

    const pendingFollowups = (
      db.prepare(`SELECT COUNT(*) as cnt FROM followups WHERE task_status = 'PENDING'`).get() as {
        cnt: number;
      }
    ).cnt;

    const pendingReferrals = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM referrals WHERE acknowledgement_status = 'PENDING'`)
        .get() as { cnt: number }
    ).cnt;

    const workerActivity = db
      .prepare(
        `SELECT w.id as workerId, u.full_name as workerName, w.worker_code as workerCode, w.assigned_area as assignedArea,
                COUNT(v.id) as visitsCount
         FROM workers w
         JOIN users u ON w.user_id = u.id
         LEFT JOIN visits v ON v.worker_id = w.id
         WHERE u.role = 'ASHA_WORKER'
         GROUP BY w.id`,
      )
      .all();

    res.json({
      totalVisits: counts.totalVisits ?? 0,
      ancVisits: counts.ancVisits ?? 0,
      newbornVisits: counts.newbornVisits ?? 0,
      immunisationVisits: counts.immunisationVisits ?? 0,
      pendingFollowups,
      pendingReferrals,
      workerActivity,
    });
  },
);

// Official Clinical Guidelines & Admin Audit Logs
apiRouter.get('/guidelines', requireAuth, (_req, res) => {
  const guidelines = db
    .prepare(
      `SELECT id, guideline_name as guidelineName, source_url as sourceUrl, page_or_section as pageOrSection,
              version, effective_date as effectiveDate, reviewed_by as reviewedBy, reviewed_at as reviewedAt,
              active_status as activeStatus
       FROM guideline_versions`,
    )
    .all();
  res.json({ guidelines });
});

apiRouter.get(
  '/admin/audit-logs',
  requireAuth,
  requireRole('ADMIN', 'SUPERVISOR'),
  (_req, res) => {
    const logs = db
      .prepare(
        `SELECT a.id, a.user_id as userId, u.full_name as userName, a.entity_type as entityType,
                a.entity_id as entityId, a.action, a.timestamp, a.correlation_id as correlationId
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.timestamp DESC
         LIMIT 50`,
      )
      .all();
    res.json({ logs });
  },
);

// Audio & Transcript Retention Configuration (RBAC protected)
apiRouter.get(
  '/admin/retention',
  requireAuth,
  requireRole('ADMIN', 'SUPERVISOR'),
  (_req, res) => {
    const row = db
      .prepare(
        `SELECT audio_retention_hours as audioRetentionHours,
                transcript_retention_days as transcriptRetentionDays,
                external_provider_disclosure as externalProviderDisclosure,
                updated_by as updatedBy,
                updated_at as updatedAt
         FROM retention_config
         WHERE id = 'default'`,
      )
      .get();
    res.json({ retention: row });
  },
);

apiRouter.patch(
  '/admin/retention',
  requireAuth,
  requireRole('ADMIN', 'SUPERVISOR'),
  (req: AuthenticatedRequest, res) => {
    const { audioRetentionHours, transcriptRetentionDays } = req.body as {
      audioRetentionHours?: number;
      transcriptRetentionDays?: number;
    };
    const hours = Number(audioRetentionHours);
    const days = Number(transcriptRetentionDays);
    if (!Number.isInteger(hours) || hours < 0 || hours > 720) {
      res.status(400).json({ error: 'audioRetentionHours must be an integer between 0 and 720' });
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      res.status(400).json({ error: 'transcriptRetentionDays must be an integer between 1 and 3650' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE retention_config
       SET audio_retention_hours = ?, transcript_retention_days = ?, updated_by = ?, updated_at = ?
       WHERE id = 'default'`,
    ).run(hours, days, req.authUser!.fullName, now);

    recordAudit(req.authUser!.id, 'RETENTION_CONFIG', 'default', `SET_RETENTION_${hours}H_${days}D`);
    const updated = db
      .prepare(
        `SELECT audio_retention_hours as audioRetentionHours,
                transcript_retention_days as transcriptRetentionDays,
                external_provider_disclosure as externalProviderDisclosure,
                updated_by as updatedBy,
                updated_at as updatedAt
         FROM retention_config WHERE id = 'default'`,
      )
      .get();
    res.json({ retention: updated });
  },
);

apiRouter.post(
  '/admin/retention/purge',
  requireAuth,
  requireRole('ADMIN', 'SUPERVISOR'),
  (req: AuthenticatedRequest, res) => {
    const cfg = db
      .prepare('SELECT transcript_retention_days as days FROM retention_config WHERE id = ?')
      .get('default') as { days: number } | undefined;
    const days = cfg?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const result = db
      .prepare(
        `UPDATE transcripts
         SET raw_transcript = '[PURGED BY RETENTION POLICY]', processing_status = 'PURGED'
         WHERE created_at < ? AND processing_status != 'PURGED'`,
      )
      .run(cutoff);
    recordAudit(req.authUser!.id, 'RETENTION_PURGE', 'transcripts', `PURGED_${result.changes}_RECORDS`);
    res.json({ purgedCount: result.changes, cutoffIso: cutoff });
  },
);

// Real measured Evaluation Metrics (never fabricated)
apiRouter.get('/metrics/evaluation', requireAuth, (_req, res) => {
  const completedVisits = (db.prepare('SELECT COUNT(*) as cnt FROM visits').get() as { cnt: number }).cnt;
  const voiceSessionsCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM voice_sessions').get() as { cnt: number }
  ).cnt;
  const ttfaRows = db
    .prepare(
      'SELECT time_to_first_audio_ms as ms FROM voice_sessions WHERE time_to_first_audio_ms IS NOT NULL ORDER BY time_to_first_audio_ms ASC',
    )
    .all() as Array<{ ms: number }>;

  const values = ttfaRows.map((r) => r.ms);
  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const p50 = values.length > 0 ? values[Math.floor(values.length * 0.5)] : null;
  const p95 = values.length > 0 ? values[Math.min(values.length - 1, Math.floor(values.length * 0.95))] : null;

  const dangerSignEventsCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM danger_sign_events').get() as { cnt: number }
  ).cnt;
  const correctionsCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM corrections').get() as { cnt: number }
  ).cnt;
  const offlineSyncedCount = (
    db
      .prepare(`SELECT COUNT(*) as cnt FROM visits WHERE record_status = 'SYNCED_FROM_OFFLINE'`)
      .get() as { cnt: number }
  ).cnt;

  res.json({
    totalSamples: completedVisits,
    completedVisits,
    voiceSessionsCount,
    avgTimeToFirstAudioMs: avg,
    p50TimeToFirstAudioMs: p50,
    p95TimeToFirstAudioMs: p95,
    dangerSignEventsCount,
    correctionsCount,
    offlineSyncedCount,
    supportedLanguagesCount: SUPPORTED_LANGUAGES.length,
    providerName: isGnaniConfigured()
      ? isGeminiConfigured()
        ? 'Gnani Vachana STT/TTS + Gemini 4 Hydrogen'
        : 'Gnani Vachana STT/TTS + Deterministic Rule Engine'
      : isGeminiConfigured()
        ? 'Gemini 3.5 Transcribe + Gemini 4 Hydrogen + Gemini 3.8 TTS'
        : 'Offline Deterministic Rule Engine',
    knownLimitations: [
      'Offline fallback uses deterministic rule-based extraction and queues visits locally until connectivity returns.',
    ],
  });
});

// Helper to map visit DB rows cleanly
function queryVisitsScoped(isWorker: boolean, workerId: string) {
  const rows = db
    .prepare(
      `SELECT v.id, v.beneficiary_id, b.beneficiary_code, b.display_name as beneficiary_name,
              h.household_code, h.locality,
              v.worker_id, u.full_name as worker_name, v.visit_type, v.visit_date, v.language,
              v.record_status, v.confirmation_status, v.danger_sign_status, v.referral_status,
              v.next_visit_date, v.structured_json, t.raw_transcript, v.created_at
       FROM visits v
       JOIN beneficiaries b ON v.beneficiary_id = b.id
       JOIN households h ON b.household_id = h.id
       JOIN workers w ON v.worker_id = w.id
       JOIN users u ON w.user_id = u.id
       LEFT JOIN transcripts t ON v.transcript_id = t.id
       ${isWorker ? 'WHERE v.worker_id = ?' : ''}
       ORDER BY v.created_at DESC`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    beneficiary_id: string;
    beneficiary_code: string;
    beneficiary_name: string;
    household_code: string;
    locality: string;
    worker_id: string;
    worker_name: string;
    visit_type: VisitType;
    visit_date: string;
    language: LanguageCode;
    record_status: string;
    confirmation_status: string;
    danger_sign_status: string;
    referral_status: string;
    next_visit_date: string | null;
    structured_json: string;
    raw_transcript: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    beneficiaryId: r.beneficiary_id,
    beneficiaryCode: r.beneficiary_code,
    beneficiaryName: r.beneficiary_name,
    householdCode: r.household_code,
    locality: r.locality,
    workerId: r.worker_id,
    workerName: r.worker_name,
    visitType: r.visit_type,
    visitDate: r.visit_date,
    language: r.language,
    recordStatus: r.record_status,
    confirmationStatus: r.confirmation_status,
    dangerSignStatus: r.danger_sign_status,
    referralStatus: r.referral_status,
    nextVisitDate: r.next_visit_date,
    structuredPayload: JSON.parse(r.structured_json) as StructuredVisitRecord,
    rawTranscript: r.raw_transcript ?? '',
    createdAt: r.created_at,
  }));
}

function buildUnifiedAlerts(userId: string, isWorker: boolean, workerId: string) {
  const readSet = new Set(
    (
      db
        .prepare(`SELECT alert_id FROM alert_read_states WHERE user_id = ? AND is_read = 1`)
        .all(userId) as Array<{ alert_id: string }>
    ).map((r) => r.alert_id),
  );

  const referralRows = db
    .prepare(
      `SELECT r.id, r.visit_id as visitId, r.beneficiary_code as beneficiaryCode, r.beneficiary_name as beneficiaryName,
              d.danger_sign_title as dangerSignTitle, d.matched_phrase as matchedPhrase,
              r.acknowledgement_status as acknowledgementStatus, r.referral_timestamp as createdAt
       FROM referrals r
       JOIN danger_sign_events d ON r.danger_event_id = d.id
       ${isWorker ? 'WHERE r.worker_id = ?' : ''}
       ORDER BY r.referral_timestamp DESC`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    visitId: string | null;
    beneficiaryCode: string | null;
    beneficiaryName: string | null;
    dangerSignTitle: string;
    matchedPhrase: string;
    acknowledgementStatus: string;
    createdAt: string;
  }>;

  const urgentFollowups = db
    .prepare(
      `SELECT f.id, f.visit_id as visitId, b.beneficiary_code as beneficiaryCode, b.display_name as beneficiaryName,
              f.task_description as taskDescription, f.priority, f.due_date as dueDate, f.created_at as createdAt
       FROM followups f
       JOIN beneficiaries b ON f.beneficiary_id = b.id
       WHERE f.task_status = 'PENDING' AND f.priority IN ('IMMEDIATE_REFERRAL', 'HIGH_PRIORITY_REFERRAL', 'PENDING_INFORMATION')
       ${isWorker ? 'AND f.worker_id = ?' : ''}
       ORDER BY f.created_at DESC`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    visitId: string | null;
    beneficiaryCode: string | null;
    beneficiaryName: string | null;
    taskDescription: string;
    priority: string;
    dueDate: string | null;
    createdAt: string;
  }>;

  const alerts = [
    ...referralRows.map((r) => ({
      id: `ref:${r.id}`,
      sourceType: 'REFERRAL' as const,
      severity: 'CRITICAL' as const,
      title: `PHC Referral: ${r.dangerSignTitle}`,
      description: `Matched spoken phrase: "${r.matchedPhrase}"`,
      beneficiaryCode: r.beneficiaryCode,
      beneficiaryName: r.beneficiaryName,
      visitId: r.visitId,
      acknowledgementStatus: r.acknowledgementStatus,
      isRead: readSet.has(`ref:${r.id}`),
      createdAt: r.createdAt,
    })),
    ...urgentFollowups.map((f) => ({
      id: `fu:${f.id}`,
      sourceType: 'FOLLOWUP' as const,
      severity: f.priority === 'IMMEDIATE_REFERRAL' ? ('CRITICAL' as const) : ('WARNING' as const),
      title: f.priority === 'PENDING_INFORMATION' ? 'Missing Clinical Details' : 'Urgent Follow-up Action',
      description: f.taskDescription + (f.dueDate ? ` (Due ${f.dueDate})` : ''),
      beneficiaryCode: f.beneficiaryCode,
      beneficiaryName: f.beneficiaryName,
      visitId: f.visitId,
      acknowledgementStatus: 'PENDING',
      isRead: readSet.has(`fu:${f.id}`),
      createdAt: f.createdAt,
    })),
  ];

  alerts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return alerts;
}

// Create synthetic beneficiary profile
apiRouter.post('/beneficiaries', requireAuth, (req: AuthenticatedRequest, res) => {
  const { displayName, beneficiaryType, locality, syntheticAddress, dateOfBirth, motherBeneficiaryCode } =
    req.body as {
      displayName?: string;
      beneficiaryType?: Beneficiary['beneficiaryType'];
      locality?: string;
      syntheticAddress?: string;
      dateOfBirth?: string | null;
      motherBeneficiaryCode?: string | null;
    };

  const cleanName = sanitizeText(displayName, 80);
  if (!cleanName) {
    res.status(400).json({ error: 'Beneficiary name is required' });
    return;
  }
  const allowedTypes: Beneficiary['beneficiaryType'][] = ['PREGNANT_WOMAN', 'NEWBORN', 'CHILD'];
  const validType = allowedTypes.includes(beneficiaryType as Beneficiary['beneficiaryType'])
    ? (beneficiaryType as Beneficiary['beneficiaryType'])
    : 'PREGNANT_WOMAN';

  const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM beneficiaries').get() as { cnt: number }).cnt;
  const nextNum = 131 + existingCount;
  const beneficiaryCode = `ASHA00${nextNum}`;
  const householdCode = `HH-${100 + existingCount + 1}`;
  const householdId = `hh-${crypto.randomUUID().slice(0, 8)}`;
  const beneficiaryId = `ben-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const cleanLocality = sanitizeText(locality, 80) || 'Devanahalli Ward 4';
  const cleanAddr = sanitizeText(syntheticAddress, 160) || `Synthetic Household ${nextNum}, ${cleanLocality}`;

  db.prepare(
    `INSERT INTO households (id, household_code, locality, synthetic_address, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(householdId, householdCode, cleanLocality, cleanAddr, now);

  db.prepare(
    `INSERT INTO beneficiaries (id, beneficiary_code, household_id, display_name, beneficiary_type, date_of_birth, mother_beneficiary_code, synthetic_data_flag, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    beneficiaryId,
    beneficiaryCode,
    householdId,
    cleanName,
    validType,
    dateOfBirth ? sanitizeText(dateOfBirth, 20) : null,
    motherBeneficiaryCode ? sanitizeText(motherBeneficiaryCode, 30) : null,
    now,
  );

  recordAudit(req.authUser!.id, 'BENEFICIARY', beneficiaryId, `CREATE_SYNTHETIC_${beneficiaryCode}`);

  const created: Beneficiary = {
    id: beneficiaryId,
    beneficiaryCode,
    householdId,
    householdCode,
    locality: cleanLocality,
    syntheticAddress: cleanAddr,
    displayName: cleanName,
    beneficiaryType: validType,
    dateOfBirth: dateOfBirth ?? null,
    motherBeneficiaryCode: motherBeneficiaryCode ?? null,
    syntheticDataFlag: true,
  };

  res.status(201).json({ beneficiary: created });
});

// Dashboard Summary
apiRouter.get('/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const workerId = req.workerId ?? 'WORKER001';
  const allVisits = queryVisitsScoped(isWorker, workerId);
  const todayIso = new Date().toISOString().slice(0, 10);

  const followups = db
    .prepare(
      `SELECT f.id, f.visit_id as visitId, f.beneficiary_id as beneficiaryId,
              b.display_name as beneficiaryName, b.beneficiary_code as beneficiaryCode,
              f.task_description as taskDescription, f.priority, f.due_date as dueDate,
              f.task_status as taskStatus, f.created_at as createdAt
       FROM followups f
       JOIN beneficiaries b ON f.beneficiary_id = b.id
       ${isWorker ? 'WHERE f.worker_id = ?' : ''}
       ORDER BY f.due_date ASC, f.created_at DESC`,
    )
    .all(...(isWorker ? [workerId] : [])) as Array<{
    id: string;
    visitId: string;
    beneficiaryId: string;
    beneficiaryName: string;
    beneficiaryCode: string;
    taskDescription: string;
    priority: string;
    dueDate: string | null;
    taskStatus: 'PENDING' | 'COMPLETED';
    createdAt: string;
  }>;

  const alerts = buildUnifiedAlerts(req.authUser!.id, isWorker, workerId);
  const confirmedCount = allVisits.filter((v) => v.confirmationStatus === 'confirmed').length;
  const recordCompletionRate =
    allVisits.length > 0 ? Math.round((confirmedCount / allVisits.length) * 100) : 100;

  res.json({
    visitsCompleted: allVisits.length,
    ancCount: allVisits.filter((v) => v.visitType === 'ANC').length,
    newbornCount: allVisits.filter((v) => v.visitType === 'NEWBORN').length,
    immunisationCount: allVisits.filter((v) => v.visitType === 'IMMUNISATION').length,
    pendingFollowups: followups.filter((f) => f.taskStatus === 'PENDING').length,
    completedFollowups: followups.filter((f) => f.taskStatus === 'COMPLETED').length,
    alertEvents: alerts.filter((a) => a.severity === 'CRITICAL').length,
    pendingReferrals: alerts.filter((a) => a.sourceType === 'REFERRAL' && a.acknowledgementStatus === 'PENDING').length,
    recordCompletionRate,
    todayVisits: allVisits.filter((v) => v.visitDate === todayIso).length,
    recentVisits: allVisits.slice(0, 5),
    upcomingFollowups: followups.filter((f) => f.taskStatus === 'PENDING').slice(0, 5),
    recentAlerts: alerts.slice(0, 5),
  });
});

// Dashboard Analytics (Weekly / Monthly Recharts buckets)
apiRouter.get('/dashboard/analytics', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const workerId = req.workerId ?? 'WORKER001';
  const range = req.query.range === '30d' ? '30d' : '7d';
  const days = range === '30d' ? 30 : 7;

  const allVisits = queryVisitsScoped(isWorker, workerId);
  const bucketMap = new Map<string, { date: string; label: string; ANC: number; NEWBORN: number; IMMUNISATION: number; total: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    bucketMap.set(iso, { date: iso, label, ANC: 0, NEWBORN: 0, IMMUNISATION: 0, total: 0 });
  }

  let totalInRange = 0;
  let confirmedInRange = 0;
  let dangerInRange = 0;

  for (const v of allVisits) {
    const key = v.visitDate.slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) {
      if (v.visitType === 'ANC' || v.visitType === 'NEWBORN' || v.visitType === 'IMMUNISATION') {
        bucket[v.visitType] += 1;
      }
      bucket.total += 1;
      totalInRange += 1;
      if (v.confirmationStatus === 'confirmed') confirmedInRange += 1;
      if (v.dangerSignStatus === 'positive_detected') dangerInRange += 1;
    }
  }

  // If 30d, collapse into 5-day or keep clean points; keeping 14 or 30 points works nicely in Recharts
  const buckets = Array.from(bucketMap.values());
  res.json({
    range,
    buckets,
    completionRate: totalInRange > 0 ? Math.round((confirmedInRange / totalInRange) * 100) : 100,
    dangerSignRate: totalInRange > 0 ? Math.round((dangerInRange / totalInRange) * 100) : 0,
    totalInRange,
  });
});

// Save a Draft Visit explicitly (non-confirmed)
apiRouter.post('/visits/draft', requireAuth, (req: AuthenticatedRequest, res) => {
  const { record } = req.body as { record?: StructuredVisitRecord };
  if (!record || !record.clientRequestId) {
    res.status(400).json({ error: 'Valid structured visit record with clientRequestId is required' });
    return;
  }

  const beneficiaries = getBeneficiariesFromDb();
  const ben = beneficiaries.find((b) => b.beneficiaryCode === record.beneficiaryId) ?? beneficiaries[0];
  if (!ben) {
    res.status(400).json({ error: 'No beneficiary available for draft' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM visits WHERE client_request_id = ?')
    .get(record.clientRequestId) as { id: string } | undefined;

  const now = new Date().toISOString();
  const draftRecord: StructuredVisitRecord = {
    ...record,
    confirmationStatus: 'draft',
    sourceTranscript: sanitizeText(record.sourceTranscript, 4000),
    observations: record.observations ? sanitizeText(record.observations, 2000) : null,
  };

  if (existing) {
    db.prepare(
      `UPDATE visits SET next_visit_date = ?, structured_json = ?, updated_at = ? WHERE id = ?`,
    ).run(draftRecord.nextVisitDate, JSON.stringify(draftRecord), now, existing.id);
    res.json({ visitId: existing.id, recordStatus: 'DRAFT', updated: true });
    return;
  }

  const visitId = `visit-${crypto.randomUUID()}`;
  const transcriptId = `tr-${crypto.randomUUID()}`;
  const workerId = req.workerId ?? 'WORKER001';

  db.prepare(
    `INSERT INTO transcripts (id, voice_session_id, raw_transcript, language, processing_status, created_at)
     VALUES (?, NULL, ?, ?, 'DRAFT', ?)`,
  ).run(transcriptId, draftRecord.sourceTranscript, draftRecord.language, now);

  db.prepare(
    `INSERT INTO visits (id, client_request_id, beneficiary_id, worker_id, visit_type, visit_date, language, transcript_id, record_status, confirmation_status, danger_sign_status, referral_status, next_visit_date, structured_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'draft', ?, ?, ?, ?, ?, ?)`,
  ).run(
    visitId,
    draftRecord.clientRequestId,
    ben.id,
    workerId,
    draftRecord.visitType,
    draftRecord.visitDate,
    draftRecord.language,
    transcriptId,
    draftRecord.dangerSignStatus,
    draftRecord.referralStatus,
    draftRecord.nextVisitDate,
    JSON.stringify(draftRecord),
    now,
    now,
  );

  recordAudit(req.authUser!.id, 'VISIT', visitId, 'SAVE_DRAFT_VISIT');
  res.status(201).json({ visitId, recordStatus: 'DRAFT', updated: false });
});

// Single visit detail + PATCH update
apiRouter.get('/visits/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const visits = queryVisitsScoped(isWorker, req.workerId ?? 'WORKER001');
  const found = visits.find((v) => v.id === req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Visit record not found' });
    return;
  }
  res.json({ visit: found });
});

apiRouter.patch('/visits/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const row = db
    .prepare(`SELECT id, worker_id, structured_json, record_status FROM visits WHERE id = ?`)
    .get(id) as { id: string; worker_id: string; structured_json: string; record_status: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Visit record not found' });
    return;
  }
  if (req.authUser!.role === 'ASHA_WORKER' && row.worker_id !== (req.workerId ?? 'WORKER001')) {
    res.status(403).json({ error: 'Not authorised to modify another worker visit record' });
    return;
  }

  const { observations, nextVisitDate, confirmationStatus, structuredPayload } = req.body as {
    observations?: string | null;
    nextVisitDate?: string | null;
    confirmationStatus?: StructuredVisitRecord['confirmationStatus'];
    structuredPayload?: Partial<StructuredVisitRecord>;
  };

  const currentPayload = JSON.parse(row.structured_json) as StructuredVisitRecord;
  const updatedPayload: StructuredVisitRecord = {
    ...currentPayload,
    ...(structuredPayload ?? {}),
    observations:
      observations !== undefined
        ? observations
          ? sanitizeText(observations, 2000)
          : null
        : currentPayload.observations,
    nextVisitDate: nextVisitDate !== undefined ? nextVisitDate : currentPayload.nextVisitDate,
    confirmationStatus: confirmationStatus ?? currentPayload.confirmationStatus,
  };

  const now = new Date().toISOString();
  const nextStatus =
    updatedPayload.confirmationStatus === 'confirmed' && row.record_status === 'DRAFT'
      ? 'SAVED'
      : row.record_status;

  db.prepare(
    `UPDATE visits SET next_visit_date = ?, confirmation_status = ?, record_status = ?, structured_json = ?, updated_at = ? WHERE id = ?`,
  ).run(
    updatedPayload.nextVisitDate,
    updatedPayload.confirmationStatus,
    nextStatus,
    JSON.stringify(updatedPayload),
    now,
    id,
  );

  recordAudit(req.authUser!.id, 'VISIT', id, 'UPDATE_VISIT_DETAILS');
  res.json({ id, recordStatus: nextStatus, structuredPayload: updatedPayload });
});

// Create & Reschedule Follow-ups
apiRouter.post('/followups', requireAuth, (req: AuthenticatedRequest, res) => {
  const { visitId, beneficiaryCode, taskDescription, priority, dueDate } = req.body as {
    visitId?: string;
    beneficiaryCode?: string;
    taskDescription?: string;
    priority?: string;
    dueDate?: string | null;
  };

  const cleanDesc = sanitizeText(taskDescription, 400);
  if (!cleanDesc) {
    res.status(400).json({ error: 'Follow-up task description is required' });
    return;
  }

  const beneficiaries = getBeneficiariesFromDb();
  const ben =
    (beneficiaryCode && beneficiaries.find((b) => b.beneficiaryCode === beneficiaryCode)) ||
    beneficiaries[0];
  if (!ben) {
    res.status(400).json({ error: 'Valid beneficiary is required' });
    return;
  }

  const targetVisitRow = visitId
    ? (db.prepare(`SELECT id FROM visits WHERE id = ?`).get(visitId) as { id: string } | undefined)
    : (db.prepare(`SELECT id FROM visits ORDER BY created_at DESC LIMIT 1`).get() as { id: string } | undefined);

  if (!targetVisitRow) {
    res.status(400).json({ error: 'At least one visit record is required to attach a follow-up task' });
    return;
  }

  const id = `fu-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const validPriorities = [
    'IMMEDIATE_REFERRAL',
    'HIGH_PRIORITY_REFERRAL',
    'SCHEDULED_VISIT',
    'PENDING_INFORMATION',
    'ROUTINE_FOLLOWUP',
  ];
  const resolvedPriority = validPriorities.includes(priority ?? '') ? priority! : 'SCHEDULED_VISIT';

  db.prepare(
    `INSERT INTO followups (id, visit_id, beneficiary_id, worker_id, task_description, priority, due_date, task_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
  ).run(
    id,
    targetVisitRow.id,
    ben.id,
    req.workerId ?? 'WORKER001',
    cleanDesc,
    resolvedPriority,
    dueDate ? sanitizeText(dueDate, 20) : null,
    now,
  );

  recordAudit(req.authUser!.id, 'FOLLOWUP', id, 'CREATE_FOLLOWUP_TASK');
  res.status(201).json({
    followup: {
      id,
      visitId: targetVisitRow.id,
      beneficiaryId: ben.id,
      beneficiaryName: ben.displayName,
      beneficiaryCode: ben.beneficiaryCode,
      taskDescription: cleanDesc,
      priority: resolvedPriority,
      dueDate: dueDate ?? null,
      taskStatus: 'PENDING',
      createdAt: now,
    },
  });
});

apiRouter.patch('/followups/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { taskStatus, dueDate, taskDescription, remarks } = req.body as {
    taskStatus?: 'PENDING' | 'COMPLETED';
    dueDate?: string | null;
    taskDescription?: string;
    remarks?: string;
  };

  const existing = db.prepare(`SELECT * FROM followups WHERE id = ?`).get(id) as
    | { id: string; task_status: string; due_date: string | null; task_description: string; remarks: string | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Follow-up task not found' });
    return;
  }

  const nextStatus = taskStatus === 'COMPLETED' || taskStatus === 'PENDING' ? taskStatus : existing.task_status;
  const nextDue = dueDate !== undefined ? (dueDate ? sanitizeText(dueDate, 20) : null) : existing.due_date;
  const nextDesc = taskDescription ? sanitizeText(taskDescription, 400) : existing.task_description;
  const nextRemarks = remarks !== undefined ? sanitizeText(remarks, 300) : existing.remarks;

  db.prepare(
    `UPDATE followups SET task_status = ?, due_date = ?, task_description = ?, remarks = ? WHERE id = ?`,
  ).run(nextStatus, nextDue, nextDesc, nextRemarks, id);

  recordAudit(req.authUser!.id, 'FOLLOWUP', id, 'UPDATE_FOLLOWUP_TASK');
  res.json({ id, taskStatus: nextStatus, dueDate: nextDue, taskDescription: nextDesc, remarks: nextRemarks });
});

// Unified Alerts & Notification Read States
apiRouter.get('/alerts', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const alerts = buildUnifiedAlerts(req.authUser!.id, isWorker, req.workerId ?? 'WORKER001');
  res.json({
    alerts,
    unreadCount: alerts.filter((a) => !a.isRead).length,
  });
});

apiRouter.patch('/alerts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const alertId = decodeURIComponent(req.params.id);
  const { isRead } = req.body as { isRead?: boolean };
  const readFlag = isRead === false ? 0 : 1;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO alert_read_states (alert_id, user_id, is_read, read_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(alert_id, user_id) DO UPDATE SET is_read = excluded.is_read, read_at = excluded.read_at`,
  ).run(alertId, req.authUser!.id, readFlag, now);

  res.json({ id: alertId, isRead: readFlag === 1 });
});

// User Accessibility & Voice Settings
apiRouter.get('/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const row = db
    .prepare(
      `SELECT user_id as userId, preferred_language as preferredLanguage, voice_speed as voiceSpeed,
              high_contrast as highContrast, large_text as largeText, offline_auto_sync as offlineAutoSync,
              notifications_enabled as notificationsEnabled, updated_at as updatedAt
       FROM user_settings WHERE user_id = ?`,
    )
    .get(req.authUser!.id) as
    | {
        userId: string;
        preferredLanguage: LanguageCode;
        voiceSpeed: number;
        highContrast: number;
        largeText: number;
        offlineAutoSync: number;
        notificationsEnabled: number;
        updatedAt: string;
      }
    | undefined;

  if (!row) {
    res.json({
      settings: {
        userId: req.authUser!.id,
        preferredLanguage: req.authUser!.preferredLanguage,
        voiceSpeed: 1.0,
        highContrast: false,
        largeText: false,
        offlineAutoSync: true,
        notificationsEnabled: true,
        updatedAt: new Date().toISOString(),
      },
    });
    return;
  }

  res.json({
    settings: {
      userId: row.userId,
      preferredLanguage: row.preferredLanguage,
      voiceSpeed: row.voiceSpeed,
      highContrast: row.highContrast === 1,
      largeText: row.largeText === 1,
      offlineAutoSync: row.offlineAutoSync === 1,
      notificationsEnabled: row.notificationsEnabled === 1,
      updatedAt: row.updatedAt,
    },
  });
});

apiRouter.patch('/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const { preferredLanguage, voiceSpeed, highContrast, largeText, offlineAutoSync, notificationsEnabled } =
    req.body as {
      preferredLanguage?: LanguageCode;
      voiceSpeed?: number;
      highContrast?: boolean;
      largeText?: boolean;
      offlineAutoSync?: boolean;
      notificationsEnabled?: boolean;
    };

  const current = db
    .prepare(`SELECT * FROM user_settings WHERE user_id = ?`)
    .get(req.authUser!.id) as
    | {
        preferred_language: LanguageCode;
        voice_speed: number;
        high_contrast: number;
        large_text: number;
        offline_auto_sync: number;
        notifications_enabled: number;
      }
    | undefined;

  const nextLang =
    preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === preferredLanguage)
      ? preferredLanguage
      : current?.preferred_language ?? req.authUser!.preferredLanguage;

  const speed =
    typeof voiceSpeed === 'number' && voiceSpeed >= 0.7 && voiceSpeed <= 1.5
      ? Number(voiceSpeed.toFixed(2))
      : current?.voice_speed ?? 1.0;

  const nextHighContrast = highContrast !== undefined ? (highContrast ? 1 : 0) : current?.high_contrast ?? 0;
  const nextLargeText = largeText !== undefined ? (largeText ? 1 : 0) : current?.large_text ?? 0;
  const nextOfflineSync =
    offlineAutoSync !== undefined ? (offlineAutoSync ? 1 : 0) : current?.offline_auto_sync ?? 1;
  const nextNotifs =
    notificationsEnabled !== undefined ? (notificationsEnabled ? 1 : 0) : current?.notifications_enabled ?? 1;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO user_settings (user_id, preferred_language, voice_speed, high_contrast, large_text, offline_auto_sync, notifications_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       preferred_language = excluded.preferred_language,
       voice_speed = excluded.voice_speed,
       high_contrast = excluded.high_contrast,
       large_text = excluded.large_text,
       offline_auto_sync = excluded.offline_auto_sync,
       notifications_enabled = excluded.notifications_enabled,
       updated_at = excluded.updated_at`,
  ).run(req.authUser!.id, nextLang, speed, nextHighContrast, nextLargeText, nextOfflineSync, nextNotifs, now);

  if (preferredLanguage) {
    db.prepare(`UPDATE users SET preferred_language = ? WHERE id = ?`).run(nextLang, req.authUser!.id);
  }

  res.json({
    settings: {
      userId: req.authUser!.id,
      preferredLanguage: nextLang,
      voiceSpeed: speed,
      highContrast: nextHighContrast === 1,
      largeText: nextLargeText === 1,
      offlineAutoSync: nextOfflineSync === 1,
      notificationsEnabled: nextNotifs === 1,
      updatedAt: now,
    },
  });
});

// Reports Summary & CSV Export (RBAC scoped)
apiRouter.get('/reports/summary', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const visits = queryVisitsScoped(isWorker, req.workerId ?? 'WORKER001');
  const byType = {
    ANC: visits.filter((v) => v.visitType === 'ANC').length,
    NEWBORN: visits.filter((v) => v.visitType === 'NEWBORN').length,
    IMMUNISATION: visits.filter((v) => v.visitType === 'IMMUNISATION').length,
  };
  const bySafety = {
    CLEAR: visits.filter((v) => v.dangerSignStatus === 'none_detected').length,
    REFERRED: visits.filter((v) => v.dangerSignStatus === 'positive_detected').length,
    UNCERTAIN: visits.filter((v) => v.dangerSignStatus === 'uncertain_pending_safety').length,
  };
  res.json({ totalVisits: visits.length, byType, bySafety, visits });
});

apiRouter.get('/reports/export', requireAuth, (req: AuthenticatedRequest, res) => {
  const isWorker = req.authUser!.role === 'ASHA_WORKER';
  const visits = queryVisitsScoped(isWorker, req.workerId ?? 'WORKER001');

  const csvCell = (val: string | number | null | undefined) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const header = [
    'Visit ID',
    'Visit Date',
    'Beneficiary Code',
    'Beneficiary Name',
    'Household',
    'Visit Type',
    'Language',
    'Record Status',
    'Danger Sign Status',
    'Next Visit Date',
    'Worker',
  ].join(',');

  const lines = visits.map((v) =>
    [
      csvCell(v.id),
      csvCell(v.visitDate),
      csvCell(v.beneficiaryCode),
      csvCell(v.beneficiaryName),
      csvCell(v.householdCode),
      csvCell(v.visitType),
      csvCell(v.language),
      csvCell(v.recordStatus),
      csvCell(v.dangerSignStatus),
      csvCell(v.nextVisitDate),
      csvCell(v.workerName),
    ].join(','),
  );

  recordAudit(req.authUser!.id, 'REPORT', 'csv_export', `EXPORTED_${visits.length}_VISITS`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="asha-visit-register-report.csv"');
  res.send([header, ...lines].join('\n'));
});

