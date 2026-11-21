import React from 'react';
import { BookOpen, HelpCircle, Mic, Play, ShieldAlert, WifiOff } from 'lucide-react';
import { APPROVED_DANGER_SIGN_RULES } from '../shared/dangerSigns';
import { getTranslations } from '../shared/i18n';
import type { LanguageCode, VisitType } from '../shared/types';

interface HelpSupportPageProps {
  language: LanguageCode;
  onLaunchScenario: (transcript: string, visitType: VisitType, beneficiaryCode: string | null) => void;
}

export const HelpSupportPage: React.FC<HelpSupportPageProps> = ({
  language,
  onLaunchScenario,
}) => {
  const t = getTranslations(language);
  const ht = t.help;
  const vt = t.voice;

  const scenarios: Array<{
    id: string;
    title: string;
    visitType: VisitType;
    beneficiaryCode: string;
    transcript: string;
  }> = [
    {
      id: 'help-s1',
      title: vt.samplePregnancy,
      visitType: 'ANC',
      beneficiaryCode: 'ASHA00125',
      transcript:
        language === 'kn'
          ? 'ಹೆಸರು ನಂದಿನಿ ASHA00125, ತೂಕ 52 ಕೆಜಿ, ಬಿಪಿ 118/76, ಸ್ಥಿತಿ ಸಾಮಾನ್ಯ ಗರ್ಭಾವಸ್ಥೆ 24 ವಾರ, ಮುಂದಿನ ಭೇಟಿ 28 ನವೆಂಬರ್.'
          : language === 'hi'
            ? 'नाम नंदिनी ASHA00125, वजन 52 किलो, बीपी 118/76, स्थिति सामान्य गर्भावस्था 24 सप्ताह, अगली भेंट 28 नवंबर.'
            : 'Name Nandini ASHA00125, ANC checkup completed, weight 52 kilo, BP 118/76, IFA goli taking, next visit on 28 November.',
    },
    {
      id: 'help-s2',
      title: vt.sampleNewborn,
      visitType: 'NEWBORN',
      beneficiaryCode: 'ASHA00127',
      transcript:
        language === 'kn'
          ? 'ಹೆಸರು ರೇಖಾ ಮಗು ASHA00127, ಹೆಣ್ಣು ಮಗು, ತೂಕ 2.8 ಕೆಜಿ, ಮಗು ಚೆನ್ನಾಗಿ ಹಾಲು ಕುಡಿಯುತ್ತಿದೆ, ಲಸಿಕೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.'
          : language === 'hi'
            ? 'नाम रेखा का शिशु ASHA00127, लड़की, वजन 2.8 किलो, शिशु ठीक से दूध पी रहा है.'
            : 'Baby of Rekha ASHA00127, baby girl, weight 2.8 kilo, baby is feeding properly, vaccination record checked.',
    },
    {
      id: 'help-s10',
      title: vt.sampleVaccines,
      visitType: 'IMMUNISATION',
      beneficiaryCode: 'ASHA00128',
      transcript:
        language === 'kn'
          ? 'ಆರವ್ ASHA00128 ಲಸಿಕೆ ಭೇಟಿ, ತೂಕ 6.4 ಕೆಜಿ, ಇಂದು OPV-1 ಮತ್ತು Pentavalent-1 ನೀಡಲಾಗಿದೆ. PCV-1 ಬಾಕಿ ಇದೆ. ಮುಂದಿನ ಭೇಟಿ 18 ಡಿಸೆಂಬರ್.'
          : language === 'hi'
            ? 'आरव ASHA00128 टीकाकरण भेंट, वजन 6.4 किलो, आज OPV-1 और Pentavalent-1 दिया गया. PCV-1 बाकी है. अगली भेंट 18 दिसंबर.'
            : 'Aarav ASHA00128 immunisation visit. Weight 6.4 kilo. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.',
    },
    {
      id: 'help-danger',
      title: vt.sampleDanger,
      visitType: 'ANC',
      beneficiaryCode: 'ASHA00125',
      transcript:
        language === 'kn'
          ? 'ನಂದಿನಿ ASHA00125 ಅವರಿಗೆ ತೀವ್ರ ರಕ್ತಸ್ರಾವ ಇದೆ.'
          : language === 'hi'
            ? 'नंदिनी ASHA00125 को भारी रक्तस्राव हो रहा है.'
            : 'Pregnant woman Nandini ASHA00125 has vaginal bleeding.',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E7EDF2] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-[#E7EDF2] pb-4">
          <HelpCircle className="h-5 w-5 text-[#087F75]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold text-[#172B3A]">{ht.title}</h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <Mic className="h-5 w-5 text-[#087F75]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">{ht.step1Title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">{ht.step1Desc}</p>
          </div>

          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <ShieldAlert className="h-5 w-5 text-[#D94B4B]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">{ht.step2Title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">{ht.step2Desc}</p>
          </div>

          <div className="rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] p-4">
            <WifiOff className="h-5 w-5 text-[#F4A340]" aria-hidden="true" />
            <h3 className="mt-2 font-display text-sm font-bold text-[#172B3A]">{ht.step3Title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#718096]">{ht.step3Desc}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-[#E7EDF2] pt-5">
          <h3 className="font-display text-sm font-bold text-[#172B3A]">{ht.sampleScenarios}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onLaunchScenario(sc.transcript, sc.visitType, sc.beneficiaryCode)}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] p-3.5 text-left transition-colors hover:border-[#087F75] hover:bg-[#E8F7F1]/50"
              >
                <div>
                  <div className="text-xs font-bold text-[#087F75]">{sc.title}</div>
                  <div className="mt-1 text-xs text-[#718096]">&ldquo;{sc.transcript}&rdquo;</div>
                </div>
                <Play className="mt-1 h-4 w-4 shrink-0 text-[#10A77A]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-[#E7EDF2] pt-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#087F75]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-[#172B3A]">
              {ht.dangerRulesTitle} ({APPROVED_DANGER_SIGN_RULES.length})
            </h3>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {APPROVED_DANGER_SIGN_RULES.map((rule) => (
              <div
                key={rule.code}
                className="rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#172B3A]">{rule.title}</span>
                  <span className="font-mono text-[10px] font-semibold text-[#087F75]">
                    {rule.category} · {rule.guidelineId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
