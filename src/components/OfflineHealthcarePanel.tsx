import React, { useMemo, useState } from 'react';
import {
  Baby,
  BookOpen,
  CheckCircle2,
  CloudOff,
  Database,
  HeartPulse,
  PhoneCall,
  RefreshCw,
  Search,
  Syringe,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getOfflineProtocolReferences } from '../shared/enhancementEngine';
import type {
  HealthcareMode,
  LanguageCode,
  OfflineCareSnapshot,
  OfflineQueuedCareAction,
} from '../shared/types';
import type { OfflineVisitDraft } from '../utils/offlineQueue';

interface OfflineHealthcarePanelProps {
  language: LanguageCode;
  isBrowserOnline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: (enabled: boolean) => void;
  snapshot: OfflineCareSnapshot | null;
  offlineVisitDrafts: OfflineVisitDraft[];
  offlineCareActions: OfflineQueuedCareAction[];
  isSyncing: boolean;
  onSyncAll: () => Promise<void>;
  onEnqueueCareAction: (
    action: Omit<OfflineQueuedCareAction, 'id' | 'createdAt'>,
  ) => void;
}

export const OfflineHealthcarePanel: React.FC<OfflineHealthcarePanelProps> = ({
  language,
  isBrowserOnline,
  simulatedOffline,
  onToggleSimulatedOffline,
  snapshot,
  offlineVisitDrafts,
  offlineCareActions,
  isSyncing,
  onSyncAll,
  onEnqueueCareAction,
}) => {
  const effectivelyOnline = isBrowserOnline && !simulatedOffline;
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | HealthcareMode>('ALL');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [checkupNotes, setCheckupNotes] = useState('');
  const [bpValue, setBpValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [localBanner, setLocalBanner] = useState<string | null>(null);

  const protocolCards = useMemo(() => getOfflineProtocolReferences(language), [language]);

  const cachedPatients = useMemo(() => {
    const list = snapshot?.patients ?? [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((p) => {
      if (modeFilter !== 'ALL' && p.assignedMode !== modeFilter) return false;
      if (!q) return true;
      return (
        p.patientName.toLowerCase().includes(q) ||
        p.patientUniqueId.toLowerCase().includes(q) ||
        (p.patientLocality ?? '').toLowerCase().includes(q)
      );
    });
  }, [modeFilter, searchTerm, snapshot]);

  const totalPendingSync = offlineVisitDrafts.length + offlineCareActions.length;

  const handleQueueOfflineCheckup = (e: React.FormEvent) => {
    e.preventDefault();
    const pat =
      cachedPatients.find((p) => p.patientId === selectedPatientId) ?? cachedPatients[0];
    if (!pat) return;

    const actionType: OfflineQueuedCareAction['actionType'] =
      pat.assignedMode === 'PREGNANCY'
        ? 'PREGNANCY_CHECKUP'
        : pat.assignedMode === 'NEWBORN_CARE'
          ? 'NEWBORN_CHECKUP'
          : 'VACCINATION_UPDATE';

    onEnqueueCareAction({
      actionType,
      patientId: pat.patientId,
      patientName: pat.patientName,
      patientUniqueId: pat.patientUniqueId,
      payload: {
        bloodPressure: bpValue.trim() || undefined,
        weightKg: weightValue ? Number(weightValue) : undefined,
        notes: checkupNotes.trim() || 'Recorded in Offline Healthcare Mode',
        checkupDate: new Date().toISOString().slice(0, 10),
      },
    });

    setLocalBanner(
      `Saved offline checkup update for ${pat.patientName} (${pat.patientUniqueId}). Will sync automatically once connected.`,
    );
    setCheckupNotes('');
    setBpValue('');
    setWeightValue('');
  };

  return (
    <div className="space-y-6">
      {/* Header Status & Offline Toggle */}
      <section className="rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-[#A5D8CE]">
              {effectivelyOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Online · Local Offline Cache Ready</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <span>Offline Healthcare Mode Active</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Offline Healthcare Mode
            </h2>
            <p className="text-xs text-teal-100">
              Access cached patient records, record ANC/Newborn/Vaccination updates locally with zero network, and auto-sync when back online.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleSimulatedOffline(!simulatedOffline)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
                simulatedOffline
                  ? 'bg-amber-400 text-[#102B35] hover:bg-amber-300'
                  : 'border border-white/30 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <CloudOff className="h-4 w-4" aria-hidden="true" />
              <span>{simulatedOffline ? 'Exit Offline Field Mode' : 'Enter Offline Field Mode'}</span>
            </button>

            <button
              type="button"
              disabled={!effectivelyOnline || totalPendingSync === 0 || isSyncing}
              onClick={() => void onSyncAll()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#10A77A] px-4 text-xs font-bold text-white hover:bg-[#0D9169] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>
                {isSyncing
                  ? 'Syncing...'
                  : `Sync Pending (${totalPendingSync})`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {localBanner && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-3 text-xs font-semibold text-[#064E3B]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
          <span>{localBanner}</span>
        </div>
      )}

      {/* Offline Cache Summary Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
          <div className="text-xs font-semibold text-[#718096]">Cached Patients</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#172B3A]">
            {snapshot?.patients.length ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-[#718096]">
            {snapshot?.savedAt ? `Synced ${new Date(snapshot.savedAt).toLocaleTimeString()}` : 'Not cached yet'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
          <div className="text-xs font-semibold text-[#718096]">Queued Offline Records</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#087F75]">
            {totalPendingSync}
          </div>
          <div className="mt-0.5 text-[11px] text-[#718096]">
            {offlineVisitDrafts.length} visits · {offlineCareActions.length} mode updates
          </div>
        </div>
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
          <div className="text-xs font-semibold text-[#718096]">Cached Follow-Ups</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#172B3A]">
            {snapshot?.followups.filter((f) => f.taskStatus === 'PENDING').length ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-[#718096]">Available offline</div>
        </div>
        <div className="rounded-2xl border border-[#E7EDF2] bg-white p-4">
          <div className="text-xs font-semibold text-[#718096]">Offline Emergency Line</div>
          <div className="mt-1 font-mono text-xl font-extrabold text-[#D94B4B]">
            {snapshot?.emergencyContacts?.ambulanceNumber ?? '108'}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[#718096]">
            PHC: {snapshot?.emergencyContacts?.phcPhone ?? '+91 80 2768 2108'}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Cached Patient Directory */}
        <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7EDF2] pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-[#172B3A]">
                Offline Patient Directory ({cachedPatients.length})
              </h3>
            </div>
            <div className="flex gap-1.5">
              {(['ALL', 'PREGNANCY', 'NEWBORN_CARE', 'VACCINATION'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                    modeFilter === m
                      ? 'bg-[#087F75] text-white'
                      : 'bg-[#F7F9FC] text-[#718096] hover:text-[#172B3A]'
                  }`}
                >
                  {m === 'ALL' ? 'All' : m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cached patients by name, PAT ID, or ward..."
              className="min-h-[38px] w-full rounded-xl border border-[#D4DDD9] bg-[#F7F9FC] pl-9 pr-3 text-xs"
            />
          </div>

          {cachedPatients.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#718096]">
              No cached patient profiles match this filter.
            </p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {cachedPatients.map((p) => {
                const ModeIcon =
                  p.assignedMode === 'PREGNANCY'
                    ? HeartPulse
                    : p.assignedMode === 'NEWBORN_CARE'
                      ? Baby
                      : Syringe;
                const pregRec = snapshot?.pregnancyPatients.find((x) => x.patient.id === p.patientId)?.record;
                const nbRec = snapshot?.newbornPatients.find((x) => x.patient.id === p.patientId)?.record;
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-[#172B3A]">
                        <ModeIcon className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                        <span>{p.patientName}</span>
                      </div>
                      <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#087F75]">
                        {p.patientUniqueId}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#475B62]">
                      {p.patientLocality ?? 'Ward 4'} · Mode: {p.assignedMode.replace('_', ' ')}
                    </div>
                    {pregRec && (
                      <div className="mt-1 font-mono text-[11px] text-[#087F75]">
                        {pregRec.pregnancyStage} ({pregRec.gestationalWeeks ?? '?'}w) · BP {pregRec.bloodPressure ?? '—'} · Hb {pregRec.hemoglobinGDl ?? '—'}
                      </div>
                    )}
                    {nbRec && (
                      <div className="mt-1 font-mono text-[11px] text-[#2563EB]">
                        Baby weight: {nbRec.currentWeightKg ?? '—'} kg · {nbRec.feedingStatus ?? '—'}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Record Offline Checkup + Sync Queue */}
        <section className="space-y-4 rounded-2xl border border-[#E7EDF2] bg-white p-5">
          <div className="border-b border-[#E7EDF2] pb-3">
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Record Offline Home Visit Update
            </h3>
            <p className="text-xs text-[#718096]">
              Works without internet. Stored safely on device until synced.
            </p>
          </div>

          <form onSubmit={handleQueueOfflineCheckup} className="space-y-3 text-xs">
            <div>
              <label htmlFor="off-patient" className="block font-semibold text-[#172B3A]">
                Select Cached Patient
              </label>
              <select
                id="off-patient"
                value={selectedPatientId || cachedPatients[0]?.patientId || ''}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] bg-white px-3 text-xs"
              >
                {cachedPatients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.patientName} ({p.patientUniqueId}) · {p.assignedMode}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="off-bp" className="block font-semibold text-[#172B3A]">
                  BP (if ANC)
                </label>
                <input
                  id="off-bp"
                  type="text"
                  value={bpValue}
                  onChange={(e) => setBpValue(e.target.value)}
                  placeholder="e.g. 120/80"
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="off-wt" className="block font-semibold text-[#172B3A]">
                  Weight (kg)
                </label>
                <input
                  id="off-wt"
                  type="number"
                  step="0.1"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="e.g. 56.5"
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="off-notes" className="block font-semibold text-[#172B3A]">
                Offline Observations / Notes
              </label>
              <textarea
                id="off-notes"
                rows={2}
                value={checkupNotes}
                onChange={(e) => setCheckupNotes(e.target.value)}
                placeholder="e.g., IFA strip supplied, baby breastfeeding well..."
                className="mt-1 w-full rounded-xl border border-[#D4DDD9] p-2.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={cachedPatients.length === 0}
              className="min-h-[42px] w-full rounded-xl bg-[#087F75] px-4 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
            >
              Save Offline Update to Device Queue
            </button>
          </form>

          {/* Pending Queue List */}
          <div className="border-t border-[#E7EDF2] pt-3">
            <div className="text-xs font-bold text-[#172B3A]">
              Pending Device Sync Queue ({totalPendingSync})
            </div>
            {totalPendingSync === 0 ? (
              <p className="mt-2 text-xs text-[#718096]">All offline records are synced.</p>
            ) : (
              <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {offlineCareActions.map((act) => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <span className="truncate font-semibold text-amber-900">
                      {act.patientName} ({act.patientUniqueId}) · {act.actionType.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-amber-800">QUEUED</span>
                  </li>
                ))}
                {offlineVisitDrafts.map((d) => (
                  <li
                    key={d.record.clientRequestId}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <span className="truncate font-semibold text-amber-900">
                      Voice Visit: {d.record.beneficiaryName ?? 'Draft'} · {d.record.visitType}
                    </span>
                    <span className="font-mono text-[10px] text-amber-800">DRAFT</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Offline NHM Protocol Reference Cards */}
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5">
        <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
          <BookOpen className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
          <h3 className="font-display text-base font-bold text-[#172B3A]">
            Offline NHM Field Reference Checklists (Works Offline)
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {protocolCards.map((card) => (
            <div key={card.id} className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-4 text-xs">
              <div className="font-display font-bold text-[#087F75]">{card.title}</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[#172B3A]">
                {card.keyChecklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-[#991B1B]">
                <div className="flex items-center gap-1 font-bold">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Immediate Referral Red Flags</span>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">
                  {card.redFlags.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
