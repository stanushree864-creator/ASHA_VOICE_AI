import type { OfflineCareSnapshot, OfflineQueuedCareAction } from '../shared/types';

const SNAPSHOT_KEY = 'asha_offline_care_snapshot_v1';
const QUEUED_ACTIONS_KEY = 'asha_offline_care_actions_v1';
const SIMULATE_OFFLINE_KEY = 'asha_simulate_offline_v1';

export function saveOfflineCareSnapshot(snapshot: OfflineCareSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota limits
  }
}

export function getOfflineCareSnapshot(): OfflineCareSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineCareSnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getOfflineCareActions(): OfflineQueuedCareAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUED_ACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueuedCareAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineCareAction(
  action: Omit<OfflineQueuedCareAction, 'id' | 'createdAt'>,
): OfflineQueuedCareAction[] {
  const existing = getOfflineCareActions();
  const next: OfflineQueuedCareAction[] = [
    {
      ...action,
      id: `off-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QUEUED_ACTIONS_KEY, JSON.stringify(next));
  }
  return next;
}

export function removeOfflineCareAction(id: string): OfflineQueuedCareAction[] {
  const next = getOfflineCareActions().filter((a) => a.id !== id);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QUEUED_ACTIONS_KEY, JSON.stringify(next));
  }
  return next;
}

export function getSimulatedOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIMULATE_OFFLINE_KEY) === 'true';
}

export function setSimulatedOfflineMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIMULATE_OFFLINE_KEY, enabled ? 'true' : 'false');
}
