import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import type { AlertItem, LanguageCode, ReferralRecord, UserRole } from '../shared/types';

interface AlertsCenterPageProps {
  language: LanguageCode;
  alerts: AlertItem[];
  referrals: ReferralRecord[];
  userRole: UserRole;
  onMarkAlertRead: (id: string) => void;
  onAcknowledgeReferral: (id: string) => void;
}

export const AlertsCenterPage: React.FC<AlertsCenterPageProps> = ({
  language,
  alerts,
  referrals,
  userRole,
  onMarkAlertRead,
  onAcknowledgeReferral,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const isSupervisor = userRole === 'SUPERVISOR' || userRole === 'ADMIN';
  const t = getTranslations(language);
  const at = t.alerts;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'UNREAD') return !a.isRead;
      if (filter === 'CRITICAL') return a.severity === 'CRITICAL';
      return true;
    });
  }, [alerts, filter]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{at.title}</h2>

          <div className="flex gap-1 rounded-xl bg-[#F7F9FC] p-1">
            {(['ALL', 'UNREAD', 'CRITICAL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  filter === tab
                    ? 'bg-[#087F75] text-white'
                    : 'text-[#718096] hover:text-[#172B3A]'
                }`}
              >
                {tab === 'ALL' ? at.all : tab === 'UNREAD' ? at.unread : at.critical}
              </button>
            ))}
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#718096]">{at.noAlerts}</div>
        ) : (
          <ul className="mt-4 space-y-3">
            {filteredAlerts.map((al) => (
              <li
                key={al.id}
                className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                  al.severity === 'CRITICAL'
                    ? 'border-red-200 bg-red-50/60'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 ${
                        al.severity === 'CRITICAL' ? 'text-[#D94B4B]' : 'text-[#F4A340]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-[#172B3A]">{al.title}</span>
                    {!al.isRead && (
                      <span className="rounded-md bg-[#D94B4B] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {at.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#172B3A]">{al.description}</p>
                  <div className="font-mono text-[11px] text-[#718096]">
                    {al.beneficiaryName ?? t.voice.patient} ({al.beneficiaryCode ?? '—'}) ·{' '}
                    {new Date(al.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!al.isRead ? (
                    <button
                      type="button"
                      onClick={() => onMarkAlertRead(al.id)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {at.markRead}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#718096]">
                      <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
                      {at.read}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#D94B4B]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">{at.referralLog}</h3>
          </div>
          <span className="font-mono text-xs font-bold tabular-nums text-[#D94B4B]">
            {referrals.length} {at.referralsCount}
          </span>
        </div>

        {referrals.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#718096]">{at.noReferrals}</p>
        ) : (
          <ul className="divide-y divide-[#E7EDF2]">
            {referrals.map((ref) => (
              <li
                key={ref.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm font-bold text-[#D94B4B]">{ref.dangerSignTitle}</div>
                  <div className="mt-1 text-xs text-[#172B3A]">
                    {ref.beneficiaryName} · <span className="font-mono">{ref.beneficiaryCode}</span>{' '}
                    · &ldquo;{ref.matchedPhrase}&rdquo;
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#718096]">
                    {new Date(ref.referralTimestamp).toLocaleString()} · {ref.sourceGuidelineId}
                  </div>
                </div>

                {isSupervisor && ref.acknowledgementStatus === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={() => onAcknowledgeReferral(ref.id)}
                    className="min-h-[42px] rounded-xl bg-[#087F75] px-4 py-2 text-xs font-bold text-white hover:bg-[#066860] shrink-0"
                  >
                    {at.acknowledge}
                  </button>
                ) : (
                  <span className="font-mono text-xs font-semibold text-[#087F75] shrink-0">
                    {ref.acknowledgementStatus === 'ACKNOWLEDGED_BY_PHC'
                      ? at.acknowledgedPhc
                      : at.pendingPhc}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
