import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Mic,
  Save,
  Volume2,
} from 'lucide-react';
import { extractStructuredVisitDeterministic } from '../shared/clinicalEngine';
import { getTranslations } from '../shared/i18n';
import type {
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  VisitType,
} from '../shared/types';

interface WhatToFillPageProps {
  record: StructuredVisitRecord | null;
  beneficiaries: Beneficiary[];
  language: LanguageCode;
  workerId: string;
  isSaving: boolean;
  onUpdateRecord: (updated: StructuredVisitRecord) => void;
  onSaveDraft: (record: StructuredVisitRecord) => Promise<void>;
  onConfirmAndSave: (record: StructuredVisitRecord) => Promise<void>;
  onListenReadBack: (record: StructuredVisitRecord) => void;
  onOpenVoiceVisit: () => void;
}

export const WhatToFillPage: React.FC<WhatToFillPageProps> = ({
  record,
  beneficiaries,
  language,
  workerId,
  isSaving,
  onUpdateRecord,
  onSaveDraft,
  onConfirmAndSave,
  onListenReadBack,
  onOpenVoiceVisit,
}) => {
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const t = getTranslations(language);
  const ff = t.fullForm;
  const ft = t.form;

  const ensureRecord = (): StructuredVisitRecord => {
    if (record) return record;
    return extractStructuredVisitDeterministic({
      transcript: '',
      visitType: 'ANC',
      language,
      workerId,
      beneficiaries,
      selectedBeneficiary: beneficiaries[0] ?? null,
    });
  };

  const active = record ?? ensureRecord();

  const patchField = (updater: (prev: StructuredVisitRecord) => StructuredVisitRecord) => {
    const next = updater(structuredClone(active));
    onUpdateRecord(next);
  };

  const handleInitBlank = (vt: VisitType) => {
    const fresh = extractStructuredVisitDeterministic({
      transcript: active.sourceTranscript || '',
      visitType: vt,
      language,
      workerId,
      beneficiaries,
      selectedBeneficiary:
        beneficiaries.find((b) => b.beneficiaryCode === active.beneficiaryId) ??
        beneficiaries[0] ??
        null,
    });
    onUpdateRecord(fresh);
  };

  const statusTag = (hasVal: boolean) => {
    if (!hasVal) {
      return (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#718096]">
          {ff.notProvided}
        </span>
      );
    }
    return active.confirmationStatus === 'confirmed' ? (
      <span className="rounded-md bg-[#E8F7F1] px-2 py-0.5 text-[10px] font-bold text-[#087F75]">
        {ff.confirmed}
      </span>
    ) : (
      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        {ff.needsConfirmation}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{ff.title}</h2>

          <button
            type="button"
            onClick={onOpenVoiceVisit}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#087F75] bg-white px-4 py-2 text-xs font-bold text-[#087F75] hover:bg-[#E8F7F1]"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span>{ff.backToVoice}</span>
          </button>
        </div>

        {active.dangerSignStatus === 'positive_detected' && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-[#991B1B]"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {ft.safetyAlert} ({active.dangerAnalysis.matches.map((m) => m.title).join(', ')})
            </span>
          </div>
        )}

        {/* Core Metadata Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="fill-visit-type" className="text-xs font-semibold text-[#718096]">
                {t.voice.visitCategory}
              </label>
              {statusTag(true)}
            </div>
            <select
              id="fill-visit-type"
              value={active.visitType}
              onChange={(e) => handleInitBlank(e.target.value as VisitType)}
              className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
            >
              <option value="ANC">{t.categories.pregnancy}</option>
              <option value="NEWBORN">{t.categories.newborn}</option>
              <option value="IMMUNISATION">{t.categories.vaccines}</option>
            </select>
          </div>

          <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="fill-beneficiary" className="text-xs font-semibold text-[#718096]">
                {ff.beneficiary}
              </label>
              {statusTag(Boolean(active.beneficiaryId))}
            </div>
            <select
              id="fill-beneficiary"
              value={active.beneficiaryId ?? ''}
              onChange={(e) => {
                const found = beneficiaries.find((b) => b.beneficiaryCode === e.target.value);
                patchField((prev) => ({
                  ...prev,
                  beneficiaryId: found?.beneficiaryCode ?? null,
                  beneficiaryName: found?.displayName ?? null,
                  householdId: found?.householdCode ?? null,
                }));
              }}
              className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
            >
              <option value="">{ff.selectBeneficiary}</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.beneficiaryCode}>
                  {b.displayName} ({b.beneficiaryCode})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="fill-next-date" className="text-xs font-semibold text-[#718096]">
                {ft.nextVisit}
              </label>
              {statusTag(Boolean(active.nextVisitDate))}
            </div>
            <input
              id="fill-next-date"
              type="date"
              value={active.nextVisitDate ?? ''}
              onChange={(e) =>
                patchField((prev) => ({
                  ...prev,
                  nextVisitDate: e.target.value || null,
                }))
              }
              className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
            />
          </div>
        </div>

        {/* Category-Specific Fields */}
        {active.visitType === 'ANC' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-anc-weight" className="text-xs font-semibold text-[#718096]">
                  {ff.motherWeightKg}
                </label>
                {statusTag(
                  active.pregnancyDetails?.weightKg !== null &&
                    active.pregnancyDetails?.weightKg !== undefined,
                )}
              </div>
              <input
                id="fill-anc-weight"
                type="number"
                step="0.1"
                value={active.pregnancyDetails?.weightKg ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    pregnancyDetails: {
                      ...(prev.pregnancyDetails ?? {
                        gestationalAgeWeeks: null,
                        ancStatus: 'completed',
                        weightKg: null,
                        bloodPressure: null,
                        ifaStatus: null,
                        vaccinationStatus: null,
                        tdDose: null,
                        reportedSymptoms: null,
                      }),
                      weightKg: e.target.value ? Number(e.target.value) : null,
                    },
                  }))
                }
                placeholder="52"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-anc-bp" className="text-xs font-semibold text-[#718096]">
                  {ff.bloodPressure}
                </label>
                {statusTag(Boolean(active.pregnancyDetails?.bloodPressure))}
              </div>
              <input
                id="fill-anc-bp"
                type="text"
                value={active.pregnancyDetails?.bloodPressure ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    pregnancyDetails: {
                      ...(prev.pregnancyDetails ?? {
                        gestationalAgeWeeks: null,
                        ancStatus: 'completed',
                        weightKg: null,
                        bloodPressure: null,
                        ifaStatus: null,
                        vaccinationStatus: null,
                        tdDose: null,
                        reportedSymptoms: null,
                      }),
                      bloodPressure: e.target.value || null,
                    },
                  }))
                }
                placeholder="118/76"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-anc-ifa" className="text-xs font-semibold text-[#718096]">
                  {ff.ifaTablets}
                </label>
                {statusTag(Boolean(active.pregnancyDetails?.ifaStatus))}
              </div>
              <select
                id="fill-anc-ifa"
                value={active.pregnancyDetails?.ifaStatus ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    pregnancyDetails: {
                      ...(prev.pregnancyDetails ?? {
                        gestationalAgeWeeks: null,
                        ancStatus: 'completed',
                        weightKg: null,
                        bloodPressure: null,
                        ifaStatus: null,
                        vaccinationStatus: null,
                        tdDose: null,
                        reportedSymptoms: null,
                      }),
                      ifaStatus: (e.target.value || null) as NonNullable<
                        StructuredVisitRecord['pregnancyDetails']
                      >['ifaStatus'],
                    },
                  }))
                }
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
              >
                <option value="">{ff.notReported}</option>
                <option value="reported_taking">{ff.takingRegularly}</option>
                <option value="supplied">{ff.suppliedToday}</option>
                <option value="not_taking">{ff.notTaking}</option>
              </select>
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-anc-td" className="text-xs font-semibold text-[#718096]">
                  {ff.tdVaccine}
                </label>
                {statusTag(Boolean(active.pregnancyDetails?.vaccinationStatus))}
              </div>
              <select
                id="fill-anc-td"
                value={active.pregnancyDetails?.vaccinationStatus ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    pregnancyDetails: {
                      ...(prev.pregnancyDetails ?? {
                        gestationalAgeWeeks: null,
                        ancStatus: 'completed',
                        weightKg: null,
                        bloodPressure: null,
                        ifaStatus: null,
                        vaccinationStatus: null,
                        tdDose: null,
                        reportedSymptoms: null,
                      }),
                      vaccinationStatus: (e.target.value || null) as NonNullable<
                        StructuredVisitRecord['pregnancyDetails']
                      >['vaccinationStatus'],
                    },
                  }))
                }
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
              >
                <option value="">{ff.notReported}</option>
                <option value="reported_completed">{ff.completed}</option>
                <option value="due">{ff.due}</option>
                <option value="partial">{ff.partial}</option>
              </select>
            </div>
          </div>
        )}

        {active.visitType === 'NEWBORN' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-nb-weight" className="text-xs font-semibold text-[#718096]">
                  {ft.babyWeight} ({t.readback.kilograms})
                </label>
                {statusTag(
                  Boolean(active.newbornDetails?.currentWeightKg ?? active.newbornDetails?.birthWeightKg),
                )}
              </div>
              <input
                id="fill-nb-weight"
                type="number"
                step="0.1"
                value={active.newbornDetails?.currentWeightKg ?? active.newbornDetails?.birthWeightKg ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    newbornDetails: {
                      ...(prev.newbornDetails ?? {
                        newbornId: prev.beneficiaryId,
                        motherBeneficiaryId: null,
                        birthDate: null,
                        ageDays: null,
                        birthWeightKg: null,
                        currentWeightKg: null,
                        feedingObservations: null,
                        reportedTemperature: null,
                        immunisationChecked: null,
                      }),
                      currentWeightKg: e.target.value ? Number(e.target.value) : null,
                    },
                  }))
                }
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-nb-feeding" className="text-xs font-semibold text-[#718096]">
                  {ff.feedingStatus}
                </label>
                {statusTag(Boolean(active.newbornDetails?.feedingObservations))}
              </div>
              <input
                id="fill-nb-feeding"
                type="text"
                value={active.newbornDetails?.feedingObservations ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    newbornDetails: {
                      ...(prev.newbornDetails ?? {
                        newbornId: prev.beneficiaryId,
                        motherBeneficiaryId: null,
                        birthDate: null,
                        ageDays: null,
                        birthWeightKg: null,
                        currentWeightKg: null,
                        feedingObservations: null,
                        reportedTemperature: null,
                        immunisationChecked: null,
                      }),
                      feedingObservations: e.target.value || null,
                    },
                  }))
                }
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-nb-temp" className="text-xs font-semibold text-[#718096]">
                  {ff.temperature}
                </label>
                {statusTag(Boolean(active.newbornDetails?.reportedTemperature))}
              </div>
              <input
                id="fill-nb-temp"
                type="text"
                value={active.newbornDetails?.reportedTemperature ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    newbornDetails: {
                      ...(prev.newbornDetails ?? {
                        newbornId: prev.beneficiaryId,
                        motherBeneficiaryId: null,
                        birthDate: null,
                        ageDays: null,
                        birthWeightKg: null,
                        currentWeightKg: null,
                        feedingObservations: null,
                        reportedTemperature: null,
                        immunisationChecked: null,
                      }),
                      reportedTemperature: e.target.value || null,
                    },
                  }))
                }
                placeholder="98.4 F"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>
          </div>
        )}

        {active.visitType === 'IMMUNISATION' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-imm-weight" className="text-xs font-semibold text-[#718096]">
                  {ft.patientWeight} ({t.readback.kilograms})
                </label>
                {statusTag(
                  active.immunisationDetails?.childWeightKg !== null &&
                    active.immunisationDetails?.childWeightKg !== undefined,
                )}
              </div>
              <input
                id="fill-imm-weight"
                type="number"
                step="0.1"
                value={active.immunisationDetails?.childWeightKg ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    immunisationDetails: {
                      ...(prev.immunisationDetails ?? {
                        childAgeLabel: null,
                        childWeightKg: null,
                        vaccinesGiven: [],
                        vaccinesDue: [],
                        missedVaccines: [],
                        previousVaccineHistory: null,
                        scheduleVersion: 'NIS-2026.03',
                      }),
                      childWeightKg: e.target.value ? Number(e.target.value) : null,
                    },
                  }))
                }
                placeholder="6.4"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 font-mono text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-imm-given" className="text-xs font-semibold text-[#718096]">
                  {ft.vaccinesGiven}
                </label>
                {statusTag(Boolean(active.immunisationDetails?.vaccinesGiven?.length))}
              </div>
              <input
                id="fill-imm-given"
                type="text"
                value={active.immunisationDetails?.vaccinesGiven.join(', ') ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    immunisationDetails: {
                      ...(prev.immunisationDetails ?? {
                        childAgeLabel: null,
                        vaccinesGiven: [],
                        vaccinesDue: [],
                        missedVaccines: [],
                        previousVaccineHistory: null,
                        scheduleVersion: 'NIS-2026.03',
                      }),
                      vaccinesGiven: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="OPV-1, Pentavalent-1"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
              />
            </div>

            <div className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fill-imm-due" className="text-xs font-semibold text-[#718096]">
                  {ft.vaccinesDue}
                </label>
                {statusTag(Boolean(active.immunisationDetails?.vaccinesDue?.length))}
              </div>
              <input
                id="fill-imm-due"
                type="text"
                value={active.immunisationDetails?.vaccinesDue.join(', ') ?? ''}
                onChange={(e) =>
                  patchField((prev) => ({
                    ...prev,
                    immunisationDetails: {
                      ...(prev.immunisationDetails ?? {
                        childAgeLabel: null,
                        vaccinesGiven: [],
                        vaccinesDue: [],
                        missedVaccines: [],
                        previousVaccineHistory: null,
                        scheduleVersion: 'NIS-2026.03',
                      }),
                      vaccinesDue: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="PCV-1"
                className="mt-2 min-h-[42px] w-full rounded-lg border border-[#E7EDF2] bg-white px-3 text-sm font-bold text-[#172B3A]"
              />
            </div>
          </div>
        )}

        {/* Observations */}
        <div className="mt-4 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5">
          <label htmlFor="fill-observations" className="block text-xs font-semibold text-[#718096]">
            {ff.observations}
          </label>
          <textarea
            id="fill-observations"
            rows={3}
            value={active.observations ?? ''}
            onChange={(e) =>
              patchField((prev) => ({
                ...prev,
                observations: e.target.value || null,
              }))
            }
            placeholder={ff.observationsPlaceholder}
            className="mt-2 w-full rounded-lg border border-[#E7EDF2] bg-white p-3 text-sm text-[#172B3A] focus:border-[#087F75] focus:outline-none"
          />
        </div>

        {draftNotice && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#E8F7F1] px-4 py-2.5 text-xs font-semibold text-[#087F75]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{draftNotice}</span>
          </div>
        )}

        {/* Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EDF2] pt-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onListenReadBack(active)}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
            >
              <Volume2 className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>{ft.readAloud}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void onSaveDraft(active).then(() => {
                  setDraftNotice(ff.draftNotice);
                });
              }}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E7EDF2] bg-white px-4 py-2 text-xs font-semibold text-[#172B3A] hover:bg-[#F7F9FC]"
            >
              <ClipboardCheck className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
              <span>{ft.saveDraft}</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isSaving || (!active.beneficiaryId && !active.beneficiaryName)}
            onClick={() => void onConfirmAndSave({ ...active, confirmationStatus: 'confirmed' })}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#10A77A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0D9169] disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? ft.saving : ff.confirmAndSaveVisit}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
