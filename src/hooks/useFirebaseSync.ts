import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  getGoogleProvider, 
  isFirebaseConfigured,
  getFirebaseConfig,
  FirebaseConfig
} from '../lib/firebase';
import { FlucState } from '../types';

export interface SyncLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:MM:SS
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error' | 'not_configured' | 'out_of_sync' | 'checking' | 'syncing';

export function useFirebaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('not_configured');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== 'undefined' ? navigator.onLine : true);
  const [logs, setLogs] = useState<SyncLog[]>(() => {
    try {
      const saved = localStorage.getItem('fluc_sync_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isConfigured = isFirebaseConfigured();

  // Helper to append and persist logs
  const addLog = useCallback((action: string, details: string, status: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog: SyncLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp,
      action,
      details,
      status
    };

    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 200); // Keep last 200 logs
      localStorage.setItem('fluc_sync_logs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem('fluc_sync_logs');
    addLog('Limpeza', 'Logs de sincronização limpos pelo usuário.', 'info');
  }, [addLog]);

  // Track network connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('Conexão', 'Conexão com a internet restabelecida.', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      addLog('Conexão', 'Conexão com a internet perdida. Operando em modo offline.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addLog]);

  // Monitor Authentication State
  useEffect(() => {
    if (!isConfigured) {
      setSyncStatus('not_configured');
      setAuthLoading(false);
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setAuthLoading(false);
        if (firebaseUser) {
          addLog('Autenticação', `Usuário autenticado: ${firebaseUser.email}`, 'success');
        } else {
          setSyncStatus('pending');
          addLog('Autenticação', 'Nenhum usuário autenticado. Sincronização em nuvem inativa.', 'info');
        }
      });
      return unsubscribe;
    } catch (e: any) {
      console.error('Error in onAuthStateChanged', e);
      addLog('Autenticação', `Erro de autenticação: ${e.message}`, 'error');
      setAuthLoading(false);
    }
  }, [isConfigured, addLog]);

  // Helper to find the maximum updatedAt timestamp in the local state
  const getMaxLocalUpdatedAt = useCallback((localState: FlucState): number => {
    let maxTime = 0;
    const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];
    
    for (const key of collections) {
      const list = localState[key];
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item && typeof item.updatedAt === 'number') {
            maxTime = Math.max(maxTime, item.updatedAt);
          }
        });
      }
    }
    return maxTime;
  }, []);

  // Format timestamp to local display date/time with minutes & seconds
  const formatTimestamp = (ts: number): string => {
    if (!ts) return 'Nenhuma';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Merge local and cloud collections carefully item by item based on updatedAt to prevent duplication & overwrite issues
  const deepMergeStates = useCallback((local: FlucState, cloud: FlucState): FlucState => {
    const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];
    const merged: Partial<FlucState> = {};

    for (const key of collections) {
      const localList = (local[key] || []) as any[];
      const cloudList = (cloud[key] || []) as any[];

      const itemMap = new Map<string, any>();

      // Add all local items first
      localList.forEach(item => {
        itemMap.set(item.id, item);
      });

      // Merge cloud items. If exists in local, keep the one with larger updatedAt. If not, add cloud item.
      cloudList.forEach(cloudItem => {
        const localItem = itemMap.get(cloudItem.id);
        if (!localItem) {
          itemMap.set(cloudItem.id, cloudItem);
        } else {
          const localTime = localItem.updatedAt || 0;
          const cloudTime = cloudItem.updatedAt || 0;
          if (cloudTime > localTime) {
            itemMap.set(cloudItem.id, cloudItem);
          }
        }
      });

      merged[key] = Array.from(itemMap.values()) as any;
    }

    return {
      ...local,
      ...merged,
      theme: cloud.theme || local.theme // default to cloud theme if available
    } as FlucState;
  }, []);

  // Execute Synchronization
  const syncNow = useCallback(async (
    localState: FlucState, 
    updateLocalState: (state: FlucState) => void
  ): Promise<boolean> => {
    if (!isOnline) {
      setSyncStatus('offline');
      addLog('Sincronização', 'Sincronização indisponível: Dispositivo está offline.', 'warning');
      return false;
    }

    if (!isConfigured) {
      setSyncStatus('not_configured');
      return false;
    }

    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setSyncStatus('pending');
      return false;
    }

    setSyncStatus('checking');
    addLog('Sincronização', 'Iniciando verificação de sincronização...', 'info');

    try {
      const db = getFirebaseDb();
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDocRef);

      const localMaxTs = getMaxLocalUpdatedAt(localState);
      const now = Date.now();

      if (!docSnap.exists()) {
        // Step 1: Cloud is empty, let's upload local state
        setSyncStatus('syncing');
        addLog('Sincronização', 'Nenhum dado encontrado na nuvem. Fazendo upload inicial do estado local.', 'info');
        
        // Ensure everything has a updatedAt timestamp
        const enrichedLocal = { ...localState };
        const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];
        collections.forEach(colKey => {
          const list = enrichedLocal[colKey];
          if (Array.isArray(list)) {
            enrichedLocal[colKey] = list.map((item: any) => {
              if (!item.updatedAt) return { ...item, updatedAt: localMaxTs || now };
              return item;
            }) as any;
          }
        });

        const cloudPayload = {
          data: enrichedLocal,
          updatedAt: localMaxTs || now,
          lastSyncedAt: now,
          clientLastChangedAt: localMaxTs || now,
        };

        await setDoc(userDocRef, cloudPayload);
        
        updateLocalState(enrichedLocal);
        setSyncStatus('synced');
        
        const syncTimeStr = formatTimestamp(now);
        setLastSyncTime(syncTimeStr);
        addLog('Sincronização', `Upload concluído com sucesso. Estado sincronizado às ${syncTimeStr}.`, 'success');
        return true;
      }

      // Step 2: Compare timestamps
      const cloudPayload = docSnap.data();
      const cloudMaxTs = cloudPayload.updatedAt || 0;
      const cloudState = cloudPayload.data as FlucState;

      addLog('Comparação', `Timestamp Local: ${formatTimestamp(localMaxTs)} | Timestamp Nuvem: ${formatTimestamp(cloudMaxTs)}`, 'info');

      if (cloudMaxTs === localMaxTs) {
        // OK: Validate structure & return OK
        setSyncStatus('synced');
        setLastSyncTime(formatTimestamp(cloudPayload.lastSyncedAt || now));
        addLog('Sincronização', 'Dados em perfeita conformidade. Sincronização rápida efetuada.', 'success');
        return true;
      }

      setSyncStatus('syncing');

      // Resolve conflict by doing a deep merge instead of simple overwrite,
      // avoiding duplicate logs/transactions or losing local offline edits.
      addLog('Sincronização', 'Resolvendo diferenças de sincronização via mesclagem profunda...', 'info');
      
      const mergedState = deepMergeStates(localState, cloudState);
      const mergedMaxTs = getMaxLocalUpdatedAt(mergedState);

      // Save merged state back to local storage and upload to firestore
      const newPayload = {
        data: mergedState,
        updatedAt: mergedMaxTs,
        lastSyncedAt: now,
        clientLastChangedAt: mergedMaxTs,
      };

      await setDoc(userDocRef, newPayload);
      updateLocalState(mergedState);

      setSyncStatus('synced');
      const syncTimeStr = formatTimestamp(now);
      setLastSyncTime(syncTimeStr);
      addLog('Sincronização', `Sincronização concluída por mesclagem às ${syncTimeStr}.`, 'success');
      return true;

    } catch (err: any) {
      console.error('Sync Error', err);
      setSyncStatus('error');
      addLog('Sincronização', `Erro de sincronização: ${err.message}`, 'error');
      return false;
    }
  }, [isOnline, isConfigured, getMaxLocalUpdatedAt, deepMergeStates, addLog]);

  // Auth Operations
  const loginWithGoogle = useCallback(async () => {
    if (!isConfigured) {
      addLog('Autenticação', 'Erro: Firebase não configurado no aplicativo.', 'error');
      return;
    }

    addLog('Autenticação', 'Iniciando login com a conta Google...', 'info');
    setAuthError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setAuthError(null);
      addLog('Autenticação', `Login efetuado com sucesso para: ${result.user.email}`, 'success');
    } catch (e: any) {
      console.error('Google Sign In Error', e);
      addLog('Autenticação', `Falha ao fazer login com o Google: ${e.message}`, 'error');
      setAuthError(e.message || String(e));
    }
  }, [isConfigured, addLog]);

  const logout = useCallback(async () => {
    if (!isConfigured) return;
    
    addLog('Autenticação', 'Iniciando logout do usuário...', 'info');
    setAuthError(null);
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setUser(null);
      setSyncStatus('pending');
      setAuthError(null);
      addLog('Autenticação', 'Logout efetuado com sucesso.', 'success');
    } catch (e: any) {
      console.error('Logout Error', e);
      addLog('Autenticação', `Erro ao sair: ${e.message}`, 'error');
    }
  }, [isConfigured, addLog]);

  // Save manual configurations to localStorage (e.g. if env vars are not set)
  const saveCustomFirebaseConfig = useCallback((config: FirebaseConfig) => {
    try {
      localStorage.setItem('fluc_firebase_config', JSON.stringify(config));
      addLog('Configuração', 'Configurações personalizadas do Firebase salvas com sucesso.', 'success');
      // Reload page to apply new config
      window.location.reload();
    } catch (e: any) {
      addLog('Configuração', `Erro ao salvar configurações: ${e.message}`, 'error');
    }
  }, [addLog]);

  const removeCustomFirebaseConfig = useCallback(() => {
    localStorage.removeItem('fluc_firebase_config');
    addLog('Configuração', 'Configurações personalizadas do Firebase removidas.', 'info');
    window.location.reload();
  }, [addLog]);

  return {
    user,
    authLoading,
    authError,
    setAuthError,
    syncStatus,
    lastSyncTime,
    isOnline,
    logs,
    clearLogs,
    addLog,
    syncNow,
    loginWithGoogle,
    logout,
    saveCustomFirebaseConfig,
    removeCustomFirebaseConfig,
    isConfigured
  };
}
