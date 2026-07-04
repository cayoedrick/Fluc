import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle } from 'lucide-react';

interface FloatingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string | React.ReactNode;
  bullets?: { title: string; text: string }[];
  icon?: React.ReactNode;
}

export function FloatingInfoModal({
  isOpen,
  onClose,
  title,
  subtitle = "Informação",
  description,
  bullets,
  icon
}: FloatingInfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-6 shadow-2xl overflow-hidden z-10 space-y-5"
          >
            {/* Top Row / Close Button */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)]/10 text-[var(--bg-secondary)] flex items-center justify-center">
                  {icon || <HelpCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-general)] tracking-tight">
                    {title}
                  </h3>
                  <p className="text-[10px] font-semibold text-[var(--bg-secondary)] tracking-wider uppercase">
                    {subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-discreto)] hover:text-[var(--text-general)] transition-colors border border-transparent hover:border-[var(--bg-tertiary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {description && (
                <div className="text-xs text-[var(--text-discreto)] leading-relaxed">
                  {description}
                </div>
              )}

              {bullets && bullets.length > 0 && (
                <div className="space-y-3">
                  {bullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--bg-secondary)] mt-1.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-general)]">
                          {bullet.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-discreto)] leading-relaxed mt-0.5">
                          {bullet.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reassuring bottom action */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Entendi, fechar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
