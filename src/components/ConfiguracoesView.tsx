import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, Sparkles, HelpCircle, Sun, Moon, Palette, ShieldCheck, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { FlucState } from '../types';
import { SyncLog, SyncStatus } from '../hooks/useFirebaseSync';
import { FirebaseConfig, getFirebaseConfig } from '../lib/firebase';

interface ConfiguracoesViewProps {
  state: FlucState;
  onClearLancamentos: () => void;
  onResetAllData: () => void;
  onEraseAllData: () => void;
  onImportState: (jsonStr: string) => boolean;
  onOpenMenu?: () => void;
  onStartTutorial?: () => void;
  theme?: string;
  onThemeToggle?: () => void;
  
  // Firebase Sync props
  syncProps: {
    user: any | null;
    authLoading: boolean;
    authError: string | null;
    setAuthError: (err: string | null) => void;
    syncStatus: SyncStatus;
    lastSyncTime: string;
    isOnline: boolean;
    logs: SyncLog[];
    clearLogs: () => void;
    syncNow: (local: FlucState, update: (st: FlucState) => void) => Promise<boolean>;
    loginWithGoogle: () => void;
    logout: () => void;
    saveCustomFirebaseConfig: (config: FirebaseConfig) => void;
    removeCustomFirebaseConfig: () => void;
    isConfigured: boolean;
  };
  onUpdateLocalState: (newState: FlucState) => void;
}

export function ConfiguracoesView({
  state,
  onClearLancamentos,
  onResetAllData,
  onEraseAllData,
  onImportState,
  onOpenMenu,
  onStartTutorial,
  theme = 'light',
  onThemeToggle,
  syncProps,
  onUpdateLocalState
}: ConfiguracoesViewProps) {
  const {
    user,
    authLoading,
    authError,
    setAuthError,
    syncStatus,
    lastSyncTime,
    isOnline,
    logs,
    clearLogs,
    syncNow,
    loginWithGoogle,
    logout,
    saveCustomFirebaseConfig,
    removeCustomFirebaseConfig,
    isConfigured
  } = syncProps;

  const [showLogs, setShowLogs] = useState(false);

  const handleManualSync = async () => {
    const success = await syncNow(state, onUpdateLocalState);
    if (success) {
      alert('Sincronização concluída com sucesso!');
    } else {
      alert('Falha na sincronização. Verifique os logs internos ou a conexão.');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state to local JSON file
  const handleExportJSON = async () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      
      // Use File System Access API if available (Chrome, Edge, etc.)
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
          // If user cancels, we just stop. Otherwise, fall back.
          if (err.name === 'AbortError') return;
          console.warn('showSaveFilePicker failed, falling back to legacy method.', err);
        }
      }

      // Fallback: Legacy anchor download method
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
      alert('Falha ao exportar backup de dados.');
    }
  };

  // Import state from uploaded JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportState(content);
        if (success) {
          alert('Dados importados e restaurados com sucesso!');
        } else {
          alert('Arquivo inválido. Por favor, faça upload de um backup JSON válido do Fluc.');
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearLancamentos = () => {
    const confirmClear = window.confirm('Tem certeza de que deseja APAGAR TODOS os lançamentos? Isso manterá as contas, cartões e categorias cadastradas.');
    if (confirmClear) {
      onClearLancamentos();
      alert('Todos os lançamentos foram excluídos!');
    }
  };

  const handleResetAllData = () => {
    const confirmReset = window.confirm('ATENÇÃO: Isso limpará TODOS os dados personalizados e restaurará o aplicativo com os valores padrões de fábrica. Deseja continuar?');
    if (confirmReset) {
      onResetAllData();
      alert('O aplicativo foi restaurado aos valores padrão!');
    }
  };

  const handleEraseAllData = () => {
    const confirmErase = window.confirm('ATENÇÃO EXTREMA: Isso apagará TODOS os seus lançamentos, contas, cartões, cofrinhos e também todas as categorias personalizadas criadas por você (mantendo apenas as padrão do sistema). Seu aplicativo ficará completamente zerado. Esta ação é irreversível. Deseja continuar?');
    if (confirmErase) {
      onEraseAllData();
      alert('Todos os dados foram apagados e o aplicativo foi zerado com sucesso!');
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Configurações</h2>
          </div>
        </div>
      </div>

      {/* 2. Apresentação & Tutorial Submenu */}
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Ajuda & Aprendizado</h3>
            <p className="text-xs text-[var(--text-discreto)]">Conheça o funcionamento do Fluc com nosso tutorial interativo</p>
          </div>
        </div>

        <div className="pt-1">
          <div 
            onClick={onStartTutorial}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-5 rounded-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--bg-secondary)] border border-[var(--bg-tertiary)] shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-general)]">Iniciar Tutorial de Apresentação</h4>
                <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Assista à experiência guiada para aprender a usar receitas, despesas, buscas integradas e salvamento automático local.</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStartTutorial) onStartTutorial();
              }}
              className="py-2.5 px-4 bg-[var(--bg-secondary)] hover:opacity-90 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer shrink-0"
            >
              Iniciar Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Sistema de Sincronização em Nuvem (Firebase) */}
      <div id="config-sync-section" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
            <Cloud size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Sincronização em Nuvem (Firebase)</h3>
            <p className="text-xs text-[var(--text-discreto)]">Sincronize seus dados em tempo real utilizando Firestore e sua conta Google</p>
          </div>
        </div>

        {/* Sync Status Info Card */}
        <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-5 rounded-[18px] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 p-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[12px]">
                {syncStatus === 'synced' && <Cloud className="text-[var(--color-receita)] animate-pulse" size={22} />}
                {syncStatus === 'checking' && <RefreshCw className="text-[var(--bg-secondary)] animate-spin" size={22} />}
                {syncStatus === 'syncing' && <RefreshCw className="text-[var(--bg-secondary)] animate-spin" size={22} />}
                {syncStatus === 'offline' && <CloudOff className="text-amber-500" size={22} />}
                {syncStatus === 'error' && <AlertTriangle className="text-[var(--color-despesa)]" size={22} />}
                {syncStatus === 'pending' && <Cloud className="text-[var(--text-discreto)]" size={22} />}
                {syncStatus === 'not_configured' && <Cloud className="text-[var(--text-discreto)]" size={22} />}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-discreto)]">Status da Nuvem</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h4 className="text-xs font-bold text-[var(--text-general)]">
                    {syncStatus === 'synced' && 'Dados Sincronizados'}
                    {syncStatus === 'checking' && 'Verificando Nuvem...'}
                    {syncStatus === 'syncing' && 'Sincronizando...'}
                    {syncStatus === 'offline' && 'Modo Offline (Sem Internet)'}
                    {syncStatus === 'error' && 'Erro de Sincronização'}
                    {syncStatus === 'pending' && 'Conecte sua Conta'}
                    {syncStatus === 'not_configured' && 'Conecte sua Conta'}
                  </h4>
                  {isOnline ? (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-receita)] animate-ping" title="Online" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Offline" />
                  )}
                </div>
              </div>
            </div>

            {/* Sync trigger button */}
            {user && (
              <button
                disabled={syncStatus === 'syncing' || syncStatus === 'checking'}
                onClick={handleManualSync}
                className="py-2.5 px-4 bg-[var(--bg-secondary)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer flex items-center gap-2 self-start sm:self-center"
              >
                <RefreshCw size={14} className={syncStatus === 'syncing' || syncStatus === 'checking' ? 'animate-spin' : ''} />
                <span>Sincronizar Agora</span>
              </button>
            )}
          </div>

          {/* User Sign-in details */}
          <div className="border-t border-[var(--bg-tertiary)]/60 pt-3.5 mt-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {user ? (
                <div className="space-y-1">
                  <p className="text-[11px] text-[var(--text-discreto)]">Conectado como:</p>
                  <p className="font-bold text-[var(--text-general)] text-xs">{user.email}</p>
                  <p className="text-[10px] text-[var(--text-discreto)]">Última Sincronização: <span className="font-mono font-semibold">{lastSyncTime || 'Nenhuma'}</span></p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] text-[var(--text-discreto)]">Faça login para salvar seus dados com segurança e acessar em outros dispositivos.</p>
                </div>
              )}
            </div>

            <div>
              {user ? (
                <button
                  onClick={logout}
                  className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-xs font-bold rounded-[12px] transition-all cursor-pointer shrink-0"
                >
                  Desconectar Conta
                </button>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="py-2.5 px-4 bg-[var(--bg-secondary)] text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer shrink-0 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.27.61 4.5 1.615l2.42-2.42C17.43 1.58 14.97 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.79 0 10.24-4.11 10.24-10.24 0-.695-.08-1.355-.22-1.955H12.24z"/>
                  </svg>
                  <span>Conectar com Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Auth Error troubleshooting notice */}
          {authError && (
            <div className="border-t border-[var(--bg-tertiary)]/60 pt-3.5 mt-2 space-y-2.5">
              <div className={`p-4 rounded-[14px] text-xs text-[var(--text-general)] ${
                authError.includes('popup-closed-by-user')
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex items-center justify-between gap-2 font-bold mb-1">
                  <span className={`flex items-center gap-1.5 ${
                    authError.includes('popup-closed-by-user') ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    <AlertTriangle size={15} />
                    {authError.includes('auth/unauthorized-domain') 
                      ? 'Domínio não Autorizado no Firebase' 
                      : authError.includes('popup-closed-by-user')
                      ? 'Login Cancelado'
                      : 'Erro de Autenticação'}
                  </span>
                  <button 
                    onClick={() => setAuthError(null)}
                    className={`text-[10px] px-2 py-0.5 rounded-[6px] font-bold ${
                      authError.includes('popup-closed-by-user')
                        ? 'bg-amber-500/10 hover:bg-amber-500/25 text-amber-600'
                        : 'bg-red-500/10 hover:bg-red-500/25 text-red-500'
                    }`}
                  >
                    Ocultar Aviso
                  </button>
                </div>
                
                {authError.includes('auth/unauthorized-domain') ? (
                  <div className="space-y-2 leading-relaxed mt-1">
                    <p className="text-[11px] text-[var(--text-discreto)]">
                      O domínio desta aplicação não está listado como um domínio autorizado nas configurações de autenticação do seu Firebase Console. Siga os passos para resolver:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[var(--text-discreto)] font-normal">
                      <li>Acesse o <strong>Firebase Console</strong> do seu projeto.</li>
                      <li>Vá em <strong>Authentication</strong> &gt; guia <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
                      <li>Clique em <strong>Add domain</strong> e cole o domínio abaixo:</li>
                    </ol>
                    <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-2 rounded-[10px] font-mono text-[11px] text-[var(--text-general)] mt-2">
                      <span className="truncate select-all flex-1">{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(window.location.hostname);
                            alert('Domínio copiado para a área de transferência!');
                          }
                        }}
                        className="py-1 px-2.5 bg-[var(--bg-secondary)] text-white text-[10px] font-bold rounded-[6px]"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                ) : authError.includes('popup-closed-by-user') ? (
                  <p className="text-[11px] text-[var(--text-discreto)] leading-relaxed mt-1 font-normal">
                    A janela de login com o Google foi fechada antes da conclusão do processo. Se deseja conectar sua conta para sincronizar seus dados em tempo real, clique em <strong>Conectar com Google</strong> novamente.
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--text-discreto)] font-mono break-words mt-1">
                    {authError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden Log System Control */}
        {isConfigured && (
          <div className="border-t border-[var(--bg-tertiary)]/40 pt-3">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] flex items-center gap-1.5 transition-all"
            >
              <span>{showLogs ? 'Ocultar Logs Internos de Sincronização' : 'Mostrar Logs Internos de Sincronização'}</span>
              <span className="text-[10px] font-normal opacity-60">({logs.length} eventos)</span>
            </button>

            {showLogs && (
              <div className="mt-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] space-y-2.5 max-h-[220px] overflow-y-auto font-mono text-[10px]">
                <div className="flex justify-between items-center pb-1.5 border-b border-[var(--bg-tertiary)]/50">
                  <span className="font-bold text-[var(--text-general)]">Console de Logs (Oculto)</span>
                  <button 
                    onClick={clearLogs}
                    className="text-[9px] text-red-500 hover:underline font-bold"
                  >
                    Limpar Logs
                  </button>
                </div>
                {logs.length === 0 ? (
                  <p className="text-[var(--text-discreto)] italic">Nenhum evento registrado ainda.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex items-start gap-1.5 border-b border-[var(--bg-tertiary)]/20 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-[var(--text-discreto)] shrink-0 font-sans">[{log.timestamp}]</span>
                      <span className={`font-bold shrink-0 ${
                        log.status === 'success' ? 'text-[var(--color-receita)]' :
                        log.status === 'warning' ? 'text-amber-500' :
                        log.status === 'error' ? 'text-[var(--color-despesa)]' :
                        'text-[var(--color-transfer)]'
                      }`}>
                        {log.action}:
                      </span>
                      <span className="text-[var(--text-general)] break-all">{log.details}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 2. Local JSON Backup and Restore Submenu */}
      <div id="config-backup-restauracao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-amber-500/15 text-amber-500">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Backup e Restauração</h3>
            <p className="text-xs text-[var(--text-discreto)]">Salve e recupere seus dados localmente via arquivos JSON</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Export JSON Card */}
          <div 
            onClick={handleExportJSON}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-4 rounded-[18px] flex items-center gap-3.5 cursor-pointer transition-all"
          >
            <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)]">
              <Download size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Fazer Backup de Dados</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Exporta um arquivo .json com todos os seus dados personalizados.</p>
            </div>
          </div>

          {/* Import JSON Card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-4 rounded-[18px] flex items-center gap-3.5 cursor-pointer transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
            <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)]">
              <Upload size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Restaurar de um Backup</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Importa um arquivo de backup do Fluc para restaurar suas informações.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aparência e Temas Submenu */}
      <div id="config-themes-section" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
            <Palette size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Aparência e Temas</h3>
            <p className="text-xs text-[var(--text-discreto)]">Selecione o estilo visual que preferir para o Fluc</p>
          </div>
        </div>

        <div className="pt-1">
          <div 
            onClick={onThemeToggle}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-5 rounded-[18px] flex items-center justify-between gap-4 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)] shrink-0">
                {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-500" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-general)]">Alternar Tema do Sistema</h4>
                <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                  Atualmente no Modo <strong>{theme === 'dark' ? 'Escuro (Dark)' : 'Claro (Light)'}</strong>. Clique aqui para mudar instantaneamente.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onThemeToggle) onThemeToggle();
              }}
              className="py-2 px-3.5 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-semibold rounded-[12px] transition-all cursor-pointer shrink-0"
            >
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Delete Data Submenu */}
      <div id="config-apagar-dados" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[#d03c4d]/15 text-[#d03c4d]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Apagar Dados</h3>
            <p className="text-xs text-[var(--text-discreto)]">Gerencie a exclusão de dados e restaure o aplicativo</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Clear Launches only */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Apagar Lançamentos</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Exclui todos os lançamentos de transações cadastrados, preservando suas contas, cartões e categorias.
              </p>
            </div>
            <button
              onClick={handleClearLancamentos}
              className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0"
            >
              Apagar Lançamentos
            </button>
          </div>

          {/* Apagar Tudo */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="config-apagar-tudo-container">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Apagar Tudo</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Apaga todos os dados de lançamentos, contas, cartões, cofrinhos e as categorias não padrão criadas, zerando completamente o aplicativo.
              </p>
            </div>
            <button
              id="btn-apagar-tudo-geral"
              onClick={handleEraseAllData}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Apagar Tudo</span>
            </button>
          </div>

          {/* Reset All Data */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Limpar Tudo</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Exclui de forma permanente todas as customizações (contas, cartões, categorias, cofrinhos) e restaura o Fluc para as configurações padrões.
              </p>
            </div>
            <button
              onClick={handleResetAllData}
              className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Trash2 size={12} />
              <span>Restaurar Padrões</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
