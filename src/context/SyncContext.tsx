import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

export interface SyncContextValue {
  isCloudSyncing: boolean;
  lastSyncUpload?: number;
  lastSyncDownload?: number;
  syncError: string | null;
  forceSync: () => Promise<boolean>;
  currentUser: User | null;
  isOnline: boolean;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncContext.Provider');
  }
  return context;
}
