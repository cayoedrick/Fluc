import React, { useRef, useState } from 'react';
import { Download, Upload, Cloud, AlertTriangle, CheckCircle2, Wifi, WifiOff, User as UserIcon, RefreshCw } from 'lucide-react';
import { FlucState } from '../types';
import { useSyncContext } from '../context/SyncContext';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    isCloudSyncing,
    lastSyncUpload,
    lastSyncDownload,
    syncError,
    forceSync,
    currentUser,
    isOnline,
    signIn,
    signOut
  } = useSyncContext();

  const formatTime = (time?: number) => {
    if (!time) return 'Nunca sincronizado';
    return new Date(time).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleForceSync = async () => {
    setIsForcing(true);
    setFeedback(null);
    try {
      const success = await forceSync();
      if (success) {
        setFeedback({
          type: 'success',
          message: 'Sincronizado com o Google Drive com sucesso!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: syncError || 'Falha ao sincronizar. Verifique sua conexão e login.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na sincronização.'
      });
    } finally {
      setIsForcing(false);
    }
  };

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

  const isSynced = Boolean(lastSyncUpload && !isCloudSyncing && !syncError);

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

      {/* Conta & Google Drive Sync Section */}
      <div id="config-conta-sincronizacao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Conta Google Drive</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Sincronize seus dados com segurança no Google Drive</p>
          </div>
          {currentUser ? (
            <button
              onClick={signOut}
              className="text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={signIn}
              className="text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-500/20"
            >
              <Cloud size={16} />
              Conectar Google Drive
            </button>
          )}
        </div>

        {currentUser && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-discreto)] flex items-center gap-2">
              <UserIcon size={14} className="text-blue-500" />
              Conta Conectada:
            </span>
            <span className="font-semibold text-[var(--text-general)] truncate max-w-[220px]" title={currentUser.email || ''}>
              {currentUser.email || currentUser.displayName || 'Conectado'}
            </span>
          </div>
        )}
      </div>

      {/* Backup e Restauração */}
      <div id="config-backup-restauracao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Backup e Restauração</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div onClick={handleExportJSON} className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] transition-all">
            <Download size={18} className="text-indigo-500 mb-2" />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Fazer Backup (Arquivo)</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Baixe uma cópia local de todos os seus dados.</p>
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] transition-all">
            <Upload size={18} className="text-emerald-500 mb-2" />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Restaurar de Backup</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Importe um arquivo .json para restaurar dados.</p>
          </div>
          
          {/* Card Google Drive Sync Menu Suspenso (Dropdown) */}
          <div 
            className="cursor-pointer bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] hover:border-indigo-500 transition-all" 
            onClick={() => setIsDropdownOpen(true)}
          >
            <Cloud size={18} className={`mb-2 ${!isOnline ? 'text-gray-400' : syncError ? 'text-rose-500' : isCloudSyncing ? 'text-indigo-400 animate-pulse' : isSynced ? 'text-emerald-500' : 'text-indigo-500'}`} />
            <h4 className="text-xs font-bold text-[var(--text-general)]">Sincronização Drive</h4>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              {!isOnline ? 'Offline' : isCloudSyncing ? 'Sincronizando...' : syncError ? 'Erro' : isSynced ? 'Sincronizado' : 'Pronto'}
            </p>
          </div>
        </div>

        {/* Modal / Menu Suspenso no Meio da Tela com Dados de Sincronização */}
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
                    <h3 className="text-base font-bold text-[var(--text-general)]">Sincronização Google Drive</h3>
                    <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase">Backup em Nuvem</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDropdownOpen(false)} 
                  className="p-1.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-discreto)] transition-colors cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Status & Connection Details */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-discreto)] flex items-center gap-1.5">
                    {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-amber-500" />}
                    Conexão:
                  </span>
                  <span className={`font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--bg-tertiary)]/50">
                  <span className="text-[var(--text-discreto)] flex items-center gap-1.5">
                    <UserIcon size={14} className="text-blue-500" />
                    Conta:
                  </span>
                  <span className="font-semibold text-[var(--text-general)] truncate max-w-[170px]" title={currentUser?.email || 'Não logado'}>
                    {currentUser ? (currentUser.email || currentUser.displayName || 'Conectado') : 'Não autenticado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--bg-tertiary)]/50">
                  <span className="text-[var(--text-discreto)]">Status de Sincronia:</span>
                  <span className={`font-semibold ${syncError ? 'text-rose-500' : isCloudSyncing ? 'text-indigo-400' : isSynced ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isCloudSyncing ? 'Sincronizando...' : syncError ? 'Com erro' : isSynced ? 'Sincronizado' : 'Aguardando'}
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {syncError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Atenção na sincronização:</p>
                    <p className="text-[11px] opacity-90">{syncError}</p>
                  </div>
                </div>
              )}

              {feedback && (
                <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                }`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  )}
                  <p className="text-[11px] font-medium">{feedback.message}</p>
                </div>
              )}

              {/* Timestamps Data */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                  <p className="text-[11px] text-[var(--text-discreto)]">Último envio (Upload):</p>
                  <p className="text-xs font-bold text-[var(--text-general)] mt-0.5">{formatTime(lastSyncUpload)}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                  <p className="text-[11px] text-[var(--text-discreto)]">Último recebimento (Download):</p>
                  <p className="text-xs font-bold text-[var(--text-general)] mt-0.5">{formatTime(lastSyncDownload)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button 
                  onClick={handleForceSync} 
                  disabled={isForcing || isCloudSyncing || !isOnline}
                  className="w-full py-3.5 bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
                >
                  <RefreshCw size={14} className={isForcing || isCloudSyncing ? 'animate-spin' : ''} />
                  {isForcing || isCloudSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}
                </button>
                
                <button 
                  onClick={() => setIsDropdownOpen(false)} 
                  className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] font-bold text-[11px] rounded-2xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Aparência e Temas */}
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

      {/* Apagar Dados */}
      <div id="config-apagar-dados" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <h3 className="text-base font-bold text-[var(--text-general)]">Apagar Dados</h3>
        <p className="text-xs text-[var(--text-secondary)]">Gerencie a exclusão de dados e restaure o aplicativo</p>
        <div className="space-y-3">
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Apagar Lançamentos</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Exclui todos os lançamentos de transações cadastrados, preservando suas contas, cartões e categorias.</p>
            </div>
            <button onClick={handleClearLancamentos} className="bg-red-500/10 text-red-500 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer">Apagar Lançamentos</button>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Apagar Tudo</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Apaga todos os dados de lançamentos, contas, cartões, cofrinhos e as categorias não padrão criadas, zerando completamente o aplicativo.</p>
            </div>
            <button onClick={handleEraseAllData} className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer">Apagar Tudo</button>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-[18px] border border-[var(--bg-tertiary)] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Limpar Tudo</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Exclui de forma permanente todas as customizações (contas, cartões, categorias, cofrinhos) e restaura o Fluc para as configurações padrões.</p>
            </div>
            <button onClick={handleResetAllData} className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer">Restaurar Padrões</button>
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
