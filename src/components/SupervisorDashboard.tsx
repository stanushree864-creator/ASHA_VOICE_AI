import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type {
  EvaluationMetricsSummary,
  GuidelineCitation,
  ReferralRecord,
  RetentionConfig,
  SavedVisitSummary,
  VisitType,
} from '../shared/types';

interface SupervisorDashboardProps {
  overview: {
    totalVisits: number;
    ancVisits: number;
    newbornVisits: number;
    immunisationVisits: number;
    pendingFollowups: number;
    pendingReferrals: number;
    workerActivity: Array<{
      workerId: string;
      workerName: string;
      workerCode: string;
      assignedArea: string;
      visitsCount: number;
    }>;
  } | null;
  visits: SavedVisitSummary[];
  referrals: ReferralRecord[];
  guidelines: GuidelineCitation[];
  metrics: EvaluationMetricsSummary | null;
  retentionConfig: RetentionConfig | null;
  auditLogs: Array<{
    id: string;
    userId: string;
    userName: string;
    entityType: string;
    entityId: string;
    action: string;
    timestamp: string;
    correlationId: string;
  }>;
  onAcknowledgeReferral: (id: string) => void;
  onUpdateRetention: (audioRetentionHours: number, transcriptRetentionDays: number) => Promise<void>;
  onPurgeTranscripts: () => Promise<{ purgedCount: number }>;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  overview,
  visits,
  referrals,
  guidelines,
  metrics,
  retentionConfig,
  auditLogs,
  onAcknowledgeReferral,
  onUpdateRetention,
  onPurgeTranscripts,
}) => {
  const [visitFilter, setVisitFilter] = useState<'ALL' | VisitType>('ALL');
  const [workerFilter, setWorkerFilter] = useState<string>('ALL');
  const [householdFilter, setHouseholdFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [referralFilter, setReferralFilter] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED_BY_PHC'>('ALL');
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'GUIDELINES' | 'METRICS' | 'AUDIT'>('OVERVIEW');

  const [audioHoursInput, setAudioHoursInput] = useState<number>(
    retentionConfig?.audioRetentionHours ?? 0,
  );
  const [transcriptDaysInput, setTranscriptDaysInput] = useState<number>(
    retentionConfig?.transcriptRetentionDays ?? 30,
  );
  const [retentionNotice, setRetentionNotice] = useState<string | null>(null);

  const uniqueWorkers = useMemo(
    () => Array.from(new Set(visits.map((v) => v.workerName))).sort(),
    [visits],
  );
  const uniqueHouseholds = useMemo(
    () =>
      Array.from(
        new Set(visits.map((v) => v.householdCode).filter((h): h is string => Boolean(h))),
      ).sort(),
    [visits],
  );

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (visitFilter !== 'ALL' && v.visitType !== visitFilter) return false;
      if (workerFilter !== 'ALL' && v.workerName !== workerFilter) return false;
      if (householdFilter !== 'ALL' && v.householdCode !== householdFilter) return false;
      if (dateFrom && v.visitDate < dateFrom) return false;
      if (dateTo && v.visitDate > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo, householdFilter, visitFilter, visits, workerFilter]);

  const filteredReferrals = useMemo(
    () =>
      referralFilter === 'ALL'
        ? referrals
        : referrals.filter((r) => r.acknowledgementStatus === referralFilter),
    [referralFilter, referrals],
  );

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Visits', value: overview?.totalVisits ?? visits.length },
          { label: 'Pregnancy ANC', value: overview?.ancVisits ?? 0 },
          { label: 'Newborn Visits', value: overview?.newbornVisits ?? 0 },
          { label: 'Immunisation', value: overview?.immunisationVisits ?? 0 },
          { label: 'Pending Follow-Ups', value: overview?.pendingFollowups ?? 0 },
          {
            label: 'Urgent Referrals',
            value: overview?.pendingReferrals ?? 0,
            danger: (overview?.pendingReferrals ?? 0) > 0,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-[#E2E8E6] bg-white p-4"
          >
            <div className="text-xs font-medium text-[#5C7078]">{kpi.label}</div>
            <div
              className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                kpi.danger ? 'text-[#B91C1C]' : 'text-[#0F1F24]'
              }`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[#E2E8E6] bg-white p-1.5">
        {(
          [
            { id: 'OVERVIEW', label: 'Referrals & Visits' },
            { id: 'GUIDELINES', label: 'Clinical Guidelines' },
            { id: 'METRICS', label: 'Evaluation Metrics' },
            { id: 'AUDIT', label: 'Audit Logs' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-[#0D7377] text-white'
                : 'text-[#475B62] hover:bg-[#F7F9F8] hover:text-[#0F1F24]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'OVERVIEW' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Urgent Referral Escalations */}
          <section className="rounded-2xl border border-[#E2E8E6] bg-white p-5 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8E6] pb-3">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#0F1F24]">
                <AlertTriangle className="h-4 w-4 text-[#B91C1C]" aria-hidden="true" />
                PHC Referral Escalations
              </h3>
              <div className="flex gap-1">
                {(['ALL', 'PENDING', 'ACKNOWLEDGED_BY_PHC'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setReferralFilter(status)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      referralFilter === status
                        ? 'bg-[#0F1F24] text-white'
                        : 'bg-[#F7F9F8] text-[#475B62]'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status === 'PENDING' ? 'Pending' : 'Acknowledged'}
                  </button>
                ))}
              </div>
            </div>

            {filteredReferrals.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#5C7078]">
                No referrals match the selected filter.
              </p>
            ) : (
              <ul className="divide-y divide-[#E2E8E6]">
                {filteredReferrals.map((r) => (
                  <li key={r.id} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-sm font-bold text-[#B91C1C]">{r.dangerSignTitle}</div>
                      <div className="mt-0.5 text-xs text-[#0F1F24]">
                        {r.beneficiaryName} · <span className="font-mono">{r.beneficiaryCode}</span> ·
                        Reported by {r.workerName}
                      </div>
                      <div className="mt-0.5 font-mono text-xs tabular-nums text-[#5C7078]">
                        {new Date(r.referralTimestamp).toLocaleString()} · {r.sourceGuidelineId}
                      </div>
                    </div>

                    {r.acknowledgementStatus === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeReferral(r.id)}
                        className="min-h-[44px] rounded-xl bg-[#0D7377] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0A5A5E] whitespace-nowrap shrink-0"
                      >
                        Acknowledge PHC Referral
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Acknowledged
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Visit Completion Table with Multi-Criteria Filters */}
          <section className="rounded-2xl border border-[#E2E8E6] bg-white p-5 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8E6] pb-3">
              <h3 className="font-display text-base font-bold text-[#0F1F24]">
                Field Visit Activity
              </h3>
              <div className="flex gap-1">
                {(['ALL', 'ANC', 'NEWBORN', 'IMMUNISATION'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setVisitFilter(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      visitFilter === cat
                        ? 'bg-[#0D7377] text-white'
                        : 'bg-[#F7F9F8] text-[#475B62]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Worker, Household & Date Range Filters */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                aria-label="Filter by ASHA Worker"
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-2.5 text-xs text-[#0F1F24]"
              >
                <option value="ALL">All Workers</option>
                {uniqueWorkers.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Household"
                value={householdFilter}
                onChange={(e) => setHouseholdFilter(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-2.5 text-xs text-[#0F1F24]"
              >
                <option value="ALL">All Households</option>
                {uniqueHouseholds.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>

              <input
                type="date"
                aria-label="Visit date from"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-2.5 text-xs text-[#0F1F24]"
              />

              <input
                type="date"
                aria-label="Visit date to"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-2.5 text-xs text-[#0F1F24]"
              />
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8E6] text-[#5C7078]">
                    <th className="py-2 pr-3 font-semibold">Beneficiary</th>
                    <th className="py-2 pr-3 font-semibold">Household</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E6]">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-[#5C7078]">
                        No visits match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 pr-3 font-medium text-[#0F1F24]">
                          {v.beneficiaryName}{' '}
                          <span className="font-mono text-[#5C7078]">· {v.beneficiaryCode}</span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[#475B62]">
                          {v.householdCode ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3 font-mono">{v.visitType}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums">{v.visitDate}</td>
                        <td className="py-2.5 font-semibold">
                          <span
                            className={
                              v.dangerSignStatus === 'positive_detected'
                                ? 'text-[#B91C1C]'
                                : 'text-emerald-700'
                            }
                          >
                            {v.dangerSignStatus === 'positive_detected' ? 'REFERRED' : 'CLEAR'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ASHA Worker Field Activity Summary */}
          {overview && overview.workerActivity.length > 0 && (
            <section className="rounded-2xl border border-[#E2E8E6] bg-white p-5 lg:col-span-12">
              <h3 className="font-display text-base font-bold text-[#0F1F24]">
                ASHA Field Worker Coverage
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overview.workerActivity.map((w) => (
                  <div
                    key={w.workerId}
                    className="flex items-center justify-between rounded-xl border border-[#E2E8E6] bg-[#F7F9F8] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#0F1F24]">
                        {w.workerName} · <span className="font-mono text-xs">{w.workerCode}</span>
                      </div>
                      <div className="text-xs text-[#5C7078]">{w.assignedArea}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold tabular-nums text-[#0D7377]">
                        {w.visitsCount}
                      </div>
                      <div className="text-[11px] text-[#5C7078]">visits</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {subTab === 'GUIDELINES' && (
        <section className="rounded-2xl border border-[#E2E8E6] bg-white p-6">
          <div className="flex items-center gap-2 border-b border-[#E2E8E6] pb-3">
            <BookOpen className="h-5 w-5 text-[#0D7377]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#0F1F24]">
              Approved Public-Health Clinical Guideline Versions
            </h3>
          </div>
          <div className="mt-4 space-y-4">
            {guidelines.map((g) => (
              <div
                key={g.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2E8E6] bg-[#F7F9F8] p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="font-semibold text-[#0F1F24]">{g.guidelineName}</div>
                  <div className="mt-1 text-xs text-[#475B62]">
                    {g.pageOrSection} · Version <span className="font-mono">{g.version}</span> ·
                    Effective {g.effectiveDate}
                  </div>
                  <div className="mt-0.5 text-xs text-[#5C7078]">
                    Reviewed by {g.reviewedBy}
                  </div>
                </div>
                <a
                  href={g.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D4DDD9] bg-white px-3 py-1.5 text-xs font-semibold text-[#0D7377] hover:bg-teal-50 whitespace-nowrap shrink-0"
                >
                  Official Source
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {subTab === 'METRICS' && metrics && (
        <section className="rounded-2xl border border-[#E2E8E6] bg-white p-6">
          <div className="flex items-center gap-2 border-b border-[#E2E8E6] pb-3">
            <Activity className="h-5 w-5 text-[#0D7377]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#0F1F24]">
              Measured System &amp; Voice Latency Evaluation Metrics
            </h3>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Completed Visit Samples', value: metrics.completedVisits },
              {
                label: 'TTFA P50 (Target < 1200ms)',
                value:
                  metrics.p50TimeToFirstAudioMs !== null
                    ? `${metrics.p50TimeToFirstAudioMs} ms`
                    : 'No live TTS sample yet',
              },
              {
                label: 'TTFA P95 (Target < 2000ms)',
                value:
                  metrics.p95TimeToFirstAudioMs !== null
                    ? `${metrics.p95TimeToFirstAudioMs} ms`
                    : 'No live TTS sample yet',
              },
              { label: 'Supported Languages', value: `${metrics.supportedLanguagesCount} languages` },
              { label: 'Danger-Sign Detections', value: metrics.dangerSignEventsCount },
              { label: 'Voice Corrections Applied', value: metrics.correctionsCount },
              { label: 'Offline Drafts Synced', value: metrics.offlineSyncedCount },
              { label: 'Voice Sessions Logged', value: metrics.voiceSessionsCount },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-[#F7F9F8] p-4">
                <div className="text-xs font-medium text-[#5C7078]">{item.label}</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0F1F24]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[#E2E8E6] bg-[#F7F9F8] p-4 text-xs text-[#475B62]">
            <div>
              <strong>Active Speech Provider:</strong> {metrics.providerName}
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {metrics.knownLimitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {subTab === 'AUDIT' && (
        <div className="space-y-6">
          {/* Audio & Transcript Retention Configuration */}
          <section className="rounded-2xl border border-[#E2E8E6] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8E6] pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#0F1F24]">
                  Privacy &amp; Data Retention Configuration
                </h3>
                <p className="mt-0.5 text-xs text-[#5C7078]">
                  {retentionConfig?.externalProviderDisclosure ??
                    'Audio is streamed only to the server-side speech gateway; raw audio is not persisted by default.'}
                </p>
              </div>
              {retentionConfig && (
                <span className="font-mono text-xs text-[#5C7078]">
                  Updated by {retentionConfig.updatedBy}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:items-end">
              <div>
                <label
                  htmlFor="audio-retention-hours"
                  className="block text-xs font-semibold text-[#475B62]"
                >
                  Raw Audio Retention (Hours · 0 = Zero Retention)
                </label>
                <input
                  id="audio-retention-hours"
                  type="number"
                  min={0}
                  max={720}
                  value={audioHoursInput}
                  onChange={(e) => setAudioHoursInput(Number(e.target.value))}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-3 font-mono text-sm text-[#0F1F24]"
                />
              </div>

              <div>
                <label
                  htmlFor="transcript-retention-days"
                  className="block text-xs font-semibold text-[#475B62]"
                >
                  Transcript Retention (Days)
                </label>
                <input
                  id="transcript-retention-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={transcriptDaysInput}
                  onChange={(e) => setTranscriptDaysInput(Number(e.target.value))}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-[#D4DDD9] bg-[#F7F9F8] px-3 font-mono text-sm text-[#0F1F24]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void onUpdateRetention(audioHoursInput, transcriptDaysInput).then(() => {
                      setRetentionNotice(
                        `Saved retention policy (${audioHoursInput}h audio, ${transcriptDaysInput}d transcripts).`,
                      );
                    });
                  }}
                  className="min-h-[44px] rounded-xl bg-[#0D7377] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A5A5E]"
                >
                  Save Retention Policy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onPurgeTranscripts().then((res) => {
                      setRetentionNotice(
                        `Purged ${res.purgedCount} expired transcript(s) older than ${transcriptDaysInput} days.`,
                      );
                    });
                  }}
                  className="min-h-[44px] rounded-xl border border-[#D4DDD9] bg-white px-4 py-2 text-xs font-semibold text-[#0F1F24] hover:bg-[#F7F9F8]"
                >
                  Run Retention Purge
                </button>
              </div>
            </div>

            {retentionNotice && (
              <p role="status" className="mt-3 text-xs font-semibold text-[#0D7377]">
                {retentionNotice}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8E6] bg-white p-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8E6] pb-3">
              <ShieldCheck className="h-5 w-5 text-[#0D7377]" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-[#0F1F24]">
                Security &amp; Clinical Audit Trail
              </h3>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8E6] text-[#5C7078]">
                    <th className="py-2 pr-3 font-semibold">Timestamp</th>
                    <th className="py-2 pr-3 font-semibold">User</th>
                    <th className="py-2 pr-3 font-semibold">Action</th>
                    <th className="py-2 pr-3 font-semibold">Entity</th>
                    <th className="py-2 font-semibold">Correlation ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E6]">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 pr-3 font-mono tabular-nums text-[#475B62]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 font-medium text-[#0F1F24]">{log.userName}</td>
                      <td className="py-2 pr-3 font-mono font-semibold text-[#0D7377]">{log.action}</td>
                      <td className="py-2 pr-3 font-mono text-[#475B62]">
                        {log.entityType} · {log.entityId.slice(0, 14)}
                      </td>
                      <td className="py-2 font-mono text-[#5C7078]">{log.correlationId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
