import type { ConnectionStatus, HealthcareMode, VaccinationStatus } from './types';

/**
 * Formats a permanent unique ID for ASHA workers (ASHA-2026-0001) or Patients (PAT-2026-0001).
 */
export function formatUniqueId(
  prefix: 'ASHA' | 'PAT',
  year: number,
  sequenceNumber: number,
): string {
  const safeSeq = Math.max(1, Math.floor(sequenceNumber));
  const padded = String(safeSeq).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

/**
 * Computes the next unique sequential ID for a given prefix and year,
 * guaranteeing no collision with any existing IDs.
 */
export function computeNextSequentialId(
  prefix: 'ASHA' | 'PAT',
  existingIds: string[],
  year = new Date().getFullYear(),
): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxSeq = 0;
  const used = new Set(existingIds.map((id) => id.trim().toUpperCase()));

  for (const id of existingIds) {
    const match = pattern.exec(id.trim().toUpperCase());
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (Number.isFinite(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  let candidateSeq = maxSeq + 1;
  let candidate = formatUniqueId(prefix, year, candidateSeq);
  while (used.has(candidate)) {
    candidateSeq += 1;
    candidate = formatUniqueId(prefix, year, candidateSeq);
  }
  return candidate;
}

/**
 * Computes trimester label and weeks remaining until Expected Delivery Date.
 */
export function calculatePregnancyStage(
  gestationalWeeks: number | null,
  expectedDeliveryDate?: string | null,
  referenceDate = new Date(),
): {
  trimester: 'First Trimester' | 'Second Trimester' | 'Third Trimester' | 'Not Recorded';
  stageLabel: string;
  weeksRemaining: number | null;
} {
  let weeks = gestationalWeeks;
  let weeksRemaining: number | null = null;

  if (expectedDeliveryDate) {
    const eddMs = Date.parse(expectedDeliveryDate);
    if (!Number.isNaN(eddMs)) {
      const diffWeeks = Math.round((eddMs - referenceDate.getTime()) / (7 * 86_400_000));
      weeksRemaining = Math.max(0, diffWeeks);
      if (weeks === null) {
        const inferredWeeks = 40 - diffWeeks;
        if (inferredWeeks >= 1 && inferredWeeks <= 42) {
          weeks = inferredWeeks;
        }
      }
    }
  }

  if (weeks === null && weeksRemaining === null) {
    return { trimester: 'Not Recorded', stageLabel: 'Stage pending assessment', weeksRemaining: null };
  }

  const resolvedWeeks = weeks ?? 0;
  if (weeksRemaining === null && resolvedWeeks > 0) {
    weeksRemaining = Math.max(0, 40 - resolvedWeeks);
  }

  if (resolvedWeeks <= 12) {
    return {
      trimester: 'First Trimester',
      stageLabel: `First Trimester · ${resolvedWeeks} wks`,
      weeksRemaining,
    };
  }
  if (resolvedWeeks <= 27) {
    return {
      trimester: 'Second Trimester',
      stageLabel: `Second Trimester · ${resolvedWeeks} wks`,
      weeksRemaining,
    };
  }
  return {
    trimester: 'Third Trimester',
    stageLabel: `Third Trimester · ${resolvedWeeks} wks`,
    weeksRemaining,
  };
}

/**
 * Computes newborn age in days, weight delta since birth, and growth status.
 */
export function calculateNewbornGrowthSummary(
  birthWeightKg: number | null,
  currentWeightKg: number | null,
  birthDate: string | null,
  referenceDate = new Date(),
): {
  ageDays: number | null;
  weightGainKg: number | null;
  growthStatus: 'THRIVING' | 'MONITOR' | 'NEEDS_ATTENTION';
} {
  let ageDays: number | null = null;
  if (birthDate) {
    const birthMs = Date.parse(birthDate);
    if (!Number.isNaN(birthMs)) {
      ageDays = Math.max(0, Math.floor((referenceDate.getTime() - birthMs) / 86_400_000));
    }
  }

  let weightGainKg: number | null = null;
  if (birthWeightKg !== null && currentWeightKg !== null) {
    weightGainKg = Number((currentWeightKg - birthWeightKg).toFixed(2));
  }

  let growthStatus: 'THRIVING' | 'MONITOR' | 'NEEDS_ATTENTION' = 'MONITOR';
  if (currentWeightKg !== null && currentWeightKg < 2.2) {
    growthStatus = 'NEEDS_ATTENTION';
  } else if (weightGainKg !== null) {
    if (weightGainKg < -0.25) {
      growthStatus = 'NEEDS_ATTENTION';
    } else if (weightGainKg >= 0) {
      growthStatus = 'THRIVING';
    }
  } else if (birthWeightKg !== null && birthWeightKg >= 2.5) {
    growthStatus = 'THRIVING';
  }

  return { ageDays, weightGainKg, growthStatus };
}

/**
 * Summarizes vaccination completion progress for a patient.
 */
export function summarizeVaccinationProgress(
  records: Array<{ status: VaccinationStatus }>,
): {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  completionPct: number;
} {
  const totalCount = records.length;
  const completedCount = records.filter((r) => r.status === 'COMPLETED').length;
  const overdueCount = records.filter((r) => r.status === 'OVERDUE').length;
  const pendingCount = records.filter(
    (r) => r.status === 'PENDING' || r.status === 'SCHEDULED' || r.status === 'OVERDUE',
  ).length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    totalCount,
    completedCount,
    pendingCount,
    overdueCount,
    completionPct,
  };
}

/**
 * Validates state transitions for ASHA worker - Patient connections.
 */
export function canTransitionConnection(
  currentStatus: ConnectionStatus | null,
  action: 'REQUEST' | 'APPROVE' | 'REJECT',
): { allowed: boolean; nextStatus?: ConnectionStatus; reason?: string } {
  if (action === 'REQUEST') {
    if (currentStatus === 'CONNECTED') {
      return { allowed: false, reason: 'Accounts are already connected.' };
    }
    if (currentStatus === 'PENDING') {
      return { allowed: false, reason: 'A connection request is already pending.' };
    }
    return { allowed: true, nextStatus: 'PENDING' };
  }

  if (currentStatus !== 'PENDING') {
    return {
      allowed: false,
      reason: `Cannot ${action.toLowerCase()} a connection that is currently ${currentStatus ?? 'absent'}.`,
    };
  }

  return {
    allowed: true,
    nextStatus: action === 'APPROVE' ? 'CONNECTED' : 'REJECTED',
  };
}

export function getHealthcareModeMeta(mode: HealthcareMode): {
  mode: HealthcareMode;
  label: string;
  shortLabel: string;
  description: string;
} {
  switch (mode) {
    case 'PREGNANCY':
      return {
        mode,
        label: 'Pregnancy Mode',
        shortLabel: 'Pregnancy',
        description: 'Antenatal checkups, pregnancy stage, EDD tracking, and maternal reminders.',
      };
    case 'NEWBORN_CARE':
      return {
        mode,
        label: 'Newborn Care Mode',
        shortLabel: 'Newborn Care',
        description: 'Birth details, weight & growth monitoring, HBNC visits, and care reminders.',
      };
    case 'VACCINATION':
      return {
        mode,
        label: 'Vaccination Mode',
        shortLabel: 'Vaccination',
        description: 'Immunisation eligibility, completed/pending doses, and vaccine reminders.',
      };
  }
}
