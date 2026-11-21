import React, { useMemo, useState } from 'react';
import {
  Baby,
  CheckCircle2,
  HeartPulse,
  Mic,
  Search,
  Syringe,
  Volume2,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import { getLocalizedQuestionGuide, QUESTION_GUIDES } from '../shared/questionGuides';
import type { LanguageCode, StructuredVisitRecord, VisitType } from '../shared/types';

interface WhatToAskPageProps {
  language: LanguageCode;
  activeVisitType: VisitType;
  onChangeVisitType: (vt: VisitType) => void;
  activeRecord: StructuredVisitRecord | null;
  activeTranscript: string;
  onSpeakPrompt: (text: string) => void;
  onStartVoiceForCategory: (vt: VisitType) => void;
}

export const WhatToAskPage: React.FC<WhatToAskPageProps> = ({
  language,
  activeVisitType,
  onChangeVisitType,
  activeRecord,
  activeTranscript,
  onSpeakPrompt,
  onStartVoiceForCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = getTranslations(language);
  const qt = t.questions;

  const questions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return QUESTION_GUIDES.filter((item) => {
      if (item.visitType !== activeVisitType) return false;
      if (!q) return true;
      const loc = getLocalizedQuestionGuide(item, language);
      return (
        loc.question.toLowerCase().includes(q) ||
        loc.hint.toLowerCase().includes(q) ||
        loc.categoryLabel.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q)
      );
    });
  }, [activeVisitType, language, searchQuery]);

  const answeredCount = questions.filter((q) => q.isAnswered(activeRecord, activeTranscript)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7EDF2] pb-4">
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{qt.title}</h2>

          <button
            type="button"
            onClick={() => onStartVoiceForCategory(activeVisitType)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#10A77A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D9169]"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span>{qt.startVoiceVisit}</span>
          </button>
        </div>

        {/* Category Tabs + Search */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { type: 'ANC' as VisitType, label: t.categories.pregnancy, icon: HeartPulse },
                { type: 'NEWBORN' as VisitType, label: t.categories.newborn, icon: Baby },
                { type: 'IMMUNISATION' as VisitType, label: t.categories.vaccines, icon: Syringe },
              ] as const
            ).map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onChangeVisitType(type)}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeVisitType === type
                    ? 'border-[#087F75] bg-[#087F75] text-white'
                    : 'border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]/40'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718096]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={qt.filterPlaceholder}
              className="min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] pl-9 pr-3 text-xs text-[#172B3A] focus:border-[#087F75] focus:outline-none"
            />
          </div>
        </div>

        {/* Live Session Progress Bar */}
        <div className="mt-5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#172B3A]">{qt.checklistProgress}</span>
            <span className="font-mono tabular-nums text-[#087F75]">
              {answeredCount} / {questions.length} {qt.answered}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E7EDF2]">
            <div
              className="h-full rounded-full bg-[#10A77A] transition-all duration-300"
              style={{
                width: `${questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Question Cards */}
        <ul className="mt-5 space-y-3">
          {questions.map((q, index) => {
            const answered = q.isAnswered(activeRecord, activeTranscript);
            const loc = getLocalizedQuestionGuide(q, language);
            return (
              <li
                key={q.id}
                data-question-id={q.id}
                className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
                  answered
                    ? 'border-[#A7F3D0] bg-[#E8F7F1]/70'
                    : 'border-[#E7EDF2] bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      answered
                        ? 'bg-[#10A77A] text-white'
                        : 'border border-[#E7EDF2] bg-[#F7F9FC] text-[#718096]'
                    }`}
                  >
                    {answered ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </div>
                  <div>
                    <span className="rounded-md bg-[#EDF5FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                      {loc.categoryLabel}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-[#172B3A]">{loc.question}</h3>
                    <p className="mt-0.5 text-xs text-[#718096]">{loc.hint}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSpeakPrompt(loc.spokenPrompt)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 py-1.5 text-xs font-semibold text-[#172B3A] hover:border-[#087F75]"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
                    <span>{qt.speakPrompt}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};
