import type {
  DangerSignAnalysis,
  DangerSignMatch,
  DangerSignRule,
  GuidelineCitation,
  VisitType,
} from './types';

export const GUIDELINE_VERSIONS: GuidelineCitation[] = [
  {
    id: 'NHM_SSBSK_2026',
    guidelineName: 'NHM Samagra Shishu Bal Swasthya Karyakram (SSBSK) Operational Guidelines',
    sourceUrl: 'https://nhm.gov.in/index4.php?lang=1&level=0&lid=825&linkid=521',
    pageOrSection: 'Operational Guidelines 2026 — Newborn & Child Danger Sign Referral Protocol',
    version: '2026.1',
    effectiveDate: '2026-04-01',
    reviewedBy: 'Dr. Kavitha Rao (District Maternal & Child Health Reviewer)',
    reviewedAt: '2026-10-15T09:00:00Z',
    activeStatus: true,
  },
  {
    id: 'NHM_ASHA_MOD6',
    guidelineName: 'NHM ASHA Module 6: Skills That Save Lives',
    sourceUrl: 'https://nhm.gov.in/images/pdf/communitisation/asha/book-no-6.pdf',
    pageOrSection: 'Maternal & Newborn Home-Based Care Danger Signs Checklist',
    version: 'Mod6-Rev2024',
    effectiveDate: '2024-01-01',
    reviewedBy: 'Dr. Kavitha Rao (District Maternal & Child Health Reviewer)',
    reviewedAt: '2026-10-15T09:00:00Z',
    activeStatus: true,
  },
  {
    id: 'NHM_CEMONC_2024',
    guidelineName: 'NHM Comprehensive Emergency Obstetric and Newborn Care (CEmONC) Part 2',
    sourceUrl:
      'https://nhm.gov.in/images/pdf/programmes/maternal-health/guidelines/Revised_CEmONC_curriculum_2024-Part_2.pdf',
    pageOrSection: 'Revised CEmONC Curriculum 2024 — Obstetric Emergency Triage',
    version: '2024.2',
    effectiveDate: '2024-06-01',
    reviewedBy: 'Dr. Kavitha Rao (District Maternal & Child Health Reviewer)',
    reviewedAt: '2026-10-15T09:00:00Z',
    activeStatus: true,
  },
  {
    id: 'GOI_NIS_2026',
    guidelineName: 'Government of India — National Immunisation Schedule',
    sourceUrl: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/mar/doc2026317827201.pdf',
    pageOrSection: 'Universal Immunisation Programme Schedule (2026 Release)',
    version: 'NIS-2026.03',
    effectiveDate: '2026-03-17',
    reviewedBy: 'Dr. Kavitha Rao (District Maternal & Child Health Reviewer)',
    reviewedAt: '2026-10-15T09:00:00Z',
    activeStatus: true,
  },
];

interface InternalDangerRule extends DangerSignRule {
  /** Phrases whose very meaning is absence/inability (e.g. "not feeding", "no fetal movement"). General negation words like "not" inside them should NOT flip them to safe. */
  inherentAbsenceRule?: boolean;
  /** Explicit phrases indicating the state is healthy/safe even if keywords overlap. */
  safePhrases?: string[];
}

export const APPROVED_DANGER_SIGN_RULES: InternalDangerRule[] = [
  // PREGNANCY DANGER SIGNS
  {
    code: 'PREG_VAGINAL_BLEEDING',
    category: 'PREGNANCY',
    title: 'Vaginal bleeding during pregnancy',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_CEMONC_2024',
    guidelineSection: 'Obstetric Haemorrhage / Antepartum Bleeding',
    phrases: {
      en: ['vaginal bleeding', 'bleeding', 'heavy bleeding', 'spotting', 'blood discharge', 'hemorrhage', 'haemorrhage'],
      kn: ['ರಕ್ತಸ್ರಾವ', 'raktasrava', 'rakta sraava', 'raktha barta ide', 'bleeding agtide', 'bleeding aagide'],
      hi: ['रक्तस्राव', 'खून बहना', 'खून आ रहा', 'khoon behna', 'khoon aa raha', 'khoon gir raha', 'bleeding ho rahi'],
      ta: ['ரத்தப்போக்கு', 'உதிரப்போக்கு', 'rathapokku', 'bleeding varuthu'],
      te: ['రక్తస్రావం', 'raktasravam', 'raktham padutondi'],
      ml: ['രക്തസ്രാവം', 'rakthasravam'],
      mr: ['रक्तस्राव', 'रक्त येणे', 'raktasrav'],
      bn: ['রক্তপাত', 'রক্তক্ষরণ', 'roktopat'],
      gu: ['રક્તસ્ત્રાવ', 'લોહી વહેવું', 'lohi padvu'],
      pa: ['ਖੂਨ ਵਗਣਾ', 'ਰਕਤਸ੍ਰਾਵ', 'khoon wagda'],
      or: ['ରକ୍ତସ୍ରାବ', 'raktasraba'],
      as: ['ৰক্তক্ষৰণ', 'ৰক্তস্ৰাৱ'],
    },
  },
  {
    code: 'PREG_CONVULSIONS',
    category: 'PREGNANCY',
    title: 'Convulsions or fits',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_CEMONC_2024',
    guidelineSection: 'Eclampsia / Maternal Seizures',
    phrases: {
      en: ['convulsions', 'convulsion', 'fits', 'seizure', 'seizures', 'eclampsia', 'shaking fits'],
      kn: ['ಸೆಳೆತ', 'ಫಿಟ್ಸ್', 'seleta', 'fits bandide', 'moorche'],
      hi: ['दौरे', 'झटके', 'मिर्गी', 'daure', 'jhatke', 'fits aa rahe'],
      ta: ['வலிப்பு', 'valippu'],
      te: ['మూర్ఛ', 'ఫిట్స్', 'moorcha'],
      ml: ['അപസ്മാരം', 'വിറയൽ', 'valippu'],
      mr: ['झटके', 'आकडी', 'aakdi'],
      bn: ['খিঁচুনি', 'khichuni'],
      gu: ['આંચકી', 'ખેંચ', 'aanchki'],
      pa: ['ਦੌਰੇ', 'ਝਟਕੇ', 'daure'],
      or: ['ବାତ', 'ମୂର୍ଚ୍ଛା', 'batamariba'],
      as: ['মৃগী', 'হাত-ভৰি কঁপা'],
    },
  },
  {
    code: 'PREG_SEVERE_HEADACHE_VISION',
    category: 'PREGNANCY',
    title: 'Severe headache with blurred vision',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_ASHA_MOD6',
    guidelineSection: 'Pre-eclampsia Warning Signs',
    phrases: {
      en: ['severe headache', 'blurred vision', 'blurry vision', 'headache with blurred vision', 'vision blurred', 'cannot see clearly'],
      kn: ['ತೀವ್ರ ತಲೆನೋವು', 'ದೃಷ್ಟಿ ಮಂಜಾಗಿದೆ', 'tale novu', 'kannu manjagide'],
      hi: ['तेज सिरदर्द', 'धुंधला दिखना', 'sir dard', 'dhundhla dikh raha'],
      ta: ['கடுமையான தலைவலி', 'மங்கலான பார்வை', 'thalai vali'],
      te: ['తీవ్రమైన తలనొప్పి', 'మసకబారిన చూపు'],
      ml: ['കഠിനമായ തലവേദന', 'കാഴ്ച മങ്ങൽ'],
      mr: ['तीव्र डोकेदुखी', 'धूसर दिसणे'],
      bn: ['তীব্র মাথাব্যথা', 'ঝাপসা দেখা'],
      gu: ['તીવ્ર માથાનો દુખાવો', 'ઝાંખું દેખાવું'],
      pa: ['ਤੇਜ਼ ਸਿਰਦਰਦ', 'ਧੁੰਦਲਾ ਦਿਖਣਾ'],
      or: ['ପ୍ରବଳ ମୁଣ୍ଡବିନ୍ଧା', 'ଝାପସା ଦେଖାଯିବା'],
      as: ['প্ৰচণ্ড মূৰৰ বিষ', 'চকুৰে ধোঁৱা দেখা'],
    },
  },
  {
    code: 'PREG_REDUCED_FETAL_MOVEMENT',
    category: 'PREGNANCY',
    title: 'Reduced or absent fetal movement',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_ASHA_MOD6',
    guidelineSection: 'Fetal Distress Indicators',
    inherentAbsenceRule: true,
    safePhrases: ['fetal movement normal', 'fetal movement good', 'baby moving well', 'movement is normal', 'movements normal'],
    phrases: {
      en: ['reduced fetal movement', 'absent fetal movement', 'no fetal movement', 'baby not moving', 'decreased fetal movement', 'fetal movement stopped'],
      kn: ['ಮಗುವಿನ ಚಲನೆ ಕಡಿಮೆ', 'chalaneyilla', 'magu chalane kadime'],
      hi: ['बच्चे की हलचल कम', 'हलचल बंद', 'bacha hil nahi raha', 'halchal kam'],
      ta: ['குழந்தை அசைவு குறைவு', 'asaivu illai'],
      te: ['పిల్లల కదలికలు తక్కువ', 'kadalikalu levu'],
      ml: ['കുഞ്ഞിന്റെ അനക്കം കുറവ്'],
      mr: ['बाळाची हालचाल कमी'],
      bn: ['বাচ্চার নড়াচড়া কম'],
      gu: ['બાળકની હલચલ ઓછી'],
      pa: ['ਬੱਚੇ ਦੀ ਹਲਚਲ ਘੱਟ'],
      or: ['ଶିଶୁର ଗତି କମ୍'],
      as: ['কেঁচুৱাৰ লৰচৰ কম'],
    },
  },
  {
    code: 'PREG_SEVERE_ABDOMINAL_PAIN',
    category: 'PREGNANCY',
    title: 'Severe abdominal pain',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_CEMONC_2024',
    guidelineSection: 'Acute Obstetric Abdomen',
    phrases: {
      en: ['severe abdominal pain', 'severe stomach pain', 'acute abdominal pain', 'unbearable belly pain'],
      kn: ['ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು', 'hotte novu', 'teevra hotte novu'],
      hi: ['तेज पेट दर्द', 'असहनीय पेट दर्द', 'tez pet dard', 'pet me bahut dard'],
      ta: ['கடுமையான வயிற்று வலி', 'vayiru vali'],
      te: ['తీవ్రమైన కడుపు నొప్పి', 'kadupu noppi'],
      ml: ['കഠിനമായ വയറുവേദന'],
      mr: ['तीव्र पोटदुखी', 'potat dukhne'],
      bn: ['তীব্র পেট ব্যথা'],
      gu: ['તીવ્ર પેટમાં દુખાવો'],
      pa: ['ਤੇਜ਼ ਪੇਟ ਦਰਦ'],
      or: ['ପ୍ରବଳ ପେଟ ଯନ୍ତ୍ରଣା'],
      as: ['প্ৰচণ্ড পেটৰ বিষ'],
    },
  },

  // NEWBORN DANGER SIGNS
  {
    code: 'NB_FEVER_OR_HYPOTHERMIA',
    category: 'NEWBORN',
    title: 'High fever or abnormally cold body temperature',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_SSBSK_2026',
    guidelineSection: 'Neonatal Sepsis / Thermal Danger Sign',
    safePhrases: ['no fever', 'temperature normal', 'afebrile', 'jvara illa', 'bukhar nahi'],
    phrases: {
      en: ['high fever', 'fever', 'hyperthermia', 'hypothermia', 'very cold', 'abnormally cold', 'feeling cold', 'hot body'],
      kn: ['ಜ್ವರ', 'ತೀವ್ರ ಜ್ವರ', 'jvara', 'jwara', 'bisi ide', 'tannage agide'],
      hi: ['तेज बुखार', 'बुखार', 'ठंडा पड़ना', 'tez bukhar', 'bukhar', 'body thandi'],
      ta: ['அதிக காய்ச்சல்', 'காய்ச்சல்', 'kaichal'],
      te: ['అధిక జ్వరం', 'జ్వరం', 'jwaram'],
      ml: ['കടുത്ത പനി', 'പനി', 'pani'],
      mr: ['तीव्र ताप', 'ताप', 'taap'],
      bn: ['উচ্চ জ্বর', 'জ্বর', 'jor'],
      gu: ['તેજ તાવ', 'તાવ', 'taav'],
      pa: ['ਤੇਜ਼ ਬੁਖਾਰ', 'ਬੁਖਾਰ', 'bukhar'],
      or: ['ପ୍ରବଳ ଜ୍ୱର', 'ଜ୍ୱର', 'jwara'],
      as: ['তীব্ৰ জ্বৰ', 'জ্বৰ', 'jwar'],
    },
  },
  {
    code: 'NB_POOR_FEEDING',
    category: 'NEWBORN',
    title: 'Poor feeding or inability to feed',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_SSBSK_2026',
    guidelineSection: 'Neonatal Feeding Failure',
    inherentAbsenceRule: true,
    safePhrases: [
      'feeding properly',
      'feeding well',
      'breastfeeding well',
      'suckling well',
      'haalu chennagi kudiyutide',
      'doodh pee raha hai',
      'no poor feeding',
    ],
    phrases: {
      en: ['poor feeding', 'not feeding', 'is not feeding', 'inability to feed', 'unable to feed', 'cannot feed', 'refusing feed', 'stopped feeding', 'not taking breastmilk'],
      kn: ['ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ', 'haalu kudiyutilla', 'kudiyutilla', 'feeding agtilla'],
      hi: ['दूध नहीं पी रहा', 'दूध नहीं पी रही', 'doodh nahi pee', 'feed nahi kar raha'],
      ta: ['பால் குடிக்கவில்லை', 'paal kudikkavillai'],
      te: ['పాలు తాగడం లేదు', 'paalu tagadam ledu'],
      ml: ['പാൽ കുടിക്കുന്നില്ല', 'paal kudikkunnilla'],
      mr: ['दूध पीत नाही', 'doodh peet nahi'],
      bn: ['দুধ খাচ্ছে না', 'dudh khachhe na'],
      gu: ['દૂધ પીતું નથી', 'dudh pitu nathi'],
      pa: ['ਦੁੱਧ ਨਹੀਂ ਪੀ ਰਿਹਾ', 'dudh nahi pee riha'],
      or: ['କ୍ଷୀର ପିଉନାହିଁ', 'khira piunahi'],
      as: ['গাখীৰ খোৱা নাই', 'gakhir khowa nai'],
    },
  },
  {
    code: 'NB_DIFFICULTY_BREATHING',
    category: 'NEWBORN',
    title: 'Difficulty breathing or chest indrawing',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_SSBSK_2026',
    guidelineSection: 'Neonatal Respiratory Distress',
    phrases: {
      en: ['difficulty breathing', 'trouble breathing', 'fast breathing', 'chest indrawing', 'shortness of breath', 'gasping', 'grunting'],
      kn: ['ಉಸಿರಾಟದ ತೊಂದರೆ', 'usirata tondare', 'usiru kattu'],
      hi: ['सांस लेने में तकलीफ', 'तेज सांस', 'saans lene me takleef', 'saans phoolna'],
      ta: ['மூச்சு திணறல்', 'moochu thinaral'],
      te: ['శ్వాస తీసుకోవడంలో ఇబ్బంది'],
      ml: ['ശ്വാസതടസ്സം'],
      mr: ['श्वास घेण्यास त्रास'],
      bn: ['শ্বাসকষ্ট'],
      gu: ['શ્વાસ લેવામાં તકલીફ'],
      pa: ['ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼'],
      or: ['ଶ୍ୱାସକ୍ରିୟାରେ କଷ୍ଟ'],
      as: ['উশাহ লোৱাত কষ্ট'],
    },
  },
  {
    code: 'NB_CONVULSIONS',
    category: 'NEWBORN',
    title: 'Newborn convulsions or fits',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_ASHA_MOD6',
    guidelineSection: 'Neonatal Seizures',
    phrases: {
      en: ['newborn convulsions', 'baby having fits', 'neonatal seizure', 'convulsions', 'fits'],
      kn: ['ಮಗುವಿಗೆ ಸೆಳೆತ', 'maguvige fits'],
      hi: ['बच्चे को झटके', 'बच्चे को दौरे'],
      ta: ['குழந்தைக்கு வலிப்பு'],
      te: ['శిశువుకు మూర్ఛ'],
      ml: ['കുഞ്ഞിന് അപസ്മാരം'],
      mr: ['बाळाला झटके'],
      bn: ['নবজাতকের খিঁচুনি'],
      gu: ['નવજાતને આંચકી'],
      pa: ['ਨਵਜੰਮੇ ਨੂੰ ਦੌਰੇ'],
      or: ['ନବଜାତ ଶିଶୁକୁ ବାତ'],
      as: ['নৱজাতকৰ মৃগী'],
    },
  },
  {
    code: 'NB_LETHARGY_UNCONSCIOUS',
    category: 'NEWBORN',
    title: 'Severe lethargy or unconsciousness',
    severity: 'IMMEDIATE_PHC_REFERRAL',
    guidelineId: 'NHM_SSBSK_2026',
    guidelineSection: 'Neonatal Lethargy / Coma',
    phrases: {
      en: ['lethargy', 'lethargic', 'unconscious', 'not responding', 'unresponsive', 'limp baby', 'flaccid'],
      kn: ['ಪ್ರಜ್ಞಾಹೀನ', 'ತುಂಬಾ ನಿಶ್ಯಕ್ತಿ', 'spandane illa'],
      hi: ['बेहोश', 'सुस्त', 'कोई हरकत नहीं', 'behosh', 'sust'],
      ta: ['மயக்கம்', 'சுறுசுறுப்பில்லை'],
      te: ['అపస్మారక స్థితి', 'మత్తుగా'],
      ml: ['ബോധക്ഷയം', 'അമിതമായ ക്ഷീണം'],
      mr: ['बेशुद्ध', 'सुस्त'],
      bn: ['অচেতন', 'নিস্তেজ'],
      gu: ['બેભાન', 'સુસ્ત'],
      pa: ['ਬੇਹੋਸ਼', 'ਸੁਸਤ'],
      or: ['ଅଚେତନ', 'ନିସ୍ତେଜ'],
      as: ['অচেতন', 'নিস্তেজ'],
    },
  },
];

const NEGATION_CUES = [
  'no',
  'not',
  'without',
  'absent',
  'negative',
  'denies',
  'denied',
  'never',
  'none',
  'free of',
  'illa',
  'illai',
  'illave',
  'nahi',
  'nahin',
  'na',
  'ledu',
  'nathi',
  'nai',
  'ನೋ',
  'ಇಲ್ಲ',
  'नहीं',
  'नाही',
  'இல்லை',
  'లేదు',
  'ഇല്ല',
  'না',
  'નથી',
  'ਨਹੀਂ',
  'ନାହିଁ',
  'নাই',
];

const UNCERTAINTY_CUES = [
  'maybe',
  'unsure',
  'not sure',
  'uncertain',
  'possibly',
  'might have',
  'could be',
  'doubt',
  'irabahudu',
  'shayad',
  'lagta hai',
  '?',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholePhrase(text: string, phrase: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedPhrase = phrase.toLowerCase().trim();
  if (!normalizedPhrase) return false;
  // Use word boundaries for ASCII/Latin phrases; direct inclusion for Indic scripts
  const isAscii = /^[\x00-\x7F]+$/.test(normalizedPhrase);
  if (isAscii) {
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}([^a-z0-9]|$)`, 'i');
    return regex.test(normalizedText);
  }
  return normalizedText.includes(normalizedPhrase);
}

function findNegationBeforeOrAround(clause: string, phrase: string): string | null {
  const lower = clause.toLowerCase();
  const idx = lower.indexOf(phrase.toLowerCase());
  const windowStart = Math.max(0, idx - 32);
  const windowEnd = Math.min(lower.length, idx + phrase.length + 24);
  const localWindow = lower.slice(windowStart, windowEnd);

  for (const cue of NEGATION_CUES) {
    if (containsWholePhrase(localWindow, cue)) {
      return cue;
    }
  }
  return null;
}

function hasUncertaintyCue(clause: string): boolean {
  const lower = clause.toLowerCase();
  return UNCERTAINTY_CUES.some((cue) =>
    cue === '?' ? lower.includes('?') : containsWholePhrase(lower, cue),
  );
}

/**
 * Deterministic, auditable danger-sign detection engine.
 * Operates in parallel with speech extraction on both partial and final transcripts.
 */
export function detectDangerSigns(
  transcript: string,
  visitType?: VisitType | null,
): DangerSignAnalysis {
  const analyzedAt = new Date().toISOString();
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      status: 'none_detected',
      matches: [],
      negatedMatches: [],
      uncertainMatches: [],
      analyzedAt,
    };
  }

  // Split transcript into independent clinical clauses
  const clauses = trimmed
    .split(/[.;,\n]+|\b(?:and|but|however|also|aadhre|lekin|par|aur|mattum|mariyu)\b/gi)
    .map((c) => c.trim())
    .filter(Boolean);

  const matches: DangerSignMatch[] = [];
  const negatedMatches: DangerSignAnalysis['negatedMatches'] = [];
  const uncertainMatches: DangerSignAnalysis['uncertainMatches'] = [];
  const seenPositiveCodes = new Set<string>();

  const candidateRules = APPROVED_DANGER_SIGN_RULES;

  for (const clause of clauses) {
    const clauseUncertain = hasUncertaintyCue(clause);

    for (const rule of candidateRules) {
      // Check explicit safe overrides first (e.g. "feeding properly", "fetal movement normal")
      if (rule.safePhrases?.some((sp) => containsWholePhrase(clause, sp))) {
        negatedMatches.push({
          code: rule.code,
          title: rule.title,
          clauseText: clause,
          negationCue: 'explicit_safe_observation',
        });
        continue;
      }

      const allPhrases = Object.values(rule.phrases).flat();
      // Prefer longest matching phrase first
      allPhrases.sort((a, b) => b.length - a.length);

      const matchedPhrase = allPhrases.find((p) => containsWholePhrase(clause, p));
      if (!matchedPhrase) continue;

      if (!rule.inherentAbsenceRule) {
        const negCue = findNegationBeforeOrAround(clause, matchedPhrase);
        if (negCue) {
          negatedMatches.push({
            code: rule.code,
            title: rule.title,
            clauseText: clause,
            negationCue: negCue,
          });
          continue;
        }
      }

      if (clauseUncertain) {
        uncertainMatches.push({
          code: rule.code,
          title: rule.title,
          clauseText: clause,
          clarificationPrompt: `Did the beneficiary actually experience "${rule.title}"? Please confirm Yes or No.`,
        });
        continue;
      }

      if (!seenPositiveCodes.has(rule.code)) {
        seenPositiveCodes.add(rule.code);
        matches.push({
          code: rule.code,
          category: rule.category,
          title: rule.title,
          matchedPhrase,
          clauseText: clause,
          detectionMethod: 'DETERMINISTIC_RULE_ENGINE',
          confidence: 0.96,
          guidelineId: rule.guidelineId,
          guidelineSection: rule.guidelineSection,
          severityCategory: rule.severity,
          detectedAt: analyzedAt,
        });
      }
    }
  }

  let status: DangerSignAnalysis['status'] = 'none_detected';
  if (matches.length > 0) {
    status = 'positive_detected';
  } else if (uncertainMatches.length > 0) {
    status = 'uncertain_pending_safety';
  }

  return {
    status,
    matches,
    negatedMatches,
    uncertainMatches,
    analyzedAt,
  };
}
