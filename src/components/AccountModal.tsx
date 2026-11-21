import React, { useState } from 'react';
import { Lock, UserPlus, X } from 'lucide-react';
import type { AuthUser, HealthcareMode } from '../shared/types';
import { api, setAuthToken } from '../utils/apiClient';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  onClose,
  onAuthenticated,
}) => {
  const [tab, setTab] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [role, setRole] = useState<'ASHA_WORKER' | 'PATIENT'>('PATIENT');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [assignedArea, setAssignedArea] = useState('Devanahalli Block');
  const [assignedMode, setAssignedMode] = useState<HealthcareMode>('PREGNANCY');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.registerAccount({
        fullName: fullName.trim(),
        username: username.trim(),
        passcode,
        role,
        assignedArea: role === 'ASHA_WORKER' ? assignedArea : undefined,
        assignedMode: role === 'PATIENT' ? assignedMode : undefined,
        age: role === 'PATIENT' && age ? Number(age) : undefined,
        phone: role === 'PATIENT' && phone ? phone : undefined,
        consentGranted: true,
      });
      setAuthToken(res.token);
      await onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(username.trim(), passcode);
      setAuthToken(res.token);
      await onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Sign In or Registration"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
          <h2 className="font-display text-lg font-bold text-[#172B3A]">
            ASHA / Patient Account Access
          </h2>
          <button type="button" onClick={onClose} aria-label="Close account modal">
            <X className="h-5 w-5 text-[#718096]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#F7F9FC] p-1">
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold ${
              tab === 'REGISTER' ? 'bg-[#087F75] text-white' : 'text-[#718096]'
            }`}
          >
            Register Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg text-xs font-bold ${
              tab === 'LOGIN' ? 'bg-[#087F75] text-white' : 'text-[#718096]'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#991B1B]"
          >
            {error}
          </div>
        )}

        {tab === 'REGISTER' ? (
          <form onSubmit={(e) => void handleRegister(e)} className="mt-4 space-y-3">
            <div>
              <label htmlFor="acc-role" className="block text-xs font-semibold text-[#172B3A]">
                Account Type
              </label>
              <select
                id="acc-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ASHA_WORKER' | 'PATIENT')}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
              >
                <option value="PATIENT">Patient (Generates PAT-2026-XXXX ID)</option>
                <option value="ASHA_WORKER">ASHA Worker (Generates ASHA-2026-XXXX ID)</option>
              </select>
            </div>
            <div>
              <label htmlFor="acc-name" className="block text-xs font-semibold text-[#172B3A]">
                Full Name *
              </label>
              <input
                id="acc-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="acc-user" className="block text-xs font-semibold text-[#172B3A]">
                  Username *
                </label>
                <input
                  id="acc-user"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="acc-pass" className="block text-xs font-semibold text-[#172B3A]">
                  Passcode *
                </label>
                <input
                  id="acc-pass"
                  type="password"
                  required
                  minLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
            </div>

            {role === 'ASHA_WORKER' ? (
              <div>
                <label htmlFor="acc-area" className="block text-xs font-semibold text-[#172B3A]">
                  Assigned Area
                </label>
                <input
                  id="acc-area"
                  type="text"
                  value={assignedArea}
                  onChange={(e) => setAssignedArea(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="acc-mode" className="block text-xs font-semibold text-[#172B3A]">
                    Healthcare Mode
                  </label>
                  <select
                    id="acc-mode"
                    value={assignedMode}
                    onChange={(e) => setAssignedMode(e.target.value as HealthcareMode)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  >
                    <option value="PREGNANCY">Pregnancy Mode</option>
                    <option value="NEWBORN_CARE">Newborn Care Mode</option>
                    <option value="VACCINATION">Vaccination Mode</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="acc-age" className="block text-xs font-semibold text-[#172B3A]">
                    Age
                  </label>
                  <input
                    id="acc-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="acc-phone" className="block text-xs font-semibold text-[#172B3A]">
                    Phone Number
                  </label>
                  <input
                    id="acc-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {loading ? 'Creating Account...' : 'Create Account & Generate Unique ID'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleLogin(e)} className="mt-4 space-y-3">
            <div>
              <label htmlFor="login-user" className="block text-xs font-semibold text-[#172B3A]">
                Username
              </label>
              <input
                id="login-user"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="worker01 or patient01"
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-xs font-semibold text-[#172B3A]">
                Passcode
              </label>
              <input
                id="login-pass"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="asha-demo-2026"
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#102B35] px-4 text-xs font-bold text-white disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
