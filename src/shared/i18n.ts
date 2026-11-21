import type { LanguageCode } from './types';

export interface AppTranslations {
  greetings: { morning: string; afternoon: string; evening: string };
  roles: { worker: string; supervisor: string; admin: string };
  header: {
    pcMode: string;
    mobileMode: string;
    online: string;
    offline: string;
    syncing: string;
    notifications: string;
    unread: string;
    openAlerts: string;
    noNotifications: string;
    markRead: string;
    switchRole: string;
    settings: string;
    help: string;
    selectLangAria: string;
  };
  nav: {
    home: string;
    speakRecord: string;
    visitRecords: string;
    followups: string;
    alerts: string;
    questionGuide: string;
    fullForm: string;
    reports: string;
    supervisor: string;
    settings: string;
    help: string;
    toolsSection: string;
    ashaMode: string;
    supervisorMode: string;
    voice: string;
  };
  dashboard: {
    tapAndSpeak: string;
    startSpeaking: string;
    savedVisits: string;
    visitsDone: string;
    followups: string;
    alerts: string;
    visitCategory: string;
    pregnancyVisit: string;
    newbornCare: string;
    vaccination: string;
    pendingFollowups: string;
    seeAll: string;
    noPendingFollowups: string;
    done: string;
    due: string;
    alertsAndRecent: string;
    openAlerts: string;
    noVisitsYet: string;
    nextVisitLabel: string;
    visitRecorded: string;
  };
  categories: {
    pregnancy: string;
    newborn: string;
    vaccines: string;
    all: string;
  };
  voice: {
    voiceVisit: string;
    visitCategory: string;
    patient: string;
    newPatient: string;
    autoDetect: string;
    selectPatient: string;
    tapToSpeak: string;
    paused: string;
    tapToSpeakFix: string;
    pause: string;
    resume: string;
    done: string;
    cancel: string;
    stopReading: string;
    whatYouSpeak: string;
    listeningLabel: string;
    tapMicAndSpeak: string;
    sampleVisits: string;
    addPatient: string;
    patientName: string;
    category: string;
    area: string;
    add: string;
    saving: string;
    noSpeechDetected: string;
    micUnavailable: string;
    pausedStatus: string;
    cancelledStatus: string;
    noiseWarning: string;
    samplePregnancy: string;
    sampleNewborn: string;
    sampleVaccines: string;
    sampleDanger: string;
    typeOrEdit: string;
    fillForm: string;
    transcriptPlaceholder: string;
    sttUnavailableHint: string;
    states: {
      IDLE: string;
      LISTENING: string;
      PAUSED: string;
      PROCESSING: string;
      VERIFYING: string;
      SPEAKING: string;
      WAITING_CONFIRMATION: string;
      SAVING: string;
      COMPLETED: string;
      DANGER_ALERT: string;
    };
  };
  form: {
    visitForm: string;
    edit: string;
    done: string;
    ashaWorker: string;
    dateTime: string;
    patientName: string;
    patientWeight: string;
    babyWeight: string;
    bp: string;
    pregnancyCondition: string;
    babyCondition: string;
    condition: string;
    babyGender: string;
    girl: string;
    boy: string;
    vaccinesProvided: string;
    vaccinesGiven: string;
    vaccinesDue: string;
    due: string;
    precautions: string;
    nextVisit: string;
    readAloud: string;
    stop: string;
    speakFix: string;
    saveDraft: string;
    saving: string;
    safeVisit: string;
    safetyAlert: string;
    safetyPromptFallback: string;
    yesAlert: string;
    noSafe: string;
    changed: string;
    empty: string;
    visitSavedPrefix: string;
    startNextVisit: string;
    nextActionsGenerated: string;
    savedLocally: string;
    draftSavedLocal: string;
    draftSavedServer: string;
    visitSavedSpeech: (name: string) => string;
  };
  readback: {
    intro: string;
    beneficiaryName: string;
    beneficiaryId: string;
    visitType: string;
    weight: string;
    babyWeight: string;
    bp: string;
    condition: string;
    ifa: string;
    vaccination: string;
    feeding: string;
    immChecked: string;
    vaccinesGiven: string;
    vaccinesDue: string;
    precautions: string;
    nextVisit: string;
    kilograms: string;
    confirmedSaving: string;
    updatedFieldPrompt: (fieldLabel: string, value: string) => string;
    askWeight: string;
    askBp: string;
    askDate: string;
    askClarification: string;
  };
  questions: {
    title: string;
    startVoiceVisit: string;
    filterPlaceholder: string;
    checklistProgress: string;
    answered: string;
    speakPrompt: string;
  };
  fullForm: {
    title: string;
    backToVoice: string;
    notProvided: string;
    confirmed: string;
    needsConfirmation: string;
    beneficiary: string;
    selectBeneficiary: string;
    motherWeightKg: string;
    bloodPressure: string;
    ifaTablets: string;
    tdVaccine: string;
    notReported: string;
    takingRegularly: string;
    suppliedToday: string;
    notTaking: string;
    completed: string;
    due: string;
    partial: string;
    feedingStatus: string;
    temperature: string;
    observations: string;
    observationsPlaceholder: string;
    confirmAndSaveVisit: string;
    draftNotice: string;
  };
  history: {
    followupsTitle: string;
    addFollowup: string;
    pending: string;
    noFollowups: string;
    completed: string;
    reschedule: string;
    markComplete: string;
    saveDate: string;
    visitsTitle: string;
    recordsCount: string;
    searchPlaceholder: string;
    noVisits: string;
    safety: string;
    viewEdit: string;
    transcriptLabel: string;
    observationsLabel: string;
    close: string;
    saveChanges: string;
    taskDescription: string;
    priority: string;
    dueDate: string;
    saveFollowup: string;
  };
  alerts: {
    title: string;
    all: string;
    unread: string;
    critical: string;
    noAlerts: string;
    markRead: string;
    read: string;
    referralLog: string;
    referralsCount: string;
    noReferrals: string;
    acknowledge: string;
    acknowledgedPhc: string;
    pendingPhc: string;
  };
  reports: {
    title: string;
    downloadPdf: string;
    downloadCsv: string;
    visitRecords: string;
    dateTime: string;
    ashaWorker: string;
    category: string;
    patient: string;
    vitalsCol: string;
    clinicalCol: string;
    precautions: string;
    nextVisit: string;
    noVisits: string;
    days7: string;
    days30: string;
    visitsLabel: string;
    categoriesLabel: string;
    reportHeading: string;
  };
  settings: {
    title: string;
    languageSpeech: string;
    preferredLanguage: string;
    voiceSpeed: string;
    slowerFaster: string;
    testSpeed: string;
    accessibility: string;
    highContrast: string;
    largerText: string;
    offlineAutoSync: string;
    updatedSaved: string;
    sampleSpeedText: string;
  };
  help: {
    title: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    sampleScenarios: string;
    dangerRulesTitle: string;
  };
  emergency: {
    beneficiaryRef: string;
    unidentified: string;
    detectedAt: string;
    triggeringSigns: string;
    matchedPhrase: string;
    savedOffline: string;
    loggedPhc: string;
    guardrail: string;
    replayAlert: string;
    acknowledgeReturn: string;
  };
  offline: {
    offlineQueued: (count: number) => string;
    readyToSync: (count: number) => string;
    syncNow: string;
    syncing: string;
  };
}

const EN: AppTranslations = {
  greetings: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening' },
  roles: { worker: 'ASHA Worker', supervisor: 'ASHA Supervisor', admin: 'District Admin' },
  header: {
    pcMode: 'PC Mode',
    mobileMode: 'Mobile',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
    notifications: 'Notifications',
    unread: 'unread',
    openAlerts: 'Open Alerts',
    noNotifications: 'No notifications.',
    markRead: 'Read',
    switchRole: 'Switch Role',
    settings: 'Settings',
    help: 'Help',
    selectLangAria: 'Select Voice and UI Language',
  },
  nav: {
    home: 'Home',
    speakRecord: 'Speak & Record',
    visitRecords: 'Visit Records',
    followups: 'Follow-ups',
    alerts: 'Alerts',
    questionGuide: 'Question Guide',
    fullForm: 'Full Visit Form',
    reports: 'Reports',
    supervisor: 'Supervisor',
    settings: 'Settings',
    help: 'Help',
    toolsSection: 'Field Tools',
    ashaMode: 'ASHA Mode',
    supervisorMode: 'Supervisor',
    voice: 'Voice',
  },
  dashboard: {
    tapAndSpeak: 'Tap & Speak',
    startSpeaking: 'Start Speaking',
    savedVisits: 'Saved Visits',
    visitsDone: 'Visits Done',
    followups: 'Follow-ups',
    alerts: 'Alerts',
    visitCategory: 'Visit Category',
    pregnancyVisit: 'Pregnancy Visit',
    newbornCare: 'Newborn Care',
    vaccination: 'Vaccination',
    pendingFollowups: 'Pending Follow-ups',
    seeAll: 'See all',
    noPendingFollowups: 'No pending follow-ups.',
    done: 'Done',
    due: 'Due',
    alertsAndRecent: 'Alerts & Recent Visits',
    openAlerts: 'Open Alerts',
    noVisitsYet: 'No visits yet.',
    nextVisitLabel: 'Next visit',
    visitRecorded: 'Visit recorded',
  },
  categories: {
    pregnancy: 'Pregnancy',
    newborn: 'Newborn',
    vaccines: 'Vaccines',
    all: 'All',
  },
  voice: {
    voiceVisit: 'Voice Visit',
    visitCategory: 'Visit Category',
    patient: 'Patient',
    newPatient: 'New Patient',
    autoDetect: 'Auto-detect from speech',
    selectPatient: 'Select patient:',
    tapToSpeak: 'Tap to Speak',
    paused: 'Paused',
    tapToSpeakFix: 'Tap to Speak Fix',
    pause: 'Pause',
    resume: 'Resume',
    done: 'Done',
    cancel: 'Cancel',
    stopReading: 'Stop Reading',
    whatYouSpeak: 'What You Speak',
    listeningLabel: 'Listening...',
    tapMicAndSpeak: 'Tap mic and speak',
    sampleVisits: 'Sample Visits',
    addPatient: 'Add Patient',
    patientName: 'Patient Name',
    category: 'Category',
    area: 'Area',
    add: 'Add',
    saving: 'Saving...',
    noSpeechDetected: 'No speech detected. Tap microphone to try again.',
    micUnavailable: 'Microphone unavailable in this browser.',
    pausedStatus: 'Recording paused — tap Resume to continue',
    cancelledStatus: 'Recording cancelled',
    noiseWarning: 'High background noise — speak close to microphone.',
    samplePregnancy: 'Pregnancy Visit · Nandini',
    sampleNewborn: 'Newborn Visit · Baby of Rekha',
    sampleVaccines: 'Vaccines Visit · Aarav',
    sampleDanger: 'Danger Alert Sample',
    typeOrEdit: 'Edit / Type',
    fillForm: 'Fill Form',
    transcriptPlaceholder: 'Speak or type visit details (e.g., Name Priya, weight 52 kg, BP 120/80)...',
    sttUnavailableHint: 'Speech server unavailable — please check microphone or tap Edit / Type in What You Speak.',
    states: {
      IDLE: 'READY',
      LISTENING: 'LISTENING',
      PAUSED: 'PAUSED',
      PROCESSING: 'FILLING',
      VERIFYING: 'CHECKING',
      SPEAKING: 'READING',
      WAITING_CONFIRMATION: 'CHECK FORM',
      SAVING: 'SAVING',
      COMPLETED: 'SAVED',
      DANGER_ALERT: 'ALERT',
    },
  },
  form: {
    visitForm: 'Visit Form',
    edit: 'Edit',
    done: 'Done',
    ashaWorker: 'ASHA Worker',
    dateTime: 'Date & Time',
    patientName: 'Patient Name',
    patientWeight: 'Weight',
    babyWeight: 'Baby Weight',
    bp: 'BP',
    pregnancyCondition: 'Pregnancy Condition',
    babyCondition: 'Baby Condition',
    condition: 'Condition',
    babyGender: 'Baby Gender',
    girl: 'Girl',
    boy: 'Boy',
    vaccinesProvided: 'Vaccines Provided',
    vaccinesGiven: 'Vaccines Given',
    vaccinesDue: 'Vaccines Due',
    due: 'Due',
    precautions: 'Precautions',
    nextVisit: 'Next Visit',
    readAloud: 'Read Aloud',
    stop: 'Stop',
    speakFix: 'Speak Fix',
    saveDraft: 'Save Draft',
    saving: 'Saving...',
    safeVisit: 'Safe visit',
    safetyAlert: 'Safety Alert',
    safetyPromptFallback: 'Danger symptom mentioned. Is it present?',
    yesAlert: 'Yes — Alert',
    noSafe: 'No — Safe',
    changed: 'Changed',
    empty: 'empty',
    visitSavedPrefix: 'VISIT SAVED',
    startNextVisit: 'Start Next Visit',
    nextActionsGenerated: 'Follow-ups created:',
    savedLocally: 'Saved locally. Will sync when online.',
    draftSavedLocal: 'Draft saved locally.',
    draftSavedServer: 'Draft saved.',
    visitSavedSpeech: (name) => `Visit saved for ${name}.`,
  },
  readback: {
    intro: 'Recorded visit details.',
    beneficiaryName: 'Patient',
    beneficiaryId: 'ID',
    visitType: 'Category',
    weight: 'Weight',
    babyWeight: 'Baby weight',
    bp: 'Blood pressure',
    condition: 'Condition',
    ifa: 'IFA tablets',
    vaccination: 'Td vaccine',
    feeding: 'Feeding',
    immChecked: 'Vaccination record checked.',
    vaccinesGiven: 'Vaccines given',
    vaccinesDue: 'Vaccines due',
    precautions: 'Precautions',
    nextVisit: 'Next visit',
    kilograms: 'kg',
    confirmedSaving: 'Confirmed. Saving visit record.',
    updatedFieldPrompt: (f, v) => `Updated ${f} to ${v}. Should I save?`,
    askWeight: 'Please say the exact weight in kg.',
    askBp: 'Please say the blood pressure, for example 120 by 80.',
    askDate: 'Please say the next visit date clearly.',
    askClarification: 'Say the field to change like weight, BP, next visit date, or say yes to save.',
  },
  questions: {
    title: 'Question Guide',
    startVoiceVisit: 'Start Voice Visit',
    filterPlaceholder: 'Search questions...',
    checklistProgress: 'Checklist Progress',
    answered: 'answered',
    speakPrompt: 'Speak',
  },
  fullForm: {
    title: 'Full Visit Form',
    backToVoice: 'Back to Voice',
    notProvided: 'Empty',
    confirmed: 'Confirmed',
    needsConfirmation: 'Check',
    beneficiary: 'Patient',
    selectBeneficiary: 'Select patient',
    motherWeightKg: 'Weight (kg)',
    bloodPressure: 'Blood Pressure',
    ifaTablets: 'IFA Tablets',
    tdVaccine: 'Td / TT Vaccine',
    notReported: 'Not reported',
    takingRegularly: 'Taking regularly',
    suppliedToday: 'Supplied today',
    notTaking: 'Not taking',
    completed: 'Completed',
    due: 'Due',
    partial: 'Partial',
    feedingStatus: 'Feeding',
    temperature: 'Temperature',
    observations: 'Notes',
    observationsPlaceholder: 'Spoken notes appear here...',
    confirmAndSaveVisit: 'Confirm & Save',
    draftNotice: 'Draft saved.',
  },
  history: {
    followupsTitle: 'Follow-ups',
    addFollowup: 'Add Follow-up',
    pending: 'pending',
    noFollowups: 'No follow-ups.',
    completed: 'Completed',
    reschedule: 'Reschedule',
    markComplete: 'Done',
    saveDate: 'Save',
    visitsTitle: 'Visit Records',
    recordsCount: 'records',
    searchPlaceholder: 'Search name, ID, notes...',
    noVisits: 'No matching visits.',
    safety: 'Safety',
    viewEdit: 'Edit',
    transcriptLabel: 'Spoken Notes',
    observationsLabel: 'Notes',
    close: 'Close',
    saveChanges: 'Save',
    taskDescription: 'Task',
    priority: 'Priority',
    dueDate: 'Due Date',
    saveFollowup: 'Save',
  },
  alerts: {
    title: 'Alerts & Referrals',
    all: 'All',
    unread: 'Unread',
    critical: 'Critical',
    noAlerts: 'No alerts.',
    markRead: 'Mark Read',
    read: 'Read',
    referralLog: 'PHC Referrals',
    referralsCount: 'referrals',
    noReferrals: 'No referrals.',
    acknowledge: 'Acknowledge PHC Referral',
    acknowledgedPhc: 'Acknowledged by PHC',
    pendingPhc: 'Pending PHC',
  },
  reports: {
    title: 'Reports',
    downloadPdf: 'Download PDF',
    downloadCsv: 'Download CSV',
    visitRecords: 'Visit Records',
    dateTime: 'Date & Time',
    ashaWorker: 'ASHA Worker',
    category: 'Category',
    patient: 'Patient',
    vitalsCol: 'Weight / BP / Gender',
    clinicalCol: 'Condition / Vaccines',
    precautions: 'Precautions',
    nextVisit: 'Next Visit',
    noVisits: 'No visits yet.',
    days7: '7 Days',
    days30: '30 Days',
    visitsLabel: 'Visits',
    categoriesLabel: 'Categories',
    reportHeading: 'ASHA Visit Report',
  },
  settings: {
    title: 'Settings',
    languageSpeech: 'Language & Voice',
    preferredLanguage: 'Language',
    voiceSpeed: 'Voice Speed',
    slowerFaster: 'Slower (0.75x) · Faster (1.35x)',
    testSpeed: 'Test Voice',
    accessibility: 'Display & Sync',
    highContrast: 'High-Contrast Sunlight Mode',
    largerText: 'Larger Text',
    offlineAutoSync: 'Offline Auto-Sync',
    updatedSaved: 'Saved.',
    sampleSpeedText: 'Sample voice read-back speed check.',
  },
  help: {
    title: 'Help & Guide',
    step1Title: '1. Speak Naturally',
    step1Desc: 'Tap microphone and speak in your language with numbers like weight, BP, or dates.',
    step2Title: '2. Verify & Correct',
    step2Desc: 'Review the auto-filled form, listen to read-back, or tap Edit / Speak Fix.',
    step3Title: '3. Offline Sync',
    step3Desc: 'Visits save locally when offline and sync automatically when connected.',
    sampleScenarios: 'Sample Scenarios',
    dangerRulesTitle: 'Danger-Sign Rules',
  },
  emergency: {
    beneficiaryRef: 'Patient',
    unidentified: 'Unidentified Patient',
    detectedAt: 'Time',
    triggeringSigns: 'Danger Signs',
    matchedPhrase: 'Matched',
    savedOffline: 'Saved locally (Offline — Pending PHC Sync)',
    loggedPhc: 'Immediate PHC Referral Logged',
    guardrail: 'Escort or refer the patient to the nearest Primary Health Centre immediately.',
    replayAlert: 'Replay Alert',
    acknowledgeReturn: 'Open Alerts',
  },
  offline: {
    offlineQueued: (c) => `Offline · ${c} pending`,
    readyToSync: (c) => `${c} pending sync`,
    syncNow: 'Sync Now',
    syncing: 'Syncing',
  },
};

function makeLang(overrides: Partial<{
  greetings: Partial<AppTranslations['greetings']>;
  roles: Partial<AppTranslations['roles']>;
  header: Partial<AppTranslations['header']>;
  nav: Partial<AppTranslations['nav']>;
  dashboard: Partial<AppTranslations['dashboard']>;
  categories: Partial<AppTranslations['categories']>;
  voice: Partial<AppTranslations['voice']> & { states?: Partial<AppTranslations['voice']['states']> };
  form: Partial<AppTranslations['form']>;
  readback: Partial<AppTranslations['readback']>;
  questions: Partial<AppTranslations['questions']>;
  fullForm: Partial<AppTranslations['fullForm']>;
  history: Partial<AppTranslations['history']>;
  alerts: Partial<AppTranslations['alerts']>;
  reports: Partial<AppTranslations['reports']>;
  settings: Partial<AppTranslations['settings']>;
  help: Partial<AppTranslations['help']>;
  emergency: Partial<AppTranslations['emergency']>;
  offline: Partial<AppTranslations['offline']>;
}>): AppTranslations {
  return {
    greetings: { ...EN.greetings, ...overrides.greetings },
    roles: { ...EN.roles, ...overrides.roles },
    header: { ...EN.header, ...overrides.header },
    nav: { ...EN.nav, ...overrides.nav },
    dashboard: { ...EN.dashboard, ...overrides.dashboard },
    categories: { ...EN.categories, ...overrides.categories },
    voice: {
      ...EN.voice,
      ...overrides.voice,
      states: { ...EN.voice.states, ...(overrides.voice?.states ?? {}) },
    },
    form: { ...EN.form, ...overrides.form },
    readback: { ...EN.readback, ...overrides.readback },
    questions: { ...EN.questions, ...overrides.questions },
    fullForm: { ...EN.fullForm, ...overrides.fullForm },
    history: { ...EN.history, ...overrides.history },
    alerts: { ...EN.alerts, ...overrides.alerts },
    reports: { ...EN.reports, ...overrides.reports },
    settings: { ...EN.settings, ...overrides.settings },
    help: { ...EN.help, ...overrides.help },
    emergency: { ...EN.emergency, ...overrides.emergency },
    offline: { ...EN.offline, ...overrides.offline },
  };
}

export const TRANSLATIONS: Record<LanguageCode, AppTranslations> = {
  en: EN,
  kn: makeLang({
    greetings: { morning: 'ಶುಭೋದಯ', afternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ', evening: 'ಶುಭ ಸಂಜೆ' },
    roles: { worker: 'ಆಶಾ ಕಾರ್ಯಕರ್ತೆ', supervisor: 'ಆಶಾ ಮೇಲ್ವಿಚಾರಕರು', admin: 'ಜಿಲ್ಲಾ ಆಡಳಿತ' },
    header: {
      pcMode: 'ಪಿಸಿ ಮೋಡ್',
      mobileMode: 'ಮೊಬೈಲ್',
      online: 'ಆನ್‌ಲೈನ್',
      offline: 'ಆಫ್‌ಲೈನ್',
      syncing: 'ಸಿಂಕ್',
      notifications: 'ಸೂಚನೆಗಳು',
      unread: 'ಓದದಿರುವವು',
      openAlerts: 'ಎಚ್ಚರಿಕೆ ತೆರೆಯಿರಿ',
      noNotifications: 'ಸೂಚನೆಗಳಿಲ್ಲ.',
      markRead: 'ಓದಿದೆ',
      switchRole: 'ಪಾತ್ರ ಬದಲಿಸಿ',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      help: 'ಸಹಾಯ',
    },
    nav: {
      home: 'ಮುಖಪುಟ',
      speakRecord: 'ಮಾತನಾಡಿ ದಾಖಲಿಸಿ',
      visitRecords: 'ಭೇಟಿ ದಾಖಲೆಗಳು',
      followups: 'ಮುಂದಿನ ಭೇಟಿ',
      alerts: 'ಎಚ್ಚರಿಕೆಗಳು',
      questionGuide: 'ಪ್ರಶ್ನೆ ಮಾರ್ಗದರ್ಶಿ',
      fullForm: 'ಪೂರ್ಣ ನಮೂನೆ',
      reports: 'ವರದಿಗಳು',
      supervisor: 'ಮೇಲ್ವಿಚಾರಕರು',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      help: 'ಸಹಾಯ',
      toolsSection: 'ಕ್ಷೇತ್ರ ಸಾಧನಗಳು',
      ashaMode: 'ಆಶಾ ಮೋಡ್',
      supervisorMode: 'ಮೇಲ್ವಿಚಾರಕರು',
      voice: 'ಧ್ವನಿ',
    },
    dashboard: {
      tapAndSpeak: 'ಒತ್ತಿ ಮಾತನಾಡಿ',
      startSpeaking: 'ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ',
      savedVisits: 'ಉಳಿಸಿದ ಭೇಟಿಗಳು',
      visitsDone: 'ಪೂರ್ಣ ಭೇಟಿಗಳು',
      followups: 'ಮುಂದಿನ ಭೇಟಿ',
      alerts: 'ಎಚ್ಚರಿಕೆಗಳು',
      visitCategory: 'ಭೇಟಿ ವಿಭಾಗ',
      pregnancyVisit: 'ಗರ್ಭಿಣಿ ಭೇಟಿ',
      newbornCare: 'ನವಜಾತ ಶಿಶು',
      vaccination: 'ಲಸಿಕೆ ಭೇಟಿ',
      pendingFollowups: 'ಬಾಕಿ ಭೇಟಿಗಳು',
      seeAll: 'ಎಲ್ಲ ನೋಡಿ',
      noPendingFollowups: 'ಬಾಕಿ ಕಾರ್ಯಗಳಿಲ್ಲ.',
      done: 'ಮುಗಿಯಿತು',
      due: 'ದಿನಾಂಕ',
      alertsAndRecent: 'ಎಚ್ಚರಿಕೆ ಮತ್ತು ಇತ್ತೀಚಿನ ಭೇಟಿಗಳು',
      openAlerts: 'ಎಚ್ಚರಿಕೆಗಳು',
      noVisitsYet: 'ಭೇಟಿಗಳಿಲ್ಲ.',
      nextVisitLabel: 'ಮುಂದಿನ ಭೇಟಿ',
      visitRecorded: 'ಭೇಟಿ ದಾಖಲಾಗಿದೆ',
    },
    categories: { pregnancy: 'ಗರ್ಭಿಣಿ', newborn: 'ನವಜಾತ ಶಿಶು', vaccines: 'ಲಸಿಕೆ', all: 'ಎಲ್ಲಾ' },
    voice: {
      voiceVisit: 'ಧ್ವನಿ ಭೇಟಿ',
      visitCategory: 'ಭೇಟಿ ವಿಭಾಗ',
      patient: 'ರೋಗಿ / ಫಲಾನುಭವಿ',
      newPatient: 'ಹೊಸ ಫಲಾನುಭವಿ',
      autoDetect: 'ಮಾತಿನಿಂದ ಸ್ವಯಂ ಗುರುತಿಸಿ',
      selectPatient: 'ರೋಗಿಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:',
      tapToSpeak: 'ಮಾತನಾಡಲು ಒತ್ತಿ',
      paused: 'ವಿರಾಮ',
      tapToSpeakFix: 'ತಿದ್ದುಪಡಿಗೆ ಒತ್ತಿ',
      pause: 'ನಿಲ್ಲಿಸಿ',
      resume: 'ಮುಂದುವರಿಸಿ',
      done: 'ಮುಗಿಯಿತು',
      cancel: 'ರದ್ದು',
      stopReading: 'ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
      whatYouSpeak: 'ನೀವು ಹೇಳಿದ್ದು',
      listeningLabel: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ...',
      tapMicAndSpeak: 'ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ',
      sampleVisits: 'ಮಾದರಿ ಭೇಟಿಗಳು',
      addPatient: 'ಹೊಸ ಫಲಾನುಭವಿ ಸೇರಿಸಿ',
      patientName: 'ಹೆಸರು',
      category: 'ವಿಭಾಗ',
      area: 'ಪ್ರದೇಶ',
      add: 'ಸೇರಿಸಿ',
      saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...',
      noSpeechDetected: 'ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      micUnavailable: 'ಮೈಕ್ರೊಫೋನ್ ಲಭ್ಯವಿಲ್ಲ.',
      pausedStatus: 'ರೆಕಾರ್ಡಿಂಗ್ ವಿರಾಮದಲ್ಲಿದೆ',
      cancelledStatus: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
      noiseWarning: 'ಶಬ್ದ ಹೆಚ್ಚಿದೆ — ಮೈಕ್ ಹತ್ತಿರ ಮಾತನಾಡಿ.',
      samplePregnancy: 'ಗರ್ಭಿಣಿ ಭೇಟಿ · ನಂದಿನಿ',
      sampleNewborn: 'ನವಜಾತ ಶಿಶು · ರೇಖಾ ಮಗು',
      sampleVaccines: 'ಲಸಿಕೆ ಭೇಟಿ · ಆರವ್',
      sampleDanger: 'ಅಪಾಯದ ಎಚ್ಚರಿಕೆ ಮಾದರಿ',
      typeOrEdit: 'ತಿದ್ದು / ಬರೆಯಿರಿ',
      fillForm: 'ನಮೂನೆ ತುಂಬಿ',
      transcriptPlaceholder: 'ಭೇಟಿ ವಿವರಗಳನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ (ಉದಾ: ಹೆಸರು ಪ್ರಿಯಾ, ತೂಕ 52 ಕೆಜಿ, ಬಿಪಿ 120/80)...',
      sttUnavailableHint: 'ಧ್ವನಿ ಸರ್ವರ್ ಲಭ್ಯವಿಲ್ಲ — ಮೈಕ್ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ನೀವು ಹೇಳಿದ್ದರಲ್ಲಿ ತಿದ್ದು / ಬರೆಯಿರಿ ಒತ್ತಿ.',
      states: {
        IDLE: 'ಸಿದ್ಧ',
        LISTENING: 'ಕೇಳುತ್ತಿದೆ',
        PAUSED: 'ವಿರಾಮ',
        PROCESSING: 'ತುಂಬುತ್ತಿದೆ',
        VERIFYING: 'ಪರಿಶೀಲನೆ',
        SPEAKING: 'ಓದುತ್ತಿದೆ',
        WAITING_CONFIRMATION: 'ಪರಿಶೀಲಿಸಿ',
        SAVING: 'ಉಳಿಸುತ್ತಿದೆ',
        COMPLETED: 'ಉಳಿಸಲಾಗಿದೆ',
        DANGER_ALERT: 'ಎಚ್ಚರಿಕೆ',
      },
    },
    form: {
      visitForm: 'ಭೇಟಿ ನಮೂನೆ',
      edit: 'ತಿದ್ದು',
      done: 'ಸರಿ',
      ashaWorker: 'ಆಶಾ ಕಾರ್ಯಕರ್ತೆ',
      dateTime: 'ದಿನಾಂಕ ಮತ್ತು ಸಮಯ',
      patientName: 'ಹೆಸರು',
      patientWeight: 'ತೂಕ',
      babyWeight: 'ಮಗುವಿನ ತೂಕ',
      bp: 'ರಕ್ತದೊತ್ತಡ (BP)',
      pregnancyCondition: 'ಗರ್ಭಾವಸ್ಥೆಯ ಸ್ಥಿತಿ',
      babyCondition: 'ಮಗುವಿನ ಸ್ಥಿತಿ',
      condition: 'ಸ್ಥಿತಿ',
      babyGender: 'ಮಗುವಿನ ಲಿಂಗ',
      girl: 'ಹೆಣ್ಣು',
      boy: 'ಗಂಡು',
      vaccinesProvided: 'ನೀಡಿದ ಲಸಿಕೆಗಳು',
      vaccinesGiven: 'ನೀಡಿದ ಲಸಿಕೆ',
      vaccinesDue: 'ಬಾಕಿ ಲಸಿಕೆ',
      due: 'ಬಾಕಿ',
      precautions: 'ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು',
      nextVisit: 'ಮುಂದಿನ ಭೇಟಿ',
      readAloud: 'ಓದಿ ಕೇಳಿ',
      stop: 'ನಿಲ್ಲಿಸಿ',
      speakFix: 'ಧ್ವನಿ ತಿದ್ದುಪಡಿ',
      saveDraft: 'ಡ್ರಾಫ್ಟ್ ಉಳಿಸಿ',
      saving: 'ಉಳಿಸುತ್ತಿದೆ...',
      safeVisit: 'ಸುರಕ್ಷಿತ ಭೇಟಿ',
      safetyAlert: 'ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ',
      safetyPromptFallback: 'ಅಪಾಯದ ಲಕ್ಷಣ ತಿಳಿಸಲಾಗಿದೆ. ಇದೆಯೇ?',
      yesAlert: 'ಹೌದು — ಎಚ್ಚರಿಕೆ',
      noSafe: 'ಇಲ್ಲ — ಸುರಕ್ಷಿತ',
      changed: 'ಬದಲಾಯಿಸಲಾಗಿದೆ',
      empty: 'ಖಾಲಿ',
      visitSavedPrefix: 'ಭೇಟಿ ಉಳಿಸಲಾಗಿದೆ',
      startNextVisit: 'ಮುಂದಿನ ಭೇಟಿ ಪ್ರಾರಂಭಿಸಿ',
      nextActionsGenerated: 'ಮುಂದಿನ ಕ್ರಮಗಳು:',
      savedLocally: 'ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ. ಆನ್‌ಲೈನ್ ಆದಾಗ ಸಿಂಕ್ ಆಗುತ್ತದೆ.',
      draftSavedLocal: 'ಡ್ರಾಫ್ಟ್ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ.',
      draftSavedServer: 'ಡ್ರಾಫ್ಟ್ ಉಳಿಸಲಾಗಿದೆ.',
      visitSavedSpeech: (n) => `${n} ಅವರ ಭೇಟಿ ದಾಖಲೆ ಉಳಿಸಲಾಗಿದೆ.`,
    },
    readback: {
      intro: 'ದಾಖಲಿಸಿದ ಭೇಟಿ ವಿವರಗಳು.',
      beneficiaryName: 'ಹೆಸರು',
      beneficiaryId: 'ಐಡಿ',
      visitType: 'ವಿಭಾಗ',
      weight: 'ತೂಕ',
      babyWeight: 'ಮಗುವಿನ ತೂಕ',
      bp: 'ಬಿಪಿ',
      condition: 'ಸ್ಥಿತಿ',
      ifa: 'ಐಎಫ್‌ಎ ಮಾತ್ರೆ',
      vaccination: 'ಟಿಡಿ ಲಸಿಕೆ',
      feeding: 'ಹಾಲುಣಿಸುವಿಕೆ',
      immChecked: 'ಲಸಿಕೆ ಕಾರ್ಡ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.',
      vaccinesGiven: 'ನೀಡಿದ ಲಸಿಕೆಗಳು',
      vaccinesDue: 'ಬಾಕಿ ಲಸಿಕೆಗಳು',
      precautions: 'ಮುನ್ನೆಚ್ಚರಿಕೆ',
      nextVisit: 'ಮುಂದಿನ ಭೇಟಿ',
      kilograms: 'ಕೆಜಿ',
      confirmedSaving: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ. ದಾಖಲೆ ಉಳಿಸಲಾಗುತ್ತಿದೆ.',
      updatedFieldPrompt: (f, v) => `${f} ಅನ್ನು ${v} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಉಳಿಸಲೇ?`,
      askWeight: 'ದಯವಿಟ್ಟು ತೂಕವನ್ನು ಕೆಜಿಯಲ್ಲಿ ಹೇಳಿ.',
      askBp: 'ದಯವಿಟ್ಟು ಬಿಪಿ ಮೌಲ್ಯವನ್ನು ಹೇಳಿ, ಉದಾಹರಣೆಗೆ 120 ಬೈ 80.',
      askDate: 'ದಯವಿಟ್ಟು ಮುಂದಿನ ಭೇಟಿ ದಿನಾಂಕವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.',
      askClarification: 'ತೂಕ, ಬಿಪಿ, ಅಥವಾ ಮುಂದಿನ ಭೇಟಿ ದಿನಾಂಕ ಹೇಳಿ, ಅಥವಾ ಉಳಿಸಲು ಹೌದು ಎಂದು ಹೇಳಿ.',
    },
    questions: {
      title: 'ಪ್ರಶ್ನೆ ಮಾರ್ಗದರ್ಶಿ',
      startVoiceVisit: 'ಧ್ವನಿ ಭೇಟಿ ಪ್ರಾರಂಭಿಸಿ',
      filterPlaceholder: 'ಪ್ರಶ್ನೆ ಹುಡುಕಿ...',
      checklistProgress: 'ಪ್ರಶ್ನೆಗಳ ಪೂರ್ಣತೆ',
      answered: 'ಉತ್ತರಿಸಲಾಗಿದೆ',
      speakPrompt: 'ಕೇಳಿ',
    },
    fullForm: {
      title: 'ಪೂರ್ಣ ಭೇಟಿ ನಮೂನೆ',
      backToVoice: 'ಧ್ವನಿ ಭೇಟಿಗೆ ಹಿಂತಿರುಗಿ',
      notProvided: 'ಖಾಲಿ',
      confirmed: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ',
      needsConfirmation: 'ಪರಿಶೀಲಿಸಿ',
      beneficiary: 'ಫಲಾನುಭವಿ',
      selectBeneficiary: 'ಫಲಾನುಭವಿ ಆಯ್ಕೆ',
      motherWeightKg: 'ತೂಕ (ಕೆಜಿ)',
      bloodPressure: 'ರಕ್ತದೊತ್ತಡ',
      ifaTablets: 'ಐಎಫ್‌ಎ ಮಾತ್ರೆ',
      tdVaccine: 'ಟಿಡಿ / ಟಿಟಿ ಲಸಿಕೆ',
      notReported: 'ತಿಳಿಸಿಲ್ಲ',
      takingRegularly: 'ನಿಯಮಿತವಾಗಿ ಸೇವಿಸುತ್ತಿದ್ದಾರೆ',
      suppliedToday: 'ಇಂದು ನೀಡಲಾಗಿದೆ',
      notTaking: 'ತೆಗೆದುಕೊಳ್ಳುತ್ತಿಲ್ಲ',
      completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
      due: 'ಬಾಕಿ ಇದೆ',
      partial: 'ಭಾಗಶಃ',
      feedingStatus: 'ಹಾಲುಣಿಸುವಿಕೆ',
      temperature: 'ತಾಪಮಾನ',
      observations: 'ಟಿಪ್ಪಣಿ',
      observationsPlaceholder: 'ಮಾತಿನ ವಿವರ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ...',
      confirmAndSaveVisit: 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಉಳಿಸಿ',
      draftNotice: 'ಡ್ರಾಫ್ಟ್ ಉಳಿಸಲಾಗಿದೆ.',
    },
    history: {
      followupsTitle: 'ಮುಂದಿನ ಭೇಟಿಗಳು',
      addFollowup: 'ಸೇರಿಸಿ',
      pending: 'ಬಾಕಿ',
      noFollowups: 'ಮುಂದಿನ ಭೇಟಿಗಳಿಲ್ಲ.',
      completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
      reschedule: 'ದಿನಾಂಕ ಬದಲಿಸಿ',
      markComplete: 'ಮುಗಿಯಿತು',
      saveDate: 'ಉಳಿಸಿ',
      visitsTitle: 'ಭೇಟಿ ದಾಖಲೆಗಳು',
      recordsCount: 'ದಾಖಲೆಗಳು',
      searchPlaceholder: 'ಹೆಸರು, ಐಡಿ ಹುಡುಕಿ...',
      noVisits: 'ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ.',
      safety: 'ಸುರಕ್ಷತೆ',
      viewEdit: 'ತಿದ್ದು',
      transcriptLabel: 'ಹೇಳಿದ ವಿವರ',
      observationsLabel: 'ಟಿಪ್ಪಣಿ',
      close: 'ಮುಚ್ಚಿ',
      saveChanges: 'ಉಳಿಸಿ',
      taskDescription: 'ಕಾರ್ಯ',
      priority: 'ಆದ್ಯತೆ',
      dueDate: 'ದಿನಾಂಕ',
      saveFollowup: 'ಉಳಿಸಿ',
    },
    alerts: {
      title: 'ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ರೆಫರಲ್',
      all: 'ಎಲ್ಲಾ',
      unread: 'ಓದದವು',
      critical: 'ತುರ್ತು',
      noAlerts: 'ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.',
      markRead: 'ಓದಿದೆ',
      read: 'ಓದಲಾಗಿದೆ',
      referralLog: 'PHC ರೆಫರಲ್‌ಗಳು',
      referralsCount: 'ರೆಫರಲ್‌ಗಳು',
      noReferrals: 'ರೆಫರಲ್‌ಗಳಿಲ್ಲ.',
      acknowledge: 'PHC ರೆಫರಲ್ ದೃಢೀಕರಿಸಿ',
      acknowledgedPhc: 'PHC ದೃಢೀಕರಿಸಿದೆ',
      pendingPhc: 'PHC ಪರಿಶೀಲನೆ ಬಾಕಿ',
    },
    reports: {
      title: 'ವರದಿಗಳು',
      downloadPdf: 'PDF ಡೌನ್‌ಲೋಡ್',
      downloadCsv: 'CSV ಡೌನ್‌ಲೋಡ್',
      visitRecords: 'ಭೇಟಿ ದಾಖಲೆಗಳು',
      dateTime: 'ದಿನಾಂಕ ಮತ್ತು ಸಮಯ',
      ashaWorker: 'ಆಶಾ ಕಾರ್ಯಕರ್ತೆ',
      category: 'ವಿಭಾಗ',
      patient: 'ಫಲಾನುಭವಿ',
      vitalsCol: 'ತೂಕ / ಬಿಪಿ / ಲಿಂಗ',
      clinicalCol: 'ಸ್ಥಿತಿ / ಲಸಿಕೆ',
      precautions: 'ಮುನ್ನೆಚ್ಚರಿಕೆ',
      nextVisit: 'ಮುಂದಿನ ಭೇಟಿ',
      noVisits: 'ಯಾವುದೇ ಭೇಟಿಗಳಿಲ್ಲ.',
      days7: '7 ದಿನ',
      days30: '30 ದಿನ',
      visitsLabel: 'ಭೇಟಿಗಳು',
      categoriesLabel: 'ವಿಭಾಗಗಳು',
      reportHeading: 'ಆಶಾ ಭೇಟಿ ವರದಿ',
    },
    settings: {
      title: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      languageSpeech: 'ಭಾಷೆ ಮತ್ತು ಧ್ವನಿ',
      preferredLanguage: 'ಭಾಷೆ',
      voiceSpeed: 'ಧ್ವನಿ ವೇಗ',
      slowerFaster: 'ನಿಧಾನ (0.75x) · ವೇಗ (1.35x)',
      testSpeed: 'ಧ್ವನಿ ಪರೀಕ್ಷಿಸಿ',
      accessibility: 'ದೃಶ್ಯ ಮತ್ತು ಸಿಂಕ್',
      highContrast: 'ಬಿಸಿಲು ಹೈ-ಕಾಂಟ್ರಾಸ್ಟ್ ಮೋಡ್',
      largerText: 'ದೊಡ್ಡ ಅಕ್ಷರ',
      offlineAutoSync: 'ಆಫ್‌ಲೈನ್ ಆಟೋ-ಸಿಂಕ್',
      updatedSaved: 'ಉಳಿಸಲಾಗಿದೆ.',
      sampleSpeedText: 'ಆಶಾ ಧ್ವನಿ ವೇಗ ಪರೀಕ್ಷಾ ಸಂದೇಶ.',
    },
    help: {
      title: 'ಸಹಾಯ ಮತ್ತು ಮಾರ್ಗದರ್ಶಿ',
      step1Title: '1. ಸಹಜವಾಗಿ ಮಾತನಾಡಿ',
      step1Desc: 'ಮೈಕ್ ಒತ್ತಿ ಕನ್ನಡದಲ್ಲಿ ತೂಕ, ಬಿಪಿ, ಮತ್ತು ದಿನಾಂಕಗಳನ್ನು ಹೇಳಿ.',
      step2Title: '2. ಪರಿಶೀಲಿಸಿ ಮತ್ತು ತಿದ್ದಿ',
      step2Desc: 'ಸ್ವಯಂ ತುಂಬಿದ ನಮೂನೆಯನ್ನು ಕೇಳಿ ಅಥವಾ ತಿದ್ದಿ.',
      step3Title: '3. ಆಫ್‌ಲೈನ್ ಸುರಕ್ಷತೆ',
      step3Desc: 'ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲದಾಗ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಿ ನಂತರ ಸಿಂಕ್ ಆಗುತ್ತದೆ.',
      sampleScenarios: 'ಮಾದರಿ ಸನ್ನಿವೇಶಗಳು',
      dangerRulesTitle: 'ಅಪಾಯದ ಚಿಹ್ನೆ ನಿಯಮಗಳು',
    },
    emergency: {
      beneficiaryRef: 'ಫಲಾನುಭವಿ',
      unidentified: 'ಗುರುತಿಸದ ಫಲಾನುಭವಿ',
      detectedAt: 'ಸಮಯ',
      triggeringSigns: 'ಅಪಾಯದ ಚಿಹ್ನೆಗಳು',
      matchedPhrase: 'ಪತ್ತೆಯಾದ ಮಾತು',
      savedOffline: 'ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ (ಆಫ್‌ಲೈನ್)',
      loggedPhc: 'ತಕ್ಷಣ PHC ರೆಫರಲ್ ದಾಖಲಾಗಿದೆ',
      guardrail: 'ದಯವಿಟ್ಟು ತಕ್ಷಣ ಹತ್ತಿರದ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಕರೆದೊಯ್ಯಿರಿ.',
      replayAlert: 'ಎಚ್ಚರಿಕೆ ಮತ್ತೆ ಕೇಳಿ',
      acknowledgeReturn: 'ಎಚ್ಚರಿಕೆ ನೋಡಿ',
    },
    offline: {
      offlineQueued: (c) => `ಆಫ್‌ಲೈನ್ · ${c} ಬಾಕಿ`,
      readyToSync: (c) => `${c} ಸಿಂಕ್ ಬಾಕಿ`,
      syncNow: 'ಈಗ ಸಿಂಕ್ ಮಾಡಿ',
      syncing: 'ಸಿಂಕ್ ಆಗುತ್ತಿದೆ',
    },
  }),
  hi: makeLang({
    greetings: { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
    roles: { worker: 'आशा कार्यकर्ता', supervisor: 'आशा पर्यवेक्षक', admin: 'जिला प्रशासक' },
    header: {
      pcMode: 'पीसी मोड',
      mobileMode: 'मोबाइल',
      online: 'ऑनलाइन',
      offline: 'ऑफ़लाइन',
      syncing: 'सिंक',
      notifications: 'सूचनाएं',
      unread: 'अपठित',
      openAlerts: 'अलर्ट खोलें',
      noNotifications: 'कोई सूचना नहीं।',
      markRead: 'पढ़ा',
      switchRole: 'भूमिका बदलें',
      settings: 'सेटिंग्स',
      help: 'सहायता',
    },
    nav: {
      home: 'होम',
      speakRecord: 'बोलकर दर्ज करें',
      visitRecords: 'भेंट रिकॉर्ड',
      followups: 'फॉलो-अप',
      alerts: 'अलर्ट',
      questionGuide: 'प्रश्न मार्गदर्शिका',
      fullForm: 'पूरा फ़ॉर्म',
      reports: 'रिपोर्ट',
      supervisor: 'सुपरवाइज़र',
      settings: 'सेटिंग्स',
      help: 'सहायता',
      toolsSection: 'फील्ड टूल्स',
      ashaMode: 'आशा मोड',
      supervisorMode: 'सुपरवाइज़र',
      voice: 'आवाज़',
    },
    dashboard: {
      tapAndSpeak: 'दबाएं और बोलें',
      startSpeaking: 'बोलना शुरू करें',
      savedVisits: 'सहेजी गई भेंट',
      visitsDone: 'पूर्ण भेंट',
      followups: 'फॉलो-अप',
      alerts: 'अलर्ट',
      visitCategory: 'भेंट श्रेणी',
      pregnancyVisit: 'गर्भवती जाँच',
      newbornCare: 'नवजात शिशु',
      vaccination: 'टीकाकरण',
      pendingFollowups: 'बाकी फॉलो-अप',
      seeAll: 'सभी देखें',
      noPendingFollowups: 'कोई बाकी फॉलो-अप नहीं।',
      done: 'पूर्ण',
      due: 'तारीख',
      alertsAndRecent: 'अलर्ट और हाल की भेंट',
      openAlerts: 'अलर्ट खोलें',
      noVisitsYet: 'अभी कोई भेंट नहीं।',
      nextVisitLabel: 'अगली भेंट',
      visitRecorded: 'भेंट दर्ज',
    },
    categories: { pregnancy: 'गर्भावस्था', newborn: 'नवजात', vaccines: 'टीके', all: 'सभी' },
    voice: {
      voiceVisit: 'वॉइस विज़िट',
      visitCategory: 'भेंट श्रेणी',
      patient: 'मरीज़ / लाभार्थी',
      newPatient: 'नया लाभार्थी',
      autoDetect: 'बोलने से स्वतः पहचानें',
      selectPatient: 'लाभार्थी चुनें:',
      tapToSpeak: 'बोलने के लिए दबाएं',
      paused: 'रुका हुआ',
      tapToSpeakFix: 'सुधार बोलने के लिए दबाएं',
      pause: 'रोकें',
      resume: 'जारी रखें',
      done: 'पूर्ण',
      cancel: 'रद्द',
      stopReading: 'पढ़ना बंद करें',
      whatYouSpeak: 'आपने जो बोला',
      listeningLabel: 'सुन रहा है...',
      tapMicAndSpeak: 'माइक दबाकर बोलें',
      sampleVisits: 'नमूना भेंट',
      addPatient: 'नया लाभार्थी जोड़ें',
      patientName: 'नाम',
      category: 'श्रेणी',
      area: 'क्षेत्र',
      add: 'जोड़ें',
      saving: 'सेव हो रहा है...',
      noSpeechDetected: 'आवाज़ नहीं मिली। फिर से प्रयास करें।',
      micUnavailable: 'माइक्रोफ़ोन उपलब्ध नहीं है।',
      pausedStatus: 'रिकॉर्डिंग रुकी है',
      cancelledStatus: 'रिकॉर्डिंग रद्द',
      noiseWarning: 'शोर ज़्यादा है — माइक के पास बोलें।',
      samplePregnancy: 'गर्भवती भेंट · नंदिनी',
      sampleNewborn: 'नवजात भेंट · रेखा का शिशु',
      sampleVaccines: 'टीकाकरण · आरव',
      sampleDanger: 'खतरे का संकेत नमूना',
      typeOrEdit: 'बदलें / लिखें',
      fillForm: 'फ़ॉर्म भरें',
      transcriptPlaceholder: 'भेंट का विवरण बोलें या लिखें (जैसे: नाम प्रिया, वजन 52 किलो, बीपी 120/80)...',
      sttUnavailableHint: 'वॉइस सर्वर उपलब्ध नहीं है — माइक जाँचें या आपने जो बोला में बदलें / लिखें दबाएं।',
      states: {
        IDLE: 'तैयार',
        LISTENING: 'सुन रहा है',
        PAUSED: 'रुका',
        PROCESSING: 'भर रहा है',
        VERIFYING: 'जाँच रहा है',
        SPEAKING: 'पढ़ रहा है',
        WAITING_CONFIRMATION: 'फ़ॉर्म जाँचें',
        SAVING: 'सेव हो रहा',
        COMPLETED: 'सेव हुआ',
        DANGER_ALERT: 'अलर्ट',
      },
    },
    form: {
      visitForm: 'भेंट फ़ॉर्म',
      edit: 'बदलें',
      done: 'ठीक',
      ashaWorker: 'आशा कार्यकर्ता',
      dateTime: 'तारीख और समय',
      patientName: 'नाम',
      patientWeight: 'वज़न',
      babyWeight: 'शिशु का वज़न',
      bp: 'बीपी (BP)',
      pregnancyCondition: 'गर्भावस्था स्थिति',
      babyCondition: 'शिशु की स्थिति',
      condition: 'स्थिति',
      babyGender: 'शिशु लिंग',
      girl: 'लड़की',
      boy: 'लड़का',
      vaccinesProvided: 'दिए गए टीके',
      vaccinesGiven: 'दिए गए टीके',
      vaccinesDue: 'बाकी टीके',
      due: 'बाकी',
      precautions: 'सावधानियां',
      nextVisit: 'अगली भेंट',
      readAloud: 'पढ़कर सुनें',
      stop: 'रोकें',
      speakFix: 'बोलकर सुधारें',
      saveDraft: 'ड्राफ्ट सेव',
      saving: 'सेव हो रहा...',
      safeVisit: 'सुरक्षित भेंट',
      safetyAlert: 'सुरक्षा चेतावनी',
      safetyPromptFallback: 'खतरे का लक्षण बताया गया है। क्या यह मौजूद है?',
      yesAlert: 'हाँ — अलर्ट',
      noSafe: 'नहीं — सुरक्षित',
      changed: 'बदला गया',
      empty: 'खाली',
      visitSavedPrefix: 'भेंट सेव हुई',
      startNextVisit: 'अगली भेंट शुरू करें',
      nextActionsGenerated: 'फॉलो-अप बने:',
      savedLocally: 'स्थानीय रूप से सेव। ऑनलाइन होने पर सिंक होगा।',
      draftSavedLocal: 'ड्राफ्ट स्थानीय रूप से सेव।',
      draftSavedServer: 'ड्राफ्ट सेव हुआ।',
      visitSavedSpeech: (n) => `${n} की भेंट रिकॉर्ड सेव हो गई।`,
    },
    readback: {
      intro: 'दर्ज की गई भेंट का विवरण।',
      beneficiaryName: 'नाम',
      beneficiaryId: 'आईडी',
      visitType: 'श्रेणी',
      weight: 'वज़न',
      babyWeight: 'शिशु का वज़न',
      bp: 'बीपी',
      condition: 'स्थिति',
      ifa: 'आईएफए गोली',
      vaccination: 'टीडी टीका',
      feeding: 'दूध पिलाना',
      immChecked: 'टीकाकरण कार्ड जाँचा गया।',
      vaccinesGiven: 'दिए गए टीके',
      vaccinesDue: 'बाकी टीके',
      precautions: 'सावधानियां',
      nextVisit: 'अगली भेंट',
      kilograms: 'किलो',
      confirmedSaving: 'पुष्टि हो गई। रिकॉर्ड सेव किया जा रहा है।',
      updatedFieldPrompt: (f, v) => `${f} को ${v} में अपडेट किया गया। क्या सेव करूँ?`,
      askWeight: 'कृपया वज़न किलो में बोलें।',
      askBp: 'कृपया बीपी बोलें, जैसे 120 बटा 80।',
      askDate: 'कृपया अगली भेंट की तारीख स्पष्ट बोलें।',
      askClarification: 'वज़न, बीपी, या अगली भेंट की तारीख बोलें, या सेव करने के लिए हाँ बोलें।',
    },
    questions: {
      title: 'प्रश्न मार्गदर्शिका',
      startVoiceVisit: 'वॉइस विज़िट शुरू करें',
      filterPlaceholder: 'प्रश्न खोजें...',
      checklistProgress: 'जाँच प्रगति',
      answered: 'पूर्ण',
      speakPrompt: 'सुनें',
    },
    fullForm: {
      title: 'पूरा भेंट फ़ॉर्म',
      backToVoice: 'वॉइस पर वापस',
      notProvided: 'खाली',
      confirmed: 'पक्का',
      needsConfirmation: 'जाँचें',
      beneficiary: 'लाभार्थी',
      selectBeneficiary: 'लाभार्थी चुनें',
      motherWeightKg: 'वज़न (किलो)',
      bloodPressure: 'ब्लड प्रेशर',
      ifaTablets: 'आईएफए गोली',
      tdVaccine: 'टीडी / टीटी टीका',
      notReported: 'दर्ज नहीं',
      takingRegularly: 'नियमित ले रही हैं',
      suppliedToday: 'आज दी गई',
      notTaking: 'नहीं ले रही हैं',
      completed: 'पूर्ण',
      due: 'बाकी',
      partial: 'आंशिक',
      feedingStatus: 'स्तनपान स्थिति',
      temperature: 'तापमान',
      observations: 'टिप्पणी',
      observationsPlaceholder: 'बोलकर दर्ज विवरण यहाँ दिखेगा...',
      confirmAndSaveVisit: 'पुष्टि करें और सेव करें',
      draftNotice: 'ड्राफ्ट सेव हुआ।',
    },
    history: {
      followupsTitle: 'फॉलो-अप',
      addFollowup: 'जोड़ें',
      pending: 'बाकी',
      noFollowups: 'कोई फॉलो-अप नहीं।',
      completed: 'पूर्ण',
      reschedule: 'तारीख बदलें',
      markComplete: 'पूर्ण करें',
      saveDate: 'सेव',
      visitsTitle: 'भेंट रिकॉर्ड',
      recordsCount: 'रिकॉर्ड',
      searchPlaceholder: 'नाम या आईडी खोजें...',
      noVisits: 'कोई रिकॉर्ड नहीं मिला।',
      safety: 'सुरक्षा',
      viewEdit: 'बदलें',
      transcriptLabel: 'बोला गया विवरण',
      observationsLabel: 'टिप्पणी',
      close: 'बंद करें',
      saveChanges: 'सेव करें',
      taskDescription: 'कार्य',
      priority: 'प्राथमिकता',
      dueDate: 'तारीख',
      saveFollowup: 'सेव करें',
    },
    alerts: {
      title: 'अलर्ट और रेफरल',
      all: 'सभी',
      unread: 'अपठित',
      critical: 'गंभीर',
      noAlerts: 'कोई अलर्ट नहीं।',
      markRead: 'पढ़ा चिह्नित करें',
      read: 'पढ़ा हुआ',
      referralLog: 'PHC रेफरल',
      referralsCount: 'रेफरल',
      noReferrals: 'कोई रेफरल नहीं।',
      acknowledge: 'PHC रेफरल स्वीकार करें',
      acknowledgedPhc: 'PHC द्वारा स्वीकृत',
      pendingPhc: 'PHC बाकी',
    },
    reports: {
      title: 'रिपोर्ट',
      downloadPdf: 'PDF डाउनलोड',
      downloadCsv: 'CSV डाउनलोड',
      visitRecords: 'भेंट रिकॉर्ड',
      dateTime: 'तारीख और समय',
      ashaWorker: 'आशा कार्यकर्ता',
      category: 'श्रेणी',
      patient: 'लाभार्थी',
      vitalsCol: 'वज़न / बीपी / लिंग',
      clinicalCol: 'स्थिति / टीके',
      precautions: 'सावधानियां',
      nextVisit: 'अगली भेंट',
      noVisits: 'कोई भेंट नहीं।',
      days7: '7 दिन',
      days30: '30 दिन',
      visitsLabel: 'भेंट',
      categoriesLabel: 'श्रेणियां',
      reportHeading: 'आशा भेंट रिपोर्ट',
    },
    settings: {
      title: 'सेटिंग्स',
      languageSpeech: 'भाषा और आवाज़',
      preferredLanguage: 'भाषा',
      voiceSpeed: 'आवाज़ की गति',
      slowerFaster: 'धीमी (0.75x) · तेज़ (1.35x)',
      testSpeed: 'आवाज़ जाँचें',
      accessibility: 'प्रदर्शन और सिंक',
      highContrast: 'धूप के लिए हाई-कंट्रास्ट मोड',
      largerText: 'बड़ा फ़ॉन्ट',
      offlineAutoSync: 'ऑफ़लाइन ऑटो-सिंक',
      updatedSaved: 'सेव हुआ।',
      sampleSpeedText: 'आशा आवाज़ गति जाँच संदेश।',
    },
    help: {
      title: 'सहायता और मार्गदर्शन',
      step1Title: '1. सहजता से बोलें',
      step1Desc: 'माइक दबाकर अपनी भाषा में वज़न, बीपी और तारीख बोलें।',
      step2Title: '2. जाँचें और सुधारें',
      step2Desc: 'फ़ॉर्म जाँचें, पढ़कर सुनें, या बोलकर सुधारें।',
      step3Title: '3. ऑफ़लाइन सिंक',
      step3Desc: 'नेटवर्क न होने पर डेटा स्थानीय रूप से सुरक्षित रहता है।',
      sampleScenarios: 'नमूना उदाहरण',
      dangerRulesTitle: 'खतरे के संकेत नियम',
    },
    emergency: {
      beneficiaryRef: 'लाभार्थी',
      unidentified: 'अज्ञात लाभार्थी',
      detectedAt: 'समय',
      triggeringSigns: 'खतरे के लक्षण',
      matchedPhrase: 'पहचाना शब्द',
      savedOffline: 'ऑफ़लाइन सहेजा गया (PHC सिंक बाकी)',
      loggedPhc: 'तुरंत PHC रेफरल दर्ज किया गया',
      guardrail: 'कृपया लाभार्थी को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र ले जाएं।',
      replayAlert: 'अलर्ट दोबारा सुनें',
      acknowledgeReturn: 'अलर्ट देखें',
    },
    offline: {
      offlineQueued: (c) => `ऑफ़लाइन · ${c} बाकी`,
      readyToSync: (c) => `${c} सिंक के लिए तैयार`,
      syncNow: 'अभी सिंक करें',
      syncing: 'सिंक हो रहा है',
    },
  }),
  ta: makeLang({
    greetings: { morning: 'காலை வணக்கம்', afternoon: 'மதிய வணக்கம்', evening: 'மாலை வணக்கம்' },
    roles: { worker: 'ஆஷா பணியாளர்', supervisor: 'ஆஷா மேற்பார்வையாளர்', admin: 'மாவட்ட நிர்வாகி' },
    header: { pcMode: 'பிசி', mobileMode: 'மொபைல்', online: 'ஆன்லைன்', offline: 'ஆஃப்லைன்', notifications: 'அறிவிப்புகள்', openAlerts: 'எச்சரிக்கைகள்', settings: 'அமைப்புகள்', help: 'உதவி' },
    nav: { home: 'முகப்பு', speakRecord: 'பேசி பதிவு செய்', visitRecords: 'பதிவுகள்', followups: 'தொடர் வருகை', alerts: 'எச்சரிக்கைகள்', questionGuide: 'கேள்வி வழிகாட்டி', fullForm: 'முழு படிவம்', reports: 'அறிக்கைகள்', supervisor: 'மேற்பார்வை', settings: 'அமைப்புகள்', help: 'உதவி', toolsSection: 'கருவிகள்', ashaMode: 'ஆஷா', supervisorMode: 'மேற்பார்வை', voice: 'குரல்' },
    dashboard: { tapAndSpeak: 'தொட்டு பேசவும்', startSpeaking: 'பேசத் தொடங்கு', savedVisits: 'பதிவுகள்', visitsDone: 'முடிந்தவை', followups: 'தொடர் வருகை', alerts: 'எச்சரிக்கை', visitCategory: 'வகை', pregnancyVisit: 'கர்ப்பிணி', newbornCare: 'பிறந்த குழந்தை', vaccination: 'தடுப்பூசி', pendingFollowups: 'தொடர் வருகைகள்', seeAll: 'அனைத்தும்', done: 'முடிந்தது', due: 'தேதி', alertsAndRecent: 'எச்சரிக்கை & சமீபத்தியவை', openAlerts: 'திற', noVisitsYet: 'பதிவுகள் இல்லை.' },
    categories: { pregnancy: 'கர்ப்பிணி', newborn: 'பிறந்த குழந்தை', vaccines: 'தடுப்பூசி', all: 'அனைத்தும்' },
    voice: { voiceVisit: 'குரல் பதிவு', visitCategory: 'வகை', patient: 'நோயாளி', newPatient: 'புதியவர்', autoDetect: 'பேச்சிலிருந்து அறியவும்', tapToSpeak: 'பேச தட்டவும்', paused: 'இடைநிறுத்தம்', pause: 'நிறுத்து', resume: 'தொடர்', done: 'முடிந்தது', cancel: 'ரத்து', whatYouSpeak: 'நீங்கள் பேசியது', listeningLabel: 'கேட்கிறது...', tapMicAndSpeak: 'மைக் தட்டி பேசவும்', sampleVisits: 'மாதிரிகள்', samplePregnancy: 'கர்ப்பிணி வருகை · நந்தினி', sampleNewborn: 'பிறந்த குழந்தை · ரேகா', sampleVaccines: 'தடுப்பூசி · ஆரவ்', sampleDanger: 'அபாய எச்சரிக்கை மாதிரி', typeOrEdit: 'திருத்து / தட்டச்சு', fillForm: 'படிவம் நிரப்பு', transcriptPlaceholder: 'பெயர், எடை, பிபி விவரங்களை பேசவும் அல்லது தட்டச்சு செய்யவும்...', sttUnavailableHint: 'குரல் சேவையகம் கிடைக்கவில்லை — நீங்கள் பேசியதில் திருத்து / தட்டச்சு பயன்படுத்தவும்.' },
    form: { visitForm: 'பதிவு படிவம்', edit: 'திருத்து', done: 'சரி', ashaWorker: 'ஆஷா பணியாளர்', dateTime: 'தேதி & நேரம்', patientName: 'பெயர்', patientWeight: 'எடை', babyWeight: 'குழந்தை எடை', bp: 'ரத்த அழுத்தம் (BP)', pregnancyCondition: 'நிலை', babyCondition: 'குழந்தை நிலை', condition: 'நிலை', babyGender: 'பாலினம்', girl: 'பெண்', boy: 'ஆண்', vaccinesProvided: 'தடுப்பூசிகள்', precautions: 'முன்னெச்சரிக்கை', nextVisit: 'அடுத்த வருகை', readAloud: 'படித்துக் காட்டு', speakFix: 'பேசி திருத்து', saveDraft: 'வரைவு', safeVisit: 'பாதுகாப்பான வருகை', safetyAlert: 'பாதுகாப்பு எச்சரிக்கை', visitSavedSpeech: (n) => `${n} பதிவு சேமிக்கப்பட்டது.` },
    readback: { intro: 'பதிவு விவரங்கள்.', beneficiaryName: 'பெயர்', weight: 'எடை', babyWeight: 'குழந்தை எடை', bp: 'பிபி', condition: 'நிலை', precautions: 'முன்னெச்சரிக்கை', nextVisit: 'அடுத்த வருகை', kilograms: 'கிலோ', confirmedSaving: 'உறுதி செய்யப்பட்டது. சேமிக்கிறது.' },
    questions: { title: 'கேள்வி வழிகாட்டி', startVoiceVisit: 'குரல் பதிவு', filterPlaceholder: 'தேடு...', checklistProgress: 'முன்னேற்றம்', answered: 'பதில்', speakPrompt: 'கேள்' },
    reports: { title: 'அறிக்கைகள்', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'பதிவுகள்' },
    settings: { title: 'அமைப்புகள்', languageSpeech: 'மொழி & குரல்', preferredLanguage: 'மொழி', voiceSpeed: 'வேகம்', testSpeed: 'சோதனை', accessibility: 'காட்சி & ஒத்திசைவு' },
  }),
  te: makeLang({
    greetings: { morning: 'శుభోదయం', afternoon: 'శుభ మధ్యాహ్నం', evening: 'శుభ సాయంత్రం' },
    roles: { worker: 'ఆశా కార్యకర్త', supervisor: 'పర్యవేక్షకుడు', admin: 'జిల్లా అడ్మిన్' },
    header: { pcMode: 'పీసీ', mobileMode: 'మొబైల్', online: 'ఆన్‌లైన్', offline: 'ఆఫ్‌లైన్', notifications: 'సూచనలు', openAlerts: 'అలర్ట్‌లు', settings: 'సెట్టింగ్స్', help: 'సహాయం' },
    nav: { home: 'హోమ్', speakRecord: 'మాట్లాడి నమోదు', visitRecords: 'రికార్డులు', followups: 'తదుపరి భేటీ', alerts: 'అలర్ట్‌లు', questionGuide: 'ప్రశ్నల గైడ్', fullForm: 'పూర్తి ఫారమ్', reports: 'నివేదికలు', supervisor: 'సూపర్‌వైజర్', settings: 'సెట్టింగ్స్', help: 'సహాయం', voice: 'వాయిస్' },
    dashboard: { tapAndSpeak: 'నొక్కి మాట్లాడండి', startSpeaking: 'మాట్లాడటం ప్రారంభించండి', savedVisits: 'సేవ్ చేసినవి', visitsDone: 'పూర్తయినవి', followups: 'తదుపరి భేటీ', alerts: 'అలర్ట్‌లు', visitCategory: 'విభాగం', pregnancyVisit: 'గర్భిణీ', newbornCare: 'నవజాత శిశువు', vaccination: 'టీకాలు', pendingFollowups: 'పెండింగ్ పనులు', seeAll: 'అన్నీ', done: 'పూర్తి', alertsAndRecent: 'అలర్ట్‌లు & ఇటీవలి భేటీలు', openAlerts: 'తెరవండి' },
    categories: { pregnancy: 'గర్భిణీ', newborn: 'నవజాత శిశువు', vaccines: 'టీకాలు', all: 'అన్నీ' },
    voice: { voiceVisit: 'వాయిస్ భేటీ', visitCategory: 'విభాగం', patient: 'రోగి / లబ్ధిదారు', newPatient: 'కొత్తవారు', autoDetect: 'మాట ద్వారా గుర్తించు', tapToSpeak: 'మాట్లాడటానికి నొక్కండి', paused: 'ఆగింది', pause: 'ఆపు', resume: 'కొనసాగించు', done: 'పూర్తి', cancel: 'రద్దు', whatYouSpeak: 'మీరు మాట్లాడినది', listeningLabel: 'వింటోంది...', tapMicAndSpeak: 'మైక్ నొక్కి మాట్లాడండి', sampleVisits: 'నమూనా భేటీలు', samplePregnancy: 'గర్భిణీ భేటీ · నందిని', sampleNewborn: 'నవజాత శిశువు · రేఖ', sampleVaccines: 'టీకాల భేటీ · ఆరవ్', sampleDanger: 'ప్రమాద హెచ్చరిక నమూనా', typeOrEdit: 'మార్చు / టైప్ చేయండి', fillForm: 'ఫారమ్ నింపండి', transcriptPlaceholder: 'పేరు, బరువు, బీపీ వివరాలను మాట్లాడండి లేదా టైప్ చేయండి...', sttUnavailableHint: 'వాయిస్ సర్వర్ అందుబాటులో లేదు — మీరు మాట్లాడినదిలో మార్చు / టైప్ ఉపయోగించండి.' },
    form: { visitForm: 'భేటీ ఫారమ్', edit: 'మార్చు', done: 'సరే', ashaWorker: 'ఆశా కార్యకర్త', dateTime: 'తేదీ & సమయం', patientName: 'పేరు', patientWeight: 'బరువు', babyWeight: 'శిశువు బరువు', bp: 'బీపీ (BP)', pregnancyCondition: 'స్థితి', babyCondition: 'శిశువు స్థితి', condition: 'స్థితి', babyGender: 'లింగం', girl: 'ఆడపిల్ల', boy: 'మగపిల్ల', vaccinesProvided: 'ఇచ్చిన టీకాలు', precautions: 'జాగ్రత్తలు', nextVisit: 'తదుపరి భేటీ', readAloud: 'చదివి వినిపించు', speakFix: 'మాటతో సరిచేయండి', saveDraft: 'డ్రాఫ్ట్', safeVisit: 'సురక్షిత భేటీ', safetyAlert: 'భద్రతా హెచ్చరిక', visitSavedSpeech: (n) => `${n} భేటీ సేవ్ అయింది.` },
    readback: { intro: 'నమోదు చేసిన వివరాలు.', beneficiaryName: 'పేరు', weight: 'బరువు', babyWeight: 'శిశువు బరువు', bp: 'బీపీ', condition: 'స్థితి', precautions: 'జాగ్రత్తలు', nextVisit: 'తదుపరి భేటీ', kilograms: 'కిలోలు', confirmedSaving: 'నిర్ధారించబడింది. సేవ్ చేస్తోంది.' },
    questions: { title: 'ప్రశ్నల గైడ్', startVoiceVisit: 'వాయిస్ భేటీ', filterPlaceholder: 'వెతకండి...', checklistProgress: 'పురోగతి', answered: 'సమాధానాలు', speakPrompt: 'వినండి' },
    reports: { title: 'నివేదికలు', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'రికార్డులు' },
    settings: { title: 'సెట్టింగ్స్', languageSpeech: 'భాష & వాయిస్', preferredLanguage: 'భాష', voiceSpeed: 'వేగం', testSpeed: 'పరీక్షించు', accessibility: 'డిస్‌ప్లే & సింక్' },
  }),
  ml: makeLang({
    greetings: { morning: 'സുപ്രഭാതം', afternoon: 'ശുഭ മധ്യാഹ്നം', evening: 'ശുഭ സന്ധ്യ' },
    roles: { worker: 'ആശാ പ്രവർത്തക', supervisor: 'സൂപ്പർവൈസർ', admin: 'അഡ്മിൻ' },
    header: { pcMode: 'പിസി', mobileMode: 'മൊബൈൽ', online: 'ഓൺലൈൻ', offline: 'ഓഫ്‌ലൈൻ', notifications: 'അറിയിപ്പുകൾ', openAlerts: 'അലർട്ടുകൾ', settings: 'ക്രമീകരണങ്ങൾ', help: 'സഹായം' },
    nav: { home: 'ഹോം', speakRecord: 'സംസാരിച്ച് രേഖപ്പെടുത്തുക', visitRecords: 'രേഖകൾ', followups: 'തുടർസന്ദർശനം', alerts: 'അലർട്ടുകൾ', questionGuide: 'ചോദ്യങ്ങൾ', fullForm: 'പൂർണ്ണ ഫോം', reports: 'റിപ്പോർട്ടുകൾ', supervisor: 'സൂപ്പർവൈസർ', settings: 'ക്രമീകരണങ്ങൾ', help: 'സഹായം', voice: 'ശബ്ദം' },
    dashboard: { tapAndSpeak: 'തൊട്ട് സംസാരിക്കുക', startSpeaking: 'സംസാരിക്കുക', savedVisits: 'സേവ് ചെയ്തവ', visitsDone: 'പൂർത്തിയായത്', followups: 'തുടർനടപടി', alerts: 'അലർട്ടുകൾ', visitCategory: 'വിഭാഗം', pregnancyVisit: 'ഗർഭിണി', newbornCare: 'നവജാത ശിശു', vaccination: 'വാക്സിനേഷൻ', pendingFollowups: 'ബാക്കിയുള്ളവ', seeAll: 'എല്ലാം', done: 'പൂർത്തിയായി', alertsAndRecent: 'അലർട്ടുകളും സന്ദർശനങ്ങളും', openAlerts: 'തുറക്കുക' },
    categories: { pregnancy: 'ഗർഭിണി', newborn: 'നവജാത ശിശു', vaccines: 'വാക്സിൻ', all: 'എല്ലാം' },
    voice: { voiceVisit: 'വോയ്സ് സന്ദർശനം', visitCategory: 'വിഭാഗം', patient: 'രോഗി', newPatient: 'പുതിയ ആൾ', autoDetect: 'സംസാരത്തിൽ നിന്ന് തിരിച്ചറിയുക', tapToSpeak: 'സംസാരിക്കാൻ തൊടുക', paused: 'നിർത്തിവച്ചു', pause: 'നിർത്തുക', resume: 'തുടരുക', done: 'പൂർത്തിയായി', cancel: 'റദ്ദാക്കുക', whatYouSpeak: 'നിങ്ങൾ പറഞ്ഞത്', listeningLabel: 'കേൾക്കുന്നു...', tapMicAndSpeak: 'മൈക്ക് അമർത്തി സംസാരിക്കുക', sampleVisits: 'മാതൃകകൾ', samplePregnancy: 'ഗർഭിണി സന്ദർശനം · നന്ദിനി', sampleNewborn: 'നവജാത ശിശു · രേഖ', sampleVaccines: 'വാക്സിനേഷൻ · ആരവ്', sampleDanger: 'അപായ മുന്നറിയിപ്പ് മാതൃക', typeOrEdit: 'തിരുത്തുക / ടൈപ്പ്', fillForm: 'ഫോം പൂരിപ്പിക്കുക', transcriptPlaceholder: 'പേര്, ഭാരം, ബിപി വിവരങ്ങൾ സംസാരിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക...', sttUnavailableHint: 'വോയ്സ് സെർവർ ലഭ്യമല്ല — നിങ്ങൾ പറഞ്ഞതിൽ തിരുത്തുക / ടൈപ്പ് ഉപയോഗിക്കുക.' },
    form: { visitForm: 'സന്ദർശന ഫോം', edit: 'തിരുത്തുക', done: 'ശരി', ashaWorker: 'ആശാ പ്രവർത്തക', dateTime: 'തീയതിയും സമയവും', patientName: 'പേര്', patientWeight: 'ഭാരം', babyWeight: 'കുഞ്ഞിന്റെ ഭാരം', bp: 'ബിപി (BP)', pregnancyCondition: 'അവസ്ഥ', babyCondition: 'കുഞ്ഞിന്റെ അവസ്ഥ', condition: 'അവസ്ഥ', babyGender: 'ലിംഗം', girl: 'പെൺകുട്ടി', boy: 'ആൺകുട്ടി', vaccinesProvided: 'നൽകിയ വാക്സിനുകൾ', precautions: 'മുൻകരുതലുകൾ', nextVisit: 'അടുത്ത സന്ദർശനം', readAloud: 'വായിച്ചു കേൾപ്പിക്കുക', speakFix: 'സംസാരിച്ച് തിരുത്തുക', saveDraft: 'ഡ്രാഫ്റ്റ്', safeVisit: 'സുരക്ഷിത സന്ദർശനം', safetyAlert: 'അപായ മുന്നറിയിപ്പ്', visitSavedSpeech: (n) => `${n} രേഖ സേവ് ചെയ്തു.` },
    readback: { intro: 'രേഖപ്പെടുത്തിയ വിവരങ്ങൾ.', beneficiaryName: 'പേര്', weight: 'ഭാരം', babyWeight: 'കുഞ്ഞിന്റെ ഭാരം', bp: 'ബിപി', condition: 'അവസ്ഥ', precautions: 'മുൻകരുതൽ', nextVisit: 'അടുത്ത സന്ദർശനം', kilograms: 'കിലോ', confirmedSaving: 'ഉറപ്പാക്കി. സേവ് ചെയ്യുന്നു.' },
    questions: { title: 'ചോദ്യ മാർഗ്ഗനിർദ്ദേശി', startVoiceVisit: 'വോയ്സ് സന്ദർശനം', filterPlaceholder: 'തിരയുക...', checklistProgress: 'പുരോഗതി', answered: 'പൂർത്തിയായി', speakPrompt: 'കേൾക്കുക' },
    reports: { title: 'റിപ്പോർട്ടുകൾ', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'രേഖകൾ' },
    settings: { title: 'ക്രമീകരണങ്ങൾ', languageSpeech: 'ഭാഷയും ശബ്ദവും', preferredLanguage: 'ഭാഷ', voiceSpeed: 'വേഗത', testSpeed: 'പരിശോധിക്കുക', accessibility: 'കാഴ്ചയും സിങ്കും' },
  }),
  mr: makeLang({
    greetings: { morning: 'शुभ सकाळ', afternoon: 'शुभ दुपार', evening: 'शुभ संध्याकाळ' },
    roles: { worker: 'आशा कार्यकर्ती', supervisor: 'पर्यवेक्षक', admin: 'जिल्हा प्रशासक' },
    header: { pcMode: 'पीसी', mobileMode: 'मोबाईल', online: 'ऑनलाइन', offline: 'ऑफलाइन', notifications: 'सूचना', openAlerts: 'अलर्ट उघडा', settings: 'सेटिंग्ज', help: 'मदत' },
    nav: { home: 'मुख्यपृष्ठ', speakRecord: 'बोलून नोंदवा', visitRecords: 'भेटीच्या नोंदी', followups: 'पुढील भेट', alerts: 'अलर्ट', questionGuide: 'प्रश्न मार्गदर्शिका', fullForm: 'पूर्ण फॉर्म', reports: 'अहवाल', supervisor: 'पर्यवेक्षक', settings: 'सेटिंग्ज', help: 'मदत', voice: 'आवाज' },
    dashboard: { tapAndSpeak: 'दाबा आणि बोला', startSpeaking: 'बोलणे सुरू करा', savedVisits: 'सेव्ह नोंदी', visitsDone: 'पूर्ण भेटी', followups: 'पुढील भेट', alerts: 'अलर्ट', visitCategory: 'भेट प्रकार', pregnancyVisit: 'गर्भवती भेट', newbornCare: 'नवजात शिशु', vaccination: 'लसीकरण', pendingFollowups: 'बाकी कामे', seeAll: 'सर्व पहा', done: 'पूर्ण', alertsAndRecent: 'अलर्ट आणि नोंदी', openAlerts: 'उघडा' },
    categories: { pregnancy: 'गर्भवती', newborn: 'नवजात', vaccines: 'लसीकरण', all: 'सर्व' },
    voice: { voiceVisit: 'आवाज भेट', visitCategory: 'प्रकार', patient: 'रुग्ण / लाभार्थी', newPatient: 'नवीन', autoDetect: 'बोलण्यातून ओळखा', tapToSpeak: 'बोलण्यासाठी दाबा', paused: 'थांबले', pause: 'थांबा', resume: 'सुरू ठेवा', done: 'पूर्ण', cancel: 'रद्द', whatYouSpeak: 'तुम्ही बोललेले', listeningLabel: 'ऐकत आहे...', tapMicAndSpeak: 'माइक दाबून बोला', sampleVisits: 'नमुना भेटी', samplePregnancy: 'गर्भवती भेट · नंदिनी', sampleNewborn: 'नवजात शिशु · रेखा', sampleVaccines: 'लसीकरण भेट · आरव', sampleDanger: 'धोक्याचा इशारा नमुना', typeOrEdit: 'बदला / टाइप करा', fillForm: 'फॉर्म भरा', transcriptPlaceholder: 'नाव, वजन, बीपी तपशील बोला किंवा टाइप करा...', sttUnavailableHint: 'वॉइस सर्व्हर उपलब्ध नाही — तुम्ही बोललेले मध्ये बदला / टाइप करा वापरा.' },
    form: { visitForm: 'भेट फॉर्म', edit: 'बदला', done: 'ठीक', ashaWorker: 'आशा कार्यकर्ती', dateTime: 'दिनांक व वेळ', patientName: 'नाव', patientWeight: 'वजन', babyWeight: 'बाळाचे वजन', bp: 'रक्तदाब (BP)', pregnancyCondition: 'स्थिती', babyCondition: 'बाळाची स्थिती', condition: 'स्थिती', babyGender: 'लिंग', girl: 'मुलगी', boy: 'मुलगा', vaccinesProvided: 'दिलेल्या लसी', precautions: 'काळजी', nextVisit: 'पुढील भेट', readAloud: 'वाचून दाखवा', speakFix: 'आवाजाने दुरुस्ती', saveDraft: 'ड्राफ्ट', safeVisit: 'सुरक्षित भेट', safetyAlert: 'धोक्याचा इशारा', visitSavedSpeech: (n) => `${n} ची भेट सेव्ह झाली.` },
    readback: { intro: 'नोंदवलेली माहिती.', beneficiaryName: 'नाव', weight: 'वजन', babyWeight: 'बाळाचे वजन', bp: 'बीपी', condition: 'स्थिती', precautions: 'काळजी', nextVisit: 'पुढील भेट', kilograms: 'किलो', confirmedSaving: 'निश्चित केले. सेव्ह होत आहे.' },
    questions: { title: 'प्रश्न मार्गदर्शिका', startVoiceVisit: 'आवाज भेट', filterPlaceholder: 'शोधा...', checklistProgress: 'प्रगती', answered: 'पूर्ण', speakPrompt: 'ऐका' },
    reports: { title: 'अहवाल', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'नोंदी' },
    settings: { title: 'सेटिंग्ज', languageSpeech: 'भाषा आणि आवाज', preferredLanguage: 'भाषा', voiceSpeed: 'आवाज गती', testSpeed: 'तपासा', accessibility: 'दृश्य आणि सिंक' },
  }),
  bn: makeLang({
    greetings: { morning: 'সুপ্রভাত', afternoon: 'শুভ অপরাহ্ণ', evening: 'শুভ সন্ধ্যা' },
    roles: { worker: 'আশা কর্মী', supervisor: 'তত্ত্বাবধায়ক', admin: 'জেলা প্রশাসক' },
    header: { pcMode: 'পিসি', mobileMode: 'মোবাইল', online: 'অনলাইন', offline: 'অফলাইন', notifications: 'বিজ্ঞপ্তি', openAlerts: 'সতর্কতা', settings: 'সেটিংস', help: 'সাহায্য' },
    nav: { home: 'হোম', speakRecord: 'বলে নথিভুক্ত করুন', visitRecords: 'ভিজিট রেকর্ড', followups: 'ফলো-আপ', alerts: 'সতর্কতা', questionGuide: 'প্রশ্ন নির্দেশিকা', fullForm: 'সম্পূর্ণ ফর্ম', reports: 'রিপোর্ট', supervisor: 'সুপারভাইজার', settings: 'সেটিংস', help: 'সাহায্য', voice: 'ভয়েস' },
    dashboard: { tapAndSpeak: 'চাপুন এবং বলুন', startSpeaking: 'বলা শুরু করুন', savedVisits: 'সংরক্ষিত ভিজিট', visitsDone: 'সম্পন্ন ভিজিট', followups: 'ফলো-আপ', alerts: 'সতর্কতা', visitCategory: 'ধরন', pregnancyVisit: 'গর্ভবতী', newbornCare: 'নবজাতক', vaccination: 'টিকা', pendingFollowups: 'বাকি ফলো-আপ', seeAll: 'সব দেখুন', done: 'সম্পন্ন', alertsAndRecent: 'সতর্কতা ও সাম্প্রতিক ভিজিট', openAlerts: 'খুলুন' },
    categories: { pregnancy: 'গর্ভাবস্থা', newborn: 'নবজাতক', vaccines: 'টিকা', all: 'সব' },
    voice: { voiceVisit: 'ভয়েস ভিজিট', visitCategory: 'ধরন', patient: 'রোগী', newPatient: 'নতুন', autoDetect: 'কথা থেকে শনাক্ত করুন', tapToSpeak: 'বলতে চাপুন', paused: 'বিরতি', pause: 'থামুন', resume: 'চালু করুন', done: 'শেষ', cancel: 'বাতিল', whatYouSpeak: 'আপনি যা বলেছেন', listeningLabel: 'শুনছে...', tapMicAndSpeak: 'মাইক চেপে কথা বলুন', sampleVisits: 'নমুনা ভিজিট', samplePregnancy: 'গর্ভবতী ভিজিট · নন্দিনী', sampleNewborn: 'নবজাতক ভিজিট · রেখা', sampleVaccines: 'টিকা ভিজিট · আরভ', sampleDanger: 'বিপদ সতর্কতা নমুনা', typeOrEdit: 'সম্পাদনা / লিখুন', fillForm: 'ফর্ম পূরণ', transcriptPlaceholder: 'নাম, ওজন, বিপি তথ্য বলুন বা লিখুন...', sttUnavailableHint: 'ভয়েস সার্ভার পাওয়া যায়নি — আপনি যা বলেছেন-এ সম্পাদনা / লিখুন ব্যবহার করুন।' },
    form: { visitForm: 'ভিজিট ফর্ম', edit: 'সংশোধন', done: 'ঠিক', ashaWorker: 'আশা কর্মী', dateTime: 'তারিখ ও সময়', patientName: 'নাম', patientWeight: 'ওজন', babyWeight: 'শিশুর ওজন', bp: 'বিপি (BP)', pregnancyCondition: 'অবস্থা', babyCondition: 'শিশুর অবস্থা', condition: 'অবস্থা', babyGender: 'লিঙ্গ', girl: 'মেয়ে', boy: 'ছেলে', vaccinesProvided: 'প্রদত্ত টিকা', precautions: 'সতর্কতা', nextVisit: 'পরবর্তী ভিজিট', readAloud: 'পড়ে শোনান', speakFix: 'বলে সংশোধন', saveDraft: 'খসড়া', safeVisit: 'নিরাপদ ভিজিট', safetyAlert: 'বিপদ সতর্কতা', visitSavedSpeech: (n) => `${n}-এর ভিজিট সংরক্ষিত হয়েছে।` },
    readback: { intro: 'নথিভুক্ত তথ্য।', beneficiaryName: 'নাম', weight: 'ওজন', babyWeight: 'শিশুর ওজন', bp: 'বিপি', condition: 'অবস্থা', precautions: 'সতর্কতা', nextVisit: 'পরবর্তী ভিজিট', kilograms: 'কেজি', confirmedSaving: 'নিশ্চিত করা হয়েছে। সংরক্ষণ হচ্ছে।' },
    questions: { title: 'প্রশ্ন নির্দেশিকা', startVoiceVisit: 'ভয়েস ভিজিট', filterPlaceholder: 'খুঁজুন...', checklistProgress: 'অগ্রগতি', answered: 'সম্পন্ন', speakPrompt: 'শুনুন' },
    reports: { title: 'রিপোর্ট', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'ভিজিট রেকর্ড' },
    settings: { title: 'সেটিংস', languageSpeech: 'ভাষা ও ভয়েস', preferredLanguage: 'ভাষা', voiceSpeed: 'গতি', testSpeed: 'পরীক্ষা', accessibility: 'প্রদর্শন ও সিঙ্ক' },
  }),
  gu: makeLang({
    greetings: { morning: 'સુપ્રભાત', afternoon: 'શુભ બપોર', evening: 'શુભ સાંજ' },
    roles: { worker: 'આશા કાર્યકર', supervisor: 'સુપરવાઇઝર', admin: 'જિલ્લા એડમિન' },
    header: { pcMode: 'પીસી', mobileMode: 'મોબાઇલ', online: 'ઓનલાઇન', offline: 'ઓફલાઇન', notifications: 'સૂચનાઓ', openAlerts: 'એલર્ટ', settings: 'સેટિંગ્સ', help: 'મદદ' },
    nav: { home: 'હોમ', speakRecord: 'બોલીને નોંધો', visitRecords: 'નોંધો', followups: 'ફોલો-અપ', alerts: 'એલર્ટ', questionGuide: 'પ્રશ્ન માર્ગદર્શિકા', fullForm: 'પૂરું ફોર્મ', reports: 'રિપોર્ટ', supervisor: 'સુપરવાઇઝર', settings: 'સેટિંગ્સ', help: 'મદદ', voice: 'અવાજ' },
    dashboard: { tapAndSpeak: 'દબાવીને બોલો', startSpeaking: 'બોલવાનું શરૂ કરો', savedVisits: 'સાચવેલી મુલાકાત', visitsDone: 'પૂર્ણ મુલાકાત', followups: 'ફોલો-અપ', alerts: 'એલર્ટ', visitCategory: 'પ્રકાર', pregnancyVisit: 'સગર્ભા મુલાકાત', newbornCare: 'નવજાત શિશુ', vaccination: 'રસીકરણ', pendingFollowups: 'બાકી ફોલો-અપ', seeAll: 'બધા', done: 'પૂર્ણ', alertsAndRecent: 'એલર્ટ અને તાજેતરની નોંધો', openAlerts: 'ખોલો' },
    categories: { pregnancy: 'સગર્ભા', newborn: 'નવજાત', vaccines: 'રસી', all: 'બધા' },
    voice: { voiceVisit: 'વૉઇસ મુલાકાત', visitCategory: 'પ્રકાર', patient: 'દર્દી', newPatient: 'નવું', autoDetect: 'અવાજથી ઓળખો', tapToSpeak: 'બોલવા માટે દબાવો', paused: 'થોભ્યું', pause: 'રોકો', resume: 'ચાલુ કરો', done: 'પૂર્ણ', cancel: 'રદ', whatYouSpeak: 'તમે જે બોલ્યા', listeningLabel: 'સાંભળે છે...', tapMicAndSpeak: 'માઇક દબાવીને બોલો', sampleVisits: 'નમૂના મુલાકાત', samplePregnancy: 'સગર્ભા મુલાકાત · નંદિની', sampleNewborn: 'નવજાત મુલાકાત · રેખા', sampleVaccines: 'રસીકરણ · આરવ', sampleDanger: 'જોખમ ચેતવણી નમૂનો', typeOrEdit: 'સુધારો / લખો', fillForm: 'ફોર્મ ભરો', transcriptPlaceholder: 'નામ, વજન, બીપી વિગતો બોલો અથવા લખો...', sttUnavailableHint: 'વૉઇસ સર્વર ઉપલબ્ધ નથી — તમે જે બોલ્યામાં સુધારો / લખો વાપરો.' },
    form: { visitForm: 'મુલાકાત ફોર્મ', edit: 'સુધારો', done: 'ઠીક', ashaWorker: 'આશા કાર્યકર', dateTime: 'તારીખ અને સમય', patientName: 'નામ', patientWeight: 'વજન', babyWeight: 'શિશુનું વજન', bp: 'બીપી (BP)', pregnancyCondition: 'સ્થિતિ', babyCondition: 'શિશુની સ્થિતિ', condition: 'સ્થિતિ', babyGender: 'જાતિ', girl: 'છોકરી', boy: 'છોકરો', vaccinesProvided: 'આપેલ રસી', precautions: 'સાવચેતી', nextVisit: 'આગામી મુલાકાત', readAloud: 'વાંચીને સંભળાવો', speakFix: 'બોલીને સુધારો', saveDraft: 'ડ્રાફ્ટ', safeVisit: 'સુરક્ષિત મુલાકાત', safetyAlert: 'જોખમ ચેતવણી', visitSavedSpeech: (n) => `${n} ની નોંધ સાચવી.` },
    readback: { intro: 'નોંધાયેલ વિગતો.', beneficiaryName: 'નામ', weight: 'વજન', babyWeight: 'શિશુનું વજન', bp: 'બીપી', condition: 'સ્થિતિ', precautions: 'સાવચેતી', nextVisit: 'આગામી મુલાકાત', kilograms: 'કિલો', confirmedSaving: 'પુષ્ટિ થઈ. સાચવી રહ્યા છીએ.' },
    questions: { title: 'પ્રશ્ન માર્ગદર્શિકા', startVoiceVisit: 'વૉઇસ મુલાકાત', filterPlaceholder: 'શોધો...', checklistProgress: 'પ્રગતિ', answered: 'જવાબ', speakPrompt: 'સાંભળો' },
    reports: { title: 'રિપોર્ટ', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'નોંધો' },
    settings: { title: 'સેટિંગ્સ', languageSpeech: 'ભાષા અને અવાજ', preferredLanguage: 'ભાષા', voiceSpeed: 'ગતિ', testSpeed: 'તપાસો', accessibility: 'ડિસ્પ્લે અને સિંક' },
  }),
  pa: makeLang({
    greetings: { morning: 'ਸ਼ੁਭ ਸਵੇਰ', afternoon: 'ਸ਼ੁਭ ਦੁਪਹਿਰ', evening: 'ਸ਼ੁਭ ਸ਼ਾਮ' },
    roles: { worker: 'ਆਸ਼ਾ ਵਰਕਰ', supervisor: 'ਸੁਪਰਵਾਈਜ਼ਰ', admin: 'ਜ਼ਿਲ੍ਹਾ ਐਡਮਿਨ' },
    header: { pcMode: 'ਪੀਸੀ', mobileMode: 'ਮੋਬਾਈਲ', online: 'ਆਨਲਾਈਨ', offline: 'ਆਫਲਾਈਨ', notifications: 'ਸੂਚਨਾਵਾਂ', openAlerts: 'ਅਲਰਟ', settings: 'ਸੈਟਿੰਗਾਂ', help: 'ਮਦਦ' },
    nav: { home: 'ਹੋਮ', speakRecord: 'ਬੋਲ ਕੇ ਦਰਜ ਕਰੋ', visitRecords: 'ਰਿਕਾਰਡ', followups: 'ਫਾਲੋ-ਅੱਪ', alerts: 'ਅਲਰਟ', questionGuide: 'ਸਵਾਲ ਗਾਈਡ', fullForm: 'ਪੂਰਾ ਫਾਰਮ', reports: 'ਰਿਪੋਰਟਾਂ', supervisor: 'ਸੁਪਰਵਾਈਜ਼ਰ', settings: 'ਸੈਟਿੰਗਾਂ', help: 'ਮਦਦ', voice: 'ਆਵਾਜ਼' },
    dashboard: { tapAndSpeak: 'ਦਬਾਓ ਅਤੇ ਬੋਲੋ', startSpeaking: 'ਬੋਲਣਾ ਸ਼ੁਰੂ ਕਰੋ', savedVisits: 'ਸੇਵ ਦੌਰੇ', visitsDone: 'ਪੂਰੇ ਦੌਰੇ', followups: 'ਫਾਲੋ-ਅੱਪ', alerts: 'ਅਲਰਟ', visitCategory: 'ਸ਼੍ਰੇਣੀ', pregnancyVisit: 'ਗਰਭਵਤੀ ਦੌਰਾ', newbornCare: 'ਨਵਜੰਮਿਆ ਬੱਚਾ', vaccination: 'ਟੀਕਾਕਰਨ', pendingFollowups: 'ਬਾਕੀ ਫਾਲੋ-ਅੱਪ', seeAll: 'ਸਭ ਦੇਖੋ', done: 'ਹੋ ਗਿਆ', alertsAndRecent: 'ਅਲਰਟ ਅਤੇ ਤਾਜ਼ਾ ਦੌਰੇ', openAlerts: 'ਖੋਲ੍ਹੋ' },
    categories: { pregnancy: 'ਗਰਭਵਤੀ', newborn: 'ਨਵਜੰਮਿਆ', vaccines: 'ਟੀਕੇ', all: 'ਸਭ' },
    voice: { voiceVisit: 'ਆਵਾਜ਼ ਦੌਰਾ', visitCategory: 'ਸ਼੍ਰੇਣੀ', patient: 'ਮਰੀਜ਼', newPatient: 'ਨਵਾਂ', autoDetect: 'ਬੋਲਣ ਤੋਂ ਪਛਾਣੋ', tapToSpeak: 'ਬੋਲਣ ਲਈ ਦਬਾਓ', paused: 'ਰੁਕਿਆ', pause: 'ਰੋਕੋ', resume: 'ਜਾਰੀ ਰੱਖੋ', done: 'ਹੋ ਗਿਆ', cancel: 'ਰੱਦ', whatYouSpeak: 'ਤੁਸੀਂ ਜੋ ਬੋਲਿਆ', listeningLabel: 'ਸੁਣ ਰਿਹਾ ਹੈ...', tapMicAndSpeak: 'ਮਾਈਕ ਦਬਾ ਕੇ ਬੋਲੋ', sampleVisits: 'ਨਮੂਨਾ ਦੌਰੇ', samplePregnancy: 'ਗਰਭਵਤੀ ਦੌਰਾ · ਨੰਦਿਨੀ', sampleNewborn: 'ਨਵਜੰਮਿਆ ਬੱਚਾ · ਰੇਖਾ', sampleVaccines: 'ਟੀਕਾਕਰਨ · ਆਰਵ', sampleDanger: 'ਖ਼ਤਰੇ ਦੀ ਚੇਤਾਵਨੀ ਨਮੂਨਾ', typeOrEdit: 'ਸੋਧੋ / ਲਿਖੋ', fillForm: 'ਫਾਰਮ ਭਰੋ', transcriptPlaceholder: 'ਨਾਮ, ਭਾਰ, ਬੀਪੀ ਵੇਰਵੇ ਬੋਲੋ ਜਾਂ ਲਿਖੋ...', sttUnavailableHint: 'ਆਵਾਜ਼ ਸਰਵਰ ਉਪਲਬਧ ਨਹੀਂ ਹੈ — ਤੁਸੀਂ ਜੋ ਬੋਲਿਆ ਵਿੱਚ ਸੋਧੋ / ਲਿਖੋ ਵਰਤੋ।' },
    form: { visitForm: 'ਦੌਰਾ ਫਾਰਮ', edit: 'ਸੋਧੋ', done: 'ਠੀਕ', ashaWorker: 'ਆਸ਼ਾ ਵਰਕਰ', dateTime: 'ਮਿਤੀ ਅਤੇ ਸਮਾਂ', patientName: 'ਨਾਮ', patientWeight: 'ਭਾਰ', babyWeight: 'ਬੱਚੇ ਦਾ ਭਾਰ', bp: 'ਬੀਪੀ (BP)', pregnancyCondition: 'ਹਾਲਤ', babyCondition: 'ਬੱਚੇ ਦੀ ਹਾਲਤ', condition: 'ਹਾਲਤ', babyGender: 'ਲਿੰਗ', girl: 'ਕੁੜੀ', boy: 'ਮੁੰਡਾ', vaccinesProvided: 'ਦਿੱਤੇ ਟੀਕੇ', precautions: 'ਸਾਵਧਾਨੀਆਂ', nextVisit: 'ਅਗਲਾ ਦੌਰਾ', readAloud: 'ਪੜ੍ਹ ਕੇ ਸੁਣੋ', speakFix: 'ਬੋਲ ਕੇ ਸੋਧੋ', saveDraft: 'ਡਰਾਫਟ', safeVisit: 'ਸੁਰੱਖਿਅਤ ਦੌਰਾ', safetyAlert: 'ਖ਼ਤਰੇ ਦੀ ਚੇਤਾਵਨੀ', visitSavedSpeech: (n) => `${n} ਦਾ ਰਿਕਾਰਡ ਸੇਵ ਹੋ ਗਿਆ।` },
    readback: { intro: 'ਦਰਜ ਕੀਤੇ ਵੇਰਵੇ।', beneficiaryName: 'ਨਾਮ', weight: 'ਭਾਰ', babyWeight: 'ਬੱਚੇ ਦਾ ਭਾਰ', bp: 'ਬੀਪੀ', condition: 'ਹਾਲਤ', precautions: 'ਸਾਵਧਾਨੀਆਂ', nextVisit: 'ਅਗਲਾ ਦੌਰਾ', kilograms: 'ਕਿਲੋ', confirmedSaving: 'ਪੁਸ਼ਟੀ ਹੋ ਗਈ। ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ।' },
    questions: { title: 'ਸਵਾਲ ਗਾਈਡ', startVoiceVisit: 'ਆਵਾਜ਼ ਦੌਰਾ', filterPlaceholder: 'ਖੋਜੋ...', checklistProgress: 'ਤਰੱਕੀ', answered: 'ਜਵਾਬ', speakPrompt: 'ਸੁਣੋ' },
    reports: { title: 'ਰਿਪੋਰਟਾਂ', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'ਰਿਕਾਰਡ' },
    settings: { title: 'ਸੈਟਿੰਗਾਂ', languageSpeech: 'ਭਾਸ਼ਾ ਅਤੇ ਆਵਾਜ਼', preferredLanguage: 'ਭਾਸ਼ਾ', voiceSpeed: 'ਗਤੀ', testSpeed: 'ਜਾਂਚੋ', accessibility: 'ਡਿਸਪਲੇ ਅਤੇ ਸਿੰਕ' },
  }),
  or: makeLang({
    greetings: { morning: 'ଶୁଭ ସକାଳ', afternoon: 'ଶୁଭ ଅପରାହ୍ଣ', evening: 'ଶୁଭ ସନ୍ଧ୍ୟା' },
    roles: { worker: 'ଆଶା କର୍ମୀ', supervisor: 'ସୁପରଭାଇଜର', admin: 'ଜିଲ୍ଲା ଆଡମିନ୍' },
    header: { pcMode: 'ପିସି', mobileMode: 'ମୋବାଇଲ୍', online: 'ଅନଲାଇନ୍', offline: 'ଅଫଲାଇନ୍', notifications: 'ସୂଚନା', openAlerts: 'ଆଲର୍ଟ', settings: 'ସେଟିଂସ୍', help: 'ସହାୟତା' },
    nav: { home: 'ହୋମ୍', speakRecord: 'କହି ରେକର୍ଡ କରନ୍ତୁ', visitRecords: 'ରେକର୍ଡ', followups: 'ଫଲୋ-ଅପ୍', alerts: 'ଆଲର୍ଟ', questionGuide: 'ପ୍ରଶ୍ନ ଗାଇଡ୍', fullForm: 'ପୂର୍ଣ୍ଣ ଫର୍ମ', reports: 'ରିପୋର୍ଟ', supervisor: 'ସୁପରଭାଇଜର', settings: 'ସେଟିଂସ୍', help: 'ସହାୟତା', voice: 'ଭଏସ୍' },
    dashboard: { tapAndSpeak: 'ଦବାଇ କୁହନ୍ତୁ', startSpeaking: 'କହିବା ଆରମ୍ଭ କରନ୍ତୁ', savedVisits: 'ସେଭ୍ ପରିଦର୍ଶନ', visitsDone: 'ସମ୍ପୂର୍ଣ୍ଣ', followups: 'ଫଲୋ-ଅପ୍', alerts: 'ଆଲର୍ଟ', visitCategory: 'ବର୍ଗ', pregnancyVisit: 'ଗର୍ଭବତୀ', newbornCare: 'ନବଜାତ ଶିଶୁ', vaccination: 'ଟୀକାକରଣ', pendingFollowups: 'ବାକି କାର୍ଯ୍ୟ', seeAll: 'ସବୁ ଦେଖନ୍ତୁ', done: 'ସରିଲା', alertsAndRecent: 'ଆଲର୍ଟ ଓ ସାମ୍ପ୍ରତିକ', openAlerts: 'ଖୋଲନ୍ତୁ' },
    categories: { pregnancy: 'ଗର୍ଭବତୀ', newborn: 'ନବଜାତ', vaccines: 'ଟୀକା', all: 'ସବୁ' },
    voice: { voiceVisit: 'ଭଏସ୍ ପରିଦର୍ଶନ', visitCategory: 'ବର୍ଗ', patient: 'ରୋଗୀ', newPatient: 'ନୂଆ', autoDetect: 'କଥାରୁ ଚିହ୍ନଟ କରନ୍ତୁ', tapToSpeak: 'କହିବାକୁ ଦବାନ୍ତୁ', paused: 'ଅଟକିଛି', pause: 'ଅଟକାନ୍ତୁ', resume: 'ଜାରି ରଖନ୍ତୁ', done: 'ସରିଲା', cancel: 'ବାତିଲ୍', whatYouSpeak: 'ଆପଣ ଯାହା କହିଲେ', listeningLabel: 'ଶୁଣୁଛି...', tapMicAndSpeak: 'ମାଇକ୍ ଦବାଇ କୁହନ୍ତୁ', sampleVisits: 'ନମୁନା', samplePregnancy: 'ଗର୍ଭବତୀ ପରିଦର୍ଶନ · ନନ୍ଦିନୀ', sampleNewborn: 'ନବଜାତ ଶିଶୁ · ରେଖା', sampleVaccines: 'ଟୀକାକରଣ · ଆରଭ', sampleDanger: 'ବିପଦ ସତର୍କତା ନମୁନା', typeOrEdit: 'ସଂଶୋଧନ / ଲେଖନ୍ତୁ', fillForm: 'ଫର୍ମ ପୂରଣ', transcriptPlaceholder: 'ନାମ, ଓଜନ, ବିପି ବିବରଣୀ କୁହନ୍ତୁ କିମ୍ବା ଲେଖନ୍ତୁ...', sttUnavailableHint: 'ଭଏସ୍ ସର୍ଭର୍ ଉପଲବ୍ଧ ନାହିଁ — ଆପଣ ଯାହା କହିଲେରେ ସଂଶୋଧନ / ଲେଖନ୍ତୁ ବ୍ୟବହାର କରନ୍ତୁ।' },
    form: { visitForm: 'ପରିଦର୍ଶନ ଫର୍ମ', edit: 'ସଂଶୋଧନ', done: 'ଠିକ୍', ashaWorker: 'ଆଶା କର୍ମୀ', dateTime: 'ତାରିଖ ଓ ସମୟ', patientName: 'ନାମ', patientWeight: 'ଓଜନ', babyWeight: 'ଶିଶୁ ଓଜନ', bp: 'ବିପି (BP)', pregnancyCondition: 'ଅବସ୍ଥା', babyCondition: 'ଶିଶୁ ଅବସ୍ଥା', condition: 'ଅବସ୍ଥା', babyGender: 'ଲିଙ୍ଗ', girl: 'ଝିଅ', boy: 'ପୁଅ', vaccinesProvided: 'ଦିଆଯାଇଥିବା ଟୀକା', precautions: 'ସତର୍କତା', nextVisit: 'ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ', readAloud: 'ପଢ଼ି ଶୁଣାନ୍ତୁ', speakFix: 'କହି ସଂଶୋଧନ', saveDraft: 'ଡ୍ରାଫ୍ଟ', safeVisit: 'ସୁରକ୍ଷିତ ପରିଦର୍ଶନ', safetyAlert: 'ବିପଦ ସତର୍କତା', visitSavedSpeech: (n) => `${n} ରେକର୍ଡ ସେଭ୍ ହେଲା।` },
    readback: { intro: 'ରେକର୍ଡ ତଥ୍ୟ।', beneficiaryName: 'ନାମ', weight: 'ଓଜନ', babyWeight: 'ଶିଶୁ ଓଜନ', bp: 'ବିପି', condition: 'ଅବସ୍ଥା', precautions: 'ସତର୍କତା', nextVisit: 'ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ', kilograms: 'କିଲୋ', confirmedSaving: 'ନିଶ୍ଚିତ ହେଲା। ସେଭ୍ ହେଉଛି।' },
    questions: { title: 'ପ୍ରଶ୍ନ ଗାଇଡ୍', startVoiceVisit: 'ଭଏସ୍ ପରିଦର୍ଶନ', filterPlaceholder: 'ଖୋଜନ୍ତୁ...', checklistProgress: 'ଅଗ୍ରଗତି', answered: 'ଉତ୍ତର', speakPrompt: 'ଶୁଣନ୍ତୁ' },
    reports: { title: 'ରିପୋର୍ଟ', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'ରେକର୍ଡ' },
    settings: { title: 'ସେଟିଂସ୍', languageSpeech: 'ଭାଷା ଓ ଭଏସ୍', preferredLanguage: 'ଭାଷା', voiceSpeed: 'ଗତି', testSpeed: 'ଯାଞ୍ଚ', accessibility: 'ପ୍ରଦର୍ଶନ ଓ ସିଙ୍କ୍' },
  }),
  as: makeLang({
    greetings: { morning: 'সুপ্ৰভাত', afternoon: 'শুভ অপৰাহ্ণ', evening: 'শুভ সন্ধ্যা' },
    roles: { worker: 'আশা কৰ্মী', supervisor: 'তত্ত্বাৱধায়ক', admin: 'জিলা প্ৰশাসক' },
    header: { pcMode: 'পিচি', mobileMode: 'মোবাইল', online: 'অনলাইন', offline: 'অফলাইন', notifications: 'জাননী', openAlerts: 'সতৰ্কবাণী', settings: 'ছেটিংছ', help: 'সহায়' },
    nav: { home: 'হোম', speakRecord: 'কৈ নথিভুক্ত কৰক', visitRecords: 'ভ্ৰমণ নথি', followups: 'ফল’-আপ', alerts: 'সতৰ্কবাণী', questionGuide: 'প্ৰশ্ন নিৰ্দেশিকা', fullForm: 'সম্পূৰ্ণ ফৰ্ম', reports: 'প্ৰতিবেদন', supervisor: 'তত্ত্বাৱধায়ক', settings: 'ছেটিংছ', help: 'সহায়', voice: 'কণ্ঠ' },
    dashboard: { tapAndSpeak: 'টিপি কওক', startSpeaking: 'ক’বলৈ আৰম্ভ কৰক', savedVisits: 'সংৰক্ষিত ভ্ৰমণ', visitsDone: 'সম্পূৰ্ণ ভ্ৰমণ', followups: 'ফল’-আপ', alerts: 'সতৰ্কবাণী', visitCategory: 'শ্ৰেণী', pregnancyVisit: 'গৰ্ভৱতী', newbornCare: 'নৱজাতক', vaccination: 'টীকাকৰণ', pendingFollowups: 'বাকী কাম', seeAll: 'সকলো চাওক', done: 'সম্পূৰ্ণ', alertsAndRecent: 'সতৰ্কবাণী আৰু ভ্ৰমণ', openAlerts: 'খোলক' },
    categories: { pregnancy: 'গৰ্ভৱতী', newborn: 'নৱজাতক', vaccines: 'টীকা', all: 'সকলো' },
    voice: { voiceVisit: 'ভয়েছ ভ্ৰমণ', visitCategory: 'শ্ৰেণী', patient: 'ৰোগী', newPatient: 'নতুন', autoDetect: 'কথাৰ পৰা চিনাক্ত কৰক', tapToSpeak: 'ক’বলৈ টিপক', paused: 'ৰখোৱা হৈছে', pause: 'ৰখাওক', resume: 'চলাই নিয়ক', done: 'সম্পূৰ্ণ', cancel: 'বাতিল', whatYouSpeak: 'আপুনি কোৱা কথা', listeningLabel: 'শুনি আছে...', tapMicAndSpeak: 'মাইক টিপি কওক', sampleVisits: 'নমুনা ভ্ৰমণ', samplePregnancy: 'গৰ্ভৱতী ভ্ৰমণ · নন্দিনী', sampleNewborn: 'নৱজাতক ভ্ৰমণ · ৰেখা', sampleVaccines: 'টীকা ভ্ৰমণ · আৰৱ', sampleDanger: 'বিপদ সতৰ্কবাণী নমুনা', typeOrEdit: 'সম্পাদনা / লিখক', fillForm: 'ফৰ্ম পূৰণ', transcriptPlaceholder: 'নাম, ওজন, বিপি তথ্য কওক বা লিখক...', sttUnavailableHint: 'ভয়েছ চাৰ্ভাৰ উপলব্ধ নহয় — আপুনি কোৱা কথাত সম্পাদনা / লিখক ব্যৱহাৰ কৰক।' },
    form: { visitForm: 'ভ্ৰমণ ফৰ্ম', edit: 'শুধৰাওক', done: 'ঠিক', ashaWorker: 'আশা কৰ্মী', dateTime: 'তাৰিখ আৰু সময়', patientName: 'নাম', patientWeight: 'ওজন', babyWeight: 'শিশুৰ ওজন', bp: 'বিপি (BP)', pregnancyCondition: 'অৱস্থা', babyCondition: 'শিশুৰ অৱস্থা', condition: 'অৱস্থা', babyGender: 'লিঙ্গ', girl: 'ছোৱালী', boy: 'ল’ৰা', vaccinesProvided: 'দিয়া টীকা', precautions: 'সাৱধানতা', nextVisit: 'পৰৱৰ্তী ভ্ৰমণ', readAloud: 'পঢ়ি শুনাওক', speakFix: 'কৈ শুধৰাওক', saveDraft: 'খচৰা', safeVisit: 'সুৰক্ষিত ভ্ৰমণ', safetyAlert: 'বিপদৰ সতৰ্কবাণী', visitSavedSpeech: (n) => `${n}-ৰ ভ্ৰমণ সংৰক্ষণ কৰা হ’ল।` },
    readback: { intro: 'নথিভুক্ত তথ্য।', beneficiaryName: 'নাম', weight: 'ওজন', babyWeight: 'শিশুৰ ওজন', bp: 'বিপি', condition: 'অৱস্থা', precautions: 'সাৱধানতা', nextVisit: 'পৰৱৰ্তী ভ্ৰমণ', kilograms: 'কেজি', confirmedSaving: 'নিশ্চিত হ’ল। সংৰক্ষণ কৰা হৈছে।' },
    questions: { title: 'প্ৰশ্ন নিৰ্দেশিকা', startVoiceVisit: 'ভয়েছ ভ্ৰমণ', filterPlaceholder: 'বিচাৰক...', checklistProgress: 'অগ্ৰগতি', answered: 'সম্পূৰ্ণ', speakPrompt: 'শুনক' },
    reports: { title: 'প্ৰতিবেদন', downloadPdf: 'PDF', downloadCsv: 'CSV', visitRecords: 'ভ্ৰমণ নথি' },
    settings: { title: 'ছেটিংছ', languageSpeech: 'ভাষা আৰু কণ্ঠ', preferredLanguage: 'ভাষা', voiceSpeed: 'গতি', testSpeed: 'পৰীক্ষা', accessibility: 'প্ৰদৰ্শন আৰু ছিংক' },
  }),
};

export function getTranslations(language: LanguageCode | string | undefined): AppTranslations {
  if (!language) return TRANSLATIONS.en;
  return TRANSLATIONS[language as LanguageCode] ?? TRANSLATIONS.en;
}
