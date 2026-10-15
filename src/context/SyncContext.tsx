import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, setCachedAccessToken, logout, getSavedUser, auth } from '../lib/auth';
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
  state: FlucState;
  updateState: (updater: Partial<FlucState> | ((prev: FlucState) => FlucState)) => void;
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
  ])).slice(-2000);

  const deletedSet = new Set(mergedDeletedIds);

  const merged: any = {
    ...local,
    theme: (remote.lastModifiedAt || 0) > (local.lastModifiedAt || 0) ? remote.theme : local.theme,
    deletedIds: mergedDeletedIds,
    lastModifiedAt: Math.max(local.lastModifiedAt || 0, remote.lastModifiedAt || 0, Date.now())
  };

  for (const col of collections) {
    const localArr = (local[col] || []) as any[];
    const remoteArr = (remote[col] || []) as any[];
    const map = new Map<string, any>();

    // Put remote items first (ignoring any deleted IDs)
    remoteArr.forEach((item: any) => {
      if (item && item.id && !deletedSet.has(item.id)) {
        map.set(item.id, item);
      }
    });

    // Merge local items comparing updatedAt (ignoring any deleted IDs)
    localArr.forEach((item: any) => {
      if (item && item.id && !deletedSet.has(item.id)) {
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

export function SyncProvider({ children, state, updateState }: SyncProviderProps) {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (auth.currentUser) return auth.currentUser;
    const saved = getSavedUser();
    return saved ? (saved as any as User) : null;
  });
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

  useEffect(() => {
    // Initial background sync when user is connected and token is available
    if (currentUser && isOnline) {
      const timer = setTimeout(() => {
        getAccessToken().then((token) => {
          if (token && !isCloudSyncing) {
            forceSync();
          }
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.email, isOnline]);

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
      if (err?.code === 'auth/popup-blocked') {
        setSyncError('O pop-up de login foi bloqueado pelo navegador. Por favor, permita pop-ups para este site.');
        window.showToast?.('Pop-up bloqueado. Permita pop-ups nas configurações do navegador.', 'erro');
      } else {
        setSyncError(err?.message || 'Erro ao autenticar com Google');
        window.showToast?.('Erro ao autenticar com Google Drive', 'erro');
      }
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
    const activeToken = await getAccessToken();
    if (!activeToken) {
      setSyncError('Conecte sua conta do Google Drive para sincronizar.');
      return false;
    }

    setIsCloudSyncing(true);
    setSyncError(null);

    const fetchDrive = async (url: string, init?: RequestInit): Promise<Response> => {
      const res = await fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${activeToken}`
        }
      });

      if (res.status === 401) {
        setCachedAccessToken(null);
        setSyncError('Sessão expirada. Clique no botão de sincronização para reconectar.');
      }
      return res;
    };

    try {
      if (!activeToken) throw new Error('Token de acesso não disponível.');

      const FILE_NAME = 'fluc_financas_backup.json';

      // 1. Search for remote backup file on Google Drive
      const searchRes = await fetchDrive(
        `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false`
      );
      if (!searchRes.ok) {
        throw new Error('Erro ao buscar arquivo no Google Drive');
      }
      const searchData = await searchRes.json();
      const files = searchData.files || [];

      let fileId = files.length > 0 ? files[0].id : null;
      let currentState = stateRef.current;
      try {
        const saved = localStorage.getItem('fluc_financial_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if ((parsed.lastModifiedAt || 0) > (currentState.lastModifiedAt || 0)) {
            currentState = parsed;
          }
        }
      } catch {}

      let finalState = currentState;

      if (fileId) {
        // 2. Download remote file content
        const downloadRes = await fetchDrive(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );
        if (downloadRes.ok) {
          try {
            const remoteState = await downloadRes.json();
            // 3. Merge local and remote states intelligently
            finalState = mergeStates(currentState, remoteState);
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

        const createRes = await fetchDrive(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
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
        const updateRes = await fetchDrive(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
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
  }, [updateState]);

  // Debounced auto-sync whenever data changes locally
  const prevModifiedRef = useRef<number>(state.lastModifiedAt || 0);
  useEffect(() => {
    if (!currentUser || !isOnline) return;
    if (!state.lastModifiedAt || state.lastModifiedAt === prevModifiedRef.current) return;

    if (lastSyncUpload && lastSyncUpload >= state.lastModifiedAt) {
      prevModifiedRef.current = state.lastModifiedAt;
      return;
    }

    prevModifiedRef.current = state.lastModifiedAt;

    const timer = setTimeout(() => {
      if (!isCloudSyncing) {
        forceSync();
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [state.lastModifiedAt, currentUser, isOnline, isCloudSyncing, lastSyncUpload, forceSync]);

  // Sync when returning to tab or app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser && navigator.onLine) {
        forceSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser, forceSync]);

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
