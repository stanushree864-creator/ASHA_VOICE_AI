import type {
  AlertItem,
  AshaConnectivityDashboard,
  AshaPatientConnection,
  AssistanceRequest,
  AuthUser,
  Beneficiary,
  CareAppointment,
  CareNotification,
  ConsentStatus,
  DashboardAnalytics,
  DashboardSummary,
  EmergencyContactDirectory,
  EvaluationMetricsSummary,
  FollowupTask,
  GuidelineCitation,
  HealthcareMode,
  LanguageCode,
  NewbornCareRecord,
  NewbornModePatientItem,
  PatientConnectivityPortal,
  PatientProfileRecord,
  PregnancyCareRecord,
  PregnancyModePatientItem,
  PregnancyRiskAssessment,
  QrResolvedPatientResponse,
  ReferralRecord,
  RetentionConfig,
  SavedVisitSummary,
  SmartFollowupSummary,
  StructuredVisitRecord,
  UserSettings,
  VaccinationCareRecord,
  VaccinationModePatientItem,
  VaccinationStatus,
  VisitType,
} from '../shared/types';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  health: () =>
    apiFetch<{ status: string; geminiConfigured: boolean; gnaniConfigured?: boolean; languagesSupported: number }>('/api/health'),

  login: (username: string, passcode: string) =>
    apiFetch<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, passcode }),
    }),

  demoSignIn: (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT') =>
    apiFetch<{ user: AuthUser; token: string }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  registerAccount: (payload: {
    fullName: string;
    username: string;
    passcode: string;
    role: 'ASHA_WORKER' | 'PATIENT';
    assignedArea?: string;
    preferredLanguage?: LanguageCode;
    assignedMode?: HealthcareMode;
    age?: number | null;
    phone?: string;
    locality?: string;
    consentGranted?: boolean;
  }) =>
    apiFetch<{ user: AuthUser; token: string; uniqueId: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateLanguage: (language: LanguageCode) =>
    apiFetch<{ preferredLanguage: LanguageCode }>('/api/auth/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    }),

  getBeneficiaries: () =>
    apiFetch<{ beneficiaries: Beneficiary[] }>('/api/beneficiaries'),

  createBeneficiary: (payload: {
    displayName: string;
    beneficiaryType: Beneficiary['beneficiaryType'];
    locality?: string;
    syntheticAddress?: string;
    dateOfBirth?: string | null;
  }) =>
    apiFetch<{ beneficiary: Beneficiary }>('/api/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDashboardSummary: () =>
    apiFetch<DashboardSummary>('/api/dashboard/summary'),

  getDashboardAnalytics: (range: '7d' | '30d' = '7d') =>
    apiFetch<DashboardAnalytics>(`/api/dashboard/analytics?range=${range}`),

  startVoiceSession: (language: LanguageCode) =>
    apiFetch<{ sessionId: string; startedAt: string; geminiConfigured: boolean; gnaniConfigured?: boolean }>(
      '/api/voice/session/start',
      {
        method: 'POST',
        body: JSON.stringify({ language }),
      },
    ),

  transcribeAudio: (payload: {
    base64Audio: string;
    mimeType: string;
    language: LanguageCode;
    sessionId?: string | null;
  }) =>
    apiFetch<{ transcript: string; detectedLanguage: string; latencyMs: number }>(
      '/api/voice/transcribe',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      25000,
    ),

  synthesizeSpeech: (payload: {
    text: string;
    language: LanguageCode;
    urgent?: boolean;
    speed?: number;
    sessionId?: string | null;
  }) =>
    apiFetch<{
      available?: boolean;
      base64Wav: string | null;
      mimeType: string | null;
      latencyMs: number;
      reason?: string;
    }>(
      '/api/voice/tts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      25000,
    ),

  extractVisit: (payload: {
    transcript: string;
    visitType?: VisitType | null;
    language: LanguageCode;
    selectedBeneficiaryCode?: string | null;
    sessionId?: string | null;
  }) =>
    apiFetch<{
      record: StructuredVisitRecord;
      ambiguityCandidates: Beneficiary[];
      latencyMs: number;
    }>('/api/voice/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  correctVisit: (record: StructuredVisitRecord, correctionText: string) =>
    apiFetch<{
      action: 'REPEAT_RECORD' | 'UPDATED_FIELD' | 'CONFIRM_SAVE' | 'NEEDS_CLARIFICATION';
      updatedField: string | null;
      updatedRecord: StructuredVisitRecord;
      spokenFeedback: string;
    }>('/api/voice/correct', {
      method: 'POST',
      body: JSON.stringify({ record, correctionText }),
    }),

  escalateEmergencyReferral: (payload: {
    beneficiaryCode?: string | null;
    transcript: string;
    visitType: VisitType;
    language: LanguageCode;
  }) =>
    apiFetch<{
      referrals: Array<{ id: string; dangerSignTitle: string; referralTimestamp: string }>;
      announcement: string;
    }>('/api/referrals/emergency', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveVisit: (payload: {
    record: StructuredVisitRecord;
    syncedFromOffline?: boolean;
    ttfaMs?: number | null;
  }) =>
    apiFetch<{
      visitId: string;
      duplicatePrevented: boolean;
      followups: FollowupTask[];
    }>('/api/visits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveVisitDraft: (record: StructuredVisitRecord) =>
    apiFetch<{ visitId: string; recordStatus: string; updated: boolean }>('/api/visits/draft', {
      method: 'POST',
      body: JSON.stringify({ record }),
    }),

  updateVisit: (
    id: string,
    payload: {
      observations?: string | null;
      nextVisitDate?: string | null;
      confirmationStatus?: StructuredVisitRecord['confirmationStatus'];
      structuredPayload?: Partial<StructuredVisitRecord>;
    },
  ) =>
    apiFetch<{ id: string; recordStatus: string; structuredPayload: StructuredVisitRecord }>(
      `/api/visits/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  getVisits: () => apiFetch<{ visits: SavedVisitSummary[] }>('/api/visits'),

  getFollowups: () => apiFetch<{ followups: FollowupTask[] }>('/api/followups'),

  createFollowup: (payload: {
    visitId?: string;
    beneficiaryCode?: string;
    taskDescription: string;
    priority?: string;
    dueDate?: string | null;
  }) =>
    apiFetch<{ followup: FollowupTask }>('/api/followups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateFollowup: (
    id: string,
    payload: {
      taskStatus?: 'PENDING' | 'COMPLETED';
      dueDate?: string | null;
      taskDescription?: string;
      remarks?: string;
    },
  ) =>
    apiFetch<{ id: string; taskStatus: string; dueDate: string | null }>(
      `/api/followups/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  completeFollowup: (id: string) =>
    apiFetch<{ id: string; taskStatus: 'COMPLETED' }>(`/api/followups/${encodeURIComponent(id)}/complete`, {
      method: 'PATCH',
    }),

  getReferrals: () => apiFetch<{ referrals: ReferralRecord[] }>('/api/referrals'),

  acknowledgeReferral: (id: string) =>
    apiFetch<{ id: string; acknowledgementStatus: string }>(
      `/api/referrals/${encodeURIComponent(id)}/acknowledge`,
      { method: 'PATCH' },
    ),

  getAlerts: () => apiFetch<{ alerts: AlertItem[]; unreadCount: number }>('/api/alerts'),

  markAlertRead: (id: string, isRead = true) =>
    apiFetch<{ id: string; isRead: boolean }>(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    }),

  getSettings: () => apiFetch<{ settings: UserSettings }>('/api/settings'),

  updateSettings: (payload: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>) =>
    apiFetch<{ settings: UserSettings }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  exportReportsCsv: async (): Promise<string> => {
    const headers = new Headers();
    if (inMemoryToken) headers.set('Authorization', `Bearer ${inMemoryToken}`);
    const res = await fetch('/api/reports/export', { headers });
    if (!res.ok) throw new Error('Failed to export CSV report');
    return res.text();
  },

  getSupervisorOverview: () =>
    apiFetch<{
      totalVisits: number;
      ancVisits: number;
      newbornVisits: number;
      immunisationVisits: number;
      pendingFollowups: number;
      pendingReferrals: number;
      workerActivity: Array<{
        workerId: string;
        workerName: string;
        workerCode: string;
        assignedArea: string;
        visitsCount: number;
      }>;
    }>('/api/supervisor/overview'),

  getGuidelines: () => apiFetch<{ guidelines: GuidelineCitation[] }>('/api/guidelines'),

  getAuditLogs: () =>
    apiFetch<{
      logs: Array<{
        id: string;
        userId: string;
        userName: string;
        entityType: string;
        entityId: string;
        action: string;
        timestamp: string;
        correlationId: string;
      }>;
    }>('/api/admin/audit-logs'),

  getRetentionConfig: () => apiFetch<{ retention: RetentionConfig }>('/api/admin/retention'),

  updateRetentionConfig: (audioRetentionHours: number, transcriptRetentionDays: number) =>
    apiFetch<{ retention: RetentionConfig }>('/api/admin/retention', {
      method: 'PATCH',
      body: JSON.stringify({ audioRetentionHours, transcriptRetentionDays }),
    }),

  purgeExpiredTranscripts: () =>
    apiFetch<{ purgedCount: number; cutoffIso: string }>('/api/admin/retention/purge', {
      method: 'POST',
    }),

  getEvaluationMetrics: () => apiFetch<EvaluationMetricsSummary>('/api/metrics/evaluation'),

  // ASHA-Patient Connectivity & Three Healthcare Modes
  getAshaConnectivityDashboard: () =>
    apiFetch<AshaConnectivityDashboard>('/api/connectivity/asha/dashboard'),

  registerAndConnectPatient: (payload: {
    fullName: string;
    username?: string;
    passcode?: string;
    age?: number | null;
    phone?: string;
    locality?: string;
    assignedMode: HealthcareMode;
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
  }) =>
    apiFetch<{ patient: PatientProfileRecord; username: string; patientUniqueId: string }>(
      '/api/connectivity/asha/register-patient',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  getPregnancyModePatients: () =>
    apiFetch<{ patients: PregnancyModePatientItem[] }>('/api/connectivity/modes/pregnancy'),

  updatePregnancyRecord: (
    patientId: string,
    payload: Partial<PregnancyCareRecord> & { sendReminder?: boolean },
  ) =>
    apiFetch<{ record: PregnancyCareRecord }>(
      `/api/connectivity/modes/pregnancy/${encodeURIComponent(patientId)}/record`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  scheduleModeAppointment: (
    patientId: string,
    payload: {
      title: string;
      scheduledDate: string;
      scheduledTime?: string;
      location?: string;
      notes?: string;
      sendReminder?: boolean;
      healthcareMode: HealthcareMode;
    },
  ) =>
    apiFetch<{ appointment: CareAppointment }>(
      `/api/connectivity/modes/pregnancy/${encodeURIComponent(patientId)}/appointments`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  getNewbornModePatients: () =>
    apiFetch<{ patients: NewbornModePatientItem[] }>('/api/connectivity/modes/newborn'),

  updateNewbornRecord: (
    patientId: string,
    payload: Partial<NewbornCareRecord> & { sendReminder?: boolean },
  ) =>
    apiFetch<{ record: NewbornCareRecord }>(
      `/api/connectivity/modes/newborn/${encodeURIComponent(patientId)}/record`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  getVaccinationModePatients: () =>
    apiFetch<{ patients: VaccinationModePatientItem[] }>('/api/connectivity/modes/vaccination'),

  addVaccinationRecord: (
    patientId: string,
    payload: {
      vaccineName: string;
      doseLabel?: string;
      dueDate: string;
      administeredDate?: string | null;
      status?: VaccinationStatus;
      notes?: string;
      sendReminder?: boolean;
    },
  ) =>
    apiFetch<{ vaccine: VaccinationCareRecord }>(
      `/api/connectivity/modes/vaccination/${encodeURIComponent(patientId)}/vaccines`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  updateVaccinationStatus: (
    recordId: string,
    payload: {
      status?: VaccinationStatus;
      administeredDate?: string | null;
      notes?: string;
      sendReminder?: boolean;
    },
  ) =>
    apiFetch<{ vaccine: VaccinationCareRecord }>(
      `/api/connectivity/modes/vaccination/records/${encodeURIComponent(recordId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  requestConnection: (payload: {
    ashaUniqueId?: string;
    patientUniqueId?: string;
    assignedMode?: HealthcareMode;
    notes?: string;
  }) =>
    apiFetch<{ connection: AshaPatientConnection }>('/api/connectivity/connections/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondToConnection: (connectionId: string, decision: 'APPROVE' | 'REJECT') =>
    apiFetch<{ connection: AshaPatientConnection }>(
      `/api/connectivity/connections/${encodeURIComponent(connectionId)}/respond`,
      { method: 'PATCH', body: JSON.stringify({ decision }) },
    ),

  getPatientPortalDashboard: () =>
    apiFetch<PatientConnectivityPortal>('/api/connectivity/patient/dashboard'),

  updatePatientConsent: (consentStatus: 'GRANTED' | 'WITHDRAWN') =>
    apiFetch<{ consentStatus: ConsentStatus; consentUpdatedAt: string }>(
      '/api/connectivity/patient/consent',
      { method: 'PATCH', body: JSON.stringify({ consentStatus }) },
    ),

  sendAssistanceRequest: (payload: {
    subject: string;
    message: string;
    urgency: 'NORMAL' | 'URGENT';
  }) =>
    apiFetch<{ request: AssistanceRequest }>('/api/connectivity/assistance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondAssistanceRequest: (
    requestId: string,
    payload: { ashaResponse: string; status?: 'RESPONDED' | 'RESOLVED' },
  ) =>
    apiFetch<{ request: AssistanceRequest }>(
      `/api/connectivity/assistance/${encodeURIComponent(requestId)}/respond`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  sendCareReminder: (payload: {
    patientId: string;
    notificationType: CareNotification['notificationType'];
    title: string;
    message: string;
  }) =>
    apiFetch<{ sent: boolean }>('/api/connectivity/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCareNotifications: () =>
    apiFetch<{ notifications: CareNotification[]; unreadCount: number }>(
      '/api/connectivity/notifications',
    ),

  markCareNotificationRead: (id: string) =>
    apiFetch<{ id: string; isRead: boolean }>(
      `/api/connectivity/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' },
    ),

  // --- Six New Field Enhancement Endpoints ---
  getPatientQrIdentity: (identifier: string) =>
    apiFetch<QrResolvedPatientResponse>(
      `/api/enhancements/qr/patient/${encodeURIComponent(identifier)}`,
    ),

  resolvePatientQrScan: (qrInput: string) =>
    apiFetch<QrResolvedPatientResponse>('/api/enhancements/qr/resolve', {
      method: 'POST',
      body: JSON.stringify({ qrInput }),
    }),

  getSmartFollowups: () =>
    apiFetch<SmartFollowupSummary>('/api/enhancements/smart-followups'),

  autoGenerateSmartFollowups: () =>
    apiFetch<{ createdCount: number; summary: SmartFollowupSummary }>(
      '/api/enhancements/smart-followups/auto-generate',
      { method: 'POST' },
    ),

  askMultilingualAssistant: (payload: {
    question: string;
    language: LanguageCode;
    contextSummary?: string;
  }) =>
    apiFetch<{
      reply: string;
      suggestedQuestions: string[];
      language: LanguageCode;
      modelUsed: string;
    }>(
      '/api/enhancements/assistant/ask',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      20000,
    ),

  getPregnancyRiskAssessments: () =>
    apiFetch<{ geminiConfigured: boolean; assessments: PregnancyRiskAssessment[] }>(
      '/api/enhancements/risk/pregnancy',
    ),

  assessPregnancyRisk: (payload: {
    patientId: string;
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
  }) =>
    apiFetch<{ assessment: PregnancyRiskAssessment }>(
      '/api/enhancements/risk/pregnancy/assess',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      20000,
    ),

  getEmergencyContacts: () =>
    apiFetch<{ directory: EmergencyContactDirectory }>('/api/enhancements/emergency-contacts'),

  updateEmergencyContacts: (payload: Partial<EmergencyContactDirectory>) =>
    apiFetch<{ directory: EmergencyContactDirectory }>('/api/enhancements/emergency-contacts', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};



