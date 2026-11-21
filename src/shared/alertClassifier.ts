import { detectDangerSigns } from './dangerSigns';
import type { PatientAlertSeverity, VisitType } from './types';

export interface PatientConcernClassification {
  severityLevel: PatientAlertSeverity;
  severityLabel:
    | 'LEVEL 1 – NORMAL REMINDER (GREEN)'
    | 'LEVEL 2 – ATTENTION REQUIRED (ORANGE)'
    | 'LEVEL 3 – URGENT REFERRAL / EMERGENCY (RED)';
  alertCategory: string;
  escalationRequired: boolean;
  requiresImmediateEmergencyCare: boolean;
  matchedDangerTitles: string[];
  protocolGuidance: string;
  emergencyActionSteps: string[];
}

const EMERGENCY_CONCERN_KEYWORDS =
  /(unconscious|faint|fainted|seizure|fits|convulsion|heavy\s+bleeding|vaginal\s+bleeding|chest\s+pain|severe\s+breathing|cannot\s+breathe|difficulty\s+breathing|not\s+breathing|blue\s+lips|baby\s+not\s+moving|stopped\s+moving|severe\s+abdominal|high\s+fever\s+and\s+not\s+feeding|emergency)/i;

const ATTENTION_CONCERN_KEYWORDS =
  /(fever|swelling|headache|dizziness|vomiting|nausea|missed\s+visit|missed\s+dose|difficulty\s+following|pain|weakness|cough|diarrhea|loose\s+motion|rash|concern|help|callback)/i;

export const PRESET_PATIENT_CONCERNS: Array<{
  id: string;
  label: string;
  defaultSeverity: PatientAlertSeverity;
  category: string;
}> = [
  {
    id: 'CONCERN_BLEEDING',
    label: 'Heavy bleeding / severe pain',
    defaultSeverity: 'RED',
    category: 'MATERNAL_EMERGENCY',
  },
  {
    id: 'CONCERN_BREATHING',
    label: 'Severe difficulty breathing / chest pain / fits',
    defaultSeverity: 'RED',
    category: 'EMERGENCY_DANGER_SIGN',
  },
  {
    id: 'CONCERN_NEWBORN_FEED',
    label: 'Newborn has high fever or is not feeding',
    defaultSeverity: 'RED',
    category: 'NEWBORN_EMERGENCY',
  },
  {
    id: 'CONCERN_FEVER_MILD',
    label: 'Mild fever, weakness, or swelling',
    defaultSeverity: 'ORANGE',
    category: 'SYMPTOM_ATTENTION',
  },
  {
    id: 'CONCERN_MEDICATION_HELP',
    label: 'Difficulty following medicine or precaution instructions',
    defaultSeverity: 'ORANGE',
    category: 'INSTRUCTION_FOLLOWUP',
  },
  {
    id: 'CONCERN_MISSED_VISIT',
    label: 'Missed visit or need to reschedule check-up',
    defaultSeverity: 'ORANGE',
    category: 'MISSED_FOLLOWUP',
  },
];

export const EMERGENCY_PHC_INSTRUCTIONS: string[] = [
  'Call 108 (National Emergency Ambulance) immediately or have a family member take you to Devanahalli PHC / nearest 24x7 hospital right now.',
  'Do NOT wait for a reply from your ASHA worker before travelling for emergency medical care.',
  'Keep your Mother & Child Protection (MCP) card and any doctor notes ready while moving to the facility.',
];

/**
 * Deterministic 3-tier severity classifier backed by the validated NHM danger-sign engine.
 * Never invents medications or overrides danger-sign rules.
 */
export function classifyPatientConcern(params: {
  concernText: string;
  presetId?: string | null;
  visitTypeHint?: VisitType | null;
  requestCallback?: boolean;
}): PatientConcernClassification {
  const cleanText = params.concernText.trim();
  const preset = PRESET_PATIENT_CONCERNS.find((p) => p.id === params.presetId);
  const dangerAnalysis = detectDangerSigns(cleanText, params.visitTypeHint ?? 'ANC');

  const isRed =
    dangerAnalysis.status === 'positive_detected' ||
    preset?.defaultSeverity === 'RED' ||
    EMERGENCY_CONCERN_KEYWORDS.test(cleanText);

  if (isRed) {
    const matchedTitles = dangerAnalysis.matches.map((m) => m.title);
    if (matchedTitles.length === 0 && preset?.defaultSeverity === 'RED') {
      matchedTitles.push(preset.label);
    }
    return {
      severityLevel: 'RED',
      severityLabel: 'LEVEL 3 – URGENT REFERRAL / EMERGENCY (RED)',
      alertCategory: preset?.category ?? 'URGENT_DANGER_SIGN',
      escalationRequired: true,
      requiresImmediateEmergencyCare: true,
      matchedDangerTitles: matchedTitles,
      protocolGuidance:
        'URGENT DANGER SIGN DETECTED: Call 108 Ambulance immediately or proceed to Devanahalli PHC / nearest 24x7 CEmONC facility. Immediate ASHA & Supervisor alert dispatched.',
      emergencyActionSteps: EMERGENCY_PHC_INSTRUCTIONS,
    };
  }

  const isOrange =
    preset?.defaultSeverity === 'ORANGE' ||
    ATTENTION_CONCERN_KEYWORDS.test(cleanText) ||
    Boolean(params.requestCallback) ||
    cleanText.length > 0;

  if (isOrange) {
    return {
      severityLevel: 'ORANGE',
      severityLabel: 'LEVEL 2 – ATTENTION REQUIRED (ORANGE)',
      alertCategory: preset?.category ?? 'PATIENT_CONCERN',
      escalationRequired: false,
      requiresImmediateEmergencyCare: false,
      matchedDangerTitles: [],
      protocolGuidance:
        'Attention required: Assigned ASHA worker has been notified to follow up and review symptoms or instructions. If symptoms worsen, call 108 or go to Devanahalli PHC immediately.',
      emergencyActionSteps: [],
    };
  }

  return {
    severityLevel: 'GREEN',
    severityLabel: 'LEVEL 1 – NORMAL REMINDER (GREEN)',
    alertCategory: 'ROUTINE_CARE',
    escalationRequired: false,
    requiresImmediateEmergencyCare: false,
    matchedDangerTitles: [],
    protocolGuidance: 'Routine update logged. Continue following doctor-approved precautions and scheduled visits.',
    emergencyActionSteps: [],
  };
}
