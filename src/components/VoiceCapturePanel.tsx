import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Baby,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  HeartPulse,
  Mic,
  MicOff,
  Pause,
  Pencil,
  Play,
  Plus,
  Square,
  Syringe,
  Volume2,
  X,
} from 'lucide-react';
import { getTranslations } from '../shared/i18n';
import { getLanguageConfig } from '../shared/languages';
import type {
  AcousticTelemetry,
  Beneficiary,
  LanguageCode,
  StructuredVisitRecord,
  TranscriptProvenanceSpan,
  VisitType,
  VoicePipelineState,
} from '../shared/types';

interface VoiceCapturePanelProps {
  language: LanguageCode;
  visitType: VisitType;
  onChangeVisitType: (type: VisitType) => void;
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary | null;
  onSelectBeneficiary: (ben: Beneficiary | null) => void;
  onCreateBeneficiary: (payload: {
    displayName: string;
    beneficiaryType: Beneficiary['beneficiaryType'];
    locality?: string;
  }) => Promise<Beneficiary>;
  ambiguityCandidates: Beneficiary[];
  pipelineState: VoicePipelineState;
  waveformBars: number[];
  acousticTelemetry: AcousticTelemetry;
  recordingSeconds: number;
  liveTranscript: string;
  partialTranscript: string;
  fieldProvenance: TranscriptProvenanceSpan[];
  highlightedField: string | null;
  onHoverField: (fieldName: string | null) => void;
  structuredRecord: StructuredVisitRecord | null;
  noiseWarning: string | null;
  micError: string | null;
  providerStatus: string;
  ttfaMs: number | null;
  isOnline: boolean;
  isMobileLayout?: boolean;
  onStartListening: () => void;
  onPauseListening: () => void;
  onResumeListening: () => void;
  onStopListening: () => void;
  onCancelListening: () => void;
  onBargeIn: () => void;
  onRunJudgeScenario: (transcript: string, targetVisitType?: VisitType, benCode?: string | null) => void;
}

const MULTILINGUAL_SAMPLE_TEXTS: Record<
  LanguageCode,
  { anc: string; newborn: string; vaccine: string; danger: string }
> = {
  en: {
    anc: 'Name Nandini ASHA00125, weight 52 kilo, BP 118/76, pregnancy condition normal pregnancy 24 weeks, precautions take IFA tablet daily and rest well, next visit 28 November.',
    newborn: 'Name Baby of Rekha ASHA00127, baby girl, weight 2.8 kilo, baby condition healthy feeding properly, precautions keep baby warm and exclusive breastfeeding, next visit 5 December.',
    vaccine: 'Name Aarav ASHA00128, weight 6.4 kilo, OPV-1 and Pentavalent-1 given today. PCV-1 due. Condition active and healthy, precautions give paracetamol drops if mild fever, next visit 18 December.',
    danger: 'Pregnant woman Nandini ASHA00125 has vaginal bleeding.',
  },
  kn: {
    anc: 'ಹೆಸರು ನಂದಿನಿ ASHA00125, ತೂಕ 52 ಕೆಜಿ, ಬಿಪಿ 118/76, ಸ್ಥಿತಿ ಸಾಮಾನ್ಯ ಗರ್ಭಾವಸ್ಥೆ 24 ವಾರ, ಮುನ್ನೆಚ್ಚರಿಕೆ ಪ್ರತಿದಿನ IFA ಮಾತ್ರೆ ಸೇವಿಸಿ, ಮುಂದಿನ ಭೇಟಿ 28 ನವೆಂಬರ್.',
    newborn: 'ಹೆಸರು ರೇಖಾ ಮಗು ASHA00127, ಹೆಣ್ಣು ಮಗು, ತೂಕ 2.8 ಕೆಜಿ, ಸ್ಥಿತಿ ಆರೋಗ್ಯವಾಗಿದೆ ಹಾಲು ಚೆನ್ನಾಗಿ ಕುಡಿಯುತ್ತಿದೆ, ಮುನ್ನೆಚ್ಚರಿಕೆ ಮಗುವನ್ನು ಬೆಚ್ಚಗಿಡಿ, ಮುಂದಿನ ಭೇಟಿ 5 ಡಿಸೆಂಬರ್.',
    vaccine: 'ಹೆಸರು ಆರವ್ ASHA00128, ತೂಕ 6.4 ಕೆಜಿ, ಇಂದು OPV-1 ಮತ್ತು Pentavalent-1 ನೀಡಲಾಗಿದೆ. PCV-1 ಬಾಕಿ ಇದೆ. ಸ್ಥಿತಿ ಆರೋಗ್ಯಕರ, ಮುಂದಿನ ಭೇಟಿ 18 ಡಿಸೆಂಬರ್.',
    danger: 'ನಂದಿನಿ ASHA00125 ಅವರಿಗೆ ತೀವ್ರ ರಕ್ತಸ್ರಾವ ಇದೆ.',
  },
  hi: {
    anc: 'नाम नंदिनी ASHA00125, वजन 52 किलो, बीपी 118/76, स्थिति सामान्य गर्भावस्था 24 सप्ताह, सलाह रोज़ IFA गोली लें और आराम करें, अगली भेंट 28 नवंबर.',
    newborn: 'नाम रेखा का शिशु ASHA00127, लड़की, वजन 2.8 किलो, स्थिति स्वस्थ दूध पी रही है, सलाह शिशु को गर्म रखें और स्तनपान कराएं, अगली भेंट 5 दिसंबर.',
    vaccine: 'नाम आरव ASHA00128, वजन 6.4 किलो, आज OPV-1 और Pentavalent-1 दिया गया. PCV-1 बाकी है. स्थिति स्वस्थ, अगली भेंट 18 दिसंबर.',
    danger: 'गर्भवती महिला नंदिनी ASHA00125 को भारी रक्तस्राव हो रहा है।',
  },
  ta: {
    anc: 'பெயர் நந்தினி ASHA00125, எடை 52 கிலோ, பிபி 118/76, நிலை சாதாரண கர்ப்பம் 24 வாரங்கள், முன்னெச்சரிக்கை தினமும் IFA மாத்திரை சாப்பிடவும், அடுத்த வருகை 28 நவம்பர்.',
    newborn: 'பெயர் ரேகா குழந்தை ASHA00127, பெண் குழந்தை, எடை 2.8 கிலோ, நிலை நன்றாக பால் குடிக்கிறது, முன்னெச்சரிக்கை குழந்தையை சூடாக வைக்கவும், அடுத்த வருகை 5 டிசம்பர்.',
    vaccine: 'பெயர் ஆரவ் ASHA00128, எடை 6.4 கிலோ, இன்று OPV-1 மற்றும் Pentavalent-1 கொடுக்கப்பட்டது. PCV-1 நிலுவை. நிலை ஆரோக்கியம், அடுத்த வருகை 18 டிசம்பர்.',
    danger: 'நந்தினி ASHA00125 க்கு அதிக ரத்தப்போக்கு உள்ளது.',
  },
  te: {
    anc: 'పేరు నందిని ASHA00125, బరువు 52 కిలోలు, బీపీ 118/76, స్థితి సాధారణ గర్భం 24 వారాలు, జాగ్రత్తలు రోజూ IFA మాత్ర వేసుకోండి, తదుపరి భేటీ 28 నవంబర్.',
    newborn: 'పేరు రేఖ శిశువు ASHA00127, ఆడపిల్ల, బరువు 2.8 కిలోలు, స్థితి ఆరోగ్యంగా పాలు బాగా తాగుతోంది, జాగ్రత్తలు శిశువును వెచ్చగా ఉంచండి, తదుపరి భేటీ 5 డిసెంబర్.',
    vaccine: 'పేరు ఆరవ్ ASHA00128, బరువు 6.4 కిలోలు, ఈ రోజు OPV-1 మరియు Pentavalent-1 ఇవ్వబడింది. PCV-1 పెండింగ్. స్థితి ఆరోగ్యంగా ఉంది, తదుపరి భేటీ 18 డిసెంబర్.',
    danger: 'నందిని ASHA00125 కు తీవ్ర రక్తస్రావం అవుతోంది.',
  },
  ml: {
    anc: 'പേര് നന്ദിനി ASHA00125, ഭാരം 52 കിലോ, ബിപി 118/76, അവസ്ഥ സാധാരണ ഗർഭാവസ്ഥ 24 ആഴ്ച, മുൻകരുതൽ ദിവസവും IFA ഗുളിക കഴിക്കുക, അടുത്ത സന്ദർശനം 28 നവംബർ.',
    newborn: 'പേര് രേഖയുടെ കുഞ്ഞ് ASHA00127, പെൺകുട്ടി, ഭാരം 2.8 കിലോ, അവസ്ഥ ആരോഗ്യവതിയാണ് നന്നായി പാൽ കുടിക്കുന്നു, മുൻകരുതൽ കുഞ്ഞിനെ ചൂടോടെ സൂക്ഷിക്കുക, അടുത്ത സന്ദർശനം 5 ഡിസംബർ.',
    vaccine: 'പേര് ആരവ് ASHA00128, ഭാരം 6.4 കിലോ, ഇന്ന് OPV-1, Pentavalent-1 നൽകി. PCV-1 ബാക്കിയുണ്ട്. അവസ്ഥ ആരോഗ്യകരം, അടുത്ത സന്ദർശനം 18 ഡിസംബർ.',
    danger: 'നന്ദിനി ASHA00125 ന് കടുത്ത രക്തസ്രാവം ഉണ്ട്.',
  },
  mr: {
    anc: 'नाव नंदिनी ASHA00125, वजन 52 किलो, बीपी 118/76, स्थिती सामान्य गर्भधारणा 24 आठवडे, काळजी रोज IFA गोळी घ्या, पुढील भेट 28 नोव्हेंबर.',
    newborn: 'नाव रेखाचे बाळ ASHA00127, मुलगी, वजन 2.8 किलो, स्थिती निरोगी दूध पित आहे, काळजी बाळाला उबदार ठेवा, पुढील भेट 5 डिसेंबर.',
    vaccine: 'नाव आरव ASHA00128, वजन 6.4 किलो, आज OPV-1 आणि Pentavalent-1 दिली. PCV-1 बाकी आहे. स्थिती निरोगी, पुढील भेट 18 डिसेंबर.',
    danger: 'नंदिनी ASHA00125 ला जास्त रक्तस्राव होत आहे.',
  },
  bn: {
    anc: 'নাম নন্দিনী ASHA00125, ওজন 52 কেজি, বিপি 118/76, অবস্থা স্বাভাবিক গর্ভাবস্থা 24 সপ্তাহ, সতর্কতা প্রতিদিন IFA ট্যাবলেট খান, পরবর্তী ভিজিট 28 নভেম্বর.',
    newborn: 'নাম রেখার শিশু ASHA00127, মেয়ে শিশু, ওজন 2.8 কেজি, অবস্থা সুস্থ দুধ খাচ্ছে, সতর্কতা শিশুকে উষ্ণ রাখুন, পরবর্তী ভিজিট 5 ডিসেম্বর.',
    vaccine: 'নাম আরভ ASHA00128, ওজন 6.4 কেজি, আজ OPV-1 এবং Pentavalent-1 দেওয়া হয়েছে. PCV-1 বাকি আছে. অবস্থা সুস্থ, পরবর্তী ভিজিট 18 ডিসেম্বর.',
    danger: 'নন্দিনী ASHA00125 এর প্রবল রক্তপাত হচ্ছে।',
  },
  gu: {
    anc: 'નામ નંદિની ASHA00125, વજન 52 કિલો, બીપી 118/76, સ્થિતિ સામાન્ય ગર્ભાવસ્થા 24 અઠવાડિયા, સાવચેતી રોજ IFA ગોળી લો, આગામી મુલાકાત 28 નવેમ્બર.',
    newborn: 'નામ રેખાનું બાળક ASHA00127, છોકરી, વજન 2.8 કિલો, સ્થિતિ તંદુરસ્ત દૂધ પીવે છે, સાવચેતી બાળકને ગરમ રાખો, આગામી મુલાકાત 5 ડિસેમ્બર.',
    vaccine: 'નામ આરવ ASHA00128, વજન 6.4 કિલો, આજે OPV-1 અને Pentavalent-1 આપવામાં આવી. PCV-1 બાકી છે. સ્થિતિ સ્વસ્થ, આગામી મુલાકાત 18 ડિસેમ્બર.',
    danger: 'નંદિની ASHA00125 ને ભારે રક્તસ્ત્રાવ થઈ રહ્યો છે.',
  },
  pa: {
    anc: 'ਨਾਮ ਨੰਦਿਨੀ ASHA00125, ਭਾਰ 52 ਕਿਲੋ, ਬੀਪੀ 118/76, ਹਾਲਤ ਸਧਾਰਨ ਗਰਭ-ਅਵਸਥਾ 24 ਹਫ਼ਤੇ, ਸਾਵਧਾਨੀਆਂ ਰੋਜ਼ IFA ਗੋਲੀ ਲਓ, ਅਗਲਾ ਦੌਰਾ 28 ਨਵੰਬਰ.',
    newborn: 'ਨਾਮ ਰੇਖਾ ਦਾ ਬੱਚਾ ASHA00127, ਕੁੜੀ, ਭਾਰ 2.8 ਕਿਲੋ, ਹਾਲਤ ਤੰਦਰੁਸਤ ਦੁੱਧ ਪੀ ਰਹੀ ਹੈ, ਸਾਵਧਾਨੀਆਂ ਬੱਚੇ ਨੂੰ ਨਿੱਘਾ ਰੱਖੋ, ਅਗਲਾ ਦੌਰਾ 5 ਦਸੰਬਰ.',
    vaccine: 'ਨਾਮ ਆਰਵ ASHA00128, ਭਾਰ 6.4 ਕਿਲੋ, ਅੱਜ OPV-1 ਅਤੇ Pentavalent-1 ਦਿੱਤੀ ਗਈ. PCV-1 ਬਾਕੀ ਹੈ. ਹਾਲਤ ਸਿਹਤਮੰਦ, ਅਗਲਾ ਦੌਰਾ 18 ਦਸੰਬਰ.',
    danger: 'ਨੰਦਿਨੀ ASHA00125 ਨੂੰ ਤੇਜ਼ ਖੂਨ ਵਗਣਾ ਹੋ ਰਿਹਾ ਹੈ।',
  },
  or: {
    anc: 'ନାମ ନନ୍ଦିନୀ ASHA00125, ଓଜନ 52 କିଲୋ, ବିପି 118/76, ଅବସ୍ଥା ସାଧାରଣ ଗର୍ଭାବସ୍ଥା 24 ସପ୍ତାହ, ସତର୍କତା ପ୍ରତିଦିନ IFA ବଟିକା ଖାଆନ୍ତୁ, ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ 28 ନଭେମ୍ବର.',
    newborn: 'ନାମ ରେଖାଙ୍କ ଶିଶୁ ASHA00127, ଝିଅ, ଓଜନ 2.8 କିଲୋ, ଅବସ୍ଥା ସୁସ୍ଥ କ୍ଷୀର ପିଉଛି, ସତର୍କତା ଶିଶୁକୁ ଉଷୁମ ରଖନ୍ତୁ, ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ 5 ଡିସେମ୍ବର.',
    vaccine: 'ନାମ ଆରଭ ASHA00128, ଓଜନ 6.4 କିଲୋ, ଆଜି OPV-1 ଏବଂ Pentavalent-1 ଦିଆଯାଇଛି. PCV-1 ବାକି ଅଛି. ଅବସ୍ଥା ସୁସ୍ଥ, ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ 18 ଡିସେମ୍ବର.',
    danger: 'ନନ୍ଦିନୀ ASHA00125 ଙ୍କର ପ୍ରବଳ ରକ୍ତସ୍ରାବ ହେଉଛି।',
  },
  as: {
    anc: 'নাম নন্দিনী ASHA00125, ওজন 52 কেজি, বিপি 118/76, অৱস্থা স্বাভাৱিক গৰ্ভাৱস্থা 24 সপ্তাহ, সাৱধানতা দৈনিক IFA টেবলেট খাওক, পৰৱৰ্তী ভ্ৰমণ 28 নৱেম্বৰ.',
    newborn: 'নাম ৰেখাৰ শিশু ASHA00127, ছোৱালী, ওজন 2.8 কেজি, অৱস্থা সুস্থ গাখীৰ খাই আছে, সাৱধানতা শিশুটিক উমাল কৰি ৰাখক, পৰৱৰ্তী ভ্ৰমণ 5 ডিচেম্বৰ.',
    vaccine: 'নাম আৰৱ ASHA00128, ওজন 6.4 কেজি, আজি OPV-1 আৰু Pentavalent-1 দিয়া হ’ল. PCV-1 বাকী আছে. অৱস্থা সুস্থ, পৰৱৰ্তী ভ্ৰমণ 18 ডিচেম্বৰ.',
    danger: 'নন্দিনী ASHA00125 ৰ অধিক ৰক্তক্ষৰণ হৈ আছে।',
  },
};

function getSampleVisits(language: LanguageCode) {
  const t = getTranslations(language).voice;
  const s = MULTILINGUAL_SAMPLE_TEXTS[language] ?? MULTILINGUAL_SAMPLE_TEXTS.en;
  return [
    {
      id: 'sample-anc',
      label: t.samplePregnancy,
      visitType: 'ANC' as VisitType,
      beneficiaryCode: 'ASHA00125',
      transcript: s.anc,
    },
    {
      id: 'sample-newborn',
      label: t.sampleNewborn,
      visitType: 'NEWBORN' as VisitType,
      beneficiaryCode: 'ASHA00127',
      transcript: s.newborn,
    },
    {
      id: 'sample-vaccine',
      label: t.sampleVaccines,
      visitType: 'IMMUNISATION' as VisitType,
      beneficiaryCode: 'ASHA00128',
      transcript: s.vaccine,
    },
    {
      id: 'sample-danger',
      label: t.sampleDanger,
      visitType: 'ANC' as VisitType,
      beneficiaryCode: 'ASHA00125',
      transcript: s.danger,
    },
  ];
}

const STATE_STYLE: Record<VoicePipelineState, string> = {
  IDLE: 'bg-slate-100 text-[#172B3A] border-[#E7EDF2]',
  LISTENING: 'bg-[#E8F7F1] text-[#087F75] border-[#087F75]/30',
  PAUSED: 'bg-amber-50 text-amber-800 border-amber-200',
  PROCESSING: 'bg-[#EDF5FF] text-[#1D4ED8] border-blue-200',
  VERIFYING: 'bg-sky-50 text-sky-800 border-sky-200',
  SPEAKING: 'bg-[#E8F7F1] text-[#087F75] border-[#A7F3D0]',
  WAITING_CONFIRMATION: 'bg-amber-50 text-amber-900 border-amber-300',
  SAVING: 'bg-[#E8F7F1] text-[#087F75] border-[#A7F3D0]',
  COMPLETED: 'bg-[#E8F7F1] text-[#10A77A] border-[#A7F3D0]',
  DANGER_ALERT: 'bg-red-100 text-[#D94B4B] border-red-300',
};

function formatLiveDateTime(date: Date, locale: string): string {
  const datePart = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

export const VoiceCapturePanel: React.FC<VoiceCapturePanelProps> = ({
  language,
  visitType,
  onChangeVisitType,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  onCreateBeneficiary,
  ambiguityCandidates,
  pipelineState,
  waveformBars,
  acousticTelemetry,
  recordingSeconds,
  liveTranscript,
  partialTranscript,
  fieldProvenance,
  highlightedField,
  onHoverField,
  noiseWarning,
  micError,
  isMobileLayout = false,
  onStartListening,
  onPauseListening,
  onResumeListening,
  onStopListening,
  onCancelListening,
  onBargeIn,
  onRunJudgeScenario,
}) => {
  const [showSampleDrawer, setShowSampleDrawer] = useState(false);
  const [showAddBenModal, setShowAddBenModal] = useState(false);
  const [newBenName, setNewBenName] = useState('');
  const [newBenType, setNewBenType] = useState<Beneficiary['beneficiaryType']>('PREGNANT_WOMAN');
  const [newBenLocality, setNewBenLocality] = useState('Ward 4');
  const [creatingBen, setCreatingBen] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [draftTranscript, setDraftTranscript] = useState('');
  const [now, setNow] = useState(() => new Date());
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const langCfg = getLanguageConfig(language);
  const t = getTranslations(language);
  const vt = t.voice;
  const isListening = pipelineState === 'LISTENING';
  const isPaused = pipelineState === 'PAUSED';
  const isSpeaking = pipelineState === 'SPEAKING';
  const stateLabel = vt.states[pipelineState];
  const stateStyle = STATE_STYLE[pipelineState];
  const displayTranscript = liveTranscript || partialTranscript;
  const sampleVisits = getSampleVisits(language);

  useEffect(() => {
    if (!highlightedField || !transcriptContainerRef.current) return;
    const el = transcriptContainerRef.current.querySelector(
      `[data-field-ref="${highlightedField}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedField]);

  const renderProvenanceTranscript = () => {
    if (!displayTranscript) return null;
    if (fieldProvenance.length === 0) {
      return <p className="mt-1.5 text-sm leading-relaxed text-[#172B3A]">{displayTranscript}</p>;
    }

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    fieldProvenance.forEach((span, idx) => {
      if (span.startIndex > cursor) {
        nodes.push(
          <span key={`txt-${idx}`}>{displayTranscript.slice(cursor, span.startIndex)}</span>,
        );
      }
      const isHighlighted = highlightedField === span.fieldName;
      nodes.push(
        <mark
          key={`span-${idx}`}
          data-field-ref={span.fieldName}
          onMouseEnter={() => onHoverField(span.fieldName)}
          onMouseLeave={() => onHoverField(null)}
          onClick={() => onHoverField(isHighlighted ? null : span.fieldName)}
          title={span.label}
          className={`cursor-pointer rounded-md px-1 py-0.5 font-semibold transition-all ${
            span.fieldName === 'dangerSignStatus'
              ? isHighlighted
                ? 'bg-[#D94B4B] text-white ring-2 ring-red-300'
                : 'bg-red-100 text-[#991B1B]'
              : isHighlighted
                ? 'bg-[#087F75] text-white ring-2 ring-[#10A77A]/40'
                : 'bg-[#E8F7F1] text-[#087F75] hover:bg-[#D1FAE5]'
          }`}
        >
          {displayTranscript.slice(span.startIndex, span.endIndex)}
        </mark>,
      );
      cursor = span.endIndex;
    });
    if (cursor < displayTranscript.length) {
      nodes.push(<span key="txt-tail">{displayTranscript.slice(cursor)}</span>);
    }

    return <p className="mt-1.5 text-sm leading-relaxed text-[#172B3A]">{nodes}</p>;
  };

  const handleCreateBeneficiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenName.trim()) return;
    setCreatingBen(true);
    try {
      const created = await onCreateBeneficiary({
        displayName: newBenName.trim(),
        beneficiaryType: newBenType,
        locality: newBenLocality,
      });
      onSelectBeneficiary(created);
      setNewBenName('');
      setShowAddBenModal(false);
    } finally {
      setCreatingBen(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#E7EDF2] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7EDF2] pb-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-lg font-bold text-[#172B3A]">{vt.voiceVisit}</h2>
          <span
            data-testid="live-visit-datetime"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 font-mono text-xs font-semibold text-[#172B3A]"
          >
            <Clock className="h-3.5 w-3.5 text-[#087F75]" aria-hidden="true" />
            <span>{formatLiveDateTime(now, langCfg.bcp47)}</span>
          </span>
        </div>

        <span
          data-testid="voice-pipeline-state"
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${stateStyle}`}
        >
          {stateLabel}
        </span>
      </div>

      {/* Category Buttons */}
      <div className="mt-4">
        <span className="block text-xs font-semibold text-[#718096]">{vt.visitCategory}</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(
            [
              { type: 'ANC' as VisitType, label: t.categories.pregnancy, icon: HeartPulse },
              { type: 'NEWBORN' as VisitType, label: t.categories.newborn, icon: Baby },
              { type: 'IMMUNISATION' as VisitType, label: t.categories.vaccines, icon: Syringe },
            ] as const
          ).map(({ type, label, icon: Icon }) => {
            const active = visitType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChangeVisitType(type)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isMobileLayout ? '' : 'sm:flex-row sm:gap-2 sm:px-3 sm:text-sm'
                } ${
                  active
                    ? 'border-[#087F75] bg-[#087F75] text-white'
                    : 'border-[#E7EDF2] bg-[#F7F9FC] text-[#172B3A] hover:border-[#087F75]/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Selector */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="beneficiary-select" className="text-xs font-semibold text-[#718096]">
            {vt.patient}
          </label>
          <button
            type="button"
            onClick={() => setShowAddBenModal(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E7EDF2] bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-bold text-[#087F75] hover:bg-[#E8F7F1]"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span>{vt.newPatient}</span>
          </button>
        </div>
        <select
          id="beneficiary-select"
          value={selectedBeneficiary?.beneficiaryCode ?? ''}
          onChange={(e) => {
            const code = e.target.value;
            const found = beneficiaries.find((b) => b.beneficiaryCode === code) ?? null;
            onSelectBeneficiary(found);
          }}
          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm font-medium text-[#172B3A] focus:border-[#087F75] focus:outline-none"
        >
          <option value="">{vt.autoDetect}</option>
          {beneficiaries.map((b) => (
            <option key={b.id} value={b.beneficiaryCode}>
              {b.displayName} ({b.beneficiaryCode})
            </option>
          ))}
        </select>

        {ambiguityCandidates.length > 1 && (
          <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">{vt.selectPatient}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ambiguityCandidates.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => onSelectBeneficiary(cand)}
                  className="min-h-[38px] rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                >
                  {cand.displayName} ({cand.beneficiaryCode})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Microphone Button */}
      <div className="mt-4 flex flex-col items-center rounded-2xl border border-[#E7EDF2] bg-[#F7F9FC] px-4 py-5 text-center">
        <button
          type="button"
          onClick={
            isListening
              ? onStopListening
              : isPaused
                ? onResumeListening
                : isSpeaking
                  ? onBargeIn
                  : onStartListening
          }
          aria-label={
            isListening
              ? vt.done
              : isPaused
                ? vt.resume
                : isSpeaking
                  ? vt.tapToSpeakFix
                  : langCfg.labels.startHomeVisit
          }
          className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 ${
            isListening
              ? 'bg-[#D94B4B] text-white hover:bg-[#B91C1C]'
              : isPaused || isSpeaking
                ? 'bg-[#F4A340] text-white hover:bg-amber-600'
                : 'bg-[#10A77A] text-white hover:bg-[#0D9169]'
          }`}
        >
          {isListening ? (
            <Square className="h-8 w-8 fill-current" aria-hidden="true" />
          ) : isPaused ? (
            <Play className="h-9 w-9 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="h-9 w-9" aria-hidden="true" />
          )}
        </button>

        <div className="mt-2.5 text-base font-bold text-[#172B3A]">
          {isListening
            ? langCfg.labels.listening
            : isPaused
              ? vt.paused
              : isSpeaking
                ? vt.tapToSpeakFix
                : vt.tapToSpeak}
        </div>

        {(isListening || isPaused) && (
          <div className="mt-1 font-mono text-xs tabular-nums text-[#718096]">
            00:{String(recordingSeconds).padStart(2, '0')}
          </div>
        )}

        {(isListening || isPaused) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {isListening ? (
              <button
                type="button"
                onClick={onPauseListening}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E7EDF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B3A]"
              >
                <Pause className="h-3.5 w-3.5 text-[#F4A340]" aria-hidden="true" />
                <span>{vt.pause}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onResumeListening}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#10A77A] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{vt.resume}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onStopListening}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#087F75] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>{vt.done}</span>
            </button>
            <button
              type="button"
              onClick={onCancelListening}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#D94B4B]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{vt.cancel}</span>
            </button>
          </div>
        )}

        {/* Audio Waveform */}
        <div
          aria-hidden="true"
          className="mt-3 flex h-8 w-full max-w-xs items-center justify-center gap-1"
        >
          {waveformBars.map((level, idx) => (
            <div
              key={idx}
              className={`w-1.5 rounded-full transition-transform duration-75 ${
                isListening
                  ? acousticTelemetry.vadActive
                    ? 'bg-[#10A77A]'
                    : 'bg-[#087F75]'
                  : 'bg-[#CBD5E1]'
              }`}
              style={{
                height: `${Math.round(Math.max(12, level * 100))}%`,
              }}
            />
          ))}
        </div>

        {isSpeaking && (
          <button
            type="button"
            onClick={onBargeIn}
            className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <span>{vt.stopReading}</span>
          </button>
        )}
      </div>

      {noiseWarning && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{noiseWarning}</span>
        </div>
      )}

      {micError && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-[#D94B4B]"
        >
          <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{micError}</span>
        </div>
      )}

      {/* Live Speech Box */}
      <div
        ref={transcriptContainerRef}
        aria-live="polite"
        className={`mt-4 rounded-xl border p-3.5 transition-colors ${
          isListening
            ? 'border-[#10A77A] bg-[#E8F7F1]/50'
            : displayTranscript
              ? 'border-[#087F75]/35 bg-white'
              : 'border-[#E7EDF2] bg-[#F7F9FC]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#172B3A]">
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="inline-block h-2 w-2 rounded-full bg-[#D94B4B] animate-pulse" aria-hidden="true" />
            )}
            <span>{isListening ? vt.listeningLabel : vt.whatYouSpeak}</span>
          </div>
          {!isListening && (
            <button
              type="button"
              data-testid="toggle-edit-transcript"
              onClick={() => {
                if (editingTranscript) {
                  setEditingTranscript(false);
                } else {
                  setDraftTranscript(displayTranscript);
                  setEditingTranscript(true);
                }
              }}
              className="inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-[#E7EDF2] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#087F75] hover:border-[#087F75]/40 hover:bg-[#E8F7F1]/50"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              <span>{vt.typeOrEdit}</span>
            </button>
          )}
        </div>

        {editingTranscript && !isListening ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draftTranscript.trim();
              if (!text) return;
              setEditingTranscript(false);
              onRunJudgeScenario(text, visitType, selectedBeneficiary?.beneficiaryCode ?? null);
            }}
          >
            <textarea
              data-testid="manual-transcript-input"
              rows={3}
              value={draftTranscript}
              onChange={(e) => setDraftTranscript(e.target.value)}
              placeholder={vt.transcriptPlaceholder}
              className="w-full rounded-xl border border-[#087F75]/40 bg-white px-3 py-2 text-sm text-[#172B3A] focus:border-[#087F75] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTranscript(false)}
                className="min-h-[34px] rounded-lg border border-[#E7EDF2] bg-white px-3 text-xs font-semibold text-[#172B3A]"
              >
                {vt.cancel}
              </button>
              <button
                type="submit"
                data-testid="submit-manual-transcript"
                disabled={!draftTranscript.trim()}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#087F75] px-3 text-xs font-semibold text-white hover:bg-[#066860] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{vt.fillForm}</span>
              </button>
            </div>
          </form>
        ) : displayTranscript ? (
          renderProvenanceTranscript()
        ) : (
          <p className="mt-1 text-xs text-[#718096]">{vt.tapMicAndSpeak}</p>
        )}
      </div>

      {/* Sample Visits Drawer */}
      <div className="mt-4 border-t border-[#E7EDF2] pt-3">
        <button
          type="button"
          onClick={() => setShowSampleDrawer((prev) => !prev)}
          aria-expanded={showSampleDrawer}
          className="flex min-h-[40px] w-full items-center justify-between rounded-xl px-2 text-left text-xs font-semibold text-[#718096] hover:bg-[#F7F9FC] hover:text-[#172B3A]"
        >
          <span>{vt.sampleVisits}</span>
          {showSampleDrawer ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {showSampleDrawer && (
          <div className="mt-2.5 grid gap-2">
            {sampleVisits.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() =>
                  onRunJudgeScenario(sc.transcript, sc.visitType, sc.beneficiaryCode)
                }
                className="min-h-[44px] rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3.5 py-2 text-left transition-colors hover:border-[#087F75] hover:bg-[#E8F7F1]/50"
              >
                <div className="text-xs font-bold text-[#087F75]">{sc.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddBenModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-ben-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={(e) => void handleCreateBeneficiarySubmit(e)}
            className="w-full max-w-md rounded-2xl border border-[#E7EDF2] bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E7EDF2] pb-3">
              <h3 id="add-ben-title" className="font-display text-base font-bold text-[#172B3A]">
                {vt.addPatient}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBenModal(false)}
                aria-label={vt.cancel}
                className="rounded-lg p-1 text-[#718096] hover:bg-[#F7F9FC]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="new-ben-name" className="block text-xs font-semibold text-[#718096]">
                  {vt.patientName}
                </label>
                <input
                  id="new-ben-name"
                  type="text"
                  required
                  value={newBenName}
                  onChange={(e) => setNewBenName(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                />
              </div>
              <div>
                <label htmlFor="new-ben-type" className="block text-xs font-semibold text-[#718096]">
                  {vt.category}
                </label>
                <select
                  id="new-ben-type"
                  value={newBenType}
                  onChange={(e) => setNewBenType(e.target.value as Beneficiary['beneficiaryType'])}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                >
                  <option value="PREGNANT_WOMAN">{t.categories.pregnancy}</option>
                  <option value="NEWBORN">{t.categories.newborn}</option>
                  <option value="CHILD">{t.categories.vaccines}</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-ben-locality" className="block text-xs font-semibold text-[#718096]">
                  {vt.area}
                </label>
                <input
                  id="new-ben-locality"
                  type="text"
                  value={newBenLocality}
                  onChange={(e) => setNewBenLocality(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#E7EDF2] bg-[#F7F9FC] px-3 text-sm text-[#172B3A]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBenModal(false)}
                className="min-h-[40px] rounded-xl border border-[#E7EDF2] bg-white px-4 py-2 text-xs font-semibold text-[#172B3A]"
              >
                {vt.cancel}
              </button>
              <button
                type="submit"
                disabled={creatingBen}
                className="min-h-[40px] rounded-xl bg-[#10A77A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D9169] disabled:opacity-50"
              >
                {creatingBen ? vt.saving : vt.add}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
