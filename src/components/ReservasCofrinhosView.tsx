import React, { useState } from 'react';
import { Conta, Cofrinho, CofrinhoHistorico, Lancamento } from '../types';
import { 
  Plus, 
  PiggyBank, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Calendar, 
  Check, 
  X, 
  ChevronRight, 
  Paintbrush,
  Trash2,
  TrendingUp as YieldIcon,
  Pencil
} from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';

interface ReservasCofrinhosViewProps {
  cofrinhos: Cofrinho[];
  cofrinhoHistorico: CofrinhoHistorico[];
  contas: Conta[];
  lancamentos: Lancamento[];
  onAddCofrinho: (c: Omit<Cofrinho, 'id'> & { valorInicial: number }) => void;
  onUpdateCofrinho: (c: Cofrinho) => void;
  onAddCofrinhoHistorico: (h: Omit<CofrinhoHistorico, 'id'>) => void;
  onDeleteCofrinhoHistorico: (id: string) => void;
  onDeleteCofrinho: (id: string) => void;
  onDeleteLancamento: (id: string, mode: 'este' | 'futuros' | 'todos') => void;
  onOpenMenu?: () => void;
  onOpenSyncModal: () => void;
  getAccountBalance: (id: string) => number;
  onAddLancamento: (l: Omit<Lancamento, 'id'>) => void;
}

const PRESET_COLORS = [
  '#00cc52', // Green
  '#1c7ae4', // Blue
  '#ed793a', // Orange
  '#d03c4d', // Red
  '#507b84', // Slate Green
  '#8e44ad', // Purple
];

import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';

export function ReservasCofrinhosView({
  cofrinhos,
  cofrinhoHistorico,
  contas,
  lancamentos,
  onAddCofrinho,
  onUpdateCofrinho,
  onAddCofrinhoHistorico,
  onDeleteCofrinhoHistorico,
  onDeleteCofrinho,
  onDeleteLancamento,
  onOpenMenu,
  onOpenSyncModal,
  getAccountBalance,
  onAddLancamento
}: ReservasCofrinhosViewProps) {
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [activeCofrinho, setActiveCofrinho] = useState<Cofrinho | null>(null);
  
  // Sincronizar cofrinho ativo com os dados mais recentes de saldo recalculado
  const currentActiveCofrinho = activeCofrinho
    ? cofrinhos.find(c => c.id === activeCofrinho.id) || activeCofrinho
    : null;

  // Edit Cofrinho & Valor Atual Form
  const [editingCofrinho, setEditingCofrinho] = useState<Cofrinho | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editSaldoAtual, setEditSaldoAtual] = useState<string>('');
  const [editMeta, setEditMeta] = useState<string>('');
  const [editCor, setEditCor] = useState<string>('#00cc52');
  const [editUseCustomColor, setEditUseCustomColor] = useState<boolean>(false);
  const [editCustomColor, setEditCustomColor] = useState<string>('#9b59b6');
  
  // Create Cofrinho Form
  const [newName, setNewName] = useState<string>('');
  const [newMeta, setNewMeta] = useState<string>('');
  const [newValorInicial, setNewValorInicial] = useState<string>('');
  const [newCor, setNewCor] = useState<string>('#00cc52');
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>('#9b59b6');

  // Interactive Operations Menu states
  const [operationTab, setOperationTab] = useState<'deposito' | 'retirada' | 'rendimento'>('deposito');
  const [showHistoryOverlay, setShowHistoryOverlay] = useState<boolean>(false);

  // Operation Inputs
  const [opValor, setOpValor] = useState<string>('');
  const [opDataSelection, setOpDataSelection] = useState<'hoje' | 'ontem' | 'personalizado'>('hoje');
  const [opCustomData, setOpCustomData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [opContaId, setOpContaId] = useState<string>('');
  const [opMotivo, setOpMotivo] = useState<string>('');

  // Deposito: Recorrência e Parcelamento
  const [opFixoRecorrente, setOpFixoRecorrente] = useState<boolean>(false);
  const [opParcelado, setOpParcelado] = useState<boolean>(false);
  const [opNumParcelas, setOpNumParcelas] = useState<number | string>(2);
  const [opIsValorParcela, setOpIsValorParcela] = useState<boolean>(false);

  // Modais de confirmação de exclusão
  interface CofrinhoAutomation {
    key: string;
    grupoId?: string;
    firstId: string;
    firstFutureId?: string;
    tipoLabel: string;
    isFixo: boolean;
    isParcelado: boolean;
    valorMensal: number;
    totalParcelas?: number;
    contaId?: string;
    contaNome: string;
    diaMes: string;
    progresso?: string;
    totalItems: number;
    futureItemsCount: number;
  }
  const [automationToDelete, setAutomationToDelete] = useState<CofrinhoAutomation | null>(null);
  const [historyItemToDelete, setHistoryItemToDelete] = useState<CofrinhoHistorico | null>(null);
  
  // Rendimento Fields
  const [rendimentoSubMode, setRendimentoSubMode] = useState<'adicionar' | 'atualizar'>('adicionar');
  const [opPeriodo, setOpPeriodo] = useState<string>('30 dias');
  const [opPeriodoCustom, setOpPeriodoCustom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customPeriodMode, setCustomPeriodMode] = useState<boolean>(false);

  // Derive automations for active cofrinho
  const cofrinhoAutomations: CofrinhoAutomation[] = React.useMemo(() => {
    if (!activeCofrinho || !lancamentos) return [];

    const matched = lancamentos.filter((l) => {
      const belongsToCofrinho =
        l.cofrinhoId === activeCofrinho.id ||
        ((l.tipo === 'deposito_cofrinho' || l.tipo === 'transferencia') &&
          l.descricao.toLowerCase().includes(activeCofrinho.nome.toLowerCase()));
      const isAuto = l.fixoRecorrente || l.parcelado || !!l.grupoId;
      return belongsToCofrinho && isAuto;
    });

    const groups: { [key: string]: Lancamento[] } = {};
    matched.forEach((l) => {
      const gKey = l.grupoId || l.id;
      if (!groups[gKey]) {
        groups[gKey] = [];
      }
      groups[gKey].push(l);
    });

    const automations: CofrinhoAutomation[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    Object.keys(groups).forEach((key) => {
      const items = groups[key].sort((a, b) => a.data.localeCompare(b.data));
      if (items.length === 0) return;

      const firstItem = items[0];
      const isFixo = !!(firstItem.fixoRecorrente || items.some((i) => i.fixoRecorrente));
      const isParcelado = !!(firstItem.parcelado || items.some((i) => i.parcelado));
      
      const futureItems = items.filter((i) => i.data >= todayStr && !i.recebidoPagoEfetivado);
      const paidItems = items.filter((i) => i.recebidoPagoEfetivado);

      const conta = contas.find((c) => c.id === firstItem.contaId);
      const contaNome = firstItem.contaId === 'externa' || !firstItem.contaId ? 'Origem Externa' : (conta?.nome || 'Conta');
      const diaMes = firstItem.data.split('-')[2] || '01';

      let tipoLabel = 'Transferência Automática';
      if (isFixo) {
        tipoLabel = 'Fixo / Recorrente';
      } else if (isParcelado) {
        tipoLabel = `Parcelado (${items.length}x)`;
      }

      automations.push({
        key,
        grupoId: firstItem.grupoId,
        firstId: firstItem.id,
        firstFutureId: futureItems[0]?.id || firstItem.id,
        tipoLabel,
        isFixo,
        isParcelado,
        valorMensal: firstItem.valor,
        totalParcelas: isParcelado ? items.length : undefined,
        contaId: firstItem.contaId,
        contaNome,
        diaMes,
        progresso: isParcelado ? `${paidItems.length}/${items.length} pagas` : undefined,
        totalItems: items.length,
        futureItemsCount: futureItems.length
      });
    });

    return automations;
  }, [activeCofrinho, lancamentos, contas]);

  // Setup account selection on launch
  React.useEffect(() => {
    if (!opContaId) {
      setOpContaId('externa');
    }
  }, [contas]);

  const handleOpenOperations = (cof: Cofrinho) => {
    setActiveCofrinho(cof);
    setOperationTab('deposito');
    setOpValor('');
    setOpMotivo('');
    setOpContaId('externa');
    setOpFixoRecorrente(false);
    setOpParcelado(false);
    setOpNumParcelas(2);
    setOpIsValorParcela(false);
    setShowHistoryOverlay(false);
    setAutomationToDelete(null);
    setHistoryItemToDelete(null);
  };

  const handleOpenEdit = (c: Cofrinho) => {
    setEditingCofrinho(c);
    setEditNome(c.nome);
    setEditSaldoAtual(formatCurrencyInput(c.saldoAtual.toFixed(2)));
    setEditMeta(c.meta !== undefined && c.meta > 0 ? formatCurrencyInput(c.meta.toFixed(2)) : '');
    setEditCor(c.cor);
    if (!PRESET_COLORS.includes(c.cor)) {
      setEditUseCustomColor(true);
      setEditCustomColor(c.cor);
    } else {
      setEditUseCustomColor(false);
      setEditCustomColor('#9b59b6');
    }
  };

  const handleSaveEdit = () => {
    if (!editingCofrinho) return;
    if (!editNome.trim()) {
      window.showToast?.('Por favor, informe o nome do cofrinho.', 'erro');
      return;
    }
    const newSaldo = parseCurrencyInput(editSaldoAtual);
    if (isNaN(newSaldo) || newSaldo < 0) {
      window.showToast?.('Por favor, informe um valor atual válido.', 'erro');
      return;
    }
    const metaNum = editMeta.trim() ? parseCurrencyInput(editMeta) : undefined;
    const finalCor = editUseCustomColor ? editCustomColor : editCor;

    const currentSaldo = editingCofrinho.saldoAtual;
    const difference = Number((newSaldo - currentSaldo).toFixed(2));

    const updated: Cofrinho = {
      ...editingCofrinho,
      nome: editNome.trim(),
      saldoAtual: newSaldo,
      meta: metaNum,
      cor: finalCor
    };

    onUpdateCofrinho(updated);

    // If balance changed, log adjustment in history
    if (difference !== 0) {
      onAddCofrinhoHistorico({
        cofrinhoId: editingCofrinho.id,
        tipo: 'rendimento_atualizar',
        valor: difference,
        data: new Date().toISOString().split('T')[0],
        motivo: difference > 0 ? 'Ajuste manual de saldo (acréscimo)' : 'Ajuste manual de saldo (redução)'
      });
    }

    window.showToast?.('Reserva e valor atual atualizados com sucesso!', 'sucesso');
    setEditingCofrinho(null);

    if (activeCofrinho && activeCofrinho.id === editingCofrinho.id) {
      setActiveCofrinho(updated);
    }
  };

  const handleCreateCofrinho = () => {
    if (!newName.trim()) {
      window.showToast?.('Por favor, preencha o nome do cofrinho.', 'erro');
      return;
    }
    const valInicial = parseCurrencyInput(newValorInicial);
    if (isNaN(valInicial) || valInicial < 0) {
      window.showToast?.('Por favor, preencha o valor inicial corretamente.', 'erro');
      return;
    }
    const metaNum = newMeta.trim() ? parseCurrencyInput(newMeta) : undefined;

    const finalCor = useCustomColor ? customColor : newCor;

    onAddCofrinho({
      nome: newName.trim(),
      saldoAtual: valInicial,
      meta: metaNum,
      cor: finalCor,
      valorInicial: valInicial
    });

    // Reset fields
    setNewName('');
    setNewMeta('');
    setNewValorInicial('');
    setIsAddOpen(false);
  };

  const getFinalOpDate = () => {
    const today = new Date();
    if (opDataSelection === 'hoje') {
      return today.toISOString().split('T')[0];
    } else if (opDataSelection === 'ontem') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    return opCustomData;
  };

  const handleConfirmOperation = () => {
    const targetCof = currentActiveCofrinho || activeCofrinho;
    if (!targetCof) return;

    const val = parseCurrencyInput(opValor);
    if (isNaN(val) || val <= 0) {
      window.showToast?.('Por favor, insira um valor válido.', 'erro');
      return;
    }

    const opDate = getFinalOpDate();

    if (operationTab === 'deposito') {
      if (!opContaId) {
        window.showToast?.('Por favor, selecione a conta de origem.', 'erro');
        return;
      }

      const numP = typeof opNumParcelas === 'string' ? parseInt(opNumParcelas) : opNumParcelas;
      if (opParcelado && (!numP || isNaN(numP) || numP < 2)) {
        window.showToast?.('Por favor, informe pelo menos 2 parcelas.', 'erro');
        return;
      }

      // Calculate first occurrence value to add to cofrinho balance right now
      const firstOccurrenceVal = (opParcelado && !opIsValorParcela && numP) 
        ? Number((val / numP).toFixed(2)) 
        : val;

      const isEfetivado = !(opFixoRecorrente || opParcelado);

      if (isEfetivado) {
        // Add to cofrinho balance immediately only if it's effectively paid right now
        const updatedCofrinho = {
          ...targetCof,
          saldoAtual: targetCof.saldoAtual + firstOccurrenceVal
        };
        onUpdateCofrinho(updatedCofrinho);

        // Create cofrinho history log
        let motivoLog: string | undefined = undefined;
        onAddCofrinhoHistorico({
          cofrinhoId: targetCof.id,
          tipo: 'deposito',
          valor: firstOccurrenceVal,
          data: opDate,
          contaId: opContaId === 'externa' ? undefined : opContaId,
          motivo: motivoLog
        });
      }

      // Create actual transaction (which generates monthly entries if fixo/parcelado)
      onAddLancamento({
        tipo: 'deposito_cofrinho',
        valor: val,
        recebidoPagoEfetivado: isEfetivado,
        data: opDate,
        descricao: `Reserva: ${targetCof.nome}`,
        contaId: opContaId === 'externa' ? undefined : opContaId,
        cofrinhoId: targetCof.id,
        fixoRecorrente: opFixoRecorrente,
        parcelado: opParcelado,
        numParcelas: opParcelado && numP ? numP : undefined,
        isValorParcela: opParcelado ? opIsValorParcela : undefined
      });

      if (opFixoRecorrente) {
        window.showToast?.('Depósito fixo recorrente cadastrado com sucesso!', 'sucesso');
      } else if (opParcelado && numP) {
        window.showToast?.(`Depósito parcelado em ${numP}x cadastrado com sucesso!`, 'sucesso');
      } else {
        window.showToast?.('Depósito realizado com sucesso!', 'sucesso');
      }

    } else if (operationTab === 'retirada') {
      if (val > targetCof.saldoAtual) {
        window.showToast?.('Valor de retirada maior do que o saldo atual do cofrinho.', 'erro');
        return;
      }
      if (!opContaId) {
        window.showToast?.('Por favor, selecione a conta de destino.', 'erro');
        return;
      }

      // Subtract from cofrinho balance
      const updatedCofrinho = {
        ...targetCof,
        saldoAtual: targetCof.saldoAtual - val
      };
      onUpdateCofrinho(updatedCofrinho);

      // Create history log
      onAddCofrinhoHistorico({
        cofrinhoId: targetCof.id,
        tipo: 'retirada',
        valor: val,
        data: opDate,
        contaId: opContaId,
        motivo: opMotivo.trim() || 'Retirada padrão'
      });

      // Create actual transaction (blue color, positive impact, included in calculations)
      onAddLancamento({
        tipo: 'retirada_cofrinho',
        valor: val,
        recebidoPagoEfetivado: true,
        data: opDate,
        descricao: `Retirada: ${targetCof.nome}`,
        contaId: opContaId,
        cofrinhoId: targetCof.id
      });

    } else if (operationTab === 'rendimento') {
      if (rendimentoSubMode === 'adicionar') {
        const pStr = customPeriodMode ? opPeriodoCustom : opPeriodo;
        
        // Add yield
        const updatedCofrinho = {
          ...targetCof,
          saldoAtual: targetCof.saldoAtual + val
        };
        onUpdateCofrinho(updatedCofrinho);

        onAddCofrinhoHistorico({
          cofrinhoId: targetCof.id,
          tipo: 'rendimento_adicionar',
          valor: val,
          data: opDate,
          periodo: pStr
        });

      } else {
        // "Atualizar" - replaces the current value with the entered value
        const difference = Number((val - targetCof.saldoAtual).toFixed(2));

        const updatedCofrinho = {
          ...targetCof,
          saldoAtual: val
        };
        onUpdateCofrinho(updatedCofrinho);

        if (difference !== 0) {
          onAddCofrinhoHistorico({
            cofrinhoId: targetCof.id,
            tipo: 'rendimento_atualizar',
            valor: difference, // stores the difference as yield value
            data: opDate,
            motivo: difference > 0 ? 'Ajuste de rendimento (acréscimo)' : 'Ajuste de rendimento (redução)'
          });
        }
      }
    }

    setActiveCofrinho(null); // close modal
  };

  const handleDeleteCofrinhoObj = (id: string) => {
    if (window.confirm('Tem certeza de que deseja apagar este cofrinho? Seu saldo reservado será zerado.')) {
      onDeleteCofrinho(id);
      setActiveCofrinho(null);
    }
  };

  // Filter history for the active cofrinho
  const currentHistory = currentActiveCofrinho 
    ? cofrinhoHistorico.filter(h => h.cofrinhoId === currentActiveCofrinho.id).sort((a,b) => b.data.localeCompare(a.data))
    : [];

  return (
    <div id="reservas-cofrinhos-container" className="w-full flex-1 flex flex-col space-y-6">
      
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
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Reservas e Cofrinhos</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-white flex items-center justify-center hover:opacity-90 transition-all cursor-pointer"
            title="Nova Reserva / Cofrinho"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>
          <SyncStatusIcon onClick={onOpenSyncModal} />
        </div>
      </div>

      {/* 2. Cofrinhos Grid */}
      {cofrinhos.length === 0 ? (
        <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-12 rounded-[24px] text-center text-[var(--text-discreto)] text-sm">
          Nenhum cofrinho ou reserva criado. Clique no botão "+" no topo direito para criar seu primeiro!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cofrinhos.map((c) => {
            const hasMeta = c.meta !== undefined && c.meta > 0;
            const progressPercent = hasMeta ? Math.min(100, Math.max(0, (c.saldoAtual / (c.meta || 1)) * 100)) : 0;
            
            return (
              <div
                key={c.id}
                onClick={() => handleOpenOperations(c)}
                className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] flex flex-col justify-between min-h-[150px] relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
              >
                {/* Visual Accent bar on the side */}
                <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: c.cor }} />

                <div className="pl-2 space-y-3">
                  {/* Top line: Name and Icon */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-[10px]" style={{ backgroundColor: c.cor + '20', color: c.cor }}>
                        <PiggyBank size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-general)]">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ChevronRight size={16} className="text-[var(--text-discreto)]" />
                    </div>
                  </div>

                  {/* Balance / Values */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">Saldo Reservado</span>
                      <span className="text-2xl font-extrabold text-[#00cc52] tracking-tight">
                        R$ {formatCurrency(c.saldoAtual)}
                      </span>
                      {hasMeta && (
                        <span className="text-[10px] text-[var(--text-discreto)] block">
                          Meta: R$ {c.meta ? formatCurrency(c.meta) : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasMeta && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-[var(--text-discreto)]">
                        <span>Progresso</span>
                        <span>{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bg-app)] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ width: `${progressPercent}%`, backgroundColor: c.cor }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP MODAL: OPERATIONS ON SELECTED COFRINHO (EXACT SPECIFICATION) */}
      {activeCofrinho && currentActiveCofrinho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            {/* Header: Cofrinho Title & Close */}
            <div className="p-5 bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentActiveCofrinho.cor }} />
                <h3 className="text-base font-extrabold text-[var(--text-general)]">
                  {currentActiveCofrinho.nome}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentActiveCofrinho)}
                  className="p-1.5 rounded-full text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
                  title="Editar valor atual e detalhes da reserva"
                >
                  <Pencil size={17} />
                </button>
                <button 
                  onClick={() => setActiveCofrinho(null)}
                  className="p-1.5 rounded-full text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Current Balance Summary Card & Direct Edit Button */}
            <div className="p-3.5 mx-5 mt-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[18px] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">Saldo Atual Reservado</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-[#00cc52] tracking-tight">
                    R$ {formatCurrency(currentActiveCofrinho.saldoAtual)}
                  </span>
                  {currentActiveCofrinho.meta !== undefined && currentActiveCofrinho.meta > 0 && (
                    <span className="text-[11px] text-[var(--text-discreto)]">
                      / Meta: R$ {formatCurrency(currentActiveCofrinho.meta)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(currentActiveCofrinho)}
                className="px-3 py-1.5 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] hover:border-[var(--text-general)] text-xs font-bold text-[var(--text-general)] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Editar valor atual"
              >
                <Pencil size={13} />
                <span>Editar Valor</span>
              </button>
            </div>

            {/* TOP BAR: ALIGNED BUTTONS Depósito, Retirada, Rendimento */}
            <div className="p-2 bg-[var(--bg-primary)] border-b border-[var(--bg-tertiary)] flex gap-1">
              {/* Depósito */}
              <button
                onClick={() => {
                  setOperationTab('deposito');
                  setOpValor('');
                  setOpContaId('externa');
                  setShowHistoryOverlay(false);
                }}
                className={`flex-1 py-2 px-1 text-center font-bold text-xs rounded-[12px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  operationTab === 'deposito' && !showHistoryOverlay
                    ? 'bg-[#00cc52] text-white'
                    : 'text-[#00cc52] bg-[#00cc52]/10 hover:bg-[#00cc52]/20'
                }`}
              >
                <ArrowUpRight size={14} className="stroke-[2.5]" />
                <span>Depósito (+)</span>
              </button>

              {/* Retirada */}
              <button
                onClick={() => {
                  setOperationTab('retirada');
                  setOpValor('');
                  if (opContaId === 'externa' && contas.length > 0) {
                    setOpContaId(contas[0].id);
                  }
                  setShowHistoryOverlay(false);
                }}
                className={`flex-1 py-2 px-1 text-center font-bold text-xs rounded-[12px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  operationTab === 'retirada' && !showHistoryOverlay
                    ? 'bg-[#d03c4d] text-white'
                    : 'text-[#d03c4d] bg-[#d03c4d]/10 hover:bg-[#d03c4d]/20'
                }`}
              >
                <ArrowDownLeft size={14} className="stroke-[2.5]" />
                <span>Retirada (-)</span>
              </button>

              {/* Rendimento */}
              <button
                onClick={() => {
                  setOperationTab('rendimento');
                  setOpValor('');
                  setShowHistoryOverlay(false);
                }}
                className={`flex-1 py-2 px-1 text-center font-bold text-xs rounded-[12px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  operationTab === 'rendimento' && !showHistoryOverlay
                    ? 'bg-[#1c7ae4] text-white'
                    : 'text-[#1c7ae4] bg-[#1c7ae4]/10 hover:bg-[#1c7ae4]/20'
                }`}
              >
                <YieldIcon size={14} className="stroke-[2.5]" />
                <span>Rendimento</span>
              </button>
            </div>

            {/* MAIN CENTRAL SECTION: CONTENT SWITCH */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {showHistoryOverlay ? (
                /* HISTORY LIST OVERLAY */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider">Histórico de Operações</span>
                    <button 
                      onClick={() => setShowHistoryOverlay(false)}
                      className="text-xs text-[var(--bg-secondary)] font-bold cursor-pointer"
                    >
                      Voltar ao Form
                    </button>
                  </div>

                  {currentHistory.length === 0 ? (
                    <p className="text-xs text-[var(--text-discreto)] text-center py-6">Nenhum histórico registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {currentHistory.map((h) => {
                        const isAjuste = h.tipo === 'rendimento_atualizar' || (h.motivo && h.motivo.toLowerCase().includes('ajuste'));
                        let title = 'Rendimento';
                        let iconColor = 'text-[var(--text-general)]';
                        let prefix = '';

                        if (h.tipo === 'deposito') {
                          title = 'Depósito';
                          iconColor = 'text-[#00cc52]';
                          prefix = '+';
                        } else if (h.tipo === 'retirada') {
                          title = 'Retirada';
                          iconColor = 'text-[#d03c4d]';
                          prefix = '-';
                        } else if (isAjuste) {
                          title = 'Ajuste de Saldo';
                          if (h.valor < 0) {
                            iconColor = 'text-[#d03c4d]';
                            prefix = '-';
                          } else {
                            iconColor = 'text-[#00cc52]';
                            prefix = '+';
                          }
                        } else {
                          title = 'Rendimento';
                          iconColor = h.valor < 0 ? 'text-[#d03c4d]' : 'text-[#1c7ae4]';
                          prefix = h.valor < 0 ? '-' : '+';
                        }

                        const detail = h.tipo === 'deposito' 
                          ? (h.contaId ? `De: ${contas.find(c => c.id === h.contaId)?.nome || 'Conta'}` : 'De: Origem Externa')
                          : h.tipo === 'retirada'
                            ? `Para: ${contas.find(c => c.id === h.contaId)?.nome || 'Conta'} (${h.motivo || ''})`
                            : isAjuste
                              ? (h.motivo || 'Ajuste manual de valor atual')
                              : `Rendimento (${h.periodo || 'Acréscimo'})`;

                        return (
                          <div key={h.id} className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-[var(--text-general)]">
                                {title}
                              </p>
                              <p className="text-[10px] text-[var(--text-discreto)]">{detail}</p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="text-right">
                                <span className={`font-extrabold ${iconColor}`}>
                                  {prefix} R$ {formatCurrency(Math.abs(h.valor))}
                                </span>
                                <p className="text-[9px] text-[var(--text-discreto)]">{h.data.split('-').reverse().join('/')}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setHistoryItemToDelete(h)}
                                className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-[8px] transition-colors cursor-pointer shrink-0"
                                title="Excluir este item do histórico"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* FIELDS FOR THE ACTIVE TAB FORM */
                <>
                  {/* Tab Depósito Fields */}
                  {operationTab === 'deposito' && (
                    <div className="space-y-4">
                      {/* Valor */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR DO DEPÓSITO</span>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={opValor}
                          onChange={(e) => setOpValor(formatCurrencyInput(e.target.value))}
                          className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                        />
                      </div>

                      {/* Data Selector */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1.5">DATA</span>
                        <div className="flex gap-2 text-xs">
                          {(['hoje', 'ontem', 'personalizado'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setOpDataSelection(opt)}
                              className={`flex-1 py-2 rounded-[10px] border text-center font-bold transition-all ${
                                opDataSelection === opt
                                  ? 'bg-[var(--bg-secondary)] border-[var(--bg-secondary)] text-white'
                                  : 'bg-transparent border-[var(--bg-tertiary)] text-[var(--text-discreto)]'
                              }`}
                            >
                              {opt === 'hoje' && 'Hoje'}
                              {opt === 'ontem' && 'Ontem'}
                              {opt === 'personalizado' && 'Outro'}
                            </button>
                          ))}
                        </div>
                        {opDataSelection === 'personalizado' && (
                          <input
                            type="date"
                            value={opCustomData}
                            onChange={(e) => setOpCustomData(e.target.value)}
                            className="w-full mt-2 py-2 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[10px] text-xs text-[var(--text-general)] focus:outline-hidden"
                          />
                        )}
                      </div>

                      {/* Da Conta */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">SAIR DA CONTA (ORIGEM)</span>
                        <select
                          value={opContaId}
                          onChange={(e) => setOpContaId(e.target.value)}
                          className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-xs text-[var(--text-general)] focus:outline-hidden"
                        >
                          <option value="externa">Origem Externa</option>
                          {contas.map((c) => {
                            const balance = getAccountBalance(c.id);
                            return (
                              <option key={c.id} value={c.id}>
                                {c.nome} (Saldo: R$ {formatCurrency(balance)})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* TRANSFERÊNCIAS AUTOMÁTICAS CADASTRADAS */}
                      <div className="space-y-2 pt-2 border-t border-[var(--bg-tertiary)]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-discreto)] uppercase tracking-wider block">
                            Transferências Automáticas Cadastradas
                          </span>
                          {cofrinhoAutomations.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
                              {cofrinhoAutomations.length} {cofrinhoAutomations.length === 1 ? 'ativa' : 'ativas'}
                            </span>
                          )}
                        </div>

                        {cofrinhoAutomations.length === 0 ? (
                          <div className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-center">
                            <p className="text-[11px] text-[var(--text-discreto)]">
                              Nenhuma transferência automática cadastrada para este cofrinho.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {cofrinhoAutomations.map((auto) => (
                              <div
                                key={auto.key}
                                className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] flex items-center justify-between gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-[var(--text-general)]">
                                      R$ {formatCurrency(auto.valorMensal)}{' '}
                                      <span className="text-[10px] font-normal text-[var(--text-discreto)]">/mês</span>
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)] uppercase tracking-wider">
                                      {auto.tipoLabel}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-discreto)] flex-wrap">
                                    <span className="font-semibold text-[var(--text-general)]">{auto.contaNome}</span>
                                    <span>•</span>
                                    <span>Todo dia {auto.diaMes}</span>
                                    {auto.progresso && (
                                      <>
                                        <span>•</span>
                                        <span className="text-[#00cc52] font-semibold">{auto.progresso}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setAutomationToDelete(auto)}
                                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-[10px] transition-colors cursor-pointer shrink-0"
                                  title="Excluir transferência automática"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* CONFIGURAÇÃO DE RECORRÊNCIA / PARCELAMENTO DO DEPÓSITO */}
                      <div className="border-t border-[var(--bg-tertiary)] pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-general)] block">Fixo / Recorrente</span>
                            <span className="text-[11px] text-[var(--text-discreto)]">Repetir depósito todos os meses nos lançamentos</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !opFixoRecorrente;
                              setOpFixoRecorrente(next);
                              if (next) setOpParcelado(false);
                            }}
                            className={`toggle-switch rounded-full transition-colors ${
                              opFixoRecorrente ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span
                              className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                                opFixoRecorrente ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-general)] block">Depósito Parcelado</span>
                            <span className="text-[11px] text-[var(--text-discreto)]">Programar depósito mensal por número fixo de parcelas</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !opParcelado;
                              setOpParcelado(next);
                              if (next) setOpFixoRecorrente(false);
                            }}
                            className={`toggle-switch rounded-full transition-colors ${
                              opParcelado ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span
                              className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                                opParcelado ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {opParcelado && (
                          <div className="flex flex-col gap-3 bg-[var(--bg-app)] p-3 rounded-[16px] border border-[var(--bg-tertiary)]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-[var(--text-discreto)] uppercase">Número de Parcelas:</span>
                              <input
                                type="number"
                                min="2"
                                max="120"
                                value={opNumParcelas}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setOpNumParcelas(v === '' ? '' : parseInt(v));
                                }}
                                className="w-16 text-center bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[8px] py-1 text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-[var(--text-discreto)] uppercase">Valor informado é da parcela?</span>
                              <button
                                type="button"
                                onClick={() => setOpIsValorParcela(!opIsValorParcela)}
                                className={`toggle-switch rounded-full transition-colors ${
                                  opIsValorParcela ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                                }`}
                              >
                                <span
                                  className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                                    opIsValorParcela ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {(() => {
                              const valNum = parseCurrencyInput(opValor);
                              const pNum = typeof opNumParcelas === 'string' ? parseInt(opNumParcelas) : opNumParcelas;
                              if (!isNaN(valNum) && valNum > 0 && pNum && pNum >= 2) {
                                const monthlyVal = opIsValorParcela ? valNum : valNum / pNum;
                                const totalVal = opIsValorParcela ? valNum * pNum : valNum;
                                return (
                                  <div className="p-2.5 bg-[var(--bg-primary)] rounded-[10px] text-[11px] text-[var(--text-discreto)]">
                                    Serão criadas <span className="font-bold text-[var(--text-general)]">{pNum} transferências mensais</span> de <span className="font-bold text-[#00cc52]">R$ {formatCurrency(monthlyVal)}</span> (Total: R$ {formatCurrency(totalVal)}).
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {opFixoRecorrente && (() => {
                          const valNum = parseCurrencyInput(opValor);
                          if (!isNaN(valNum) && valNum > 0) {
                            return (
                              <div className="p-2.5 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-[11px] text-[var(--text-discreto)]">
                                Será criada uma transferência mensal recorrente de <span className="font-bold text-[#00cc52]">R$ {formatCurrency(valNum)}</span> nos lançamentos futuros.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Tab Retirada Fields */}
                  {operationTab === 'retirada' && (
                    <div className="space-y-4">
                      {/* Valor */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR DA RETIRADA</span>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={opValor}
                          onChange={(e) => setOpValor(formatCurrencyInput(e.target.value))}
                          className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                        />
                      </div>

                      {/* Data Selector */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1.5">DATA</span>
                        <div className="flex gap-2 text-xs">
                          {(['hoje', 'ontem', 'personalizado'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setOpDataSelection(opt)}
                              className={`flex-1 py-2 rounded-[10px] border text-center font-bold transition-all ${
                                opDataSelection === opt
                                  ? 'bg-[var(--bg-secondary)] border-[var(--bg-secondary)] text-white'
                                  : 'bg-transparent border-[var(--bg-tertiary)] text-[var(--text-discreto)]'
                              }`}
                            >
                              {opt === 'hoje' && 'Hoje'}
                              {opt === 'ontem' && 'Ontem'}
                              {opt === 'personalizado' && 'Outro'}
                            </button>
                          ))}
                        </div>
                        {opDataSelection === 'personalizado' && (
                          <input
                            type="date"
                            value={opCustomData}
                            onChange={(e) => setOpCustomData(e.target.value)}
                            className="w-full mt-2 py-2 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[10px] text-xs text-[var(--text-general)] focus:outline-hidden"
                          />
                        )}
                      </div>

                      {/* Motivo */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">MOTIVO DA RETIRADA</span>
                        <input
                          type="text"
                          placeholder="Ex: Pagar viagem, comprar presente..."
                          value={opMotivo}
                          onChange={(e) => setOpMotivo(e.target.value)}
                          className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-xs text-[var(--text-general)] focus:outline-hidden"
                        />
                      </div>

                      {/* Para Conta */}
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">DEPOSITAR NA CONTA (DESTINO)</span>
                        <select
                          value={opContaId}
                          onChange={(e) => setOpContaId(e.target.value)}
                          className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-xs text-[var(--text-general)] focus:outline-hidden"
                        >
                          {contas.length === 0 ? (
                            <option value="">Nenhuma conta cadastrada</option>
                          ) : (
                            contas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Tab Rendimento Fields */}
                  {operationTab === 'rendimento' && (
                    <div className="space-y-4">
                      {/* Sub toggle: Adicionar vs Atualizar */}
                      <div className="flex bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-1 rounded-[14px] text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setRendimentoSubMode('adicionar')}
                          className={`flex-1 py-2 px-3 rounded-[10px] text-center transition-all cursor-pointer ${
                            rendimentoSubMode === 'adicionar' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-discreto)]'
                          }`}
                        >
                          Adicionar Rendimento
                        </button>
                        <button
                          type="button"
                          onClick={() => setRendimentoSubMode('atualizar')}
                          className={`flex-1 py-2 px-3 rounded-[10px] text-center transition-all cursor-pointer ${
                            rendimentoSubMode === 'atualizar' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-discreto)]'
                          }`}
                        >
                          Atualizar Saldo
                        </button>
                      </div>

                      {rendimentoSubMode === 'adicionar' ? (
                        <>
                          {/* Valor */}
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR RENDIDO</span>
                            <input
                              type="text"
                              placeholder="0,00"
                              value={opValor}
                              onChange={(e) => setOpValor(formatCurrencyInput(e.target.value))}
                              className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                            />
                          </div>

                          {/* Período */}
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1.5">PERÍODO DE RENDIMENTO</span>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {(['15 dias', '30 dias', '60 dias', 'personalizado'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    if (opt === 'personalizado') {
                                      setCustomPeriodMode(true);
                                    } else {
                                      setCustomPeriodMode(false);
                                      setOpPeriodo(opt);
                                    }
                                  }}
                                  className={`flex-1 py-2 rounded-[10px] border text-center font-bold transition-all ${
                                    (opt === 'personalizado' && customPeriodMode) || (opt !== 'personalizado' && !customPeriodMode && opPeriodo === opt)
                                      ? 'bg-[var(--bg-secondary)] border-[var(--bg-secondary)] text-white'
                                      : 'bg-transparent border-[var(--bg-tertiary)] text-[var(--text-discreto)]'
                                  }`}
                                >
                                  {opt === 'personalizado' ? 'Outro' : opt}
                                </button>
                              ))}
                            </div>
                            {customPeriodMode && (
                              <input
                                type="date"
                                value={opPeriodoCustom}
                                onChange={(e) => setOpPeriodoCustom(e.target.value)}
                                className="w-full mt-2 py-2 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[10px] text-xs text-[var(--text-general)] focus:outline-hidden"
                              />
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Novo Valor Final */}
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOVO VALOR DO COFRINHO</span>
                            <input
                              type="text"
                              placeholder="0,00"
                              value={opValor}
                              onChange={(e) => setOpValor(formatCurrencyInput(e.target.value))}
                              className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                            />
                          </div>
                          <p className="text-[10px] text-[var(--text-discreto)]">
                            O saldo do cofrinho será substituído por esse valor. A diferença de saldo será adicionada ao histórico como um rendimento.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>

            {/* ACTION FOOTER */}
            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex justify-between items-center gap-3">
              {showHistoryOverlay ? (
                <button
                  onClick={() => setShowHistoryOverlay(false)}
                  className="w-full py-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-sm text-[var(--text-general)] font-semibold cursor-pointer"
                >
                  Voltar ao Formulário
                </button>
              ) : (
                <>
                  {/* History triggers overlay */}
                  <button
                    onClick={() => setShowHistoryOverlay(true)}
                    className="py-3 px-4 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-[var(--text-discreto)] hover:text-[var(--text-general)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Histórico de Transações"
                  >
                    <History size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Histórico</span>
                  </button>

                  <div className="flex-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(currentActiveCofrinho)}
                      className="py-3 px-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-xs font-bold text-[var(--text-general)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Editar dados e valor atual"
                    >
                      <Pencil size={13} />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCofrinhoObj(currentActiveCofrinho.id)}
                      className="py-3 px-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-[16px] text-xs font-bold cursor-pointer transition-colors"
                      title="Apagar Cofrinho"
                    >
                      Excluir
                    </button>
                    
                    <button
                      onClick={handleConfirmOperation}
                      className="flex-1 py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 rounded-[16px] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={14} /> Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: ADD NEW COFRINHO */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            <div className="p-5 bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--text-general)]">Novo Cofrinho</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[var(--text-discreto)] hover:text-[var(--text-general)]">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DO COFRINHO</span>
                <input
                  type="text"
                  placeholder="Ex: Viagem Disney, Entrada Carro"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                />
              </div>

              {/* Valor Inicial */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">SALDO INICIAL DO COFRINHO</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={newValorInicial}
                  onChange={(e) => setNewValorInicial(formatCurrencyInput(e.target.value))}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                />
              </div>

              {/* Meta de Economia (Opcional) */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">META DE ECONOMIA (OPCIONAL)</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={newMeta}
                  onChange={(e) => setNewMeta(formatCurrencyInput(e.target.value))}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                />
              </div>

              {/* Cor */}
              <div className="space-y-2 border-t border-[var(--bg-tertiary)] pt-3">
                <span className="text-xs font-semibold text-[var(--text-discreto)] block">ESCOLHA UMA COR</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  {!useCustomColor && PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCor(c)}
                      className="w-7 h-7 rounded-full border border-[var(--bg-tertiary)] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    >
                      {newCor === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setUseCustomColor(!useCustomColor)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      useCustomColor 
                        ? 'border-[var(--text-general)] text-[var(--text-general)] bg-[var(--bg-tertiary)]' 
                        : 'border-[var(--bg-tertiary)] text-[var(--text-discreto)] bg-transparent'
                    }`}
                  >
                    <Paintbrush size={14} />
                  </button>

                  {useCustomColor && (
                    <div className="flex items-center gap-2 bg-[var(--bg-app)] py-1 px-2 rounded-[10px] border border-[var(--bg-tertiary)]">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-5 h-5 rounded bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-[9px] font-mono font-bold text-[var(--text-general)] uppercase">
                        {customColor}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="flex-1 py-3 border border-[var(--bg-tertiary)] rounded-[16px] text-xs font-bold text-[var(--text-general)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCofrinho}
                className="flex-1 py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 rounded-[16px] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check size={14} /> Confirmar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDITAR COFRINHO / VALOR ATUAL */}
      {editingCofrinho && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            <div className="p-5 bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: editUseCustomColor ? editCustomColor : editCor }} />
                <h3 className="text-sm font-extrabold text-[var(--text-general)]">Editar Reserva / Cofrinho</h3>
              </div>
              <button 
                onClick={() => setEditingCofrinho(null)} 
                className="p-1 rounded-full text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Nome */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DA RESERVA</span>
                <input
                  type="text"
                  placeholder="Ex: Viagem Disney, Reserva de Emergência"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden font-medium"
                />
              </div>

              {/* Valor Atual (Editável diretamente) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-[var(--text-discreto)] block">VALOR ATUAL RESERVADO</span>
                  <span className="text-[10px] text-[#00cc52] font-bold">Saldo Atual</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-discreto)]">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={editSaldoAtual}
                    onChange={(e) => setEditSaldoAtual(formatCurrencyInput(e.target.value))}
                    className="w-full py-2.5 pl-10 pr-4 bg-[var(--bg-app)] border-2 border-[#00cc52]/40 focus:border-[#00cc52] rounded-[16px] text-base text-[var(--text-general)] font-extrabold focus:outline-hidden transition-colors"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-discreto)] mt-1.5 leading-tight">
                  Altere o valor atual da reserva diretamente. Qualquer diferença de saldo será ajustada e registrada no histórico.
                </p>
              </div>

              {/* Meta Opcional */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR DA META (OPCIONAL)</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={editMeta}
                  onChange={(e) => setEditMeta(formatCurrencyInput(e.target.value))}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                />
              </div>

              {/* Cor */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-2">COR DE IDENTIFICAÇÃO</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {!editUseCustomColor && PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditCor(c)}
                      className="w-7 h-7 rounded-full border border-[var(--bg-tertiary)] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    >
                      {editCor === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setEditUseCustomColor(!editUseCustomColor)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      editUseCustomColor 
                        ? 'border-[var(--text-general)] text-[var(--text-general)] bg-[var(--bg-tertiary)]' 
                        : 'border-[var(--bg-tertiary)] text-[var(--text-discreto)] bg-transparent'
                    }`}
                    title="Cor personalizada"
                  >
                    <Paintbrush size={14} />
                  </button>

                  {editUseCustomColor && (
                    <div className="flex items-center gap-2 bg-[var(--bg-app)] py-1 px-2 rounded-[10px] border border-[var(--bg-tertiary)]">
                      <input
                        type="color"
                        value={editCustomColor}
                        onChange={(e) => setEditCustomColor(e.target.value)}
                        className="w-5 h-5 rounded bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-[9px] font-mono font-bold text-[var(--text-general)] uppercase">
                        {editCustomColor}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
              <button
                type="button"
                onClick={() => setEditingCofrinho(null)}
                className="flex-1 py-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-xs font-bold text-[var(--text-general)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 rounded-[16px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Check size={14} /> Salvar Alterações
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE TRANSFERÊNCIA AUTOMÁTICA */}
      {automationToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div>
              <h4 className="text-base font-bold text-[var(--text-general)]">Excluir Transferência Automática</h4>
              <p className="text-xs text-[var(--text-discreto)] mt-1.5 leading-relaxed">
                Deseja excluir as transferências automáticas programadas deste cofrinho?
              </p>
              <div className="mt-3 p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-xs text-left">
                <p className="font-bold text-[var(--text-general)]">
                  R$ {formatCurrency(automationToDelete.valorMensal)} /mês ({automationToDelete.tipoLabel})
                </p>
                <p className="text-[11px] text-[var(--text-discreto)] mt-0.5">
                  Conta: {automationToDelete.contaNome} • Todo dia {automationToDelete.diaMes}
                </p>
                <p className="text-[10px] text-[var(--text-discreto)] mt-1">
                  Total de ocorrências: {automationToDelete.totalItems} ({automationToDelete.futureItemsCount} futuras pendentes)
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {automationToDelete.futureItemsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLancamento(automationToDelete.firstFutureId || automationToDelete.firstId, 'futuros');
                    window.showToast?.('Lançamentos futuros da transferência automática excluídos.', 'sucesso');
                    setAutomationToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 bg-[var(--bg-tertiary)] text-[var(--text-general)] hover:bg-[var(--bg-tertiary)]/80 rounded-[14px] text-xs font-bold transition-colors cursor-pointer"
                >
                  Excluir Apenas Ocorrências Futuras
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDeleteLancamento(automationToDelete.firstId, 'todos');
                  window.showToast?.('Transferência automática excluída com sucesso.', 'sucesso');
                  setAutomationToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-red-600 text-white hover:bg-red-700 rounded-[14px] text-xs font-bold transition-colors cursor-pointer"
              >
                Excluir Tudo (Todas as Ocorrências)
              </button>

              <button
                type="button"
                onClick={() => setAutomationToDelete(null)}
                className="w-full py-2.5 px-4 border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-[14px] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE ITEM DO HISTÓRICO */}
      {historyItemToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div>
              <h4 className="text-base font-bold text-[var(--text-general)]">Excluir Registro do Histórico</h4>
              <p className="text-xs text-[var(--text-discreto)] mt-1.5 leading-relaxed">
                Tem certeza de que deseja excluir este registro? O saldo do cofrinho e os lançamentos correspondentes serão ajustados.
              </p>
              <div className="mt-3 p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-xs text-left">
                <p className="font-bold text-[var(--text-general)]">
                  {historyItemToDelete.tipo === 'deposito' ? 'Depósito' : historyItemToDelete.tipo === 'retirada' ? 'Retirada' : 'Rendimento'}
                  {' • '}
                  R$ {formatCurrency(Math.abs(historyItemToDelete.valor))}
                </p>
                <p className="text-[11px] text-[var(--text-discreto)] mt-0.5">
                  Data: {historyItemToDelete.data.split('-').reverse().join('/')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHistoryItemToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-[14px] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteCofrinhoHistorico(historyItemToDelete.id);
                  window.showToast?.('Item removido do histórico com sucesso.', 'sucesso');
                  setHistoryItemToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white hover:bg-red-700 rounded-[14px] text-xs font-bold transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
