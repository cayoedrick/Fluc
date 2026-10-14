import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Trash2, Cloud, AlertTriangle, Sun, Moon, Palette, ShieldCheck } from 'lucide-react';
import { FlucState } from '../types';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useGooglePicker } from '../hooks/useGooglePicker';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

interface ConfiguracoesViewProps {
  state: FlucState;
  onClearLancamentos: () => void;
  onResetAllData: () => void;
  onEraseAllData: () => void;
  onImportState: (jsonStr: string) => boolean;
  onOpenMenu?: () => void;
  theme?: string;
  onThemeToggle?: () => void;
}

export function ConfiguracoesView({
  state,
  onClearLancamentos,
  onResetAllData,
  onEraseAllData,
  onImportState,
  onOpenMenu,
  theme = 'light',
  onThemeToggle
}: ConfiguracoesViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const syncData = async (token: string) => {
    setSyncStatus('syncing');
    try {
        // Obter os dados do estado atual para backup
        const data = localStorage.getItem('fluc_state'); // Ajustar conforme a estrutura real de persistência
        const fileContent = data || JSON.stringify({ error: "No data found" });
        const metadata = {
            name: 'fluc_backup.json',
            mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error('Falha no upload para o Google Drive');
        }

        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleString());
        window.showToast?.('Sincronização concluída com sucesso!', 'sucesso');
    } catch (e) {
        setSyncStatus('error');
        console.error('Sync error:', e);
        window.showToast?.('Falha na sincronização.', 'erro');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
      syncData(savedToken);
    }
  }, []);

  const handleLoginSuccess = (result: any) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential && credential.accessToken) {
      setAccessToken(credential.accessToken);
      localStorage.setItem('google_access_token', credential.accessToken);
      syncData(credential.accessToken);
    }
  };


  const { openPicker } = useGooglePicker((file) => {
      console.log('Selected file:', file);
      window.showToast?.(`Arquivo selecionado: ${file.name}. Funcionalidade de importação a implementar.`, 'info');
  }, accessToken);

  const handleExportJSON = async () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `fluc_backup_${new Date().toISOString().split('T')[0]}.json`,
            types: [{
              description: 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fluc_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      window.showToast?.('Falha ao exportar backup de dados.', 'erro');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportState(content);
        if (success) {
          window.showToast?.('Dados importados e restaurados com sucesso!', 'sucesso');
        } else {
          window.showToast?.('Arquivo inválido.', 'erro');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearLancamentos = () => {
    if (window.confirm('Tem certeza de que deseja APAGAR TODOS os lançamentos?')) {
      onClearLancamentos();
    }
  };

  const handleResetAllData = () => {
    if (window.confirm('ATENÇÃO: Restaurar padrões de fábrica?')) {
      onResetAllData();
    }
  };

  const handleEraseAllData = () => {
    if (window.confirm('ATENÇÃO: Apagar tudo?')) {
      onEraseAllData();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button onClick={onOpenMenu} className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Configurações</h2>
        </div>
      </div>

      <div id="config-conta-sincronizacao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Conta</h3>
        <GoogleLoginButton onLoginSuccess={(result) => {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential && credential.accessToken) {
            setAccessToken(credential.accessToken);
          }
        }} />
      </div>

      <div id="config-backup-restauracao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Backup e Restauração</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div onClick={handleExportJSON} className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] transition-all">
            <Download size={18} />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Fazer Backup (Arquivo)</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Baixe uma cópia local de todos os seus dados.</p>
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] transition-all">
            <Upload size={18} />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Restaurar de Backup</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Importe um arquivo .json para restaurar dados.</p>
          </div>
          {/* Card Simplificado */}
          <div className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-indigo-500 transition-all" onClick={() => setIsDropdownOpen(true)}>
            <Cloud size={18} className={`${!isOnline ? 'text-gray-400' : syncStatus === 'synced' ? 'text-green-500' : syncStatus === 'error' ? 'text-red-500' : 'text-gray-500'}`} />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Google Drive</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {!isOnline ? 'Offline' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'error' ? 'Erro' : 'Pronto'}
            </p>
          </div>

          {/* Modal Centralizado */}
          {isDropdownOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsDropdownOpen(false)}>
              <div className="relative w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-6 shadow-2xl z-10 space-y-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                      <Cloud size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-general)]">Sincronização Drive</h3>
                      <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase">Google Drive</p>
                    </div>
                  </div>
                  <button onClick={() => setIsDropdownOpen(false)} className="p-1.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-discreto)] transition-colors cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {/* Connection & Status */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-discreto)]">Status:</span>
                    <span className={`font-semibold ${syncStatus === 'synced' ? 'text-emerald-500' : syncStatus === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {syncStatus === 'idle' ? 'Pronto' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'synced' ? 'Sincronizado' : 'Erro'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--bg-tertiary)]/50">
                    <span className="text-[var(--text-discreto)]">Conexão:</span>
                    <span className={`font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                {/* Last Sync */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                  <p className="text-[11px] text-[var(--text-discreto)]">Última sincronização:</p>
                  <p className="text-xs font-bold text-[var(--text-general)] mt-0.5">{lastSyncTime || 'Nunca'}</p>
                </div>

                {/* Actions */}
                <button 
                  className="w-full py-3.5 bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 shadow-md shadow-indigo-500/20" 
                  onClick={() => { accessToken && syncData(accessToken); setIsDropdownOpen(false); }}
                  disabled={syncStatus === 'syncing' || !isOnline}
                >
                  {syncStatus === 'syncing' ? 'Sincronizando...' : 'Forçar Sincronização Agora'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="config-themes-section" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Aparência e Temas</h3>
        <p className="text-xs text-[var(--text-secondary)]">Selecione o estilo visual que preferir para o Fluc</p>
        <div onClick={onThemeToggle} className="cursor-pointer bg-[var(--bg-app)] p-5 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-general)]">Alternar Tema do Sistema</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Atualmente no Modo {theme === 'dark' ? 'Escuro' : 'Claro'}. Clique aqui para mudar instantaneamente.</p>
          </div>
          <button className="text-xs font-bold bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] px-4 py-2 rounded-lg">
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
      </div>

      <div id="config-apagar-dados" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Apagar Dados</h3>
        <p className="text-xs text-[var(--text-secondary)]">Gerencie a exclusão de dados e restaure o aplicativo</p>
        <div className="space-y-3">
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Apagar Lançamentos</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Exclui todos os lançamentos de transações cadastrados, preservando suas contas, cartões e categorias.</p>
            </div>
            <button onClick={handleClearLancamentos} className="bg-red-500/10 text-red-500 font-bold text-xs px-4 py-2 rounded-lg">Apagar Lançamentos</button>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Apagar Tudo</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Apaga todos os dados de lançamentos, contas, cartões, cofrinhos e as categorias não padrão criadas, zerando completamente o aplicativo.</p>
            </div>
            <button onClick={handleEraseAllData} className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg">Apagar Tudo</button>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Limpar Tudo</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Exclui de forma permanente todas as customizações (contas, cartões, categorias, cofrinhos) e restaura o Fluc para as configurações padrões.</p>
            </div>
            <button onClick={handleResetAllData} className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg">Restaurar Padrões</button>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSON}
        className="hidden"
        accept=".json"
      />
    </div>
  );
}
