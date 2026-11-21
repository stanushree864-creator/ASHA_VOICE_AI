import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  HelpCircle,
  LayoutDashboard,
  Mic,
  Settings,
  UserCheck,
} from 'lucide-react';
import { AccountModal } from './components/AccountModal';
import { AlertsCenterPage } from './components/AlertsCenterPage';
import { ConnectedPatientsPage } from './components/ConnectedPatientsPage';
import { DangerAlertScreen } from './components/DangerAlertScreen';
import { DashboardHome } from './components/DashboardHome';
import { EmergencyContactsPanel } from './components/EmergencyContactsPanel';
import { HealthcareModeWorkspace } from './components/HealthcareModeWorkspace';
import { HelpSupportPage } from './components/HelpSupportPage';
import { HistoryAndFollowupsView } from './components/HistoryAndFollowupsView';
import { MultilingualAiAssistant } from './components/MultilingualAiAssistant';
import { OfflineHealthcarePanel } from './components/OfflineHealthcarePanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PatientPortalDashboard } from './components/PatientPortalDashboard';
import { PregnancyRiskAlertPanel } from './components/PregnancyRiskAlertPanel';
import { QrIdentityPanel } from './components/QrIdentityPanel';
import { ReportsAnalyticsPage } from './components/ReportsAnalyticsPage';
import { SettingsPage } from './components/SettingsPage';
import { SidebarNav, type NavSection } from './components/SidebarNav';
import { StructuredRecordCard } from './components/StructuredRecordCard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { TopHeaderBar } from './components/TopHeaderBar';
import { VoiceCapturePanel } from './components/VoiceCapturePanel';
import { WhatToAskPage } from './components/WhatToAskPage';
import { WhatToFillPage } from './components/WhatToFillPage';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { useVoicePipeline } from './hooks/useVoicePipeline';
import { buildReadBackScript } from './shared/clinicalEngine';
import { getTranslations } from './shared/i18n';
import { getLanguageConfig } from './shared/languages';
import type {
  AlertItem,
  AnalyticsBucket,
  AshaConnectivityDashboard,
  AuthUser,
  Beneficiary,
  DangerSignAnalysis,
  DashboardSummary,
  EmergencyContactDirectory,
  EvaluationMetricsSummary,
  FollowupTask,
  GuidelineCitation,
  HealthcareMode,
  LanguageCode,
  OfflineCareSnapshot,
  OfflineQueuedCareAction,
  PatientConnectivityPortal,
  ReferralRecord,
  RetentionConfig,
  SavedVisitSummary,
  StructuredVisitRecord,
  UserSettings,
  VisitType,
} from './shared/types';
import { api, setAuthToken } from './utils/apiClient';
import {
  enqueueOfflineCareAction,
  getOfflineCareActions,
  getOfflineCareSnapshot,
  getSimulatedOfflineMode,
  removeOfflineCareAction,
  saveOfflineCareSnapshot,
  setSimulatedOfflineMode,
} from './utils/offlineCareStore';
import {
  getOfflineVisitDrafts,
  markOfflineDangerAlertDelivered,
  removeOfflineVisitDraft,
  saveOfflineDangerAlert,
  saveOfflineVisitDraft,
  type OfflineVisitDraft,
} from './utils/offlineQueue';

const DEFAULT_ASHA_USER: AuthUser = {
  id: 'user-asha-01',
  username: 'worker01',
  fullName: 'Savitha Gowda',
  role: 'ASHA_WORKER',
  workerCode: 'ASHA-DEV-04',
  assignedArea: 'Devanahalli Block · Wards 4-6',
  preferredLanguage: 'en',
  avatarUrl: '/src/assets/images/asha_worker_portrait_1795246317288.jpg',
};

const DEFAULT_SETTINGS: UserSettings = {
  userId: 'user-asha-01',
  preferredLanguage: 'en',
  voiceSpeed: 1.0,
  highContrast: false,
  largeText: false,
  offlineAutoSync: true,
  notificationsEnabled: true,
  updatedAt: '',
};

export default function App() {
  const browserOnline = useOnlineStatus();
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(() => getSimulatedOfflineMode());
  const isOnline = browserOnline && !simulatedOffline;
  const [offlineCareSnapshot, setOfflineCareSnapshot] = useState<OfflineCareSnapshot | null>(() =>
    getOfflineCareSnapshot(),
  );
  const [offlineCareActions, setOfflineCareActions] = useState<OfflineQueuedCareAction[]>(() =>
    getOfflineCareActions(),
  );
  const [emergencyDirectory, setEmergencyDirectory] = useState<EmergencyContactDirectory | null>(
    null,
  );
  const [user, setUser] = useState<AuthUser>(DEFAULT_ASHA_USER);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [deviceMode, setDeviceMode] = useState<'pc' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('asha_device_mode');
      if (saved === 'pc' || saved === 'mobile') return saved;
      return window.innerWidth < 1024 ? 'mobile' : 'pc';
    }
    return 'pc';
  });
  const [activeSection, setActiveSection] = useState<NavSection>('DASHBOARD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visitType, setVisitType] = useState<VisitType>('ANC');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  const [visits, setVisits] = useState<SavedVisitSummary[]>([]);
  const [followups, setFollowups] = useState<FollowupTask[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d'>('7d');
  const [analyticsBuckets, setAnalyticsBuckets] = useState<AnalyticsBucket[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeCareMode, setActiveCareMode] = useState<HealthcareMode>('PREGNANCY');
  const [ashaConnectivity, setAshaConnectivity] = useState<AshaConnectivityDashboard | null>(null);
  const [patientPortal, setPatientPortal] = useState<PatientConnectivityPortal | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [guidelines, setGuidelines] = useState<GuidelineCitation[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetricsSummary | null>(null);
  const [retentionConfig, setRetentionConfig] = useState<RetentionConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: string;
      userId: string;
      userName: string;
      entityType: string;
      entityId: string;
      action: string;
      timestamp: string;
      correlationId: string;
    }>
  >([]);
  const [supervisorOverview, setSupervisorOverview] = useState<{
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
  } | null>(null);

  const [offlineDrafts, setOfflineDrafts] = useState<OfflineVisitDraft[]>(() =>
    getOfflineVisitDrafts(),
  );
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [savedBanner, setSavedBanner] = useState<{
    message: string;
    followups: FollowupTask[];
  } | null>(null);

  const [activeEmergency, setActiveEmergency] = useState<{
    analysis: DangerSignAnalysis;
    transcript: string;
    persistedOfflineOnly: boolean;
  } | null>(null);

  const langCfg = getLanguageConfig(language);
  const t = getTranslations(language);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('high-contrast', Boolean(settings.highContrast));
    root.lang = langCfg.bcp47;
  }, [langCfg.bcp47, settings.highContrast, settings.largeText]);

  const loadAnalytics = useCallback(async (range: '7d' | '30d') => {
    try {
      const res = await api.getDashboardAnalytics(range);
      setAnalyticsBuckets(res.buckets);
    } catch {
      // Non-blocking
    }
  }, []);

  const loadWorkspaceData = useCallback(
    async (currentUser: AuthUser, targetRange: '7d' | '30d' = '7d') => {
      try {
        if (currentUser.role === 'PATIENT') {
          const [portalRes, setRes, emRes] = await Promise.all([
            api.getPatientPortalDashboard(),
            api.getSettings(),
            api.getEmergencyContacts().catch(() => null),
          ]);
          setPatientPortal(portalRes);
          setSettings(setRes.settings);
          setEmergencyDirectory(emRes?.directory ?? null);
          setAshaConnectivity(null);
          setBeneficiaries([]);
          setVisits([]);
          setFollowups([]);
          setReferrals([]);
          setAlerts([]);
          setDashboardSummary(null);
          return;
        }

        const [
          benRes,
          visRes,
          fuRes,
          refRes,
          dashRes,
          anaRes,
          alertRes,
          setRes,
          connRes,
          emRes,
          pregModeRes,
          nbModeRes,
          vaccModeRes,
        ] = await Promise.all([
          api.getBeneficiaries(),
          api.getVisits(),
          api.getFollowups(),
          api.getReferrals(),
          api.getDashboardSummary(),
          api.getDashboardAnalytics(targetRange),
          api.getAlerts(),
          api.getSettings(),
          api.getAshaConnectivityDashboard().catch(() => null),
          api.getEmergencyContacts().catch(() => null),
          api.getPregnancyModePatients().catch(() => null),
          api.getNewbornModePatients().catch(() => null),
          api.getVaccinationModePatients().catch(() => null),
        ]);
        setBeneficiaries(benRes.beneficiaries);
        setVisits(visRes.visits);
        setFollowups(fuRes.followups);
        setReferrals(refRes.referrals);
        setDashboardSummary(dashRes);
        setAnalyticsBuckets(anaRes.buckets);
        setAlerts(alertRes.alerts);
        setSettings(setRes.settings);
        setAshaConnectivity(connRes);
        setEmergencyDirectory(emRes?.directory ?? null);
        setPatientPortal(null);

        const nextSnapshot: OfflineCareSnapshot = {
          savedAt: new Date().toISOString(),
          workerName: connRes?.worker.fullName ?? currentUser.fullName,
          ashaUniqueId: connRes?.worker.ashaUniqueId ?? currentUser.ashaUniqueId ?? 'ASHA-2026-0001',
          patients: connRes?.connectedPatients ?? [],
          pregnancyPatients: pregModeRes?.patients ?? [],
          newbornPatients: nbModeRes?.patients ?? [],
          vaccinationPatients: vaccModeRes?.patients ?? [],
          followups: fuRes.followups,
          visits: visRes.visits,
          emergencyContacts: emRes?.directory ?? null,
        };
        saveOfflineCareSnapshot(nextSnapshot);
        setOfflineCareSnapshot(nextSnapshot);

        if (currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN') {
          const [ovRes, guideRes, metRes, audRes, retRes] = await Promise.all([
            api.getSupervisorOverview(),
            api.getGuidelines(),
            api.getEvaluationMetrics(),
            api.getAuditLogs(),
            api.getRetentionConfig(),
          ]);
          setSupervisorOverview(ovRes);
          setGuidelines(guideRes.guidelines);
          setMetrics(metRes);
          setAuditLogs(audRes.logs);
          setRetentionConfig(retRes.retention);
        }
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      }
    },
    [],
  );

  const hasInitializedSessionRef = useRef(false);

  useEffect(() => {
    if (hasInitializedSessionRef.current) return;
    hasInitializedSessionRef.current = true;
    void api
      .demoSignIn('ASHA_WORKER')
      .then((res) => {
        setAuthToken(res.token);
        setUser(res.user);
        setLanguage(res.user.preferredLanguage);
        return loadWorkspaceData(res.user);
      })
      .catch(() => undefined);
  }, [loadWorkspaceData]);

  const handleEmergencyDetected = useCallback(
    async (analysis: DangerSignAnalysis, transcript: string) => {
      const alertId = `alert-${Date.now()}`;
      saveOfflineDangerAlert({
        id: alertId,
        beneficiaryCode: selectedBeneficiary?.beneficiaryCode ?? null,
        beneficiaryName: selectedBeneficiary?.displayName ?? null,
        transcript,
        analysis,
        detectedAt: analysis.analyzedAt,
        deliveryStatus: 'LOCAL_ONLY_OFFLINE',
      });

      let persistedOfflineOnly = !isOnline;
      if (isOnline) {
        try {
          await api.escalateEmergencyReferral({
            beneficiaryCode: selectedBeneficiary?.beneficiaryCode ?? null,
            transcript,
            visitType,
            language,
          });
          markOfflineDangerAlertDelivered(alertId);
          persistedOfflineOnly = false;
          if (user) void loadWorkspaceData(user, analyticsRange);
        } catch {
          persistedOfflineOnly = true;
        }
      }

      setActiveEmergency({
        analysis,
        transcript,
        persistedOfflineOnly,
      });
    },
    [analyticsRange, isOnline, language, loadWorkspaceData, selectedBeneficiary, user, visitType],
  );

  const voice = useVoicePipeline({
    language,
    visitType,
    workerId: user?.workerCode ?? 'WORKER001',
    ashaWorkerName: user.fullName,
    beneficiaries,
    selectedBeneficiary,
    isOnline,
    voiceSpeed: settings.voiceSpeed,
    onEmergencyDetected: (analysis, transcript) => {
      void handleEmergencyDetected(analysis, transcript);
    },
  });

  const handleSyncOfflineDrafts = useCallback(async () => {
    const totalPending = offlineDrafts.length + offlineCareActions.length;
    if (!isOnline || totalPending === 0) return;
    setIsSyncingOffline(true);
    try {
      for (const draft of offlineDrafts) {
        try {
          await api.saveVisit({
            record: draft.record,
            syncedFromOffline: true,
          });
          const updated = removeOfflineVisitDraft(draft.record.clientRequestId);
          setOfflineDrafts(updated);
        } catch {
          // Retain draft safely
        }
      }
      for (const act of offlineCareActions) {
        try {
          if (act.actionType === 'PREGNANCY_CHECKUP') {
            await api.updatePregnancyRecord(act.patientId, {
              bloodPressure: (act.payload.bloodPressure as string | undefined) ?? undefined,
              weightKg: (act.payload.weightKg as number | undefined) ?? undefined,
              visitNotes: (act.payload.notes as string | undefined) ?? undefined,
              lastCheckupDate: (act.payload.checkupDate as string | undefined) ?? undefined,
            });
          } else if (act.actionType === 'NEWBORN_CHECKUP') {
            await api.updateNewbornRecord(act.patientId, {
              currentWeightKg: (act.payload.weightKg as number | undefined) ?? undefined,
              healthNotes: (act.payload.notes as string | undefined) ?? undefined,
            });
          } else if (act.actionType === 'FOLLOWUP_COMPLETE') {
            await api.completeFollowup(act.patientId);
          }
          setOfflineCareActions(removeOfflineCareAction(act.id));
        } catch {
          // Retain action safely
        }
      }
      if (user) await loadWorkspaceData(user, analyticsRange);
    } finally {
      setIsSyncingOffline(false);
    }
  }, [analyticsRange, isOnline, loadWorkspaceData, offlineCareActions, offlineDrafts, user]);

  useEffect(() => {
    if (
      isOnline &&
      user &&
      (offlineDrafts.length > 0 || offlineCareActions.length > 0) &&
      settings.offlineAutoSync
    ) {
      void handleSyncOfflineDrafts();
    }
  }, [
    handleSyncOfflineDrafts,
    isOnline,
    offlineCareActions.length,
    offlineDrafts.length,
    settings.offlineAutoSync,
    user,
  ]);

  const handleChangeDeviceMode = (mode: 'pc' | 'mobile') => {
    setDeviceMode(mode);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('asha_device_mode', mode);
    }
  };

  const handleSwitchRole = async (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT') => {
    try {
      const res = await api.demoSignIn(role);
      setAuthToken(res.token);
      setUser(res.user);
      setLanguage(res.user.preferredLanguage);
      setActiveSection(
        role === 'PATIENT'
          ? 'PATIENT_PORTAL'
          : role === 'ASHA_WORKER'
            ? 'DASHBOARD'
            : 'SUPERVISOR',
      );
      await loadWorkspaceData(res.user, analyticsRange);
    } catch {
      // Non-blocking fallback
    }
  };

  const handleAuthenticatedUser = async (authUser: AuthUser) => {
    setUser(authUser);
    setLanguage(authUser.preferredLanguage);
    setActiveSection(authUser.role === 'PATIENT' ? 'PATIENT_PORTAL' : 'DASHBOARD');
    await loadWorkspaceData(authUser, analyticsRange);
  };

  const handleChangeLanguage = async (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setSettings((prev) => ({ ...prev, preferredLanguage: nextLang }));
    if (user && isOnline) {
      await api.updateLanguage(nextLang).catch(() => undefined);
    }
  };

  const handleConfirmAndSave = async (recordOverride?: StructuredVisitRecord) => {
    const target = recordOverride ?? voice.structuredRecord;
    if (!target) return;
    setIsSavingVisit(true);
    voice.setPipelineState('SAVING');

    const nowTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let resolvedBenId = target.beneficiaryId ?? selectedBeneficiary?.beneficiaryCode ?? null;
    let resolvedBenName = target.beneficiaryName ?? selectedBeneficiary?.displayName ?? null;
    let resolvedHouseholdId = target.householdId ?? selectedBeneficiary?.householdCode ?? null;

    if (!resolvedBenId && resolvedBenName) {
      const existingMatch = beneficiaries.find(
        (b) => b.displayName.trim().toLowerCase() === resolvedBenName!.trim().toLowerCase(),
      );
      if (existingMatch) {
        resolvedBenId = existingMatch.beneficiaryCode;
        resolvedBenName = existingMatch.displayName;
        resolvedHouseholdId = existingMatch.householdCode;
      } else if (isOnline) {
        try {
          const benType: Beneficiary['beneficiaryType'] =
            target.visitType === 'NEWBORN'
              ? 'NEWBORN'
              : target.visitType === 'IMMUNISATION'
                ? 'CHILD'
                : 'PREGNANT_WOMAN';
          const created = await api.createBeneficiary({
            displayName: resolvedBenName.trim(),
            beneficiaryType: benType,
            locality: user.assignedArea || 'Ward 4',
          });
          setBeneficiaries((prev) => [...prev, created.beneficiary]);
          resolvedBenId = created.beneficiary.beneficiaryCode;
          resolvedBenName = created.beneficiary.displayName;
          resolvedHouseholdId = created.beneficiary.householdCode;
        } catch {
          // Will preserve safely in offline draft queue if creation fails
        }
      }
    }

    const confirmedRecord: StructuredVisitRecord = {
      ...target,
      beneficiaryId: resolvedBenId,
      beneficiaryName: resolvedBenName,
      householdId: resolvedHouseholdId,
      ashaWorkerName: target.ashaWorkerName || user.fullName,
      visitDate: target.visitDate || new Date().toISOString().slice(0, 10),
      visitTime: target.visitTime || nowTime,
      confirmationStatus: 'confirmed',
    };

    if (!isOnline || !confirmedRecord.beneficiaryId) {
      const updatedQueue = saveOfflineVisitDraft(confirmedRecord);
      setOfflineDrafts(updatedQueue);
      setIsSavingVisit(false);
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: t.form.savedLocally,
        followups: [],
      });
      return;
    }

    try {
      const res = await api.saveVisit({
        record: confirmedRecord,
        ttfaMs: voice.ttfaMs,
      });
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: `${confirmedRecord.beneficiaryName ?? ''} (${confirmedRecord.visitDate} · ${confirmedRecord.visitTime ?? ''})`,
        followups: res.followups,
      });
      await voice.speakText(
        t.form.visitSavedSpeech(confirmedRecord.beneficiaryName ?? ''),
        false,
        'COMPLETED',
      );
      if (user) await loadWorkspaceData(user, analyticsRange);
    } catch {
      const updatedQueue = saveOfflineVisitDraft(confirmedRecord);
      setOfflineDrafts(updatedQueue);
      voice.setPipelineState('COMPLETED');
      setSavedBanner({
        message: t.form.savedLocally,
        followups: [],
      });
    } finally {
      setIsSavingVisit(false);
    }
  };

  const handleSaveDraft = async (recordOverride?: StructuredVisitRecord) => {
    const target = recordOverride ?? voice.structuredRecord;
    if (!target) return;
    if (!isOnline) {
      const updatedQueue = saveOfflineVisitDraft({ ...target, confirmationStatus: 'draft' });
      setOfflineDrafts(updatedQueue);
      setSavedBanner({ message: t.form.draftSavedLocal, followups: [] });
      return;
    }
    await api.saveVisitDraft(target);
    setSavedBanner({ message: t.form.draftSavedServer, followups: [] });
    if (user) await loadWorkspaceData(user, analyticsRange);
  };

  const handleRunJudgeScenario = async (
    transcript: string,
    targetVisitType?: VisitType,
    benCode?: string | null,
  ) => {
    setSavedBanner(null);
    if (targetVisitType) setVisitType(targetVisitType);
    const ben = benCode
      ? beneficiaries.find((b) => b.beneficiaryCode === benCode) ?? null
      : null;
    if (benCode) {
      setSelectedBeneficiary(ben);
    }
    setActiveSection('VISIT');
    await voice.processTranscript(transcript, targetVisitType, ben);
  };

  const handleConfirmUncertainSafety = async (isDangerPresent: boolean) => {
    if (!voice.structuredRecord) return;
    if (isDangerPresent) {
      const forcedAnalysis: DangerSignAnalysis = {
        ...voice.structuredRecord.dangerAnalysis,
        status: 'positive_detected',
        matches: voice.structuredRecord.dangerAnalysis.uncertainMatches.map((u) => ({
          code: u.code,
          category: voice.structuredRecord!.visitType === 'NEWBORN' ? 'NEWBORN' : 'PREGNANCY',
          title: u.title,
          matchedPhrase: u.clauseText,
          clauseText: u.clauseText,
          detectionMethod: 'DETERMINISTIC_RULE_ENGINE',
          confidence: 1,
          guidelineId: 'NHM_ASHA_MOD6',
          guidelineSection: 'Worker Confirmed Uncertain Symptom',
          severityCategory: 'IMMEDIATE_PHC_REFERRAL',
          detectedAt: new Date().toISOString(),
        })),
      };
      await handleEmergencyDetected(forcedAnalysis, voice.structuredRecord.sourceTranscript);
    } else {
      voice.setStructuredRecord({
        ...voice.structuredRecord,
        dangerSignStatus: 'none_detected',
        dangerAnalysis: {
          ...voice.structuredRecord.dangerAnalysis,
          status: 'none_detected',
          uncertainMatches: [],
        },
      });
    }
  };

  const handleExportCsv = async () => {
    const csv = await api.exportReportsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asha-visit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isSupervisorOrAdmin = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const isMobileLayout = deviceMode === 'mobile';
  const pendingFollowupCount = followups.filter((f) => f.taskStatus === 'PENDING').length;
  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div
      className={
        isMobileLayout
          ? 'min-h-screen bg-[#E2E8F0] text-[#172B3A] md:flex md:items-start md:justify-center md:px-4 md:py-4'
          : 'flex min-h-screen overflow-x-clip bg-[#F7F9FC] text-[#172B3A]'
      }
    >
      <div
        className={
          isMobileLayout
            ? 'relative flex min-h-screen w-full flex-col overflow-x-clip bg-[#F7F9FC] md:min-h-[820px] md:w-[430px] md:max-w-[430px] md:rounded-[28px] md:border-[6px] md:border-[#102B35] md:shadow-2xl'
            : 'flex min-w-0 flex-1'
        }
      >
        <SidebarNav
          language={language}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          deviceMode={deviceMode}
          user={user}
          unreadAlertsCount={unreadAlertsCount}
          pendingFollowupsCount={pendingFollowupCount}
          pendingConnectionsCount={ashaConnectivity?.pendingRequests.length ?? 0}
          onSwitchRole={(role) => void handleSwitchRole(role)}
          onOpenAccountModal={() => setShowAccountModal(true)}
        />

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            isMobileLayout ? '' : 'pb-20 lg:pb-8'
          }`}
        >
          <TopHeaderBar
            user={user}
            language={language}
            onChangeLanguage={(l) => void handleChangeLanguage(l)}
            deviceMode={deviceMode}
            onChangeDeviceMode={handleChangeDeviceMode}
            isOnline={isOnline}
            pendingOfflineCount={offlineDrafts.length + offlineCareActions.length}
            alerts={alerts}
            careUnreadCount={
              user.role === 'PATIENT'
                ? patientPortal?.unreadNotificationsCount ?? 0
                : ashaConnectivity?.unreadNotificationsCount ?? 0
            }
            onMarkAlertRead={(id) => {
              void api.markAlertRead(id, true).then(() => {
                setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
              });
            }}
            onNavigate={setActiveSection}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onSwitchRole={(role) => void handleSwitchRole(role)}
            onOpenAccountModal={() => setShowAccountModal(true)}
          />

          <main
            id="main-content"
            className={`mx-auto w-full min-w-0 flex-1 ${
              isMobileLayout ? 'px-3 py-4' : 'max-w-7xl px-4 py-6 sm:px-6'
            }`}
          >
            {savedBanner && (activeSection === 'VISIT' || activeSection === 'WHAT_TO_FILL') && (
              <div
                role="status"
                className="mb-6 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] p-5 text-[#064E3B]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-[#10A77A]" aria-hidden="true" />
                    <span>
                      {t.form.visitSavedPrefix} · {savedBanner.message}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedBanner(null);
                      voice.resetPipeline();
                    }}
                    className="min-h-[40px] rounded-xl bg-[#087F75] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#066860]"
                  >
                    {t.form.startNextVisit}
                  </button>
                </div>
                {savedBanner.followups.length > 0 && (
                  <div className="mt-3 border-t border-[#A7F3D0] pt-3">
                    <div className="text-xs font-bold text-[#087F75]">
                      {t.form.nextActionsGenerated}
                    </div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs">
                      {savedBanner.followups.map((f) => (
                        <li key={f.id}>
                          {f.taskDescription}
                          {f.dueDate ? ` (${t.dashboard.due} ${f.dueDate})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'DASHBOARD' && user.role !== 'PATIENT' && (
              <DashboardHome
                language={language}
                summary={dashboardSummary}
                visits={visits}
                followups={followups}
                alerts={alerts}
                isMobileLayout={isMobileLayout}
                ashaConnectivity={ashaConnectivity}
                emergencyDirectory={emergencyDirectory}
                onStartVoiceVisit={(vt) => {
                  if (vt) setVisitType(vt);
                  setActiveSection('VISIT');
                }}
                onNavigate={setActiveSection}
                onOpenCareMode={(mode) => {
                  setActiveCareMode(mode);
                  setActiveSection('CARE_MODES');
                }}
                onCompleteFollowup={(id) => {
                  void api.completeFollowup(id).then(() => {
                    if (user) void loadWorkspaceData(user, analyticsRange);
                  });
                }}
              />
            )}

            {activeSection === 'CARE_MODES' && user.role !== 'PATIENT' && (
              <HealthcareModeWorkspace
                activeMode={activeCareMode}
                onChangeMode={setActiveCareMode}
                onRefreshDashboard={() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                }}
                onStartVoiceVisit={(vt) => {
                  setVisitType(vt);
                  setActiveSection('VISIT');
                }}
              />
            )}

            {activeSection === 'CONNECTED_PATIENTS' && user.role !== 'PATIENT' && (
              <ConnectedPatientsPage
                dashboard={ashaConnectivity}
                onRefresh={async () => {
                  if (user) await loadWorkspaceData(user, analyticsRange);
                }}
                onOpenMode={(mode) => {
                  setActiveCareMode(mode);
                  setActiveSection('CARE_MODES');
                }}
              />
            )}

            {(activeSection === 'PATIENT_PORTAL' ||
              (user.role === 'PATIENT' && activeSection === 'DASHBOARD')) && (
              <PatientPortalDashboard
                portal={patientPortal}
                onRefresh={async () => {
                  if (user) await loadWorkspaceData(user, analyticsRange);
                }}
              />
            )}

            {activeSection === 'VISIT' && (
              <div className="mx-auto max-w-4xl space-y-5">
                <VoiceCapturePanel
                  language={language}
                  visitType={visitType}
                  onChangeVisitType={(nextType) => {
                    setVisitType(nextType);
                    if (voice.structuredRecord && voice.structuredRecord.visitType !== nextType) {
                      const prev = voice.structuredRecord;
                      voice.setStructuredRecord({
                        ...prev,
                        visitType: nextType,
                        pregnancyDetails:
                          nextType === 'ANC'
                            ? prev.pregnancyDetails ?? {
                                gestationalAgeWeeks: null,
                                ancStatus: null,
                                weightKg: null,
                                bloodPressure: null,
                                pregnancyCondition: prev.patientCondition ?? null,
                                ifaStatus: null,
                                vaccinationStatus: null,
                                tdDose: null,
                                reportedSymptoms: null,
                              }
                            : prev.pregnancyDetails,
                        newbornDetails:
                          nextType === 'NEWBORN'
                            ? prev.newbornDetails ?? {
                                newbornId: prev.beneficiaryId,
                                motherBeneficiaryId: null,
                                birthDate: null,
                                ageDays: null,
                                birthWeightKg: null,
                                currentWeightKg: null,
                                babyGender: null,
                                babyCondition: prev.patientCondition ?? null,
                                feedingObservations: null,
                                reportedTemperature: null,
                                immunisationChecked: null,
                              }
                            : prev.newbornDetails,
                        immunisationDetails:
                          nextType === 'IMMUNISATION'
                            ? prev.immunisationDetails ?? {
                                childAgeLabel: null,
                                childWeightKg: null,
                                childCondition: prev.patientCondition ?? null,
                                vaccinesGiven: [],
                                vaccinesDue: [],
                                missedVaccines: [],
                                previousVaccineHistory: null,
                                scheduleVersion: 'NIS-2026.03',
                              }
                            : prev.immunisationDetails,
                      });
                    }
                  }}
                  beneficiaries={beneficiaries}
                  selectedBeneficiary={selectedBeneficiary}
                  onSelectBeneficiary={(ben) => {
                    setSelectedBeneficiary(ben);
                    voice.setAmbiguityCandidates([]);
                    if (ben && voice.structuredRecord) {
                      voice.setStructuredRecord({
                        ...voice.structuredRecord,
                        beneficiaryId: ben.beneficiaryCode,
                        beneficiaryName: ben.displayName,
                        householdId: ben.householdCode,
                      });
                    }
                  }}
                  onCreateBeneficiary={async (payload) => {
                    const res = await api.createBeneficiary(payload);
                    setBeneficiaries((prev) => [...prev, res.beneficiary]);
                    return res.beneficiary;
                  }}
                  ambiguityCandidates={voice.ambiguityCandidates}
                  pipelineState={voice.pipelineState}
                  waveformBars={voice.waveformBars}
                  acousticTelemetry={voice.acousticTelemetry}
                  recordingSeconds={voice.recordingSeconds}
                  liveTranscript={voice.liveTranscript}
                  partialTranscript={voice.partialTranscript}
                  fieldProvenance={voice.fieldProvenance}
                  highlightedField={voice.highlightedField}
                  onHoverField={voice.setHighlightedField}
                  structuredRecord={voice.structuredRecord}
                  noiseWarning={voice.noiseWarning}
                  micError={voice.micError}
                  providerStatus={voice.providerStatus}
                  ttfaMs={voice.ttfaMs}
                  isOnline={isOnline}
                  isMobileLayout={isMobileLayout}
                  onStartListening={() => void voice.startListening(false)}
                  onPauseListening={voice.pauseListening}
                  onResumeListening={voice.resumeListening}
                  onStopListening={() => void voice.stopListening()}
                  onCancelListening={voice.cancelListening}
                  onBargeIn={() => void voice.bargeInInterrupt()}
                  onRunJudgeScenario={(txt, vt, bc) => void handleRunJudgeScenario(txt, vt, bc)}
                />

                <StructuredRecordCard
                  record={voice.structuredRecord}
                  visitType={visitType}
                  ashaWorkerName={user.fullName}
                  workerId={user.workerCode ?? 'WORKER001'}
                  selectedBeneficiary={selectedBeneficiary}
                  pipelineState={voice.pipelineState}
                  language={language}
                  isSaving={isSavingVisit}
                  isMobileLayout={isMobileLayout}
                  highlightedField={voice.highlightedField}
                  onHoverField={voice.setHighlightedField}
                  onUpdateRecord={voice.setStructuredRecord}
                  onListenAgain={() => {
                    if (voice.structuredRecord) {
                      void voice.speakText(
                        buildReadBackScript(voice.structuredRecord, language),
                        false,
                        'WAITING_CONFIRMATION',
                      );
                    }
                  }}
                  onInterruptPlayback={() => void voice.bargeInInterrupt()}
                  onStartVoiceCorrection={() => void voice.startListening(true)}
                  onSaveDraft={() => void handleSaveDraft()}
                  onConfirmAndSave={() => void handleConfirmAndSave()}
                  onConfirmUncertainSafety={(danger) => void handleConfirmUncertainSafety(danger)}
                />
              </div>
            )}

            {activeSection === 'WHAT_TO_ASK' && (
              <WhatToAskPage
                language={language}
                activeVisitType={visitType}
                onChangeVisitType={setVisitType}
                activeRecord={voice.structuredRecord}
                activeTranscript={voice.liveTranscript || voice.partialTranscript}
                onSpeakPrompt={(txt) => void voice.speakText(txt, false, 'IDLE')}
                onStartVoiceForCategory={(vt) => {
                  setVisitType(vt);
                  setActiveSection('VISIT');
                }}
              />
            )}

            {activeSection === 'WHAT_TO_FILL' && (
              <WhatToFillPage
                record={voice.structuredRecord}
                beneficiaries={beneficiaries}
                language={language}
                workerId={user.workerCode ?? 'WORKER001'}
                isSaving={isSavingVisit}
                onUpdateRecord={voice.setStructuredRecord}
                onSaveDraft={handleSaveDraft}
                onConfirmAndSave={handleConfirmAndSave}
                onListenReadBack={(rec) => {
                  void voice.speakText(buildReadBackScript(rec, language), false, 'IDLE');
                }}
                onOpenVoiceVisit={() => setActiveSection('VISIT')}
              />
            )}

            {(activeSection === 'HISTORY' || activeSection === 'FOLLOWUPS') && (
              <HistoryAndFollowupsView
                language={language}
                activeSection={activeSection}
                visits={visits}
                followups={followups}
                referrals={referrals}
                beneficiaries={beneficiaries}
                onCompleteFollowup={(id) => {
                  void api.completeFollowup(id).then(() => {
                    if (user) void loadWorkspaceData(user, analyticsRange);
                  });
                }}
                onRescheduleFollowup={async (id, dueDate) => {
                  await api.updateFollowup(id, { dueDate });
                  if (user) await loadWorkspaceData(user, analyticsRange);
                }}
                onCreateFollowup={async (payload) => {
                  await api.createFollowup(payload);
                  if (user) await loadWorkspaceData(user, analyticsRange);
                }}
                onUpdateVisit={async (visitId, payload) => {
                  await api.updateVisit(visitId, payload);
                  if (user) await loadWorkspaceData(user, analyticsRange);
                }}
                onExportCsv={handleExportCsv}
                onFollowupsUpdated={() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                }}
              />
            )}

            {activeSection === 'OFFLINE_CARE' && user.role !== 'PATIENT' && (
              <OfflineHealthcarePanel
                language={language}
                isBrowserOnline={browserOnline}
                simulatedOffline={simulatedOffline}
                onToggleSimulatedOffline={(enabled) => {
                  setSimulatedOffline(enabled);
                  setSimulatedOfflineMode(enabled);
                }}
                snapshot={offlineCareSnapshot}
                offlineVisitDrafts={offlineDrafts}
                offlineCareActions={offlineCareActions}
                isSyncing={isSyncingOffline}
                onSyncAll={handleSyncOfflineDrafts}
                onEnqueueCareAction={(action) => {
                  setOfflineCareActions(enqueueOfflineCareAction(action));
                }}
              />
            )}

            {activeSection === 'QR_IDENTITY' && (
              <QrIdentityPanel
                connectedPatients={
                  ashaConnectivity?.allConnections ??
                  offlineCareSnapshot?.patients ??
                  []
                }
                isPatientRole={user.role === 'PATIENT'}
                selfPatientUniqueId={
                  user.role === 'PATIENT' ? patientPortal?.patient.patientUniqueId ?? user.patientUniqueId : null
                }
                onOpenCareMode={
                  user.role !== 'PATIENT'
                    ? (mode) => {
                        setActiveCareMode(mode);
                        setActiveSection('CARE_MODES');
                      }
                    : undefined
                }
              />
            )}

            {activeSection === 'AI_ASSISTANT' && user.role !== 'PATIENT' && (
              <MultilingualAiAssistant
                language={language}
                onChangeLanguage={(l) => void handleChangeLanguage(l)}
                isOnline={isOnline}
                voiceSpeed={settings.voiceSpeed}
              />
            )}

            {activeSection === 'PREGNANCY_RISK' && user.role !== 'PATIENT' && (
              <PregnancyRiskAlertPanel
                onRefreshWorkspace={() => {
                  if (user) void loadWorkspaceData(user, analyticsRange);
                }}
              />
            )}

            {activeSection === 'EMERGENCY_CONTACTS' && (
              <EmergencyContactsPanel
                userRole={user.role}
                onDirectoryLoaded={(dir) => setEmergencyDirectory(dir)}
              />
            )}

            {activeSection === 'ALERTS' && (
              <AlertsCenterPage
                language={language}
                alerts={alerts}
                referrals={referrals}
                userRole={user.role}
                onMarkAlertRead={(id) => {
                  void api.markAlertRead(id, true).then(() => {
                    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
                  });
                }}
                onAcknowledgeReferral={(id) => {
                  void api.acknowledgeReferral(id).then(() => {
                    if (user) void loadWorkspaceData(user, analyticsRange);
                  });
                }}
              />
            )}

            {activeSection === 'REPORTS' && (
              <ReportsAnalyticsPage
                language={language}
                visits={visits}
                ashaWorkerName={user.fullName}
                analyticsRange={analyticsRange}
                analyticsBuckets={analyticsBuckets}
                onChangeRange={(r) => {
                  setAnalyticsRange(r);
                  void loadAnalytics(r);
                }}
                onExportCsv={handleExportCsv}
              />
            )}

            {activeSection === 'SETTINGS' && (
              <SettingsPage
                language={language}
                user={user}
                settings={settings}
                onSaveSettings={async (patch) => {
                  const res = await api.updateSettings(patch);
                  setSettings(res.settings);
                  if (patch.preferredLanguage) setLanguage(patch.preferredLanguage);
                }}
                onTestVoiceSpeed={() => {
                  void voice.speakText(t.settings.sampleSpeedText, false, 'IDLE');
                }}
              />
            )}

            {activeSection === 'HELP' && (
              <HelpSupportPage
                language={language}
                onLaunchScenario={(txt, vt, bc) => void handleRunJudgeScenario(txt, vt, bc)}
              />
            )}

            {activeSection === 'SUPERVISOR' && isSupervisorOrAdmin && (
              <SupervisorDashboard
                overview={supervisorOverview}
                visits={visits}
                referrals={referrals}
                guidelines={guidelines}
                metrics={metrics}
                retentionConfig={retentionConfig}
                auditLogs={auditLogs}
                onAcknowledgeReferral={(id) => {
                  void api.acknowledgeReferral(id).then(() => {
                    if (user) void loadWorkspaceData(user, analyticsRange);
                  });
                }}
                onUpdateRetention={async (hours, days) => {
                  const res = await api.updateRetentionConfig(hours, days);
                  setRetentionConfig(res.retention);
                  if (user) void loadWorkspaceData(user, analyticsRange);
                }}
                onPurgeTranscripts={async () => {
                  const res = await api.purgeExpiredTranscripts();
                  if (user) void loadWorkspaceData(user, analyticsRange);
                  return res;
                }}
              />
            )}
          </main>

          {/* Mobile Bottom Quick Bar */}
          <nav
            aria-label="Mobile Quick Navigation"
            className={`grid h-16 shrink-0 ${
              user.role === 'PATIENT' ? 'grid-cols-3' : 'grid-cols-4'
            } border-t border-[#E7EDF2] bg-white/95 backdrop-blur-md ${
              isMobileLayout
                ? 'sticky bottom-0 z-30'
                : 'fixed bottom-0 left-0 right-0 z-30 lg:hidden'
            }`}
          >
            {user.role === 'PATIENT' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('PATIENT_PORTAL')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'PATIENT_PORTAL' ? 'text-[#087F75]' : 'text-[#718096]'
                  }`}
                >
                  <UserCheck className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('SETTINGS')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'SETTINGS' ? 'text-[#087F75]' : 'text-[#718096]'
                  }`}
                >
                  <Settings className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">{t.nav.settings}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('HELP')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'HELP' ? 'text-[#087F75]' : 'text-[#718096]'
                  }`}
                >
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">{t.nav.help}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('DASHBOARD')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'DASHBOARD' ? 'text-[#087F75]' : 'text-[#718096]'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">{t.nav.home}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('VISIT')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'VISIT' ? 'text-[#10A77A]' : 'text-[#718096]'
                  }`}
                >
                  <Mic className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">{t.nav.voice}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('FOLLOWUPS')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'FOLLOWUPS' ? 'text-[#087F75]' : 'text-[#718096]'
                  }`}
                >
                  <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1">{t.nav.followups}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('ALERTS')}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    activeSection === 'ALERTS'
                      ? 'text-[#D94B4B]'
                      : unreadAlertsCount > 0
                        ? 'text-[#D94B4B]'
                        : 'text-[#718096]'
                  }`}
                >
                  <span className="relative inline-flex">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    {unreadAlertsCount > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D94B4B] px-1 font-mono text-[9px] font-bold leading-none text-white">
                        {unreadAlertsCount}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate px-1">{t.nav.alerts}</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Emergency Danger-Sign Overlay */}
      {activeEmergency && (
        <DangerAlertScreen
          analysis={activeEmergency.analysis}
          beneficiaryName={
            voice.structuredRecord?.beneficiaryName ?? selectedBeneficiary?.displayName ?? null
          }
          beneficiaryCode={
            voice.structuredRecord?.beneficiaryId ?? selectedBeneficiary?.beneficiaryCode ?? null
          }
          language={language}
          persistedOfflineOnly={activeEmergency.persistedOfflineOnly}
          emergencyDirectory={emergencyDirectory}
          onReplayAlert={() => {
            void voice.speakText(langCfg.emergencyAnnouncement, true, 'DANGER_ALERT');
          }}
          onAcknowledgeAndReturn={() => {
            voice.resetPipeline();
            setActiveEmergency(null);
            setActiveSection('ALERTS');
          }}
        />
      )}

      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onAuthenticated={handleAuthenticatedUser}
      />

      <OfflineIndicator
        language={language}
        pendingDraftCount={offlineDrafts.length + offlineCareActions.length}
        onSyncNow={() => void handleSyncOfflineDrafts()}
        isSyncing={isSyncingOffline}
      />
    </div>
  );
}
