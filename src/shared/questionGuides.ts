import type { LanguageCode, StructuredVisitRecord, VisitType } from './types';

export interface QuestionGuideItem {
  id: string;
  visitType: VisitType;
  categoryLabel: string;
  question: string;
  hint: string;
  mappedField: string;
  spokenPrompt: string;
  matchKeywords: string[];
  isAnswered: (record: StructuredVisitRecord | null, transcript: string) => boolean;
}

export interface LocalizedQuestionText {
  categoryLabel: string;
  question: string;
  hint: string;
  spokenPrompt: string;
}

export const QUESTION_GUIDES: QuestionGuideItem[] = [
  // Pregnancy & ANC
  {
    id: 'anc-ben',
    visitType: 'ANC',
    categoryLabel: 'Identification',
    question: 'Confirm pregnant woman name and ASHA beneficiary ID',
    hint: 'Speak name or ID (e.g. Nandini ASHA00125)',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please state the pregnant woman name and beneficiary ID.',
    matchKeywords: ['asha', 'nandini', 'lakshmi', 'kavya', 'beneficiary', 'name', 'ಹೆಸರು', 'नाम'],
    isAnswered: (r) => Boolean(r?.beneficiaryId || r?.beneficiaryName),
  },
  {
    id: 'anc-checkup',
    visitType: 'ANC',
    categoryLabel: 'ANC Checkup',
    question: 'Record ANC checkup status and pregnancy weeks',
    hint: 'Example: ANC checkup completed, 24 weeks pregnant',
    mappedField: 'ancStatus',
    spokenPrompt: 'Was the antenatal checkup completed today and how many weeks pregnant?',
    matchKeywords: ['anc', 'checkup', 'weeks', 'gestational', 'pregnant', 'ಗರ್ಭಿಣಿ', 'जांच'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.ancStatus || r?.pregnancyDetails?.gestationalAgeWeeks),
  },
  {
    id: 'anc-weight',
    visitType: 'ANC',
    categoryLabel: 'Weight',
    question: 'Record mother weight in kilograms',
    hint: 'Example: Weight 52 kg',
    mappedField: 'weightKg',
    spokenPrompt: 'What is the mother current weight in kilograms?',
    matchKeywords: ['weight', 'kilo', 'kg', 'wajan', 'ತೂಕ', 'वजन', 'எடை', 'బరువు'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.weightKg !== null && r?.pregnancyDetails?.weightKg !== undefined),
  },
  {
    id: 'anc-bp',
    visitType: 'ANC',
    categoryLabel: 'Blood Pressure',
    question: 'Record blood pressure reading (mmHg)',
    hint: 'Example: BP 118/76 or BP 120 over 80',
    mappedField: 'bloodPressure',
    spokenPrompt: 'What is the mother blood pressure reading?',
    matchKeywords: ['bp', 'blood pressure', 'ಬಿಪಿ', 'ರಕ್ತದೊತ್ತಡ', 'बीपी', 'பிபி', 'బీపీ'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.bloodPressure),
  },
  {
    id: 'anc-ifa-td',
    visitType: 'ANC',
    categoryLabel: 'Supplements & Vaccine',
    question: 'Check IFA tablets intake and Td/TT vaccine',
    hint: 'Example: IFA taking regularly, TT completed',
    mappedField: 'ifaStatus',
    spokenPrompt: 'Is she taking iron folic acid tablets regularly and has she received Td vaccine?',
    matchKeywords: ['ifa', 'iron', 'folic', 'goli', 'tt', 'td', 'vaccine'],
    isAnswered: (r) => Boolean(r?.pregnancyDetails?.ifaStatus || r?.pregnancyDetails?.vaccinationStatus),
  },
  {
    id: 'anc-danger',
    visitType: 'ANC',
    categoryLabel: 'Safety Screening',
    question: 'Screen for bleeding, severe headache, swelling, fever, or fits',
    hint: 'Say presence or absence (e.g. no bleeding)',
    mappedField: 'dangerSignStatus',
    spokenPrompt: 'Does she have any bleeding, severe headache, blurred vision, high fever, or fits?',
    matchKeywords: ['bleeding', 'fever', 'headache', 'swelling', 'convulsion', 'seizure', 'blur'],
    isAnswered: (r, t) =>
      Boolean(
        r &&
          (r.dangerSignStatus !== 'none_detected' ||
            r.dangerAnalysis.negatedMatches.length > 0 ||
            /(no bleeding|bleeding illa|no danger|normal|fine|stable|theek|ಸರಿಯಾಗಿದೆ|ठीक|நலம்|బాగుంది)/i.test(t)),
      ),
  },
  {
    id: 'anc-next-date',
    visitType: 'ANC',
    categoryLabel: 'Follow-up',
    question: 'Confirm next ANC visit date',
    hint: 'Example: Next visit 28 November',
    mappedField: 'nextVisitDate',
    spokenPrompt: 'When is the next scheduled antenatal visit date?',
    matchKeywords: ['next visit', 'follow up', 'november', 'december', 'january'],
    isAnswered: (r) => Boolean(r?.nextVisitDate),
  },

  // Newborn Care (HBNC)
  {
    id: 'nb-ben',
    visitType: 'NEWBORN',
    categoryLabel: 'Identification',
    question: 'Confirm newborn ID and mother name',
    hint: 'Example: ASHA00127 Baby of Rekha',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please confirm the newborn beneficiary ID and mother name.',
    matchKeywords: ['baby', 'newborn', 'asha', 'rekha'],
    isAnswered: (r) => Boolean(r?.beneficiaryId || r?.beneficiaryName),
  },
  {
    id: 'nb-weight',
    visitType: 'NEWBORN',
    categoryLabel: 'Weight',
    question: 'Record newborn current weight (or birth weight) in kg',
    hint: 'Example: Baby weight 2.8 kg',
    mappedField: 'currentWeightKg',
    spokenPrompt: 'What is the newborn baby current weight in kilograms?',
    matchKeywords: ['weight', 'kilo', 'kg', 'birth weight', 'ತೂಕ', 'वजन'],
    isAnswered: (r) =>
      Boolean(r?.newbornDetails?.currentWeightKg !== null && r?.newbornDetails?.currentWeightKg !== undefined) ||
      Boolean(r?.newbornDetails?.birthWeightKg !== null && r?.newbornDetails?.birthWeightKg !== undefined),
  },
  {
    id: 'nb-feeding',
    visitType: 'NEWBORN',
    categoryLabel: 'Feeding',
    question: 'Check breastfeeding attachment and feeding status',
    hint: 'Example: Baby is feeding properly',
    mappedField: 'feedingObservations',
    spokenPrompt: 'Is the newborn breastfeeding well and feeding regularly?',
    matchKeywords: ['feeding', 'breastfeeding', 'haalu', 'milk', 'suckling'],
    isAnswered: (r) => Boolean(r?.newbornDetails?.feedingObservations),
  },
  {
    id: 'nb-danger',
    visitType: 'NEWBORN',
    categoryLabel: 'Newborn Safety',
    question: 'Check temperature, fast breathing, lethargy, or poor feeding',
    hint: 'Fever or poor feeding triggers immediate PHC alert',
    mappedField: 'dangerSignStatus',
    spokenPrompt: 'Check if the baby has fever, cold skin, fast breathing, or inability to feed.',
    matchKeywords: ['fever', 'temperature', 'breathing', 'cord', 'lethargic', 'not feeding'],
    isAnswered: (r, t) =>
      Boolean(
        r &&
          (r.dangerSignStatus !== 'none_detected' ||
            r.dangerAnalysis.negatedMatches.length > 0 ||
            Boolean(r.newbornDetails?.reportedTemperature) ||
            /(no fever|normal temperature|active|healthy|theek|ಸರಿಯಾಗಿದೆ|ठीक|நலம்)/i.test(t)),
      ),
  },
  {
    id: 'nb-imm',
    visitType: 'NEWBORN',
    categoryLabel: 'Birth Vaccines',
    question: 'Verify BCG, OPV-0, and Hep-B birth dose card',
    hint: 'Example: Vaccination record checked',
    mappedField: 'immunisationChecked',
    spokenPrompt: 'Have you checked the newborn birth vaccination record card?',
    matchKeywords: ['vaccination', 'immunisation', 'bcg', 'opv', 'card'],
    isAnswered: (r) => r?.newbornDetails?.immunisationChecked === true,
  },

  // Child Immunisation
  {
    id: 'imm-ben',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Child Identity',
    question: 'Confirm child beneficiary ID and name',
    hint: 'Example: Aarav ASHA00128',
    mappedField: 'beneficiaryId',
    spokenPrompt: 'Please state the child name and beneficiary ID.',
    matchKeywords: ['aarav', 'child', 'asha'],
    isAnswered: (r) => Boolean(r?.beneficiaryId || r?.beneficiaryName),
  },
  {
    id: 'imm-weight',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Child Weight',
    question: 'Record child weight in kilograms',
    hint: 'Example: Weight 6.4 kg',
    mappedField: 'childWeightKg',
    spokenPrompt: 'What is the child current weight in kilograms?',
    matchKeywords: ['weight', 'kilo', 'kg', 'ತೂಕ', 'वजन'],
    isAnswered: (r) => Boolean(r?.immunisationDetails?.childWeightKg !== null && r?.immunisationDetails?.childWeightKg !== undefined),
  },
  {
    id: 'imm-given',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Vaccines Given',
    question: 'Record vaccines administered today (BCG, OPV, Penta, RVV, PCV, MR)',
    hint: 'Example: OPV-1 and Pentavalent-1 given today',
    mappedField: 'vaccinesGiven',
    spokenPrompt: 'Which vaccines were given to the child today?',
    matchKeywords: ['given', 'administered', 'bcg', 'opv', 'pentavalent', 'pcv', 'rvv', 'mr'],
    isAnswered: (r) => Boolean(r?.immunisationDetails && r.immunisationDetails.vaccinesGiven.length > 0),
  },
  {
    id: 'imm-due',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Due / Missed',
    question: 'Note vaccines due or missed per NIS schedule',
    hint: 'Example: PCV-1 due',
    mappedField: 'vaccinesDue',
    spokenPrompt: 'Are any vaccines due or missed according to the schedule?',
    matchKeywords: ['due', 'missed', 'pending', 'pcv', 'schedule'],
    isAnswered: (r) =>
      Boolean(
        r?.immunisationDetails &&
          (r.immunisationDetails.vaccinesDue.length > 0 || r.immunisationDetails.missedVaccines.length > 0),
      ),
  },
  {
    id: 'imm-next',
    visitType: 'IMMUNISATION',
    categoryLabel: 'Next Session',
    question: 'Confirm next immunisation session date',
    hint: 'Example: Next visit 18 December',
    mappedField: 'nextVisitDate',
    spokenPrompt: 'When is the child next scheduled immunisation visit?',
    matchKeywords: ['next visit', 'december', 'january', 'session'],
    isAnswered: (r) => Boolean(r?.nextVisitDate),
  },
];

type QuestionTranslationMap = Record<string, LocalizedQuestionText>;

export const QUESTION_TRANSLATIONS: Partial<Record<LanguageCode, QuestionTranslationMap>> = {
  kn: {
    'anc-ben': {
      categoryLabel: 'ಗುರುತಿಸುವಿಕೆ',
      question: 'ಗರ್ಭಿಣಿಯ ಹೆಸರು ಮತ್ತು ಆಶಾ ಐಡಿ ದೃಢೀಕರಿಸಿ',
      hint: 'ಉದಾ: ನಂದಿನಿ ASHA00125',
      spokenPrompt: 'ದಯವಿಟ್ಟು ಗರ್ಭಿಣಿಯ ಹೆಸರು ಮತ್ತು ಆಶಾ ಫಲಾನುಭವಿ ಐಡಿ ಹೇಳಿ.',
    },
    'anc-checkup': {
      categoryLabel: 'ANC ತಪಾಸಣೆ',
      question: 'ANC ತಪಾಸಣೆ ಮತ್ತು ಗರ್ಭಾವಸ್ಥೆಯ ವಾರಗಳನ್ನು ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: ANC ತಪಾಸಣೆ ಮುಗಿದಿದೆ, 24 ವಾರ',
      spokenPrompt: 'ಇಂದು ANC ತಪಾಸಣೆ ಪೂರ್ಣಗೊಂಡಿದೆಯೇ ಮತ್ತು ಎಷ್ಟು ವಾರದ ಗರ್ಭಿಣಿ?',
    },
    'anc-weight': {
      categoryLabel: 'ತೂಕ',
      question: 'ತಾಯಿಯ ತೂಕವನ್ನು ಕೆಜಿಯಲ್ಲಿ ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: ತೂಕ 52 ಕೆಜಿ',
      spokenPrompt: 'ತಾಯಿಯ ಪ್ರಸ್ತುತ ತೂಕ ಎಷ್ಟು ಕಿಲೋಗ್ರಾಂ ಇದೆ?',
    },
    'anc-bp': {
      categoryLabel: 'ರಕ್ತದೊತ್ತಡ (BP)',
      question: 'ರಕ್ತದೊತ್ತಡ (BP) ಮೌಲ್ಯವನ್ನು ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: ಬಿಪಿ 118/76 ಅಥವಾ 120 ಬೈ 80',
      spokenPrompt: 'ತಾಯಿಯ ರಕ್ತದೊತ್ತಡ ಅಥವಾ ಬಿಪಿ ಎಷ್ಟಿದೆ?',
    },
    'anc-ifa-td': {
      categoryLabel: 'ಮಾತ್ರೆ ಮತ್ತು ಲಸಿಕೆ',
      question: 'IFA ಮಾತ್ರೆ ಸೇವನೆ ಮತ್ತು Td/TT ಲಸಿಕೆ ಪರಿಶೀಲಿಸಿ',
      hint: 'ಉದಾ: IFA ಮಾತ್ರೆ ನಿಯಮಿತ, TT ಲಸಿಕೆ ಮುಗಿದಿದೆ',
      spokenPrompt: 'IFA ಮಾತ್ರೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದಾರೆಯೇ ಮತ್ತು Td ಲಸಿಕೆ ಆಗಿದೆಯೇ?',
    },
    'anc-danger': {
      categoryLabel: 'ಸುರಕ್ಷತಾ ತಪಾಸಣೆ',
      question: 'ರಕ್ತಸ್ರಾವ, ತೀವ್ರ ತಲೆನೋವು, ಊತ, ಜ್ವರ ಅಥವಾ ಸೆಳೆತ ಪರೀಕ್ಷಿಸಿ',
      hint: 'ಉದಾ: ರಕ್ತಸ್ರಾವ ಇಲ್ಲ',
      spokenPrompt: 'ರಕ್ತಸ್ರಾವ, ತೀವ್ರ ತಲೆನೋವು, ಜ್ವರ ಅಥವಾ ಫಿಟ್ಸ್ ಇದೆಯೇ ಎಂದು ಕೇಳಿ.',
    },
    'anc-next-date': {
      categoryLabel: 'ಮುಂದಿನ ಭೇಟಿ',
      question: 'ಮುಂದಿನ ANC ಭೇಟಿ ದಿನಾಂಕ ದೃಢೀಕರಿಸಿ',
      hint: 'ಉದಾ: ಮುಂದಿನ ಭೇಟಿ 28 ನವೆಂಬರ್',
      spokenPrompt: 'ಮುಂದಿನ ANC ಭೇಟಿ ದಿನಾಂಕ ಯಾವಾಗ?',
    },
    'nb-ben': {
      categoryLabel: 'ಗುರುತಿಸುವಿಕೆ',
      question: 'ನವಜಾತ ಶಿಶು ಐಡಿ ಮತ್ತು ತಾಯಿಯ ಹೆಸರು ದೃಢೀಕರಿಸಿ',
      hint: 'ಉದಾ: ASHA00127 ರೇಖಾ ಮಗು',
      spokenPrompt: 'ನವಜಾತ ಶಿಶುವಿನ ಐಡಿ ಮತ್ತು ತಾಯಿಯ ಹೆಸರನ್ನು ಹೇಳಿ.',
    },
    'nb-weight': {
      categoryLabel: 'ತೂಕ',
      question: 'ಶಿಶುವಿನ ಪ್ರಸ್ತುತ ತೂಕ (ಅಥವಾ ಜನ್ಮ ತೂಕ) ಕೆಜಿಯಲ್ಲಿ ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: ಮಗುವಿನ ತೂಕ 2.8 ಕೆಜಿ',
      spokenPrompt: 'ನವಜಾತ ಶಿಶುವಿನ ಪ್ರಸ್ತುತ ತೂಕ ಎಷ್ಟು ಕೆಜಿ ಇದೆ?',
    },
    'nb-feeding': {
      categoryLabel: 'ಹಾಲುಣಿಸುವಿಕೆ',
      question: 'ತಾಯಿ ಹಾಲು ಕುಡಿಯುವ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ',
      hint: 'ಉದಾ: ಮಗು ಚೆನ್ನಾಗಿ ಹಾಲು ಕುಡಿಯುತ್ತಿದೆ',
      spokenPrompt: 'ಮಗು ಸರಿಯಾಗಿ ಎದೆಹಾಲು ಕುಡಿಯುತ್ತಿದೆಯೇ?',
    },
    'nb-danger': {
      categoryLabel: 'ಶಿಶು ಸುರಕ್ಷತೆ',
      question: 'ಜ್ವರ, ಉಸಿರಾಟದ ತೊಂದರೆ, ಆಲಸ್ಯ ಅಥವಾ ಹಾಲು ಕುಡಿಯದಿರುವುದು ಪರೀಕ್ಷಿಸಿ',
      hint: 'ಜ್ವರ ಅಥವಾ ಹಾಲು ಕುಡಿಯದಿದ್ದರೆ ತಕ್ಷಣ PHC ಎಚ್ಚರಿಕೆ',
      spokenPrompt: 'ಮಗುವಿಗೆ ಜ್ವರ, ವೇಗದ ಉಸಿರಾಟ ಅಥವಾ ಹಾಲು ಕುಡಿಯದಿರುವ ತೊಂದರೆ ಇದೆಯೇ?',
    },
    'nb-imm': {
      categoryLabel: 'ಜನ್ಮ ಲಸಿಕೆಗಳು',
      question: 'BCG, OPV-0 ಮತ್ತು Hep-B ಕಾರ್ಡ್ ಪರಿಶೀಲಿಸಿ',
      hint: 'ಉದಾ: ಲಸಿಕೆ ದಾಖಲೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
      spokenPrompt: 'ನವಜಾತ ಶಿಶುವಿನ ಲಸಿಕೆ ಕಾರ್ಡ್ ಪರಿಶೀಲಿಸಿದ್ದೀರಾ?',
    },
    'imm-ben': {
      categoryLabel: 'ಮಗುವಿನ ಗುರುತು',
      question: 'ಮಗುವಿನ ಹೆಸರು ಮತ್ತು ಫಲಾನುಭವಿ ಐಡಿ ದೃಢೀಕರಿಸಿ',
      hint: 'ಉದಾ: ಆರವ್ ASHA00128',
      spokenPrompt: 'ಮಗುವಿನ ಹೆಸರು ಮತ್ತು ಐಡಿ ಹೇಳಿ.',
    },
    'imm-weight': {
      categoryLabel: 'ಮಗುವಿನ ತೂಕ',
      question: 'ಮಗುವಿನ ತೂಕವನ್ನು ಕೆಜಿಯಲ್ಲಿ ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: ತೂಕ 6.4 ಕೆಜಿ',
      spokenPrompt: 'ಮಗುವಿನ ಪ್ರಸ್ತುತ ತೂಕ ಎಷ್ಟು ಕೆಜಿ ಇದೆ?',
    },
    'imm-given': {
      categoryLabel: 'ನೀಡಿದ ಲಸಿಕೆಗಳು',
      question: 'ಇಂದು ನೀಡಿದ ಲಸಿಕೆಗಳನ್ನು ದಾಖಲಿಸಿ',
      hint: 'ಉದಾ: OPV-1 ಮತ್ತು Pentavalent-1 ನೀಡಲಾಗಿದೆ',
      spokenPrompt: 'ಇಂದು ಮಗುವಿಗೆ ಯಾವ ಲಸಿಕೆಗಳನ್ನು ನೀಡಲಾಗಿದೆ?',
    },
    'imm-due': {
      categoryLabel: 'ಬಾಕಿ ಲಸಿಕೆಗಳು',
      question: 'ಬಾಕಿ ಅಥವಾ ತಪ್ಪಿದ ಲಸಿಕೆಗಳನ್ನು ಗುರುತಿಸಿ',
      hint: 'ಉದಾ: PCV-1 ಬಾಕಿ ಇದೆ',
      spokenPrompt: 'ಯಾವುದೇ ಲಸಿಕೆ ಬಾಕಿ ಇದೆಯೇ?',
    },
    'imm-next': {
      categoryLabel: 'ಮುಂದಿನ ಅವಧಿ',
      question: 'ಮುಂದಿನ ಲಸಿಕೆ ದಿನಾಂಕ ದೃಢೀಕರಿಸಿ',
      hint: 'ಉದಾ: ಮುಂದಿನ ಭೇಟಿ 18 ಡಿಸೆಂಬರ್',
      spokenPrompt: 'ಮುಂದಿನ ಲಸಿಕೆ ಭೇಟಿ ದಿನಾಂಕ ಯಾವಾಗ?',
    },
  },
  hi: {
    'anc-ben': {
      categoryLabel: 'पहचान',
      question: 'गर्भवती महिला का नाम और आशा आईडी दर्ज करें',
      hint: 'उदा: नंदिनी ASHA00125',
      spokenPrompt: 'कृपया गर्भवती महिला का नाम और आशा आईडी बताएं।',
    },
    'anc-checkup': {
      categoryLabel: 'ANC जाँच',
      question: 'ANC जाँच और गर्भावस्था के सप्ताह दर्ज करें',
      hint: 'उदा: ANC जाँच पूर्ण, 24 सप्ताह',
      spokenPrompt: 'क्या आज ANC जाँच पूरी हुई और गर्भावस्था कितने सप्ताह की है?',
    },
    'anc-weight': {
      categoryLabel: 'वज़न',
      question: 'माता का वज़न किलो में दर्ज करें',
      hint: 'उदा: वज़न 52 किलो',
      spokenPrompt: 'माता का वर्तमान वज़न कितने किलोग्राम है?',
    },
    'anc-bp': {
      categoryLabel: 'बीपी (BP)',
      question: 'ब्लड प्रेशर (BP) दर्ज करें',
      hint: 'उदा: बीपी 118/76 या 120 बटे 80',
      spokenPrompt: 'माता का ब्लड प्रेशर कितना है?',
    },
    'anc-ifa-td': {
      categoryLabel: 'गोली और टीका',
      question: 'IFA गोली और Td/TT टीके की स्थिति जाँचें',
      hint: 'उदा: IFA नियमित, TT टीका लगा',
      spokenPrompt: 'क्या वह नियमित आयरन गोली ले रही हैं और Td टीका लगा है?',
    },
    'anc-danger': {
      categoryLabel: 'सुरक्षा जाँच',
      question: 'रक्तस्राव, तेज़ सिरदर्द, सूजन, बुखार या दौरे जाँचें',
      hint: 'उदा: कोई रक्तस्राव नहीं',
      spokenPrompt: 'पूछें कि क्या रक्तस्राव, तेज़ सिरदर्द, धुंधला दिखना, बुखार या दौरे हैं?',
    },
    'anc-next-date': {
      categoryLabel: 'अगली भेंट',
      question: 'अगली ANC भेंट की तारीख पक्की करें',
      hint: 'उदा: अगली भेंट 28 नवंबर',
      spokenPrompt: 'अगली जांच की तारीख क्या है?',
    },
    'nb-ben': {
      categoryLabel: 'पहचान',
      question: 'नवजात शिशु आईडी और माता का नाम दर्ज करें',
      hint: 'उदा: ASHA00127 रेखा का शिशु',
      spokenPrompt: 'नवजात शिशु की आईडी और माता का नाम बताएं।',
    },
    'nb-weight': {
      categoryLabel: 'वज़न',
      question: 'नवजात का वर्तमान या जन्म वज़न किलो में दर्ज करें',
      hint: 'उदा: वज़न 2.8 किलो',
      spokenPrompt: 'नवजात शिशु का वर्तमान वज़न कितने किलो है?',
    },
    'nb-feeding': {
      categoryLabel: 'स्तनपान',
      question: 'स्तनपान और दूध पीने की स्थिति जाँचें',
      hint: 'उदा: शिशु ठीक से दूध पी रहा है',
      spokenPrompt: 'क्या नवजात शिशु ठीक से स्तनपान कर रहा है?',
    },
    'nb-danger': {
      categoryLabel: 'शिशु सुरक्षा',
      question: 'बुखार, तेज़ सांस, सुस्ती या दूध न पीना जाँचें',
      hint: 'तेज़ बुखार या दूध न पीने पर तुरंत PHC अलर्ट',
      spokenPrompt: 'जाँचें कि शिशु को बुखार, तेज़ सांस या दूध न पीने की समस्या तो नहीं है।',
    },
    'nb-imm': {
      categoryLabel: 'जन्म टीके',
      question: 'BCG, OPV-0 और Hep-B कार्ड जाँचें',
      hint: 'उदा: टीकाकरण रिकॉर्ड जाँचा गया',
      spokenPrompt: 'क्या आपने शिशु का जन्म टीकाकरण कार्ड जाँचा?',
    },
    'imm-ben': {
      categoryLabel: 'पहचान',
      question: 'बच्चे का नाम और आईडी दर्ज करें',
      hint: 'उदा: आरव ASHA00128',
      spokenPrompt: 'कृपया बच्चे का नाम और आईडी बताएं।',
    },
    'imm-weight': {
      categoryLabel: 'वज़न',
      question: 'बच्चे का वज़न किलो में दर्ज करें',
      hint: 'उदा: वज़न 6.4 किलो',
      spokenPrompt: 'बच्चे का वर्तमान वज़न कितने किलो है?',
    },
    'imm-given': {
      categoryLabel: 'दिए गए टीके',
      question: 'आज दिए गए टीके दर्ज करें (BCG, OPV, Penta, PCV, MR)',
      hint: 'उदा: आज OPV-1 और Pentavalent-1 दिया',
      spokenPrompt: 'आज बच्चे को कौन से टीके लगाए गए?',
    },
    'imm-due': {
      categoryLabel: 'बाकी टीके',
      question: 'बाकी या छूटे हुए टीके दर्ज करें',
      hint: 'उदा: PCV-1 बाकी है',
      spokenPrompt: 'क्या कोई टीका बाकी या छूटा हुआ है?',
    },
    'imm-next': {
      categoryLabel: 'अगला टीका',
      question: 'अगले टीकाकरण की तारीख दर्ज करें',
      hint: 'उदा: अगली भेंट 18 दिसंबर',
      spokenPrompt: 'अगले टीकाकरण की तारीख क्या है?',
    },
  },
  ta: {
    'anc-ben': { categoryLabel: 'அடையாளம்', question: 'கர்ப்பிணி பெயர் மற்றும் ஆஷா ஐடி உறுதிப்படுத்துக', hint: 'உ.ம்: நந்தினி ASHA00125', spokenPrompt: 'கர்ப்பிணி பெயர் மற்றும் ஐடியை சொல்லவும்.' },
    'anc-checkup': { categoryLabel: 'பரிசோதனை', question: 'ANC பரிசோதனை மற்றும் கர்ப்ப வாரங்களை பதிவு செய்க', hint: 'உ.ம்: ANC முடிந்தது, 24 வாரம்', spokenPrompt: 'ANC பரிசோதனை முடிந்ததா மற்றும் எத்தனை வாரங்கள்?' },
    'anc-weight': { categoryLabel: 'எடை', question: 'தாயின் எடையை கிலோவில் பதிவு செய்க', hint: 'உ.ம்: எடை 52 கிலோ', spokenPrompt: 'தாயின் எடை எத்தனை கிலோ?' },
    'anc-bp': { categoryLabel: 'ரத்த அழுத்தம்', question: 'ரத்த அழுத்தம் (BP) பதிவு செய்க', hint: 'உ.ம்: பிபி 118/76', spokenPrompt: 'தாயின் பிபி அளவு என்ன?' },
    'anc-ifa-td': { categoryLabel: 'மாத்திரை & தடுப்பூசி', question: 'IFA மாத்திரை மற்றும் Td தடுப்பூசி சரிபார்க்கவும்', hint: 'உ.ம்: IFA எடுக்கிறார், TT முடிந்தது', spokenPrompt: 'இரும்புச்சத்து மாத்திரை மற்றும் Td ஊசி போடப்பட்டதா?' },
    'anc-danger': { categoryLabel: 'பாதுகாப்பு', question: 'ரத்தப்போக்கு, தலைவலி, காய்ச்சல், வலிப்பு சரிபார்க்கவும்', hint: 'உ.ம்: ரத்தப்போக்கு இல்லை', spokenPrompt: 'ரத்தப்போக்கு, கடுமையான தலைவலி அல்லது காய்ச்சல் உள்ளதா?' },
    'anc-next-date': { categoryLabel: 'அடுத்த வருகை', question: 'அடுத்த ANC வருகை தேதியை உறுதி செய்க', hint: 'உ.ம்: அடுத்த வருகை 28 நவம்பர்', spokenPrompt: 'அடுத்த வருகை தேதி என்ன?' },
    'nb-weight': { categoryLabel: 'எடை', question: 'குழந்தையின் எடையை கிலோவில் பதிவு செய்க', hint: 'உ.ம்: எடை 2.8 கிலோ', spokenPrompt: 'குழந்தையின் எடை எத்தனை கிலோ?' },
    'imm-weight': { categoryLabel: 'குழந்தை எடை', question: 'குழந்தையின் எடையை கிலோவில் பதிவு செய்க', hint: 'உ.ம்: எடை 6.4 கிலோ', spokenPrompt: 'குழந்தையின் எடை எத்தனை கிலோ?' },
  },
  te: {
    'anc-ben': { categoryLabel: 'గుర్తింపు', question: 'గర్భిణీ పేరు మరియు ఆశా ఐడి నిర్ధారించండి', hint: 'ఉదా: నందిని ASHA00125', spokenPrompt: 'గర్భిణీ పేరు మరియు ఐడి చెప్పండి.' },
    'anc-checkup': { categoryLabel: 'ANC పరీక్ష', question: 'ANC పరీక్ష మరియు గర్భధారణ వారాలు నమోదు చేయండి', hint: 'ఉదా: ANC పూర్తయింది, 24 వారాలు', spokenPrompt: 'ANC పరీక్ష జరిగిందా మరియు ఎన్ని వారాలు?' },
    'anc-weight': { categoryLabel: 'బరువు', question: 'తల్లి బరువు కిలోలలో నమోదు చేయండి', hint: 'ఉదా: బరువు 52 కిలోలు', spokenPrompt: 'తల్లి ప్రస్తుత బరువు ఎన్ని కిలోలు?' },
    'anc-bp': { categoryLabel: 'బీపీ (BP)', question: 'రక్తపోటు (BP) నమోదు చేయండి', hint: 'ఉదా: బీపీ 118/76', spokenPrompt: 'తల్లి బీపీ ఎంత ఉంది?' },
    'anc-ifa-td': { categoryLabel: 'మాత్రలు & టీకా', question: 'IFA మాత్రలు మరియు Td టీకా తనిఖీ చేయండి', hint: 'ఉదా: IFA వేసుకుంటున్నారు, TT పూర్తయింది', spokenPrompt: 'IFA మాత్రలు మరియు Td టీకా తీసుకున్నారా?' },
    'anc-danger': { categoryLabel: 'భద్రత', question: 'రక్తస్రావం, తలనొప్పి, వాపు, జ్వరం తనిఖీ చేయండి', hint: 'ఉదా: రక్తస్రావం లేదు', spokenPrompt: 'రక్తస్రావం, తీవ్రమైన తలనొప్పి లేదా జ్వరం ఉన్నాయా?' },
    'anc-next-date': { categoryLabel: 'తదుపరి భేటీ', question: 'తదుపరి భేటీ తేదీని నిర్ధారించండి', hint: 'ఉదా: తదుపరి భేటీ 28 నవంబర్', spokenPrompt: 'తదుపరి సందర్శన తేదీ ఎప్పుడు?' },
    'nb-weight': { categoryLabel: 'బరువు', question: 'శిశువు బరువు కిలోలలో నమోదు చేయండి', hint: 'ఉదా: బరువు 2.8 కిలోలు', spokenPrompt: 'శిశువు బరువు ఎన్ని కిలోలు?' },
    'imm-weight': { categoryLabel: 'శిశువు బరువు', question: 'పిల్లవాడి బరువు కిలోలలో నమోదు చేయండి', hint: 'ఉదా: బరువు 6.4 కిలోలు', spokenPrompt: 'పిల్లవాడి బరువు ఎన్ని కిలోలు?' },
  },
  ml: {
    'anc-weight': { categoryLabel: 'ഭാരം', question: 'അമ്മയുടെ ഭാരം കിലോഗ്രാമിൽ രേഖപ്പെടുത്തുക', hint: 'ഉദാ: ഭാരം 52 കിലോ', spokenPrompt: 'അമ്മയുടെ ഭാരം എത്ര കിലോ ആണ്?' },
    'anc-bp': { categoryLabel: 'ബിപി (BP)', question: 'രക്തസമ്മർദ്ദം (BP) രേഖപ്പെടുത്തുക', hint: 'ഉദാ: ബിപി 118/76', spokenPrompt: 'അമ്മയുടെ ബിപി എത്രയാണ്?' },
    'nb-weight': { categoryLabel: 'ഭാരം', question: 'കുഞ്ഞിന്റെ ഭാരം കിലോഗ്രാമിൽ രേഖപ്പെടുത്തുക', hint: 'ഉദാ: ഭാരം 2.8 കിലോ', spokenPrompt: 'കുഞ്ഞിന്റെ ഭാരം എത്ര കിലോ ആണ്?' },
    'imm-weight': { categoryLabel: 'ഭാരം', question: 'കുഞ്ഞിന്റെ ഭാരം കിലോഗ്രാമിൽ രേഖപ്പെടുത്തുക', hint: 'ഉദാ: ഭാരം 6.4 കിലോ', spokenPrompt: 'കുഞ്ഞിന്റെ ഭാരം എത്ര കിലോ ആണ്?' },
  },
  mr: {
    'anc-weight': { categoryLabel: 'वजन', question: 'मातेचे वजन किलोमध्ये नोंदवा', hint: 'उदा: वजन 52 किलो', spokenPrompt: 'मातेचे सध्याचे वजन किती किलो आहे?' },
    'anc-bp': { categoryLabel: 'रक्तदाब (BP)', question: 'रक्तदाब (BP) नोंदवा', hint: 'उदा: बीपी 118/76', spokenPrompt: 'मातेचा रक्तदाब किती आहे?' },
    'nb-weight': { categoryLabel: 'वजन', question: 'बाळाचे वजन किलोमध्ये नोंदवा', hint: 'उदा: वजन 2.8 किलो', spokenPrompt: 'बाळाचे वजन किती किलो आहे?' },
    'imm-weight': { categoryLabel: 'वजन', question: 'मुलाचे वजन किलोमध्ये नोंदवा', hint: 'उदा: वजन 6.4 किलो', spokenPrompt: 'मुलाचे वजन किती किलो आहे?' },
  },
  bn: {
    'anc-weight': { categoryLabel: 'ওজন', question: 'মায়ের ওজন কেজিতে লিখুন', hint: 'যেমন: ওজন 52 কেজি', spokenPrompt: 'মায়ের বর্তমান ওজন কত কেজি?' },
    'anc-bp': { categoryLabel: 'বিপি (BP)', question: 'রক্তচাপ (BP) লিখুন', hint: 'যেমন: বিপি 118/76', spokenPrompt: 'মায়ের রক্তচাপ কত?' },
    'nb-weight': { categoryLabel: 'ওজন', question: 'নবজাতকের ওজন কেজিতে লিখুন', hint: 'যেমন: ওজন 2.8 কেজি', spokenPrompt: 'নবজাতকের ওজন কত কেজি?' },
    'imm-weight': { categoryLabel: 'ওজন', question: 'শিশুর ওজন কেজিতে লিখুন', hint: 'যেমন: ওজন 6.4 কেজি', spokenPrompt: 'শিশুর ওজন কত কেজি?' },
  },
  gu: {
    'anc-weight': { categoryLabel: 'વજન', question: 'માતાનું વજન કિલોમાં નોંધો', hint: 'દા.ત.: વજન 52 કિલો', spokenPrompt: 'માતાનું હાલનું વજન કેટલા કિલો છે?' },
    'anc-bp': { categoryLabel: 'બીપી (BP)', question: 'બ્લડ પ્રેશર (BP) નોંધો', hint: 'દા.ત.: બીપી 118/76', spokenPrompt: 'માતાનું બ્લડ પ્રેશર કેટલું છે?' },
    'nb-weight': { categoryLabel: 'વજન', question: 'નવજાતનું વજન કિલોમાં નોંધો', hint: 'દા.ત.: વજન 2.8 કિલો', spokenPrompt: 'નવજાતનું વજન કેટલા કિલો છે?' },
    'imm-weight': { categoryLabel: 'વજન', question: 'બાળકનું વજન કિલોમાં નોંધો', hint: 'દા.ત.: વજન 6.4 કિલો', spokenPrompt: 'બાળકનું વજન કેટલા કિલો છે?' },
  },
  pa: {
    'anc-weight': { categoryLabel: 'ਭਾਰ', question: 'ਮਾਂ ਦਾ ਭਾਰ ਕਿਲੋ ਵਿੱਚ ਦਰਜ ਕਰੋ', hint: 'ਜਿਵੇਂ: ਭਾਰ 52 ਕਿਲੋ', spokenPrompt: 'ਮਾਂ ਦਾ ਮੌਜੂਦਾ ਭਾਰ ਕਿੰਨੇ ਕਿਲੋ ਹੈ?' },
    'anc-bp': { categoryLabel: 'ਬੀਪੀ (BP)', question: 'ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ (BP) ਦਰਜ ਕਰੋ', hint: 'ਜਿਵੇਂ: ਬੀਪੀ 118/76', spokenPrompt: 'ਮਾਂ ਦਾ ਬੀਪੀ ਕਿੰਨਾ ਹੈ?' },
    'nb-weight': { categoryLabel: 'ਭਾਰ', question: 'ਨਵਜੰਮੇ ਬੱਚੇ ਦਾ ਭਾਰ ਕਿਲੋ ਵਿੱਚ ਦਰਜ ਕਰੋ', hint: 'ਜਿਵੇਂ: ਭਾਰ 2.8 ਕਿਲੋ', spokenPrompt: 'ਬੱਚੇ ਦਾ ਭਾਰ ਕਿੰਨੇ ਕਿਲੋ ਹੈ?' },
    'imm-weight': { categoryLabel: 'ਭਾਰ', question: 'ਬੱਚੇ ਦਾ ਭਾਰ ਕਿਲੋ ਵਿੱਚ ਦਰਜ ਕਰੋ', hint: 'ਜਿਵੇਂ: ਭਾਰ 6.4 ਕਿਲੋ', spokenPrompt: 'ਬੱਚੇ ਦਾ ਭਾਰ ਕਿੰਨੇ ਕਿਲੋ ਹੈ?' },
  },
  or: {
    'anc-weight': { categoryLabel: 'ଓଜନ', question: 'ମାଆଙ୍କର ଓଜନ କିଲୋରେ ଲେଖନ୍ତୁ', hint: 'ଉଦା: ଓଜନ 52 କିଲୋ', spokenPrompt: 'ମାଆଙ୍କର ଓଜନ କେତେ କିଲୋ?' },
    'anc-bp': { categoryLabel: 'ବିପି (BP)', question: 'ରକ୍ତଚାପ (BP) ଲେଖନ୍ତୁ', hint: 'ଉଦା: ବିପି 118/76', spokenPrompt: 'ମାଆଙ୍କର ବିପି କେତେ ଅଛି?' },
    'nb-weight': { categoryLabel: 'ଓଜନ', question: 'ଶିଶୁର ଓଜନ କିଲୋରେ ଲେଖନ୍ତୁ', hint: 'ଉଦା: ଓଜନ 2.8 କିଲୋ', spokenPrompt: 'ଶିଶୁର ଓଜନ କେତେ କିଲୋ?' },
    'imm-weight': { categoryLabel: 'ଓଜନ', question: 'ଶିଶୁର ଓଜନ କିଲୋରେ ଲେଖନ୍ତୁ', hint: 'ଉଦା: ଓଜନ 6.4 କିଲୋ', spokenPrompt: 'ଶିଶୁର ଓଜନ କେତେ କିଲୋ?' },
  },
  as: {
    'anc-weight': { categoryLabel: 'ওজন', question: 'মাতৃৰ ওজন কেজিত লিখক', hint: 'যেনে: ওজন 52 কেজি', spokenPrompt: 'মাতৃৰ বৰ্তমান ওজন কিমান কেজি?' },
    'anc-bp': { categoryLabel: 'বিপি (BP)', question: 'ৰক্তচাপ (BP) লিখক', hint: 'যেনে: বিপি 118/76', spokenPrompt: 'মাতৃৰ বিপি কিমান?' },
    'nb-weight': { categoryLabel: 'ওজন', question: 'নৱজাতকৰ ওজন কেজিত লিখক', hint: 'যেনে: ওজন 2.8 কেজি', spokenPrompt: 'নৱজাতকৰ ওজন কিমান কেজি?' },
    'imm-weight': { categoryLabel: 'ওজন', question: 'শিশুৰ ওজন কেজিত লিখক', hint: 'যেনে: ওজন 6.4 কেজি', spokenPrompt: 'শিশুৰ ওজন কিমান কেজি?' },
  },
};

export function getLocalizedQuestionGuide(
  item: QuestionGuideItem,
  language: LanguageCode,
): LocalizedQuestionText {
  const override = QUESTION_TRANSLATIONS[language]?.[item.id];
  if (override) return override;
  return {
    categoryLabel: item.categoryLabel,
    question: item.question,
    hint: item.hint,
    spokenPrompt: item.spokenPrompt,
  };
}
