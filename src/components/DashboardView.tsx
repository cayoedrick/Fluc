import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Conta, Cartao, Categoria, Lancamento, Cofrinho, ViewType } from '../types';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft,
  X,
  CreditCard,
  Wallet,
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Check,
  Edit2,
  Trash2,
  Share2,
  Info
} from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
import { SyncStatusIcon } from './SyncStatusIcon';
import { SharedLancamentoDetailsModal } from './SharedLancamentoDetailsModal';

interface DashboardViewProps {
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  lancamentos: Lancamento[];
  cofrinhos: Cofrinho[];
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
  getAccountBalance: (id: string) => number;
  getTotalBalance: () => number;
  getCardInvoiceValue: (id: string, monthYear: string) => number;
  getTotalInvoicesValue: (monthYear: string, activeCardFilterId?: string) => number;
  getTotalReservedValue: () => number;
  getPeriodStats: (monthYear: string, accountId?: string, cartaoId?: string) => { receitas: number, despesas: number };
  getForecastData: (monthYear: string) => {
    saldoMesAnterior: number;
    receitasConsolidadas: number;
    receitasPendentes: number;
    despesasConsolidadas: number;
    despesasPendentes: number;
    activeInvoices: number;
    forecast: number;
  };
  getSaldoMesAnterior: (monthYear: string, accountId?: string) => number;
  getSaldoAtual: (monthYear: string, accountId?: string) => number;
  onConfirmInvoicePayment: (cartaoId: string, value: number, monthYear: string, overrideContaId?: string) => void;
  onAddLancamento?: (newLanc: Omit<Lancamento, 'id'>) => void;
  onOpenMenu: () => void;
  onEditLancamento?: (id: string, updatedFields: Partial<Lancamento>, mode: 'este' | 'futuros' | 'todos') => void;
  onDeleteLancamento?: (id: string, mode: 'este' | 'futuros' | 'todos') => void;
}

export function DashboardView({
  contas,
  cartoes,
  categorias,
  lancamentos,
  cofrinhos,
  onOpenAddModal,
  onOpenSyncModal,
  getAccountBalance,
  getTotalBalance,
  getCardInvoiceValue,
  getTotalInvoicesValue,
  getTotalReservedValue,
  getPeriodStats,
  getForecastData,
  getSaldoMesAnterior,
  getSaldoAtual,
  onConfirmInvoicePayment,
  onAddLancamento,
  onOpenMenu,
  onEditLancamento,
  onDeleteLancamento
}: DashboardViewProps) {
  // Tab selected: "contas" or "cartoes"
  const [activeTab, setActiveTab] = useState<'contas' | 'cartoes'>('contas');
  
  // Selection filters
  const [selectedContaId, setSelectedContaId] = useState<string>('all');
  const [selectedCartaoId, setSelectedCartaoId] = useState<string>('all');
  
  // Date State: Month and Year (default to current year-month e.g., "2026-06")
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`; // e.g. "2026-06"
  });

  // Popup overlay states
  const [activePopup, setActivePopup] = useState<'saldo' | 'previsao' | 'reservado' | 'fatura' | 'pagamento' | 'despesas_detalhes' | 'receitas_detalhes' | null>(null);

  // Card without bank account selection states
  const [payingCardWithoutAccount, setPayingCardWithoutAccount] = useState<Cartao | null>(null);
  const [payingCardValue, setPayingCardValue] = useState<number>(0);

  // Direction state for month sliding animation (1 = next, -1 = prev)
  const [direction, setDirection] = useState<number>(0);

  // Slide transition variants for month switching
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : dir < 0 ? -150 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -150 : dir < 0 ? 150 : 0,
      opacity: 0,
    }),
  };

  // Helper: change month back & forth
  const handleMonthChange = (dir: 'prev' | 'next') => {
    setDirection(dir === 'next' ? 1 : -1);
    const [year, month] = currentDate.split('-').map(Number);
    let targetMonth = dir === 'prev' ? month - 1 : month + 1;
    let targetYear = year;
    
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    } else if (targetMonth === 13) {
      targetMonth = 1;
      targetYear += 1;
    }

    setCurrentDate(`${targetYear}-${String(targetMonth).padStart(2, '0')}`);
  };

  // Edit State
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  // Shared Details State
  const [sharedLancamento, setSharedLancamento] = useState<Lancamento | null>(null);
  const [isSharedDetailsOpen, setIsSharedDetailsOpen] = useState<boolean>(false);

  // Delete State
  const [deletingLancamento, setDeletingLancamento] = useState<Lancamento | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const handleStartEdit = (l: Lancamento) => {
    setEditingLancamento(l);
    setIsEditOpen(true);
  };

  const handleShowDetails = (l: Lancamento) => {
    setSharedLancamento(l);
    setIsSharedDetailsOpen(true);
  };

  const handleStartDelete = (l: Lancamento) => {
    setDeletingLancamento(l);
    setShowDeleteConfirm(true);
  };

  // Invoice Payment Confirmation State
  const [isConfirmPayOpen, setIsConfirmPayOpen] = useState(false);
  const [cardForPayment, setCardForPayment] = useState<Cartao | null>(null);
  const [valueForPayment, setValueForPayment] = useState(0);
  const [isTransferEnabled, setIsTransferEnabled] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');

  const getMonthNamePortuguese = (monthYearStr: string) => {
    const [year, month] = monthYearStr.split('-').map(Number);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[month - 1]} de ${year}`;
  };

  // Derived Values
  const periodStats = getPeriodStats(
    currentDate, 
    activeTab === 'contas' && selectedContaId !== 'all' ? selectedContaId : undefined,
    activeTab === 'cartoes' && selectedCartaoId !== 'all' ? selectedCartaoId : undefined
  );

  const forecastData = getForecastData(currentDate);

  // Custom calculation: Sum of all expenses, regardless of consolidation status, plus card invoices
  const dashboardExpenseLancamentos = React.useMemo(() => {
    let sum = 0;
    lancamentos.forEach((l) => {
      if (l.tipo === 'despesa' && l.data.startsWith(currentDate)) {
        if (activeTab === 'contas') {
          if (selectedContaId === 'all' || l.contaId === selectedContaId) {
            sum += l.valor;
          }
        }
      }
    });
    return sum;
  }, [lancamentos, currentDate, activeTab, selectedContaId]);

  const dashboardExpenseCartoes = React.useMemo(() => {
    if (activeTab === 'cartoes') {
      if (selectedCartaoId === 'all') {
        return getTotalInvoicesValue(currentDate);
      } else {
        return getCardInvoiceValue(selectedCartaoId, currentDate);
      }
    } else {
      if (selectedContaId === 'all') {
        return getTotalInvoicesValue(currentDate);
      } else {
        let sum = 0;
        const linkedCards = cartoes.filter(c => c.contaVinculadaId === selectedContaId);
        linkedCards.forEach((card) => {
          sum += getCardInvoiceValue(card.id, currentDate);
        });
        return sum;
      }
    }
  }, [cartoes, currentDate, activeTab, selectedContaId, selectedCartaoId, getCardInvoiceValue, getTotalInvoicesValue]);

  const dashboardTotalExpenses = dashboardExpenseLancamentos + dashboardExpenseCartoes;

  // Custom calculation: Sum of all revenues (receitas) regardless of consolidation
  const dashboardTotalReceitas = React.useMemo(() => {
    let sum = 0;
    lancamentos.forEach((l) => {
      if (l.tipo !== 'receita') return;
      if (!l.data.startsWith(currentDate)) return;

      if (activeTab === 'contas') {
        if (selectedContaId === 'all' || l.contaId === selectedContaId) {
          sum += l.valor;
        }
      } else {
        // activeTab === 'cartoes'
        if (selectedCartaoId === 'all') {
          sum += l.valor;
        }
      }
    });
    return sum;
  }, [lancamentos, currentDate, activeTab, selectedContaId, selectedCartaoId]);

  // Filtered launches inside the selected month-year
  const filteredLancamentos = lancamentos.filter((l) => {
    const inMonth = l.data.startsWith(currentDate);
    if (!inMonth) return false;

    if (activeTab === 'contas') {
      // Account mode: either all accounts or specific
      if (selectedContaId !== 'all') {
        if (l.tipo === 'transferencia') {
          return l.contaId === selectedContaId || l.paraContaId === selectedContaId;
        }
        return l.contaId === selectedContaId;
      }
      return l.tipo !== 'despesa_cartao'; // exclude card expenses when looking at general cash accounts
    } else {
      // Cards mode: either all cards or specific
      if (selectedCartaoId !== 'all') {
        return l.tipo === 'despesa_cartao' && l.cartaoId === selectedCartaoId;
      }
      return l.tipo === 'despesa_cartao';
    }
  });

  // Pay invoice handler inside dashboard (opens confirmation step)
  const handlePayInvoice = (cartaoId: string) => {
    const invoiceValue = getCardInvoiceValue(cartaoId, currentDate);
    if (invoiceValue <= 0) {
      window.showToast?.('Esta fatura já está zerada ou não possui lançamentos neste período.', 'erro');
      return;
    }

    const card = cartoes.find((c) => c.id === cartaoId);
    if (card) {
      setCardForPayment(card);
      setValueForPayment(invoiceValue);
      setTransferTargetId(card.contaVinculadaId || '');
      setTransferSourceId('');
      setIsTransferEnabled(false);
      setIsConfirmPayOpen(true);
    }
  };

  const handleExecuteInvoicePayment = () => {
    if (!cardForPayment) return;

    // 1. If transfer is enabled, create the transfer lancamento
    if (isTransferEnabled && transferSourceId && transferTargetId && onAddLancamento) {
      onAddLancamento({
        descricao: `Transferência para Pagamento Fatura ${cardForPayment.nome}`,
        valor: valueForPayment,
        data: new Date().toISOString().split('T')[0],
        tipo: 'transferencia',
        contaId: transferSourceId,
        paraContaId: transferTargetId,
        categoriaId: '',
        recebidoPagoEfetivado: true,
        fixoRecorrente: false,
        parcelado: false
      });
    }

    // 2. Execute the invoice payment itself
    // If we transferred to the target account, we should pay FROM that target account
    // handleConfirmInvoicePayment handles the debit in the linked account.
    onConfirmInvoicePayment(cardForPayment.id, valueForPayment, currentDate, transferTargetId || undefined);
    
    // Close modals
    setIsConfirmPayOpen(false);
    setCardForPayment(null);
    setActivePopup(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      
      {/* 1. Header Row */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-[var(--text-general)] tracking-tight">Fluc</h2>
          </div>
        </div>

        {/* Action Controls: Toggle, Add */}
        <div className="flex items-center gap-2">
          {/* New Transaction Button */}
          <button
            onClick={onOpenAddModal}
            className="hidden md:flex w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-white items-center justify-center hover:opacity-90 transition-all cursor-pointer"
            title="Adicionar Lançamento"
            id="fab-add-launch"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>
          {/* Sync Status */}
          <SyncStatusIcon onClick={onOpenSyncModal} />
        </div>
      </div>

      {/* 2. Top Tab Selector (Contas vs Cartões) */}
      <div id="dashboard-accounts-cards-tabs" className="flex bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-1.5 rounded-[18px] text-sm font-semibold max-w-sm">
        <button
          onClick={() => setActiveTab('contas')}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'contas'
              ? 'bg-[var(--bg-secondary)] text-white border border-[var(--bg-secondary)]'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <Wallet size={16} />
          <span>Contas</span>
        </button>
        <button
          onClick={() => setActiveTab('cartoes')}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'cartoes'
              ? 'bg-[var(--bg-secondary)] text-white border border-[var(--bg-secondary)]'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <CreditCard size={16} />
          <span>Cartões</span>
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentDate}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            const threshold = 50;
            if (info.offset.x < -threshold) {
              handleMonthChange('next');
            } else if (info.offset.x > threshold) {
              handleMonthChange('prev');
            }
          }}
          className="w-full flex-1 flex flex-col space-y-6 touch-pan-y"
        >
          {/* 3. Account / Card Filter and Card Panel */}
          {activeTab === 'contas' ? (
        <div className="space-y-4">
          {/* Selector of Accounts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedContaId('all')}
              className={`px-3.5 py-2 tag-flat transition-colors shrink-0 ${
                selectedContaId === 'all'
                  ? 'bg-[var(--bg-secondary)] text-white'
                  : 'bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              Todas as Contas
            </button>
            {contas.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContaId(c.id)}
                className={`px-3.5 py-2 tag-flat border transition-colors shrink-0 flex items-center gap-1.5 ${
                  selectedContaId === c.id
                    ? 'bg-white text-[var(--bg-app)] font-bold border-white'
                    : 'bg-[var(--bg-primary)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                }`}
                style={selectedContaId === c.id ? undefined : { borderColor: c.cor + '40' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                {c.nome}
              </button>
            ))}
          </div>

          {/* MAIN BANK CARD (DASHBOARD HIGHLIGHT) */}
          <div id="dashboard-balance-card" className="card-flat p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-primary)]/80">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-secondary)]/10 rounded-full blur-2xl -mr-8 -mt-8" />
            
            {/* Top row: Saldo Total */}
            <div 
              onClick={() => setActivePopup('saldo')}
              className="cursor-pointer hover:bg-[var(--bg-tertiary)]/30 p-2 -m-2 rounded-[16px] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-widest">SALDO EM CONTAS</span>
                <HelpCircle size={12} className="text-[var(--text-discreto)]" />
              </div>
              <h1 className="text-4xl font-extrabold text-[var(--text-general)] mt-1 tracking-tight">
                R$ {selectedContaId === 'all' 
                  ? getSaldoAtual(currentDate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : getSaldoAtual(currentDate, selectedContaId).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>

            {/* Bottom row: Previsão de Saldo & Reservado */}
            <div className="grid grid-cols-2 gap-4 border-t border-[var(--bg-tertiary)]/50 pt-4 mt-6">
              {/* Previsão de Saldo */}
              <div 
                onClick={() => setActivePopup('previsao')}
                className="cursor-pointer hover:bg-[var(--bg-tertiary)]/30 p-2 -m-2 rounded-[16px] transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">PREVISÃO DE SALDO</span>
                  <HelpCircle size={10} className="text-[var(--text-discreto)]" />
                </div>
                <p className={`text-sm font-bold mt-0.5 ${forecastData.forecast > 0 ? 'text-[#00cc52]' : forecastData.forecast < 0 ? 'text-[#d03c4d]' : 'text-[var(--text-general)]'}`}>
                  R$ {forecastData.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Reservado */}
              <div 
                onClick={() => setActivePopup('reservado')}
                className="cursor-pointer hover:bg-[var(--bg-tertiary)]/30 p-2 -m-2 rounded-[16px] transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">RESERVADO</span>
                  <HelpCircle size={10} className="text-[var(--text-discreto)]" />
                </div>
                <p className="text-sm font-bold text-blue-500 mt-0.5">
                  R$ {getTotalReservedValue().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selector of Cards */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedCartaoId('all')}
              className={`px-3.5 py-2 tag-flat transition-colors shrink-0 ${
                selectedCartaoId === 'all'
                  ? 'bg-[var(--bg-secondary)] text-white'
                  : 'bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              Todos os Cartões
            </button>
            {cartoes.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCartaoId(card.id)}
                className={`px-3.5 py-2 tag-flat border transition-colors shrink-0 flex items-center gap-1.5 ${
                  selectedCartaoId === card.id
                    ? 'bg-white text-[var(--bg-app)] font-bold border-white'
                    : 'bg-[var(--bg-primary)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                }`}
                style={selectedCartaoId === card.id ? undefined : { borderColor: card.cor + '40' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: card.cor }} />
                {card.nome}
              </button>
            ))}
          </div>

          {/* MAIN CREDIT CARD (DASHBOARD HIGHLIGHT) */}
          <div className="card-flat p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-primary)]/80">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-cartao)]/10 rounded-full blur-2xl -mr-8 -mt-8" />

            {/* Top row: Invoice value */}
            <div>
              <div 
                onClick={() => setActivePopup('fatura')}
                className="cursor-pointer hover:bg-[var(--bg-tertiary)]/30 p-2 -m-2 rounded-[16px] transition-colors inline-block"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-widest">VALOR DAS FATURAS ({getMonthNamePortuguese(currentDate)})</span>
                  <HelpCircle size={12} className="text-[var(--text-discreto)]" />
                </div>
                <h1 className="text-4xl font-extrabold text-[#ed793a] mt-1 tracking-tight">
                  R$ {getTotalInvoicesValue(currentDate, selectedCartaoId === 'all' ? undefined : selectedCartaoId).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
              </div>
            </div>

            {/* Bottom Row: Action Confirm Payment */}
            <div className="flex items-center justify-between border-t border-[var(--bg-tertiary)]/50 pt-4 mt-6">
              <div>
                <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">CONTA VINCULADA</span>
                <span className="text-xs font-semibold text-[var(--text-general)]">
                  {selectedCartaoId === 'all' 
                    ? 'Múltiplas' 
                    : contas.find(c => c.id === cartoes.find(cr => cr.id === selectedCartaoId)?.contaVinculadaId)?.nome || 'Nenhuma'}
                </span>
              </div>
              
              <button
                onClick={() => setActivePopup('pagamento')}
                className="bg-[var(--color-cartao)] hover:opacity-90 text-white font-bold text-xs py-2.5 px-4 rounded-[14px] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle size={14} />
                <span>Confirmar Pagamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Month Selector */}
      <div id="dashboard-month-selector" className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-3 rounded-[20px]">
        <button
          onClick={() => handleMonthChange('prev')}
          className="p-2 hover:bg-[var(--bg-app)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} className="stroke-[2.5]" />
        </button>
        <span className="text-base font-extrabold text-[var(--text-general)] tracking-tight">
          {getMonthNamePortuguese(currentDate)}
        </span>
        <button
          onClick={() => handleMonthChange('next')}
          className="p-2 hover:bg-[var(--bg-app)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
        >
          <ChevronRight size={20} className="stroke-[2.5]" />
        </button>
      </div>

      {/* 5. Income & Expense mini-widgets */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Income Widget */}
        <div 
          onClick={() => setActivePopup('receitas_detalhes')}
          className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[20px] sm:rounded-[24px] p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4 min-w-0 cursor-pointer hover:bg-[var(--bg-tertiary)]/20 transition-all"
        >
          <div className="p-2 sm:p-3 rounded-[12px] sm:rounded-[16px] bg-[#00cc52]/10 text-[#00cc52] shrink-0 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-[22px] sm:h-[22px] stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block truncate">RECEITAS</span>
              <HelpCircle size={10} className="text-[var(--text-discreto)] shrink-0" />
            </div>
            <p className="text-sm xs:text-base sm:text-lg font-extrabold text-[#00cc52] tracking-tight truncate" title={dashboardTotalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}>
              R$ {dashboardTotalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Expense Widget */}
        <div 
          onClick={() => setActivePopup('despesas_detalhes')}
          className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[20px] sm:rounded-[24px] p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4 min-w-0 cursor-pointer hover:bg-[var(--bg-tertiary)]/20 transition-all"
        >
          <div className="p-2 sm:p-3 rounded-[12px] sm:rounded-[16px] bg-[#d03c4d]/10 text-[#d03c4d] shrink-0 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 sm:w-[22px] sm:h-[22px] stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block truncate">DESPESAS</span>
              <HelpCircle size={10} className="text-[var(--text-discreto)] shrink-0" />
            </div>
            <p className="text-sm xs:text-base sm:text-lg font-extrabold text-[#d03c4d] tracking-tight truncate" title={dashboardTotalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}>
              R$ {dashboardTotalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* 6. List of Registered Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-discreto)] uppercase tracking-wider">
            Lançamentos do Período
          </h3>
          <span className="text-xs font-semibold bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-full text-[var(--text-discreto)]">
            {filteredLancamentos.length} {filteredLancamentos.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {filteredLancamentos.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-10 text-center text-[var(--text-discreto)]">
            <p className="text-sm font-medium">Nenhum lançamento registrado neste mês.</p>
            <p className="text-xs mt-1">Clique no botão "+" no topo para adicionar.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLancamentos.map((l) => {
              const cat = categorias.find((c) => c.id === l.categoriaId);
              const isRec = l.tipo === 'receita';
              const isCard = l.tipo === 'despesa_cartao';
              const isTransf = l.tipo === 'transferencia';
              const isPaid = l.recebidoPagoEfetivado;

              let typeColor = 'text-[var(--text-general)]';
              if (isRec) typeColor = 'text-[#00cc52]';
              if (l.tipo === 'despesa') typeColor = 'text-[#d03c4d]';
              if (isCard) typeColor = 'text-[#ed793a]';
              if (isTransf) typeColor = 'text-[#1c7ae4]';

              // Get readable origin-destination accounts for transfer
              const accountName = isTransf
                ? `${contas.find(c => c.id === l.contaId)?.nome} ➔ ${contas.find(c => c.id === l.paraContaId)?.nome}`
                : isCard
                  ? cartoes.find(cr => cr.id === l.cartaoId)?.nome || 'Cartão'
                  : contas.find(c => c.id === l.contaId)?.nome || 'Conta';

              return (
                <div 
                  key={l.id}
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[20px] p-4 flex items-center justify-between gap-4 transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon container */}
                    <div className={`p-2.5 rounded-[14px] ${
                      isRec ? 'bg-[#00cc52]/10 text-[#00cc52]' :
                      isCard ? 'bg-[#ed793a]/10 text-[#ed793a]' :
                      isTransf ? 'bg-[#1c7ae4]/10 text-[#1c7ae4]' :
                      'bg-[#d03c4d]/10 text-[#d03c4d]'
                    }`}>
                      {l.isShared || l.isReimbursement ? <Share2 size={16} /> :
                       isRec ? <TrendingUp size={16} /> :
                       isCard ? <CreditCard size={16} /> :
                       isTransf ? <ArrowRightLeft size={16} /> :
                       <TrendingDown size={16} />}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-general)]">
                        {l.descricao}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[var(--text-discreto)] mt-0.5">
                        <span className="uppercase tracking-wider">{cat?.nome || (isTransf ? 'Transferência' : 'Geral')}</span>
                        <span>•</span>
                        <span>{accountName}</span>
                      </div>
                      {(l.tipo === 'receita' || l.tipo === 'despesa') ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditLancamento) {
                              onEditLancamento(l.id, { recebidoPagoEfetivado: !isPaid }, 'este');
                            }
                          }}
                          className={`mt-1.5 px-2 py-0.5 rounded-[6px] uppercase text-[9px] font-extrabold border transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] select-none ${
                            isPaid 
                              ? isRec 
                                ? 'bg-[#00cc52]/10 border-[#00cc52]/20 text-[#00cc52] hover:bg-[#00cc52]/20'
                                : 'bg-[#d03c4d]/10 border-[#d03c4d]/20 text-[#d03c4d] hover:bg-[#d03c4d]/20'
                              : 'bg-[#ed793a]/10 border-[#ed793a]/20 text-[#ed793a] hover:bg-[#ed793a]/20'
                          }`}
                          title={isPaid ? (isRec ? 'Marcar como Pendente' : 'Marcar como Pendente') : (isRec ? 'Confirmar Recebido' : 'Confirmar Pago')}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? (isRec ? 'bg-[#00cc52]' : 'bg-[#d03c4d]') : 'bg-[#ed793a]'}`} />
                          {isPaid ? (isRec ? 'Recebido' : 'Pago') : (isRec ? 'Confirmar Recebido' : 'Confirmar Pago')}
                        </button>
                      ) : !isPaid && !isCard && (
                        <span className="mt-1.5 text-[#ed793a] bg-[#ed793a]/10 px-1.5 py-0.5 rounded-[4px] uppercase text-[9px] font-bold inline-block">Pendente</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <p className={`text-sm font-extrabold whitespace-nowrap ${typeColor}`}>
                      {isRec ? '+' : isCard && l.estorno ? '+' : '-'} R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-bold text-[var(--text-discreto)]">
                      {l.data.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    
                    <div className="flex items-center gap-1 mt-1">
                      {(l.isShared || l.isReimbursement) && (
                        <button
                          onClick={() => handleShowDetails(l)}
                          className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-[8px] border border-indigo-500/20 transition-colors cursor-pointer"
                          title="Detalhes do compartilhamento"
                        >
                          <Info size={12} />
                        </button>
                      )}
                      {!l.isReimbursement && (
                        <>
                          <button
                            onClick={() => handleStartEdit(l)}
                            className="p-1.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-[8px] border border-[var(--bg-tertiary)] transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleStartDelete(l)}
                            className="p-1.5 bg-[var(--bg-app)] hover:bg-red-500/15 text-[var(--text-discreto)] hover:text-red-500 rounded-[8px] border border-[var(--bg-tertiary)] hover:border-red-500/20 transition-colors cursor-pointer"
                            title="Apagar lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </motion.div>
      </AnimatePresence>

      {/* POPUP FLOATING OVERLAYS (EXACTLY AS SPECIFIED IN USER REQUIREMENT) */}
      
      {/* 1. SALDO SEPARADO POR CONTA POPUP */}
      {activePopup === 'saldo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-general)]">Saldos por Conta</h3>
              <button onClick={() => setActivePopup(null)} className="p-1 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              {contas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--bg-app)] rounded-[16px] border border-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                    <span className="text-xs font-bold text-[var(--text-general)]">{c.nome}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[var(--text-general)]">
                    R$ {getSaldoAtual(currentDate, c.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. RESERVADO SEPARADO POR COFRINHO POPUP */}
      {activePopup === 'reservado' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-general)]">Valores Reservados</h3>
              <button onClick={() => setActivePopup(null)} className="p-1 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            {cofrinhos.length === 0 ? (
              <p className="text-xs text-[var(--text-discreto)] text-center">Nenhuma reserva cadastrada.</p>
            ) : (
              <div className="space-y-2.5">
                {cofrinhos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[var(--bg-app)] rounded-[16px] border border-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                      <span className="text-xs font-bold text-[var(--text-general)]">{c.nome}</span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-500">
                      R$ {c.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PREVISÃO DE SALDO CÁLCULOS POPUP */}
      {activePopup === 'previsao' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border(--bg-tertiary) rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-general)]">Previsão Detalhada</h3>
              <button onClick={() => setActivePopup(null)} className="p-1 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[var(--text-discreto)] font-bold">SALDO DO MÊS ANTERIOR</span>
                <span className="text-[var(--text-general)] font-bold">R$ {forecastData.saldoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[#00cc52] font-bold">RECEITAS CONSOLIDADAS</span>
                <span className="text-[#00cc52] font-bold">+ R$ {forecastData.receitasConsolidadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[#00cc52] font-bold">RECEITAS PENDENTES</span>
                <span className="text-[#00cc52] font-bold">+ R$ {forecastData.receitasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[#d03c4d] font-bold">DESPESAS CONSOLIDADAS</span>
                <span className="text-[#d03c4d] font-bold">- R$ {forecastData.despesasConsolidadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[#d03c4d] font-bold">DESPESAS PENDENTES</span>
                <span className="text-[#d03c4d] font-bold">- R$ {forecastData.despesasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[var(--bg-app)] rounded-[12px]">
                <span className="text-[#ed793a] font-bold">FATURAS EM ABERTO</span>
                <span className="text-[#ed793a] font-bold">- R$ {forecastData.activeInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="border-t border-[var(--bg-tertiary)] pt-3 flex justify-between font-extrabold text-sm text-[var(--text-general)]">
                <span>PREVISÃO FINAL</span>
                <span className={forecastData.forecast > 0 ? 'text-[#00cc52]' : forecastData.forecast < 0 ? 'text-[#d03c4d]' : 'text-[var(--text-general)]'}>R$ {forecastData.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FATURA DETALHADA SEPARADA POR CARTÃO POPUP */}
      {activePopup === 'fatura' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-general)]">Faturas por Cartão</h3>
              <button onClick={() => setActivePopup(null)} className="p-1 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              {cartoes.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-3 bg-[var(--bg-app)] rounded-[16px] border border-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: card.cor }} />
                    <span className="text-xs font-bold text-[var(--text-general)]">{card.nome}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#ed793a]">
                    R$ {getCardInvoiceValue(card.id, currentDate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRMAR PAGAMENTO DE FATURA POPUP */}
      {activePopup === 'pagamento' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-general)]">Pagar Fatura</h3>
              <button onClick={() => setActivePopup(null)} className="p-1 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)]">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-[var(--text-discreto)]">
              Selecione o cartão para confirmar o pagamento da fatura deste mês. Isso debitará o valor correspondente da conta vinculada ao cartão.
            </p>

            <div className="space-y-2.5">
              {cartoes.map((card) => {
                const value = getCardInvoiceValue(card.id, currentDate);
                const conta = contas.find(c => c.id === card.contaVinculadaId);
                return (
                  <div 
                    key={card.id} 
                    className="p-3 bg-[var(--bg-app)] rounded-[16px] border border-[var(--bg-tertiary)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: card.cor }} />
                        <span className="text-xs font-bold text-[var(--text-general)]">{card.nome}</span>
                      </div>
                      <span className="text-xs font-extrabold text-[#ed793a]">
                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[var(--text-discreto)] pt-1 border-t border-[var(--bg-tertiary)]">
                      <span>Conta Débito: {conta?.nome || 'Nenhuma'}</span>
                      {value > 0 ? (
                        <button
                          onClick={() => handlePayInvoice(card.id)}
                          className="bg-[#00cc52] hover:opacity-95 text-white font-bold text-[9px] px-2.5 py-1 rounded-[8px] flex items-center gap-0.5 cursor-pointer"
                        >
                          <Check size={10} /> Pagar
                        </button>
                      ) : (
                        <span className="text-[#00cc52] font-semibold">Paga / Zerada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE SELEÇÃO DE CONTA PARA CARTÃO SEM CONTA VINCULADA */}
      {payingCardWithoutAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4 text-center">
            <div>
              <span className="w-12 h-12 rounded-full bg-orange-500/10 text-[#ed793a] flex items-center justify-center mx-auto mb-3">
                <Wallet size={22} className="stroke-[2.5]" />
              </span>
              <h3 className="text-sm font-bold text-[var(--text-general)]">Selecione a Conta para Débito</h3>
              <p className="text-xs text-[var(--text-discreto)] mt-1.5">
                O cartão <span className="font-semibold text-[var(--text-general)]">{payingCardWithoutAccount.nome}</span> não possui uma conta bancária vinculada. Escolha de qual conta deseja debitar o valor de <span className="font-extrabold text-[#ed793a]">R$ {payingCardValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>:
              </p>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {contas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onConfirmInvoicePayment(payingCardWithoutAccount.id, payingCardValue, currentDate, c.id);
                    setPayingCardWithoutAccount(null);
                    setActivePopup(null);
                  }}
                  className="w-full p-3 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded-[16px] flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                    <span className="text-xs font-bold text-[var(--text-general)] group-hover:text-[var(--text-general)]">{c.nome}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-discreto)]">Selecionar</span>
                </button>
              ))}

              <button
                onClick={() => {
                  onConfirmInvoicePayment(payingCardWithoutAccount.id, payingCardValue, currentDate);
                  setPayingCardWithoutAccount(null);
                  setActivePopup(null);
                }}
                className="w-full p-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 rounded-[16px] flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-500">Apenas dar baixa</span>
                </div>
                <span className="text-[10px] text-red-400">(Sem debitar de conta)</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--bg-tertiary)]">
              <button
                onClick={() => {
                  setPayingCardWithoutAccount(null);
                }}
                className="text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] py-1 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHAMENTO DE DESPESAS POPUP */}
      {activePopup === 'despesas_detalhes' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-general)]">Detalhamento de Despesas</h3>
                <p className="text-[10px] font-semibold text-[var(--text-discreto)] uppercase tracking-wider mt-0.5">
                  {getMonthNamePortuguese(currentDate)}
                </p>
              </div>
              <button 
                onClick={() => setActivePopup(null)} 
                className="p-1.5 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Lançamentos de Contas */}
              <div className="p-3.5 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--text-general)]">Lançamentos (Contas)</span>
                  <span className="text-xs font-extrabold text-[#d03c4d]">
                    R$ {dashboardExpenseLancamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-discreto)]">
                  Soma de todas as despesas em contas, consolidadas ou pendentes.
                </p>
              </div>

              {/* Faturas de Cartões */}
              <div className="p-3.5 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--text-general)]">Faturas dos Cartões</span>
                  <span className="text-xs font-extrabold text-[#ed793a]">
                    R$ {dashboardExpenseCartoes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-discreto)]">
                  Total das faturas de cartão de crédito no período.
                </p>
              </div>

              {/* Total Geral */}
              <div className="p-4 bg-[var(--bg-tertiary)]/30 border border-[var(--bg-tertiary)] rounded-[16px] flex justify-between items-center">
                <span className="text-xs font-extrabold text-[var(--text-general)]">Total de Saídas</span>
                <span className="text-sm font-extrabold text-[#d03c4d]">
                  R$ {dashboardTotalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setActivePopup(null)}
                className="w-full py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHAMENTO DE RECEITAS POPUP */}
      {activePopup === 'receitas_detalhes' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-general)]">Detalhamento de Receitas</h3>
                <p className="text-[10px] font-semibold text-[var(--text-discreto)] uppercase tracking-wider mt-0.5">
                  {getMonthNamePortuguese(currentDate)}
                </p>
              </div>
              <button 
                onClick={() => setActivePopup(null)} 
                className="p-1.5 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-discreto)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Lançamentos de Contas */}
              <div className="p-3.5 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--text-general)]">Lançamentos (Receitas)</span>
                  <span className="text-xs font-extrabold text-[#00cc52]">
                    R$ {dashboardTotalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-discreto)]">
                  Soma de todas as receitas em contas, consolidadas ou pendentes.
                </p>
              </div>

              {/* Total Geral */}
              <div className="p-4 bg-[var(--bg-tertiary)]/30 border border-[var(--bg-tertiary)] rounded-[16px] flex justify-between items-center">
                <span className="text-xs font-extrabold text-[var(--text-general)]">Total de Entradas</span>
                <span className="text-sm font-extrabold text-[#00cc52]">
                  R$ {dashboardTotalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setActivePopup(null)}
                className="w-full py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditOpen && editingLancamento && (
        <EditLancamentoModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingLancamento(null);
          }}
          lancamento={editingLancamento}
          contas={contas}
          cartoes={cartoes}
          categorias={categorias}
          onSave={(id, updatedFields, mode) => {
            if (onEditLancamento) {
              onEditLancamento(id, updatedFields, mode);
              window.showToast?.('Lançamento atualizado com sucesso!', 'sucesso');
            }
          }}
        />
      )}

      <SharedLancamentoDetailsModal 
        isOpen={isSharedDetailsOpen}
        onClose={() => setIsSharedDetailsOpen(false)}
        lancamento={sharedLancamento}
        allLancamentos={lancamentos}
      />

      {/* Delete Confirmation Overlay Modal */}
      {showDeleteConfirm && deletingLancamento && (() => {
        const isGrouped = !!(deletingLancamento.grupoId || deletingLancamento.fixoRecorrente || deletingLancamento.parcelado);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="delete-confirm-modal">
            <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-5 text-center">
              <div>
                <span className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={22} className="stroke-[2.5]" />
                </span>
                <h4 className="text-sm font-bold text-[var(--text-general)]">
                  {isGrouped ? "Como deseja apagar este lançamento?" : "Deseja realmente apagar este lançamento?"}
                </h4>
                <p className="text-xs text-[var(--text-general)] font-semibold mt-2 bg-[var(--bg-app)] py-1.5 px-3 rounded-[10px] border border-[var(--bg-tertiary)] inline-block">
                  {deletingLancamento.descricao}
                </p>
                <p className="text-[11px] text-[var(--text-discreto)] mt-2">
                  {isGrouped 
                    ? 'Escolha se deseja apagar somente esta ocorrência ("Este"), esta e as futuras ("Este e Futuros"), ou apagar todas as ocorrências passadas, presentes e futuras ("Todo o Lançamento").'
                    : 'Esta ação não poderá ser desfeita.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {isGrouped ? (
                  <>
                    <button
                      id="delete-btn-este"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'este');
                          window.showToast?.('Lançamento apagado com sucesso!', 'sucesso');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar apenas "Este"
                    </button>

                    <button
                      id="delete-btn-futuros"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'futuros');
                          window.showToast?.('Este lançamento e todas as recorrências futuras foram apagados com sucesso!', 'sucesso');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar "Este e Futuros"
                    </button>

                    <button
                      id="delete-btn-todos"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'todos');
                          window.showToast?.('Todo o lançamento (passados, presente e futuros) foi apagado com sucesso!', 'sucesso');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar "Todo o Lançamento" (Passado/Presente/Futuro)
                    </button>
                  </>
                ) : (
                  <button
                    id="delete-btn-confirm"
                    onClick={() => {
                      if (onDeleteLancamento) {
                        onDeleteLancamento(deletingLancamento.id, 'este');
                        window.showToast?.('Lançamento apagado com sucesso!', 'sucesso');
                      }
                      setShowDeleteConfirm(false);
                      setDeletingLancamento(null);
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                  >
                    Confirmar Exclusão
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--bg-tertiary)]">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingLancamento(null);
                  }}
                  className="text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] py-1 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Invoice Payment Confirmation Modal */}
      {isConfirmPayOpen && cardForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-5">
            <div className="text-center">
              <span className="w-12 h-12 rounded-full bg-[var(--color-cartao)]/10 text-[var(--color-cartao)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={22} className="stroke-[2.5]" />
              </span>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Confirmar Pagamento de Fatura</h4>
              <p className="text-[11px] text-[var(--text-discreto)] mt-1">
                Você está confirmando o pagamento da fatura do cartão <strong>{cardForPayment.nome}</strong> no valor de <strong>R$ {valueForPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              {/* Transfer Toggle */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-general)]">Transferir</span>
                  <span className="text-[9px] text-[var(--text-discreto)]">Criar transferência antes de pagar</span>
                </div>
                <button
                  onClick={() => setIsTransferEnabled(!isTransferEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isTransferEnabled ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isTransferEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Transfer Details (if enabled) */}
              {isTransferEnabled && (
                <div className="space-y-3 p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] animate-in fade-in slide-in-from-top-1">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">Conta Origem (De onde sai o dinheiro)</label>
                    <select
                      value={transferSourceId}
                      onChange={(e) => setTransferSourceId(e.target.value)}
                      className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[10px] text-xs text-[var(--text-general)] focus:outline-hidden"
                    >
                      <option value="">Selecione a conta...</option>
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} (Saldo: R$ {getAccountBalance(c.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">Conta Destino (Para onde vai o dinheiro)</label>
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[10px] text-xs text-[var(--text-general)] focus:outline-hidden"
                    >
                      <option value="">Selecione a conta...</option>
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsConfirmPayOpen(false)}
                className="py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteInvoicePayment}
                disabled={isTransferEnabled && (!transferSourceId || !transferTargetId)}
                className="py-2.5 bg-[var(--color-cartao)] hover:opacity-90 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
