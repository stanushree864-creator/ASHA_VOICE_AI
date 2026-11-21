import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  ClipboardEdit,
  ClipboardList,
  HeartPulse,
  Mic,
  PhoneCall,
  QrCode,
  ShieldAlert,
  Syringe,
  Users,
  WifiOff,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import type {
  AlertItem,
  AshaConnectivityDashboard,
  DashboardSummary,
  EmergencyContactDirectory,
  FollowupTask,
  HealthcareMode,
  LanguageCode,
  SavedVisitSummary,
  VisitType,
} from '../shared/types';
import type { NavSection } from './SidebarNav';

interface DashboardHomeProps {
  summary: DashboardSummary | null;
  visits: SavedVisitSummary[];
  followups: FollowupTask[];
  alerts: AlertItem[];
  language: LanguageCode;
  isMobileLayout?: boolean;
  ashaConnectivity?: AshaConnectivityDashboard | null;
  emergencyDirectory?: EmergencyContactDirectory | null;
  onStartVoiceVisit: (visitType?: VisitType) => void;
  onNavigate: (section: NavSection) => void;
  onCompleteFollowup: (id: string) => void;
  onOpenCareMode?: (mode: HealthcareMode) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  summary,
  visits,
  followups,
  alerts,
  language,
  isMobileLayout = false,
  ashaConnectivity,
  emergencyDirectory,
  onStartVoiceVisit,
  onNavigate,
  onCompleteFollowup,
  onOpenCareMode,
}) => {
  const t = getTranslations(language);
  const visitsCompleted = summary?.visitsCompleted ?? visits.length;
  const pendingFollowups = followups.filter((f) => f.taskStatus === 'PENDING');
  const pendingFollowupsCount = summary?.pendingFollowups ?? pendingFollowups.length;
  const criticalAlertsCount = alerts.filter((a) => !a.isRead || a.severity === 'CRITICAL').length;
  const alertEventsCount = summary?.alertEvents ?? criticalAlertsCount;

  const quickVisitCards: Array<{
    type: VisitType;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }> = [
    {
      type: 'ANC',
      title: t.dashboard.pregnancyVisit,
      icon: HeartPulse,
      accent: 'bg-[#E8F7F1] text-[#087F75]',
    },
    {
      type: 'NEWBORN',
      title: t.dashboard.newbornCare,
      icon: Baby,
      accent: 'bg-[#EDF5FF] text-[#2563EB]',
    },
    {
      type: 'IMMUNISATION',
      title: t.dashboard.vaccination,
      icon: Syringe,
      accent: 'bg-amber-50 text-[#D97706]',
    },
  ];

  const healthcareModes: Array<{
    mode: HealthcareMode;
    title: string;
    subtitle: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    borderHover: string;
  }> = [
    {
      mode: 'PREGNANCY',
      title: 'Pregnancy Mode',
      subtitle: 'Antenatal checkups, EDD & maternal vitals',
      count: ashaConnectivity?.modeCounts.PREGNANCY ?? 0,
      icon: HeartPulse,
      accent: 'bg-[#E8F7F1] text-[#087F75]',
      borderHover: 'hover:border-[#087F75]',
    },
    {
      mode: 'NEWBORN_CARE',
      title: 'Newborn Care Mode',
      subtitle: 'Birth weight, growth & HBNC checkups',
      count: ashaConnectivity?.modeCounts.NEWBORN_CARE ?? 0,
      icon: Baby,
      accent: 'bg-[#EDF5FF] text-[#2563EB]',
      borderHover: 'hover:border-[#2563EB]',
    },
    {
      mode: 'VACCINATION',
      title: 'Vaccination Mode',
      subtitle: 'Completed, due schedules & reminders',
      count: ashaConnectivity?.modeCounts.VACCINATION ?? 0,
      icon: Syringe,
      accent: 'bg-amber-50 text-[#D97706]',
      borderHover: 'hover:border-[#D97706]',
    },
  ];

  const categoryLabel = (vt: VisitType) =>
    vt === 'ANC' ? t.categories.pregnancy : vt === 'NEWBORN' ? t.categories.newborn : t.categories.vaccines;

  return (
    <div className={isMobileLayout ? 'space-y-4' : 'space-y-6'}>
      {/* 1. Primary Voice-First Action Hero */}
      <section
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] text-white shadow-sm ${
          isMobileLayout ? 'p-5' : 'p-6 sm:p-7'
        }`}
      >
        <div
          className={`relative z-10 flex items-center justify-between gap-6 ${
            isMobileLayout ? 'flex-col items-stretch' : ''
          }`}
        >
          <div className="min-w-0 flex-1 space-y-3">
            {ashaConnectivity?.worker.ashaUniqueId && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-[#A5D8CE]">
                <span>ASHA ID: {ashaConnectivity.worker.ashaUniqueId}</span>
              </div>
            )}
            <h2
              className={`font-display font-extrabold tracking-tight ${
                isMobileLayout ? 'text-xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {t.dashboard.tapAndSpeak}
            </h2>

            <div className={`flex flex-wrap items-center gap-2.5 pt-1 ${isMobileLayout ? 'flex-col items-stretch' : ''}`}>
              <button
                type="button"
                onClick={() => onStartVoiceVisit('ANC')}
                className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#10A77A] px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#0D9169]"
              >
                <Mic className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{t.dashboard.startSpeaking}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('HISTORY')}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.dashboard.savedVisits} ({visitsCompleted})</span>
              </button>
            </div>
          </div>

          {!isMobileLayout && (
            <div className="hidden shrink-0 md:block">
              <div className="overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 p-2 shadow-lg">
                <img
                  src="/src/assets/images/asha_worker_portrait_1795246317288.jpg"
                  alt="ASHA Community Health Worker"
                  referrerPolicy="no-referrer"
                  className="h-36 w-44 rounded-xl object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Simple 3-Number At-a-Glance Strip */}
      <section aria-label={t.dashboard.visitsDone} className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('HISTORY')}
          className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-3.5 text-left transition-colors hover:border-[#087F75] sm:p-5"
        >
          <div className="truncate text-[11px] font-semibold text-[#718096] sm:text-xs">
            {t.dashboard.visitsDone}
          </div>
          <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-[#172B3A] sm:text-3xl">
            {visitsCompleted}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('FOLLOWUPS')}
          className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-3.5 text-left transition-colors hover:border-[#087F75] sm:p-5"
        >
          <div className="truncate text-[11px] font-semibold text-[#718096] sm:text-xs">
            {t.dashboard.followups}
          </div>
          <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-[#087F75] sm:text-3xl">
            {pendingFollowupsCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ALERTS')}
          className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-3.5 text-left transition-colors hover:border-[#D94B4B] sm:p-5"
        >
          <div className="truncate text-[11px] font-semibold text-[#718096] sm:text-xs">
            {t.dashboard.alerts}
          </div>
          <div
            className={`mt-1 font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${
              alertEventsCount > 0 ? 'text-[#D94B4B]' : 'text-[#172B3A]'
            }`}
          >
            {alertEventsCount}
          </div>
        </button>
      </section>

      {/* 2B. Three Dedicated Healthcare Modes & Connected Patients */}
      {onOpenCareMode && (
        <section aria-label="Healthcare Modes" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-[#172B3A] sm:text-base">
              Healthcare Modes
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('CONNECTED_PATIENTS')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-bold text-[#087F75] hover:border-[#087F75]"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Connected Patients ({ashaConnectivity?.connectedPatients.length ?? 0})
                {(ashaConnectivity?.pendingRequests.length ?? 0) > 0
                  ? ` · ${ashaConnectivity?.pendingRequests.length} Pending`
                  : ''}
              </span>
            </button>
          </div>

          <div
            className={`grid gap-3 ${
              isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            {healthcareModes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => onOpenCareMode(item.mode)}
                  className={`group flex min-h-[82px] items-center justify-between gap-3 rounded-2xl border border-[#E7EDF2] bg-white p-4 text-left transition-colors ${item.borderHover}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.accent}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-bold text-[#172B3A]">
                        {item.title}
                      </div>
                      <div className="truncate text-[11px] text-[#718096]">{item.subtitle}</div>
                      <div className="mt-1 font-mono text-[11px] font-bold text-[#087F75]">
                        {item.count} {item.count === 1 ? 'patient' : 'patients'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[#94A3B8] group-hover:text-[#087F75]"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Choose Visit Type & Start Speaking Immediately */}
      <section aria-label={t.dashboard.visitCategory}>
        <h3 className="mb-2.5 font-display text-sm font-bold text-[#172B3A] sm:text-base">
          {t.dashboard.visitCategory}
        </h3>
        <div
          className={`grid gap-3 ${
            isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
          }`}
        >
          {quickVisitCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.type}
                type="button"
                onClick={() => onStartVoiceVisit(card.type)}
                className="group flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border border-[#E7EDF2] bg-white p-4 text-left transition-colors hover:border-[#087F75]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.accent}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-bold text-[#172B3A] group-hover:text-[#087F75]">
                      {card.title}
                    </div>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#94A3B8] group-hover:text-[#087F75]"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Today's Follow-ups & Alerts */}
      <section
        className={`grid gap-4 ${
          isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
        }`}
      >
        {/* Today's Follow-ups */}
        <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                {t.dashboard.pendingFollowups}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('FOLLOWUPS')}
              className="text-xs font-semibold text-[#087F75] hover:underline"
            >
              {t.dashboard.seeAll}
            </button>
          </div>

          {pendingFollowups.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#718096]">
              {t.dashboard.noPendingFollowups}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {pendingFollowups.slice(0, 3).map((fu) => (
                <li
                  key={fu.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#172B3A]">
                      {fu.beneficiaryName}
                    </div>
                    <div className="truncate text-[11px] text-[#718096]">
                      {fu.taskDescription}
                    </div>
                    {fu.dueDate && (
                      <div className="mt-0.5 font-mono text-[10px] font-semibold text-[#087F75]">
                        {t.dashboard.due} {fu.dueDate}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onCompleteFollowup(fu.id)}
                    className="min-h-[38px] shrink-0 rounded-lg border border-[#A7F3D0] bg-white px-3 py-1.5 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                  >
                    {t.dashboard.done}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alerts & Recent Records */}
        <div className="min-w-0 rounded-2xl border border-[#E7EDF2] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${alerts.length > 0 ? 'text-[#D94B4B]' : 'text-[#087F75]'}`}
                aria-hidden="true"
              />
              <h3 className="font-display text-sm font-bold text-[#172B3A]">
                {t.dashboard.alertsAndRecent}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ALERTS')}
              className="text-xs font-semibold text-[#087F75] hover:underline"
            >
              {t.dashboard.openAlerts}
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {alerts.slice(0, 2).map((al) => (
              <div
                key={al.id}
                className={`rounded-xl border px-3 py-2.5 text-xs ${
                  al.severity === 'CRITICAL'
                    ? 'border-red-200 bg-red-50/70 text-[#991B1B]'
                    : 'border-amber-200 bg-amber-50/70 text-amber-900'
                }`}
              >
                <div className="font-bold">{al.title}</div>
                <div className="mt-0.5 truncate opacity-90">{al.description}</div>
              </div>
            ))}

            {visits.slice(0, alerts.length > 0 ? 1 : 3).map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-[#172B3A]">
                    {v.beneficiaryName} · {categoryLabel(v.visitType)}
                  </div>
                  <div className="truncate text-[11px] text-[#718096]">
                    {v.structuredPayload.nextVisitDate
                      ? `${t.dashboard.nextVisitLabel}: ${v.structuredPayload.nextVisitDate}`
                      : t.dashboard.visitRecorded}
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10A77A]" aria-hidden="true" />
              </div>
            ))}

            {alerts.length === 0 && visits.length === 0 && (
              <p className="py-6 text-center text-xs text-[#718096]">{t.dashboard.noVisitsYet}</p>
            )}
          </div>
        </div>
      </section>

      {/* 4B. Six Field Enhancement Modules Quick Access + Emergency Contact Bar */}
      <section aria-label="Smart Field Modules" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold text-[#172B3A] sm:text-base">
            Smart Field Tools
          </h3>
          {emergencyDirectory && (
            <button
              type="button"
              onClick={() => onNavigate('EMERGENCY_CONTACTS')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1 font-mono text-[11px] font-bold text-[#991B1B] hover:border-[#D94B4B]"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#D94B4B]" aria-hidden="true" />
              <span>
                SOS {emergencyDirectory.ambulanceNumber} · PHC {emergencyDirectory.phcPhone}
              </span>
            </button>
          )}
        </div>

        <div
          className={`grid gap-2.5 ${
            isMobileLayout ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
          }`}
        >
          {(
            [
              {
                section: 'OFFLINE_CARE' as NavSection,
                label: 'Offline Mode',
                sub: 'Local cache & sync',
                icon: WifiOff,
                tone: 'bg-slate-100 text-[#102B35]',
              },
              {
                section: 'QR_IDENTITY' as NavSection,
                label: 'QR Patient ID',
                sub: 'Scan & ID cards',
                icon: QrCode,
                tone: 'bg-[#E8F7F1] text-[#087F75]',
              },
              {
                section: 'FOLLOWUPS' as NavSection,
                label: 'Smart Follow-Ups',
                sub: 'Due & milestones',
                icon: CalendarCheck2,
                tone: 'bg-amber-50 text-[#D97706]',
              },
              {
                section: 'AI_ASSISTANT' as NavSection,
                label: 'AI Voice Helper',
                sub: '12 languages Q&A',
                icon: Bot,
                tone: 'bg-[#EDF5FF] text-[#2563EB]',
              },
              {
                section: 'PREGNANCY_RISK' as NavSection,
                label: 'Pregnancy Risk AI',
                sub: 'Early risk alerts',
                icon: ShieldAlert,
                tone: 'bg-red-50 text-[#D94B4B]',
              },
              {
                section: 'EMERGENCY_CONTACTS' as NavSection,
                label: 'Emergency Lines',
                sub: 'ASHA, PHC & 108',
                icon: PhoneCall,
                tone: 'bg-red-50 text-[#B91C1C]',
              },
            ] as const
          ).map((tile) => {
            const TileIcon = tile.icon;
            return (
              <button
                key={tile.section}
                type="button"
                onClick={() => onNavigate(tile.section)}
                className="flex min-h-[78px] flex-col items-start justify-between rounded-2xl border border-[#E7EDF2] bg-white p-3 text-left transition-colors hover:border-[#087F75]"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tile.tone}`}>
                  <TileIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="mt-2 min-w-0 w-full">
                  <div className="truncate text-xs font-bold text-[#172B3A]">{tile.label}</div>
                  <div className="truncate text-[10px] text-[#718096]">{tile.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Simple Bottom Field Tools Bar */}
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('WHAT_TO_ASK')}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-white px-3 py-2.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
          <span className="truncate">{t.nav.questionGuide}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('WHAT_TO_FILL')}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-white px-3 py-2.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
        >
          <ClipboardEdit className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
          <span className="truncate">{t.nav.fullForm}</span>
        </button>
      </section>
    </div>
  );
};
