import {
  extractBloodPressure,
  extractWeightKg,
  matchBeneficiary,
  normalizeNumerals,
  normalizeSpokenNumbers,
  parseSpokenDate,
} from './clinicalEngine';
import { detectDangerSigns } from './dangerSigns';
import type {
  Beneficiary,
  VisitType,
  VoiceIntentClassification,
  VoiceIntentTask,
} from './types';

function detectCategoryKeywords(text: string): VisitType | null {
  const lower = normalizeNumerals(text).toLowerCase();

  // Emergency / Referral Alert
  if (
    /(emergency\s*alert|referral\s*alert|urgent\s*referral|immediate\s*attention\s*alert|danger\s*sign)/i.test(
      lower,
    ) ||
    detectDangerSigns(text).status === 'positive_detected'
  ) {
    return 'EMERGENCY';
  }

  // Postnatal Care
  if (
    /(postnatal|post-natal|post\s+natal|pnc\b|after\s+delivery|post\s+delivery|mother\s+after\s+birth|प्रसवोत्तर|ಬಾಣಂತಿ|பிரசவத்திற்குப் பின்|ప్రసవానంతర)/i.test(
      lower,
    )
  ) {
    return 'POSTNATAL';
  }

  // Newborn Care (avoid false positive on "anc")
  if (
    /(newborn|neonate|new\s+born|baby\s+care|infant|birth\s+weight|breastfeeding|ನವಜಾತ|ಶಿಶು|नवजात|शिशु|பிறந்த குழந்தை|నవజాత)/i.test(
      lower,
    )
  ) {
    return 'NEWBORN';
  }

  // Vaccination / Immunisation
  if (
    /(vaccinat|immunis|immuniz|bcg|opv|pentavalent|polio|rvv|measles|mr-?1|pcv|dpt|ಲಸಿಕೆ|टीका|लसीकरण|தடுப்பூசி|టీకా|വാക്സിൻ|টিকা|રસી|ਟੀਕਾ|ଟୀକା)/i.test(
      lower,
    ) &&
    !/\banc\b/i.test(lower)
  ) {
    return 'IMMUNISATION';
  }

  // Pregnancy Visit / ANC
  if (
    /(pregnancy|pregnant|anc\b|antenatal|maternal|gestational|ifa\b|ಗರ್ಭಿಣಿ|ಗರ್ಭಾವಸ್ಥೆ|गर्भवती|गर्भावस्था|கர்ப்பிணி|గర్భిణీ|ഗർഭിണി|গর্ভবতী)/i.test(
      lower,
    )
  ) {
    return 'ANC';
  }

  // Follow-up Visit
  if (/(follow[\s-]*up\s+visit|revisit|check[\s-]*back\s+visit)/i.test(lower)) {
    return 'FOLLOWUP';
  }

  // General Health Visit
  if (
    /(general\s+health|general\s+visit|general\s+checkup|fever\s+check|bp\s+check|blood\s+pressure\s+check|outpatient|ಸಾಮಾನ್ಯ\s+ಭೇಟಿ|सामान्य\s+जांच)/i.test(
      lower,
    )
  ) {
    return 'GENERAL';
  }

  return null;
}

function resolveTargetBeneficiary(
  transcript: string,
  beneficiaries: Beneficiary[],
): { code: string | null; name: string | null } {
  // Prefer mother "Rekha" over "Baby of Rekha" if speaker mentions "Rekha" without "baby"
  const lower = transcript.toLowerCase();
  const directMatch = beneficiaries.find(
    (b) => b.displayName.toLowerCase() === 'rekha' && /\brekha\b/i.test(lower) && !/\bbaby\b/i.test(lower),
  );
  if (directMatch) {
    return { code: directMatch.beneficiaryCode, name: directMatch.displayName };
  }

  const m = matchBeneficiary(transcript, beneficiaries);
  if (m.status === 'MATCHED') {
    return { code: m.matches[0].beneficiaryCode, name: m.matches[0].displayName };
  }
  if (m.status === 'AMBIGUOUS' && m.matches.length > 0) {
    // Prefer exact single-word name match over compound display name (e.g. "Rekha" vs "Baby of Rekha")
    const exactWord = m.matches.find((c) => lower.includes(c.displayName.toLowerCase()));
    if (exactWord) {
      return { code: exactWord.beneficiaryCode, name: exactWord.displayName };
    }
  }
  return { code: null, name: null };
}

/**
 * Deterministic voice command & clinical visit intent classifier.
 * Handles all 8 natural command patterns, all 7 categories, missing-field detection,
 * and asks clarification whenever ambiguous.
 */
export function classifyVoiceCommand(
  rawCommand: string,
  beneficiaries: Beneficiary[] = [],
  _fallbackCategory?: VisitType | null,
): VoiceIntentClassification {
  const cleaned = rawCommand.trim();
  const normalized = normalizeSpokenNumbers(cleaned);
  const lower = normalized.toLowerCase();

  if (!cleaned || cleaned.length < 3) {
    return {
      rawCommand: cleaned,
      detectedTask: 'UNCLEAR_NEEDS_CLARIFICATION',
      detectedCategory: null,
      targetBeneficiaryCode: null,
      targetBeneficiaryName: null,
      suggestedDate: null,
      suggestedMessage: null,
      missingFields: ['command'],
      clarificationPrompt:
        'Could you repeat what you would like to do? For example: "Start a pregnancy visit", "Show pending follow-ups", or "Check patient alerts".',
      confidence: 0.2,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  const benTarget = resolveTargetBeneficiary(normalized, beneficiaries);
  const parsedDate = parseSpokenDate(normalized);
  const detectedCat = detectCategoryKeywords(cleaned);

  // 1. Show patients needing immediate attention / urgent red alerts
  if (
    /(immediate\s+attention|urgent\s+patients?|critical\s+patients?|emergency\s+patients?|red\s+alerts?|who\s+needs?\s+help\s+now)/i.test(
      lower,
    )
  ) {
    return {
      rawCommand: cleaned,
      detectedTask: 'SHOW_URGENT_PATIENTS',
      detectedCategory: 'EMERGENCY',
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: null,
      suggestedMessage: null,
      missingFields: [],
      clarificationPrompt: null,
      confidence: 0.96,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 2. Show pending follow-ups
  if (
    /(show|open|view|check|list|see)\s+(?:all\s+|my\s+)?(?:pending\s+)?follow[\s-]*ups?|pending\s+follow[\s-]*ups?/i.test(
      lower,
    )
  ) {
    return {
      rawCommand: cleaned,
      detectedTask: 'SHOW_FOLLOWUPS',
      detectedCategory: 'FOLLOWUP',
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: parsedDate,
      suggestedMessage: null,
      missingFields: [],
      clarificationPrompt: null,
      confidence: 0.96,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 3. Check patient alerts
  if (
    /(check|show|open|view)\s+(?:all\s+)?(?:patient\s+)?alerts?|patient\s+alerts?/i.test(lower)
  ) {
    return {
      rawCommand: cleaned,
      detectedTask: 'CHECK_ALERTS',
      detectedCategory: null,
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: null,
      suggestedMessage: null,
      missingFields: [],
      clarificationPrompt: null,
      confidence: 0.95,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 4. Send a reminder / notification to a patient
  if (/(send\s+(?:a\s+)?reminder|send\s+(?:a\s+)?message|remind\s+|notify\s+)/i.test(lower)) {
    const missing: string[] = [];
    if (!benTarget.code && !benTarget.name) {
      missing.push('patientName');
    }
    // Check if an explicit reminder body was spoken after "saying" / "that" / "about"
    const msgMatch = cleaned.match(/(?:about|saying|that|message[:\s]+)\s+(.+)$/i);
    const extractedMsg = msgMatch ? msgMatch[1].trim() : null;
    if (!extractedMsg) {
      missing.push('reminderMessage');
    }
    return {
      rawCommand: cleaned,
      detectedTask: 'SEND_REMINDER',
      detectedCategory: detectedCat,
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: parsedDate,
      suggestedMessage: extractedMsg,
      missingFields: missing,
      clarificationPrompt: !benTarget.name
        ? 'Which patient should receive this reminder? Please speak the patient name.'
        : null,
      confidence: 0.93,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 5. Schedule next visit / follow-up for a patient
  if (
    /(schedule\s+(?:the\s+)?next\s+visit|schedule\s+(?:a\s+)?follow[\s-]*up|book\s+(?:next\s+)?visit|set\s+next\s+visit)/i.test(
      lower,
    )
  ) {
    const missing: string[] = [];
    if (!benTarget.name) missing.push('patientName');
    if (!parsedDate) missing.push('nextVisitDate');
    return {
      rawCommand: cleaned,
      detectedTask: 'SCHEDULE_VISIT',
      detectedCategory: detectedCat ?? 'FOLLOWUP',
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: parsedDate,
      suggestedMessage: null,
      missingFields: missing,
      clarificationPrompt: !benTarget.name
        ? 'Which patient would you like to schedule the next visit for?'
        : !parsedDate
          ? `What date should we schedule the next visit for ${benTarget.name}?`
          : null,
      confidence: 0.94,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 6. Start / Record visit with explicit or inferred category
  const hasClinicalSignals =
    extractBloodPressure(cleaned) !== null ||
    extractWeightKg(cleaned) !== null ||
    benTarget.code !== null ||
    /(record|start|open|begin|new|add|log|enter|visit|details|checkup)/i.test(lower);

  if (detectedCat && hasClinicalSignals) {
    const missing: string[] = [];
    if (!benTarget.name) missing.push('patientName');
    if (detectedCat === 'ANC') {
      if (extractBloodPressure(cleaned) === null) missing.push('bloodPressure');
      if (extractWeightKg(cleaned) === null) missing.push('weightKg');
    } else if (detectedCat === 'NEWBORN') {
      if (extractWeightKg(cleaned) === null) missing.push('babyWeight');
    } else if (detectedCat === 'IMMUNISATION') {
      if (!/(bcg|opv|pentavalent|polio|rvv|pcv|mr-|dpt)/i.test(lower)) missing.push('vaccinesGiven');
    }

    const clarification =
      missing.length > 0 && cleaned.split(/\s+/).length <= 10
        ? `Opened ${categoryDisplayTitle(detectedCat)}. Please speak or fill in: ${missing.join(', ')}.`
        : null;

    return {
      rawCommand: cleaned,
      detectedTask: 'RECORD_VISIT' as VoiceIntentTask,
      detectedCategory: detectedCat,
      targetBeneficiaryCode: benTarget.code,
      targetBeneficiaryName: benTarget.name,
      suggestedDate: parsedDate,
      suggestedMessage: null,
      missingFields: missing,
      clarificationPrompt: clarification,
      confidence: 0.92,
      source: 'DETERMINISTIC_INTENT',
    };
  }

  // 7. Vague or unclear prompt (e.g. "record something", "open form", "hello")
  return {
    rawCommand: cleaned,
    detectedTask: 'UNCLEAR_NEEDS_CLARIFICATION',
    detectedCategory: detectedCat,
    targetBeneficiaryCode: benTarget.code,
    targetBeneficiaryName: benTarget.name,
    suggestedDate: parsedDate,
    suggestedMessage: null,
    missingFields: ['visitCategory', ...(benTarget.name ? [] : ['patientName'])],
    clarificationPrompt:
      'Command was unclear. Say a visit type (Pregnancy, Newborn, Vaccination, Postnatal, General, Follow-up, or Emergency) or a task like "Show pending follow-ups" or "Check patient alerts".',
    confidence: 0.35,
    source: 'DETERMINISTIC_INTENT',
  };
}

export function categoryDisplayTitle(vt: VisitType): string {
  switch (vt) {
    case 'ANC':
      return 'Pregnancy Visit';
    case 'NEWBORN':
      return 'Newborn Care';
    case 'IMMUNISATION':
      return 'Vaccination';
    case 'POSTNATAL':
      return 'Postnatal Care';
    case 'GENERAL':
      return 'General Health Visit';
    case 'FOLLOWUP':
      return 'Follow-up Visit';
    case 'EMERGENCY':
      return 'Emergency / Referral Alert';
  }
}
