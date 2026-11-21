import React, { useState } from 'react';
import { CheckCircle2, Eye, Globe, Volume2, Wifi } from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import { SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AuthUser, LanguageCode, UserSettings } from '../shared/types';

interface SettingsPageProps {
  language: LanguageCode;
  user: AuthUser;
  settings: UserSettings;
  onSaveSettings: (
    patch: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>,
  ) => Promise<void>;
  onTestVoiceSpeed: (speed: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  language,
  user,
  settings,
  onSaveSettings,
  onTestVoiceSpeed,
}) => {
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const t = getTranslations(language);
  const st = t.settings;

  const roleLabel =
    user.role === 'SUPERVISOR'
      ? t.roles.supervisor
      : user.role === 'ADMIN'
        ? t.roles.admin
        : user.role === 'PATIENT'
          ? 'Patient'
          : t.roles.worker;
  const uniqueCode = user.ashaUniqueId ?? user.patientUniqueId ?? user.workerCode ?? user.username;

  const handleToggle = async (
    patch: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>,
  ) => {
    setSaving(true);
    try {
      await onSaveSettings(patch);
      setSavedNotice(st.updatedSaved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{st.title}</h2>
        </div>

        {/* Profile Summary */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
          <div className="flex items-center gap-3.5">
            <img
              src={user.avatarUrl ?? '/src/assets/images/asha_worker_portrait_1795246317288.jpg'}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <div className="font-display text-base font-bold text-[#172B3A]">{user.fullName}</div>
              <div className="text-xs text-[#718096]">
                {roleLabel} ·{' '}
                <span className="font-mono font-bold text-[#087F75]">{uniqueCode}</span> ·{' '}
                {user.assignedArea ?? 'Devanahalli'}
              </div>
            </div>
          </div>
        </div>

        {savedNotice && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-2.5 text-xs font-semibold text-[#087F75]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Language & Voice Speed */}
          <div className="space-y-4 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-5">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#172B3A]">
              <Globe className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>{st.languageSpeech}</span>
            </div>

            <div>
              <label htmlFor="settings-language" className="block text-xs font-semibold text-[#718096]">
                {st.preferredLanguage}
              </label>
              <select
                id="settings-language"
                value={settings.preferredLanguage}
                disabled={saving}
                onChange={(e) =>
                  void handleToggle({ preferredLanguage: e.target.value as LanguageCode })
                }
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E7EDF2] bg-white px-3 text-sm font-semibold text-[#172B3A]"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="settings-voice-speed" className="text-[#718096]">
                  {st.voiceSpeed}
                </label>
                <span className="font-mono font-bold text-[#087F75]">
                  {settings.voiceSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                id="settings-voice-speed"
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={settings.voiceSpeed}
                onChange={(e) =>
                  void handleToggle({ voiceSpeed: Number(e.target.value) })
                }
                className="mt-2 w-full accent-[#087F75]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#718096]">{st.slowerFaster}</span>
                <button
                  type="button"
                  onClick={() => onTestVoiceSpeed(settings.voiceSpeed)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EDF2] bg-white px-2.5 py-1 text-xs font-semibold text-[#087F75] hover:bg-[#E8F7F1]"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {st.testSpeed}
                </button>
              </div>
            </div>
          </div>

          {/* Field Accessibility & Sync */}
          <div className="space-y-3 rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-5">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#172B3A]">
              <Eye className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>{st.accessibility}</span>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3.5">
              <div className="text-sm font-bold text-[#172B3A]">{st.highContrast}</div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => void handleToggle({ highContrast: e.target.checked })}
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3.5">
              <div className="text-sm font-bold text-[#172B3A]">{st.largerText}</div>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) => void handleToggle({ largeText: e.target.checked })}
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E7EDF2] bg-white px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Wifi className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                <div className="text-sm font-bold text-[#172B3A]">{st.offlineAutoSync}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.offlineAutoSync}
                onChange={(e) => void handleToggle({ offlineAutoSync: e.target.checked })}
                className="h-5 w-5 accent-[#087F75]"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
