import React, { useState, useEffect } from 'react';
import { useFlucState } from './hooks/useFlucState';
import { ViewType, Lancamento, Conta, Cartao, Categoria, Cofrinho, CofrinhoHistorico } from './types';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ExtratoView } from './components/ExtratoView';
import { CategoriasView } from './components/CategoriasView';
import { ContasCartoesView } from './components/ContasCartoesView';
import { ReservasCofrinhosView } from './components/ReservasCofrinhosView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { LancamentoModal } from './components/LancamentoModal';
import { Menu, Plus, Home, CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';
import { InteractiveTutorial } from './components/InteractiveTutorial';
import { SyncStatusIcon } from './components/SyncStatusIcon';
import { SyncStatusModal } from './components/SyncStatusModal';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const {
    state,
    updateState,
    getAccountBalance,
    getTotalBalance,
    getCardInvoiceValue,
    getTotalInvoicesValue,
    getTotalReservedValue,
    getPeriodStats,
    getForecastData,
    getSaldoMesAnterior,
    getSaldoAtual,
    clearLancamentos,
    resetAllData,
    eraseAllData,
    importStateFromJSON,
    isDateInMonthYear
  } = useFlucState();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    const hasSeen = localStorage.getItem('fluc_tutorial_shown_or_skipped');
    return !hasSeen;
  });

  interface ToastItem {
    id: string;
    mensagem: string;
    tipo: 'sucesso' | 'erro' | 'info';
  }

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    window.showToast = showToast;
    return () => {
      window.showToast = undefined;
    };
  }, []);

  const handleAddSimulatedLancamento = (desc: string, tipo: 'receita' | 'despesa', valor: number) => {
    const contaId = state.contas[0]?.id || 'simulated-conta';
    const categoriaId = state.categorias.find(c => c.tipo === tipo)?.id || 'simulated-cat';
    
    const simLanc: Lancamento = {
      id: `sim-lanc-${Date.now()}`,
      descricao: `${desc} (Simulação)`,
      tipo,
      valor,
      data: new Date().toISOString().split('T')[0],
      recebidoPagoEfetivado: true,
      contaId,
      categoriaId
    };

    updateState((prev) => ({
      ...prev,
      lancamentos: [simLanc, ...prev.lancamentos]
    }));
  };

  // Toggle Theme between 'dark' and 'clean'
  const handleThemeToggle = () => {
    updateState({
      theme: state.theme === 'dark' ? 'clean' : 'dark'
    });
  };
  const addMonthsToDateStr = (dateStr: string, monthsToAdd: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetMonthIndex = month - 1 + monthsToAdd;
    const targetDate = new Date(year, targetMonthIndex, 1);
    const maxDayInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const finalDay = Math.min(day, maxDayInTargetMonth);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(finalDay)}`;
  };

  // Add a standard transaction/entry (with support for recurring & installments)
  const handleAddLancamento = (newLanc: Omit<Lancamento, 'id'>) => {
    // Se for despesa de cartão (despesa_cartao), calcula a data de cobrança com base na data da compra e no dia de fechamento do cartão.
    // "se o lançamento for feito do primeiro dia após o fechamento até o dia do fechamento de cartão, devem ser lançado no mesmo mês."
    // Exemplo: se o fechamento do cartão for dia 5, todo lançamento no periodo do dia 6/1 ao dia 5/2 será lançado na fatura do mês de fevereiro.
    // Ou seja, se o dia do lançamento for maior que o dia de fechamento do cartão, vai para o mês seguinte. Caso contrário, vai no mesmo mês.
    let baseDate = newLanc.data;
    if (newLanc.tipo === 'despesa_cartao') {
      const card = state.cartoes.find((c) => c.id === newLanc.cartaoId);
      if (card) {
        const [, , day] = newLanc.data.split('-').map(Number);
        const diaFechamento = card.diaFechamento;
        if (day > diaFechamento) {
          baseDate = addMonthsToDateStr(newLanc.data, 1);
        }
      }
    }

    const adjustedLanc = {
      ...newLanc,
      data: baseDate
    };

    const isParcelado = adjustedLanc.parcelado && adjustedLanc.numParcelas && adjustedLanc.numParcelas > 1;
    const isRecorrente = adjustedLanc.fixoRecorrente;

    if (isParcelado) {
      const num = adjustedLanc.numParcelas!;
      const group = `grupo-${Date.now()}`;
      const entries: Lancamento[] = [];

      const isCard = adjustedLanc.tipo === 'despesa_cartao';
      let sumOfInstallments = 0;
      const isValorParcela = adjustedLanc.isValorParcela;

      for (let i = 0; i < num; i++) {
        let installmentValor = adjustedLanc.valor;
        
        if (!isValorParcela) {
          if (i === num - 1) {
            // Last installment gets the remainder to prevent rounding issues
            installmentValor = Number((adjustedLanc.valor - sumOfInstallments).toFixed(2));
          } else {
            installmentValor = Number((adjustedLanc.valor / num).toFixed(2));
            sumOfInstallments += installmentValor;
          }
        }

        const installmentDate = addMonthsToDateStr(adjustedLanc.data, i);
        entries.push({
          ...adjustedLanc,
          recebidoPagoEfetivado: i === 0 && adjustedLanc.recebidoPagoEfetivado,
          id: `lanc-${Date.now()}-${i}`,
          descricao: `${adjustedLanc.descricao} (${i + 1}/${num})`,
          data: installmentDate,
          valor: installmentValor,
          grupoId: group
        });
      }

      updateState((prev) => ({
        ...prev,
        lancamentos: [...entries, ...prev.lancamentos]
      }));
    } else if (isRecorrente) {
      const num = 24; // Standard 24 months for recurring entries
      const group = `grupo-${Date.now()}`;
      const entries: Lancamento[] = [];

      for (let i = 0; i < num; i++) {
        const recurringDate = addMonthsToDateStr(adjustedLanc.data, i);
        entries.push({
          ...adjustedLanc,
          recebidoPagoEfetivado: i === 0 && adjustedLanc.recebidoPagoEfetivado,
          id: `lanc-${Date.now()}-${i}`,
          data: recurringDate,
          grupoId: group
        });
      }

      updateState((prev) => ({
        ...prev,
        lancamentos: [...entries, ...prev.lancamentos]
      }));
    } else {
      const mainId = `lanc-${Date.now()}`;
      const lanc: Lancamento = {
        ...adjustedLanc,
        id: mainId
      };

      let reimbursementEntries: Lancamento[] = [];
      if (adjustedLanc.isShared && adjustedLanc.participantes && adjustedLanc.participantes.length > 0) {
        reimbursementEntries = adjustedLanc.participantes.map((p, idx) => {
          let valorReembolso = p.valor;
          if (p.isPorcentagem) {
            valorReembolso = Number((adjustedLanc.valor * (p.valor / 100)).toFixed(2));
          }

          return {
            id: `reimb-${Date.now()}-${idx}`,
            tipo: 'receita',
            valor: valorReembolso,
            recebidoPagoEfetivado: false,
            data: adjustedLanc.data,
            descricao: `Reembolso: ${p.nome} (${adjustedLanc.descricao})`,
            categoriaId: adjustedLanc.categoriaId,
            contaId: adjustedLanc.contaId,
            isReimbursement: true,
            originalSharedLancamentoId: mainId,
            updatedAt: Date.now()
          };
        });
      }

      updateState((prev) => ({
        ...prev,
        lancamentos: [lanc, ...reimbursementEntries, ...prev.lancamentos]
      }));
    }
  };

  // Delete a transaction (option: 'este' | 'futuros' | 'todos')
  const handleDeleteLancamento = (id: string, mode: 'este' | 'futuros' | 'todos') => {
    const target = state.lancamentos.find(l => l.id === id);
    if (!target) return;

    updateState((prev) => {
      // Find both the target transaction and any linked/counterpart invoice payment transactions
      const matchedIdsToDelete = new Set<string>([id]);
      if (target.faturaPagamentoId) {
        prev.lancamentos.forEach(l => {
          if (l.faturaPagamentoId === target.faturaPagamentoId) {
            matchedIdsToDelete.add(l.id);
          }
        });
      } else {
        // Fallback for older transactions that don't have the explicit link ID
        const targetMonthYear = target.data.substring(0, 7); // "YYYY-MM"
        if (target.tipo === 'despesa' && target.descricao.startsWith('Fatura Paga:')) {
          const matched = prev.lancamentos.find(l => 
            l.tipo === 'despesa_cartao' && 
            l.descricao === 'Pagamento de Fatura Recibo' && 
            l.valor === target.valor && 
            l.estorno === true && 
            l.data.startsWith(targetMonthYear)
          );
          if (matched) {
            matchedIdsToDelete.add(matched.id);
          }
        } else if (target.tipo === 'despesa_cartao' && target.descricao === 'Pagamento de Fatura Recibo' && target.estorno === true) {
          const matched = prev.lancamentos.find(l => 
            l.tipo === 'despesa' && 
            l.descricao.startsWith('Fatura Paga:') && 
            l.valor === target.valor && 
            l.data.substring(0, 7) === targetMonthYear
          );
          if (matched) {
            matchedIdsToDelete.add(matched.id);
          }
        }
      }

      let filtered: Lancamento[];
      if (mode === 'este') {
        filtered = prev.lancamentos.filter(l => !matchedIdsToDelete.has(l.id));
      } else if (mode === 'todos') {
        // 'todos': delete all occurrences (past, current, and future)
        filtered = prev.lancamentos.filter(l => {
          if (matchedIdsToDelete.has(l.id)) return false;
          if (target.grupoId && l.grupoId === target.grupoId) {
            return false;
          }
          return true;
        });
      } else {
        // 'futuros': delete this one and future ones
        filtered = prev.lancamentos.filter(l => {
          if (matchedIdsToDelete.has(l.id)) return false;
          if (target.grupoId && l.grupoId === target.grupoId && l.data >= target.data) {
            return false;
          }
          return true;
        });
      }
      return {
        ...prev,
        lancamentos: filtered
      };
    });
  };

  // Edit a transaction (option: 'este' | 'futuros' | 'todos')
  const handleEditLancamento = (id: string, updated: Partial<Lancamento>, mode: 'este' | 'futuros' | 'todos') => {
    const target = state.lancamentos.find(l => l.id === id);
    if (!target) return;

    // Se for despesa de cartão (despesa_cartao), recalcula a data de cobrança com base na nova data/cartão e fechamento do cartão
    let finalUpdated = { ...updated };
    if (updated.data) {
      const tipo = updated.tipo || target.tipo;
      if (tipo === 'despesa_cartao') {
        const cartaoId = updated.cartaoId || target.cartaoId;
        const card = state.cartoes.find((c) => c.id === cartaoId);
        if (card) {
          const [, , day] = updated.data.split('-').map(Number);
          const diaFechamento = card.diaFechamento;
          if (day > diaFechamento) {
            finalUpdated.data = addMonthsToDateStr(updated.data, 1);
          }
        }
      }
    }

    updateState((prev) => {
      const updatedLancamentos = prev.lancamentos.map((l) => {
        if (l.id === id) {
          return { ...l, ...finalUpdated };
        }
        
        if (mode === 'todos') {
          const isMatch = !!(target.grupoId && l.grupoId === target.grupoId);
            
          if (isMatch) {
            let newDesc = finalUpdated.descricao !== undefined ? finalUpdated.descricao : l.descricao;
            
            // Try to preserve parcel suffix if exists (e.g. " (Parcela X/Y)" or " (X/Y)" or " (1/3)")
            const parcelRegex = /\s*\(\d+\/\d+\)$|\s*\(Parcela\s+\d+\/\d+\)$/i;
            const targetSuffixMatch = l.descricao.match(parcelRegex);
            if (targetSuffixMatch && finalUpdated.descricao) {
              newDesc = finalUpdated.descricao + targetSuffixMatch[0];
            }

            return {
              ...l,
              ...finalUpdated,
              descricao: newDesc,
              data: l.data // Keep the original date of that instance!
            };
          }
        } else if (mode === 'futuros') {
          const isFutureMatch = !!(target.grupoId && l.grupoId === target.grupoId && l.data >= target.data);
            
          if (isFutureMatch) {
            let newDesc = finalUpdated.descricao !== undefined ? finalUpdated.descricao : l.descricao;
            
            // Try to preserve parcel suffix if exists (e.g. " (Parcela X/Y)" or " (X/Y)" or " (1/3)")
            const parcelRegex = /\s*\(\d+\/\d+\)$|\s*\(Parcela\s+\d+\/\d+\)$/i;
            const targetSuffixMatch = l.descricao.match(parcelRegex);
            if (targetSuffixMatch && finalUpdated.descricao) {
              newDesc = finalUpdated.descricao + targetSuffixMatch[0];
            }

            return {
              ...l,
              ...finalUpdated,
              descricao: newDesc,
              data: l.data // Keep the original future date of that instance!
            };
          }
        }
        
        return l;
      });

      return {
        ...prev,
        lancamentos: updatedLancamentos
      };
    });
  };

  // Confirm credit card invoice payment
  const handleConfirmInvoicePayment = (cartaoId: string, value: number, monthYear: string, overrideContaId?: string) => {
    const card = state.cartoes.find(c => c.id === cartaoId);
    if (!card) return;

    const chosenContaId = overrideContaId || card.contaVinculadaId;

    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = new Date().toISOString().split('T')[0];
    let paymentDate = todayStr;
    if (!todayStr.startsWith(monthYear)) {
      paymentDate = `${monthYear}-${pad(card.diaVencimento || 10)}`;
    }

    const linkId = `fatura-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create a paid despesa linked to the card's linked bank account (if available)
    const paymentLanc: Lancamento = {
      id: `lanc-pay-${Date.now()}`,
      tipo: 'despesa',
      valor: value,
      recebidoPagoEfetivado: true,
      data: paymentDate,
      descricao: `Fatura Paga: ${card.nome}`,
      contaId: chosenContaId || undefined,
      // Use general or specific category (e.g., Ajuste or Cartões)
      categoriaId: state.categorias.find(c => c.nome === 'Ajuste' && c.tipo === 'despesa')?.id,
      faturaPagamentoId: linkId
    };

    // Increment credit card invoice limit or log that this month's invoice is cleared.
    // In our system, the card invoice is computed dynamically from 'despesa_cartao' purchases.
    // To represent payment, we can register this despesa to debit the bank account.
    // To clear the invoice, let's also register a corresponding refund or 'estorno' transaction of same value
    // dated in the cycle, OR let's just make the payment lanc, which is the actual cash outflow!
    // Adding a refund 'estorno: true' is a great way to zero out the credit card invoice!
    const clearingLanc: Lancamento = {
      id: `lanc-clear-${Date.now() + 1}`,
      tipo: 'despesa_cartao',
      valor: value,
      recebidoPagoEfetivado: true,
      estorno: true, // This zeroes out the dynamic invoice calculation!
      data: `${monthYear}-01`, // Date within target month-year
      descricao: `Pagamento de Fatura Recibo`,
      cartaoId: cartaoId,
      faturaPagamentoId: linkId
    };

    updateState((prev) => ({
      ...prev,
      lancamentos: [paymentLanc, clearingLanc, ...prev.lancamentos]
    }));

    if (chosenContaId) {
      const contaName = state.contas.find(c => c.id === chosenContaId)?.nome || 'Conta Selecionada';
      showToast(`Fatura do cartão ${card.nome} no valor de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi confirmada e debitada da conta: ${contaName}!`, 'sucesso');
    } else {
      showToast(`Fatura do cartão ${card.nome} no valor de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi confirmada! Como nenhuma conta foi debitada, apenas o limite da fatura do cartão foi atualizado.`, 'sucesso');
    }
  };

  // Add new Bank Account
  const handleAddConta = (newConta: Omit<Conta, 'id'>) => {
    const conta: Conta = {
      ...newConta,
      id: `conta-${Date.now()}`
    };
    updateState((prev) => ({
      ...prev,
      contas: [...prev.contas, conta]
    }));
  };

  // Edit Bank Account
  const handleEditConta = (id: string, updatedFields: Partial<Conta>, newSaldoAtual?: number) => {
    const currentBalance = getAccountBalance(id);
    updateState((prev) => {
      const nextContas = prev.contas.map(c => c.id === id ? { ...c, ...updatedFields } : c);
      const nextLancamentos = [...prev.lancamentos];

      if (newSaldoAtual !== undefined) {
        const diff = newSaldoAtual - currentBalance;
        if (Math.abs(diff) > 0.001) {
          const todayStr = new Date().toISOString().split('T')[0];
          const catAjuste = prev.categorias.find(
            c => c.nome === 'Ajuste' && c.tipo === (diff > 0 ? 'receita' : 'despesa')
          );

          const newLanc: Lancamento = {
            id: `ajuste-${Date.now()}`,
            tipo: diff > 0 ? 'receita' : 'despesa',
            valor: Math.abs(diff),
            recebidoPagoEfetivado: true,
            data: todayStr,
            descricao: `Ajuste de saldo - ${updatedFields.nome || prev.contas.find(c => c.id === id)?.nome || ''}`,
            contaId: id,
            categoriaId: catAjuste?.id
          };
          nextLancamentos.push(newLanc);

          setTimeout(() => {
            window.showToast?.(
              `Saldo ajustado! Criado lançamento de ${diff > 0 ? 'receita' : 'despesa'} no valor de R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ajuste.`,
              'sucesso'
            );
          }, 100);
        }
      }

      return {
        ...prev,
        contas: nextContas,
        lancamentos: nextLancamentos
      };
    });
  };

  // Delete Bank Account
  const handleDeleteConta = (id: string) => {
    updateState((prev) => ({
      ...prev,
      contas: prev.contas.filter(c => c.id !== id),
      // Set linked card's accounts to empty or delete if needed
      cartoes: prev.cartoes.map(card => card.contaVinculadaId === id ? { ...card, contaVinculadaId: '' } : card)
    }));
  };

  // Add new Credit Card
  const handleAddCartao = (newCard: Omit<Cartao, 'id'>) => {
    const card: Cartao = {
      ...newCard,
      id: `cartao-${Date.now()}`
    };
    updateState((prev) => ({
      ...prev,
      cartoes: [...prev.cartoes, card]
    }));
  };

  // Edit Credit Card
  const handleEditCartao = (id: string, updatedFields: Partial<Cartao>) => {
    updateState((prev) => ({
      ...prev,
      cartoes: prev.cartoes.map(c => c.id === id ? { ...c, ...updatedFields } : c)
    }));
  };

  // Delete Credit Card
  const handleDeleteCartao = (id: string) => {
    updateState((prev) => ({
      ...prev,
      cartoes: prev.cartoes.filter(c => c.id !== id)
    }));
  };

  // Categories update
  const handleUpdateCategorias = (newCats: Categoria[]) => {
    updateState({ categorias: newCats });
  };

  // Cofrinhos mutations
  const handleAddCofrinho = (newCof: Omit<Cofrinho, 'id'> & { valorInicial: number }) => {
    const cofrinhoId = `cof-${Date.now()}`;
    const cofrinho: Cofrinho = {
      id: cofrinhoId,
      nome: newCof.nome,
      saldoAtual: newCof.saldoAtual,
      meta: newCof.meta,
      cor: newCof.cor
    };

    // If there is a starting value, add to history as deposit
    const initialHistoryList = [...state.cofrinhoHistorico];
    if (newCof.valorInicial > 0) {
      initialHistoryList.push({
        id: `h-init-${Date.now()}`,
        cofrinhoId,
        tipo: 'deposito',
        valor: newCof.valorInicial,
        data: new Date().toISOString().split('T')[0],
        isInitial: true
      });
    }

    updateState({
      cofrinhos: [...state.cofrinhos, cofrinho],
      cofrinhoHistorico: initialHistoryList
    });
  };

  const handleUpdateCofrinho = (updatedCof: Cofrinho) => {
    updateState((prev) => ({
      ...prev,
      cofrinhos: prev.cofrinhos.map(c => c.id === updatedCof.id ? updatedCof : c)
    }));
  };

  const handleAddCofrinhoHistorico = (newH: Omit<CofrinhoHistorico, 'id'>) => {
    const historyItem: CofrinhoHistorico = {
      ...newH,
      id: `h-${Date.now()}`
    };
    updateState((prev) => ({
      ...prev,
      cofrinhoHistorico: [historyItem, ...prev.cofrinhoHistorico]
    }));
  };

  const handleDeleteCofrinho = (id: string) => {
    updateState((prev) => ({
      ...prev,
      cofrinhos: prev.cofrinhos.filter(c => c.id !== id),
      cofrinhoHistorico: prev.cofrinhoHistorico.filter(h => h.cofrinhoId !== id)
    }));
  };

  return (
    <div className={`theme-${state.theme} min-h-screen bg-[var(--bg-app)] text-[var(--text-general)] flex`}>
      
      {/* Navigation Panels */}
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={state.theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Screen Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Desktop Title & Drawer Toggle Header (Removed on Mobile per user request) */}

        {/* View Switch Stage Container */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto pb-24 md:pb-8 relative">
          
          {currentView === 'dashboard' && (
            <DashboardView
              contas={state.contas}
              cartoes={state.cartoes}
              categorias={state.categorias}
              lancamentos={state.lancamentos}
              cofrinhos={state.cofrinhos}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              getAccountBalance={getAccountBalance}
              getTotalBalance={getTotalBalance}
              getCardInvoiceValue={getCardInvoiceValue}
              getTotalInvoicesValue={getTotalInvoicesValue}
              getTotalReservedValue={getTotalReservedValue}
              getPeriodStats={getPeriodStats}
              getForecastData={getForecastData}
              getSaldoMesAnterior={getSaldoMesAnterior}
              getSaldoAtual={getSaldoAtual}
              onConfirmInvoicePayment={handleConfirmInvoicePayment}
              onAddLancamento={handleAddLancamento}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onEditLancamento={handleEditLancamento}
              onDeleteLancamento={handleDeleteLancamento}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          )}

          {currentView === 'extrato' && (
            <ExtratoView
              contas={state.contas}
              cartoes={state.cartoes}
              categorias={state.categorias}
              lancamentos={state.lancamentos}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              isDateInMonthYear={isDateInMonthYear}
              onDeleteLancamento={handleDeleteLancamento}
              onEditLancamento={handleEditLancamento}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          )}

          {currentView === 'categorias' && (
            <CategoriasView
              categorias={state.categorias}
              onUpdateCategorias={handleUpdateCategorias}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          )}

          {currentView === 'contas_cartoes' && (
            <ContasCartoesView
              contas={state.contas}
              cartoes={state.cartoes}
              getAccountBalance={getAccountBalance}
              onAddConta={handleAddConta}
              onAddCartao={handleAddCartao}
              onDeleteConta={handleDeleteConta}
              onDeleteCartao={handleDeleteCartao}
              onEditConta={handleEditConta}
              onEditCartao={handleEditCartao}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
            />
          )}

          {currentView === 'reservas_cofrinhos' && (
            <ReservasCofrinhosView
              cofrinhos={state.cofrinhos}
              cofrinhoHistorico={state.cofrinhoHistorico}
              contas={state.contas}
              onAddCofrinho={handleAddCofrinho}
              onUpdateCofrinho={handleUpdateCofrinho}
              onAddCofrinhoHistorico={handleAddCofrinhoHistorico}
              onDeleteCofrinho={handleDeleteCofrinho}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onOpenSyncModal={() => setIsSyncModalOpen(true)}
              getAccountBalance={getAccountBalance}
            />
          )}

          {currentView === 'configuracoes' && (
            <ConfiguracoesView
              state={state}
              onClearLancamentos={clearLancamentos}
              onResetAllData={resetAllData}
              onEraseAllData={eraseAllData}
              onImportState={importStateFromJSON}
              onOpenMenu={() => setIsSidebarOpen(true)}
              onStartTutorial={() => setIsTutorialOpen(true)}
              theme={state.theme}
              onThemeToggle={handleThemeToggle}
            />
          )}

        </main>

        {/* Global Bottom Navigation bar for mobile for incredibly quick switching */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] border-t border-[var(--bg-tertiary)] p-2 flex items-center justify-around z-30">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${currentView === 'dashboard' ? 'text-[var(--bg-secondary)]' : 'text-[var(--text-discreto)]'}`}
          >
            <Home size={18} />
            <span>Painel</span>
          </button>
          
          {/* Floating center action button circular */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 -mt-6 bg-[var(--bg-secondary)] text-white rounded-full flex items-center justify-center border-4 border-[var(--bg-app)] cursor-pointer"
            id="mobile-bottom-fab"
          >
            <Plus size={20} className="stroke-[3]" />
          </button>

          <button 
            onClick={() => setCurrentView('extrato')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${currentView === 'extrato' ? 'text-[var(--bg-secondary)]' : 'text-[var(--text-discreto)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            <span>Extrato</span>
          </button>
        </div>

      </div>

      {/* Floating launchers/popups trigger */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        lastUpload={state.lastSyncUpload}
        lastDownload={state.lastSyncDownload}
      />
      <LancamentoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        contas={state.contas}
        cartoes={state.cartoes}
        categorias={state.categorias}
        onAddLancamento={handleAddLancamento}
        isTutorialActive={isTutorialOpen}
      />

      <InteractiveTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        currentView={currentView}
        onChangeView={(view) => setCurrentView(view)}
        onAddSimulatedLancamento={handleAddSimulatedLancamento}
        isAddModalOpen={isAddModalOpen}
        onToggleAddModal={(open) => setIsAddModalOpen(open)}
      />

      {/* Toast Notification Layer */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[100] flex flex-col gap-2 md:gap-2.5 max-w-[calc(100%-2rem)] md:max-w-[360px] md:w-[360px] pointer-events-none mx-auto md:mx-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] shadow-xl backdrop-blur-md relative overflow-hidden"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: t.tipo === 'sucesso' ? '#10b981' : t.tipo === 'erro' ? '#f43f5e' : '#6366f1'
              }}
            >
              {t.tipo === 'sucesso' && <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />}
              {t.tipo === 'erro' && <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />}
              {t.tipo === 'info' && <Info className="text-indigo-500 shrink-0 mt-0.5" size={16} />}
              
              <div className="flex-1 pr-2">
                <p className="text-xs font-medium text-[var(--text-general)] leading-relaxed">{t.mensagem}</p>
              </div>

              <button
                type="button"
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-[var(--text-discreto)] hover:text-[var(--text-general)] p-0.5 rounded-full hover:bg-[var(--bg-tertiary)] transition-all shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
