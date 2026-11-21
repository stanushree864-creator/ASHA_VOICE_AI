import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarCheck2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardEdit,
  ClipboardList,
  HelpCircle,
  HeartPulse,
  LayoutDashboard,
  Link2,
  Mic,
  PhoneCall,
  QrCode,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import type { AuthUser, LanguageCode } from '../shared/types';

export type NavSection =
  | 'DASHBOARD'
  | 'CARE_MODES'
  | 'CONNECTED_PATIENTS'
  | 'PATIENT_PORTAL'
  | 'VISIT'
  | 'WHAT_TO_ASK'
  | 'WHAT_TO_FILL'
  | 'HISTORY'
  | 'FOLLOWUPS'
  | 'ALERTS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'HELP'
  | 'SUPERVISOR'
  | 'OFFLINE_CARE'
  | 'QR_IDENTITY'
  | 'AI_ASSISTANT'
  | 'PREGNANCY_RISK'
  | 'EMERGENCY_CONTACTS';

interface SidebarNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  deviceMode: 'pc' | 'mobile';
  user: AuthUser;
  language: LanguageCode;
  unreadAlertsCount: number;
  pendingFollowupsCount: number;
  pendingConnectionsCount?: number;
  onSwitchRole: (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT') => void;
  onOpenAccountModal?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  deviceMode,
  user,
  language,
  unreadAlertsCount,
  pendingFollowupsCount,
  pendingConnectionsCount = 0,
  onSwitchRole,
  onOpenAccountModal,
}) => {
  const t = getTranslations(language);
  const isSupervisorOrAdmin = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const isPatient = user.role === 'PATIENT';
  const isMobileLayout = deviceMode === 'mobile';

  const primaryItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'danger' | 'accent';
  }> = isPatient
    ? [
        { id: 'PATIENT_PORTAL', label: 'Patient Portal', icon: UserCheck },
        { id: 'QR_IDENTITY', label: 'My QR Health ID', icon: QrCode },
        { id: 'EMERGENCY_CONTACTS', label: 'Emergency Contacts', icon: PhoneCall },
        { id: 'SETTINGS', label: t.nav.settings, icon: Settings },
        { id: 'HELP', label: t.nav.help, icon: HelpCircle },
      ]
    : [
        { id: 'DASHBOARD', label: t.nav.home, icon: LayoutDashboard },
        { id: 'CARE_MODES', label: 'Healthcare Modes', icon: HeartPulse },
        {
          id: 'CONNECTED_PATIENTS',
          label: 'Connected Patients',
          icon: Users,
          badge: pendingConnectionsCount > 0 ? pendingConnectionsCount : undefined,
          badgeTone: 'accent',
        },
        { id: 'VISIT', label: t.nav.speakRecord, icon: Mic },
        { id: 'HISTORY', label: t.nav.visitRecords, icon: ClipboardList },
        {
          id: 'FOLLOWUPS',
          label: t.nav.followups,
          icon: CalendarCheck2,
          badge: pendingFollowupsCount > 0 ? pendingFollowupsCount : undefined,
          badgeTone: 'accent',
        },
        {
          id: 'ALERTS',
          label: t.nav.alerts,
          icon: AlertTriangle,
          badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
          badgeTone: 'danger',
        },
      ];

  const enhancementItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = isPatient
    ? []
    : [
        { id: 'OFFLINE_CARE', label: 'Offline Healthcare', icon: WifiOff },
        { id: 'QR_IDENTITY', label: 'QR Patient ID', icon: QrCode },
        { id: 'PREGNANCY_RISK', label: 'Pregnancy Risk AI', icon: ShieldAlert },
        { id: 'AI_ASSISTANT', label: 'AI Voice Assistant', icon: Bot },
        { id: 'EMERGENCY_CONTACTS', label: 'Emergency Contacts', icon: PhoneCall },
      ];

  const toolItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = isPatient
    ? []
    : [
        { id: 'WHAT_TO_ASK', label: t.nav.questionGuide, icon: CheckSquare },
        { id: 'WHAT_TO_FILL', label: t.nav.fullForm, icon: ClipboardEdit },
        { id: 'REPORTS', label: t.nav.reports, icon: BarChart3 },
        ...(isSupervisorOrAdmin
          ? [{ id: 'SUPERVISOR' as NavSection, label: t.nav.supervisor, icon: ShieldCheck }]
          : []),
        { id: 'SETTINGS', label: t.nav.settings, icon: Settings },
        { id: 'HELP', label: t.nav.help, icon: HelpCircle },
      ];

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const renderNavButton = (
    item: {
      id: NavSection;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      badgeTone?: 'danger' | 'accent';
    },
    isNarrow: boolean,
  ) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        title={isNarrow ? item.label : undefined}
        onClick={() => handleNavClick(item.id)}
        className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-[#087F75] text-white shadow-sm'
            : 'text-[#C6DCE0] hover:bg-white/8 hover:text-white'
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active ? 'text-[#E8F7F1]' : 'text-[#8BB8BD] group-hover:text-white'
            }`}
          />
          {!isNarrow && <span className="truncate">{item.label}</span>}
        </span>

        {!isNarrow && item.badge !== undefined && (
          <span
            className={`ml-2 inline-flex min-w-[22px] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
              item.badgeTone === 'danger'
                ? 'bg-[#D94B4B] text-white'
                : active
                  ? 'bg-[#E8F7F1] text-[#087F75]'
                  : 'bg-white/12 text-[#E8F7F1]'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderNavContent = (isDrawer = false) => {
    const isNarrow = !isDrawer && collapsed;
    const uniqueBadge =
      user.ashaUniqueId ?? user.patientUniqueId ?? user.workerCode ?? user.role;
    return (
      <div className="flex h-full flex-col bg-[#102B35] text-white">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => handleNavClick(isPatient ? 'PATIENT_PORTAL' : 'DASHBOARD')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <img
              src="/icon.svg"
              alt="ASHA Voice"
              className="h-9 w-9 shrink-0 rounded-xl bg-white/10 p-1"
            />
            {!isNarrow && (
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold tracking-tight text-white">
                  ASHA Voice
                </div>
                <div className="truncate text-[11px] font-medium text-[#A5D8CE]">
                  {isPatient ? 'Patient Portal' : t.roles.worker}
                </div>
              </div>
            )}
          </button>

          {isDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:flex"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">{primaryItems.map((item) => renderNavButton(item, isNarrow))}</div>

          {enhancementItems.length > 0 && !isNarrow && (
            <div className="mt-5 mb-1.5 px-3 text-[11px] font-semibold text-[#8BB8BD]">
              Field Modules
            </div>
          )}
          {enhancementItems.length > 0 && (
            <div className={`space-y-1 ${isNarrow ? 'mt-4 border-t border-white/10 pt-3' : ''}`}>
              {enhancementItems.map((item) => renderNavButton(item, isNarrow))}
            </div>
          )}

          {toolItems.length > 0 && !isNarrow && (
            <div className="mt-5 mb-1.5 px-3 text-[11px] font-semibold text-[#8BB8BD]">
              {t.nav.toolsSection}
            </div>
          )}
          {toolItems.length > 0 && (
            <div className={`space-y-1 ${isNarrow ? 'mt-4 border-t border-white/10 pt-3' : ''}`}>
              {toolItems.map((item) => renderNavButton(item, isNarrow))}
            </div>
          )}
        </nav>

        {/* Footer Worker/Patient Identity & Quick Role Switch */}
        <div className="border-t border-white/10 p-3">
          {!isNarrow && (
            <>
              <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                <img
                  src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-white">{user.fullName}</div>
                  <div className="truncate font-mono text-[10px] text-[#A5D8CE]">
                    {uniqueBadge}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchRole('ASHA_WORKER');
                    onCloseMobile();
                  }}
                  className={`min-h-[34px] rounded-lg px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    user.role === 'ASHA_WORKER'
                      ? 'bg-[#10A77A] text-white'
                      : 'bg-white/8 text-[#C6DCE0] hover:bg-white/15'
                  }`}
                >
                  {t.nav.ashaMode}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSwitchRole('PATIENT');
                    onCloseMobile();
                  }}
                  className={`min-h-[34px] rounded-lg px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    user.role === 'PATIENT'
                      ? 'bg-[#10A77A] text-white'
                      : 'bg-white/8 text-[#C6DCE0] hover:bg-white/15'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSwitchRole('SUPERVISOR');
                    onCloseMobile();
                  }}
                  className={`min-h-[34px] rounded-lg px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    user.role === 'SUPERVISOR' || user.role === 'ADMIN'
                      ? 'bg-[#10A77A] text-white'
                      : 'bg-white/8 text-[#C6DCE0] hover:bg-white/15'
                  }`}
                >
                  Supervisor
                </button>
              </div>

              {onOpenAccountModal && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMobile();
                    onOpenAccountModal();
                  }}
                  className="mt-1.5 flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] font-semibold text-[#A5D8CE] hover:bg-white/10"
                >
                  <Link2 className="h-3 w-3" aria-hidden="true" />
                  Register / Sign In
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar (only in PC Mode on >= lg) */}
      {!isMobileLayout && (
        <aside
          className={`hidden shrink-0 transition-all duration-200 lg:block ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div
            className={`fixed inset-y-0 left-0 z-30 transition-all duration-200 ${
              collapsed ? 'w-20' : 'w-64'
            }`}
          >
            {renderNavContent(false)}
          </div>
        </aside>
      )}

      {/* Slide-out Drawer (Mobile viewports OR Mobile Mode preview) */}
      {mobileOpen && (
        <div
          className={`fixed inset-0 z-50 flex ${
            isMobileLayout ? '' : 'lg:hidden'
          }`}
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] shadow-2xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
