import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Users, Receipt, User, Layers, Info } from 'lucide-react';
import { Lancamento } from '../types';

const formatCurrency = (val: number): string => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 3 });
};

interface SharedLancamentoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  allLancamentos?: Lancamento[];
}

export function SharedLancamentoDetailsModal({ isOpen, onClose, lancamento, allLancamentos = [] }: SharedLancamentoDetailsModalProps) {
  if (!lancamento) return null;

  // Check if it's a generated reimbursement by useFlucState (starts with reimb-)
  const isGeneratedReimbursement = lancamento.isReimbursement && lancamento.id.startsWith('reimb-');
  let combinedExpenses: Lancamento[] = [];
  let combinedParticipantName = '';
  
  if (isGeneratedReimbursement) {
    // Extract participant name from ID: reimb-{participantName}-{YYYY-MM}__contaId or reimb-{participantName}-{YYYY-MM}
    const baseId = lancamento.id.split('__')[0];
    const parts = baseId.split('-');
    if (parts.length >= 4) { // reimb-Nome-2023-10 or reimb-Nome-Sobrenome-2023-10
      combinedParticipantName = baseId.substring(6, baseId.length - 8);
      const monthYear = baseId.substring(baseId.length - 7);
      
      combinedExpenses = allLancamentos.filter(l => 
        !l.isReimbursement && 
        l.isShared && 
        l.data.startsWith(monthYear) &&
        l.participantes?.some(p => p.nome === combinedParticipantName)
      ).sort((a, b) => a.data.localeCompare(b.data));
    }
  }

  // Resolve the primary expense representation.
  const originalExpense = lancamento.isReimbursement && !isGeneratedReimbursement
    ? allLancamentos.find(l => l.id === lancamento.originalSharedLancamentoId)
    : lancamento;

  // targetLanc represents the primary expense we are inspecting
  const targetLanc = isGeneratedReimbursement ? (combinedExpenses[0] || lancamento) : (originalExpense || lancamento);

  // Find all parent expenses belonging to the same group
  const groupedLancamentos = isGeneratedReimbursement 
    ? combinedExpenses
    : (targetLanc.grupoId 
        ? allLancamentos
            .filter(l => l.grupoId === targetLanc.grupoId && !l.isReimbursement)
            .sort((a, b) => a.data.localeCompare(b.data))
        : []);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getMonthNamePortuguese = (dateStr: string) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} de ${year}`;
      }
    }
    return '';
  };

  const calculateShareValue = (valorTotal: number, p: { valor: number; isPorcentagem: boolean }) => {
    if (p.isPorcentagem) {
      return (valorTotal * (p.valor / 100));
    }
    return p.valor;
  };

  const getYourShare = (l: Lancamento) => {
    const participantsTotal = l.participantes?.reduce((acc, p) => acc + calculateShareValue(l.valor, p), 0) || 0;
    return l.valor - participantsTotal;
  };

  // Sum totals across all grouped entries for consolidated view
  const totalGroupValue = groupedLancamentos.reduce((acc, l) => acc + l.valor, 0);
  
  // Consolidate participant shares across all grouped entries
  const consolidatedParticipants: Record<string, { nome: string; totalValue: number }> = {};
  groupedLancamentos.forEach(l => {
    l.participantes?.forEach(p => {
      const val = calculateShareValue(l.valor, p);
      if (!consolidatedParticipants[p.nome]) {
        consolidatedParticipants[p.nome] = { nome: p.nome, totalValue: 0 };
      }
      consolidatedParticipants[p.nome].totalValue += val;
    });
  });

  const totalYourShare = groupedLancamentos.reduce((acc, l) => acc + getYourShare(l), 0);

  const renderExpenseCard = (item: Lancamento, isSelected: boolean, isLinked: boolean) => {
    const itemYourShare = getYourShare(item);
    const isCompact = isLinked;

    return (
      <div key={item.id} className={`bg-[var(--bg-app)] ${isSelected && !isGeneratedReimbursement ? 'p-5 rounded-3xl border border-indigo-500 shadow-sm shadow-indigo-500/10 space-y-4' : 'p-4 rounded-2xl border border-[var(--bg-tertiary)] space-y-3'}`}>
        <div className={`flex items-center justify-between border-b border-[var(--bg-tertiary)] ${isCompact ? 'pb-2' : 'pb-3'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected && !isGeneratedReimbursement ? 'text-indigo-500' : 'text-[var(--text-discreto)]'}`}>
            {isLinked ? 'Despesa Vinculada' : 'Lançamento Selecionado'}
          </span>
          {lancamento.isReimbursement && isSelected && !isGeneratedReimbursement && (
            <span className="text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
              Receita de Reembolso
            </span>
          )}
        </div>

        <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
          <div className="flex items-start gap-2.5">
            <Receipt size={isCompact ? 14 : 16} className="text-[var(--text-discreto)] mt-0.5 shrink-0" />
            <div>
              <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-[var(--text-general)] block leading-tight`}>
                {item.descricao}
              </span>
              <span className="text-[10px] text-[var(--text-discreto)] block mt-0.5">
                Data: {formatDate(item.data)}
              </span>
            </div>
          </div>

          <div className={`pt-2 border-t border-[var(--bg-tertiary)] flex justify-between items-baseline`}>
            <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">
              Valor Total
            </span>
            <span className={`${isCompact ? 'text-base' : 'text-xl'} font-black text-[var(--text-general)]`}>
              {formatCurrency(item.valor)}
            </span>
          </div>
        </div>

        {item.participantes && item.participantes.length > 0 && (
          <div className={`pt-3 border-t border-[var(--bg-tertiary)] ${isCompact ? 'space-y-2' : 'space-y-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={12} className="text-indigo-500" />
              <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">
                Divisão
              </span>
            </div>
            
            <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
              {item.participantes.map((p, idx) => {
                const shareValue = calculateShareValue(item.valor, p);
                const isThisReimbursementParticipant = 
                  (lancamento.isReimbursement && Math.abs(shareValue - lancamento.valor) < 0.01 && isSelected) ||
                  (isGeneratedReimbursement && p.nome === combinedParticipantName);

                return (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isThisReimbursementParticipant 
                        ? 'bg-indigo-500/10 border-indigo-500/30' 
                        : 'bg-[var(--bg-primary)] border-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isThisReimbursementParticipant ? 'bg-indigo-500 text-white shadow-xs' : 'bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-indigo-500'
                      }`}>
                        <User size={10} />
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold block leading-none ${isThisReimbursementParticipant ? 'text-indigo-500' : 'text-[var(--text-general)]'}`}>
                          {p.nome}
                          {isThisReimbursementParticipant && (
                            <span className="ml-1 text-[8px] uppercase tracking-tighter bg-indigo-500 text-white px-1 py-[1px] rounded-sm">
                              Atual
                            </span>
                          )}
                        </span>
                        <span className="text-[8px] text-[var(--text-discreto)]">
                          Fração: {p.isPorcentagem ? `${p.valor}%` : formatCurrency(p.valor)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-indigo-500">
                      {formatCurrency(shareValue)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={`p-2.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex justify-between items-center text-[10px] mt-2`}>
              <span className="font-semibold text-indigo-500">
                {isGeneratedReimbursement ? 'A Receber' : 'Sua parte'}
              </span>
              <span className="font-black text-indigo-500">
                {isGeneratedReimbursement
                  ? formatCurrency(calculateShareValue(item.valor, item.participantes?.find(p => p.nome === combinedParticipantName) || { valor: 0, isPorcentagem: false }))
                  : formatCurrency(itemYourShare)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header - Identical for both Expense and Revenue (Reimbursement) */}
            <div className="p-6 border-b border-[var(--bg-tertiary)] flex items-center justify-between bg-indigo-500/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-general)]">
                    Detalhes do Compartilhamento
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                    {groupedLancamentos.length > 1 ? 'Lançamento Agrupado' : 'Despesa Dividida'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-discreto)] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {isGeneratedReimbursement ? (
                <div className="space-y-4">
                  {groupedLancamentos.map((item) => renderExpenseCard(item, false, true))}
                </div>
              ) : (
                <>
                  {renderExpenseCard(targetLanc, true, false)}

                  {groupedLancamentos.length > 1 && lancamento.isReimbursement && (
                    <div className="space-y-4 pt-2">
                      {groupedLancamentos.filter(l => l.id !== targetLanc.id).map((item) => renderExpenseCard(item, false, true))}
                    </div>
                  )}
                </>
              )}

              {/* Grouped entries section totals */}
              {groupedLancamentos.length > 1 && lancamento.isReimbursement && (
                <div className="p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-3">
                    <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                      {isGeneratedReimbursement ? `Total a Receber de ${combinedParticipantName}` : 'Totais Consolidados do Grupo'}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    {!isGeneratedReimbursement && (
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium">Valor Total do Grupo:</span>
                        <span className="font-black text-indigo-700 dark:text-indigo-300">
                          {formatCurrency(totalGroupValue)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 py-2 border-y border-dashed border-indigo-500/20">
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">
                        {isGeneratedReimbursement ? 'Total das Despesas:' : 'Total por Participante:'}
                      </span>
                      {Object.values(consolidatedParticipants)
                        .filter(cp => !isGeneratedReimbursement || cp.nome === combinedParticipantName)
                        .map((cp, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-indigo-700 dark:text-indigo-300 font-medium text-xs">{cp.nome}:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                            {formatCurrency(cp.totalValue)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-1 font-black text-indigo-700 dark:text-indigo-300">
                      <span>{isGeneratedReimbursement ? 'Total a Receber:' : 'Seu Total no Grupo:'}</span>
                      <span className="bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-xs font-bold">
                        {isGeneratedReimbursement ? formatCurrency(consolidatedParticipants[combinedParticipantName]?.totalValue || 0) : formatCurrency(totalYourShare)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-general)] font-bold text-xs rounded-2xl transition-all cursor-pointer border border-[var(--bg-tertiary)]"
              >
                Fechar Detalhes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
