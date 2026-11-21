import type { DangerSignAnalysis, StructuredVisitRecord } from '../shared/types';

const OFFLINE_VISITS_KEY = 'asha_offline_pending_visits_v1';
const OFFLINE_ALERTS_KEY = 'asha_offline_danger_alerts_v1';

export interface OfflineVisitDraft {
  id: string;
  record: StructuredVisitRecord;
  savedLocallyAt: string;
  syncStatus: 'PENDING_SYNC' | 'SYNC_FAILED';
  lastError?: string;
}

export interface OfflineDangerAlert {
  id: string;
  beneficiaryCode: string | null;
  beneficiaryName: string | null;
  transcript: string;
  analysis: DangerSignAnalysis;
  detectedAt: string;
  deliveryStatus: 'LOCAL_ONLY_OFFLINE' | 'DELIVERED_TO_SERVER';
}

export function getOfflineVisitDrafts(): OfflineVisitDraft[] {
  try {
    const raw = localStorage.getItem(OFFLINE_VISITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineVisitDraft(record: StructuredVisitRecord): OfflineVisitDraft[] {
  const existing = getOfflineVisitDrafts();
  const deduped = existing.filter(
    (d) => d.record.clientRequestId !== record.clientRequestId,
  );
  const next: OfflineVisitDraft[] = [
    {
      id: record.clientRequestId,
      record,
      savedLocallyAt: new Date().toISOString(),
      syncStatus: 'PENDING_SYNC',
    },
    ...deduped,
  ];
  localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(next));
  return next;
}

export function removeOfflineVisitDraft(clientRequestId: string): OfflineVisitDraft[] {
  const remaining = getOfflineVisitDrafts().filter(
    (d) => d.record.clientRequestId !== clientRequestId,
  );
  localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(remaining));
  return remaining;
}

export function getOfflineDangerAlerts(): OfflineDangerAlert[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineDangerAlert(alert: OfflineDangerAlert): OfflineDangerAlert[] {
  const existing = getOfflineDangerAlerts();
  const next = [alert, ...existing.filter((a) => a.id !== alert.id)];
  localStorage.setItem(OFFLINE_ALERTS_KEY, JSON.stringify(next));
  return next;
}

export function markOfflineDangerAlertDelivered(id: string): void {
  const updated = getOfflineDangerAlerts().map((a) =>
    a.id === id ? { ...a, deliveryStatus: 'DELIVERED_TO_SERVER' as const } : a,
  );
  localStorage.setItem(OFFLINE_ALERTS_KEY, JSON.stringify(updated));
}
