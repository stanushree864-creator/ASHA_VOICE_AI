import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { PregnancyRiskAssessment, PregnancyRiskTier } from '../shared/types';
import { api } from '../utils/apiClient';

interface PregnancyRiskAlertPanelProps {
  onRefreshWorkspace?: () => void;
}

export const PregnancyRiskAlertPanel: React.FC<PregnancyRiskAlertPanelProps> = ({
  onRefreshWorkspace,
}) => {
  const [assessments, setAssessments] = useState<PregnancyRiskAssessment[]>([]);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bp, setBp] = useState('144/94');
  const [hb, setHb] = useState('9.1');
  const [weeks, setWeeks] = useState('30');
  const [weight, setWeight] = useState('54');
  const [ancVisits, setAncVisits] = useState('2');
  const [notes, setNotes] = useState('Mild ankle swelling and fatigue');
  const [includeAi, setIncludeAi] = useState(true);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPregnancyRiskAssessments();
      setAssessments(res.assessments);
      setGeminiConfigured(res.geminiConfigured);
      if (res.assessments.length > 0 && !selectedPatientId) {
        const first = res.assessments[0];
        setSelectedPatientId(first.patientId);
        setBp(first.bloodPressure ?? '120/80');
        setHb(first.hemoglobinGDl != null ? String(first.hemoglobinGDl) : '11.0');
        setWeeks(first.gestationalWeeks != null ? String(first.gestationalWeeks) : '28');
        setWeight(first.weightKg != null ? String(first.weightKg) : '55');
        setAncVisits(String(first.ancVisitsCompleted));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load pregnancy risk assessments');
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const handleSelectPatientForForm = (patientId: string) => {
    setSelectedPatientId(patientId);
    const match = assessments.find((a) => a.patientId === patientId);
    if (match) {
      setBp(match.bloodPressure ?? '120/80');
      setHb(match.hemoglobinGDl != null ? String(match.hemoglobinGDl) : '10.8');
      setWeeks(match.gestationalWeeks != null ? String(match.gestationalWeeks) : '24');
      setWeight(match.weightKg != null ? String(match.weightKg) : '55');
      setAncVisits(String(match.ancVisitsCompleted));
    }
  };

  const handleAssessRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSubmitting(true);
    setBanner(null);
    setErrorMsg(null);
    try {
      const res = await api.assessPregnancyRisk({
        patientId: selectedPatientId,
        bloodPressure: bp.trim() || null,
        hemoglobinGDl: hb ? Number(hb) : null,
        gestationalWeeks: weeks ? Number(weeks) : null,
        weightKg: weight ? Number(weight) : null,
        ancVisitsCompleted: ancVisits ? Number(ancVisits) : 0,
        symptomsOrNotes: notes.trim() || null,
        includeAiAnalysis: includeAi,
        notifyOnHighRisk: true,
      });
      setBanner(
        `Risk assessment saved for ${res.assessment.patientName} (${res.assessment.patientUniqueId}): ${res.assessment.riskTier} (${res.assessment.riskScore}/100).`,
      );
      await loadAssessments();
      onRefreshWorkspace?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Risk evaluation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tierStyles = (tier: PregnancyRiskTier) => {
    if (tier === 'CRITICAL') return 'border-red-300 bg-red-50 text-[#991B1B]';
    if (tier === 'HIGH') return 'border-orange-300 bg-orange-50 text-orange-900';
    if (tier === 'MODERATE') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-[#A7F3D0] bg-[#E8F7F1] text-[#064E3B]';
  };

  const counts = {
    CRITICAL: assessments.filter((a) => a.riskTier === 'CRITICAL').length,
    HIGH: assessments.filter((a) => a.riskTier === 'HIGH').length,
    MODERATE: assessments.filter((a) => a.riskTier === 'MODERATE').length,
    LOW: assessments.filter((a) => a.riskTier === 'LOW').length,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#102B35] via-[#0D5B5E] to-[#087F75] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-[#A5D8CE]">
              <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI-Based Pregnancy Risk Alert System</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
              Maternal Risk Stratification & Early Warnings
            </h2>
            <p className="mt-1 text-xs text-teal-100">
              Combines NHM PMSMA clinical vitals thresholds (BP, Hemoglobin, ANC schedule, danger symptoms) with Gemini clinical synthesis to trigger timely PHC alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAssessments()}
            disabled={loading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-bold text-white hover:bg-white/25"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Screening</span>
          </button>
        </div>
      </section>

      {banner && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-3 text-xs font-semibold text-[#064E3B]"
        >
          <CheckCircle2 className="h-4 w-4 text-[#10A77A]" aria-hidden="true" />
          <span>{banner}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#991B1B]">
          {errorMsg}
        </div>
      )}

      {/* Tier Summary Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <div className="text-xs font-semibold text-[#991B1B]">Critical Risk</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#D94B4B]">
            {counts.CRITICAL}
          </div>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
          <div className="text-xs font-semibold text-orange-900">High Risk</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-orange-700">
            {counts.HIGH}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="text-xs font-semibold text-amber-900">Moderate Monitor</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-amber-700">
            {counts.MODERATE}
          </div>
        </div>
        <div className="rounded-2xl border border-[#A7F3D0] bg-[#E8F7F1]/60 p-4">
          <div className="text-xs font-semibold text-[#064E3B]">Low / Normal</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#087F75]">
            {counts.LOW}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Patient Risk Cards */}
        <section className="space-y-3 lg:col-span-3">
          <h3 className="font-display text-base font-bold text-[#172B3A]">
            Pregnant Patient Risk Alerts ({assessments.length})
          </h3>

          {assessments.length === 0 ? (
            <div className="rounded-2xl border border-[#E7EDF2] bg-white p-6 text-center text-xs text-[#718096]">
              No pregnancy care records found.
            </div>
          ) : (
            assessments.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#E7EDF2] bg-white p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-bold text-[#172B3A]">
                        {item.patientName}
                      </span>
                      <span className="rounded-md bg-[#F7F9FC] px-2 py-0.5 font-mono text-xs font-bold text-[#087F75]">
                        {item.patientUniqueId}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#718096]">
                      Week {item.gestationalWeeks ?? '?'} · BP {item.bloodPressure ?? '—'} · Hb{' '}
                      {item.hemoglobinGDl != null ? `${item.hemoglobinGDl} g/dL` : '—'} · Weight{' '}
                      {item.weightKg ?? '—'} kg
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1 font-mono text-xs font-extrabold ${tierStyles(item.riskTier)}`}
                    >
                      {item.phcReferralRequired && <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                      {item.riskTier} · {item.riskScore}/100
                    </span>
                  </div>
                </div>

                {item.factors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[#475B62]">Triggered Risk Factors:</div>
                    <ul className="space-y-1">
                      {item.factors.map((f, idx) => (
                        <li
                          key={`${f.code}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-[#172B3A]">
                            <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-[#D94B4B]" aria-hidden="true" />
                            {f.label}
                          </span>
                          <span className="font-mono text-[11px] text-[#718096]">
                            {f.observedValue} (+{f.points} pts)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3 text-xs">
                  <div className="font-bold text-[#087F75]">Recommended Action:</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#172B3A]">
                    {item.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </div>

                {item.aiSummary && (
                  <div className="rounded-xl border border-[#087F75]/30 bg-[#E8F7F1]/70 p-3 text-xs text-[#064E3B]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
                      <span>Gemini Clinical Risk Summary</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{item.aiSummary}</p>
                  </div>
                )}

                {item.aiStatus === 'GEMINI_UNCONFIGURED' && (
                  <div className="text-[11px] text-[#718096]">
                    Gemini AI synthesis not run (GEMINI_API_KEY not configured; scored using NHM clinical rules).
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        {/* Interactive Risk Evaluator Form */}
        <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-3">
            <Activity className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#172B3A]">
              Run Pregnancy Risk Check
            </h3>
          </div>

          <form onSubmit={(e) => void handleAssessRisk(e)} className="mt-4 space-y-3 text-xs">
            <div>
              <label htmlFor="risk-pat" className="block font-semibold text-[#172B3A]">
                Pregnant Patient
              </label>
              <select
                id="risk-pat"
                value={selectedPatientId}
                onChange={(e) => handleSelectPatientForForm(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-xl border border-[#D4DDD9] bg-white px-3 text-xs"
              >
                {assessments.map((a) => (
                  <option key={a.patientId} value={a.patientId}>
                    {a.patientName} ({a.patientUniqueId})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="risk-bp" className="block font-semibold text-[#172B3A]">
                  Blood Pressure
                </label>
                <input
                  id="risk-bp"
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  placeholder="144/94"
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="risk-hb" className="block font-semibold text-[#172B3A]">
                  Hemoglobin (g/dL)
                </label>
                <input
                  id="risk-hb"
                  type="number"
                  step="0.1"
                  value={hb}
                  onChange={(e) => setHb(e.target.value)}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="risk-weeks" className="block font-semibold text-[#172B3A]">
                  Gestational Weeks
                </label>
                <input
                  id="risk-weeks"
                  type="number"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="risk-wt" className="block font-semibold text-[#172B3A]">
                  Weight (kg)
                </label>
                <input
                  id="risk-wt"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="risk-anc" className="block font-semibold text-[#172B3A]">
                ANC Visits Completed
              </label>
              <input
                id="risk-anc"
                type="number"
                min={0}
                value={ancVisits}
                onChange={(e) => setAncVisits(e.target.value)}
                className="mt-1 min-h-[38px] w-full rounded-xl border border-[#D4DDD9] px-3 font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="risk-notes" className="block font-semibold text-[#172B3A]">
                Observed Symptoms / Notes
              </label>
              <textarea
                id="risk-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., swelling, headache, blurred vision, bleeding..."
                className="mt-1 w-full rounded-xl border border-[#D4DDD9] p-2.5 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl bg-[#F7F9FC] p-2.5 text-xs">
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(e) => setIncludeAi(e.target.checked)}
                className="h-4 w-4 accent-[#087F75]"
              />
              <span>
                Request Gemini AI clinical summary{' '}
                {geminiConfigured ? '(Configured)' : '(Server key optional)'}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !selectedPatientId}
              className="min-h-[42px] w-full rounded-xl bg-[#D94B4B] px-4 text-xs font-bold text-white hover:bg-[#B91C1C] disabled:opacity-50"
            >
              {submitting ? 'Evaluating Risk...' : 'Evaluate & Save Risk Alert'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
