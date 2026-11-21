import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  HelpCircle,
  Menu,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import { SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AlertItem, AuthUser, LanguageCode } from '../shared/types';
import type { NavSection } from './SidebarNav';

interface TopHeaderBarProps {
  user: AuthUser;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  deviceMode: 'pc' | 'mobile';
  onChangeDeviceMode: (mode: 'pc' | 'mobile') => void;
  isOnline: boolean;
  pendingOfflineCount: number;
  alerts: AlertItem[];
  onMarkAlertRead: (id: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  onSwitchRole: (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN' | 'PATIENT') => void;
  onOpenAccountModal?: () => void;
  careUnreadCount?: number;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  user,
  language,
  onChangeLanguage,
  deviceMode,
  onChangeDeviceMode,
  isOnline,
  pendingOfflineCount,
  alerts,
  onMarkAlertRead,
  onNavigate,
  onOpenMobileMenu,
  onSwitchRole,
  onOpenAccountModal,
  careUnreadCount = 0,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [showBellPopover, setShowBellPopover] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const t = getTranslations(language);
  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const totalUnreadBell = unreadAlerts.length + careUnreadCount;
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t.greetings.morning : hour < 17 ? t.greetings.afternoon : t.greetings.evening;
  const isMobileLayout = deviceMode === 'mobile';
  const roleLabel =
    user.role === 'ASHA_WORKER'
      ? t.roles.worker
      : user.role === 'PATIENT'
        ? 'Patient'
        : user.role === 'SUPERVISOR'
          ? t.roles.supervisor
          : t.roles.admin;
  const uniqueCode = user.ashaUniqueId ?? user.patientUniqueId ?? user.workerCode;

  return (
    <header className="sticky top-0 z-20 border-b border-[#E7EDF2] bg-white/95 backdrop-blur-md">
      {/* Row 1: Menu + Greeting (always legible) + Desktop right controls / Mobile Bell+Avatar */}
      <div
        className={`flex min-h-[54px] items-center justify-between gap-2 py-2 ${
          isMobileLayout ? 'px-3' : 'px-3 sm:px-6'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Menu"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:bg-[#EDF5FF] ${
              isMobileLayout ? 'flex' : 'lg:hidden'
            }`}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-sm font-bold text-[#172B3A] sm:text-lg">
              {greeting}, {user.fullName}
            </h1>
            <p className="truncate text-[11px] text-[#718096]">
              {roleLabel}
              {uniqueCode ? (
                <span className="ml-1.5 inline-block rounded bg-[#E8F7F1] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#087F75]">
                  {uniqueCode}
                </span>
              ) : null}{' '}
              · {user.assignedArea ?? 'Devanahalli'}
              <span className="hidden font-mono tabular-nums sm:inline">
                {' '}
                ·{' '}
                {now.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Mode Switcher + Connectivity + Language (desktop >= sm in PC mode) + Bell + Profile */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!isMobileLayout && (
            <div
              role="group"
              aria-label="Mode"
              className="hidden items-center rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-0.5 sm:inline-flex"
            >
              <button
                type="button"
                onClick={() => onChangeDeviceMode('pc')}
                aria-pressed={true}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#087F75] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-xs transition-colors"
              >
                <Monitor className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t.header.pcMode}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeDeviceMode('mobile')}
                aria-pressed={false}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[#718096] transition-colors hover:text-[#172B3A]"
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t.header.mobileMode}</span>
              </button>
            </div>
          )}

          {/* Connectivity Indicator (Desktop PC Mode) */}
          {!isMobileLayout && (
            <div
              className={`hidden items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold xl:inline-flex whitespace-nowrap ${
                isOnline
                  ? 'border-[#D1FAE5] bg-[#E8F7F1] text-[#087F75]'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {isOnline
                  ? pendingOfflineCount > 0
                    ? `${t.header.syncing} (${pendingOfflineCount})`
                    : t.header.online
                  : `${t.header.offline} (${pendingOfflineCount})`}
              </span>
            </div>
          )}

          {/* Language Selector (Desktop >= sm in PC mode) */}
          {!isMobileLayout && (
            <div className="relative hidden items-center sm:flex">
              <Globe
                className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#087F75]"
                aria-hidden="true"
              />
              <select
                aria-label={t.header.selectLangAria}
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
                className="min-h-[38px] max-w-[165px] truncate rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] pl-8 pr-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F75] focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notification Bell Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBellPopover((prev) => !prev);
                setShowProfileMenu(false);
              }}
              aria-label={t.header.notifications}
              aria-expanded={showBellPopover}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]/40 hover:bg-[#EDF5FF]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {totalUnreadBell > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D94B4B] px-1 font-mono text-[10px] font-bold text-white">
                  {totalUnreadBell}
                </span>
              )}
            </button>

            {showBellPopover && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-[#E7EDF2] bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-2.5">
                  <span className="font-display text-sm font-bold text-[#172B3A]">
                    {t.header.notifications} ({totalUnreadBell})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBellPopover(false);
                      onNavigate(user.role === 'PATIENT' ? 'PATIENT_PORTAL' : 'ALERTS');
                    }}
                    className="text-xs font-semibold text-[#087F75] hover:underline"
                  >
                    {user.role === 'PATIENT' ? 'Open Portal' : t.header.openAlerts}
                  </button>
                </div>

                {careUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBellPopover(false);
                      onNavigate(user.role === 'PATIENT' ? 'PATIENT_PORTAL' : 'CONNECTED_PATIENTS');
                    }}
                    className="mt-2 flex w-full items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-3 py-2 text-left text-xs font-semibold text-[#087F75]"
                  >
                    <span>{careUnreadCount} unread connectivity message(s)</span>
                    <span className="underline">View</span>
                  </button>
                )}

                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#718096]">
                      {t.header.noNotifications}
                    </p>
                  ) : (
                    alerts.slice(0, 5).map((al) => (
                      <div
                        key={al.id}
                        className={`rounded-xl border p-2.5 text-xs ${
                          al.isRead
                            ? 'border-[#E7EDF2] bg-[#F7F9FC]'
                            : al.severity === 'CRITICAL'
                              ? 'border-red-200 bg-red-50/70'
                              : 'border-amber-200 bg-amber-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-[#172B3A]">{al.title}</span>
                          {!al.isRead && (
                            <button
                              type="button"
                              onClick={() => onMarkAlertRead(al.id)}
                              className="inline-flex items-center gap-0.5 rounded-md border border-[#E7EDF2] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#087F75]"
                            >
                              <Check className="h-3 w-3" aria-hidden="true" />
                              {t.header.markRead}
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-[#718096]">{al.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile & Quick Role Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setShowBellPopover(false);
              }}
              aria-label={t.header.switchRole}
              aria-expanded={showProfileMenu}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-2 py-1 hover:border-[#087F75]/40"
            >
              <img
                src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
                alt={user.fullName}
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full object-cover"
              />
              {!isMobileLayout && (
                <ChevronDown className="hidden h-3.5 w-3.5 text-[#718096] sm:block" aria-hidden="true" />
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E7EDF2] bg-white p-2 shadow-xl">
                <div className="border-b border-[#E7EDF2] px-3 py-2">
                  <div className="text-xs font-bold text-[#172B3A]">{user.fullName}</div>
                  <div className="font-mono text-[11px] text-[#718096]">
                    {uniqueCode ?? user.username} · {roleLabel}
                  </div>
                </div>

                <div className="border-b border-[#E7EDF2] py-1.5">
                  <div className="px-3 py-1 text-[10px] font-semibold text-[#718096]">
                    {t.header.switchRole}
                  </div>
                  {(
                    [
                      { role: 'ASHA_WORKER', label: t.roles.worker },
                      { role: 'PATIENT', label: 'Patient Portal (PAT-2026-0001)' },
                      { role: 'SUPERVISOR', label: t.roles.supervisor },
                      { role: 'ADMIN', label: t.roles.admin },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onSwitchRole(item.role);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs font-semibold ${
                        user.role === item.role
                          ? 'bg-[#E8F7F1] text-[#087F75]'
                          : 'text-[#172B3A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.role === 'ASHA_WORKER' ? (
                          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : item.role === 'PATIENT' ? (
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                {onOpenAccountModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAccountModal();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Register / Sign In Account
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('SETTINGS');
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
                >
                  <Settings className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                  {t.header.settings}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('HELP');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
                >
                  <HelpCircle className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                  {t.header.help}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 (Mobile Frame Mode or < sm narrow screens): Mode Switcher + Connectivity + Language */}
      <div
        className={`items-center justify-between gap-2 border-t border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 ${
          isMobileLayout ? 'flex' : 'flex sm:hidden'
        }`}
      >
        <div
          role="group"
          aria-label="Mode"
          className="inline-flex shrink-0 items-center rounded-xl border border-[#E7EDF2] bg-white p-0.5"
        >
          <button
            type="button"
            onClick={() => onChangeDeviceMode('pc')}
            aria-pressed={!isMobileLayout}
            className={`inline-flex min-h-[30px] items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              !isMobileLayout
                ? 'bg-[#087F75] text-white shadow-xs'
                : 'text-[#718096] hover:text-[#172B3A]'
            }`}
          >
            <Monitor className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{t.header.pcMode}</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeDeviceMode('mobile')}
            aria-pressed={isMobileLayout}
            className={`inline-flex min-h-[30px] items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              isMobileLayout
                ? 'bg-[#087F75] text-white shadow-xs'
                : 'text-[#718096] hover:text-[#172B3A]'
            }`}
          >
            <Smartphone className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{t.header.mobileMode}</span>
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold ${
              isOnline ? 'text-[#087F75]' : 'text-amber-700'
            }`}
          >
            {isOnline ? (
              <Wifi className="h-3 w-3" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3 w-3" aria-hidden="true" />
            )}
            <span className="hidden xs:inline">
              {isOnline ? t.header.online : `${t.header.offline} (${pendingOfflineCount})`}
            </span>
          </span>

          <div className="relative flex min-w-0 items-center">
            <Globe
              className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[#087F75]"
              aria-hidden="true"
            />
            <select
              aria-label={t.header.selectLangAria}
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
              className="min-h-[32px] max-w-[140px] truncate rounded-xl border border-[#E7EDF2] bg-white pl-7 pr-2 text-[11px] font-semibold text-[#172B3A] focus:border-[#087F75] focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
