import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cloud, RefreshCw } from 'lucide-react';
import { useFlucState } from '../hooks/useFlucState';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastUpload?: number;
  lastDownload?: number;
}

export function SyncStatusModal({ isOpen, onClose, lastUpload, lastDownload }: SyncStatusModalProps) {
  const { forceSync } = useFlucState();
  const [isForcing, setIsForcing] = useState(false);
  const formatTime = (time?: number) => time ? new Date(time).toLocaleString() : 'N/A';

  const handleForceSync = async () => {
    setIsForcing(true);
    await forceSync();
    setIsForcing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-6 shadow-2xl z-10 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-general)]">Sincronização</h3>
                  <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase">Status</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-discreto)]">Último upload:</p>
                <p className="text-sm font-bold text-[var(--text-general)]">{formatTime(lastUpload)}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-discreto)]">Último download:</p>
                <p className="text-sm font-bold text-[var(--text-general)]">{formatTime(lastDownload)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={handleForceSync} 
                disabled={isForcing}
                className="w-full py-3.5 bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={isForcing ? 'animate-spin' : ''} />
                {isForcing ? 'Sincronizando...' : 'Forçar Sincronização'}
              </button>
              
              <button onClick={onClose} className="w-full py-3 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] font-bold text-[11px] rounded-2xl transition-all cursor-pointer">
                Entendi, fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
