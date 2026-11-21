import type {
  CareAppointment,
  FollowupTask,
  HealthcareMode,
  LanguageCode,
  NewbornCareRecord,
  PatientProfileRecord,
  PatientQrCardPayload,
  PregnancyCareRecord,
  PregnancyRiskFactor,
  PregnancyRiskTier,
  SmartFollowupBucket,
  SmartFollowupItem,
  SmartFollowupSummary,
  VaccinationCareRecord,
} from './types';

// -----------------------------------------------------------------------------
// 1. QR-BASED PATIENT IDENTITY CODEC
// -----------------------------------------------------------------------------

export function buildPatientQrPayload(
  patient: Pick<PatientProfileRecord, 'patientUniqueId' | 'fullName' | 'assignedMode' | 'locality'>,
  issuedAt = new Date().toISOString().slice(0, 10),
): PatientQrCardPayload {
  return {
    v: 1,
    app: 'ASHA_HEALTH_ID',
    patientUniqueId: patient.patientUniqueId.trim().toUpperCase(),
    fullName: patient.fullName.trim(),
    assignedMode: patient.assignedMode,
    locality: patient.locality ?? null,
    issuedAt,
  };
}

export function encodePatientQrPayload(payload: PatientQrCardPayload): string {
  return JSON.stringify(payload);
}

export function parsePatientQrInput(rawInput: string): {
  valid: boolean;
  patientUniqueId: string | null;
  payload: PatientQrCardPayload | null;
  error?: string;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, patientUniqueId: null, payload: null, error: 'Empty QR input' };
  }

  // Case A: Direct Patient ID or Beneficiary Code (e.g., PAT-2026-0001 or ASHA00126)
  const directMatch = trimmed.match(/^(PAT-\d{4}-\d{3,6}|ASHA\d{4,6})$/i);
  if (directMatch) {
    return {
      valid: true,
      patientUniqueId: directMatch[1].toUpperCase(),
      payload: null,
    };
  }

  // Case B: URL containing ?patientId=PAT-2026-0001
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const paramId = url.searchParams.get('patientId') ?? url.searchParams.get('id');
      if (paramId && /^(PAT-\d{4}-\d{3,6}|ASHA\d{4,6})$/i.test(paramId.trim())) {
        return {
          valid: true,
          patientUniqueId: paramId.trim().toUpperCase(),
          payload: null,
        };
      }
    } catch {
      // fall through to JSON attempt
    }
  }

  // Case C: Structured ASHA Health ID JSON payload
  try {
    const parsed = JSON.parse(trimmed) as Partial<PatientQrCardPayload>;
    if (
      parsed &&
      parsed.app === 'ASHA_HEALTH_ID' &&
      typeof parsed.patientUniqueId === 'string' &&
      /^(PAT-\d{4}-\d{3,6}|ASHA\d{4,6})$/i.test(parsed.patientUniqueId.trim())
    ) {
      return {
        valid: true,
        patientUniqueId: parsed.patientUniqueId.trim().toUpperCase(),
        payload: {
          v: 1,
          app: 'ASHA_HEALTH_ID',
          patientUniqueId: parsed.patientUniqueId.trim().toUpperCase(),
          fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
          assignedMode:
            parsed.assignedMode === 'PREGNANCY' ||
            parsed.assignedMode === 'NEWBORN_CARE' ||
            parsed.assignedMode === 'VACCINATION'
              ? parsed.assignedMode
              : 'PREGNANCY',
          locality: typeof parsed.locality === 'string' ? parsed.locality : null,
          issuedAt: typeof parsed.issuedAt === 'string' ? parsed.issuedAt : '',
        },
      };
    }
  } catch {
    // Check if an ID appears embedded anywhere in scanned text
    const embeddedMatch = trimmed.match(/(PAT-\d{4}-\d{3,6}|ASHA\d{4,6})/i);
    if (embeddedMatch) {
      return {
        valid: true,
        patientUniqueId: embeddedMatch[1].toUpperCase(),
        payload: null,
      };
    }
  }

  return {
    valid: false,
    patientUniqueId: null,
    payload: null,
    error: 'Unrecognized QR Health ID format. Scan an ASHA Health ID QR or enter PAT-YYYY-XXXX.',
  };
}

// -----------------------------------------------------------------------------
// 2. SMART FOLLOW-UP SYSTEM ENGINE
// -----------------------------------------------------------------------------

function addDaysIso(baseIso: string, days: number): string {
  const dt = new Date(`${baseIso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return baseIso;
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDaysIso(targetIso: string, baseIso: string): number {
  const a = new Date(`${targetIso.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${baseIso.slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 999;
  return Math.round((a - b) / 86_400_000);
}

export function classifyDueBucket(dueDate: string | null | undefined, todayIso: string): SmartFollowupBucket {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}/.test(dueDate)) return 'UNSCHEDULED';
  const diff = diffDaysIso(dueDate, todayIso);
  if (diff < 0) return 'OVERDUE';
  if (diff === 0) return 'DUE_TODAY';
  if (diff <= 7) return 'UPCOMING_7_DAYS';
  return 'FUTURE';
}

export function computeSmartFollowups(params: {
  todayIso?: string;
  followups: FollowupTask[];
  appointments: Array<CareAppointment & { patientName?: string; patientUniqueId?: string }>;
  pregnancies: Array<{
    patient: PatientProfileRecord;
    record: PregnancyCareRecord | null;
  }>;
  newborns: Array<{
    patient: PatientProfileRecord;
    record: NewbornCareRecord | null;
  }>;
  vaccinations: Array<{
    patient: PatientProfileRecord;
    record: VaccinationCareRecord;
  }>;
}): SmartFollowupSummary {
  const todayIso = params.todayIso ?? new Date().toISOString().slice(0, 10);
  const items: SmartFollowupItem[] = [];

  // A. Existing pending follow-up tasks from register
  for (const fu of params.followups) {
    if (fu.taskStatus === 'COMPLETED') continue;
    const bucket = classifyDueBucket(fu.dueDate, todayIso);
    const isReferral =
      fu.priority === 'IMMEDIATE_REFERRAL' || fu.priority === 'HIGH_PRIORITY_REFERRAL';
    const baseScore = isReferral ? 95 : bucket === 'OVERDUE' ? 88 : bucket === 'DUE_TODAY' ? 78 : 55;
    const urgency: SmartFollowupItem['urgency'] = isReferral
      ? 'CRITICAL'
      : bucket === 'OVERDUE'
        ? 'HIGH'
        : bucket === 'DUE_TODAY'
          ? 'MEDIUM'
          : 'LOW';

    items.push({
      id: `sf-fu-${fu.id}`,
      source: 'FOLLOWUP_TASK',
      patientName: fu.beneficiaryName ?? 'Beneficiary',
      patientCode: fu.beneficiaryCode ?? fu.beneficiaryId,
      beneficiaryId: fu.beneficiaryId,
      healthcareMode: 'PREGNANCY',
      title: fu.taskDescription,
      reason:
        bucket === 'OVERDUE'
          ? `Overdue since ${fu.dueDate}`
          : bucket === 'DUE_TODAY'
            ? 'Due today'
            : `Priority: ${fu.priority.replace(/_/g, ' ')}`,
      dueDate: fu.dueDate,
      bucket,
      priorityScore: baseScore,
      urgency,
      actionableFollowupId: fu.id,
    });
  }

  // B. Scheduled care appointments
  for (const appt of params.appointments) {
    if (appt.status !== 'SCHEDULED') continue;
    const bucket = classifyDueBucket(appt.scheduledDate, todayIso);
    const score = bucket === 'OVERDUE' ? 85 : bucket === 'DUE_TODAY' ? 76 : 52;
    items.push({
      id: `sf-appt-${appt.id}`,
      source: 'CARE_APPOINTMENT',
      patientName: appt.patientName ?? 'Patient',
      patientCode: appt.patientUniqueId ?? appt.patientId,
      healthcareMode: appt.healthcareMode,
      title: appt.title,
      reason: `${appt.location ?? 'PHC'} · ${appt.scheduledTime ?? 'Scheduled checkup'}`,
      dueDate: appt.scheduledDate,
      bucket,
      priorityScore: score,
      urgency: bucket === 'OVERDUE' ? 'HIGH' : bucket === 'DUE_TODAY' ? 'MEDIUM' : 'LOW',
    });
  }

  // C. Pending/Scheduled/Overdue vaccines
  for (const vItem of params.vaccinations) {
    const v = vItem.record;
    if (v.status === 'COMPLETED') continue;
    const bucket = classifyDueBucket(v.dueDate, todayIso);
    const score = bucket === 'OVERDUE' || v.status === 'OVERDUE' ? 86 : bucket === 'DUE_TODAY' ? 75 : 54;
    items.push({
      id: `sf-vacc-${v.id}`,
      source: 'VACCINATION_DUE',
      patientName: vItem.patient.fullName,
      patientCode: vItem.patient.patientUniqueId,
      beneficiaryId: vItem.patient.beneficiaryId ?? undefined,
      healthcareMode: 'VACCINATION',
      title: `${v.vaccineName} (${v.doseLabel})`,
      reason:
        bucket === 'OVERDUE'
          ? `Vaccination overdue (due ${v.dueDate})`
          : `NIS scheduled dose due ${v.dueDate}`,
      dueDate: v.dueDate,
      bucket,
      priorityScore: score,
      urgency: bucket === 'OVERDUE' ? 'HIGH' : bucket === 'DUE_TODAY' ? 'MEDIUM' : 'LOW',
    });
  }

  // D. Rule-based Milestone Recommendations (ANC trimester checks & HBNC Day 1/3/7/14/21/28/42)
  const existingTaskText = params.followups
    .filter((f) => f.taskStatus === 'PENDING')
    .map((f) => `${f.beneficiaryId}:${f.taskDescription.toLowerCase()}`);

  for (const pItem of params.pregnancies) {
    const rec = pItem.record;
    if (!rec) continue;
    const weeks = rec.gestationalWeeks ?? 0;
    const expectedMinAnc = weeks >= 36 ? 4 : weeks >= 28 ? 3 : weeks >= 14 ? 2 : 1;
    const needsAnc = rec.ancVisitsCompleted < expectedMinAnc;
    const nextMissing = !rec.nextCheckupDate;
    const highRisk = rec.riskLevel === 'HIGH_RISK';

    if (needsAnc || nextMissing || highRisk) {
      const targetDate = rec.nextCheckupDate ?? addDaysIso(todayIso, highRisk ? 1 : 3);
      const bucket = classifyDueBucket(targetDate, todayIso);
      const alreadyTracked = existingTaskText.some(
        (txt) =>
          (pItem.patient.beneficiaryId && txt.startsWith(pItem.patient.beneficiaryId)) ||
          txt.includes(pItem.patient.fullName.toLowerCase()),
      );
      if (!alreadyTracked) {
        items.push({
          id: `sf-rec-preg-${pItem.patient.id}`,
          source: 'RECOMMENDED_MILESTONE',
          patientName: pItem.patient.fullName,
          patientCode: pItem.patient.patientUniqueId,
          beneficiaryId: pItem.patient.beneficiaryId ?? undefined,
          healthcareMode: 'PREGNANCY',
          title: highRisk
            ? `Urgent ANC Risk Follow-up for ${pItem.patient.fullName} (${pItem.patient.patientUniqueId})`
            : `Recommended ANC Checkup (${weeks || '?'}w · ${rec.ancVisitsCompleted}/${expectedMinAnc} visits done)`,
          reason: highRisk
            ? 'Pregnancy risk level flagged HIGH_RISK — prioritize BP & Hb verification'
            : `NHM ANC schedule expects >=${expectedMinAnc} visits by week ${weeks || 'current'}`,
          dueDate: targetDate,
          bucket,
          priorityScore: highRisk ? 92 : 70,
          urgency: highRisk ? 'CRITICAL' : 'MEDIUM',
          canAutoCreate: true,
          suggestedPriority: highRisk ? 'HIGH_PRIORITY_REFERRAL' : 'SCHEDULED_VISIT',
        });
      }
    }
  }

  const hbncDays = [1, 3, 7, 14, 21, 28, 42];
  for (const nbItem of params.newborns) {
    const rec = nbItem.record;
    if (!rec || !rec.birthDate) continue;
    const ageDays = Math.max(0, diffDaysIso(todayIso, rec.birthDate));
    const nextMilestoneDay = hbncDays.find((d) => d >= ageDays) ?? 42;
    const dueDate = addDaysIso(rec.birthDate, nextMilestoneDay);
    const alreadyTracked = existingTaskText.some((txt) =>
      txt.includes(nbItem.patient.fullName.toLowerCase()),
    );
    if (!alreadyTracked && ageDays <= 45) {
      const bucket = classifyDueBucket(dueDate, todayIso);
      items.push({
        id: `sf-rec-nb-${nbItem.patient.id}`,
        source: 'RECOMMENDED_MILESTONE',
        patientName: rec.babyName,
        patientCode: nbItem.patient.patientUniqueId,
        beneficiaryId: nbItem.patient.beneficiaryId ?? undefined,
        healthcareMode: 'NEWBORN_CARE',
        title: `HBNC Day-${nextMilestoneDay} Newborn Visit for ${rec.babyName}`,
        reason: `Baby is ${ageDays} days old (${rec.hbncVisitsCompleted} HBNC visits logged)`,
        dueDate,
        bucket,
        priorityScore: bucket === 'DUE_TODAY' || bucket === 'OVERDUE' ? 80 : 62,
        urgency: bucket === 'OVERDUE' ? 'HIGH' : 'MEDIUM',
        canAutoCreate: true,
        suggestedPriority: 'ROUTINE_FOLLOWUP',
      });
    }
  }

  items.sort((a, b) => b.priorityScore - a.priorityScore);

  const overdue = items.filter((i) => i.bucket === 'OVERDUE').length;
  const dueToday = items.filter((i) => i.bucket === 'DUE_TODAY').length;
  const upcoming7Days = items.filter((i) => i.bucket === 'UPCOMING_7_DAYS').length;
  const recommendedMilestones = items.filter((i) => i.source === 'RECOMMENDED_MILESTONE').length;

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      overdue,
      dueToday,
      upcoming7Days,
      recommendedMilestones,
      totalActionable: items.length,
    },
    items,
  };
}

// -----------------------------------------------------------------------------
// 3. AI-BASED PREGNANCY RISK ALERT SYSTEM (DETERMINISTIC NHM CLINICAL SCORING)
// -----------------------------------------------------------------------------

export function parseBpReading(bp: string | null | undefined): {
  systolic: number;
  diastolic: number;
} | null {
  if (!bp) return null;
  const m = bp.match(/(\d{2,3})\s*[/\\-]\s*(\d{2,3})/);
  if (!m) return null;
  const systolic = Number(m[1]);
  const diastolic = Number(m[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  if (systolic < 50 || systolic > 260 || diastolic < 30 || diastolic > 170) return null;
  return { systolic, diastolic };
}

export function evaluatePregnancyRiskDeterministic(input: {
  bloodPressure?: string | null;
  hemoglobinGDl?: number | null;
  gestationalWeeks?: number | null;
  weightKg?: number | null;
  age?: number | null;
  ancVisitsCompleted?: number | null;
  ifaTabletsStatus?: string | null;
  symptomsOrNotes?: string | null;
}): {
  riskScore: number;
  riskTier: PregnancyRiskTier;
  phcReferralRequired: boolean;
  factors: PregnancyRiskFactor[];
  recommendations: string[];
} {
  const factors: PregnancyRiskFactor[] = [];
  const recommendations: string[] = [];

  // 1. Blood Pressure check (NHM HRP / Preeclampsia threshold)
  const bp = parseBpReading(input.bloodPressure);
  if (bp) {
    if (bp.systolic >= 160 || bp.diastolic >= 110) {
      factors.push({
        code: 'SEVERE_HYPERTENSION',
        label: 'Severe Pregnancy Hypertension (>=160/110 mmHg)',
        severity: 'CRITICAL',
        observedValue: `${bp.systolic}/${bp.diastolic} mmHg`,
        guidelineRef: 'PMSMA / NHM High-Risk Pregnancy Guidelines',
        points: 50,
      });
      recommendations.push(
        'Immediate PHC / FRU Medical Officer referral today; check urine protein and eclampsia danger signs.',
      );
    } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
      factors.push({
        code: 'GESTATIONAL_HYPERTENSION',
        label: 'Elevated Blood Pressure (>=140/90 mmHg)',
        severity: 'HIGH',
        observedValue: `${bp.systolic}/${bp.diastolic} mmHg`,
        guidelineRef: 'NHM ASHA Module 6 · ANC Hypertension Screen',
        points: 35,
      });
      recommendations.push(
        'Repeat BP reading within 24 hours and schedule urgent ANM/PHC doctor evaluation.',
      );
    }
  }

  // 2. Hemoglobin / Anemia check
  if (typeof input.hemoglobinGDl === 'number' && Number.isFinite(input.hemoglobinGDl)) {
    const hb = input.hemoglobinGDl;
    if (hb < 7.0) {
      factors.push({
        code: 'SEVERE_ANEMIA',
        label: 'Severe Maternal Anemia (Hb < 7.0 g/dL)',
        severity: 'CRITICAL',
        observedValue: `${hb.toFixed(1)} g/dL`,
        guidelineRef: 'Anemia Mukt Bharat · Severe Anemia Protocol',
        points: 45,
      });
      recommendations.push(
        'Immediate FRU/PHC referral for IV iron sucrose or blood transfusion evaluation.',
      );
    } else if (hb < 10.0) {
      factors.push({
        code: 'MODERATE_ANEMIA',
        label: 'Moderate Maternal Anemia (Hb 7.0–9.9 g/dL)',
        severity: 'HIGH',
        observedValue: `${hb.toFixed(1)} g/dL`,
        guidelineRef: 'Anemia Mukt Bharat · Therapeutic IFA Protocol',
        points: 25,
      });
      recommendations.push(
        'Ensure therapeutic double-dose IFA tablets with vitamin C and repeat Hb in 4 weeks.',
      );
    } else if (hb < 11.0) {
      factors.push({
        code: 'MILD_ANEMIA',
        label: 'Borderline Low Hemoglobin (Hb 10.0–10.9 g/dL)',
        severity: 'MODERATE',
        observedValue: `${hb.toFixed(1)} g/dL`,
        guidelineRef: 'NHM ANC Nutrition Guidance',
        points: 12,
      });
      recommendations.push('Counsel on iron-rich diet and daily IFA adherence.');
    }
  }

  // 3. Danger symptom keywords in notes/observations
  const notes = (input.symptomsOrNotes ?? '').toLowerCase();
  const criticalKeywords: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(bleeding|hemorrhage|blood loss|spotting)\b/i, label: 'Vaginal Bleeding Reported' },
    { pattern: /\b(convulsion|seizure|fits|unconscious)\b/i, label: 'Convulsions / Seizure Sign' },
    {
      pattern: /\b(blurred vision|severe headache|epigastric pain)\b/i,
      label: 'Preeclampsia Neurological Sign',
    },
    {
      pattern: /\b(no fetal movement|reduced fetal movement|baby not moving)\b/i,
      label: 'Reduced Fetal Movements',
    },
  ];
  for (const kw of criticalKeywords) {
    if (kw.pattern.test(notes)) {
      factors.push({
        code: 'DANGER_SYMPTOM_NOTE',
        label: kw.label,
        severity: 'CRITICAL',
        observedValue: 'Mentioned in clinical notes',
        guidelineRef: 'NHM ASHA Module 6 · Obstetric Danger Signs',
        points: 45,
      });
      recommendations.push(
        `Urgent escalation for "${kw.label}" — arrange 108 transport to PHC/CHC immediately.`,
      );
    }
  }

  if (/\b(swelling|edema|oedema|dizziness|high fever|breathlessness)\b/i.test(notes)) {
    factors.push({
      code: 'WARNING_SYMPTOM_NOTE',
      label: 'Warning Symptom (Swelling / Fever / Dizziness)',
      severity: 'HIGH',
      observedValue: 'Observed in notes',
      guidelineRef: 'NHM ANC Checkup Checklist',
      points: 20,
    });
    recommendations.push('Assess BP, urine albumin, and temperature at nearest sub-centre/PHC.');
  }

  // 4. Maternal Age Extremes
  if (typeof input.age === 'number' && Number.isFinite(input.age) && input.age > 0) {
    if (input.age < 18 || input.age >= 35) {
      factors.push({
        code: 'MATERNAL_AGE_RISK',
        label: input.age < 18 ? 'Teenage Pregnancy (<18 yrs)' : 'Advanced Maternal Age (>=35 yrs)',
        severity: 'HIGH',
        observedValue: `${input.age} years`,
        guidelineRef: 'PMSMA High-Risk Pregnancy Criteria',
        points: 20,
      });
      recommendations.push('Ensure institutional delivery plan and monthly PMSMA doctor checkups.');
    }
  }

  // 5. Low Maternal Weight / Post-term Gestational Age
  if (typeof input.weightKg === 'number' && input.weightKg > 0 && input.weightKg < 42) {
    factors.push({
      code: 'LOW_MATERNAL_WEIGHT',
      label: 'Low Maternal Weight (<42 kg)',
      severity: 'MODERATE',
      observedValue: `${input.weightKg} kg`,
      guidelineRef: 'NHM Maternal Nutrition Protocol',
      points: 15,
    });
    recommendations.push('Link to Anganwadi supplementary nutrition and monitor weight gain.');
  }

  const weeks = input.gestationalWeeks ?? null;
  if (typeof weeks === 'number' && weeks >= 41) {
    factors.push({
      code: 'POST_TERM_GESTATION',
      label: 'Post-Term Pregnancy (>=41 weeks)',
      severity: 'HIGH',
      observedValue: `${weeks} weeks`,
      guidelineRef: 'NHM Delivery Readiness Protocol',
      points: 25,
    });
    recommendations.push('Immediate obstetric evaluation for safe delivery planning.');
  }

  // 6. Missed ANC visits relative to gestational age
  if (typeof weeks === 'number' && typeof input.ancVisitsCompleted === 'number') {
    const expected = weeks >= 36 ? 4 : weeks >= 28 ? 3 : weeks >= 14 ? 2 : 1;
    if (input.ancVisitsCompleted < expected - 1) {
      factors.push({
        code: 'MISSED_ANC_VISITS',
        label: 'Delayed / Missed Antenatal Checkups',
        severity: 'MODERATE',
        observedValue: `${input.ancVisitsCompleted} completed vs ${expected} expected`,
        guidelineRef: 'RMNCH+A 4-ANC Schedule',
        points: 14,
      });
      recommendations.push('Schedule catch-up ANC checkup at PHC/VHSND within 7 days.');
    }
  }

  // 7. IFA non-adherence
  if (input.ifaTabletsStatus && /not|stop|skip|missed|none/i.test(input.ifaTabletsStatus)) {
    factors.push({
      code: 'IFA_NON_ADHERENCE',
      label: 'IFA Supplementation Gap',
      severity: 'MODERATE',
      observedValue: input.ifaTabletsStatus,
      guidelineRef: 'Anemia Mukt Bharat',
      points: 10,
    });
    recommendations.push('Supply fresh IFA strip and counsel on taking after meals.');
  }

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  const riskScore = Math.min(100, rawScore);

  const hasCritical = factors.some((f) => f.severity === 'CRITICAL');
  const riskTier: PregnancyRiskTier =
    hasCritical || riskScore >= 65
      ? 'CRITICAL'
      : riskScore >= 35
        ? 'HIGH'
        : riskScore >= 15
          ? 'MODERATE'
          : 'LOW';

  const phcReferralRequired = riskTier === 'CRITICAL' || riskTier === 'HIGH';

  if (recommendations.length === 0) {
    recommendations.push('Continue routine ANC follow-up, daily IFA tablets, and balanced diet.');
  }

  return {
    riskScore,
    riskTier,
    phcReferralRequired,
    factors,
    recommendations,
  };
}

// -----------------------------------------------------------------------------
// 4. OFFLINE HEALTHCARE REFERENCE PROTOCOLS (NHM FIELD HANDBOOK)
// -----------------------------------------------------------------------------

export interface OfflineProtocolCard {
  id: string;
  mode: HealthcareMode;
  title: string;
  keyChecklist: string[];
  redFlags: string[];
}

export function getOfflineProtocolReferences(_language: LanguageCode): OfflineProtocolCard[] {
  return [
    {
      id: 'proto-anc',
      mode: 'PREGNANCY',
      title: 'ANC Antenatal Checkup Protocol (NHM)',
      keyChecklist: [
        'Measure BP, maternal weight, and check hemoglobin (Hb >= 11 g/dL target).',
        'Verify 180 IFA tablets + Calcium intake and Td-1 / Td-2 vaccination.',
        'Confirm institutional delivery birth preparedness & JSY registration.',
      ],
      redFlags: [
        'BP >= 140/90 mmHg, severe headache, blurred vision, or facial/leg swelling',
        'Vaginal bleeding, severe abdominal pain, convulsions, or reduced fetal movement',
      ],
    },
    {
      id: 'proto-hbnc',
      mode: 'NEWBORN_CARE',
      title: 'HBNC Newborn Home Visit Schedule (Days 1, 3, 7, 14, 21, 28, 42)',
      keyChecklist: [
        'Keep baby warm (skin-to-skin / KMC if < 2.5 kg) and ensure exclusive breastfeeding.',
        'Check axillary temperature (normal 97.7–99.5°F) and keep umbilical cord clean & dry.',
        'Track weekly weight gain (healthy term infant regains birth weight by Day 10–14).',
      ],
      redFlags: [
        'Fast breathing (>=60/min), chest indrawing, lethargy, or weak/absent cry',
        'Fever >=100.4°F, hypothermia <96.5°F, yellow palms/soles, or refusal to feed',
      ],
    },
    {
      id: 'proto-nis',
      mode: 'VACCINATION',
      title: 'National Immunisation Schedule (NIS) Quick Guide',
      keyChecklist: [
        'Birth: BCG, OPV-0, Hepatitis B birth dose (within 24 hours).',
        '6 / 10 / 14 Weeks: OPV 1–3, Pentavalent 1–3, RVV 1–3, fIPV (6 & 14w), PCV (6 & 14w).',
        '9–12 Months: MR-1, JE-1 (endemic districts), PCV-Booster, Vitamin A.',
      ],
      redFlags: [
        'Any AEFI event (high fever, persistent inconsolable crying, allergic rash) — report to PHC immediately.',
      ],
    },
  ];
}
