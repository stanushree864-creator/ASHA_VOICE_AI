import React from 'react';
import { AlertTriangle, CheckCircle2, PhoneCall, ShieldAlert, Volume2 } from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import { getLanguageConfig } from '../shared/languages';
import type { DangerSignAnalysis, EmergencyContactDirectory, LanguageCode } from '../shared/types';

interface DangerAlertScreenProps {
  analysis: DangerSignAnalysis;
  beneficiaryName: string | null;
  beneficiaryCode: string | null;
  language: LanguageCode;
  persistedOfflineOnly: boolean;
  emergencyDirectory?: EmergencyContactDirectory | null;
  onReplayAlert: () => void;
  onAcknowledgeAndReturn: () => void;
}

export const DangerAlertScreen: React.FC<DangerAlertScreenProps> = ({
  analysis,
  beneficiaryName,
  beneficiaryCode,
  language,
  persistedOfflineOnly,
  emergencyDirectory,
  onReplayAlert,
  onAcknowledgeAndReturn,
}) => {
  const langCfg = getLanguageConfig(language);
  const t = getTranslations(language).emergency;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="danger-alert-heading"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#B91C1C] px-4 py-6 text-white sm:px-8 sm:py-10"
    >
      <div className="mx-auto max-w-2xl">
        {/* Urgent Header */}
        <div className="flex items-start gap-4 rounded-2xl border-2 border-white/40 bg-[#991B1B] p-6 shadow-2xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[#B91C1C]">
            <AlertTriangle className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-red-100">
              {langCfg.labels.dangerAlertTitle}
            </p>
            <h1
              id="danger-alert-heading"
              className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              {langCfg.labels.immediateReferral}
            </h1>
            <p className="mt-2 text-base font-medium leading-relaxed text-red-50">
              {langCfg.emergencyAnnouncement}
            </p>
          </div>
        </div>

        {/* Beneficiary & Detection Details */}
        <div className="mt-5 rounded-2xl bg-white p-6 text-[#0F1F24] shadow-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[#5C7078]">{t.beneficiaryRef}</div>
              <div className="mt-1 text-lg font-bold text-[#0F1F24]">
                {beneficiaryName || t.unidentified}{' '}
                {beneficiaryCode ? (
                  <span className="font-mono text-sm text-[#475B62]">· {beneficiaryCode}</span>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#5C7078]">{t.detectedAt}</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[#0F1F24]">
                {new Date(analysis.analyzedAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-[#5C7078]">
              {t.triggeringSigns}
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {analysis.matches.map((m) => (
                <li
                  key={m.code}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[#0F1F24]"
                >
                  <div className="flex items-center gap-2 font-bold text-[#991B1B]">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{m.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    {t.matchedPhrase}: &ldquo;{m.matchedPhrase}&rdquo; · <span className="font-mono">{m.guidelineId}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2
                className={`h-5 w-5 ${persistedOfflineOnly ? 'text-amber-600' : 'text-emerald-700'}`}
                aria-hidden="true"
              />
              <span className={persistedOfflineOnly ? 'text-amber-800' : 'text-emerald-800'}>
                {persistedOfflineOnly ? t.savedOffline : t.loggedPhc}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs">
            <div className="font-bold text-[#991B1B]">Direct Emergency Contacts</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <a
                href={`tel:${emergencyDirectory?.ambulanceNumber ?? '108'}`}
                className="rounded-lg bg-white px-3 py-2 shadow-xs hover:bg-red-50/40"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide text-[#991B1B]">Ambulance</span>
                <span className="mt-0.5 block font-mono text-xs font-extrabold text-[#B91C1C]">
                  {emergencyDirectory?.ambulanceNumber ?? '108'}
                </span>
              </a>
              <a
                href={`tel:${(emergencyDirectory?.phcPhone ?? '+91 80 2768 2108').replace(/\s+/g, '')}`}
                className="rounded-lg bg-white px-3 py-2 shadow-xs hover:bg-slate-50"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">PHC Line</span>
                <span className="mt-0.5 block font-mono text-xs font-bold text-[#0F1F24]">
                  {emergencyDirectory?.phcPhone ?? '+91 80 2768 2108'}
                </span>
              </a>
              <a
                href={`tel:${(emergencyDirectory?.supervisorPhone ?? '+91 98450 90108').replace(/\s+/g, '')}`}
                className="rounded-lg bg-white px-3 py-2 shadow-xs hover:bg-slate-50"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Supervisor</span>
                <span className="mt-0.5 block font-mono text-xs font-bold text-[#0F1F24]">
                  {emergencyDirectory?.supervisorPhone ?? '+91 98450 90108'}
                </span>
              </a>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            {t.guardrail}
          </div>

          {/* Primary Emergency Actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onReplayAlert}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#B91C1C] bg-white px-5 py-3 text-base font-bold text-[#B91C1C] hover:bg-red-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              {t.replayAlert}
            </button>

            <button
              type="button"
              onClick={onAcknowledgeAndReturn}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0F1F24] px-5 py-3 text-base font-bold text-white hover:bg-[#1E333A]"
            >
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
              {t.acknowledgeReturn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
