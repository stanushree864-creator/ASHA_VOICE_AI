import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  History,
  Mic,
  Save,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { extractStructuredVisitDeterministic } from '../shared/clinicalEngine';
import { getTranslations } from '../shared/i18n';
import { getLanguageConfig } from '../shared/languages';
import type {
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  VisitType,
  VoicePipelineState,
} from '../shared/types';

interface StructuredRecordCardProps {
  record: StructuredVisitRecord | null;
  visitType: VisitType;
  ashaWorkerName: string;
  workerId: string;
  selectedBeneficiary: Beneficiary | null;
  pipelineState: VoicePipelineState;
  language: LanguageCode;
  isSaving: boolean;
  isMobileLayout?: boolean;
  highlightedField: string | null;
  onHoverField: (fieldName: string | null) => void;
  onUpdateRecord?: (updated: StructuredVisitRecord) => void;
  onListenAgain: () => void;
  onInterruptPlayback: () => void;
  onStartVoiceCorrection: () => void;
  onSaveDraft: () => void;
  onConfirmAndSave: () => void;
  onConfirmUncertainSafety: (isDangerPresent: boolean) => void;
}

function displayValue(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '') return '—';
  return `${val}${suffix}`;
}

function formatLiveNow(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    time: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

export const StructuredRecordCard: React.FC<StructuredRecordCardProps> = ({
  record,
  visitType,
  ashaWorkerName,
  workerId,
  selectedBeneficiary,
  pipelineState,
  language,
  isSaving,
  isMobileLayout = false,
  highlightedField,
  onHoverField,
  onUpdateRecord,
  onListenAgain,
  onInterruptPlayback,
  onStartVoiceCorrection,
  onSaveDraft,
  onConfirmAndSave,
  onConfirmUncertainSafety,
}) => {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [liveClock, setLiveClock] = useState(() => formatLiveNow());

  useEffect(() => {
    const id = window.setInterval(() => setLiveClock(formatLiveNow()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const langCfg = getLanguageConfig(language);
  const t = getTranslations(language);
  const ft = t.form;
  const activeVisitType = record?.visitType ?? visitType;
  const isSpeaking = pipelineState === 'SPEAKING';
  const hasUncertainSafety = record?.dangerSignStatus === 'uncertain_pending_safety';

  const ensureEditableRecord = (): StructuredVisitRecord => {
    if (record) return record;
    const now = formatLiveNow();
    return extractStructuredVisitDeterministic({
      transcript: '',
      visitType: activeVisitType,
      language,
      workerId,
      ashaWorkerName,
      visitDate: now.date,
      visitTime: now.time,
      selectedBeneficiary,
    });
  };

  const handleToggleEdit = () => {
    if (!inlineEdit && !record && onUpdateRecord) {
      onUpdateRecord(ensureEditableRecord());
    }
    setInlineEdit((prev) => !prev);
  };

  const activeWorkerName = record?.ashaWorkerName || ashaWorkerName;
  const activeDateTime = record
    ? `${record.visitDate}${record.visitTime ? ` · ${record.visitTime}` : ''}`
    : `${liveClock.date} · ${liveClock.time}`;

  const weightValue =
    activeVisitType === 'NEWBORN'
      ? (record?.newbornDetails?.currentWeightKg ?? record?.newbornDetails?.birthWeightKg)
      : activeVisitType === 'IMMUNISATION'
        ? record?.immunisationDetails?.childWeightKg
        : record?.pregnancyDetails?.weightKg;

  const bpValue = record?.pregnancyDetails?.bloodPressure ?? null;
  const babyGenderValue = record?.newbornDetails?.babyGender ?? null;
  const babyGenderDisplay =
    babyGenderValue === 'Girl' ? ft.girl : babyGenderValue === 'Boy' ? ft.boy : null;
  const conditionValue =
    activeVisitType === 'ANC'
      ? (record?.pregnancyDetails?.pregnancyCondition ?? record?.patientCondition ?? null)
      : activeVisitType === 'NEWBORN'
        ? (record?.newbornDetails?.babyCondition ?? record?.patientCondition ?? null)
        : (record?.immunisationDetails?.childCondition ?? record?.patientCondition ?? null);

  const vaccinesGivenText = record?.immunisationDetails?.vaccinesGiven.join(', ') || null;
  const vaccinesDueText = record?.immunisationDetails?.vaccinesDue.join(', ') || null;
  const precautionsValue = record?.precautions ?? null;

  const fieldCardClass = (fieldName: string) => {
    const active = highlightedField === fieldName;
    return `rounded-xl border p-3 transition-all ${
      active
        ? 'border-[#087F75] bg-[#E8F7F1] ring-2 ring-[#10A77A]/30'
        : 'border-[#E7EDF2] bg-[#F7F9FC]'
    }`;
  };

  const updateWeight = (val: number | null) => {
    if (!onUpdateRecord) return;
    const base = ensureEditableRecord();
    if (activeVisitType === 'NEWBORN') {
      onUpdateRecord({
        ...base,
        newbornDetails: {
          newbornId: base.newbornDetails?.newbornId ?? null,
          motherBeneficiaryId: base.newbornDetails?.motherBeneficiaryId ?? null,
          birthDate: base.newbornDetails?.birthDate ?? null,
          ageDays: base.newbornDetails?.ageDays ?? null,
          birthWeightKg: base.newbornDetails?.birthWeightKg ?? null,
          currentWeightKg: val,
          babyGender: base.newbornDetails?.babyGender ?? null,
          babyCondition: base.newbornDetails?.babyCondition ?? null,
          feedingObservations: base.newbornDetails?.feedingObservations ?? null,
          reportedTemperature: base.newbornDetails?.reportedTemperature ?? null,
          immunisationChecked: base.newbornDetails?.immunisationChecked ?? null,
        },
      });
    } else if (activeVisitType === 'IMMUNISATION') {
      onUpdateRecord({
        ...base,
        immunisationDetails: {
          childAgeLabel: base.immunisationDetails?.childAgeLabel ?? null,
          childWeightKg: val,
          childCondition: base.immunisationDetails?.childCondition ?? null,
          vaccinesGiven: base.immunisationDetails?.vaccinesGiven ?? [],
          vaccinesDue: base.immunisationDetails?.vaccinesDue ?? [],
          missedVaccines: base.immunisationDetails?.missedVaccines ?? [],
          previousVaccineHistory: base.immunisationDetails?.previousVaccineHistory ?? null,
          scheduleVersion: base.immunisationDetails?.scheduleVersion ?? 'NIS-2026.03',
        },
      });
    } else {
      onUpdateRecord({
        ...base,
        pregnancyDetails: {
          gestationalAgeWeeks: base.pregnancyDetails?.gestationalAgeWeeks ?? null,
          ancStatus: base.pregnancyDetails?.ancStatus ?? null,
          weightKg: val,
          bloodPressure: base.pregnancyDetails?.bloodPressure ?? null,
          pregnancyCondition: base.pregnancyDetails?.pregnancyCondition ?? null,
          ifaStatus: base.pregnancyDetails?.ifaStatus ?? null,
          vaccinationStatus: base.pregnancyDetails?.vaccinationStatus ?? null,
          tdDose: base.pregnancyDetails?.tdDose ?? null,
          reportedSymptoms: base.pregnancyDetails?.reportedSymptoms ?? null,
        },
      });
    }
  };

  const updateCondition = (val: string) => {
    if (!onUpdateRecord) return;
    const base = ensureEditableRecord();
    const cleaned = val || null;
    if (activeVisitType === 'ANC') {
      onUpdateRecord({
        ...base,
        patientCondition: cleaned,
        pregnancyDetails: {
          gestationalAgeWeeks: base.pregnancyDetails?.gestationalAgeWeeks ?? null,
          ancStatus: base.pregnancyDetails?.ancStatus ?? null,
          weightKg: base.pregnancyDetails?.weightKg ?? null,
          bloodPressure: base.pregnancyDetails?.bloodPressure ?? null,
          pregnancyCondition: cleaned,
          ifaStatus: base.pregnancyDetails?.ifaStatus ?? null,
          vaccinationStatus: base.pregnancyDetails?.vaccinationStatus ?? null,
          tdDose: base.pregnancyDetails?.tdDose ?? null,
          reportedSymptoms: base.pregnancyDetails?.reportedSymptoms ?? null,
        },
      });
    } else if (activeVisitType === 'NEWBORN') {
      onUpdateRecord({
        ...base,
        patientCondition: cleaned,
        newbornDetails: {
          newbornId: base.newbornDetails?.newbornId ?? null,
          motherBeneficiaryId: base.newbornDetails?.motherBeneficiaryId ?? null,
          birthDate: base.newbornDetails?.birthDate ?? null,
          ageDays: base.newbornDetails?.ageDays ?? null,
          birthWeightKg: base.newbornDetails?.birthWeightKg ?? null,
          currentWeightKg: base.newbornDetails?.currentWeightKg ?? null,
          babyGender: base.newbornDetails?.babyGender ?? null,
          babyCondition: cleaned,
          feedingObservations: base.newbornDetails?.feedingObservations ?? null,
          reportedTemperature: base.newbornDetails?.reportedTemperature ?? null,
          immunisationChecked: base.newbornDetails?.immunisationChecked ?? null,
        },
      });
    } else {
      onUpdateRecord({
        ...base,
        patientCondition: cleaned,
        immunisationDetails: {
          childAgeLabel: base.immunisationDetails?.childAgeLabel ?? null,
          childWeightKg: base.immunisationDetails?.childWeightKg ?? null,
          childCondition: cleaned,
          vaccinesGiven: base.immunisationDetails?.vaccinesGiven ?? [],
          vaccinesDue: base.immunisationDetails?.vaccinesDue ?? [],
          missedVaccines: base.immunisationDetails?.missedVaccines ?? [],
          previousVaccineHistory: base.immunisationDetails?.previousVaccineHistory ?? null,
          scheduleVersion: base.immunisationDetails?.scheduleVersion ?? 'NIS-2026.03',
        },
      });
    }
  };

  const canSave = Boolean(
    record && !isSaving && !hasUncertainSafety && (record.beneficiaryId || record.beneficiaryName),
  );

  return (
    <section className="rounded-2xl border border-[#E7EDF2] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7EDF2] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-[#172B3A]">{ft.visitForm}</h3>
          <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 text-[11px] font-bold text-[#087F75]">
            {activeVisitType === 'ANC'
              ? t.categories.pregnancy
              : activeVisitType === 'NEWBORN'
                ? t.categories.newborn
                : t.categories.vaccines}
          </span>
        </div>

        {onUpdateRecord && (
          <button
            type="button"
            onClick={handleToggleEdit}
            className={`inline-flex min-h-[38px] items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
              inlineEdit
                ? 'border-[#087F75] bg-[#087F75] text-white'
                : 'border-[#E7EDF2] bg-[#F7F9FC] text-[#087F75] hover:bg-[#E8F7F1]'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{inlineEdit ? ft.done : ft.edit}</span>
          </button>
        )}
      </div>

      {/* Inline Edit Panel */}
      {inlineEdit && onUpdateRecord && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1]/50 p-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="form-asha-worker" className="block text-[11px] font-semibold text-[#718096]">
              {ft.ashaWorker}
            </label>
            <input
              id="form-asha-worker"
              type="text"
              value={record?.ashaWorkerName ?? ashaWorkerName}
              onChange={(e) => {
                const base = ensureEditableRecord();
                onUpdateRecord({ ...base, ashaWorkerName: e.target.value || null });
              }}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 text-sm font-bold text-[#172B3A]"
            />
          </div>

          <div>
            <label htmlFor="form-patient-name" className="block text-[11px] font-semibold text-[#718096]">
              {ft.patientName}
            </label>
            <input
              id="form-patient-name"
              type="text"
              value={record?.beneficiaryName ?? ''}
              onChange={(e) => {
                const base = ensureEditableRecord();
                onUpdateRecord({ ...base, beneficiaryName: e.target.value || null });
              }}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 text-sm font-bold text-[#172B3A]"
            />
          </div>

          <div>
            <label htmlFor="form-weight" className="block text-[11px] font-semibold text-[#718096]">
              {activeVisitType === 'NEWBORN' ? ft.babyWeight : ft.patientWeight} ({t.readback.kilograms})
            </label>
            <input
              id="form-weight"
              type="number"
              step="0.1"
              value={weightValue ?? ''}
              onChange={(e) => updateWeight(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 font-mono text-sm font-bold text-[#172B3A]"
            />
          </div>

          {activeVisitType === 'ANC' && (
            <div>
              <label htmlFor="form-bp" className="block text-[11px] font-semibold text-[#718096]">
                {ft.bp}
              </label>
              <input
                id="form-bp"
                type="text"
                placeholder="118/76"
                value={bpValue ?? ''}
                onChange={(e) => {
                  const base = ensureEditableRecord();
                  onUpdateRecord({
                    ...base,
                    pregnancyDetails: {
                      gestationalAgeWeeks: base.pregnancyDetails?.gestationalAgeWeeks ?? null,
                      ancStatus: base.pregnancyDetails?.ancStatus ?? null,
                      weightKg: base.pregnancyDetails?.weightKg ?? null,
                      bloodPressure: e.target.value || null,
                      pregnancyCondition: base.pregnancyDetails?.pregnancyCondition ?? null,
                      ifaStatus: base.pregnancyDetails?.ifaStatus ?? null,
                      vaccinationStatus: base.pregnancyDetails?.vaccinationStatus ?? null,
                      tdDose: base.pregnancyDetails?.tdDose ?? null,
                      reportedSymptoms: base.pregnancyDetails?.reportedSymptoms ?? null,
                    },
                  });
                }}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>
          )}

          {activeVisitType === 'NEWBORN' && (
            <div>
              <span className="block text-[11px] font-semibold text-[#718096]">{ft.babyGender}</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(['Girl', 'Boy'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      const base = ensureEditableRecord();
                      onUpdateRecord({
                        ...base,
                        newbornDetails: {
                          newbornId: base.newbornDetails?.newbornId ?? null,
                          motherBeneficiaryId: base.newbornDetails?.motherBeneficiaryId ?? null,
                          birthDate: base.newbornDetails?.birthDate ?? null,
                          ageDays: base.newbornDetails?.ageDays ?? null,
                          birthWeightKg: base.newbornDetails?.birthWeightKg ?? null,
                          currentWeightKg: base.newbornDetails?.currentWeightKg ?? null,
                          babyGender: g,
                          babyCondition: base.newbornDetails?.babyCondition ?? null,
                          feedingObservations: base.newbornDetails?.feedingObservations ?? null,
                          reportedTemperature: base.newbornDetails?.reportedTemperature ?? null,
                          immunisationChecked: base.newbornDetails?.immunisationChecked ?? null,
                        },
                      });
                    }}
                    className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                      babyGenderValue === g
                        ? 'border-[#087F75] bg-[#087F75] text-white'
                        : 'border-[#E7EDF2] bg-white text-[#172B3A]'
                    }`}
                  >
                    {g === 'Girl' ? ft.girl : ft.boy}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeVisitType === 'IMMUNISATION' && (
            <div>
              <label htmlFor="form-vaccines" className="block text-[11px] font-semibold text-[#718096]">
                {ft.vaccinesProvided}
              </label>
              <input
                id="form-vaccines"
                type="text"
                placeholder="OPV-1, Pentavalent-1"
                value={vaccinesGivenText ?? ''}
                onChange={(e) => {
                  const base = ensureEditableRecord();
                  const list = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onUpdateRecord({
                    ...base,
                    immunisationDetails: {
                      childAgeLabel: base.immunisationDetails?.childAgeLabel ?? null,
                      childWeightKg: base.immunisationDetails?.childWeightKg ?? null,
                      childCondition: base.immunisationDetails?.childCondition ?? null,
                      vaccinesGiven: list,
                      vaccinesDue: base.immunisationDetails?.vaccinesDue ?? [],
                      missedVaccines: base.immunisationDetails?.missedVaccines ?? [],
                      previousVaccineHistory: base.immunisationDetails?.previousVaccineHistory ?? null,
                      scheduleVersion: base.immunisationDetails?.scheduleVersion ?? 'NIS-2026.03',
                    },
                  });
                }}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 text-sm font-bold text-[#172B3A]"
              />
            </div>
          )}

          <div>
            <label htmlFor="form-condition" className="block text-[11px] font-semibold text-[#718096]">
              {activeVisitType === 'ANC'
                ? ft.pregnancyCondition
                : activeVisitType === 'NEWBORN'
                  ? ft.babyCondition
                  : ft.condition}
            </label>
            <input
              id="form-condition"
              type="text"
              value={conditionValue ?? ''}
              onChange={(e) => updateCondition(e.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 text-sm font-bold text-[#172B3A]"
            />
          </div>

          <div>
            <label htmlFor="form-precautions" className="block text-[11px] font-semibold text-[#718096]">
              {ft.precautions}
            </label>
            <input
              id="form-precautions"
              type="text"
              value={precautionsValue ?? ''}
              onChange={(e) => {
                const base = ensureEditableRecord();
                onUpdateRecord({ ...base, precautions: e.target.value || null });
              }}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 text-sm font-bold text-[#172B3A]"
            />
          </div>

          <div>
            <label htmlFor="form-next-visit" className="block text-[11px] font-semibold text-[#718096]">
              {ft.nextVisit}
            </label>
            <input
              id="form-next-visit"
              type="date"
              value={record?.nextVisitDate ?? ''}
              onChange={(e) => {
                const base = ensureEditableRecord();
                onUpdateRecord({ ...base, nextVisitDate: e.target.value || null });
              }}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-[#E7EDF2] bg-white px-2.5 font-mono text-sm font-bold text-[#172B3A]"
            />
          </div>
        </div>
      )}

      {/* Uncertain Safety Banner */}
      {hasUncertainSafety && record && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950"
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <span>{ft.safetyAlert}</span>
          </div>
          <p className="mt-1 text-sm">
            {record.dangerAnalysis.uncertainMatches[0]?.clarificationPrompt ??
              ft.safetyPromptFallback}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConfirmUncertainSafety(true)}
              className="min-h-[40px] rounded-lg bg-[#D94B4B] px-4 py-1.5 text-xs font-bold text-white"
            >
              {ft.yesAlert}
            </button>
            <button
              type="button"
              onClick={() => onConfirmUncertainSafety(false)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-[#172B3A]"
            >
              {ft.noSafe}
            </button>
          </div>
        </div>
      )}

      {record &&
        record.dangerAnalysis.negatedMatches.length > 0 &&
        record.dangerSignStatus === 'none_detected' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-3.5 py-2 text-xs font-medium text-[#087F75]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10A77A]" aria-hidden="true" />
            <span>{ft.safeVisit}</span>
          </div>
        )}

      {/* Category-Adaptive Simple Form Grid */}
      <dl className="mt-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className={fieldCardClass('ashaWorkerName')}>
            <dt className="text-[11px] font-semibold text-[#718096]">{ft.ashaWorker}</dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A]">
              {activeWorkerName}
            </dd>
          </div>
          <div className={fieldCardClass('visitDate')}>
            <dt className="text-[11px] font-semibold text-[#718096]">{ft.dateTime}</dt>
            <dd className="mt-0.5 truncate font-mono text-xs font-bold tabular-nums text-[#172B3A] sm:text-sm">
              {activeDateTime}
            </dd>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div
            className={fieldCardClass('beneficiaryName')}
            onMouseEnter={() => onHoverField('beneficiaryName')}
            onMouseLeave={() => onHoverField(null)}
          >
            <dt className="text-[11px] font-semibold text-[#718096]">{ft.patientName}</dt>
            <dd className="mt-0.5 truncate text-base font-bold text-[#172B3A]">
              {displayValue(record?.beneficiaryName)}
            </dd>
          </div>

          <div
            className={fieldCardClass(
              activeVisitType === 'NEWBORN'
                ? 'currentWeightKg'
                : activeVisitType === 'IMMUNISATION'
                  ? 'childWeightKg'
                  : 'weightKg',
            )}
            onMouseEnter={() =>
              onHoverField(
                activeVisitType === 'NEWBORN'
                  ? 'currentWeightKg'
                  : activeVisitType === 'IMMUNISATION'
                    ? 'childWeightKg'
                    : 'weightKg',
              )
            }
            onMouseLeave={() => onHoverField(null)}
          >
            <dt className="text-[11px] font-semibold text-[#718096]">
              {activeVisitType === 'NEWBORN' ? ft.babyWeight : ft.patientWeight}
            </dt>
            <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#172B3A]">
              {displayValue(weightValue, ` ${t.readback.kilograms}`)}
            </dd>
          </div>
        </div>

        {activeVisitType === 'ANC' && (
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={fieldCardClass('bloodPressure')}
              onMouseEnter={() => onHoverField('bloodPressure')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.bp}</dt>
              <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#172B3A]">
                {displayValue(bpValue)}
              </dd>
            </div>

            <div className={fieldCardClass('pregnancyCondition')}>
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.pregnancyCondition}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A] sm:text-base">
                {displayValue(conditionValue)}
              </dd>
            </div>
          </div>
        )}

        {activeVisitType === 'NEWBORN' && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className={fieldCardClass('babyGender')}>
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.babyGender}</dt>
              <dd className="mt-0.5 text-base font-bold text-[#172B3A]">
                {displayValue(babyGenderDisplay)}
              </dd>
            </div>

            <div className={fieldCardClass('babyCondition')}>
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.babyCondition}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A] sm:text-base">
                {displayValue(conditionValue)}
              </dd>
            </div>
          </div>
        )}

        {activeVisitType === 'IMMUNISATION' && (
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={fieldCardClass('vaccinesGiven')}
              onMouseEnter={() => onHoverField('vaccinesGiven')}
              onMouseLeave={() => onHoverField(null)}
            >
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.vaccinesProvided}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A]">
                {displayValue(vaccinesGivenText)}
              </dd>
              {vaccinesDueText && (
                <div className="mt-0.5 truncate text-[11px] font-semibold text-[#087F75]">
                  {ft.due}: {vaccinesDueText}
                </div>
              )}
            </div>

            <div className={fieldCardClass('childCondition')}>
              <dt className="text-[11px] font-semibold text-[#718096]">{ft.condition}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A] sm:text-base">
                {displayValue(conditionValue)}
              </dd>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className={fieldCardClass('precautions')}>
            <dt className="text-[11px] font-semibold text-[#718096]">{ft.precautions}</dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-[#172B3A]">
              {displayValue(precautionsValue)}
            </dd>
          </div>

          <div
            className={fieldCardClass('nextVisitDate')}
            onMouseEnter={() => onHoverField('nextVisitDate')}
            onMouseLeave={() => onHoverField(null)}
          >
            <dt className="text-[11px] font-semibold text-[#718096]">{ft.nextVisit}</dt>
            <dd className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#172B3A]">
              {displayValue(record?.nextVisitDate)}
            </dd>
          </div>
        </div>
      </dl>

      {/* Voice Correction History */}
      {record && record.correctionHistory.length > 0 && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-[#EDF5FF] p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{ft.changed}</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-[#172B3A]">
            {record.correctionHistory.map((c, idx) => (
              <li key={idx}>
                {c.fieldName}: {c.previousValue ?? ft.empty} → <strong>{c.correctedValue}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      {record && (
        <div className="mt-4 border-t border-[#E7EDF2] pt-4">
          <div
            className={`grid gap-2 ${
              isMobileLayout ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {isSpeaking ? (
              <button
                type="button"
                onClick={onInterruptPlayback}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
              >
                <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{ft.stop}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onListenAgain}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
              >
                <Volume2 className="h-4 w-4 shrink-0 text-[#087F75]" aria-hidden="true" />
                <span>{ft.readAloud}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartVoiceCorrection}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#087F75] bg-white px-3 py-2 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
            >
              <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{ft.speakFix}</span>
            </button>

            <button
              type="button"
              onClick={onSaveDraft}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#E7EDF2] bg-white px-3 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-[#087F75]" aria-hidden="true" />
              <span>{ft.saveDraft}</span>
            </button>

            <button
              type="button"
              onClick={onConfirmAndSave}
              disabled={!canSave}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#10A77A] px-3 py-2 text-xs font-bold text-white hover:bg-[#0D9169] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{isSaving ? ft.saving : langCfg.labels.confirmAndSave}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
