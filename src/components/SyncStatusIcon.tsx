import React from 'react';
import { Cloud, CloudCheck } from 'lucide-react';
import { useFlucState } from '../hooks/useFlucState';

interface SyncStatusIconProps {
  onClick: () => void;
  className?: string;
}

export function SyncStatusIcon({ onClick, className = "" }: SyncStatusIconProps) {
  const { state } = useFlucState();
  
  // Simple logic: if both times are close to now, it's synced.
  const isSynced = state.lastSyncUpload && state.lastSyncDownload && (Date.now() - state.lastSyncUpload < 60000);
  
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] flex items-center justify-center transition-all cursor-pointer ${isSynced ? 'text-blue-500' : 'text-gray-500'} ${className}`}
    >
      {isSynced ? <CloudCheck size={20} /> : <Cloud size={20} />}
    </button>
  );
}
