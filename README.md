# ASHA Voice Register AI

**Intelligent Voice-Based Healthcare Field Registration System**

ASHA Voice Register AI enables Accredited Social Health Activist (ASHA) workers to complete maternal, newborn, and immunisation home-visit registrations purely through natural multilingual speech—with zero typing required during the household visit.

---

## 1. Problem Statement & Solution

ASHA workers conduct daily home visits to monitor pregnant women, newborns, and children requiring immunisations. Manual entry into paper registers or English-centric mobile forms causes delayed updates, transcription errors, and missed follow-up schedules.

**End-to-End Voice Journey:**
`ASHA SPEAKS -> AI LISTENS -> UNDERSTANDS -> CREATES RECORD -> DETECTS DANGER SIGNS -> READS BACK -> ACCEPTS VOICE CORRECTION -> SAVES -> GENERATES FOLLOW-UPS`

---

## 2. Core Features

- **12 Indian Languages + Code-Mixing**: Kannada (`kn`), Hindi (`hi`), Tamil (`ta`), Telugu (`te`), Malayalam (`ml`), Marathi (`mr`), Bengali (`bn`), Gujarati (`gu`), Punjabi (`pa`), Odia (`or`), Assamese (`as`), and English (`en`)—with mixed-language medical vocabulary normalisation (`ANC checkup`, `IFA goli`, `TT/Td injection`, `BCG`, `OPV`, `Pentavalent`, `PHC`, `ANM`).
- **Real-Time Audio & Streaming Pipeline**: Browser `MediaDevices` + Web Audio `AnalyserNode` live waveform + VAD endpointing + WebSocket `/ws/voice` (`gemini-3.5-transcribe-live`) + `gemini-3.5-transcribe` chunk transcription + `gemini-3.8-flash-lite-tts` voice read-back with **barge-in interruption**.
- **Deterministic Danger-Sign Escalation**: Parallel rule-based danger-sign engine with clause-level negation detection (e.g., `"Mother has no bleeding"` is verified safe; `"Mother has vaginal bleeding"` or `"Newborn has high fever and is not feeding"` immediately interrupts the flow, announces urgent PHC referral in the worker's language, and persists an auditable referral record).
- **Voice Read-Back & Correction Engine**: Reads extracted records aloud before saving; supports natural spoken corrections (`"No, weight is 2.8 kilo, not 3.8"`, `"No, change the next visit date to 5 December"`, `"Repeat the entire record"`) while preserving previously confirmed fields.
- **Automatic Follow-Up Generation**: Generates prioritised follow-up tasks (`IMMEDIATE_REFERRAL`, `SCHEDULED_VISIT`, `PENDING_INFORMATION`, `ROUTINE_FOLLOWUP`) without inventing missing dates.
- **Offline Draft Resilience & Idempotency**: Locally queues un-synced visits and safety alerts when connectivity drops, using `clientRequestId` idempotency keys to prevent duplicate saves.
- **Supervisor & Admin Console**: Role-based access control (`ASHA_WORKER`, `SUPERVISOR`, `ADMIN`), multi-criteria filters (Worker, Household, Visit Category, Date Range, Referral Status), PHC referral acknowledgement, official guideline citations, configurable data retention, security audit logs, and real measured latency metrics (TTFA P50/P95).

---

## 3. System Architecture & Data Flow Diagrams

### System Architecture
```
+-------------------------------------------------------------------+
| ASHA Android Smartphone / Browser (React 19 + TypeScript + PWA)   |
|  ├── MediaDevices Mic + Web Audio AnalyserNode + Energy VAD       |
|  ├── In-Memory Bearer Auth + Offline Draft Queue (localStorage)   |
|  └── WSS /ws/voice & HTTPS /api/*                                 |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Express + WebSocket Gateway (server.ts / server/app.ts)           |
|  ├── Security Middleware: CSP, Origin-Aware CORS, Rate Limiter    |
|  ├── Auth & RBAC: scrypt Password Hashing + HMAC-SHA256 JWT       |
|  ├── Speech Gateway (server/speech/geminiClient.ts)               |
|  │     ├── Streaming STT: gemini-3.5-transcribe-live / 3.5        |
|  │     ├── Structured NLP Extraction: gemini-4-hydrogen           |
|  │     └── Read-Back TTS: gemini-3.8-flash-lite-tts (24kHz WAV)   |
|  ├── Deterministic Clinical & Safety Engine (src/shared/)         |
|  │     ├── Danger-Sign Detection + Negation & Uncertainty Rules   |
|  │     └── Follow-Up Schedule Rules (NIS-2026.03)                 |
|  └── Relational SQLite Persistence (server/db/database.ts)        |
+-------------------------------------------------------------------+
```

### Voice Processing Data Flow
```
[Mic Audio] -> [AudioContext VAD & Waveform] -> [WSS /ws/voice or /api/voice/transcribe]
                                                          |
      +---------------------------------------------------+
      v                                                   v
[Parallel Deterministic Danger-Sign Check]      [Gemini 4 Hydrogen Extraction]
      |                                                   |
      +--> Positive? -> [Interrupt Flow -> Emergency Alert + /api/referrals/emergency + Urgent TTS]
      +--> Uncertain? -> [Pending Safety Clarification Prompt]
      +--> Safe/Negated -> [Structured Record Card -> TTS Read-Back -> Barge-In / Voice Correction -> Confirm -> POST /api/visits -> Auto Follow-Ups]
```

---

## 4. Database ER Diagram (17 Relational Tables)

```
users (id PK, username UNIQUE, role, preferred_language)
  └──< workers (id PK, user_id FK, worker_code UNIQUE, supervisor_id FK)
         ├──< voice_sessions (id PK, worker_id FK, language, time_to_first_audio_ms)
         │      └──< transcripts (id PK, voice_session_id FK, raw_transcript, processing_status)
         ├──< visits (id PK, client_request_id UNIQUE, beneficiary_id FK, worker_id FK, transcript_id FK)
         │      ├── pregnancy_records (id PK, visit_id UNIQUE FK)
         │      ├── newborn_records (id PK, visit_id UNIQUE FK)
         │      ├──< immunisation_records (id PK, visit_id FK)
         │      ├──< corrections (id PK, visit_id FK)
         │      ├──< danger_sign_events (id PK, visit_id FK, source_guideline_id FK)
         │      │      └──< referrals (id PK, visit_id FK, danger_event_id FK, worker_id FK)
         │      └──< followups (id PK, visit_id FK, beneficiary_id FK, worker_id FK)
households (id PK, household_code UNIQUE, locality)
  └──< beneficiaries (id PK, beneficiary_code UNIQUE, household_id FK, synthetic_data_flag)
guideline_versions (id PK, guideline_name, source_url, version, reviewed_by)
audit_logs (id PK, user_id, entity_type, entity_id, action, correlation_id)
retention_config (id PK, audio_retention_hours, transcript_retention_days, updated_by)
```

---

## 5. REST & WebSocket API Reference

| Endpoint | Method | Roles | Purpose |
|---|---|---|---|
| `/api/health` | `GET` | Public | Server health, Gemini key status, language count |
| `/api/auth/login` | `POST` | Public | Verify `scrypt` passcode, return signed Bearer JWT |
| `/api/auth/demo` | `POST` | Public | Synthetic demo sign-in (`ASHA_WORKER`, `SUPERVISOR`, `ADMIN`) |
| `/api/auth/language` | `PATCH` | Any Auth | Update user's preferred spoken & UI language |
| `/api/beneficiaries` | `GET` | Any Auth | List synthetic beneficiary profiles (`ASHA00125`–`ASHA00130`) |
| `/api/voice/session/start` | `POST` | Any Auth | Open auditable voice session |
| `/api/voice/transcribe` | `POST` | Any Auth | Chunk audio transcription via `gemini-3.5-transcribe` |
| `/api/voice/tts` | `POST` | Any Auth | Synthesize read-back or emergency WAV via `gemini-3.8-flash-lite-tts` |
| `/api/voice/extract` | `POST` | Any Auth | Structured extraction + parallel deterministic danger-sign check |
| `/api/voice/correct` | `POST` | Any Auth | Voice correction engine preserving confirmed fields |
| `/api/referrals/emergency` | `POST` | Any Auth | Immediate PHC danger-sign referral persistence |
| `/api/visits` | `POST` / `GET` | Any Auth | Idempotent visit save (`clientRequestId`) & RBAC-scoped history |
| `/api/followups` | `GET` | Any Auth | Prioritised follow-up tasks |
| `/api/followups/:id/complete` | `PATCH` | Any Auth | Mark follow-up task completed |
| `/api/referrals` | `GET` | Any Auth | List emergency referral escalations |
| `/api/referrals/:id/acknowledge` | `PATCH` | Supervisor, Admin | Acknowledge PHC referral |
| `/api/supervisor/overview` | `GET` | Supervisor, Admin | Aggregated KPIs & worker coverage |
| `/api/guidelines` | `GET` | Any Auth | Official clinical guideline versions & citations |
| `/api/admin/audit-logs` | `GET` | Supervisor, Admin | Correlated audit trail |
| `/api/admin/retention` | `GET` / `PATCH` | Supervisor, Admin | Configure audio & transcript retention policy |
| `/api/admin/retention/purge` | `POST` | Supervisor, Admin | Purge expired transcript texts per retention policy |
| `/api/metrics/evaluation` | `GET` | Any Auth | Real measured TTFA latencies & sample counts |
| `/ws/voice` | `WSS` | Any Auth | Real-time 16kHz PCM streaming STT + live danger-sign scan |

---

## 6. Official Clinical Guideline Citations

All deterministic danger-sign rules and immunisation schedules are grounded in official Government of India / National Health Mission references:

1. **National Health Mission – Samagra Shishu Bal Swasthya Karyakram (SSBSK) Operational Guidelines 2026**  
   https://nhm.gov.in/index4.php?lang=1&level=0&lid=825&linkid=521
2. **National Health Mission – ASHA Module 6: Skills That Save Lives**  
   https://nhm.gov.in/images/pdf/communitisation/asha/book-no-6.pdf
3. **National Health Mission – Comprehensive Emergency Obstetric and Newborn Care (CEmONC) Part 2 (2024)**  
   https://nhm.gov.in/images/pdf/programmes/maternal-health/guidelines/Revised_CEmONC_curriculum_2024-Part_2.pdf
4. **Government of India – National Immunisation Schedule (March 2026)**  
   https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/mar/doc2026317827201.pdf

---

## 7. Local Setup, Running, Testing & Docker Deployment

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (GEMINI_API_KEY, retention defaults)
cp .env.example .env

# 3. Run unit, safety, security, and API integration tests
npx --yes tsx --test src/shared/dangerSigns.test.ts src/shared/clinicalEngine.test.ts server/routes/api.test.ts

# 4. Run development server (port 3000)
npm run dev

# 5. Build & run production server
npm run build
npm start

# 6. Docker Compose deployment
docker compose up --build -d
```

---

## 8. Hackathon Demo Scenarios (1–10)

All scenarios can be tested via live microphone speech OR via the **Live Judge Test Utterances** drawer and **Quick Voice Correction Commands**:
1. **Pregnancy Visit**: `"Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November."`
2. **Newborn Visit**: `"Baby weight 2.8 kilo, baby is feeding properly, vaccination record checked."`
3. **Voice Correction**: `"No, weight is 2.8 kilo, not 3.8."`
4. **Pregnancy Danger Sign**: `"The pregnant woman Nandini ASHA00125 has vaginal bleeding."`
5. **Newborn Danger Sign**: `"The newborn ASHA00127 has high fever and is not feeding."`
6. **Background Noise / Unclear Speech**: `"Visited Kavya ASHA00129. Background noise unclear weight... ANC checkup done, no bleeding."`
7. **Kannada-English Code-Mixing**: `"Today Nandini ASHA00125 avarige ANC checkup agide, weight 52 kilo ide, IFA goli regular aagi togondiddare, TT injection complete agide."`
8. **Barge-In Correction**: Tap **Interrupt Read-Back & Speak** (or `"Change next visit to 5 December"`).
9. **Negation Safety Test**: `"Visited ASHA00126 Lakshmi. Mother has no bleeding. Weight is 54 kilo. Next visit on 29 November."`
10. **Network Interruption & Sync**: Toggle browser offline during save -> draft queues locally -> reconnect -> automatic idempotent sync.

---

## 9. Privacy, Safety & Known Limitations

- **Synthetic Data Only**: All preloaded profiles (`ASHA00125`–`ASHA00130`) are fictional synthetic records. Do not enter real patient PHI.
- **No Unapproved Clinical Advice**: The system never diagnoses conditions, prescribes medications, or advises delaying care when a danger sign is triggered.
- **Audio Retention**: Raw microphone audio is streamed solely for transcription and is not persisted by default (`AUDIO_RETENTION_HOURS=0`).
- **Live Speech Credential Requirement**: When `GEMINI_API_KEY` is absent in local environments, `/api/voice/tts` reports `{ available: false }` cleanly and falls back to browser `SpeechSynthesis`, while structured extraction uses the deterministic rule parser (`OFFLINE_DETERMINISTIC_PARSER`).
