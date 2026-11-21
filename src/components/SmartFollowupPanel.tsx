import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { SmartFollowupBucket, SmartFollowupSummary } from '../shared/types';
import { api } from '../utils/apiClient';

interface SmartFollowupPanelProps {
  onCompleteFollowup: (id: string) => void;
  onFollowupsUpdated?: () => void;
}

export const SmartFollowupPanel: React.FC<SmartFollowupPanelProps> = ({
  onCompleteFollowup,
  onFollowupsUpdated,
}) => {
  const [summary, setSummary] = useState<SmartFollowupSummary | null>(null);
  const [bucketFilter, setBucketFilter] = useState<'ALL' | SmartFollowupBucket>('ALL');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadSmartQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSmartFollowups();
      setSummary(res);
    } catch {
      // Non-blocking if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSmartQueue();
  }, [loadSmartQueue]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    setBanner(null);
    try {
      const res = await api.autoGenerateSmartFollowups();
      setSummary(res.summary);
      setBanner(
        res.createdCount > 0
          ? `Added ${res.createdCount} milestone follow-up task(s) into your register.`
          : 'All NHM ANC/HBNC milestone follow-ups are already scheduled.',
      );
      onFollowupsUpdated?.();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Unable to auto-generate tasks');
    } finally {
      setGenerating(false);
    }
  };

  if (!summary && loading) {
    return (
      <div className="mb-5 rounded-2xl border border-[#E7EDF2] bg-white p-4 text-xs text-[#718096]">
        Loading Smart Follow-Up prioritization...
      </div>
    );
  }

  if (!summary) return null;

  const filteredItems = summary.items.filter(
    (item) => bucketFilter === 'ALL' || item.bucket === bucketFilter,
  );

  const bucketBadge = (bucket: SmartFollowupBucket) => {
    if (bucket === 'OVERDUE') return 'bg-red-100 text-[#991B1B]';
    if (bucket === 'DUE_TODAY') return 'bg-amber-100 text-amber-900';
    if (bucket === 'UPCOMING_7_DAYS') return 'bg-[#E8F7F1] text-[#087F75]';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <section
      aria-label="Smart Follow-Up System"
      className="mb-6 rounded-2xl border border-[#087F75]/25 bg-gradient-to-br from-white via-[#F7F9FC] to-[#E8F7F1]/50 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EDF2] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#087F75] text-white">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Smart Follow-Up Queue
            </h3>
            <p className="text-[11px] text-[#718096]">
              Auto-prioritized across ANC visits, HBNC newborn milestones, NIS vaccines & scheduled appointments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSmartQueue()}
            disabled={loading}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D4DDD9] bg-white px-3 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => void handleAutoGenerate()}
            disabled={generating}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3.5 text-xs font-bold text-white hover:bg-[#066860] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {generating
                ? 'Scheduling...'
                : `Auto-Schedule Milestones (${summary.counts.recommendedMilestones})`}
            </span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-3.5 py-2 text-xs font-semibold text-[#064E3B]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
          <span>{banner}</span>
        </div>
      )}

      {/* Bucket Summary & Filter Chips */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {(
          [
            { key: 'ALL', label: `All (${summary.counts.totalActionable})` },
            { key: 'OVERDUE', label: `Overdue (${summary.counts.overdue})` },
            { key: 'DUE_TODAY', label: `Due Today (${summary.counts.dueToday})` },
            { key: 'UPCOMING_7_DAYS', label: `Next 7 Days (${summary.counts.upcoming7Days})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setBucketFilter(tab.key)}
            className={`min-h-[34px] rounded-xl px-3 text-xs font-bold transition-colors ${
              bucketFilter === tab.key
                ? 'bg-[#102B35] text-white'
                : 'border border-[#E7EDF2] bg-white text-[#475B62] hover:border-[#087F75]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#718096]">
          No items in this follow-up bucket.
        </p>
      ) : (
        <ul className="mt-3.5 space-y-2.5">
          {filteredItems.slice(0, 8).map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-white p-3.5 text-xs"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.urgency === 'CRITICAL' && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#D94B4B]" aria-hidden="true" />
                  )}
                  <span className="font-bold text-[#172B3A]">{item.patientName}</span>
                  <span className="font-mono text-[11px] font-semibold text-[#087F75]">
                    {item.patientCode}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${bucketBadge(item.bucket)}`}>
                    {item.bucket.replace(/_/g, ' ')}
                  </span>
                  <span className="rounded-md bg-[#F7F9FC] px-2 py-0.5 text-[10px] font-semibold text-[#718096]">
                    {item.healthcareMode.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-semibold text-[#172B3A]">{item.title}</div>
                <div className="text-[11px] text-[#718096]">
                  {item.reason}
                  {item.dueDate ? ` · Due: ${item.dueDate}` : ''}
                </div>
              </div>

              {item.actionableFollowupId && (
                <button
                  type="button"
                  onClick={() => {
                    onCompleteFollowup(item.actionableFollowupId!);
                    void loadSmartQueue();
                  }}
                  className="min-h-[36px] shrink-0 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-3 text-xs font-bold text-[#087F75] hover:bg-[#D1FAE5]"
                >
                  Mark Done
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
