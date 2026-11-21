import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { getTranslations } from '../shared/i18n';
import type { LanguageCode } from '../shared/types';

interface OfflineIndicatorProps {
  pendingDraftCount: number;
  language?: LanguageCode;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  pendingDraftCount,
  language = 'en',
  onSyncNow,
  isSyncing = false,
}) => {
  const isOnline = useOnlineStatus();
  const t = getTranslations(language).offline;

  if (isOnline && pendingDraftCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg md:bottom-6 md:left-auto md:right-6 ${
        !isOnline
          ? 'border border-amber-700/20 bg-amber-600 text-white'
          : 'border border-[#0D7377]/20 bg-white text-[#0F1F24]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {!isOnline
            ? t.offlineQueued(pendingDraftCount)
            : t.readyToSync(pendingDraftCount)}
        </span>
      </div>

      {isOnline && pendingDraftCount > 0 && onSyncNow && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#0D7377] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5A5E] disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isSyncing ? t.syncing : t.syncNow}
        </button>
      )}
    </div>
  );
};
