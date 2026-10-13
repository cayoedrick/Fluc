import React from 'react';
import { Cloud, CloudCheck, CloudAlert, WifiOff } from 'lucide-react';
import { useSyncContext } from '../context/SyncContext';

interface SyncStatusIconProps {
  onClick: () => void;
  className?: string;
}

export function SyncStatusIcon({ onClick, className = "" }: SyncStatusIconProps) {
  const { isCloudSyncing, lastSyncUpload, syncError, isOnline, currentUser } = useSyncContext();
  
  const isSynced = Boolean(lastSyncUpload && !isCloudSyncing && !syncError);
  
  let colorClass = 'text-gray-400 hover:text-gray-300';
  let titleText = 'Não sincronizado (faça login para sincronizar)';
  
  if (!isOnline) {
    colorClass = 'text-amber-500';
    titleText = 'Dispositivo offline';
  } else if (syncError) {
    colorClass = 'text-rose-500 animate-pulse';
    titleText = `Erro de sincronização: ${syncError}`;
  } else if (isCloudSyncing) {
    colorClass = 'text-indigo-400 animate-pulse';
    titleText = 'Sincronizando com a nuvem...';
  } else if (isSynced) {
    colorClass = 'text-emerald-500';
    titleText = `Sincronizado na nuvem (${new Date(lastSyncUpload!).toLocaleTimeString('pt-BR')})`;
  } else if (currentUser) {
    colorClass = 'text-blue-400';
    titleText = 'Conectado à nuvem';
  }
  
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] flex items-center justify-center transition-all cursor-pointer ${colorClass} ${className}`}
      title={titleText}
      aria-label="Status de sincronização"
    >
      {!isOnline ? (
        <WifiOff size={18} />
      ) : syncError ? (
        <CloudAlert size={20} />
      ) : isCloudSyncing ? (
        <Cloud size={20} />
      ) : isSynced ? (
        <CloudCheck size={20} />
      ) : (
        <Cloud size={20} />
      )}
    </button>
  );
}
