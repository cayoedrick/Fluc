import React, { useState } from 'react';
import { Conta, Cartao, Lancamento } from '../types';
import { Plus, Landmark, CreditCard, Paintbrush, Check, X, HelpCircle, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';

const formatCurrency = (val: number): string => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 3 });
};

interface ContasCartoesViewProps {
  contas: Conta[];
  cartoes: Cartao[];
  getAccountBalance: (id: string) => number;
  onAddConta: (c: Omit<Conta, 'id'>) => void;
  onAddCartao: (c: Omit<Cartao, 'id'>) => void;
  onDeleteConta: (id: string) => void;
  onDeleteCartao: (id: string) => void;
  onEditConta: (id: string, c: Partial<Conta>, newSaldoAtual?: number) => void;
  onEditCartao: (id: string, c: Partial<Cartao>) => void;
  onOpenMenu?: () => void;
  onOpenSyncModal: () => void;
  getCardInvoiceValue?: (cartaoId: string, monthYearStr: string) => number;
  onAddLancamento?: (newLanc: Omit<Lancamento, 'id'>) => void;
}

const PRESET_COLORS = [
  '#1c7ae4', // Blue
  '#00cc52', // Green
  '#d03c4d', // Red
  '#ed793a', // Orange
  '#507b84', // Slate Green
  '#8e44ad', // Purple
  '#f1c40f', // Yellow
];

export function ContasCartoesView({
  contas,
  cartoes,
  getAccountBalance,
  onAddConta,
  onAddCartao,
  onDeleteConta,
  onDeleteCartao,
  onEditConta,
  onEditCartao,
  onOpenMenu,
  onOpenSyncModal,
  getCardInvoiceValue,
  onAddLancamento
}: ContasCartoesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'conta' | 'cartao'>('conta');

  // Invoice states
  const [invoiceMonth, setInvoiceMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invoiceAdjustCard, setInvoiceAdjustCard] = useState<Cartao | null>(null);
  const [newInvoiceValue, setNewInvoiceValue] = useState<string>('');

  const handleInvoiceMonthChange = (dir: 'prev' | 'next') => {
    const [year, month] = invoiceMonth.split('-').map(Number);
    let targetMonth = dir === 'prev' ? month - 1 : month + 1;
    let targetYear = year;
    
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    } else if (targetMonth === 13) {
      targetMonth = 1;
      targetYear += 1;
    }
    
    setInvoiceMonth(`${targetYear}-${String(targetMonth).padStart(2, '0')}`);
  };

  const getMonthNamePortuguese = (monthYearStr: string) => {
    const [year, month] = monthYearStr.split('-').map(Number);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[month - 1]} de ${year}`;
  };

  const handleStartEditInvoice = (card: Cartao) => {
    setInvoiceAdjustCard(card);
    const currentValue = getCardInvoiceValue ? getCardInvoiceValue(card.id, invoiceMonth) : 0;
    setNewInvoiceValue(String(currentValue).replace('.', ','));
    setIsInvoiceModalOpen(true);
  };

  const handleConfirmInvoiceAdjust = () => {
    if (!invoiceAdjustCard) return;

    const newValue = parseFloat(newInvoiceValue.replace(',', '.'));
    if (isNaN(newValue) || newValue < 0) {
      window.showToast?.('Por favor, insira um valor de fatura válido.', 'erro');
      return;
    }

    const currentValue = getCardInvoiceValue ? getCardInvoiceValue(invoiceAdjustCard.id, invoiceMonth) : 0;
    const diff = newValue - currentValue;

    if (Math.abs(diff) < 0.01) {
      window.showToast?.('Nenhuma alteração detectada no valor da fatura.', 'info');
      setIsInvoiceModalOpen(false);
      return;
    }

    // Determine the date of the adjusting transaction
    const today = new Date();
    const todayMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let dateStr = `${invoiceMonth}-01`;
    if (invoiceMonth === todayMonthYear) {
      dateStr = `${invoiceMonth}-${String(today.getDate()).padStart(2, '0')}`;
    }

    if (onAddLancamento) {
      onAddLancamento({
        tipo: 'despesa_cartao',
        valor: Math.abs(diff),
        recebidoPagoEfetivado: true,
        estorno: diff < 0,
        data: dateStr,
        descricao: `Ajuste de Fatura: ${invoiceAdjustCard.nome}`,
        cartaoId: invoiceAdjustCard.id,
      });

      window.showToast?.('Valor da fatura ajustado com sucesso!', 'sucesso');
    }

    setIsInvoiceModalOpen(false);
  };

  // Form Fields - Account
  const [contaNome, setContaNome] = useState<string>('');
  const [contaSaldo, setContaSaldo] = useState<string>('');
  const [contaSaldoAtual, setContaSaldoAtual] = useState<string>('');
  const [contaCor, setContaCor] = useState<string>('#1c7ae4');

  // Form Fields - Card
  const [cartaoNome, setCartaoNome] = useState<string>('');
  const [cartaoLimite, setCartaoLimite] = useState<string>('');
  const [cartaoLimiteUtilizado, setCartaoLimiteUtilizado] = useState<string>('');
  const [cartaoDiaFechamento, setCartaoDiaFechamento] = useState<number>(3);
  const [cartaoDiaVencimento, setCartaoDiaVencimento] = useState<number>(10);
  const [cartaoContaVinculada, setCartaoContaVinculada] = useState<string>('');
  const [cartaoCor, setCartaoCor] = useState<string>('#507b84');

  // Custom Color State
  const [customColor, setCustomColor] = useState<string>('#ff00bb');
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);

  // Edit States
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);

  const handleStartEditConta = (c: Conta) => {
    setEditingConta(c);
    setModalTab('conta');
    setContaNome(c.nome);
    setContaSaldo(String(c.saldoInicial).replace('.', ','));
    
    // Set current balance
    const currentBal = getAccountBalance(c.id);
    setContaSaldoAtual(String(currentBal).replace('.', ','));
    
    setContaCor(c.cor);
    const isPreset = PRESET_COLORS.includes(c.cor);
    setUseCustomColor(!isPreset);
    if (!isPreset) {
      setCustomColor(c.cor);
    }
    setIsModalOpen(true);
  };

  const handleStartEditCartao = (card: Cartao) => {
    setEditingCartao(card);
    setModalTab('cartao');
    setCartaoNome(card.nome);
    setCartaoLimite(String(card.limiteTotal).replace('.', ','));
    setCartaoLimiteUtilizado(String(card.limiteUtilizado).replace('.', ','));
    setCartaoDiaFechamento(card.diaFechamento);
    setCartaoDiaVencimento(card.diaVencimento);
    setCartaoContaVinculada(card.contaVinculadaId);
    setCartaoCor(card.cor);
    const isPreset = PRESET_COLORS.includes(card.cor);
    setUseCustomColor(!isPreset);
    if (!isPreset) {
      setCustomColor(card.cor);
    }
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingConta(null);
    setEditingCartao(null);
    setIsModalOpen(true);
    // Set default linked account if available
    if (contas.length > 0) {
      setCartaoContaVinculada(contas[0].id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset inputs
    setContaNome('');
    setContaSaldo('');
    setContaSaldoAtual('');
    setCartaoNome('');
    setCartaoLimite('');
    setCartaoLimiteUtilizado('');
    setEditingConta(null);
    setEditingCartao(null);
    setUseCustomColor(false);
  };

  const handleSave = () => {
    const finalCor = useCustomColor ? customColor : (modalTab === 'conta' ? contaCor : cartaoCor);

    if (modalTab === 'conta') {
      if (!contaNome.trim()) {
        window.showToast?.('Por favor, insira o nome da conta.', 'erro');
        return;
      }
      const saldo = parseFloat(contaSaldo.replace(',', '.'));
      if (isNaN(saldo)) {
        window.showToast?.('Por favor, insira um saldo válido.', 'erro');
        return;
      }

      let saldoAtual: number | undefined = undefined;
      if (editingConta) {
        saldoAtual = parseFloat(contaSaldoAtual.replace(',', '.'));
        if (isNaN(saldoAtual)) {
          window.showToast?.('Por favor, insira um saldo atual válido.', 'erro');
          return;
        }
      }

      if (editingConta) {
        onEditConta(editingConta.id, {
          nome: contaNome.trim(),
          saldoInicial: saldo,
          cor: finalCor
        }, saldoAtual);
      } else {
        onAddConta({
          nome: contaNome.trim(),
          saldoInicial: saldo,
          cor: finalCor
        });
      }
    } else {
      if (!cartaoNome.trim()) {
        window.showToast?.('Por favor, insira o nome do cartão.', 'erro');
        return;
      }
      const limite = parseFloat(cartaoLimite.replace(',', '.'));
      const utilizado = parseFloat(cartaoLimiteUtilizado.replace(',', '.'));
      if (isNaN(limite) || isNaN(utilizado)) {
        window.showToast?.('Por favor, insira valores válidos para os limites.', 'erro');
        return;
      }

      if (editingCartao) {
        onEditCartao(editingCartao.id, {
          nome: cartaoNome.trim(),
          limiteTotal: limite,
          limiteUtilizado: utilizado,
          diaFechamento: cartaoDiaFechamento,
          diaVencimento: cartaoDiaVencimento,
          contaVinculadaId: cartaoContaVinculada,
          cor: finalCor
        });
      } else {
        onAddCartao({
          nome: cartaoNome.trim(),
          limiteTotal: limite,
          limiteUtilizado: utilizado,
          diaFechamento: cartaoDiaFechamento,
          diaVencimento: cartaoDiaVencimento,
          contaVinculadaId: cartaoContaVinculada,
          cor: finalCor
        });
      }
    }

    handleCloseModal();
  };

  const handleDeleteEntity = (id: string, type: 'conta' | 'cartao') => {
    const msg = type === 'conta' 
      ? 'Tem certeza de que deseja excluir esta conta? Lançamentos vinculados à esta conta perderão o vínculo.'
      : 'Tem certeza de que deseja excluir este cartão de crédito?';
    if (window.confirm(msg)) {
      if (type === 'conta') {
        onDeleteConta(id);
      } else {
        onDeleteCartao(id);
      }
    }
  };

  return (
    <div id="contas-cartoes-container" className="w-full flex-1 flex flex-col space-y-6">
      
      {/* 1. Header */}
      <div className="flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Contas e Cartões</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenModal}
            className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-white flex items-center justify-center hover:opacity-90 transition-all cursor-pointer"
            title="Adicionar Conta ou Cartão"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>
          <SyncStatusIcon onClick={onOpenSyncModal} />
        </div>
      </div>

      {/* 2. Grid Section - Contas Bancárias */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider flex items-center gap-1.5">
          <Landmark size={14} />
          <span>Contas Bancárias ({contas.length})</span>
        </h3>

        {contas.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-8 rounded-[24px] text-center text-[var(--text-discreto)] text-sm">
            Nenhuma conta bancária cadastrada. Clique em "+" acima para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contas.map((c) => {
              const currentBal = getAccountBalance(c.id);
              return (
                <div 
                  key={c.id} 
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: c.cor }} />
                  
                  <div className="flex items-start justify-between pr-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-[10px] text-white" style={{ backgroundColor: c.cor + '20', color: c.cor }}>
                        <Landmark size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-general)]">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleStartEditConta(c)}
                        className="text-xs text-[var(--text-discreto)] hover:text-[var(--bg-secondary)] font-semibold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteEntity(c.id, 'conta')}
                        className="text-xs text-[var(--text-discreto)] hover:text-red-500 font-semibold cursor-pointer transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">Saldo Atual</span>
                    <span className="text-2xl font-extrabold text-[var(--text-general)]">
                      {formatCurrency(currentBal)}
                    </span>
                    <span className="text-[10px] text-[var(--text-discreto)] block">
                      Saldo Inicial: {formatCurrency(c.saldoInicial)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Grid Section - Cartões de Crédito */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--bg-tertiary)] pb-2.5">
          <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={14} />
            <span>Cartões de Crédito ({cartoes.length})</span>
          </h3>

          {/* Month Switcher for Credit Card Invoices */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] py-1 px-2.5 rounded-[12px] text-xs self-start sm:self-auto">
            <button
              onClick={() => handleInvoiceMonthChange('prev')}
              className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={14} className="stroke-[2.5]" />
            </button>
            <span className="font-bold text-[var(--text-general)] min-w-[125px] text-center select-none">
              Fatura: {getMonthNamePortuguese(invoiceMonth)}
            </span>
            <button
              onClick={() => handleInvoiceMonthChange('next')}
              className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight size={14} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {cartoes.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-8 rounded-[24px] text-center text-[var(--text-discreto)] text-sm">
            Nenhum cartão cadastrado. Clique em "+" acima para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cartoes.map((card) => {
              const linkedAccount = contas.find(c => c.id === card.contaVinculadaId);
              return (
                <div 
                  key={card.id} 
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: card.cor }} />

                  <div className="flex items-start justify-between pr-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-[10px] text-white" style={{ backgroundColor: card.cor + '20', color: card.cor }}>
                        <CreditCard size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-general)]">{card.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleStartEditCartao(card)}
                        className="text-xs text-[var(--text-discreto)] hover:text-[var(--bg-secondary)] font-semibold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteEntity(card.id, 'cartao')}
                        className="text-xs text-[var(--text-discreto)] hover:text-red-500 font-semibold cursor-pointer transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Limite Total</span>
                      <span className="font-bold text-[var(--text-general)]">{formatCurrency(card.limiteTotal)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Limite Utilizado</span>
                      <span className="font-bold text-[#ed793a]">{formatCurrency(card.limiteUtilizado)}</span>
                    </div>

                    {/* CURRENT MONTH INVOICE ROW */}
                    <div className="col-span-2 pt-2 border-t border-[var(--bg-tertiary)] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">
                          Valor da Fatura ({getMonthNamePortuguese(invoiceMonth)})
                        </span>
                        <span className="font-extrabold text-[var(--text-general)] text-sm">
                          {getCardInvoiceValue ? formatCurrency(getCardInvoiceValue(card.id, invoiceMonth)) : 'R$ 0,00'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleStartEditInvoice(card)}
                        className="flex items-center gap-1.5 py-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 dark:bg-indigo-400/10 rounded-[8px] text-[10px] font-bold cursor-pointer transition-all border border-indigo-500/10"
                        title="Ajustar Fatura"
                      >
                        <Pencil size={11} className="stroke-[2.5]" />
                        <span>Editar Fatura</span>
                      </button>
                    </div>

                    <div className="col-span-2 pt-1.5 border-t border-[var(--bg-tertiary)] flex justify-between text-[10px] text-[var(--text-discreto)] font-semibold">
                      <span>Fechamento: Dia {card.diaFechamento}</span>
                      <span>Vencimento: Dia {card.diaVencimento}</span>
                    </div>
                    <div className="col-span-2 text-[10px] text-[var(--text-discreto)]">
                      Conta Débito: <span className="text-[var(--text-general)] font-bold">{linkedAccount?.nome || 'Não vinculada'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL POPUP FOR ACCOUNTS & CARDS (EXACT SPECIFICATION) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            {/* Top Toggle buttons: Conta vs Cartão */}
            {!editingConta && !editingCartao ? (
              <div className="flex bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-1 text-sm font-medium gap-1">
                <button
                  type="button"
                  onClick={() => setModalTab('conta')}
                  className={`flex-1 py-2 px-3 text-center rounded-[12px] transition-colors ${
                    modalTab === 'conta'
                      ? 'bg-[var(--bg-primary)] text-[var(--text-general)] font-semibold border border-[var(--bg-tertiary)]'
                      : 'text-[var(--text-discreto)]'
                  }`}
                >
                  Nova Conta Bancária
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('cartao')}
                  className={`flex-1 py-2 px-3 text-center rounded-[12px] transition-colors ${
                    modalTab === 'cartao'
                      ? 'bg-[var(--bg-primary)] text-[var(--text-general)] font-semibold border border-[var(--bg-tertiary)]'
                      : 'text-[var(--text-discreto)]'
                  }`}
                >
                  Novo Cartão de Crédito
                </button>
              </div>
            ) : (
              <div className="bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-4 text-center">
                <h3 className="text-sm font-extrabold text-[var(--text-general)]">
                  {editingConta ? 'Editar Conta Bancária' : 'Editar Cartão de Crédito'}
                </h3>
              </div>
            )}

            {/* Modal Form Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {modalTab === 'conta' ? (
                <>
                  {/* Account Name */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DA CONTA</span>
                    <input
                      type="text"
                      placeholder="Ex: Banco Bradesco, Carteira, Dinheiro"
                      value={contaNome}
                      onChange={(e) => setContaNome(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    />
                  </div>

                  {/* Saldo Inicial */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">SALDO INICIAL (R$)</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={contaSaldo}
                      onChange={(e) => setContaSaldo(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                    />
                  </div>

                  {/* Saldo Atual (Ajustável) */}
                  {editingConta && (
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">SALDO ATUAL (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={contaSaldoAtual}
                        onChange={(e) => setContaSaldoAtual(e.target.value)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                      />
                      <span className="text-[10px] text-[var(--text-discreto)] mt-1.5 block leading-relaxed">
                        Ao alterar o Saldo Atual, o sistema ajustará automaticamente o saldo na dashboard, gerando um lançamento de ajuste se necessário.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Card Name */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DO CARTÃO</span>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Visa Infinite"
                      value={cartaoNome}
                      onChange={(e) => setCartaoNome(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Limite Total */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">LIMITE TOTAL (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={cartaoLimite}
                        onChange={(e) => setCartaoLimite(e.target.value)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                      />
                    </div>

                    {/* Limite Utilizado */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">LIMITE UTILIZADO (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={cartaoLimiteUtilizado}
                        onChange={(e) => setCartaoLimiteUtilizado(e.target.value)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Dia Fechamento */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">DIA DE FECHAMENTO</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={cartaoDiaFechamento}
                        onChange={(e) => setCartaoDiaFechamento(parseInt(e.target.value) || 1)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>

                    {/* Dia Vencimento */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">DIA DE VENCIMENTO</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={cartaoDiaVencimento}
                        onChange={(e) => setCartaoDiaVencimento(parseInt(e.target.value) || 1)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Conta Vinculada */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">CONTA VINCULADA</span>
                    <select
                      value={cartaoContaVinculada}
                      onChange={(e) => setCartaoContaVinculada(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    >
                      <option value="">Sem conta vinculada</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Color Selection with preset palette & custom picker Represented by brush */}
              <div className="space-y-2 border-t border-[var(--bg-tertiary)] pt-3">
                <span className="text-xs font-semibold text-[var(--text-discreto)] block">ESCOLHA UMA COR</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  {!useCustomColor && PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (modalTab === 'conta') setContaCor(c);
                        else setCartaoCor(c);
                      }}
                      className="w-8 h-8 rounded-full border border-[var(--bg-tertiary)] flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {((modalTab === 'conta' && contaCor === c) || (modalTab === 'cartao' && cartaoCor === c)) && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>
                  ))}

                  {/* Brush icon representing Custom Color Selection */}
                  <button
                    type="button"
                    onClick={() => setUseCustomColor(!useCustomColor)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      useCustomColor 
                        ? 'border-[var(--text-general)] text-[var(--text-general)] bg-[var(--bg-tertiary)]' 
                        : 'border-[var(--bg-tertiary)] text-[var(--text-discreto)] bg-transparent'
                    }`}
                    title="Cor Personalizada"
                  >
                    <Paintbrush size={16} />
                  </button>

                  {useCustomColor && (
                    <div className="flex items-center gap-2 ml-1 bg-[var(--bg-app)] py-1 px-2.5 rounded-[12px] border border-[var(--bg-tertiary)]">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-6 h-6 rounded-md bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-[10px] font-bold font-mono text-[var(--text-general)] uppercase">
                        {customColor}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-sm text-[var(--text-general)] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 rounded-[16px] text-sm font-semibold flex items-center justify-center gap-1"
              >
                <Check size={16} /> Confirmar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INVOICE ADJUSTMENT MODAL */}
      {isInvoiceModalOpen && invoiceAdjustCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-4 text-center flex justify-between items-center px-6">
              <span className="w-6" /> {/* Spacer */}
              <h3 className="text-sm font-extrabold text-[var(--text-general)]">
                Ajustar Fatura do Cartão
              </h3>
              <button 
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-discreto)] hover:text-[var(--text-general)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] text-center">
                <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase block">Cartão Selecionado</span>
                <span className="text-sm font-bold text-[var(--text-general)] block mt-0.5" style={{ color: invoiceAdjustCard.cor }}>
                  {invoiceAdjustCard.nome}
                </span>
                <span className="text-[10px] text-[var(--text-discreto)] mt-1.5 block">
                  Período do Ajuste: <strong>{getMonthNamePortuguese(invoiceMonth)}</strong>
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOVO VALOR DA FATURA (R$)</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={newInvoiceValue}
                  onChange={(e) => setNewInvoiceValue(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden focus:border-[var(--bg-secondary)]"
                />
                <span className="text-[10px] text-[var(--text-discreto)] mt-2 block leading-relaxed">
                  Ao confirmar, o sistema calculará a diferença entre o valor atual da fatura e o novo valor inserido, gerando automaticamente um lançamento de ajuste do tipo <strong>despesa de cartão</strong> no período.
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="flex-1 py-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-sm text-[var(--text-general)] font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmInvoiceAdjust}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-[16px] text-sm font-semibold flex items-center justify-center gap-1 transition-all shadow-md"
              >
                <Check size={16} /> Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
