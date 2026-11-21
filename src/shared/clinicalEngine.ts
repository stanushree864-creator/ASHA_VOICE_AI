import { detectDangerSigns } from './dangerSigns';
import { getTranslations } from './i18n';
import { getLanguageConfig } from './languages';
import type {
  Beneficiary,
  CorrectionEntry,
  FollowupTask,
  LanguageCode,
  StructuredVisitRecord,
  TranscriptProvenanceSpan,
  VisitType,
} from './types';

export const NATIONAL_IMMUNISATION_SCHEDULE_V2026 = {
  version: 'NIS-2026.03',
  sourceGuidelineId: 'GOI_NIS_2026',
  milestones: [
    { ageLabel: 'At Birth', vaccines: ['BCG', 'OPV-0', 'Hepatitis B (Birth Dose)'] },
    { ageLabel: '6 Weeks', vaccines: ['OPV-1', 'Pentavalent-1', 'RVV-1', 'fIPV-1', 'PCV-1'] },
    { ageLabel: '10 Weeks', vaccines: ['OPV-2', 'Pentavalent-2', 'RVV-2'] },
    { ageLabel: '14 Weeks', vaccines: ['OPV-3', 'Pentavalent-3', 'RVV-3', 'fIPV-2', 'PCV-2'] },
    { ageLabel: '9-12 Months', vaccines: ['MR-1', 'JE-1', 'PCV-Booster', 'Vitamin A-1'] },
    { ageLabel: '16-24 Months', vaccines: ['MR-2', 'JE-2', 'DPT Booster-1', 'OPV Booster'] },
  ],
};

export const SYNTHETIC_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-001',
    beneficiaryCode: 'ASHA00125',
    householdId: 'hh-101',
    householdCode: 'HH-101',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 14, East Lane, Devanahalli',
    displayName: 'Nandini',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1999-05-14',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-002',
    beneficiaryCode: 'ASHA00126',
    householdId: 'hh-102',
    householdCode: 'HH-102',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 22, Temple Road, Devanahalli',
    displayName: 'Lakshmi',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '2001-08-22',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-003',
    beneficiaryCode: 'ASHA00127',
    householdId: 'hh-103',
    householdCode: 'HH-103',
    locality: 'Devanahalli Ward 4',
    syntheticAddress: 'Synthetic House 09, Tank Bund, Devanahalli',
    displayName: 'Baby of Rekha',
    beneficiaryType: 'NEWBORN',
    dateOfBirth: '2026-11-12',
    motherBeneficiaryCode: 'ASHA00120',
    syntheticDataFlag: true,
  },
  {
    id: 'ben-004',
    beneficiaryCode: 'ASHA00128',
    householdId: 'hh-104',
    householdCode: 'HH-104',
    locality: 'Devanahalli Ward 5',
    syntheticAddress: 'Synthetic House 31, School Street, Devanahalli',
    displayName: 'Aarav',
    beneficiaryType: 'CHILD',
    dateOfBirth: '2026-08-15',
    motherBeneficiaryCode: 'ASHA00122',
    syntheticDataFlag: true,
  },
  {
    id: 'ben-005',
    beneficiaryCode: 'ASHA00129',
    householdId: 'hh-105',
    householdCode: 'HH-105',
    locality: 'Devanahalli Ward 5',
    syntheticAddress: 'Synthetic House 05, Market Cross, Devanahalli',
    displayName: 'Kavya',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1997-11-02',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
  {
    id: 'ben-006',
    beneficiaryCode: 'ASHA00130',
    householdId: 'hh-106',
    householdCode: 'HH-106',
    locality: 'Devanahalli Ward 6',
    syntheticAddress: 'Synthetic House 18, Canal Side, Devanahalli',
    displayName: 'Nandini Devi',
    beneficiaryType: 'PREGNANT_WOMAN',
    dateOfBirth: '1998-03-10',
    motherBeneficiaryCode: null,
    syntheticDataFlag: true,
  },
];

export interface BeneficiaryMatchResult {
  status: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';
  matches: Beneficiary[];
}

/**
 * Converts Indic script digits (Devanagari, Kannada, Tamil, Telugu, Malayalam,
 * Bengali/Assamese, Gujarati, Gurmukhi, Odia) into ASCII digits 0-9.
 */
export function normalizeNumerals(input: string): string {
  const digitZeroOffsets = [
    0x0966, // Devanagari (hi, mr)
    0x09e6, // Bengali / Assamese (bn, as)
    0x0a66, // Gurmukhi (pa)
    0x0ae6, // Gujarati (gu)
    0x0b66, // Odia (or)
    0x0be6, // Tamil (ta)
    0x0c66, // Telugu (te)
    0x0ce6, // Kannada (kn)
    0x0d66, // Malayalam (ml)
  ];

  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    let replaced = false;
    for (const zero of digitZeroOffsets) {
      if (code >= zero && code <= zero + 9) {
        out += String(code - zero);
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      out += input[i];
    }
  }
  return out;
}

const ONES_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS_MAP: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * Normalizes common spoken English number words into digits (e.g.
 * "one twenty over eighty" -> "120 over 80", "fifty two" -> "52", "two point eight" -> "2.8").
 */
export function normalizeSpokenNumbers(input: string): string {
  let text = normalizeNumerals(input);

  // "two point eight" -> "2.8" (with digits or single-digit words)
  text = text.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|\d+)\s+(?:point|dot|dashamlav)\s+(zero|one|two|three|four|five|six|seven|eight|nine|\d)\b/gi,
    (_m, a: string, b: string) => {
      const left = ONES_MAP[a.toLowerCase()] ?? a;
      const right = ONES_MAP[b.toLowerCase()] ?? b;
      return `${left}.${right}`;
    },
  );

  // "hundred twenty" / "hundred and twenty" (even without leading "one")
  text = text.replace(
    /\b(?:(one|two)\s+)?hundred(?:\s+and)?\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\s+(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
    (_m, h: string | undefined, t: string, o?: string) => {
      const hundreds = h ? (ONES_MAP[h.toLowerCase()] ?? 1) : 1;
      const val = hundreds * 100 + (TENS_MAP[t.toLowerCase()] ?? 0) + (o ? (ONES_MAP[o.toLowerCase()] ?? 0) : 0);
      return String(val);
    },
  );
  text = text.replace(
    /\b(?:(one|two)\s+)?hundred(?:\s+and)?\s+(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (_m, h: string | undefined, n: string) =>
      String((h ? (ONES_MAP[h.toLowerCase()] ?? 1) : 1) * 100 + (ONES_MAP[n.toLowerCase()] ?? 0)),
  );
  text = text.replace(/\b(one|two)\s+hundred\b/gi, (_m, h: string) => String((ONES_MAP[h.toLowerCase()] ?? 1) * 100));

  // Spoken "one twenty" -> 120 (common Indian English BP phrasing e.g. "one twenty over eighty")
  text = text.replace(
    /\bone\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\s+(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
    (_m, t: string, o?: string) => String(100 + (TENS_MAP[t.toLowerCase()] ?? 0) + (o ? (ONES_MAP[o.toLowerCase()] ?? 0) : 0)),
  );
  text = text.replace(
    /\bone\s+(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi,
    (_m, n: string) => String(100 + (ONES_MAP[n.toLowerCase()] ?? 0)),
  );

  // Tens + ones: "fifty two" -> 52
  text = text.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[-\s]+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (_m, t: string, o: string) => String((TENS_MAP[t.toLowerCase()] ?? 0) + (ONES_MAP[o.toLowerCase()] ?? 0)),
  );

  // Standalone tens: "eighty" -> 80
  text = text.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/gi,
    (m) => String(TENS_MAP[m.toLowerCase()] ?? m),
  );

  // Common Hindi & Kannada spoken number phrases used in BP & weight
  const REGIONAL_NUMBERS: Array<[RegExp, string]> = [
    [/एक\s+सौ\s+चालीस/gu, '140'],
    [/एक\s+सौ\s+तीस/gu, '130'],
    [/एक\s+सौ\s+बीस/gu, '120'],
    [/एक\s+सौ\s+दस/gu, '110'],
    [/एक\s+सौ/gu, '100'],
    [/ನೂರಾ\s+ನಲವತ್ತು/gu, '140'],
    [/ನೂರಾ\s+ಮೂವತ್ತು/gu, '130'],
    [/ನೂರಾ\s+ಇಪ್ಪತ್ತು/gu, '120'],
    [/ನೂರಾ\s+ಹತ್ತು/gu, '110'],
    [/ನೂರು/gu, '100'],
    [/ತೊಂಬತ್ತು/gu, '90'],
    [/ಎಂಬತ್ತು/gu, '80'],
    [/ಎಪ್ಪತ್ತು/gu, '70'],
    [/ಅರವತ್ತು/gu, '60'],
    [/ಐವತ್ತೈದು/gu, '55'],
    [/ಐವತ್ತೆರಡು/gu, '52'],
    [/ಐವತ್ತು/gu, '50'],
    [/ನಲವತ್ತೈದು/gu, '45'],
    [/ನಲವತ್ತು/gu, '40'],
    [/नब्बे/gu, '90'],
    [/अस्सी/gu, '80'],
    [/सत्तर/gu, '70'],
    [/साठ/gu, '60'],
    [/पचपन/gu, '55'],
    [/बावन/gu, '52'],
    [/पचास/gu, '50'],
    [/पैंतालीस/gu, '45'],
    [/चालीस/gu, '40'],
  ];
  for (const [rx, replacement] of REGIONAL_NUMBERS) {
    text = text.replace(rx, replacement);
  }

  // Normalize "5 point 2" where digits were already present
  text = text.replace(/\b(\d+)\s+(?:point|dot)\s+(\d+)\b/gi, '$1.$2');

  return text;
}

const GENERIC_NAME_PARTS = new Set(['baby', 'of', 'devi', 'mother', 'child', 'woman', 'kumari', 'mrs', 'mr']);

export function matchBeneficiary(
  query: string,
  beneficiaries: Beneficiary[] = SYNTHETIC_BENEFICIARIES,
): BeneficiaryMatchResult {
  const normalized = normalizeNumerals(query).trim().toLowerCase();
  if (!normalized) {
    return { status: 'NOT_FOUND', matches: [] };
  }

  // 1. Exact ID match inside spoken query (e.g. "ASHA00125" or "asha 00125")
  const compactQuery = normalized.replace(/\s+/g, '');
  const codeMatches = beneficiaries.filter((b) =>
    compactQuery.includes(b.beneficiaryCode.toLowerCase()),
  );
  if (codeMatches.length === 1) {
    return { status: 'MATCHED', matches: codeMatches };
  }
  if (codeMatches.length > 1) {
    return { status: 'AMBIGUOUS', matches: codeMatches };
  }

  // 2. Name matching — check non-generic name parts so phrases like "don't lift baby weight" never falsely match "Baby of Rekha"
  const partialMatches = beneficiaries.filter((b) => {
    const nameLower = b.displayName.toLowerCase();
    return (
      normalized === nameLower ||
      normalized.includes(nameLower) ||
      nameLower.includes(normalized) ||
      nameLower
        .split(/\s+/)
        .some((part) => part.length >= 3 && !GENERIC_NAME_PARTS.has(part) && normalized.includes(part))
    );
  });

  if (partialMatches.length === 1) {
    return { status: 'MATCHED', matches: partialMatches };
  }
  if (partialMatches.length > 1) {
    return { status: 'AMBIGUOUS', matches: partialMatches };
  }

  return { status: 'NOT_FOUND', matches: [] };
}

const MONTHS_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  जनवरी: '01',
  ಜನವರಿ: '01',
  ஜனவரி: '01',
  జనవరి: '01',
  ജനുവരി: '01',
  जानेवारी: '01',
  জানুয়ারি: '01',
  জানুৱাৰী: '01',
  જાન્યુઆરી: '01',
  ਜਨਵਰੀ: '01',
  ଜାନୁଆରୀ: '01',
  feb: '02',
  february: '02',
  फरवरी: '02',
  ಫೆಬ್ರವರಿ: '02',
  பிப்ரவரி: '02',
  ఫిబ్రవరి: '02',
  ഫെബ്രുവരി: '02',
  फेब्रुवारी: '02',
  ফেব্রুয়ারি: '02',
  ফেব্ৰুৱাৰী: '02',
  ફેબ્રુઆરી: '02',
  ਫਰਵਰੀ: '02',
  ଫେବୃଆରୀ: '02',
  mar: '03',
  march: '03',
  मार्च: '03',
  ಮಾರ್ಚ್: '03',
  மார்ச்: '03',
  మార్చి: '03',
  മാർച്ച്: '03',
  মার্চ: '03',
  মাৰ্চ: '03',
  માર્ચ: '03',
  ਮਾਰਚ: '03',
  ମାର୍ଚ୍ଚ: '03',
  apr: '04',
  april: '04',
  अप्रैल: '04',
  ಏಪ್ರಿಲ್: '04',
  ஏப்ரல்: '04',
  ఏప్రిల్: '04',
  ഏപ്രിൽ: '04',
  एप्रिल: '04',
  এপ্রিল: '04',
  এপ্ৰিল: '04',
  એપ્રિલ: '04',
  ਅਪ੍ਰੈਲ: '04',
  ଅପ୍ରେଲ: '04',
  may: '05',
  मई: '05',
  ಮೇ: '05',
  மே: '05',
  మే: '05',
  മെയ്: '05',
  मे: '05',
  মে: '05',
  મે: '05',
  ਮਈ: '05',
  ମଇ: '05',
  jun: '06',
  june: '06',
  जून: '06',
  ಜೂನ್: '06',
  ஜூன்: '06',
  జూన్: '06',
  ജൂൺ: '06',
  জুন: '06',
  જૂન: '06',
  ਜੂਨ: '06',
  ଜୁନ: '06',
  jul: '07',
  july: '07',
  जुलाई: '07',
  ಜುಲೈ: '07',
  ஜூலை: '07',
  జులై: '07',
  ജൂലൈ: '07',
  जुलै: '07',
  জুলাই: '07',
  જુલાઈ: '07',
  ਜੁਲਾਈ: '07',
  ଜୁଲାଇ: '07',
  aug: '08',
  august: '08',
  अगस्त: '08',
  ಆಗಸ್ಟ್: '08',
  ஆகஸ்ட்: '08',
  ఆగస్టు: '08',
  ഓഗസ്റ്റ്: '08',
  ऑगस्ट: '08',
  আগস্ট: '08',
  আগষ্ট: '08',
  ઓગસ્ટ: '08',
  ਅਗਸਤ: '08',
  ଅଗଷ୍ଟ: '08',
  sep: '09',
  sept: '09',
  september: '09',
  सितंबर: '09',
  ಸೆಪ್ಟೆಂಬರ್: '09',
  செப்டம்பர்: '09',
  సెప్టెంబర్: '09',
  സെപ്റ്റംബർ: '09',
  सप्टेंबर: '09',
  সেপ্টেম্বর: '09',
  ছেপ্টেম্বৰ: '09',
  સપ્ટેમ્બર: '09',
  ਸਤੰਬਰ: '09',
  ସେପ୍ଟେମ୍ବର: '09',
  oct: '10',
  october: '10',
  अक्टूबर: '10',
  ಅಕ್ಟೋಬರ್: '10',
  அக்டோபர்: '10',
  అక్టోబర్: '10',
  ഒക്ടോബർ: '10',
  ऑक्टोबर: '10',
  অক্টোবর: '10',
  অক্টোবৰ: '10',
  ઓક્ટોબર: '10',
  ਅਕਤੂਬਰ: '10',
  ଅକ୍ଟୋବର: '10',
  nov: '11',
  november: '11',
  नवंबर: '11',
  ನವೆಂಬರ್: '11',
  நவம்பர்: '11',
  నవంబర్: '11',
  നവംബർ: '11',
  नोव्हेंबर: '11',
  নভেম্বর: '11',
  নৱেম্বৰ: '11',
  નવેમ્બર: '11',
  ਨਵੰਬਰ: '11',
  ନଭେମ୍ବର: '11',
  dec: '12',
  december: '12',
  दिसंबर: '12',
  ಡಿಸೆಂಬರ್: '12',
  டிசம்பர்: '12',
  డిసెంబర్: '12',
  ഡിസംബർ: '12',
  डिसेंबर: '12',
  ডিসেম্বর: '12',
  ডিচেম্বৰ: '12',
  ડિસેમ્બર: '12',
  ਦਸੰਬਰ: '12',
  ଡିସେମ୍ବର: '12',
};

const MONTH_PATTERN_KEYS = Object.keys(MONTHS_MAP)
  .sort((a, b) => b.length - a.length)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

export function parseSpokenDate(text: string, defaultYear = 2026): string | null {
  const norm = normalizeNumerals(text);

  // ISO YYYY-MM-DD
  const isoMatch = norm.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = norm.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${dmyMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD Month (YYYY)? (supports English + all 11 Indic month names)
  const dmRegex = new RegExp(
    `(?:^|[\\s,:;.(])(\\d{1,2})(?:st|nd|rd|th|ನೇ|तारीख)?\\s+(${MONTH_PATTERN_KEYS})(?:\\s+(20\\d{2}))?(?=$|[\\s,:;.)।])`,
    'i',
  );
  const dmMatch = norm.match(dmRegex);
  if (dmMatch) {
    const dayNum = parseInt(dmMatch[1], 10);
    const month = MONTHS_MAP[dmMatch[2].toLowerCase()];
    const year = dmMatch[3] ?? String(defaultYear);
    if (month && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  // Month DD (YYYY)?
  const mdRegex = new RegExp(
    `(?:^|[\\s,:;.(])(${MONTH_PATTERN_KEYS})\\s+(\\d{1,2})(?:st|nd|rd|th|ನೇ)?(?:,?\\s+(20\\d{2}))?(?=$|[\\s,:;.)।])`,
    'i',
  );
  const mdMatch = norm.match(mdRegex);
  if (mdMatch) {
    const month = MONTHS_MAP[mdMatch[1].toLowerCase()];
    const dayNum = parseInt(mdMatch[2], 10);
    const year = mdMatch[3] ?? String(defaultYear);
    if (month && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  // Relative date expressions (today / tomorrow / next week)
  if (/\b(?:tomorrow|ನಾಳೆ|कल|நாளை|రేపు|നാളെ|उद्या|আগামীকাল|આવતીકાલે|ਕੱਲ੍ਹ|ଆସନ୍ତାକାଲି|কাইলৈ)\b/i.test(norm)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\b(?:next\s+week|ಮುಂದಿನ\s+ವಾರ|अगले\s+हफ्ते)\b/i.test(norm)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function isValidBpPair(systolicStr: string, diastolicStr: string): boolean {
  const sys = parseInt(systolicStr, 10);
  const dia = parseInt(diastolicStr, 10);
  return (
    Number.isFinite(sys) &&
    Number.isFinite(dia) &&
    sys >= 65 &&
    sys <= 260 &&
    dia >= 35 &&
    dia <= 160 &&
    sys > dia
  );
}

const BP_LABEL_PATTERN =
  '(?:b\\.?\\s*p\\.?|beepy|bipi|blood\\s*pressure|systolic|ರಕ್ತದೊತ್ತಡ|ರಕ್ತದ\\s*ಒತ್ತಡ|ಬ್ಲಡ್\\s*ಪ್ರೆಶರ್|ಬಿ\\.?\\s*ಪಿ\\.?|ಬೀ\\.?\\s*ಪಿ\\.?|रक्तचाप|रक्तदाब|ब्लड\\s*प्रेशर|बी\\.?\\s*पी\\.?|રક્તદાબ|બ્લડ\\s*પ્રેશર|બી\\.?\\s*પી\\.?|பி\\.?\\s*பி\\.?|பீ\\.?\\s*பீ\\.?|இரத்த\\s*அழுத்தம்|ரத்த\\s*அழுத்தம்|ப்ளட்\\s*பிரஷர்|బీ\\.?\\s*పీ\\.?|బి\\.?\\s*పి\\.?|రక్తపోటు|బ్లడ్\\s*ప్రెషర్|ബി\\.?\\s*പി\\.?|ബീ\\.?\\s*പി\\.?|രക്തസമ്മർദ്ദം|ബ്ലഡ്\\s*പ്രഷർ|রক্তচাপ|ব্লাড\\s*প্রেসার|বি\\.?\\s*পি\\.?|ਬੀ\\.?\\s*পি\\.?|ਬਲੱਡ\\s*ਪ੍ਰੈਸ਼ਰ|ବି\\.?\\s*ପି\\.?|ରକ୍ତଚାପ|ৰক্তচাপ)';

const BP_RATIO_SEP =
  '(?:\\/|\\s+by\\s+|\\s+over\\s+|\\s+upon\\s+|\\s+to\\s+|\\s+and\\s+|\\s+slash\\s+|\\s+bar\\s+|\\s+oblique\\s+|\\s+under\\s+|\\s+बटा\\s+|\\s+बटे\\s+|\\s+बाई\\s+|\\s+ओवर\\s+|\\s+ಬೈ\\s+|\\s+ಓವರ್\\s+|\\s+ಪೈ\\s+|\\s+பார்\\s+|\\s+బై\\s+|\\s+ഓവർ\\s+|\\s+বাই\\s+|\\s+બાય\\s+|\\s+ਬਾਏ\\s+|\\s+ବାଇ\\s+|\\s*[-–:,.]\\s*|\\s+)';

/**
 * Extracts blood pressure in normalized "SYS/DIA" format across all phrasing styles, STT quirks, & 12 languages.
 * Rejects dates like "28/11" and avoids picking negated values like "not 140/90".
 */
export function extractBloodPressure(text: string): string | null {
  const normalized = normalizeSpokenNumbers(text);
  // Strip negated BP expressions first (e.g. "not 140/90" or "instead of 130 over 85")
  const cleaned = normalized.replace(
    /\b(?:not|instead of|replace)\s+\d{2,3}\s*(?:\/|by|over|upon|to|and|[-–:,]|\s)\s*\d{2,3}/gi,
    '',
  );

  // 1. Explicit BP label (with up to 3 connector words without digits) followed by SYS and DIA
  const labeledRegex = new RegExp(
    `${BP_LABEL_PATTERN}(?:[\\s:=,\\-–]+|[^\\d.;,\\n]{1,22}){0,3}[\\s:=,\\-–]*(\\d{2,3})${BP_RATIO_SEP}(\\d{2,3})(?!\\d)`,
    'giu',
  );
  for (const match of cleaned.matchAll(labeledRegex)) {
    if (isValidBpPair(match[1], match[2])) {
      return `${parseInt(match[1], 10)}/${parseInt(match[2], 10)}`;
    }
  }

  // 1b. Concatenated STT digits right after a BP label (e.g. "BP 12080" -> 120/80, "BP 11876" -> 118/76, "BP 9060" -> 90/60)
  const mergedBpRegex = new RegExp(
    `${BP_LABEL_PATTERN}(?:[\\s:=,\\-–]+|[^\\d.;,\\n]{1,18}){0,2}[\\s:=,\\-–]*(\\d{4,6})(?!\\d)`,
    'giu',
  );
  for (const match of cleaned.matchAll(mergedBpRegex)) {
    const digits = match[1];
    let sys = '';
    let dia = '';
    if (digits.length === 5) {
      sys = digits.slice(0, 3);
      dia = digits.slice(3, 5);
    } else if (digits.length === 4) {
      sys = digits.slice(0, 2);
      dia = digits.slice(2, 4);
    } else if (digits.length === 6) {
      sys = digits.slice(0, 3);
      dia = digits.slice(3, 6);
    }
    if (sys && dia && isValidBpPair(sys, dia) && parseInt(sys, 10) >= 80 && parseInt(dia, 10) >= 45) {
      return `${parseInt(sys, 10)}/${parseInt(dia, 10)}`;
    }
  }

  // 2. Spoken ratio without label: "120 over 80", "118 by 76", "120 upon 80", "120 बटा 80", "120 ಬೈ 80"
  const spokenRatioRegex =
    /\b(\d{2,3})\s*(?:by|over|upon|slash|bar|oblique|बटा|बटे|बाई|ओवर|ಬೈ|ಓವರ್|பார்|బై|ഓവർ|বাই|બાય|ਬਾਏ|ବାଇ)\s*(\d{2,3})\b/giu;
  for (const match of cleaned.matchAll(spokenRatioRegex)) {
    if (isValidBpPair(match[1], match[2])) {
      return `${parseInt(match[1], 10)}/${parseInt(match[2], 10)}`;
    }
  }

  // 3. Slash/dash/colon format anywhere: "118/76", "120 / 80", "120-80" (excluding 3-part dates)
  const slashRegex = /(?:^|[^\d/])(\d{2,3})\s*(?:\/|-|:)\s*(\d{2,3})(?=$|[^\d/])/g;
  for (const match of cleaned.matchAll(slashRegex)) {
    if (isValidBpPair(match[1], match[2])) {
      return `${parseInt(match[1], 10)}/${parseInt(match[2], 10)}`;
    }
  }

  // 4. Standalone clear BP pair without label (e.g. "120 80" or "120, 80") advancing after first number so "age 25, 120 80" never swallows 120
  const standalonePairRegex =
    /(?:^|[^\d.])(\d{2,3})(?:\s*,\s*|\s+)(\d{2,3})(?!\s*(?:kg|kgs|kilo|kilos|gm|gms|grams|weeks|wks|months|days|%|20\d{2}|ಕೆಜಿ|ಕಿಲೋ|किलो|ग्राम|கிலோ|కిలో|കിലോ|কেজি|કિલો|ਕਿਲੋ|କିଲୋ))/giu;
  let pairMatch: RegExpExecArray | null;
  while ((pairMatch = standalonePairRegex.exec(cleaned)) !== null) {
    const sys = parseInt(pairMatch[1], 10);
    const dia = parseInt(pairMatch[2], 10);
    if (sys >= 85 && sys <= 220 && dia >= 45 && dia <= 125 && sys - dia >= 20) {
      return `${sys}/${dia}`;
    }
    standalonePairRegex.lastIndex = pairMatch.index + pairMatch[1].length + 1;
  }

  return null;
}

const WEIGHT_LABEL_PATTERN =
  '(?:birth\\s*weight|mother\\s*weight|baby\\s*weight|child\\s*weight|weight|wt|wajan|vajan|bhara|tuka|thooka|ತೂಕ|ಮಗುವಿನ\\s*ತೂಕ|ವಜನ್|वज़न|वजन|भार|எடை|బరువు|ഭാരം|ওজন|વજન|ਭਾਰ|ਵਜ਼ਨ|ଓଜନ)';

const KG_UNIT_PATTERN =
  '(?:kgs?|kilos?|kilograms?|ಕೆಜಿ|ಕಿಲೋ|ಕಿಲೋಗ್ರಾಂ|किलो|किग्रा|किलोग्राम|கிலோ|కిలో|కిలోలు|కిలోగ్రాము|കിലോ|കിലോഗ്രാം|কেজি|কিলো|કિલો|કિલોગ્રામ|ਕਿਲੋ|ਕਿਲੋਗ੍ਰਾਮ|କିଲୋ|କିଲୋଗ୍ରାମ)';

const GRAM_UNIT_PATTERN =
  '(?:gms?|grams?|ಗ್ರಾಂ|ग्राम|கிராம்|గ్రాము|ഗ്രാം|গ্রাম|ગ્રામ|ਗ੍ਰਾਮ|ଗ୍ରାମ)';

export function extractWeightKg(text: string): number | null {
  const normalized = normalizeSpokenNumbers(text);
  // Handle "not 3.8" correction style: ignore negated numbers first
  const cleaned = normalized.replace(
    new RegExp(`(?:not|instead of|replace|ನೋಟ್|नहीं)\\s+\\d+(?:\\.\\d+)?\\s*(?:${KG_UNIT_PATTERN})?`, 'gi'),
    '',
  );

  // 1. Explicit kg/kilo unit after number anywhere (works across Latin & Indic scripts)
  const withUnitRegex = new RegExp(
    `(?:${WEIGHT_LABEL_PATTERN}(?:\\s+(?:is|was|ide|hai|h))?[\\s:=\\-]*)?(\\d+(?:\\.\\d+)?)\\s*(?:${KG_UNIT_PATTERN})(?=$|[^\\p{L}\\p{M}0-9])`,
    'iu',
  );
  const withUnitMatch = cleaned.match(withUnitRegex);
  if (withUnitMatch) {
    const num = parseFloat(withUnitMatch[1]);
    if (Number.isFinite(num) && num > 0.3 && num < 200) return num;
  }

  // 2. Grams converted to kg when >= 300g (e.g. "2800 grams" -> 2.8 kg)
  const gramRegex = new RegExp(`(\\d{3,4})\\s*(?:${GRAM_UNIT_PATTERN})(?=$|[^\\p{L}\\p{M}0-9])`, 'iu');
  const gramMatch = cleaned.match(gramRegex);
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1]);
    const kg = Math.round((grams / 1000) * 100) / 100;
    if (Number.isFinite(kg) && kg >= 0.3 && kg < 20) return kg;
  }

  // 3. Fallback when worker says "weight 52", "ತೂಕ 54", "वजन 52" without unit (make sure not BP like 120/80 or temp 98.6F)
  const bareWeightRegex = new RegExp(
    `(?:${WEIGHT_LABEL_PATTERN})(?:\\s+(?:is|was|around|approx|ide|hai|h|आहे|हैं|உள்ளது|ఉంది|ആണ്|আছে|છે|ਹੈ|ଅଛି))?[\\s:=\\-]+(\\d{1,3}(?:\\.\\d+)?)(?!\\s*(?:\\/|weeks|week|wks|months|days|°|f\\b|c\\b))`,
    'iu',
  );
  const bareWeightMatch = cleaned.match(bareWeightRegex);
  if (bareWeightMatch) {
    const num = parseFloat(bareWeightMatch[1]);
    if (Number.isFinite(num) && num > 0.3 && num < 200) return num;
  }

  return null;
}

export function inferVisitTypeFromTranscript(
  transcript: string,
  fallbackType: VisitType = 'ANC',
): VisitType {
  const lower = normalizeNumerals(transcript).toLowerCase();
  if (
    /(newborn|baby|infant|neonate|birth weight|breastfeeding|haalu|doodh|magu|shishu|ನವಜಾತ|ಶಿಶು|नवजात|शिशु|பிறந்த குழந்தை|నవజాత|നവജാത|নবজাতক|નવજાત|ਨਵਜੰਮਿਆ|ନବଜାତ)/i.test(
      lower,
    )
  ) {
    return 'NEWBORN';
  }
  if (
    /(immunisation|immunization|bcg|opv|pentavalent|polio|rvv|measles|mr-1|dpt|vaccination due|missed vaccine|ಲಸಿಕೆ|टीका|टिका|लसीकरण|தடுப்பூசி|టీకా|വാക്സിൻ|টিকা|રસી|ਟੀਕਾ|ଟୀକା)/i.test(
      lower,
    ) &&
    !/\banc\b/i.test(lower)
  ) {
    return 'IMMUNISATION';
  }
  if (
    /(anc|pregnant|pregnancy|gestational|ifa|td\b|tt injection|fetal|ಗರ್ಭಿಣಿ|ಗರ್ಭಾವಸ್ಥೆ|गर्भवती|गर्भावस्था|கர்ப்பிணி|గర్భిణీ|ഗർഭിണി|গর্ভবতী|સગર્ભા|ਗਰਭਵਤੀ|ଗର୍ଭବତୀ)/i.test(
      lower,
    ) ||
    extractBloodPressure(transcript) !== null
  ) {
    return 'ANC';
  }
  return fallbackType;
}

/**
 * Deterministic rule-based clinical extractor.
 * Never fabricates missing clinical values (unknowns remain null).
 */
export function extractStructuredVisitDeterministic(params: {
  transcript: string;
  visitType?: VisitType | null;
  language: LanguageCode;
  workerId: string;
  ashaWorkerName?: string | null;
  beneficiaries?: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
  visitDate?: string;
  visitTime?: string;
  clientRequestId?: string;
  extractionSource?: StructuredVisitRecord['extractionSource'];
}): StructuredVisitRecord {
  const {
    transcript,
    language,
    workerId,
    ashaWorkerName = null,
    beneficiaries = SYNTHETIC_BENEFICIARIES,
    selectedBeneficiary = null,
    visitDate = new Date().toISOString().slice(0, 10),
    visitTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    clientRequestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    extractionSource = 'OFFLINE_DETERMINISTIC_PARSER',
  } = params;

  const normTranscript = normalizeSpokenNumbers(transcript);
  const resolvedVisitType =
    params.visitType ?? inferVisitTypeFromTranscript(transcript, 'ANC');
  const lower = normTranscript.toLowerCase();

  let matchedBen = selectedBeneficiary;
  if (!matchedBen) {
    const m = matchBeneficiary(normTranscript, beneficiaries);
    if (m.status === 'MATCHED') {
      matchedBen = m.matches[0];
    }
  }

  const weightKg = extractWeightKg(transcript);
  const nextVisitMatch = normTranscript.match(
    /(?:next\s+(?:visit|checkup|home visit|immunisation|immunization)(?:\s+(?:on|date|is))?|follow\s*-?\s*up(?:\s+(?:on|date))?|ಮುಂದಿನ\s+ಭೇಟಿ(?:\s+ದಿನಾಂಕ)?|अगली\s+भेंट|अगली\s+जांच|அடுத்த\s+வருகை|తదుపరి\s+భేటీ|അടുത്ത\s+സന്ദർശനം|पुढील\s+भेट|পরবর্তী\s+ভিজিট|આગામી\s+મુલાકાત|ਅਗਲਾ\s+ਦੌਰਾ|ପରବର୍ତ୍ତୀ\s+ପରିଦର୍ଶନ)[:\s]+([^.;\n]+)/i,
  );
  const nextVisitDate = nextVisitMatch
    ? parseSpokenDate(nextVisitMatch[1])
    : parseSpokenDate(normTranscript);

  const dangerAnalysis = detectDangerSigns(transcript, resolvedVisitType);
  const referralRequired = dangerAnalysis.status === 'positive_detected';

  const fieldConfidence: Record<string, number> = {
    visitType: params.visitType ? 1.0 : 0.85,
  };
  if (matchedBen) {
    fieldConfidence.beneficiaryId = 0.98;
    fieldConfidence.beneficiaryName = 0.98;
  }
  if (weightKg !== null) {
    fieldConfidence.weightKg = 0.94;
  }
  if (nextVisitDate !== null) {
    fieldConfidence.nextVisitDate = 0.91;
  }

  let pregnancyDetails: StructuredVisitRecord['pregnancyDetails'] = null;
  let newbornDetails: StructuredVisitRecord['newbornDetails'] = null;
  let immunisationDetails: StructuredVisitRecord['immunisationDetails'] = null;

  let fallbackSpokenName: string | null = null;
  if (!matchedBen) {
    const nameMatch = normTranscript.match(
      /(?:patient\s+name|beneficiary\s+name|mother\s+name|name|ರೋಗಿಯ\s+ಹೆಸರು|ಹೆಸರು|मरीज़\s+का\s+नाम|नाम|பெயர்|పేరు|പേര്|नाव|নাম|નામ|ਨਾਮ|ନାମ|নাম)(?:\s+is)?[:\s]+([\p{L}][\p{L}\p{M}\s]{1,36}?)(?=\s*(?:,|\.|weight|bp|b\.?\s*p|blood|condition|gender|baby|vaccine|precaution|advice|next|visit|ತೂಕ|ಬಿಪಿ|ಬೀಪಿ|वजन|बीपी|எடை|பிபி|బరువు|బిపి|బీపీ|ഭാരം|ബിപി|ओजन|ওজন|বিপি|વજન|બીપી|ਭਾਰ|ਬੀਪੀ|ଓଜନ|ବିପି|\d|$))/iu,
    );
    if (nameMatch) {
      fallbackSpokenName = nameMatch[1].trim();
    }
  }

  // Extract spoken Patient Condition (pregnancy condition, baby condition, etc.)
  const explicitCondMatch = normTranscript.match(
    /(?:pregnancy\s+condition|patient\s+condition|baby\s+condition|child\s+condition|condition|ಸ್ಥಿತಿ|स्थिति|நிலை|స్థితి|അവസ്ഥ|स्थिती|অবস্থা|অৱস্থা|સ્થિતિ|ਹਾਲਤ|ଅବସ୍ଥା)(?:\s+is)?[:\s]+([^.;\n]+)/i,
  );
  const inlineCondMatch = normTranscript.match(
    /\b(normal\s+pregnancy|high\s+risk\s+pregnancy|high\s+bp|hypertension|anaemia|anemia|healthy|stable|mild\s+fever|doing\s+well|active\s+and\s+healthy|\d{1,2}\s+(?:weeks|months)\s+pregnant)\b/i,
  );
  const extractedCondition = explicitCondMatch
    ? explicitCondMatch[1]
        .trim()
        .replace(
          /\s*(?:,?\s*(?:precautions?|advice|next\s+visit|ಮುನ್ನೆಚ್ಚರಿಕೆ(?:ಗಳು)?|ಮುಂದಿನ\s+ಭೇಟಿ|सलाह|सावधानी|सावधानियां|अगली\s+भेंट|முன்னெச்சரிக்கை|அடுத்த\s+வருகை|జాగ్రత్తలు|తదుపరి\s+భేటీ|മുൻകരുതൽ|അടുത്ത\s+സന്ദർശനം|काळजी|पुढील\s+भेट|সতর্কতা|সাৱধানতা|পরবর্তী\s+ভিজিট|পৰৱৰ্তী\s+ভ্ৰমণ|સાવચેતી|આગામી\s+મુલાકાત|ਸਾਵਧਾਨੀਆਂ|ਅਗਲਾ\s+ਦੌਰਾ|ସତର୍କତା|ପରବର୍ତ୍ତୀ\s+ପରିଦର୍ଶନ)).*$/i,
          '',
        )
        .replace(/,+$/, '')
        .trim()
    : inlineCondMatch
      ? inlineCondMatch[1].trim()
      : null;

  // Extract spoken Precautions / Advice
  const precautionMatch = normTranscript.match(
    /(?:precautions?|advice|advised|care\s+tips?|ಮುನ್ನೆಚ್ಚರಿಕೆ(?:ಗಳು)?|सलाह|सावधानी|सावधानियां|முன்னெச்சரிக்கை|జాగ్రత్తలు|മുൻകരുതൽ|काळजी|সতর্কতা|সাৱধানতা|સાવચેતી|ਸਾਵਧਾਨੀਆਂ|ସତର୍କତା)(?:\s+given|\s+is|\s+are)?[:\s]+([^.;\n]+)/i,
  );
  const extractedPrecautions = precautionMatch
    ? precautionMatch[1]
        .trim()
        .replace(
          /\s*(?:,?\s*(?:next\s+visit|ಮುಂದಿನ\s+ಭೇಟಿ|अगली\s+भेंट|அடுத்த\s+வருகை|తదుపరి\s+భేటీ|അടുത്ത\s+സന്ദർശനം|पुढील\s+भेट|পরবর্তী\s+ভিজিট|পৰৱৰ্তী\s+ভ্ৰমণ|આગામી\s+મુલાકાત|ਅਗਲਾ\s+ਦੌਰਾ|ପରବର୍ତ୍ତୀ\s+ପରିଦର୍ଶନ)).*$/i,
          '',
        )
        .replace(/,+$/, '')
        .trim()
    : null;

  if (resolvedVisitType === 'ANC') {
    const extractedBp = extractBloodPressure(transcript);
    if (extractedBp) {
      fieldConfidence.bloodPressure = 0.95;
    }
    const weeksMatch = normTranscript.match(/(\d{1,2})\s*(?:weeks|week|wks|ವಾರ|सप्ताह|हफ्ते|வாரங்கள்|వారాలు|ആഴ്ച)/i);
    const hasIfaTaking =
      /(ifa|iron|folic|ಐಎಫ್‌ಎ|आईएफए|आयरन).*(taking|regular|togondiddare|togotiddare|kha rahi|supplied|completed|ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದಾರೆ|ले रही|खा रही|சாப்பிடுகிறார்|తీసుకుంటున్నారు)/i.test(
        lower,
      ) || /\b(ifa goli taking|regular aagi togondiddare)\b/i.test(lower);
    const hasIfaNotTaking = /(not taking ifa|ifa illa|ifa nahi|ಐಎಫ್‌ಎ.*ಇಲ್ಲ|आयरन.*नहीं)/i.test(lower);
    const hasTtDone =
      /(tt|td|ಟಿಟಿ|ಟಿಡಿ|टीटी|टीडी|டீடி).*(complete|completed|given|taken|agide|aagide|done|hogide|ನೀಡಲಾಗಿದೆ|लगा|दिया|கொடுக்கப்பட்டது|ఇవ్వబడింది)/i.test(
        lower,
      );
    const hasAncDone =
      /(anc|ತಪಾಸಣೆ|जांच|जाँच|ಪರಿಶೀಲನೆ|பரிசோதனை|పరీక్ష).*(complete|completed|done|agide|madidvi|checked|ಮುಗಿದಿದೆ|पूर्ण|हो गई|நிறைவு|పూర్తయింది)/i.test(
        lower,
      );

    pregnancyDetails = {
      gestationalAgeWeeks: weeksMatch ? parseInt(weeksMatch[1], 10) : null,
      ancStatus: hasAncDone ? 'completed' : null,
      weightKg,
      bloodPressure: extractedBp,
      pregnancyCondition:
        extractedCondition ??
        (weeksMatch ? `${weeksMatch[1]} weeks pregnant` : hasAncDone ? 'Normal checkup' : null),
      ifaStatus: hasIfaNotTaking ? 'not_taking' : hasIfaTaking ? 'reported_taking' : null,
      vaccinationStatus: hasTtDone ? 'reported_completed' : null,
      tdDose: hasTtDone ? 'TT/Td reported' : null,
      reportedSymptoms:
        dangerAnalysis.matches.length > 0
          ? dangerAnalysis.matches.map((m) => m.title).join('; ')
          : null,
    };
  } else if (resolvedVisitType === 'NEWBORN') {
    const feedingGood =
      /(feeding properly|feeding well|breastfeeding well|suckling well|haalu chennagi|ಹಾಲು ಚೆನ್ನಾಗಿ|दूध पी रहा|दूध पी रही|நன்றாக பால்|పాలు బాగా|നന്നായി പാൽ)/i.test(
        lower,
      );
    const feedingPoor =
      /(not feeding|poor feeding|unable to feed|inability to feed|refusing feed|kudiyutilla|ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ|दूध नहीं पी|பால் குடிக்கவில்லை|పాలు తాగడం లేదు)/i.test(
        lower,
      );
    const immunChecked = /(vaccination record checked|immunisation checked|vaccine checked|ಲಸಿಕೆ.*ಪರಿಶೀಲಿಸಲಾಗಿದೆ|टीका.*जांच|தடுப்பூசி.*சரிபார்க்கப்பட்டது)/i.test(
      lower,
    );
    const tempMatch = normTranscript.match(/\b(\d{2,3}(?:\.\d)?\s*(?:°?\s*[fc]|fahrenheit|celsius))\b/i);
    const isGirl = /(girl|female|daughter|baby girl|magalu|beti|ಹೆಣ್ಣು|लड़की|बेटी|பெண்|ఆడపిల్ల|പെൺകുട്ടി|मुलगी|মেয়ে|છોકરી|ਕੁੜੀ|ଝିଅ)/i.test(
      lower,
    );
    const isBoy = /(boy|male|son|baby boy|maga|beta|ಗಂಡು|लड़का|बेटा|ஆண்|మగపిల్లవాడు|ആൺകുട്ടി|मुलगा|ছেলে|છોકરો|ਮੁੰਡਾ|ପୁଅ)/i.test(
      lower,
    );
    const babyGender: 'Girl' | 'Boy' | null = isGirl ? 'Girl' : isBoy ? 'Boy' : null;
    const isBirthWeight = /(birth weight|janma bhara|janam wajan|ಜನ್ಮ\s*ತೂಕ|जन्म\s*वज़न)/i.test(lower);

    newbornDetails = {
      newbornId: matchedBen?.beneficiaryCode ?? null,
      motherBeneficiaryId: matchedBen?.motherBeneficiaryCode ?? null,
      birthDate: matchedBen?.dateOfBirth ?? null,
      ageDays: null,
      birthWeightKg: isBirthWeight ? weightKg : null,
      currentWeightKg: !isBirthWeight ? weightKg : null,
      babyGender,
      babyCondition:
        extractedCondition ??
        (feedingPoor ? 'Poor feeding' : feedingGood ? 'Healthy, feeding well' : null),
      feedingObservations: feedingPoor
        ? 'Not feeding / poor feeding reported'
        : feedingGood
          ? 'Feeding properly'
          : null,
      reportedTemperature: tempMatch ? tempMatch[1] : null,
      immunisationChecked: immunChecked ? true : null,
    };
  } else if (resolvedVisitType === 'IMMUNISATION') {
    const vaccineTokens = [
      'BCG',
      'OPV-0',
      'OPV-1',
      'OPV-2',
      'OPV-3',
      'OPV',
      'Pentavalent-1',
      'Pentavalent-2',
      'Pentavalent-3',
      'Pentavalent',
      'RVV-1',
      'RVV-2',
      'fIPV-1',
      'PCV-1',
      'MR-1',
      'MR-2',
      'JE-1',
      'DPT',
    ];
    const vaccinesGiven: string[] = [];
    const vaccinesDue: string[] = [];
    const clauses = normTranscript
      .split(/[.;\n।]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const clause of clauses) {
      const clauseHasDue = /(due|pending|missed|next|ಬಾಕಿ|बाकी|நிலுவை|పెండింగ్)/i.test(clause);
      const clauseHasGiven = /(given|administered|completed|done|taken|ನೀಡಲಾಗಿದೆ|दिया|लगा|கொடுக்கப்பட்டது|ఇవ్వబడింది)/i.test(
        clause,
      );

      for (const v of vaccineTokens) {
        if (
          (v === 'OPV' && /\bOPV[-\s]?\d\b/i.test(clause)) ||
          (v === 'Pentavalent' && /\bPentavalent[-\s]?\d\b/i.test(clause))
        ) {
          continue;
        }
        // Match either "OPV-1" or "OPV 1"
        const flexiblePattern = v.replace('-', '[-\\s]?');
        const vRegex = new RegExp(`\\b${flexiblePattern}\\b`, 'i');
        if (vRegex.test(clause)) {
          if (clauseHasDue && !clauseHasGiven) {
            if (!vaccinesDue.includes(v)) vaccinesDue.push(v);
          } else {
            if (!vaccinesGiven.includes(v)) vaccinesGiven.push(v);
          }
        }
      }
    }

    immunisationDetails = {
      childAgeLabel: null,
      childWeightKg: weightKg,
      childCondition: extractedCondition,
      vaccinesGiven,
      vaccinesDue,
      missedVaccines: [],
      previousVaccineHistory: null,
      scheduleVersion: NATIONAL_IMMUNISATION_SCHEDULE_V2026.version,
    };
  }

  return {
    clientRequestId,
    beneficiaryId: matchedBen?.beneficiaryCode ?? null,
    beneficiaryName: matchedBen?.displayName ?? fallbackSpokenName ?? null,
    householdId: matchedBen?.householdCode ?? null,
    workerId,
    ashaWorkerName,
    visitType: resolvedVisitType,
    visitDate,
    visitTime,
    language,
    detectedLanguages: [language === 'en' ? 'English' : language],
    observations: transcript.trim(),
    patientCondition:
      extractedCondition ??
      pregnancyDetails?.pregnancyCondition ??
      newbornDetails?.babyCondition ??
      immunisationDetails?.childCondition ??
      null,
    precautions: extractedPrecautions,
    pregnancyDetails,
    newbornDetails,
    immunisationDetails,
    nextVisitDate,
    dangerSignStatus: dangerAnalysis.status,
    dangerAnalysis,
    referralStatus: referralRequired ? 'immediate_phc_required' : 'not_required',
    confirmationStatus: referralRequired ? 'emergency_unconfirmed' : 'pending_confirmation',
    sourceTranscript: transcript.trim(),
    extractionSource,
    fieldConfidence,
    originalUtterances: {
      fullTranscript: transcript.trim(),
    },
    correctionHistory: [],
  };
}

export interface VoiceCorrectionOutcome {
  action: 'REPEAT_RECORD' | 'UPDATED_FIELD' | 'CONFIRM_SAVE' | 'NEEDS_CLARIFICATION';
  updatedField: string | null;
  updatedRecord: StructuredVisitRecord;
  spokenFeedback: string;
}

/**
 * Applies a natural-language voice correction while preserving all other confirmed fields.
 * Supports all visit types, vitals (BP, weight), dates, gender, vaccines, conditions & precautions.
 */
export function applyVoiceCorrection(
  record: StructuredVisitRecord,
  correctionText: string,
  beneficiaries: Beneficiary[] = SYNTHETIC_BENEFICIARIES,
): VoiceCorrectionOutcome {
  const rb = getTranslations(record.language).readback;
  const formT = getTranslations(record.language).form;
  const lower = normalizeSpokenNumbers(correctionText).trim().toLowerCase();
  const nowIso = new Date().toISOString();

  if (
    /(yes|save|confirm|correct|ok save|houdhu|haan|aama|avunu|ಹೌದು|ಉಳಿಸಿ|हाँ|सेव|ஆம்|சேமி|అవును|సేవ్|അതെ|സേവ്|हो|सेव्ह|হ্যাঁ|সংরক্ষণ|હા|સાચવો|ਹਾਂ|ਸੇਵ|ହଁ|ସେଭ୍|হয়)/i.test(
      lower,
    ) &&
    !/\bno\b/i.test(lower)
  ) {
    return {
      action: 'CONFIRM_SAVE',
      updatedField: null,
      updatedRecord: {
        ...record,
        confirmationStatus: 'confirmed',
      },
      spokenFeedback: rb.confirmedSaving,
    };
  }

  if (
    /(repeat|read again|say again|listen again|matte heli|dobara|ಮತ್ತೆ ಹೇಳಿ|दोबारा|மீண்டும்|మళ్లీ|വീണ്ടും|पुन्हा|আবার|ફરી|ਦੁਬਾਰਾ|ପୁଣି|আকৌ)/i.test(
      lower,
    )
  ) {
    return {
      action: 'REPEAT_RECORD',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: buildReadBackScript(record, record.language),
    };
  }

  const nextRecord: StructuredVisitRecord = structuredClone(record);
  const addCorrection = (fieldName: string, prev: string | null, next: string | null) => {
    const entry: CorrectionEntry = {
      fieldName,
      previousValue: prev,
      correctedValue: next,
      correctionSource: 'VOICE_CORRECTION',
      correctedAt: nowIso,
    };
    nextRecord.correctionHistory.push(entry);
  };

  // 1. Blood Pressure correction (checked early when BP phrasing/slash appears)
  const newBp = extractBloodPressure(correctionText);
  const mentionsBp = new RegExp(BP_LABEL_PATTERN, 'iu').test(correctionText);
  if (newBp !== null) {
    if (!nextRecord.pregnancyDetails && nextRecord.visitType === 'ANC') {
      nextRecord.pregnancyDetails = {
        gestationalAgeWeeks: null,
        ancStatus: null,
        weightKg: null,
        bloodPressure: null,
        ifaStatus: null,
        vaccinationStatus: null,
        tdDose: null,
        reportedSymptoms: null,
      };
    }
    if (nextRecord.pregnancyDetails) {
      const prev = nextRecord.pregnancyDetails.bloodPressure;
      nextRecord.pregnancyDetails.bloodPressure = newBp;
      nextRecord.fieldConfidence.bloodPressure = 0.99;
      addCorrection('bloodPressure', prev, newBp);
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'bloodPressure',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(rb.bp, newBp),
      };
    }
  }

  // 2. Weight correction (supports ANC, NEWBORN, and IMMUNISATION)
  const newWeight = extractWeightKg(correctionText);
  const mentionsWeight = new RegExp(WEIGHT_LABEL_PATTERN, 'iu').test(correctionText);
  if (newWeight !== null) {
    if (nextRecord.visitType === 'ANC' && nextRecord.pregnancyDetails) {
      const prev = nextRecord.pregnancyDetails.weightKg;
      nextRecord.pregnancyDetails.weightKg = newWeight;
      nextRecord.fieldConfidence.weightKg = 0.99;
      addCorrection('weightKg', prev !== null ? String(prev) : null, String(newWeight));
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'weightKg',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(rb.weight, `${newWeight} ${rb.kilograms}`),
      };
    }
    if (nextRecord.visitType === 'NEWBORN' && nextRecord.newbornDetails) {
      const prev = nextRecord.newbornDetails.currentWeightKg;
      nextRecord.newbornDetails.currentWeightKg = newWeight;
      nextRecord.fieldConfidence.weightKg = 0.99;
      addCorrection('currentWeightKg', prev !== null ? String(prev) : null, String(newWeight));
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'currentWeightKg',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(rb.babyWeight, `${newWeight} ${rb.kilograms}`),
      };
    }
    if (nextRecord.visitType === 'IMMUNISATION' && nextRecord.immunisationDetails) {
      const prev = nextRecord.immunisationDetails.childWeightKg ?? null;
      nextRecord.immunisationDetails.childWeightKg = newWeight;
      nextRecord.fieldConfidence.weightKg = 0.99;
      addCorrection('childWeightKg', prev !== null ? String(prev) : null, String(newWeight));
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'childWeightKg',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(rb.weight, `${newWeight} ${rb.kilograms}`),
      };
    }
  }

  // 3. Next visit date correction
  const newDate = parseSpokenDate(correctionText);
  const mentionsDate =
    /(next visit|date|follow ?up|ಮುಂದಿನ\s+ಭೇಟಿ|ದಿನಾಂಕ|अगली\s+भेंट|तारीख|அடுத்த\s+வருகை|తదుపరి\s+భేటీ|അടുത്ത\s+സന്ദർശനം|पुढील\s+भेट|পরবর্তী\s+ভিজিট|આગામી\s+મુલાકાત|ਅਗਲਾ\s+ਦੌਰਾ|ପରବର୍ତ୍ତୀ\s+ପରିଦର୍ଶନ)/i.test(
      lower,
    );
  if (newDate !== null) {
    const prev = nextRecord.nextVisitDate;
    nextRecord.nextVisitDate = newDate;
    nextRecord.fieldConfidence.nextVisitDate = 0.99;
    addCorrection('nextVisitDate', prev, newDate);
    return {
      action: 'UPDATED_FIELD',
      updatedField: 'nextVisitDate',
      updatedRecord: nextRecord,
      spokenFeedback: rb.updatedFieldPrompt(rb.nextVisit, newDate),
    };
  }

  // 4. Baby Gender correction (Newborn)
  if (nextRecord.visitType === 'NEWBORN' && nextRecord.newbornDetails) {
    const isGirl =
      /(girl|female|daughter|ಹೆಣ್ಣು|लड़की|பெண்|ఆడపిల్ల|പെൺകുട്ടി|मुलगी|মেয়ে|છોકરી|ਕੁੜੀ|ଝିଅ)/i.test(
        lower,
      );
    const isBoy =
      /(boy|male|son|ಗಂಡು|लड़का|ஆண்|మగపిల్లవాడు|ആൺകുട്ടി|मुलगा|ছেলে|છોકરો|ਮੁੰਡਾ|ପୁଅ)/i.test(
        lower,
      );
    if (isGirl || isBoy) {
      const val: 'Girl' | 'Boy' = isGirl ? 'Girl' : 'Boy';
      const prev = nextRecord.newbornDetails.babyGender ?? null;
      nextRecord.newbornDetails.babyGender = val;
      addCorrection('babyGender', prev, val);
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'babyGender',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(formT.babyGender, val === 'Girl' ? formT.girl : formT.boy),
      };
    }
  }

  // 5. Condition / Precautions correction
  const condMatch = correctionText.match(
    /(?:condition|ಸ್ಥಿತಿ|स्थिति|நிலை|స్థితి|അവസ്ഥ|स्थिती|অবস্থা|অৱস্থা|સ્થિતિ|ਹਾਲਤ|ଅବସ୍ଥା)[:\s]+([^.;\n]+)/i,
  );
  if (condMatch) {
    const newCond = condMatch[1].trim();
    const prev = nextRecord.patientCondition ?? null;
    nextRecord.patientCondition = newCond;
    if (nextRecord.pregnancyDetails) nextRecord.pregnancyDetails.pregnancyCondition = newCond;
    if (nextRecord.newbornDetails) nextRecord.newbornDetails.babyCondition = newCond;
    if (nextRecord.immunisationDetails) nextRecord.immunisationDetails.childCondition = newCond;
    addCorrection('patientCondition', prev, newCond);
    return {
      action: 'UPDATED_FIELD',
      updatedField: 'patientCondition',
      updatedRecord: nextRecord,
      spokenFeedback: rb.updatedFieldPrompt(rb.condition, newCond),
    };
  }

  const precMatch = correctionText.match(
    /(?:precautions?|advice|ಮುನ್ನೆಚ್ಚರಿಕೆ(?:ಗಳು)?|सलाह|सावधानी|सावधानियां|முன்னெச்சரிக்கை|జాగ్రత్తలు|മുൻകരുതൽ|काळजी|সতর্কতা|সাৱধানতা|સાવચેતી|ਸਾਵਧਾਨੀਆਂ|ସତର୍କତା)[:\s]+([^.;\n]+)/i,
  );
  if (precMatch) {
    const newPrec = precMatch[1].trim();
    const prev = nextRecord.precautions ?? null;
    nextRecord.precautions = newPrec;
    addCorrection('precautions', prev, newPrec);
    return {
      action: 'UPDATED_FIELD',
      updatedField: 'precautions',
      updatedRecord: nextRecord,
      spokenFeedback: rb.updatedFieldPrompt(rb.precautions, newPrec),
    };
  }

  // 6. Beneficiary ID / name correction
  if (/(beneficiary|id|name|asha0|ಹೆಸರು|नाम|பெயர்|పేరు|പേര്|नाव|নাম|નામ|ਨਾਮ|ନାମ)/i.test(lower)) {
    const match = matchBeneficiary(correctionText, beneficiaries);
    if (match.status === 'MATCHED') {
      const ben = match.matches[0];
      const prev = `${nextRecord.beneficiaryId ?? ''} ${nextRecord.beneficiaryName ?? ''}`.trim();
      nextRecord.beneficiaryId = ben.beneficiaryCode;
      nextRecord.beneficiaryName = ben.displayName;
      nextRecord.householdId = ben.householdCode;
      addCorrection('beneficiaryId', prev || null, `${ben.beneficiaryCode} (${ben.displayName})`);
      return {
        action: 'UPDATED_FIELD',
        updatedField: 'beneficiaryId',
        updatedRecord: nextRecord,
        spokenFeedback: rb.updatedFieldPrompt(rb.beneficiaryName, `${ben.displayName} (${ben.beneficiaryCode})`),
      };
    }
  }

  // 7. Re-check danger signs if correction mentions symptoms
  const dangerReCheck = detectDangerSigns(correctionText, nextRecord.visitType);
  if (dangerReCheck.status === 'positive_detected') {
    nextRecord.dangerSignStatus = 'positive_detected';
    nextRecord.dangerAnalysis = dangerReCheck;
    nextRecord.referralStatus = 'immediate_phc_required';
    return {
      action: 'UPDATED_FIELD',
      updatedField: 'dangerSignStatus',
      updatedRecord: nextRecord,
      spokenFeedback: getLanguageConfig(nextRecord.language).emergencyAnnouncement,
    };
  }

  if (mentionsBp) {
    return {
      action: 'NEEDS_CLARIFICATION',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: rb.askBp,
    };
  }
  if (mentionsWeight) {
    return {
      action: 'NEEDS_CLARIFICATION',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: rb.askWeight,
    };
  }
  if (mentionsDate) {
    return {
      action: 'NEEDS_CLARIFICATION',
      updatedField: null,
      updatedRecord: record,
      spokenFeedback: rb.askDate,
    };
  }

  return {
    action: 'NEEDS_CLARIFICATION',
    updatedField: null,
    updatedRecord: record,
    spokenFeedback: rb.askClarification,
  };
}

export function buildReadBackScript(
  record: StructuredVisitRecord,
  language: LanguageCode,
): string {
  const langCfg = getLanguageConfig(language);
  const t = getTranslations(language);
  const rb = t.readback;
  const parts: string[] = [];

  if (record.dangerSignStatus === 'positive_detected') {
    return langCfg.emergencyAnnouncement;
  }

  parts.push(rb.intro);
  if (record.beneficiaryName) parts.push(`${rb.beneficiaryName}: ${record.beneficiaryName}.`);
  if (record.beneficiaryId) parts.push(`${rb.beneficiaryId}: ${record.beneficiaryId}.`);

  const visitLabel =
    record.visitType === 'ANC'
      ? t.dashboard.pregnancyVisit
      : record.visitType === 'NEWBORN'
        ? t.dashboard.newbornCare
        : t.dashboard.vaccination;
  parts.push(`${rb.visitType}: ${visitLabel}.`);

  if (record.visitType === 'ANC' && record.pregnancyDetails) {
    if (record.pregnancyDetails.weightKg !== null) {
      parts.push(`${rb.weight}: ${record.pregnancyDetails.weightKg} ${rb.kilograms}.`);
    }
    if (record.pregnancyDetails.bloodPressure) {
      parts.push(`${rb.bp}: ${record.pregnancyDetails.bloodPressure}.`);
    }
    if (record.pregnancyDetails.ifaStatus) {
      parts.push(`${rb.ifa}: ${record.pregnancyDetails.ifaStatus.replace(/_/g, ' ')}.`);
    }
    if (record.pregnancyDetails.vaccinationStatus) {
      parts.push(`${rb.vaccination}: ${record.pregnancyDetails.vaccinationStatus.replace(/_/g, ' ')}.`);
    }
  }

  if (record.visitType === 'NEWBORN' && record.newbornDetails) {
    const wt = record.newbornDetails.currentWeightKg ?? record.newbornDetails.birthWeightKg;
    if (wt !== null) parts.push(`${rb.babyWeight}: ${wt} ${rb.kilograms}.`);
    if (record.newbornDetails.feedingObservations) {
      parts.push(`${rb.feeding}: ${record.newbornDetails.feedingObservations}.`);
    }
    if (record.newbornDetails.immunisationChecked) {
      parts.push(rb.immChecked);
    }
  }

  if (record.visitType === 'IMMUNISATION' && record.immunisationDetails) {
    if (record.immunisationDetails.childWeightKg !== null && record.immunisationDetails.childWeightKg !== undefined) {
      parts.push(`${rb.weight}: ${record.immunisationDetails.childWeightKg} ${rb.kilograms}.`);
    }
    if (record.immunisationDetails.vaccinesGiven.length > 0) {
      parts.push(`${rb.vaccinesGiven}: ${record.immunisationDetails.vaccinesGiven.join(', ')}.`);
    }
    if (record.immunisationDetails.vaccinesDue.length > 0) {
      parts.push(`${rb.vaccinesDue}: ${record.immunisationDetails.vaccinesDue.join(', ')}.`);
    }
  }

  if (record.patientCondition) {
    parts.push(`${rb.condition}: ${record.patientCondition}.`);
  }
  if (record.precautions) {
    parts.push(`${rb.precautions}: ${record.precautions}.`);
  }
  if (record.nextVisitDate) {
    parts.push(`${rb.nextVisit}: ${record.nextVisitDate}.`);
  }

  parts.push(langCfg.savePromptTemplate);
  return parts.join(' ');
}

export function generateFollowUpsFromRecord(
  visitId: string,
  record: StructuredVisitRecord,
): Omit<FollowupTask, 'id' | 'createdAt'>[] {
  const tasks: Omit<FollowupTask, 'id' | 'createdAt'>[] = [];
  const benId = record.beneficiaryId ?? 'UNASSIGNED';

  if (record.dangerSignStatus === 'positive_detected') {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Immediate PHC referral follow-up for detected danger sign: ${record.dangerAnalysis.matches
        .map((m) => m.title)
        .join(', ')}`,
      priority: 'IMMEDIATE_REFERRAL',
      dueDate: record.visitDate,
      taskStatus: 'PENDING',
    });
  }

  if (record.nextVisitDate) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Scheduled ${record.visitType} follow-up visit confirmed by ASHA worker.`,
      priority: 'SCHEDULED_VISIT',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  } else {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: 'Next visit date not yet confirmed — collect date with beneficiary.',
      priority: 'PENDING_INFORMATION',
      dueDate: null,
      taskStatus: 'PENDING',
    });
  }

  if (record.visitType === 'ANC' && record.pregnancyDetails) {
    if (!record.pregnancyDetails.bloodPressure) {
      tasks.push({
        visitId,
        beneficiaryId: benId,
        beneficiaryName: record.beneficiaryName ?? undefined,
        beneficiaryCode: record.beneficiaryId ?? undefined,
        taskDescription: 'Track reported ANC follow-up status and blood pressure check at ANM/PHC.',
        priority: 'ROUTINE_FOLLOWUP',
        dueDate: record.nextVisitDate,
        taskStatus: 'PENDING',
      });
    }
    if (record.pregnancyDetails.vaccinationStatus) {
      tasks.push({
        visitId,
        beneficiaryId: benId,
        beneficiaryName: record.beneficiaryName ?? undefined,
        beneficiaryCode: record.beneficiaryId ?? undefined,
        taskDescription: `Review recorded Td/TT vaccination status (${record.pregnancyDetails.vaccinationStatus.replace(/_/g, ' ')}).`,
        priority: 'ROUTINE_FOLLOWUP',
        dueDate: record.nextVisitDate,
        taskStatus: 'PENDING',
      });
    }
  }

  if (record.visitType === 'NEWBORN' && record.newbornDetails) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: 'Check newborn immunisation follow-up and weight progression.',
      priority: 'ROUTINE_FOLLOWUP',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  }

  if (
    record.visitType === 'IMMUNISATION' &&
    record.immunisationDetails &&
    record.immunisationDetails.vaccinesDue.length > 0
  ) {
    tasks.push({
      visitId,
      beneficiaryId: benId,
      beneficiaryName: record.beneficiaryName ?? undefined,
      beneficiaryCode: record.beneficiaryId ?? undefined,
      taskDescription: `Administer due vaccines per ${record.immunisationDetails.scheduleVersion}: ${record.immunisationDetails.vaccinesDue.join(', ')}`,
      priority: 'SCHEDULED_VISIT',
      dueDate: record.nextVisitDate,
      taskStatus: 'PENDING',
    });
  }

  return tasks;
}

/**
 * Computes exact substring provenance spans inside the transcript for interactive DOM binding
 * between extracted clinical fields and source spoken utterances.
 */
export function computeFieldProvenanceSpans(
  transcript: string,
  record: StructuredVisitRecord | null,
): TranscriptProvenanceSpan[] {
  if (!transcript || !record) return [];

  const spans: TranscriptProvenanceSpan[] = [];
  const lower = transcript.toLowerCase();

  const tryAdd = (fieldName: string, label: string, regex: RegExp, confidence = 0.92) => {
    const m = transcript.match(regex);
    if (!m || m.index === undefined) return;
    const startIndex = m.index;
    const endIndex = startIndex + m[0].length;
    spans.push({
      fieldName,
      label,
      matchedText: m[0],
      startIndex,
      endIndex,
      confidence,
    });
  };

  if (record.beneficiaryId) {
    const esc = record.beneficiaryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    tryAdd('beneficiaryId', 'Beneficiary ID', new RegExp(esc, 'i'), record.fieldConfidence.beneficiaryId ?? 0.98);
  }
  if (record.beneficiaryName) {
    const esc = record.beneficiaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    tryAdd('beneficiaryName', 'Beneficiary Name', new RegExp(esc, 'i'), record.fieldConfidence.beneficiaryName ?? 0.96);
  }

  const wt =
    record.pregnancyDetails?.weightKg ??
    record.newbornDetails?.currentWeightKg ??
    record.newbornDetails?.birthWeightKg ??
    record.immunisationDetails?.childWeightKg;
  if (wt !== null && wt !== undefined) {
    const wtEsc = String(wt).replace('.', '\\.');
    const wtField =
      record.visitType === 'NEWBORN'
        ? 'currentWeightKg'
        : record.visitType === 'IMMUNISATION'
          ? 'childWeightKg'
          : 'weightKg';
    tryAdd(
      wtField,
      'Weight',
      new RegExp(`(?:${WEIGHT_LABEL_PATTERN}(?:\\s+is)?[\\s:=]*)?${wtEsc}(?:\\s*(?:${KG_UNIT_PATTERN}))?`, 'iu'),
      record.fieldConfidence.weightKg ?? 0.94,
    );
  }

  if (record.pregnancyDetails?.bloodPressure) {
    const [sys, dia] = record.pregnancyDetails.bloodPressure.split('/');
    if (sys && dia) {
      tryAdd(
        'bloodPressure',
        'Blood Pressure',
        new RegExp(
          `(?:${BP_LABEL_PATTERN}(?:[\\s:=,\\-]+|[^\\d.;,\\n]{1,18}){0,2})?(?:\\b${sys}${BP_RATIO_SEP}${dia}\\b|\\b${sys}${dia}\\b)`,
          'iu',
        ),
        record.fieldConfidence.bloodPressure ?? 0.94,
      );
    }
  }

  if (record.pregnancyDetails?.ifaStatus) {
    tryAdd(
      'ifaStatus',
      'IFA Tablets',
      /\b(?:ifa|iron|folic)(?:\s+goli|\s+tablets)?(?:\s+(?:taking|regular(?:\s+aagi)?(?:\s+togondiddare)?|not taking|illa|nahi))?/i,
      0.91,
    );
  }

  if (record.pregnancyDetails?.vaccinationStatus) {
    tryAdd(
      'vaccinationStatus',
      'Td/TT Vaccine',
      /\b(?:tt|td)(?:\s+injection)?(?:\s+(?:complete(?:\s+agide)?|completed|given|taken|done))?/i,
      0.9,
    );
  }

  if (record.newbornDetails?.feedingObservations) {
    tryAdd(
      'feedingObservations',
      'Feeding',
      /\b(?:baby\s+is\s+)?(?:feeding\s+properly|feeding\s+well|breastfeeding\s+well|not\s+feeding|poor\s+feeding|unable\s+to\s+feed)\b/i,
      0.92,
    );
  }

  if (record.newbornDetails?.immunisationChecked) {
    tryAdd(
      'immunisationChecked',
      'Immunisation Record',
      /\b(?:vaccination\s+record\s+checked|immunisation\s+checked|vaccine\s+checked)\b/i,
      0.92,
    );
  }

  if (record.immunisationDetails) {
    for (const v of record.immunisationDetails.vaccinesGiven) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('vaccinesGiven', 'Vaccine Given', new RegExp(`\\b${esc}\\b`, 'i'), 0.95);
    }
    for (const v of record.immunisationDetails.vaccinesDue) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('vaccinesDue', 'Vaccine Due', new RegExp(`\\b${esc}\\b`, 'i'), 0.93);
    }
  }

  if (record.precautions) {
    const fullEsc = record.precautions
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    tryAdd('precautions', 'Precautions', new RegExp(fullEsc, 'iu'), 0.9);
  }

  if (record.nextVisitDate) {
    tryAdd(
      'nextVisitDate',
      'Next Visit Date',
      /(?:next\s+(?:visit|checkup|home visit|immunisation)(?:\s+(?:on|date|is))?|follow\s*-?\s*up(?:\s+(?:on|date))?|ಮುಂದಿನ\s+ಭೇಟಿ(?:\s+ದಿನಾಂಕ)?|अगली\s+भेंट|अगली\s+जांच|அடுத்த\s+வருகை|తదుపరి\s+భేటీ|അടുത്ത\s+സന്ദർശനം|पुढील\s+भेट|পরবর্তী\s+ভিজিট|આગામી\s+મુલાકાત|ਅਗਲਾ\s+ਦੌਰਾ|ପରବର୍ତ୍ତୀ\s+ପରିଦର୍ଶନ)[:\s]+\d{1,2}(?:st|nd|rd|th|ನೇ)?\s+[^\s,.;]+(?:\s+\d{4})?|\b20\d{2}-\d{1,2}-\d{1,2}\b/i,
      record.fieldConfidence.nextVisitDate ?? 0.91,
    );
  }

  for (const match of record.dangerAnalysis.matches) {
    if (match.matchedPhrase && lower.includes(match.matchedPhrase.toLowerCase())) {
      const esc = match.matchedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tryAdd('dangerSignStatus', `Danger Sign: ${match.title}`, new RegExp(esc, 'i'), match.confidence);
    }
  }

  // Sort by position and remove overlaps so DOM rendering stays clean and non-duplicated
  spans.sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const nonOverlapping: TranscriptProvenanceSpan[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.startIndex >= cursor) {
      nonOverlapping.push(s);
      cursor = s.endIndex;
    }
  }
  return nonOverlapping;
}
