import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Ambulance,
  Building2,
  CheckCircle2,
  Edit3,
  Phone,
  PhoneCall,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { EmergencyContactDirectory, UserRole } from '../shared/types';
import { api } from '../utils/apiClient';

interface EmergencyContactsPanelProps {
  userRole: UserRole;
  compact?: boolean;
  onDirectoryLoaded?: (dir: EmergencyContactDirectory) => void;
}

export const EmergencyContactsPanel: React.FC<EmergencyContactsPanelProps> = ({
  userRole,
  compact = false,
  onDirectoryLoaded,
}) => {
  const [directory, setDirectory] = useState<EmergencyContactDirectory | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EmergencyContactDirectory>>({});
  const onDirectoryLoadedRef = useRef(onDirectoryLoaded);
  onDirectoryLoadedRef.current = onDirectoryLoaded;

  const loadDirectory = useCallback(async () => {
    try {
      const res = await api.getEmergencyContacts();
      setDirectory(res.directory);
      setForm(res.directory);
      onDirectoryLoadedRef.current?.(res.directory);
    } catch {
      // Non-blocking fallback when offline
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(null);
    try {
      const res = await api.updateEmergencyContacts(form);
      setDirectory(res.directory);
      setForm(res.directory);
      setEditing(false);
      setSavedBanner('Emergency contact details updated.');
      onDirectoryLoaded?.(res.directory);
    } finally {
      setSaving(false);
    }
  };

  if (!directory) {
    return (
      <div className="rounded-2xl border border-[#E7EDF2] bg-white p-5 text-xs text-[#718096]">
        Loading emergency contact directory...
      </div>
    );
  }

  const isPatient = userRole === 'PATIENT';

  return (
    <section
      aria-label="ASHA Worker Emergency Contact Information"
      className="rounded-2xl border border-red-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94B4B] text-white">
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              ASHA Worker & Emergency Contact Information
            </h3>
            <p className="text-[11px] text-[#718096]">
              Direct 24×7 escalation lines for {directory.assignedArea}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((p) => !p)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D4DDD9] bg-[#F7F9FC] px-3 text-xs font-bold text-[#172B3A] hover:border-[#087F75]"
        >
          <Edit3 className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
          <span>{editing ? 'Cancel' : isPatient ? 'Edit Family Contact' : 'Update Contacts'}</span>
        </button>
      </div>

      {savedBanner && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-3.5 py-2 text-xs font-semibold text-[#064E3B]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* High-Priority Contact Tiles */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <a
          href={`tel:${directory.workerPhone.replace(/\s+/g, '')}`}
          className="rounded-xl border border-[#087F75]/30 bg-[#E8F7F1]/70 p-3.5 transition-colors hover:border-[#087F75]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#087F75]">
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ASHA Worker ({directory.ashaUniqueId})</span>
          </div>
          <div className="mt-1 font-display text-sm font-bold text-[#172B3A]">
            {directory.workerName}
          </div>
          <div className="mt-0.5 font-mono text-xs font-extrabold text-[#087F75]">
            {directory.workerPhone}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[#475B62]">
            Backup: {directory.backupPhone}
          </div>
        </a>

        <a
          href={`tel:${directory.ambulanceNumber}`}
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 transition-colors hover:border-[#D94B4B]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D94B4B]">
            <Ambulance className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Emergency Ambulance</span>
          </div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#991B1B]">
            {directory.ambulanceNumber}
          </div>
          <div className="mt-0.5 text-[11px] text-[#991B1B]">
            24×7 Free Obstetric & Newborn Transport
          </div>
        </a>

        <a
          href={`tel:${directory.phcPhone.replace(/\s+/g, '')}`}
          className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 transition-colors hover:border-[#087F75]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#475B62]">
            <Building2 className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
            <span>Primary Health Centre (PHC)</span>
          </div>
          <div className="mt-1 truncate text-xs font-bold text-[#172B3A]">
            {directory.phcName}
          </div>
          <div className="mt-1 font-mono text-xs font-extrabold text-[#087F75]">
            {directory.phcPhone}
          </div>
        </a>

        <a
          href={`tel:${directory.supervisorPhone.replace(/\s+/g, '')}`}
          className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 transition-colors hover:border-[#087F75]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#475B62]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
            <span>Medical Supervisor & Helpline</span>
          </div>
          <div className="mt-1 truncate text-xs font-bold text-[#172B3A]">
            {directory.supervisorName}
          </div>
          <div className="mt-1 font-mono text-xs font-extrabold text-[#172B3A]">
            {directory.supervisorPhone}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[#087F75]">
            State Helpline: {directory.districtHelpline}
          </div>
        </a>
      </div>

      {/* Patient Personal Family Emergency Contact */}
      {(isPatient || directory.patientEmergencyContactPhone) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <span>
              <strong>Family Emergency Contact:</strong>{' '}
              {directory.patientEmergencyContactName || 'Not set'}
              {directory.patientEmergencyContactRelation &&
              !(directory.patientEmergencyContactName ?? '')
                .toLowerCase()
                .includes(directory.patientEmergencyContactRelation.toLowerCase())
                ? ` (${directory.patientEmergencyContactRelation})`
                : ''}
            </span>
          </div>
          <span className="font-mono font-bold text-[#087F75]">
            {directory.patientEmergencyContactPhone || '—'}
          </span>
        </div>
      )}

      {/* Emergency Escalation Protocol Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-950">
        <strong>Escalation Protocol:</strong> {directory.emergencyInstructions}
      </div>

      {/* Edit Form */}
      {editing && (
        <form onSubmit={(e) => void handleSave(e)} className="grid grid-cols-1 gap-3 border-t border-[#E7EDF2] pt-4 text-xs sm:grid-cols-2">
          {isPatient ? (
            <>
              <div>
                <label htmlFor="pat-em-name" className="block font-semibold text-[#172B3A]">
                  Family Emergency Contact Name
                </label>
                <input
                  id="pat-em-name"
                  type="text"
                  value={form.patientEmergencyContactName ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, patientEmergencyContactName: e.target.value }))
                  }
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3"
                />
              </div>
              <div>
                <label htmlFor="pat-em-rel" className="block font-semibold text-[#172B3A]">
                  Relation
                </label>
                <input
                  id="pat-em-rel"
                  type="text"
                  value={form.patientEmergencyContactRelation ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, patientEmergencyContactRelation: e.target.value }))
                  }
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pat-em-phone" className="block font-semibold text-[#172B3A]">
                  Family Contact Phone
                </label>
                <input
                  id="pat-em-phone"
                  type="text"
                  value={form.patientEmergencyContactPhone ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, patientEmergencyContactPhone: e.target.value }))
                  }
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="ec-wphone" className="block font-semibold text-[#172B3A]">
                  ASHA Worker Phone
                </label>
                <input
                  id="ec-wphone"
                  type="text"
                  value={form.workerPhone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, workerPhone: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono"
                />
              </div>
              <div>
                <label htmlFor="ec-bphone" className="block font-semibold text-[#172B3A]">
                  Backup Phone
                </label>
                <input
                  id="ec-bphone"
                  type="text"
                  value={form.backupPhone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, backupPhone: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono"
                />
              </div>
              <div>
                <label htmlFor="ec-phc" className="block font-semibold text-[#172B3A]">
                  PHC Name
                </label>
                <input
                  id="ec-phc"
                  type="text"
                  value={form.phcName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, phcName: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3"
                />
              </div>
              <div>
                <label htmlFor="ec-phc-phone" className="block font-semibold text-[#172B3A]">
                  PHC Phone
                </label>
                <input
                  id="ec-phc-phone"
                  type="text"
                  value={form.phcPhone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, phcPhone: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono"
                />
              </div>
              <div>
                <label htmlFor="ec-sup" className="block font-semibold text-[#172B3A]">
                  Supervisor Name
                </label>
                <input
                  id="ec-sup"
                  type="text"
                  value={form.supervisorName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, supervisorName: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3"
                />
              </div>
              <div>
                <label htmlFor="ec-sup-phone" className="block font-semibold text-[#172B3A]">
                  Supervisor Phone
                </label>
                <input
                  id="ec-sup-phone"
                  type="text"
                  value={form.supervisorPhone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, supervisorPhone: e.target.value }))}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] rounded-xl bg-[#087F75] px-5 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Emergency Contacts'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
