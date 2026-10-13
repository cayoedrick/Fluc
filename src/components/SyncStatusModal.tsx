import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cloud, RefreshCw, AlertTriangle, CheckCircle2, Wifi, WifiOff, User as UserIcon } from 'lucide-react';
import { useSyncContext } from '../context/SyncContext';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastUpload?: number;
  lastDownload?: number;
}

export function SyncStatusModal({ isOpen, onClose, lastUpload, lastDownload }: SyncStatusModalProps) {
  const { forceSync, syncError, isCloudSyncing, currentUser, isOnline } = useSyncContext();
  const [isForcing, setIsForcing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const formatTime = (time?: number) => {
    if (!time) return 'Ainda não sincronizado neste dispositivo';
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
          message: 'Dados enviados e sincronizados com a nuvem com sucesso!'
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="sync-status-modal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            key="sync-status-modal-body"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-6 shadow-2xl z-10 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-general)]">Sincronização Nuvem</h3>
                  <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase">Multi-dispositivo</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-discreto)] transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Connection & Auth Status */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-discreto)]">
                  {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-amber-500" />}
                  Conexão:
                </span>
                <span className={`font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--bg-tertiary)]/50">
                <span className="flex items-center gap-1.5 text-[var(--text-discreto)]">
                  <UserIcon size={14} className="text-blue-500" />
                  Conta:
                </span>
                <span className="font-semibold text-[var(--text-general)] truncate max-w-[170px]" title={currentUser?.email || 'Não logado'}>
                  {currentUser ? (currentUser.email || currentUser.displayName || 'Conectado') : 'Não autenticado'}
                </span>
              </div>
            </div>

            {/* Error or Feedback Alert */}
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
            
            {/* Sync Timestamps */}
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                <p className="text-[11px] text-[var(--text-discreto)]">Último envio para nuvem (Upload):</p>
                <p className="text-xs font-bold text-[var(--text-general)] mt-0.5">{formatTime(lastUpload)}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                <p className="text-[11px] text-[var(--text-discreto)]">Último recebimento da nuvem (Download):</p>
                <p className="text-xs font-bold text-[var(--text-general)] mt-0.5">{formatTime(lastDownload)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button 
                onClick={handleForceSync} 
                disabled={isForcing || isCloudSyncing || !currentUser || !isOnline}
                className="w-full py-3.5 bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
              >
                <RefreshCw size={14} className={isForcing || isCloudSyncing ? 'animate-spin' : ''} />
                {isForcing || isCloudSyncing ? 'Sincronizando agora...' : 'Forçar Sincronização Agora'}
              </button>
              
              <button 
                onClick={onClose} 
                className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] font-bold text-[11px] rounded-2xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
