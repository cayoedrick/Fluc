import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/auth';
import { useFlucState } from '../hooks/useFlucState';
import { FlucState } from '../types';

export interface SyncContextValue {
  isCloudSyncing: boolean;
  lastSyncUpload?: number;
  lastSyncDownload?: number;
  syncError: string | null;
  forceSync: () => Promise<boolean>;
  currentUser: User | null;
  isOnline: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncContext.Provider');
  }
  return context;
}

interface SyncProviderProps {
  children: ReactNode;
}

function mergeStates(local: FlucState, remote: FlucState): FlucState {
  if (!remote) return local;
  if (!local) return remote;

  const collections: (keyof FlucState)[] = [
    'contas',
    'cartoes',
    'categorias',
    'lancamentos',
    'cofrinhos',
    'cofrinhoHistorico',
    'metas',
    'metaContribuicoes'
  ];

  const mergedDeletedIds = Array.from(new Set([
    ...(local.deletedIds || []),
    ...(remote.deletedIds || [])
  ]));

  const merged: any = {
    ...local,
    theme: (remote.lastModifiedAt || 0) > (local.lastModifiedAt || 0) ? remote.theme : local.theme,
    deletedIds: mergedDeletedIds,
    lastModifiedAt: Math.max(local.lastModifiedAt || 0, remote.lastModifiedAt || 0)
  };

  for (const col of collections) {
    const localArr = (local[col] || []) as any[];
    const remoteArr = (remote[col] || []) as any[];
    const map = new Map<string, any>();

    // Put remote items first
    remoteArr.forEach((item: any) => {
      if (item && item.id && !mergedDeletedIds.includes(item.id)) {
        map.set(item.id, item);
      }
    });

    // Merge local items comparing updatedAt
    localArr.forEach((item: any) => {
      if (item && item.id && !mergedDeletedIds.includes(item.id)) {
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          const localTime = item.updatedAt || 0;
          const remoteTime = existing.updatedAt || 0;
          if (localTime >= remoteTime) {
            map.set(item.id, item);
          }
          // otherwise keep existing (remote)
        }
      }
    });

    merged[col] = Array.from(map.values());
  }

  return merged;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { state, updateState } = useFlucState();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncUpload, setLastSyncUpload] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('fluc_last_sync_upload');
    return saved ? Number(saved) : undefined;
  });
  const [lastSyncDownload, setLastSyncDownload] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('fluc_last_sync_download');
    return saved ? Number(saved) : undefined;
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
        setSyncError(null);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      setSyncError(null);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        window.showToast?.('Conectado ao Google Drive com sucesso!', 'sucesso');
        setTimeout(() => forceSync(), 500);
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Erro ao autenticar com Google');
      window.showToast?.('Erro ao autenticar com Google Drive', 'erro');
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setCurrentUser(null);
      window.showToast?.('Desconectado do Google Drive', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  const forceSync = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setSyncError('Dispositivo offline. Conecte-se à internet para sincronizar.');
      return false;
    }
    const token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (!res) {
          setSyncError('Autenticação necessária com o Google Drive.');
          return false;
        }
        setCurrentUser(res.user);
      } catch (e: any) {
        setSyncError('Falha ao autenticar com Google Drive: ' + (e?.message || ''));
        return false;
      }
    }

    setIsCloudSyncing(true);
    setSyncError(null);

    try {
      const activeToken = await getAccessToken();
      if (!activeToken) throw new Error('Token de acesso não disponível.');

      const FILE_NAME = 'fluc_financas_backup.json';

      // 1. Search for remote backup file on Google Drive
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${activeToken}` }
        }
      );
      if (!searchRes.ok) {
        throw new Error('Erro ao buscar arquivo no Google Drive');
      }
      const searchData = await searchRes.json();
      const files = searchData.files || [];

      let fileId = files.length > 0 ? files[0].id : null;
      let finalState = state;

      if (fileId) {
        // 2. Download remote file content
        const downloadRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${activeToken}` }
          }
        );
        if (downloadRes.ok) {
          try {
            const remoteState = await downloadRes.json();
            // 3. Merge local and remote states intelligently
            finalState = mergeStates(state, remoteState);
            // Update local state with merged data
            updateState(() => finalState);
          } catch (parseErr) {
            console.error('Error parsing remote state JSON:', parseErr);
          }
        }
      }

      const fileContent = JSON.stringify(finalState, null, 2);
      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json'
      };

      if (!fileId) {
        // Create new file on Google Drive
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${activeToken}` },
            body: form
          }
        );
        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error('Erro ao criar arquivo no Google Drive: ' + errText);
        }
        const createdFile = await createRes.json();
        fileId = createdFile.id;
      } else {
        // Update existing file on Google Drive with merged state
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'Content-Type': 'application/json'
            },
            body: fileContent
          }
        );
        if (!updateRes.ok) {
          const errText = await updateRes.text();
          throw new Error('Erro ao atualizar arquivo no Google Drive: ' + errText);
        }
      }

      const now = Date.now();
      setLastSyncUpload(now);
      setLastSyncDownload(now);
      localStorage.setItem('fluc_last_sync_upload', String(now));
      localStorage.setItem('fluc_last_sync_download', String(now));

      window.showToast?.('Sincronização com o Google Drive realizada com sucesso!', 'sucesso');
      return true;
    } catch (err: any) {
      console.error('Google Drive Sync Error:', err);
      setSyncError(err?.message || 'Erro desconhecido na sincronização');
      window.showToast?.('Erro na sincronização com Google Drive', 'erro');
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  }, [state, updateState]);

  return (
    <SyncContext.Provider
      value={{
        isCloudSyncing,
        lastSyncUpload,
        lastSyncDownload,
        syncError,
        forceSync,
        currentUser,
        isOnline,
        signIn,
        signOut
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
