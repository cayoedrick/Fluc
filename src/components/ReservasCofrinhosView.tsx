import React, { useState } from 'react';
import { Conta, Cofrinho, CofrinhoHistorico } from '../types';
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
  TrendingUp as YieldIcon
} from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';

interface ReservasCofrinhosViewProps {
  cofrinhos: Cofrinho[];
  cofrinhoHistorico: CofrinhoHistorico[];
  contas: Conta[];
  onAddCofrinho: (c: Omit<Cofrinho, 'id'> & { valorInicial: number }) => void;
  onUpdateCofrinho: (c: Cofrinho) => void;
  onAddCofrinhoHistorico: (h: Omit<CofrinhoHistorico, 'id'>) => void;
  onDeleteCofrinho: (id: string) => void;
  onOpenMenu?: () => void;
  onOpenSyncModal: () => void;
}

const PRESET_COLORS = [
  '#00cc52', // Green
  '#1c7ae4', // Blue
  '#ed793a', // Orange
  '#d03c4d', // Red
  '#507b84', // Slate Green
  '#8e44ad', // Purple
];

export function ReservasCofrinhosView({
  cofrinhos,
  cofrinhoHistorico,
  contas,
  onAddCofrinho,
  onUpdateCofrinho,
  onAddCofrinhoHistorico,
  onDeleteCofrinho,
  onOpenMenu,
  onOpenSyncModal
}: ReservasCofrinhosViewProps) {
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [activeCofrinho, setActiveCofrinho] = useState<Cofrinho | null>(null);
  
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
  
  // Rendimento Fields
  const [rendimentoSubMode, setRendimentoSubMode] = useState<'adicionar' | 'atualizar'>('adicionar');
  const [opPeriodo, setOpPeriodo] = useState<string>('30 dias');
  const [opPeriodoCustom, setOpPeriodoCustom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customPeriodMode, setCustomPeriodMode] = useState<boolean>(false);

  // Setup account selection on launch
  React.useEffect(() => {
    if (contas.length > 0 && !opContaId) {
      setOpContaId(contas[0].id);
    }
  }, [contas]);

  const handleOpenOperations = (cof: Cofrinho) => {
    setActiveCofrinho(cof);
    setOperationTab('deposito');
    setOpValor('');
    setOpMotivo('');
    setShowHistoryOverlay(false);
  };

  const handleCreateCofrinho = () => {
    if (!newName.trim()) {
      window.showToast?.('Por favor, preencha o nome do cofrinho.', 'erro');
      return;
    }
    const valInicial = parseFloat(newValorInicial.replace(',', '.'));
    if (isNaN(valInicial) || valInicial < 0) {
      window.showToast?.('Por favor, preencha o valor inicial corretamente.', 'erro');
      return;
    }
    const metaNum = newMeta.trim() ? parseFloat(newMeta.replace(',', '.')) : undefined;

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
    if (!activeCofrinho) return;

    const val = parseFloat(opValor.replace(',', '.'));
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

      // Add to cofrinho balance
      const updatedCofrinho = {
        ...activeCofrinho,
        saldoAtual: activeCofrinho.saldoAtual + val
      };
      onUpdateCofrinho(updatedCofrinho);

      // Create cofrinho history log
      onAddCofrinhoHistorico({
        cofrinhoId: activeCofrinho.id,
        tipo: 'deposito',
        valor: val,
        data: opDate,
        contaId: opContaId
      });

    } else if (operationTab === 'retirada') {
      if (val > activeCofrinho.saldoAtual) {
        window.showToast?.('Valor de retirada maior do que o saldo atual do cofrinho.', 'erro');
        return;
      }
      if (!opContaId) {
        window.showToast?.('Por favor, selecione a conta de destino.', 'erro');
        return;
      }

      // Subtract from cofrinho balance
      const updatedCofrinho = {
        ...activeCofrinho,
        saldoAtual: activeCofrinho.saldoAtual - val
      };
      onUpdateCofrinho(updatedCofrinho);

      // Create history log
      onAddCofrinhoHistorico({
        cofrinhoId: activeCofrinho.id,
        tipo: 'retirada',
        valor: val,
        data: opDate,
        contaId: opContaId,
        motivo: opMotivo.trim() || 'Retirada padrão'
      });

    } else if (operationTab === 'rendimento') {
      if (rendimentoSubMode === 'adicionar') {
        const pStr = customPeriodMode ? opPeriodoCustom : opPeriodo;
        
        // Add yield
        const updatedCofrinho = {
          ...activeCofrinho,
          saldoAtual: activeCofrinho.saldoAtual + val
        };
        onUpdateCofrinho(updatedCofrinho);

        onAddCofrinhoHistorico({
          cofrinhoId: activeCofrinho.id,
          tipo: 'rendimento_adicionar',
          valor: val,
          data: opDate,
          periodo: pStr
        });

      } else {
        // "Atualizar" - replaces the current value with the entered value
        const difference = val - activeCofrinho.saldoAtual;

        const updatedCofrinho = {
          ...activeCofrinho,
          saldoAtual: val
        };
        onUpdateCofrinho(updatedCofrinho);

        onAddCofrinhoHistorico({
          cofrinhoId: activeCofrinho.id,
          tipo: 'rendimento_atualizar',
          valor: difference, // stores the difference as yield value
          data: opDate
        });
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
  const currentHistory = activeCofrinho 
    ? cofrinhoHistorico.filter(h => h.cofrinhoId === activeCofrinho.id).sort((a,b) => b.data.localeCompare(a.data))
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
                    <ChevronRight size={16} className="text-[var(--text-discreto)]" />
                  </div>

                  {/* Balance / Values */}
                  <div>
                    <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">Saldo Reservado</span>
                    <span className="text-2xl font-extrabold text-[#00cc52] tracking-tight">
                      R$ {c.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {hasMeta && (
                      <span className="text-[10px] text-[var(--text-discreto)] block">
                        Meta: R$ {c.meta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
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
      {activeCofrinho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            {/* Header: Cofrinho Title & Close */}
            <div className="p-5 bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCofrinho.cor }} />
                <h3 className="text-base font-extrabold text-[var(--text-general)]">
                  {activeCofrinho.nome}
                </h3>
              </div>
              <button 
                onClick={() => setActiveCofrinho(null)}
                className="p-1 rounded-full text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* TOP BAR: ALIGNED BUTTONS Depósito, Retirada, Rendimento */}
            <div className="p-2 bg-[var(--bg-primary)] border-b border-[var(--bg-tertiary)] flex gap-1">
              {/* Depósito */}
              <button
                onClick={() => {
                  setOperationTab('deposito');
                  setOpValor('');
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
                        let iconColor = 'text-[var(--text-general)]';
                        let prefix = '';
                        if (h.tipo === 'deposito') {
                          iconColor = 'text-[#00cc52]';
                          prefix = '+';
                        } else if (h.tipo === 'retirada') {
                          iconColor = 'text-[#d03c4d]';
                          prefix = '-';
                        } else {
                          iconColor = 'text-[#1c7ae4]';
                          prefix = '+';
                        }

                        const detail = h.tipo === 'deposito' 
                          ? `De: ${contas.find(c => c.id === h.contaId)?.nome || 'Conta'}`
                          : h.tipo === 'retirada'
                            ? `Para: ${contas.find(c => c.id === h.contaId)?.nome || 'Conta'} (${h.motivo || ''})`
                            : `Rendimento (${h.periodo || 'Ajuste de Saldo'})`;

                        return (
                          <div key={h.id} className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-[var(--text-general)]">
                                {h.tipo === 'deposito' ? 'Depósito' : h.tipo === 'retirada' ? 'Retirada' : 'Rendimento'}
                              </p>
                              <p className="text-[10px] text-[var(--text-discreto)]">{detail}</p>
                            </div>
                            <div className="text-right">
                              <span className={`font-extrabold ${iconColor}`}>
                                {prefix} R$ {Math.abs(h.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <p className="text-[9px] text-[var(--text-discreto)]">{h.data.split('-').reverse().join('/')}</p>
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
                          onChange={(e) => setOpValor(e.target.value)}
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
                          {contas.length === 0 ? (
                            <option value="">Nenhuma conta cadastrada</option>
                          ) : (
                            contas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome} (Saldo: R$ {c.saldoInicial.toLocaleString()})
                              </option>
                            ))
                          )}
                        </select>
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
                          onChange={(e) => setOpValor(e.target.value)}
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
                              onChange={(e) => setOpValor(e.target.value)}
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
                              onChange={(e) => setOpValor(e.target.value)}
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
                      onClick={() => handleDeleteCofrinhoObj(activeCofrinho.id)}
                      className="py-3 px-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-[16px] text-xs font-bold cursor-pointer"
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
                  onChange={(e) => setNewValorInicial(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                />
              </div>

              {/* Meta de Economia (Opcional) */}
              <div>
                <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">META DE ECONOMIA (OPCIONAL)</span>
                <input
                  type="text"
                  placeholder="Ex: 5000,00"
                  value={newMeta}
                  onChange={(e) => setNewMeta(e.target.value)}
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

    </div>
  );
}
