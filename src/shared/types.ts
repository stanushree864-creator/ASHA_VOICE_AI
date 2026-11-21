export type UserRole = 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT';

export type LanguageCode =
  | 'kn'
  | 'hi'
  | 'ta'
  | 'te'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'en';

export type VisitType =
  | 'ANC'
  | 'NEWBORN'
  | 'IMMUNISATION'
  | 'POSTNATAL'
  | 'GENERAL'
  | 'FOLLOWUP'
  | 'EMERGENCY';

export type VoiceCaptureMode = 'AUTO' | 'MANUAL';

export type VoiceIntentTask =
  | 'RECORD_VISIT'
  | 'SHOW_FOLLOWUPS'
  | 'CHECK_ALERTS'
  | 'SHOW_URGENT_PATIENTS'
  | 'SCHEDULE_VISIT'
  | 'SEND_REMINDER'
  | 'UNCLEAR_NEEDS_CLARIFICATION';

export type VoicePipelineState =
  | 'IDLE'
  | 'LISTENING'
  | 'PAUSED'
  | 'PROCESSING'
  | 'VERIFYING'
  | 'SPEAKING'
  | 'WAITING_CONFIRMATION'
  | 'SAVING'
  | 'COMPLETED'
  | 'DANGER_ALERT';

export type ConfirmationStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'confirmed'
  | 'emergency_unconfirmed';

export type DangerSignStatus =
  | 'none_detected'
  | 'positive_detected'
  | 'uncertain_pending_safety';

export type ReferralStatus =
  | 'not_required'
  | 'immediate_phc_required'
  | 'referred_acknowledged';

export type ConsentStatus = 'GRANTED' | 'WITHDRAWN' | 'PENDING';

export type PatientAlertSeverity = 'GREEN' | 'ORANGE' | 'RED';

export type PatientAlertResolutionStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED';

export type NotificationDeliveryStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'ACKNOWLEDGED';

export type DoctorInstructionApprovalStatus =
  | 'PENDING_ASHA_REVIEW'
  | 'SHARED_WITH_PATIENT'
  | 'ACKNOWLEDGED_BY_PATIENT';

export type HealthcareMode = 'PREGNANCY' | 'NEWBORN_CARE' | 'VACCINATION';

export type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'REJECTED';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  workerCode?: string;
  ashaUniqueId?: string;
  assignedArea?: string;
  avatarUrl?: string;
  beneficiaryId?: string;
  beneficiaryCode?: string;
  patientProfileId?: string;
  patientUniqueId?: string;
  assignedMode?: HealthcareMode;
}

export interface Beneficiary {
  id: string;
  beneficiaryCode: string;
  householdId: string;
  householdCode: string;
  locality: string;
  syntheticAddress: string;
  displayName: string;
  beneficiaryType: 'PREGNANT_WOMAN' | 'NEWBORN' | 'CHILD';
  dateOfBirth: string | null;
  motherBeneficiaryCode?: string | null;
  syntheticDataFlag: boolean;
  assignedWorkerId?: string | null;
  consentStatus?: ConsentStatus;
  consentUpdatedAt?: string | null;
}

export interface FieldConfidenceMap {
  [fieldName: string]: number;
}

export interface PregnancyDetails {
  gestationalAgeWeeks: number | null;
  ancStatus: 'completed' | 'scheduled' | 'pending' | null;
  weightKg: number | null;
  bloodPressure: string | null;
  pregnancyCondition?: string | null;
  ifaStatus: 'reported_taking' | 'not_taking' | 'supplied' | 'unknown' | null;
  vaccinationStatus: 'reported_completed' | 'due' | 'partial' | null;
  tdDose: string | null;
  reportedSymptoms: string | null;
}

export interface NewbornDetails {
  newbornId: string | null;
  motherBeneficiaryId: string | null;
  birthDate: string | null;
  ageDays: number | null;
  birthWeightKg: number | null;
  currentWeightKg: number | null;
  babyGender?: 'Girl' | 'Boy' | null;
  babyCondition?: string | null;
  feedingObservations: string | null;
  reportedTemperature: string | null;
  immunisationChecked: boolean | null;
}

export interface ImmunisationDetails {
  childAgeLabel: string | null;
  childWeightKg?: number | null;
  childCondition?: string | null;
  vaccinesGiven: string[];
  vaccinesDue: string[];
  missedVaccines: string[];
  previousVaccineHistory: string | null;
  scheduleVersion: string;
}

export interface GeneralVisitDetails {
  weightKg: number | null;
  bloodPressure: string | null;
  temperature: string | null;
  chiefComplaint: string | null;
  postnatalDay?: number | null;
  followUpPurpose?: string | null;
}

export interface CorrectionEntry {
  id?: string;
  fieldName: string;
  previousValue: string | null;
  correctedValue: string | null;
  correctionSource: 'VOICE_CORRECTION' | 'SUPERVISOR_AUDIT';
  correctedAt: string;
}

export interface DangerSignRule {
  code: string;
  category: 'PREGNANCY' | 'NEWBORN';
  title: string;
  severity: 'IMMEDIATE_PHC_REFERRAL';
  guidelineId: string;
  guidelineSection: string;
  phrases: Record<string, string[]>;
}

export interface DangerSignMatch {
  code: string;
  category: 'PREGNANCY' | 'NEWBORN';
  title: string;
  matchedPhrase: string;
  clauseText: string;
  detectionMethod: 'DETERMINISTIC_RULE_ENGINE' | 'AI_MULTILINGUAL_ASSISTED';
  confidence: number;
  guidelineId: string;
  guidelineSection: string;
  severityCategory: 'IMMEDIATE_PHC_REFERRAL';
  detectedAt: string;
}

export interface DangerSignAnalysis {
  status: DangerSignStatus;
  matches: DangerSignMatch[];
  negatedMatches: Array<{
    code: string;
    title: string;
    clauseText: string;
    negationCue: string;
  }>;
  uncertainMatches: Array<{
    code: string;
    title: string;
    clauseText: string;
    clarificationPrompt: string;
  }>;
  analyzedAt: string;
}

export interface StructuredVisitRecord {
  clientRequestId: string;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  householdId: string | null;
  workerId: string;
  ashaWorkerName?: string | null;
  visitType: VisitType;
  visitDate: string;
  visitTime?: string | null;
  language: LanguageCode;
  detectedLanguages: string[];
  observations: string | null;
  patientCondition?: string | null;
  precautions?: string | null;
  pregnancyDetails: PregnancyDetails | null;
  newbornDetails: NewbornDetails | null;
  immunisationDetails: ImmunisationDetails | null;
  generalDetails?: GeneralVisitDetails | null;
  nextVisitDate: string | null;
  dangerSignStatus: DangerSignStatus;
  dangerAnalysis: DangerSignAnalysis;
  referralStatus: ReferralStatus;
  confirmationStatus: ConfirmationStatus;
  sourceTranscript: string;
  extractionSource: 'GEMINI_STRUCTURED_AI' | 'OFFLINE_DETERMINISTIC_PARSER';
  fieldConfidence: FieldConfidenceMap;
  originalUtterances: Record<string, string>;
  correctionHistory: CorrectionEntry[];
}

export interface FollowupTask {
  id: string;
  visitId: string;
  beneficiaryId: string;
  beneficiaryName?: string;
  beneficiaryCode?: string;
  taskDescription: string;
  priority:
    | 'IMMEDIATE_REFERRAL'
    | 'HIGH_PRIORITY_REFERRAL'
    | 'SCHEDULED_VISIT'
    | 'PENDING_INFORMATION'
    | 'ROUTINE_FOLLOWUP';
  dueDate: string | null;
  taskStatus: 'PENDING' | 'COMPLETED';
  createdAt: string;
}

export interface GuidelineCitation {
  id: string;
  guidelineName: string;
  sourceUrl: string;
  pageOrSection: string;
  version: string;
  effectiveDate: string;
  reviewedBy: string;
  reviewedAt: string;
  activeStatus: boolean;
}

export interface SavedVisitSummary {
  id: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  householdCode?: string;
  locality?: string;
  workerId: string;
  workerName: string;
  visitType: VisitType;
  visitDate: string;
  language: LanguageCode;
  recordStatus: 'SAVED' | 'SYNCED_FROM_OFFLINE' | 'EMERGENCY_REFERRAL';
  confirmationStatus: ConfirmationStatus;
  dangerSignStatus: DangerSignStatus;
  referralStatus: ReferralStatus;
  nextVisitDate: string | null;
  structuredPayload: StructuredVisitRecord;
  rawTranscript: string;
  createdAt: string;
}

export interface RetentionConfig {
  audioRetentionHours: number;
  transcriptRetentionDays: number;
  externalProviderDisclosure: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  visitId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  workerName: string;
  dangerSignCode: string;
  dangerSignTitle: string;
  matchedPhrase: string;
  sourceGuidelineId: string;
  referralDestinationType: 'PHC';
  referralStatus: 'IMMEDIATE_ACTION_REQUIRED' | 'ACKNOWLEDGED';
  acknowledgementStatus: 'PENDING' | 'ACKNOWLEDGED_BY_PHC';
  referralTimestamp: string;
}

export interface EvaluationMetricsSummary {
  totalSamples: number;
  completedVisits: number;
  voiceSessionsCount: number;
  avgTimeToFirstAudioMs: number | null;
  p50TimeToFirstAudioMs: number | null;
  p95TimeToFirstAudioMs: number | null;
  dangerSignEventsCount: number;
  correctionsCount: number;
  offlineSyncedCount: number;
  supportedLanguagesCount: number;
  providerName: string;
  knownLimitations: string[];
}

export interface UserSettings {
  userId: string;
  preferredLanguage: LanguageCode;
  voiceSpeed: number;
  highContrast: boolean;
  largeText: boolean;
  offlineAutoSync: boolean;
  notificationsEnabled: boolean;
  updatedAt: string;
}

export interface AlertItem {
  id: string;
  sourceType: 'REFERRAL' | 'FOLLOWUP' | 'SAFETY' | 'PATIENT_CONCERN';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  severityLevel?: PatientAlertSeverity;
  resolutionStatus?: PatientAlertResolutionStatus;
  title: string;
  description: string;
  beneficiaryCode: string | null;
  beneficiaryName: string | null;
  visitId: string | null;
  acknowledgementStatus: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  visitsCompleted: number;
  ancCount: number;
  newbornCount: number;
  immunisationCount: number;
  postnatalCount?: number;
  generalCount?: number;
  followupCount?: number;
  pendingFollowups: number;
  completedFollowups: number;
  alertEvents: number;
  pendingReferrals: number;
  recordCompletionRate: number;
  todayVisits: number;
  recentVisits: SavedVisitSummary[];
  upcomingFollowups: FollowupTask[];
  recentAlerts: AlertItem[];
}

export interface AnalyticsBucket {
  date: string;
  label: string;
  ANC: number;
  NEWBORN: number;
  IMMUNISATION: number;
  POSTNATAL?: number;
  GENERAL?: number;
  FOLLOWUP?: number;
  total: number;
}

export interface DashboardAnalytics {
  range: '7d' | '30d';
  buckets: AnalyticsBucket[];
  completionRate: number;
  dangerSignRate: number;
  totalInRange: number;
}

export interface TranscriptProvenanceSpan {
  fieldName: string;
  label: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface AcousticTelemetry {
  rmsDb: number;
  snrEstimateDb: number;
  noiseFloorDb: number;
  noiseEnvironment: 'Quiet' | 'Moderate' | 'Noisy Household';
  vadActive: boolean;
  peakHz: number;
}

export interface VoiceIntentClassification {
  rawCommand: string;
  detectedTask: VoiceIntentTask;
  detectedCategory: VisitType | null;
  targetBeneficiaryCode: string | null;
  targetBeneficiaryName: string | null;
  suggestedDate: string | null;
  suggestedMessage: string | null;
  missingFields: string[];
  clarificationPrompt: string | null;
  confidence: number;
  source: 'AI_INTENT' | 'DETERMINISTIC_INTENT';
}

export interface VoiceCommandLogItem {
  id: string;
  workerId: string;
  rawCommand: string;
  detectedCategory: VisitType | null;
  detectedTask: VoiceIntentTask;
  processingStatus: 'MATCHED' | 'NEEDS_CLARIFICATION' | 'EXECUTED';
  confirmationStatus: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'NAVIGATED';
  clarificationPrompt?: string | null;
  createdAt: string;
}

export interface PatientAlertItem {
  id: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  workerId: string;
  workerName: string;
  alertCategory: string;
  severityLevel: PatientAlertSeverity;
  source: 'PATIENT_PORTAL' | 'ASHA_VOICE' | 'SYSTEM_FOLLOWUP' | 'RULE_ENGINE';
  reportedConcern: string;
  protocolGuidance: string;
  notificationStatus: string;
  acknowledgementStatus: 'PENDING' | 'ACKNOWLEDGED_BY_ASHA' | 'ACKNOWLEDGED_BY_PHC';
  followUpAction: string | null;
  resolutionStatus: PatientAlertResolutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientNotificationItem {
  id: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  workerId: string;
  senderName: string;
  notificationType:
    | 'VISIT_REMINDER'
    | 'DOCTOR_INSTRUCTION'
    | 'VACCINATION_REMINDER'
    | 'FOLLOWUP_SCHEDULE'
    | 'EMERGENCY_GUIDANCE'
    | 'GENERAL_MESSAGE';
  title: string;
  message: string;
  severityLevel: PatientAlertSeverity;
  channel: 'PORTAL_WS' | 'SMS_WEBHOOK' | 'OFFLINE_QUEUE';
  deliveryStatus: NotificationDeliveryStatus;
  errorReason: string | null;
  acknowledgedAt: string | null;
  patientResponse: string | null;
  createdAt: string;
}

export interface DoctorInstructionItem {
  id: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  doctorUserId: string;
  doctorName: string;
  assignedWorkerId: string;
  instructionType: 'MEDICATION' | 'PRECAUTION' | 'APPOINTMENT' | 'FOLLOWUP_CARE';
  medicationSchedule: string | null;
  precautions: string | null;
  instructionsText: string;
  nextAppointmentDate: string | null;
  approvalStatus: DoctorInstructionApprovalStatus;
  reviewedAt: string | null;
  patientAcknowledgedAt: string | null;
  createdAt: string;
}

export interface ConnectivitySummary {
  totalRegisteredPatients: number;
  connectedPatientsCount: number;
  connectedBeneficiaryCodes: string[];
  pendingNotificationsCount: number;
  failedNotificationsCount: number;
  unacknowledgedAlertsCount: number;
  urgentRedAlertsCount: number;
  lastSyncAt: string;
  smsChannelStatus: 'CONFIGURED' | 'PORTAL_ONLY_LOCAL';
  followUpBreakdown: {
    todayVisits: number;
    overdueVisits: number;
    upcomingAppointments: number;
    awaitingResponse: number;
    urgentAttention: number;
  };
  recentVoiceCommands: VoiceCommandLogItem[];
}

export interface PatientPortalPayload {
  profile: Beneficiary;
  consent: {
    status: ConsentStatus;
    updatedAt: string | null;
  };
  assignedWorker: {
    workerId: string;
    workerCode: string;
    fullName: string;
    assignedArea: string;
    helplineLabel: string;
  };
  emergencyGuidance: {
    ambulanceNumber: string;
    nearestPhcName: string;
    instructions: string[];
  };
  upcomingVisits: FollowupTask[];
  nextDoctorAppointment: DoctorInstructionItem | null;
  doctorInstructions: DoctorInstructionItem[];
  vaccinationReminders: Array<{
    vaccineCode: string;
    dueDate: string | null;
    status: string;
  }>;
  maternityNewbornReminders: string[];
  notifications: PatientNotificationItem[];
  concernAlerts: PatientAlertItem[];
  recentVisits: SavedVisitSummary[];
}

export interface PatientProfileRecord {
  id: string;
  patientUniqueId: string;
  userId: string | null;
  beneficiaryId: string | null;
  fullName: string;
  age: number | null;
  phone: string | null;
  locality: string | null;
  assignedMode: HealthcareMode;
  consentStatus: ConsentStatus;
  consentUpdatedAt: string | null;
  createdAt: string;
}

export interface AshaPatientConnection {
  id: string;
  ashaWorkerId: string;
  ashaUniqueId: string;
  ashaWorkerName: string;
  ashaAssignedArea: string;
  patientId: string;
  patientUniqueId: string;
  patientName: string;
  patientLocality: string | null;
  patientAge: number | null;
  patientPhone: string | null;
  assignedMode: HealthcareMode;
  consentStatus: ConsentStatus;
  initiatedBy: 'ASHA_WORKER' | 'PATIENT';
  status: ConnectionStatus;
  notes: string | null;
  requestedAt: string;
  respondedAt: string | null;
}

export interface PregnancyCareRecord {
  id: string;
  patientId: string;
  ashaWorkerId: string;
  pregnancyStage: string;
  gestationalWeeks: number | null;
  expectedDeliveryDate: string | null;
  bloodPressure: string | null;
  weightKg: number | null;
  hemoglobinGDl: number | null;
  ancVisitsCompleted: number;
  ifaTabletsStatus: string | null;
  riskLevel: 'NORMAL' | 'MONITOR' | 'HIGH_RISK';
  visitNotes: string | null;
  lastCheckupDate: string | null;
  nextCheckupDate: string | null;
  updatedAt: string;
}

export interface NewbornCareRecord {
  id: string;
  patientId: string;
  ashaWorkerId: string;
  babyName: string;
  motherName: string;
  birthDate: string;
  birthWeightKg: number | null;
  currentWeightKg: number | null;
  lengthCm: number | null;
  temperature: string | null;
  feedingStatus: string | null;
  hbncVisitsCompleted: number;
  healthNotes: string | null;
  nextCheckupDate: string | null;
  updatedAt: string;
}

export type VaccinationStatus = 'PENDING' | 'COMPLETED' | 'SCHEDULED' | 'OVERDUE';

export interface VaccinationCareRecord {
  id: string;
  patientId: string;
  ashaWorkerId: string;
  vaccineName: string;
  doseLabel: string;
  dueDate: string;
  administeredDate: string | null;
  status: VaccinationStatus;
  notes: string | null;
  reminderSentAt: string | null;
  updatedAt: string;
}

export interface CareAppointment {
  id: string;
  patientId: string;
  patientName?: string;
  patientUniqueId?: string;
  ashaWorkerId: string;
  ashaWorkerName?: string;
  healthcareMode: HealthcareMode;
  title: string;
  scheduledDate: string;
  scheduledTime: string | null;
  location: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  reminderSent: boolean;
  notes: string | null;
  createdAt: string;
}

export interface AssistanceRequest {
  id: string;
  connectionId: string | null;
  patientId: string;
  patientUniqueId: string;
  patientName: string;
  ashaWorkerId: string;
  ashaUniqueId: string;
  ashaWorkerName: string;
  healthcareMode: HealthcareMode;
  subject: string;
  message: string;
  urgency: 'NORMAL' | 'URGENT';
  status: 'OPEN' | 'RESPONDED' | 'RESOLVED';
  ashaResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface CareNotification {
  id: string;
  recipientUserId: string;
  senderName: string;
  notificationType:
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_APPROVED'
    | 'CONNECTION_REJECTED'
    | 'ASSISTANCE_REQUEST'
    | 'ASSISTANCE_REPLY'
    | 'APPOINTMENT_REMINDER'
    | 'VACCINATION_REMINDER'
    | 'NEWBORN_REMINDER'
    | 'ANC_REMINDER';
  title: string;
  message: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AshaConnectivityDashboard {
  worker: {
    workerId: string;
    ashaUniqueId: string;
    fullName: string;
    assignedArea: string;
  };
  modeCounts: {
    PREGNANCY: number;
    NEWBORN_CARE: number;
    VACCINATION: number;
  };
  upcomingCheckupsCount: number;
  connectedPatients: AshaPatientConnection[];
  pendingRequests: AshaPatientConnection[];
  allConnections: AshaPatientConnection[];
  assistanceRequests: AssistanceRequest[];
  notifications: CareNotification[];
  unreadNotificationsCount: number;
}

export interface PregnancyModePatientItem {
  patient: PatientProfileRecord;
  connectionStatus: ConnectionStatus;
  consentGranted: boolean;
  record: PregnancyCareRecord | null;
  appointments: CareAppointment[];
}

export interface NewbornModePatientItem {
  patient: PatientProfileRecord;
  connectionStatus: ConnectionStatus;
  consentGranted: boolean;
  record: NewbornCareRecord | null;
  appointments: CareAppointment[];
}

export interface VaccinationModePatientItem {
  patient: PatientProfileRecord;
  connectionStatus: ConnectionStatus;
  consentGranted: boolean;
  vaccines: VaccinationCareRecord[];
  appointments: CareAppointment[];
}

export interface PatientConnectivityPortal {
  patient: PatientProfileRecord;
  connections: AshaPatientConnection[];
  connectedWorker: AshaPatientConnection | null;
  pregnancyRecord: PregnancyCareRecord | null;
  newbornRecord: NewbornCareRecord | null;
  vaccinationRecords: VaccinationCareRecord[];
  appointments: CareAppointment[];
  assistanceRequests: AssistanceRequest[];
  notifications: CareNotification[];
  unreadNotificationsCount: number;
}

// --- Enhancement Modules Shared Types ---

export interface EmergencyContactDirectory {
  workerId: string;
  ashaUniqueId: string;
  workerName: string;
  assignedArea: string;
  workerPhone: string;
  backupPhone: string;
  phcName: string;
  phcPhone: string;
  ambulanceNumber: string;
  supervisorName: string;
  supervisorPhone: string;
  districtHelpline: string;
  emergencyInstructions: string;
  patientEmergencyContactName?: string | null;
  patientEmergencyContactRelation?: string | null;
  patientEmergencyContactPhone?: string | null;
  updatedAt: string;
}

export interface PatientQrCardPayload {
  v: 1;
  app: 'ASHA_HEALTH_ID';
  patientUniqueId: string;
  fullName: string;
  assignedMode: HealthcareMode;
  locality: string | null;
  issuedAt: string;
}

export interface QrResolvedPatientResponse {
  patient: PatientProfileRecord;
  qrPayload: PatientQrCardPayload;
  qrString: string;
  consentGranted: boolean;
  connectionStatus: ConnectionStatus | 'NOT_CONNECTED';
  connectedWorkerName: string | null;
  connectedWorkerUniqueId: string | null;
  summary: {
    pregnancyStage?: string | null;
    gestationalWeeks?: number | null;
    expectedDeliveryDate?: string | null;
    riskLevel?: string | null;
    babyName?: string | null;
    birthWeightKg?: number | null;
    currentWeightKg?: number | null;
    pendingVaccinesCount?: number;
    upcomingAppointmentDate?: string | null;
  };
}

export type SmartFollowupBucket =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'UPCOMING_7_DAYS'
  | 'FUTURE'
  | 'UNSCHEDULED';

export interface SmartFollowupItem {
  id: string;
  source: 'FOLLOWUP_TASK' | 'CARE_APPOINTMENT' | 'VACCINATION_DUE' | 'RECOMMENDED_MILESTONE';
  patientName: string;
  patientCode: string;
  beneficiaryId?: string;
  healthcareMode: HealthcareMode;
  title: string;
  reason: string;
  dueDate: string | null;
  bucket: SmartFollowupBucket;
  priorityScore: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  actionableFollowupId?: string;
  canAutoCreate?: boolean;
  suggestedPriority?: FollowupTask['priority'];
}

export interface SmartFollowupSummary {
  generatedAt: string;
  counts: {
    overdue: number;
    dueToday: number;
    upcoming7Days: number;
    recommendedMilestones: number;
    totalActionable: number;
  };
  items: SmartFollowupItem[];
}

export type PregnancyRiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface PregnancyRiskFactor {
  code: string;
  label: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  observedValue: string;
  guidelineRef: string;
  points: number;
}

export interface PregnancyRiskAssessment {
  id: string;
  patientId: string;
  patientUniqueId: string;
  patientName: string;
  gestationalWeeks: number | null;
  bloodPressure: string | null;
  hemoglobinGDl: number | null;
  weightKg: number | null;
  ancVisitsCompleted: number;
  riskScore: number;
  riskTier: PregnancyRiskTier;
  phcReferralRequired: boolean;
  factors: PregnancyRiskFactor[];
  recommendations: string[];
  aiSummary: string | null;
  aiStatus: 'NOT_REQUESTED' | 'GEMINI_VERIFIED' | 'GEMINI_UNCONFIGURED' | 'GEMINI_ERROR';
  assessedBy: string;
  createdAt: string;
}

export interface AiAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  language: LanguageCode;
  timestamp: string;
  modelUsed?: string;
  suggestedQuestions?: string[];
}

export interface OfflineQueuedCareAction {
  id: string;
  actionType: 'PREGNANCY_CHECKUP' | 'NEWBORN_CHECKUP' | 'VACCINATION_UPDATE' | 'FOLLOWUP_COMPLETE';
  patientId: string;
  patientName: string;
  patientUniqueId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OfflineCareSnapshot {
  savedAt: string;
  workerName: string;
  ashaUniqueId: string;
  patients: AshaPatientConnection[];
  pregnancyPatients: PregnancyModePatientItem[];
  newbornPatients: NewbornModePatientItem[];
  vaccinationPatients: VaccinationModePatientItem[];
  followups: FollowupTask[];
  visits: SavedVisitSummary[];
  emergencyContacts: EmergencyContactDirectory | null;
}


