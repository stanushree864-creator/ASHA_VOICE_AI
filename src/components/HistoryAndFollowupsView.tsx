import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import type {
  Beneficiary,
  FollowupTask,
  LanguageCode,
  ReferralRecord,
  SavedVisitSummary,
  VisitType,
} from '../shared/types';
import { SmartFollowupPanel } from './SmartFollowupPanel';

interface HistoryAndFollowupsViewProps {
  language: LanguageCode;
  activeSection: 'HISTORY' | 'FOLLOWUPS' | 'ALERTS';
  visits: SavedVisitSummary[];
  followups: FollowupTask[];
  referrals: ReferralRecord[];
  beneficiaries: Beneficiary[];
  onCompleteFollowup: (id: string) => void;
  onRescheduleFollowup: (id: string, dueDate: string) => Promise<void>;
  onCreateFollowup: (payload: {
    beneficiaryCode: string;
    taskDescription: string;
    priority: string;
    dueDate: string | null;
  }) => Promise<void>;
  onUpdateVisit: (
    visitId: string,
    payload: { observations?: string | null; nextVisitDate?: string | null },
  ) => Promise<void>;
  onExportCsv: () => Promise<void>;
  onFollowupsUpdated?: () => void;
}

export const HistoryAndFollowupsView: React.FC<HistoryAndFollowupsViewProps> = ({
  language,
  activeSection,
  visits,
  followups,
  beneficiaries,
  onCompleteFollowup,
  onRescheduleFollowup,
  onCreateFollowup,
  onUpdateVisit,
  onExportCsv,
  onFollowupsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState<'ALL' | VisitType>('ALL');
  const [selectedVisit, setSelectedVisit] = useState<SavedVisitSummary | null>(null);
  const [editObservations, setEditObservations] = useState('');
  const [editNextVisit, setEditNextVisit] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [newFuBen, setNewFuBen] = useState(beneficiaries[0]?.beneficiaryCode ?? 'ASHA00125');
  const [newFuDesc, setNewFuDesc] = useState('');
  const [newFuDate, setNewFuDate] = useState('');
  const [newFuPriority, setNewFuPriority] = useState('SCHEDULED_VISIT');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const t = getTranslations(language);
  const ht = t.history;
  const ft = t.form;

  const categoryLabel = (cat: 'ALL' | VisitType) => {
    if (cat === 'ANC') return t.categories.pregnancy;
    if (cat === 'NEWBORN') return t.categories.newborn;
    if (cat === 'IMMUNISATION') return t.categories.vaccines;
    return t.categories.all;
  };

  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visits.filter((v) => {
      if (visitTypeFilter !== 'ALL' && v.visitType !== visitTypeFilter) return false;
      if (!q) return true;
      return (
        v.beneficiaryName.toLowerCase().includes(q) ||
        v.beneficiaryCode.toLowerCase().includes(q) ||
        v.rawTranscript.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, visitTypeFilter, visits]);

  const openVisitDetail = (v: SavedVisitSummary) => {
    setSelectedVisit(v);
    setEditObservations(v.structuredPayload.observations ?? v.rawTranscript);
    setEditNextVisit(v.nextVisitDate ?? '');
  };

  const handleSaveVisitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setSavingEdit(true);
    try {
      await onUpdateVisit(selectedVisit.id, {
        observations: editObservations || null,
        nextVisitDate: editNextVisit || null,
      });
      setSelectedVisit(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuDesc.trim()) return;
    await onCreateFollowup({
      beneficiaryCode: newFuBen,
      taskDescription: newFuDesc.trim(),
      priority: newFuPriority,
      dueDate: newFuDate || null,
    });
    setNewFuDesc('');
    setNewFuDate('');
    setShowAddFollowup(false);
  };

  if (activeSection === 'FOLLOWUPS') {
    return (
      <div>
        <SmartFollowupPanel
          onCompleteFollowup={onCompleteFollowup}
          onFollowupsUpdated={onFollowupsUpdated}
        />
        <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-lg font-bold text-[#172B3A]">{ht.followupsTitle}</h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold tabular-nums text-[#087F75]">
              {followups.filter((f) => f.taskStatus === 'PENDING').length} {ht.pending}
            </span>
            <button
              type="button"
              onClick={() => setShowAddFollowup(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#10A77A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0D9169]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{ht.addFollowup}</span>
            </button>
          </div>
        </div>

        {followups.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#718096]">{ht.noFollowups}</div>
        ) : (
          <ul className="divide-y divide-[#E7EDF2]">
            {followups.map((fu) => {
              const isImmediate = fu.priority === 'IMMEDIATE_REFERRAL';
              const isDone = fu.taskStatus === 'COMPLETED';
              return (
                <li
                  key={fu.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span
                        className={
                          isImmediate
                            ? 'text-[#D94B4B]'
                            : fu.priority === 'PENDING_INFORMATION'
                              ? 'text-[#F4A340]'
                              : 'text-[#087F75]'
                        }
                      >
                        {fu.priority.replace(/_/g, ' ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#172B3A]">
                        {fu.beneficiaryName} ({fu.beneficiaryCode})
                      </span>
                      {fu.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#718096]">
                            {t.dashboard.due} {fu.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        isDone ? 'text-[#718096] line-through' : 'text-[#172B3A]'
                      }`}
                    >
                      {fu.taskDescription}
                    </p>

                    {rescheduleId === fu.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="min-h-[36px] rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (rescheduleDate) {
                              void onRescheduleFollowup(fu.id, rescheduleDate).then(() =>
                                setRescheduleId(null),
                              );
                            }
                          }}
                          className="rounded-lg bg-[#087F75] px-3 py-1.5 text-xs font-bold text-white"
                        >
                          {ht.saveDate}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRescheduleId(null)}
                          className="rounded-lg border border-[#E7EDF2] px-2.5 py-1.5 text-xs text-[#718096]"
                        >
                          {t.voice.cancel}
                        </button>
                      </div>
                    )}
                  </div>

                  {isDone ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10A77A] whitespace-nowrap shrink-0">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {ht.completed}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleId(fu.id);
                          setRescheduleDate(fu.dueDate ?? '');
                        }}
                        className="min-h-[40px] rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#718096] hover:text-[#172B3A]"
                      >
                        {ht.reschedule}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompleteFollowup(fu.id)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75] hover:bg-[#E8F7F1] whitespace-nowrap"
                      >
                        <CalendarClock className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                        {ht.markComplete}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Create Follow-up Modal */}
        {showAddFollowup && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
          >
            <form
              onSubmit={(e) => void handleCreateFollowupSubmit(e)}
              className="w-full max-w-md rounded-2xl border border-[#E7EDF2] bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
                <h3 className="font-display text-base font-bold text-[#172B3A]">
                  {ht.addFollowup}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddFollowup(false)}
                  className="rounded-lg p-1 text-[#718096] hover:bg-[#F7F9FC]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#718096]">
                    {t.fullForm.beneficiary}
                  </label>
                  <select
                    value={newFuBen}
                    onChange={(e) => setNewFuBen(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                  >
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.beneficiaryCode}>
                        {b.displayName} ({b.beneficiaryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#718096]">
                    {ht.taskDescription}
                  </label>
                  <input
                    type="text"
                    required
                    value={newFuDesc}
                    onChange={(e) => setNewFuDesc(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#718096]">
                      {ht.priority}
                    </label>
                    <select
                      value={newFuPriority}
                      onChange={(e) => setNewFuPriority(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-xs text-[#172B3A]"
                    >
                      <option value="SCHEDULED_VISIT">Scheduled Visit</option>
                      <option value="ROUTINE_FOLLOWUP">Routine Follow-up</option>
                      <option value="HIGH_PRIORITY_REFERRAL">High Priority</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#718096]">
                      {ht.dueDate}
                    </label>
                    <input
                      type="date"
                      value={newFuDate}
                      onChange={(e) => setNewFuDate(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 font-mono text-xs text-[#172B3A]"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFollowup(false)}
                  className="min-h-[40px] rounded-xl border border-[#E7EDF2] px-4 py-2 text-xs font-semibold text-[#718096]"
                >
                  {t.voice.cancel}
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#10A77A] px-4 py-2 text-xs font-bold text-white"
                >
                  {ht.saveFollowup}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
        <h2 className="font-display text-lg font-bold text-[#172B3A]">{ht.visitsTitle}</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tabular-nums text-[#087F75]">
            {filteredVisits.length} {ht.recordsCount}
          </span>
          <button
            type="button"
            onClick={() => void onExportCsv()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
          >
            <Download className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718096]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ht.searchPlaceholder}
            className="min-h-[40px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] pl-9 pr-3 text-xs text-[#172B3A] focus:border-[#087F75] focus:outline-none"
          />
        </div>

        <div className="flex gap-1 rounded-xl bg-[#F7F9FC] p-1">
          {(['ALL', 'ANC', 'NEWBORN', 'IMMUNISATION'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setVisitTypeFilter(cat)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                visitTypeFilter === cat
                  ? 'bg-[#087F75] text-white'
                  : 'text-[#718096] hover:text-[#172B3A]'
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {filteredVisits.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#718096]">{ht.noVisits}</div>
      ) : (
        <ul className="mt-4 divide-y divide-[#E7EDF2]">
          {filteredVisits.map((v) => (
            <li
              key={v.id}
              onClick={() => openVisitDetail(v)}
              className="cursor-pointer rounded-xl px-2 py-4 transition-colors hover:bg-[#F7F9FC]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
                  <span className="font-bold text-[#172B3A]">{v.beneficiaryName}</span>
                  <span className="font-mono text-xs text-[#718096]">{v.beneficiaryCode}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#718096]">
                  {v.visitDate} · {categoryLabel(v.visitType)}
                </span>
              </div>

              <p className="mt-1.5 text-sm text-[#718096]">&ldquo;{v.rawTranscript}&rdquo;</p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#718096]">
                <span>
                  {ht.safety}:{' '}
                  <strong
                    className={
                      v.dangerSignStatus === 'positive_detected' ? 'text-[#D94B4B]' : 'text-[#10A77A]'
                    }
                  >
                    {v.dangerSignStatus === 'positive_detected' ? ft.safetyAlert : ft.safeVisit}
                  </strong>
                </span>
                {v.nextVisitDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {ft.nextVisit}: {v.nextVisitDate}
                    </span>
                  </>
                )}
                <span className="ml-auto text-[11px] font-semibold text-[#087F75]">
                  {ht.viewEdit} →
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Visit Detail & Edit Slide-over Modal */}
      {selectedVisit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-xs"
        >
          <form
            onSubmit={(e) => void handleSaveVisitEdit(e)}
            className="flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto bg-white p-6 shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#172B3A]">
                    {selectedVisit.beneficiaryName} ({selectedVisit.beneficiaryCode})
                  </h3>
                  <p className="font-mono text-xs text-[#718096]">
                    {categoryLabel(selectedVisit.visitType)} · {selectedVisit.visitDate}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  className="rounded-lg p-1.5 text-[#718096] hover:bg-[#F7F9FC]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-xs">
                  <div className="font-semibold text-[#718096]">{ht.transcriptLabel}</div>
                  <p className="mt-1 leading-relaxed text-[#172B3A]">
                    &ldquo;{selectedVisit.rawTranscript}&rdquo;
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#718096]">
                    {ft.nextVisit}
                  </label>
                  <input
                    type="date"
                    value={editNextVisit}
                    onChange={(e) => setEditNextVisit(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 font-mono text-sm text-[#172B3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#718096]">
                    {ht.observationsLabel}
                  </label>
                  <textarea
                    rows={4}
                    value={editObservations}
                    onChange={(e) => setEditObservations(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-sm text-[#172B3A]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#E7EDF2] pt-4">
              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="min-h-[44px] rounded-xl border border-[#E7EDF2] px-4 py-2 text-xs font-semibold text-[#718096]"
              >
                {ht.close}
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="min-h-[44px] rounded-xl bg-[#087F75] px-5 py-2 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
              >
                {savingEdit ? ft.saving : ht.saveChanges}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
