import React, { useState } from 'react';
import { Globe, Lock, Mic, ShieldCheck, Stethoscope, UserCheck } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../shared/languages';
import type { AuthUser, LanguageCode } from '../shared/types';
import { api, setAuthToken } from '../utils/apiClient';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onAuthenticated,
}) => {
  const [username, setUsername] = useState('worker01');
  const [passcode, setPasscode] = useState('asha-demo-2026');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLaunch = async (role: 'ASHA_WORKER' | 'SUPERVISOR' | 'ADMIN') => {
    setError(null);
    setLoadingRole(role);
    try {
      const res = await api.demoSignIn(role);
      setAuthToken(res.token);
      if (selectedLanguage !== res.user.preferredLanguage) {
        await api.updateLanguage(selectedLanguage).catch(() => undefined);
      }
      onAuthenticated({ ...res.user, preferredLanguage: selectedLanguage });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo session');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingRole('CREDENTIALS');
    try {
      const res = await api.login(username, passcode);
      setAuthToken(res.token);
      onAuthenticated({ ...res.user, preferredLanguage: selectedLanguage });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#0F1F24]">
      <header className="border-b border-[#E2E8E6] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <img
              src="/icon.svg"
              alt="ASHA Voice Register AI emblem"
              className="h-9 w-9 rounded-lg"
            />
            <span className="font-display text-lg font-bold tracking-tight text-[#0F1F24]">
              ASHA Voice Register AI
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:items-stretch lg:py-12">
        {/* Left column: Hero & Language / Demo Launch */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#E2E8E6] bg-white p-6 sm:p-8 lg:col-span-7">
          <div>
            <p className="text-sm font-medium text-[#0D7377]">
              Voice-First Maternal &amp; Child Field Registration
            </p>
            <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight text-[#0F1F24] [text-wrap:balance] sm:text-4xl">
              Record home visits by speaking naturally — zero typing in the field
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#475B62]">
              Speak in Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi,
              Odia, Assamese, or English with natural code-mixing. Records are validated, checked
              against official NHM danger-sign guidelines, read aloud, and confirmed by voice.
            </p>

            {/* Language Selection */}
            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1F24]">
                <Globe className="h-4 w-4 text-[#0D7377]" aria-hidden="true" />
                <span>Select Spoken &amp; Read-Back Language</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const active = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => onSelectLanguage(lang.code)}
                      className={`flex min-h-[48px] flex-col items-start justify-center rounded-xl border px-3.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-[#0D7377] bg-[#0D7377] text-white'
                          : 'border-[#E2E8E6] bg-[#F7F9F8] text-[#0F1F24] hover:border-[#0D7377]/50'
                      }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{lang.nativeName}</span>
                      <span
                        className={`text-xs ${active ? 'text-teal-100' : 'text-[#5C7078]'}`}
                      >
                        {lang.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy & Synthetic Data Disclosure */}
          <div className="mt-8 border-t border-[#E2E8E6] pt-5 text-xs leading-relaxed text-[#5C7078]">
            <p className="font-semibold text-[#0F1F24]">
              Synthetic Hackathon Dataset &amp; Speech Processing Disclosure
            </p>
            <p className="mt-1">
              This demonstration uses fictional, synthetic beneficiary records only (ASHA00125–ASHA00130).
              Do not enter real patient health information. Spoken audio is processed via server-side
              speech APIs strictly for visit transcription and read-back; raw audio is not retained.
            </p>
          </div>
        </section>

        {/* Right column: One-Tap Demo Mode + Worker Sign-In */}
        <section className="flex flex-col gap-7 rounded-2xl border border-[#E2E8E6] bg-white p-6 sm:p-8 lg:col-span-5">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F1F24]">
              Launch Synthetic Demo Mode
            </h2>
            <p className="mt-1.5 text-sm text-[#475B62]">
              Select a role to test the complete voice pipeline, danger-sign escalation, and PHC supervisor review.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {error}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => void handleDemoLaunch('ASHA_WORKER')}
                disabled={loadingRole !== null}
                className="flex min-h-[64px] w-full items-center justify-between gap-4 rounded-xl bg-[#0D7377] px-5 py-3.5 text-left text-white transition-colors hover:bg-[#0A5A5E] disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src="/src/assets/images/asha_worker_portrait_1795246317288.jpg"
                    alt="Savitha Gowda ASHA Worker"
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40"
                  />
                  <div>
                    <div className="text-base font-bold">
                      {loadingRole === 'ASHA_WORKER' ? 'Starting Session...' : 'Enter as ASHA Worker'}
                    </div>
                    <div className="text-xs text-teal-100">
                      Savitha Gowda · Devanahalli Wards 4–6
                    </div>
                  </div>
                </div>
                <Mic className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleDemoLaunch('SUPERVISOR')}
                  disabled={loadingRole !== null}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-[#E2E8E6] bg-[#F7F9F8] px-4 py-3 text-left transition-colors hover:border-[#0D7377] disabled:opacity-60"
                >
                  <Stethoscope className="h-5 w-5 shrink-0 text-[#0D7377]" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-[#0F1F24]">PHC Supervisor</div>
                    <div className="text-xs text-[#5C7078]">Dr. Kavitha Rao</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDemoLaunch('ADMIN')}
                  disabled={loadingRole !== null}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-[#E2E8E6] bg-[#F7F9F8] px-4 py-3 text-left transition-colors hover:border-[#0D7377] disabled:opacity-60"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#0D7377]" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-[#0F1F24]">District Admin</div>
                    <div className="text-xs text-[#5C7078]">Guidelines &amp; Audit</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Standard Credential Sign-In */}
          <form onSubmit={(e) => void handleLoginSubmit(e)} className="border-t border-[#E2E8E6] pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1F24]">
              <Lock className="h-4 w-4 text-[#0D7377]" aria-hidden="true" />
              <span>Worker Credential Sign-In</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="asha-username" className="block text-xs font-medium text-[#475B62]">
                  Username
                </label>
                <input
                  id="asha-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm text-[#0F1F24] focus:border-[#0D7377] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="asha-passcode" className="block text-xs font-medium text-[#475B62]">
                  Passcode
                </label>
                <input
                  id="asha-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D4DDD9] bg-white px-3 text-sm text-[#0F1F24] focus:border-[#0D7377] focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingRole !== null}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#0F1F24] bg-[#0F1F24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E333A] disabled:opacity-60"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              {loadingRole === 'CREDENTIALS' ? 'Signing In...' : 'Sign In with Credentials'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};
